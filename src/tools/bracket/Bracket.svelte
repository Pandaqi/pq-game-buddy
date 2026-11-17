<script lang="ts">
  import type { ToolContext } from '../../core/registry';
  import Sheet from '../../core/ui/Sheet.svelte';
  import { BRACKET_FORMATS, STAGE_LABELS, type BracketFormat, type Match, type Stage } from './logic';
  import type { BracketInstance } from './tool.svelte';

  let { ctx, instance }: { ctx: ToolContext; instance: BracketInstance } = $props();
  const data = $derived(instance.data);
  const view = $derived(instance.view());

  let editorOpen = $state(false);
  let newName = $state('');

  const nameOf = (id: string | null): string => (id ? data.entrants.find((item) => item.id === id)?.name ?? id : 'Winner');
  const championName = $derived(view.champion ? nameOf(view.champion) : '');

  const groups = $derived.by(() => {
    const map = new Map<string, Match[]>();
    for (const match of view.matches) {
      const key = `${match.stage}|${match.round}`;
      const list = map.get(key) ?? [];
      list.push(match);
      map.set(key, list);
    }
    return [...map.entries()].map(([key, matches]) => {
      const [stage, round] = key.split('|');
      return { stage: stage as Stage, round: Number(round), matches };
    });
  });

  function scoreOf(match: Match, side: 'a' | 'b'): number {
    const saved = data.scores[match.id];
    if (saved) return side === 'a' ? saved.a : saved.b;
    if (match.result) return side === 'a' ? match.result.scoreA : match.result.scoreB;
    return 0;
  }
</script>

