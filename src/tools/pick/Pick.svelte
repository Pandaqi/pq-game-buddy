<script lang="ts">
  import type { ToolContext } from '../../core/registry';
  import EmptyState from '../../core/ui/EmptyState.svelte';
  import type { PickInstance, PickSource } from './logic';

  let { ctx, instance }: { ctx: ToolContext; instance: PickInstance } = $props();
  const data = $derived(instance.data);

  let draft = $state('');

  const SOURCES: { id: PickSource; label: string }[] = [
    { id: 'number', label: 'Number' },
    { id: 'list', label: 'List' },
    { id: 'players', label: 'Players' },
    { id: 'teams', label: 'Teams' },
    { id: 'seats', label: 'Seats' },
  ];

  function addOption(event: SubmitEvent): void {
    event.preventDefault();
    instance.addValue(draft);
    draft = '';
  }
</script>

<div class="pick">
  <div class="sources" role="tablist" aria-label="Pick source">
    {#each SOURCES as item (item.id)}
      <button
        type="button"
        role="tab"
        aria-selected={data.source === item.id}
        class:active={data.source === item.id}
        onclick={() => instance.setSource(item.id)}
      >
        {item.label}
      </button>
    {/each}
  </div>

  <div class="views" role="group" aria-label="Result view">
    <button type="button" class:active={data.view === 'list'} onclick={() => instance.setView('list')} aria-pressed={data.view === 'list'}>List</button>
    <button type="button" class:active={data.view === 'cards'} onclick={() => instance.setView('cards')} aria-pressed={data.view === 'cards'}>Cards</button>
  </div>

  {#if data.source === 'number'}
    <div class="grid-two">
      <label class="field">
        <span>From</span>
        <input
          type="number"
          value={data.min}
          onchange={(event) =>
            instance.setRange(Number((event.currentTarget as HTMLInputElement).value), data.max)}
        />
      </label>
      <label class="field">
        <span>To</span>
        <input
          type="number"
          value={data.max}
          onchange={(event) =>
            instance.setRange(data.min, Number((event.currentTarget as HTMLInputElement).value))}
        />
      </label>
    </div>
  {/if}

  {#if data.source === 'list'}
    <form class="adder" onsubmit={addOption}>
      <label class="sr-only" for="pick-value">Option</label>
      <input id="pick-value" bind:value={draft} placeholder="Add an option" />
      <button type="submit">Add</button>
    </form>
    {#if data.values.length}
      <ul class="values">
        {#each data.values as value (value)}
          <li>
            <span>{value}</span>
            <button type="button" aria-label="Remove {value}" onclick={() => instance.removeValue(value)}>✕</button>
          </li>
        {/each}
      </ul>
    {:else}
      <EmptyState title="The list is empty" body="Add a few names, words or options, or pull in the players." />
    {/if}
    <button type="button" class="ghost" onclick={() => instance.usePlayers()}>Use player names</button>
  {/if}

  {#if data.source === 'teams'}
    <label class="field">
      <span>Teams</span>
      <input
        type="number"
        min="2"
        max="12"
        value={data.teams}
        onchange={(event) => instance.setTeams(Number((event.currentTarget as HTMLInputElement).value))}
      />
    </label>
  {/if}

  <div class="count-row">
    <label class="field">
      <span>Draw</span>
      <input
        type="number"
        min="1"
        max="50"
        value={data.count}
        onchange={(event) => instance.setCount(Number((event.currentTarget as HTMLInputElement).value))}
      />
    </label>
    {#if data.source === 'number' || data.source === 'list'}
      <label class="check">
        <input
          type="checkbox"
          checked={!data.replacement}
          onchange={(event) => instance.setReplacement(!(event.currentTarget as HTMLInputElement).checked)}
        />
        <span>No repeats</span>
      </label>
    {/if}
  </div>

  <div class="stage" aria-live="polite">
    {#if data.teamResult}
      <div class="teams">
        {#each data.teamResult as team, index (index)}
          <div class="team">
            <h3>Team {index + 1}</h3>
            <p>{team.join(', ') || '—'}</p>
          </div>
        {/each}
      </div>
    {:else if data.result.length}
      {#if data.view === 'cards'}
        <div class="results">
          {#each data.result as item, index (index)}
            {#if data.revealed[index]}
              <span class="result card">{item}</span>
            {:else}
              <button
                type="button"
                class="result card back"
                onclick={() => instance.revealAt(index)}
                aria-label="Reveal card {index + 1} of {data.result.length}"
              >?</button>
            {/if}
          {/each}
        </div>
      {:else}
        <div class="results">
          {#each data.result as item, index (index)}
            <span class="result">{item}</span>
          {/each}
        </div>
      {/if}
      {#if data.view === 'cards' && data.revealed.some((value) => !value)}
        <button type="button" class="ghost reveal-all" onclick={() => instance.revealAll()}>Reveal all</button>
      {/if}
    {:else}
      <p class="placeholder">
        {data.source === 'seats' ? 'Tap draw for a seating order.' : data.source === 'teams' ? 'Tap draw to split into teams.' : 'Tap draw to pick.'}
      </p>
    {/if}
  </div>

  <button type="button" class="draw" onclick={() => instance.draw()}>
    {data.source === 'seats' ? 'Seat us' : data.source === 'teams' ? 'Split teams' : 'Draw'}
  </button>

  <div class="extra">
    <label class="field">
      <span>Seed (optional)</span>
      <input
        type="text"
        value={data.seed}
        placeholder="repeatable picks"
        onchange={(event) => instance.setSeed((event.currentTarget as HTMLInputElement).value)}
      />
    </label>
    <button type="button" class="ghost" onclick={() => instance.reset()}>Clear result</button>
  </div>

  {#if data.history.length > 1}
    <ol class="history">
      {#each data.history as item, index (index)}
        <li>{item.items.join(', ')}</li>
      {/each}
    </ol>
  {/if}
</div>

<style>
  .pick {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding: var(--space-3);
  }
  .sources {
    display: flex;
    gap: var(--space-1);
    overflow-x: auto;
    padding-bottom: var(--space-1);
  }
  .sources button {
    min-height: 44px;
    padding: 0 var(--space-3);
    border-radius: 999px;
    border: 1px solid var(--line);
    background: var(--surface);
    color: var(--text);
    cursor: pointer;
    white-space: nowrap;
  }
  .sources button.active {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--accent-text);
    font-weight: 700;
  }
  .grid-two,
  .count-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-2);
    align-items: end;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    font-size: var(--text-sm);
    color: var(--text-dim);
  }
  .field input,
  .adder input {
    min-height: 48px;
    border-radius: var(--radius);
    border: 1px solid var(--line);
    background: var(--surface);
    color: var(--text);
    padding: 0 var(--space-3);
    font: inherit;
  }
  .check {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-height: 48px;
  }
  .check input {
    width: 24px;
    height: 24px;
  }
  .adder {
    display: flex;
    gap: var(--space-2);
  }
  .adder input {
    flex: 1;
  }
  .adder button {
    min-height: 48px;
    padding: 0 var(--space-4);
    border-radius: var(--radius);
    border: 0;
    background: var(--surface-2);
    color: var(--text);
    cursor: pointer;
    font-weight: 600;
  }
  .values {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }
  .values li {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    border: 1px solid var(--line);
    border-radius: 999px;
    padding: var(--space-1) var(--space-1) var(--space-1) var(--space-3);
    background: var(--surface);
  }
  .values button {
    min-width: 36px;
    min-height: 36px;
    border: 0;
    border-radius: 50%;
    background: var(--surface-2);
    color: var(--text-dim);
    cursor: pointer;
  }
  .stage {
    min-height: 8rem;
    display: grid;
    place-items: center;
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    background: var(--surface);
    padding: var(--space-4);
    text-align: center;
  }
  .results {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    justify-content: center;
  }
  .result {
    font-size: clamp(1.6rem, 9vw, 2.6rem);
    font-weight: 800;
    padding: var(--space-1) var(--space-3);
    border-radius: var(--radius);
    background: var(--accent-soft);
  }
  .result.card {
    min-width: 4.5rem;
    min-height: 6rem;
    display: grid;
    place-items: center;
    border: 2px solid var(--accent);
    background: var(--surface);
  }
  .result.card.back {
    background: var(--accent);
    color: var(--accent-text);
    border-color: var(--accent);
    font-size: var(--text-xl);
    cursor: pointer;
  }
  .views {
    display: flex;
    gap: var(--space-1);
    width: fit-content;
    padding: var(--space-1);
    border-radius: 999px;
    background: var(--surface-2);
  }
  .views button {
    min-height: 40px;
    padding: 0 var(--space-3);
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: var(--text);
    cursor: pointer;
  }
  .views button.active {
    background: var(--surface);
    font-weight: 700;
  }
  .reveal-all {
    margin-top: var(--space-2);
  }
  .placeholder {
    color: var(--text-dim);
    margin: 0;
  }
  .teams {
    display: grid;
    gap: var(--space-2);
    grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
    width: 100%;
  }
  .team {
    border: 1px solid var(--line);
    border-radius: var(--radius);
    padding: var(--space-2);
  }
  .team h3 {
    margin: 0 0 var(--space-1);
    font-size: var(--text-sm);
    color: var(--text-dim);
  }
  .team p {
    margin: 0;
    font-weight: 600;
  }
  .draw {
    min-height: 64px;
    border: 0;
    border-radius: var(--radius-lg);
    background: var(--accent);
    color: var(--accent-text);
    font-size: var(--text-xl);
    font-weight: 800;
    cursor: pointer;
  }
  .extra {
    display: flex;
    gap: var(--space-2);
    align-items: end;
  }
  .extra .field {
    flex: 1;
  }
  .ghost {
    min-height: 48px;
    padding: 0 var(--space-3);
    border-radius: var(--radius);
    border: 1px solid var(--line);
    background: transparent;
    color: var(--text);
    cursor: pointer;
  }
  .history {
    list-style: none;
    margin: 0;
    padding: 0;
    color: var(--text-dim);
    font-size: var(--text-sm);
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }
</style>
