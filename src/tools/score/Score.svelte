<script lang="ts">
  import type { ToolContext } from '../../core/registry';
  import { copyText } from '../../core/share';
  import NumberPad from '../../core/ui/NumberPad.svelte';
  import Sheet from '../../core/ui/Sheet.svelte';
  import { csvSheet, standingsFor, totalFor, type ScoreInstance } from './logic';

  let { ctx, instance }: { ctx: ToolContext; instance: ScoreInstance } = $props();
  const data = $derived(instance.data);

  let editing = $state<string | null>(null);
  let adding = $state(false);
  let newName = $state('');

  const standings = $derived(standingsFor(data));

  function rankOf(id: string): number {
    return standings.find((row) => row.id === id)?.rank ?? 0;
  }

  function copySheet(): void {
    void copyText(csvSheet(data)).then((ok) => {
      ctx.toast(ok ? 'Score sheet copied' : 'Could not copy', ok ? 'info' : 'error');
    });
  }

  function addPlayerNow(): void {
    instance.addPlayer(newName);
    newName = '';
    adding = false;
  }
</script>

<div class="score">
  <div class="head">
    <span class="mode">{data.mode === 'rounds' ? `Rounds · ${data.roundCount}` : 'Totals'}</span>
    {#if data.target}
      <span class="target">Target {data.target}</span>
    {/if}
  </div>

  {#if data.mode === 'rounds'}
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th scope="col">Player</th>
            {#each Array(data.roundCount) as _, round (round)}
              <th scope="col">{round + 1}</th>
            {/each}
            <th scope="col">Total</th>
          </tr>
        </thead>
        <tbody>
          {#each data.players as player (player.id)}
            <tr>
              <th scope="row">
                <span class="dot" style="--player: {player.color}">{player.name.slice(0, 2).toUpperCase()}</span>
                {player.name}
              </th>
              {#each Array(data.roundCount) as _, round (round)}
                <td>
                  <input
                    type="number"
                    aria-label="{player.name} round {round + 1}"
                    value={data.rounds[player.id]?.[round] ?? 0}
                    onchange={(event) =>
                      instance.setRound(player.id, round, Number((event.currentTarget as HTMLInputElement).value))}
                  />
                </td>
              {/each}
              <td class="total">{totalFor(data, player.id)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <div class="row">
      <button type="button" onclick={() => instance.addRound()}>Add round</button>
      <button type="button" onclick={() => instance.removeRound()}>Remove round</button>
    </div>
  {:else}
    <ul class="players">
      {#each data.players as player (player.id)}
        <li class:leader={rankOf(player.id) === 1 && data.players.length > 1}>
          <div class="who">
            <span class="dot" style="--player: {player.color}">{player.name.slice(0, 2).toUpperCase()}</span>
            <span class="name">{player.name}</span>
            {#if data.players.length > 1}
              <span class="rank">#{rankOf(player.id)}</span>
            {/if}
          </div>
          <button type="button" class="total-button" aria-label="Set {player.name}'s score" onclick={() => (editing = player.id)}>
            {totalFor(data, player.id)}
          </button>
          <div class="adjust">
            <button type="button" onclick={() => instance.adjust(player.id, -data.step)} aria-label="Minus {data.step} for {player.name}">
              −{data.step}
            </button>
            <button type="button" onclick={() => instance.adjust(player.id, data.step)} aria-label="Plus {data.step} for {player.name}">
              +{data.step}
            </button>
          </div>
        </li>
      {/each}
    </ul>
  {/if}

  <div class="row">
    <button type="button" onclick={() => (adding = true)}>Add player</button>
    <button type="button" onclick={() => instance.syncPlayers()}>Use session players</button>
  </div>
  <div class="row">
    <button type="button" onclick={copySheet}>Copy sheet</button>
    <button
      type="button"
      onclick={() =>
        instance.setMode(data.mode === 'rounds' ? 'simple' : 'rounds')}
    >
      {data.mode === 'rounds' ? 'Switch to totals' : 'Switch to rounds'}
    </button>
  </div>

  {#if data.players.length > 1}
    <ol class="board">
      {#each standings as row (row.id)}
        <li>
          <span class="rank">{row.tied ? '=' : row.rank}</span>
          <span class="name">{row.name}</span>
          <span class="total">{row.total}</span>
        </li>
      {/each}
    </ol>
  {/if}

  <details class="danger-zone">
    <summary>Clear scores</summary>
    <p>Sets every score back to {data.start}. Undo still works.</p>
    <button type="button" class="danger" onclick={() => instance.clearAll()}>Clear all scores</button>
  </details>
</div>

{#if editing}
  <Sheet title="Set score" onclose={() => (editing = null)}>
    <NumberPad
      value={totalFor(data, editing)}
      label="Score"
      onsubmit={(value) => {
        if (editing) instance.setTotal(editing, value);
        editing = null;
      }}
      oncancel={() => (editing = null)}
    />
  </Sheet>
{/if}

{#if adding}
  <Sheet title="Add player" onclose={() => (adding = false)}>
    <label class="field">
      <span>Name</span>
      <input type="text" bind:value={newName} onkeydown={(event) => { if (event.key === 'Enter') addPlayerNow(); }} />
    </label>
    <button type="button" class="wide" onclick={addPlayerNow}>Add</button>
  </Sheet>
{/if}

<style>
  .score {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding: var(--space-3);
  }
  .head {
    display: flex;
    justify-content: space-between;
    color: var(--text-dim);
    font-size: var(--text-sm);
    font-weight: 600;
  }
  .players {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  .players li {
    border: 2px solid var(--line);
    border-radius: var(--radius-lg);
    padding: var(--space-2) var(--space-3);
    background: var(--surface);
    display: grid;
    grid-template-columns: 1fr auto;
    gap: var(--space-2);
    align-items: center;
  }
  .players li.leader {
    border-color: var(--accent);
  }
  .who {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-width: 0;
  }
  .dot {
    display: inline-grid;
    place-items: center;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: var(--player);
    color: #fff;
    font-size: var(--text-xs);
    font-weight: 800;
    flex: none;
  }
  .name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 600;
  }
  .rank {
    color: var(--text-dim);
    font-size: var(--text-sm);
  }
  .total-button {
    grid-column: 2;
    grid-row: 1 / span 2;
    min-width: 88px;
    min-height: 56px;
    border: 0;
    border-radius: var(--radius);
    background: var(--surface-2);
    color: var(--text);
    font-size: var(--text-2xl);
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    cursor: pointer;
  }
  .adjust {
    display: flex;
    gap: var(--space-2);
  }
  .adjust button {
    min-width: 64px;
    min-height: 48px;
    border-radius: var(--radius);
    border: 1px solid var(--line);
    background: var(--surface-2);
    color: var(--text);
    font-size: var(--text-base);
    font-weight: 700;
    cursor: pointer;
  }
  .row {
    display: flex;
    gap: var(--space-2);
  }
  .row button {
    flex: 1;
    min-height: 48px;
    border-radius: var(--radius);
    border: 1px solid var(--line);
    background: var(--surface);
    color: var(--text);
    cursor: pointer;
    font: inherit;
  }
  .table-wrap {
    overflow-x: auto;
    border: 1px solid var(--line);
    border-radius: var(--radius);
  }
  table {
    border-collapse: collapse;
    min-width: 100%;
  }
  th,
  td {
    padding: var(--space-1);
    text-align: center;
    border-bottom: 1px solid var(--line);
  }
  thead th {
    font-size: var(--text-xs);
    color: var(--text-dim);
    text-transform: uppercase;
  }
  tbody th {
    text-align: left;
    white-space: nowrap;
    font-size: var(--text-sm);
  }
  td input {
    width: 4.2rem;
    min-height: 44px;
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    background: var(--surface);
    color: var(--text);
    text-align: center;
    font: inherit;
    font-variant-numeric: tabular-nums;
  }
  td.total {
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }
  .board {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    color: var(--text-dim);
  }
  .board li {
    display: flex;
    gap: var(--space-2);
    align-items: center;
    font-variant-numeric: tabular-nums;
  }
  .board .total {
    margin-left: auto;
    color: var(--text);
    font-weight: 700;
  }
  .danger-zone summary {
    min-height: 44px;
    display: flex;
    align-items: center;
    cursor: pointer;
    color: var(--text-dim);
  }
  .danger {
    min-height: 48px;
    border-radius: var(--radius);
    border: 1px solid var(--danger);
    background: transparent;
    color: var(--danger);
    cursor: pointer;
    padding: 0 var(--space-3);
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }
  .field input {
    min-height: 48px;
    border-radius: var(--radius);
    border: 1px solid var(--line);
    background: var(--surface-2);
    color: var(--text);
    padding: 0 var(--space-3);
    font: inherit;
  }
  .wide {
    min-height: 48px;
    border-radius: var(--radius);
    border: 0;
    background: var(--accent);
    color: var(--accent-text);
    font-weight: 700;
    cursor: pointer;
  }
</style>