<div class="bracket">
  <div class="formats" role="group" aria-label="Tournament format">
    {#each BRACKET_FORMATS as format (format)}
      <button type="button" class:active={data.format === format} onclick={() => instance.setFormat(format as BracketFormat)}>
        {format.replace('-', ' ')}
      </button>
    {/each}
  </div>

  {#if championName}
    <p class="champion" role="status">Champion: <strong>{championName}</strong></p>
  {:else if view.next}
    <p class="next" role="status">
      Next up: <strong>{nameOf(view.next.aName)}</strong> vs <strong>{nameOf(view.next.bName)}</strong>
      <span class="dim small">· best of {data.bestOf}</span>
    </p>
  {:else}
    <p class="next dim">Add entrants and report results to crown a champion.</p>
  {/if}

  {#if groups.length}
    {#each groups as group (group.stage + group.round)}
      <section class="round">
        <h2>{STAGE_LABELS[group.stage]} · round {group.round}</h2>
        <ul class="matches">
          {#each group.matches as match (match.id)}
            <li class="match" class:done={!!match.result}>
              <div class="sides">
                <button
                  type="button"
                  class:won={match.result?.winner === match.aName}
                  disabled={!match.aName || !match.bName}
                  onclick={() => instance.report(match.id, match.aName as string)}
                >
                  {nameOf(match.aName)}
                </button>
                <span class="vs">vs</span>
                <button
                  type="button"
                  class:won={match.result?.winner === match.bName}
                  disabled={!match.aName || !match.bName}
                  onclick={() => instance.report(match.id, match.bName as string)}
                >
                  {nameOf(match.bName)}
                </button>
              </div>
              <div class="scores">
                <label>
                  <span class="sr-only">Score for {nameOf(match.aName)}</span>
                  <input
                    type="number"
                    min="0"
                    value={scoreOf(match, 'a')}
                    onchange={(event) => instance.setScore(match.id, 'a', Number((event.currentTarget as HTMLInputElement).value))}
                  />
                </label>
                <span class="dash">–</span>
                <label>
                  <span class="sr-only">Score for {nameOf(match.bName)}</span>
                  <input
                    type="number"
                    min="0"
                    value={scoreOf(match, 'b')}
                    onchange={(event) => instance.setScore(match.id, 'b', Number((event.currentTarget as HTMLInputElement).value))}
                  />
                </label>
                {#if match.result}
                  <button type="button" class="clear" onclick={() => instance.clearResult(match.id)}>Clear</button>
                {/if}
              </div>
            </li>
          {/each}
        </ul>
      </section>
    {/each}
  {/if}

  <section class="round">
    <h2>Standings</h2>
    <table>
      <thead>
        <tr>
          <th scope="col">#</th>
          <th scope="col">Name</th>
          <th scope="col">W</th>
          <th scope="col">L</th>
          <th scope="col">+/−</th>
        </tr>
      </thead>
      <tbody>
        {#each view.standings as row, index (row.id)}
          <tr>
            <th scope="row" class="rank">{index + 1}</th>
            <td class="name">{row.name}</td>
            <td>{row.wins}</td>
            <td>{row.losses}</td>
            <td>{row.diff >= 0 ? '+' : ''}{row.diff}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </section>

  <div class="row">
    <button type="button" onclick={() => (editorOpen = true)}>Entrants</button>
    <button type="button" onclick={() => instance.regenerate('random')}>Reseed randomly</button>
    <button type="button" onclick={() => instance.clearResults()}>Clear results</button>
  </div>

  <label class="inline">
    <span>Best of</span>
    <input type="number" min="1" max="9" value={data.bestOf} onchange={(event) => instance.setBestOf(Number((event.currentTarget as HTMLInputElement).value))} />
  </label>

  <label class="inline">
    <span>Tiebreak</span>
    <select value={data.tiebreak} onchange={(event) => instance.setTiebreak((event.currentTarget as HTMLSelectElement).value as 'diff' | 'head')}>
      <option value="diff">Score difference</option>
      <option value="head">Head to head</option>
    </select>
  </label>
</div>

{#if editorOpen}
  <Sheet title="Entrants" onclose={() => (editorOpen = false)}>
    <p class="dim small">{data.entrants.length} entrants. Changing the list resets reported results.</p>
    <ul class="entrants">
      {#each data.entrants as entrant (entrant.id)}
        <li>
          <span class="seed">{entrant.seed}</span>
          <input
            type="text"
            value={entrant.name}
            aria-label="Name for entrant {entrant.seed}"
            onchange={(event) => instance.renameEntrant(entrant.id, (event.currentTarget as HTMLInputElement).value)}
          />
          <button type="button" onclick={() => instance.removeEntrant(entrant.id)} aria-label="Remove {entrant.name}" disabled={data.entrants.length <= 2}>✕</button>
        </li>
      {/each}
    </ul>
    <label class="field">
      <span>Add an entrant</span>
      <input type="text" bind:value={newName} onkeydown={(event) => { if (event.key === 'Enter') { instance.addEntrant(newName); newName = ''; } }} />
    </label>
    <button type="button" class="primary-wide" onclick={() => { instance.addEntrant(newName); newName = ''; }}>Add entrant</button>
    <button type="button" class="wide" onclick={() => (editorOpen = false)}>Done</button>
  </Sheet>
{/if}

<style>
  .bracket {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding: var(--space-3);
  }
  .formats {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
    padding: var(--space-1);
    border-radius: var(--radius);
    background: var(--surface-2);
  }
  .formats button {
    min-height: 44px;
    padding: 0 var(--space-3);
    border-radius: var(--radius-sm);
    border: 0;
    background: transparent;
    color: var(--text);
    text-transform: capitalize;
    cursor: pointer;
  }
  .formats button.active {
    background: var(--surface);
    font-weight: 700;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
  }
  .champion,
  .next {
    margin: 0;
    padding: var(--space-3);
    border-radius: var(--radius-lg);
    background: var(--accent-soft);
    border: 2px solid var(--accent);
  }
  .champion strong {
    font-size: var(--text-xl);
  }
  .round {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: var(--space-3);
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    background: var(--surface);
  }
  h2 {
    margin: 0;
    font-size: var(--text-base);
    text-transform: capitalize;
  }
  .matches {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
    gap: var(--space-2);
  }
  .match {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    padding: var(--space-2);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--surface-2);
  }
  .match.done {
    border-color: var(--accent);
  }
  .sides {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }
  .sides button {
    min-height: 44px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--line);
    background: var(--surface);
    color: var(--text);
    text-align: left;
    padding: 0 var(--space-2);
    cursor: pointer;
  }
  .sides button:disabled {
    opacity: 0.6;
    cursor: default;
  }
  .sides button.won {
    border-color: var(--accent);
    background: var(--accent-soft);
    font-weight: 800;
  }
  .vs {
    font-size: var(--text-xs);
    color: var(--text-dim);
    text-align: center;
  }
  .scores {
    display: flex;
    align-items: center;
    gap: var(--space-1);
  }
  .scores input {
    width: 3.5rem;
    min-height: 40px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--line);
    background: var(--surface);
    color: var(--text);
    text-align: center;
    font-variant-numeric: tabular-nums;
  }
  .dash {
    color: var(--text-dim);
  }
  .clear {
    margin-left: auto;
    min-height: 40px;
    padding: 0 var(--space-2);
    border-radius: var(--radius-sm);
    border: 1px solid var(--line);
    background: transparent;
    color: var(--text-dim);
    cursor: pointer;
  }
  table {
    width: 100%;
    border-collapse: collapse;
  }
  th,
  td {
    text-align: right;
    padding: var(--space-1) var(--space-2);
    border-bottom: 1px solid var(--line);
    font-variant-numeric: tabular-nums;
  }
  thead th {
    color: var(--text-dim);
    font-size: var(--text-xs);
    text-transform: uppercase;
  }
  .rank,
  .name {
    text-align: left;
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
  .inline {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    min-height: 48px;
    color: var(--text-dim);
  }
  .inline input,
  .inline select {
    min-height: 44px;
    min-width: 8rem;
    border-radius: var(--radius);
    border: 1px solid var(--line);
    background: var(--surface-2);
    color: var(--text);
    padding: 0 var(--space-2);
  }
  .entrants {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }
  .entrants li {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }
  .seed {
    min-width: 1.5rem;
    color: var(--text-dim);
    font-variant-numeric: tabular-nums;
    text-align: right;
  }
  .entrants input {
    flex: 1;
    min-height: 44px;
    border-radius: var(--radius);
    border: 1px solid var(--line);
    background: var(--surface-2);
    color: var(--text);
    padding: 0 var(--space-2);
  }
  .entrants button {
    min-width: 44px;
    min-height: 44px;
    border-radius: var(--radius);
    border: 1px solid var(--line);
    background: transparent;
    color: var(--text-dim);
    cursor: pointer;
  }
  .entrants button:disabled {
    opacity: 0.5;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    color: var(--text-dim);
  }
  .field input {
    min-height: 48px;
    border-radius: var(--radius);
    border: 1px solid var(--line);
    background: var(--surface-2);
    color: var(--text);
    padding: 0 var(--space-3);
  }
  .wide,
  .primary-wide {
    min-height: 52px;
    border-radius: var(--radius);
    border: 1px solid var(--line);
    background: var(--surface-2);
    color: var(--text);
    cursor: pointer;
  }
  .primary-wide {
    border-color: var(--accent);
    background: var(--accent);
    color: var(--accent-text);
    font-weight: 700;
  }
  .dim {
    color: var(--text-dim);
  }
  .small {
    font-size: var(--text-sm);
  }
</style>
