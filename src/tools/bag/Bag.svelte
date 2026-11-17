<script lang="ts">
  import type { ToolContext } from '../../core/registry';
  import Sheet from '../../core/ui/Sheet.svelte';
  import { BAG_SETS, totalOf, trayTotal, type BagSet } from './logic';
  import type { BagInstance } from './tool.svelte';

  let { ctx, instance }: { ctx: ToolContext; instance: BagInstance } = $props();
  const data = $derived(instance.data);
  const players = $derived(ctx.session.players());

  let settingsOpen = $state(false);
  let countsDraft = $state('');
  let valuesDraft = $state('');
  let who = $state('');
  let newType = $state('');
  const activeWho = $derived(who || players[0]?.name || '');
  let left = $derived(totalOf(data.remaining));
  const types = $derived(Object.keys(data.remaining).sort());

  function openSettings(): void {
    countsDraft = Object.entries(data.counts)
      .map(([type, count]) => `${type} = ${count}`)
      .join('\n');
    valuesDraft = Object.entries(data.values)
      .map(([type, value]) => `${type} = ${value}`)
      .join('\n');
    settingsOpen = true;
  }

  function choosePlayer(name: string): void {
    who = name;
    instance.assignTo(name);
  }
</script>

<div class="bag">
  <div class="stats">
    <div class="stat"><span class="num">{left}</span><span class="label">in the bag</span></div>
    <div class="stat"><span class="num">{data.tokens.length + data.trays.reduce((sum, tray) => sum + tray.tokens.length, 0)}</span><span class="label">drawn</span></div>
    <div class="stat"><span class="num">{data.drawCount}</span><span class="label">per draw</span></div>
  </div>

  {#if data.trayMode === 'per-player' && players.length}
    <div class="who" role="group" aria-label="Who is drawing">
      {#each players as player (player.id)}
        <button type="button" class:active={activeWho === player.name} onclick={() => choosePlayer(player.name)}>
          {player.name}
        </button>
      {/each}
    </div>
  {/if}

  <div class="controls">
    <label class="field">
      <span>Tokens</span>
      <input
        type="number"
        min="1"
        max="50"
        value={data.drawCount}
        onchange={(event) => instance.setDraw(Number((event.currentTarget as HTMLInputElement).value))}
      />
    </label>
    <button type="button" class="primary" onclick={() => instance.draw()}>Draw</button>
  </div>

  {#if data.trayMode === 'shared'}
    <section class="block">
      <header>
        <h2>Shared tray</h2>
        {#if data.tokens.length}
          <span class="dim small">{trayTotal(data.tokens)} points</span>
        {/if}
      </header>
      {#if data.tokens.length}
        <ul class="tokens">
          {#each data.tokens as token, index (token.id)}
            <li>
              <button type="button" onclick={() => instance.returnAt(index)} aria-label="Return {token.type} to the bag">
                {token.type}{#if token.value}<span class="points">{token.value}</span>{/if}
              </button>
            </li>
          {/each}
        </ul>
      {:else}
        <p class="dim small">Nothing drawn yet. Tap Draw to pull {data.drawCount} from the bag.</p>
      {/if}
    </section>
  {:else}
    <section class="block">
      <h2>Trays</h2>
      {#if data.trays.length}
        {#each data.trays as tray (tray.player)}
          <div class="tray">
            <header>
              <span class="player">{tray.player}</span>
              <span class="dim small">{tray.tokens.length} tiles · {trayTotal(tray.tokens)} pts</span>
            </header>
            <ul class="tokens">
              {#each tray.tokens as token (token.id)}
                <li>
                  <span class="tile">{token.type}{#if token.value}<span class="points">{token.value}</span>{/if}</span>
                </li>
              {/each}
            </ul>
            <button type="button" class="ghost" onclick={() => instance.returnPlayer(tray.player)}>Return {tray.player}'s tiles</button>
          </div>
        {/each}
      {:else}
        <p class="dim small">Pick a player above, then draw.</p>
      {/if}
    </section>
  {/if}

  <section class="block">
    <header>
      <h2>Left in the bag</h2>
      <span class="dim small">{data.set}</span>
    </header>
    <ul class="counts">
      {#each types as type (type)}
        <li>
          <span class="tile">{type}</span>
          <span class="n">{data.remaining[type] ?? 0}</span>
          <span class="steppers">
            <button type="button" onclick={() => instance.adjustType(type, 1)} aria-label="Add one {type}">+</button>
            <button type="button" onclick={() => instance.adjustType(type, -1)} aria-label="Remove one {type}" disabled={(data.remaining[type] ?? 0) === 0}>−</button>
          </span>
        </li>
      {/each}
    </ul>
    {#if !types.length}
      <p class="dim small">This bag is empty. Set a tile set or write custom counts.</p>
    {/if}
  </section>

  {#if data.history.length}
    <ol class="history">
      {#each data.history as line, index (index)}
        <li>{line}</li>
      {/each}
    </ol>
  {/if}

  <div class="row">
    <button type="button" onclick={openSettings}>Bag settings</button>
    <button type="button" onclick={() => instance.returnAll()}>Return all</button>
    <button type="button" onclick={() => instance.refill()}>Refill</button>
  </div>
</div>

{#if settingsOpen}
  <Sheet title="Bag settings" onclose={() => (settingsOpen = false)}>
    <label class="field">
      <span>Tile set</span>
      <select value={data.set} onchange={(event) => instance.setSet((event.currentTarget as HTMLSelectElement).value as BagSet)}>
        {#each BAG_SETS as set (set)}
          <option value={set}>{set}</option>
        {/each}
      </select>
    </label>
    <label class="field">
      <span>Tray</span>
      <select value={data.trayMode} onchange={(event) => instance.setTrayMode((event.currentTarget as HTMLSelectElement).value as 'shared' | 'per-player')}>
        <option value="shared">One shared tray</option>
        <option value="per-player">A tray per player</option>
      </select>
    </label>
    {#if data.set === 'custom'}
      <label class="field">
        <span>Counts (one per line: "A = 9")</span>
        <textarea rows="6" bind:value={countsDraft} spellcheck="false"></textarea>
      </label>
      <label class="field">
        <span>Points (one per line: "A = 1")</span>
        <textarea rows="4" bind:value={valuesDraft} spellcheck="false"></textarea>
      </label>
      <button type="button" class="wide primary" onclick={() => instance.setCustom(countsDraft, valuesDraft)}>Save custom bag</button>
    {/if}
    <label class="field">
      <span>Add a type</span>
      <div class="add">
        <input type="text" bind:value={newType} placeholder="star" />
        <button type="button" onclick={() => { instance.addType(newType, 1); newType = ''; }}>Add</button>
      </div>
    </label>
    <button type="button" class="wide" onclick={() => (settingsOpen = false)}>Done</button>
    <p class="dim small">Changing the set builds a fresh bag. Draws are weighted by what is left, never fixed odds.</p>
  </Sheet>
{/if}

<style>
  .bag {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding: var(--space-3);
  }
  .stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-2);
  }
  .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--space-2);
    border-radius: var(--radius);
    background: var(--surface-2);
    border: 1px solid var(--line);
  }
  .num {
    font-size: var(--text-xl);
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }
  .label {
    font-size: var(--text-xs);
    color: var(--text-dim);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .who {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
  }
  .who button {
    min-height: 44px;
    padding: 0 var(--space-3);
    border-radius: 999px;
    border: 1px solid var(--line);
    background: var(--surface);
    color: var(--text);
    cursor: pointer;
  }
  .who button.active {
    border-color: var(--accent);
    background: var(--accent-soft);
    font-weight: 700;
  }
  .controls {
    display: flex;
    align-items: flex-end;
    gap: var(--space-2);
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    color: var(--text-dim);
    flex: 1;
  }
  .field input,
  .field select,
  .field textarea {
    min-height: 48px;
    border-radius: var(--radius);
    border: 1px solid var(--line);
    background: var(--surface-2);
    color: var(--text);
    padding: 0 var(--space-3);
    font: inherit;
  }
  .field textarea {
    padding: var(--space-2);
    font-family: var(--font-mono);
    font-size: var(--text-sm);
  }
  .primary {
    min-height: 56px;
    padding: 0 var(--space-5);
    border: 0;
    border-radius: var(--radius);
    background: var(--accent);
    color: var(--accent-text);
    font-size: var(--text-lg);
    font-weight: 800;
    cursor: pointer;
  }
  .block {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: var(--space-3);
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    background: var(--surface);
  }
  .block header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  h2 {
    margin: 0;
    font-size: var(--text-base);
  }
  .tokens {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
  }
  .tokens button,
  .tile {
    display: inline-flex;
    align-items: baseline;
    gap: 2px;
    min-width: 48px;
    min-height: 48px;
    justify-content: center;
    padding: 0 var(--space-2);
    border-radius: var(--radius-sm);
    border: 1px solid var(--line);
    background: var(--surface-2);
    color: var(--text);
    font-weight: 800;
    font-size: var(--text-lg);
    cursor: pointer;
  }
  .tile {
    cursor: default;
  }
  .points {
    font-size: var(--text-xs);
    font-weight: 600;
    color: var(--text-dim);
  }
  .tray {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    padding-bottom: var(--space-2);
    border-bottom: 1px solid var(--line);
  }
  .tray:last-of-type {
    border-bottom: 0;
  }
  .tray header {
    display: flex;
    justify-content: space-between;
  }
  .player {
    font-weight: 700;
  }
  .counts {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(7.5rem, 1fr));
    gap: var(--space-1);
  }
  .counts li {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-1);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--surface-2);
  }
  .n {
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    margin-left: auto;
  }
  .steppers {
    display: flex;
    gap: 2px;
  }
  .steppers button {
    min-width: 32px;
    min-height: 40px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--line);
    background: var(--surface);
    color: var(--text);
    cursor: pointer;
  }
  .steppers button:disabled {
    opacity: 0.5;
  }
  .history {
    margin: 0;
    padding-left: var(--space-4);
    color: var(--text-dim);
    font-size: var(--text-sm);
  }
  .row {
    display: flex;
    gap: var(--space-2);
    flex-wrap: wrap;
  }
  .row button {
    flex: 1;
    min-height: 48px;
    border-radius: var(--radius);
    border: 1px solid var(--line);
    background: var(--surface);
    color: var(--text);
    cursor: pointer;
  }
  .ghost {
    align-self: flex-start;
    min-height: 40px;
    padding: 0 var(--space-2);
    border-radius: var(--radius);
    border: 0;
    background: transparent;
    color: var(--text-dim);
    cursor: pointer;
  }
  .add {
    display: flex;
    gap: var(--space-2);
  }
  .add button {
    min-height: 48px;
    padding: 0 var(--space-3);
    border-radius: var(--radius);
    border: 1px solid var(--line);
    background: var(--surface);
    color: var(--text);
    cursor: pointer;
  }
  .wide {
    min-height: 52px;
    border-radius: var(--radius);
    border: 1px solid var(--line);
    background: var(--surface-2);
    color: var(--text);
    cursor: pointer;
  }
  .wide.primary {
    border-color: var(--accent);
    background: var(--accent);
    color: var(--accent-text);
    font-weight: 700;
  }
  .dim {
    color: var(--text-dim);
    margin: 0;
  }
  .small {
    font-size: var(--text-sm);
  }
</style>
