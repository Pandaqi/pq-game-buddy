<script lang="ts">
  import { t } from '../../core/i18n.svelte';
  import type { ToolContext } from '../../core/registry';
  import Sheet from '../../core/ui/Sheet.svelte';
  import { BRACKET_FORMATS, STAGE_LABELS, type BracketFormat, type Match, type Stage } from './logic';
  import type { BracketInstance } from './tool.svelte';

  let { ctx, instance }: { ctx: ToolContext; instance: BracketInstance } = $props();
  const data = $derived(instance.data);
  const view = $derived(instance.view());

  let editorOpen = $state(false);
  let newName = $state('');

  const nameOf = (id: string | null): string =>
    id ? data.entrants.find((item) => item.id === id)?.name ?? id : t('bracket.winner');
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
  <div class="formats" role="group" aria-label={t('bracket.format')}>
    {#each BRACKET_FORMATS as format (format)}
      <button type="button" class:active={data.format === format} onclick={() => instance.setFormat(format as BracketFormat)}>
        {t(`bracket.format-${format}`)}
      </button>
    {/each}
  </div>

  {#if championName}
    <p class="champion" role="status">{t('bracket.champion')} <strong>{championName}</strong></p>
  {:else if view.next}
    <p class="next" role="status">
      {t('bracket.next-up')} <strong>{nameOf(view.next.aName)}</strong> {t('bracket.vs')}
      <strong>{nameOf(view.next.bName)}</strong>
      <span class="dim small">{t('bracket.best-of', { count: data.bestOf })}</span>
    </p>
  {:else}
    <p class="next dim">{t('bracket.empty')}</p>
  {/if}

  {#if groups.length}
    {#each groups as group (group.stage + group.round)}
      <section class="round">
        <h2>
          {t(`bracket.stage-${group.stage}`, undefined, STAGE_LABELS[group.stage])} ·
          {t('bracket.round', { count: group.round })}
        </h2>
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
                <span class="vs">{t('bracket.vs')}</span>
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
                  <span class="sr-only">{t('bracket.score-for', { name: nameOf(match.aName) })}</span>
                  <input
                    type="number"
                    min="0"
                    value={scoreOf(match, 'a')}
                    onchange={(event) => instance.setScore(match.id, 'a', Number((event.currentTarget as HTMLInputElement).value))}
                  />
                </label>
                <span class="dash">–</span>
                <label>
                  <span class="sr-only">{t('bracket.score-for', { name: nameOf(match.bName) })}</span>
                  <input
                    type="number"
                    min="0"
                    value={scoreOf(match, 'b')}
                    onchange={(event) => instance.setScore(match.id, 'b', Number((event.currentTarget as HTMLInputElement).value))}
                  />
                </label>
                {#if match.result}
                  <button type="button" class="clear" onclick={() => instance.clearResult(match.id)}>{t('bracket.clear')}</button>
                {/if}
              </div>
            </li>
          {/each}
        </ul>
      </section>
    {/each}
  {/if}

  <section class="round">
    <h2>{t('bracket.standings')}</h2>
    <table>
      <thead>
        <tr>
          <th scope="col">#</th>
          <th scope="col">{t('bracket.name')}</th>
          <th scope="col">{t('bracket.wins')}</th>
          <th scope="col">{t('bracket.losses')}</th>
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
    <button type="button" onclick={() => (editorOpen = true)}>{t('bracket.entrants')}</button>
    <button type="button" onclick={() => instance.regenerate('random')}>{t('bracket.reseed')}</button>
    <button type="button" onclick={() => instance.clearResults()}>{t('bracket.clear-results')}</button>
  </div>

  <label class="inline">
    <span>{t('bracket.best-of-label')}</span>
    <input type="number" min="1" max="9" value={data.bestOf} onchange={(event) => instance.setBestOf(Number((event.currentTarget as HTMLInputElement).value))} />
  </label>

  <label class="inline">
    <span>{t('bracket.tiebreak')}</span>
    <select value={data.tiebreak} onchange={(event) => instance.setTiebreak((event.currentTarget as HTMLSelectElement).value as 'diff' | 'head')}>
      <option value="diff">{t('bracket.tiebreak-diff')}</option>
      <option value="head">{t('bracket.tiebreak-head')}</option>
    </select>
  </label>
</div>

{#if editorOpen}
  <Sheet title={t('bracket.entrants')} onclose={() => (editorOpen = false)}>
    <p class="dim small">{t('bracket.entrants-count', { count: data.entrants.length })}</p>
    <ul class="entrants">
      {#each data.entrants as entrant (entrant.id)}
        <li>
          <span class="seed">{entrant.seed}</span>
          <input
            type="text"
            value={entrant.name}
            aria-label={t('bracket.entrant-name', { seed: entrant.seed })}
            onchange={(event) => instance.renameEntrant(entrant.id, (event.currentTarget as HTMLInputElement).value)}
          />
          <button type="button" onclick={() => instance.removeEntrant(entrant.id)} aria-label={t('bracket.remove-entrant', { name: entrant.name })} disabled={data.entrants.length <= 2}>✕</button>
        </li>
      {/each}
    </ul>
    <label class="field">
      <span>{t('bracket.add-entrant-label')}</span>
      <input type="text" bind:value={newName} onkeydown={(event) => { if (event.key === 'Enter') { instance.addEntrant(newName); newName = ''; } }} />
    </label>
    <button type="button" class="primary-wide" onclick={() => { instance.addEntrant(newName); newName = ''; }}>{t('bracket.add-entrant')}</button>
    <button type="button" class="wide" onclick={() => (editorOpen = false)}>{t('bracket.done')}</button>
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
    box-shadow: var(--shadow-soft);
  }
  .champion,
  .next {
    margin: 0;
    padding: var(--space-3);
    border-radius: var(--radius-lg);
    background: var(--accent-soft);
  }
  .champion strong {
    font-size: var(--text-xl);
  }
  .round {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: var(--space-3);
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
    border-radius: var(--radius);
    background: var(--surface-2);
  }
  .sides {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }
  .sides button {
    min-height: 44px;
    border-radius: var(--radius-sm);
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
    border: 0;
    width: 3.5rem;
    min-height: 40px;
    border-radius: var(--radius-sm);
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
    background: transparent;
    color: var(--text-dim);
    cursor: pointer;
  }



  .rank,
  .name {
    text-align: left;
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
    border: 0;
    min-height: 44px;
    min-width: 8rem;
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
    border: 0;
    flex: 1;
    min-height: 44px;
    background: var(--surface-2);
    color: var(--text);
    padding: 0 var(--space-2);
  }
  .entrants button {
    min-width: 44px;
    min-height: 44px;
    border-radius: var(--radius);
    background: transparent;
    color: var(--text-dim);
    cursor: pointer;
  }
  .entrants button:disabled {
    opacity: 0.5;
  }


  .wide,
  .primary-wide {
    min-height: 52px;
    border-radius: var(--radius);
    background: var(--surface-2);
    color: var(--text);
    cursor: pointer;
  }
  .primary-wide {
    background: var(--accent);
    color: var(--accent-text);
    font-weight: 700;
  }


</style>
