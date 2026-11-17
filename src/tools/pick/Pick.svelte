<script lang="ts">
  import { t } from '../../core/i18n.svelte';
  import type { ToolContext } from '../../core/registry';
  import EmptyState from '../../core/ui/EmptyState.svelte';
  import {
    slotOffset,
    slicePath,
    viewPool,
    winnerAngle,
    winnerIndex,
    type PickInstance,
    type PickSource,
  } from './logic';

  let { ctx, instance }: { ctx: ToolContext; instance: PickInstance } = $props();
  const data = $derived(instance.data);

  let draft = $state('');

  const playerNames = $derived(ctx.session.players().map((player) => player.name));
  const pool = $derived(viewPool(data, playerNames, data.view === 'slot' ? 40 : 12));
  const winner = $derived(data.result[0] ?? '');
  const winnerAt = $derived(winnerIndex(pool, winner));
  const angle = $derived(winnerAngle(winnerAt, pool.length));
  const offset = $derived(slotOffset(winnerAt));
  const showWheel = $derived(data.view === 'wheel' && !data.teamResult && data.result.length > 0 && pool.length > 1);
  const showSlot = $derived(data.view === 'slot' && !data.teamResult && data.result.length > 0 && pool.length > 1);

  const SOURCES: { id: PickSource; key: string }[] = [
    { id: 'number', key: 'pick.number' },
    { id: 'list', key: 'pick.list' },
    { id: 'players', key: 'pick.players' },
    { id: 'teams', key: 'pick.teams' },
    { id: 'seats', key: 'pick.seats' },
  ];

  function addOption(event: SubmitEvent): void {
    event.preventDefault();
    instance.addValue(draft);
    draft = '';
  }
</script>

<div class="pick">
  <div class="sources" role="tablist" aria-label={t('pick.source')}>
    {#each SOURCES as item (item.id)}
      <button
        type="button"
        role="tab"
        aria-selected={data.source === item.id}
        class:active={data.source === item.id}
        onclick={() => instance.setSource(item.id)}
      >
        {t(item.key)}
      </button>
    {/each}
  </div>

  <div class="views" role="group" aria-label={t('pick.result-view')}>
    <button type="button" class:active={data.view === 'list'} onclick={() => instance.setView('list')} aria-pressed={data.view === 'list'}>{t('pick.view-list')}</button>
    <button type="button" class:active={data.view === 'cards'} onclick={() => instance.setView('cards')} aria-pressed={data.view === 'cards'}>{t('pick.view-cards')}</button>
    <button type="button" class:active={data.view === 'wheel'} onclick={() => instance.setView('wheel')} aria-pressed={data.view === 'wheel'}>{t('pick.view-wheel')}</button>
    <button type="button" class:active={data.view === 'slot'} onclick={() => instance.setView('slot')} aria-pressed={data.view === 'slot'}>{t('pick.view-slot')}</button>
  </div>

  {#if data.source === 'number'}
    <div class="grid-two">
      <label class="field">
        <span>{t('pick.from')}</span>
        <input
          type="number"
          value={data.min}
          onchange={(event) =>
            instance.setRange(Number((event.currentTarget as HTMLInputElement).value), data.max)}
        />
      </label>
      <label class="field">
        <span>{t('pick.to')}</span>
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
      <label class="sr-only" for="pick-value">{t('pick.option')}</label>
      <input id="pick-value" bind:value={draft} placeholder={t('pick.add-option')} />
      <button type="submit">{t('pick.add')}</button>
    </form>
    {#if data.values.length}
      <ul class="values">
        {#each data.values as value (value)}
          <li>
            <span>{value}</span>
            <button type="button" aria-label={t('pick.remove', { value })} onclick={() => instance.removeValue(value)}>✕</button>
          </li>
        {/each}
      </ul>
    {:else}
      <EmptyState title={t('pick.list-empty')} body={t('pick.list-empty-body')} />
    {/if}
    <button type="button" class="ghost" onclick={() => instance.usePlayers()}>{t('pick.use-players')}</button>
  {/if}

  {#if data.source === 'teams'}
    <label class="field">
      <span>{t('pick.teams')}</span>
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
      <span>{t('pick.draw')}</span>
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
        <span>{t('pick.no-repeats')}</span>
      </label>
    {/if}
  </div>

  <div class="stage" aria-live="polite">
    {#if data.teamResult}
      <div class="teams">
        {#each data.teamResult as team, index (index)}
          <div class="team">
            <h3>{t('pick.team-number', { count: index + 1 })}</h3>
            <p>{team.join(', ') || '—'}</p>
          </div>
        {/each}
      </div>
    {:else if showWheel}
      <div class="wheel-wrap">
        <span class="pointer" aria-hidden="true"></span>
        <div class="wheel" style="transform: rotate({angle}deg)" aria-hidden="true">
          <svg viewBox="0 0 100 100">
            {#each pool as item, index (item + '-' + index)}
              <path d={slicePath(index, pool.length)} class:win={index === winnerAt} class:odd={index % 2 === 1} />
            {/each}
            <circle cx="50" cy="50" r="9" />
          </svg>
        </div>
        <p class="landed">{winner}</p>
      </div>
    {:else if showSlot}
      <div class="slot-wrap">
        <div class="slot" aria-hidden="true">
          <div class="slot-track" style="transform: translateY({offset * 3.4}rem)">
            {#each pool as item, index (item + '-' + index)}
              <span class="slot-row" class:win={index === winnerAt}>{item}</span>
            {/each}
          </div>
        </div>
        <p class="landed">{winner}</p>
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
                aria-label={t('pick.reveal-card', { index: index + 1, total: data.result.length })}
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
        <button type="button" class="ghost reveal-all" onclick={() => instance.revealAll()}>{t('pick.reveal-all')}</button>
      {/if}
    {:else}
      <p class="placeholder">
        {data.source === 'seats'
          ? t('pick.hint-seats')
          : data.source === 'teams'
            ? t('pick.hint-teams')
            : t('pick.hint-pick')}
      </p>
    {/if}
  </div>

  <button type="button" class="draw" onclick={() => instance.draw()}>
    {data.source === 'seats'
      ? t('pick.seat-us')
      : data.source === 'teams'
        ? t('pick.split-teams')
        : t('pick.draw')}
  </button>

  <div class="extra">
    <label class="field">
      <span>{t('pick.seed')}</span>
      <input
        type="text"
        value={data.seed}
        placeholder={t('pick.seed-placeholder')}
        onchange={(event) => instance.setSeed((event.currentTarget as HTMLInputElement).value)}
      />
    </label>
    <button type="button" class="ghost" onclick={() => instance.reset()}>{t('pick.clear')}</button>
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
    flex-wrap: wrap;
    gap: var(--space-1);
  }
  .sources button {
    min-height: 44px;
    padding: 0 var(--space-3);
    border-radius: var(--radius-pill);
    background: var(--surface);
    color: var(--text);
    cursor: pointer;
    white-space: nowrap;
  }
  .sources button.active {
    background: var(--accent);
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

  .field input,
  .adder input {
    border: 0;
    min-height: 48px;
    background: var(--surface);
    color: var(--text);
    padding: 0 var(--space-3);
    font: inherit;
  }


  .adder {
    display: flex;
    gap: var(--space-2);
  }
  .adder input {
    border: 0;
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
    border-radius: var(--radius-pill);
    padding: var(--space-1) var(--space-1) var(--space-1) var(--space-3);
    background: var(--surface);
  }
  .values button {
    min-width: 36px;
    min-height: 36px;
    border: 0;
    border-radius: var(--radius-round);
    background: var(--surface-2);
    color: var(--text-dim);
    cursor: pointer;
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
    background: var(--surface);
  }
  .result.card.back {
    background: var(--accent);
    color: var(--accent-text);
    font-size: var(--text-xl);
    cursor: pointer;
  }
  .views {
    display: flex;
    gap: var(--space-1);
    width: fit-content;
    padding: var(--space-1);
    border-radius: var(--radius-pill);
    background: var(--surface-2);
  }
  .views button {
    min-height: 40px;
    padding: 0 var(--space-3);
    border: 0;
    border-radius: var(--radius-pill);
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
  .wheel-wrap,
  .slot-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    width: 100%;
  }
  .wheel-wrap {
    position: relative;
    padding-top: var(--space-3);
  }
  .pointer {
    width: 0;
    height: 0;
    border-left: 11px solid transparent;
    border-right: 11px solid transparent;
    border-top: 18px solid var(--accent-deep);
    z-index: 1;
  }
  .wheel {
    width: min(17rem, 72vw);
    aspect-ratio: 1;
    margin-top: calc(var(--space-2) * -1);
    transition: transform calc(var(--motion-bounce) * 2) var(--ease-out);
  }
  .wheel svg {
    width: 100%;
    height: 100%;
    display: block;
  }
  .wheel path {
    fill: var(--accent-soft);
    stroke: var(--surface);
    stroke-width: 0.8;
  }
  .wheel path.odd {
    fill: var(--surface);
  }
  .wheel path.win {
    fill: var(--accent);
  }
  .wheel circle {
    fill: var(--surface);
    stroke: var(--accent-deep);
    stroke-width: 2;
  }
  .slot {
    height: 10.2rem;
    width: min(18rem, 82vw);
    overflow: hidden;
    border-radius: var(--radius-lg);
    background: var(--surface);
    -webkit-mask-image: linear-gradient(to bottom, transparent, #000 22%, #000 78%, transparent);
    mask-image: linear-gradient(to bottom, transparent, #000 22%, #000 78%, transparent);
  }
  .slot-track {
    display: flex;
    flex-direction: column;
    transition: transform calc(var(--motion-reveal) * 1.6) var(--ease-out);
  }
  .slot-row {
    height: 3.4rem;
    display: grid;
    place-items: center;
    padding: 0 var(--space-3);
    font-family: var(--font-display);
    font-size: var(--text-lg);
    font-weight: 700;
    color: var(--text-dim);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .slot-row.win {
    color: var(--accent-deep);
  }
  .landed {
    margin: 0;
    font-family: var(--font-display);
    font-size: clamp(2rem, 10vw, 3rem);
    font-weight: 800;
    color: var(--accent-deep);
    text-align: center;
    animation: pop-in var(--motion-bounce) var(--ease-bounce);
  }
  @media (prefers-reduced-motion: reduce) {
    .wheel,
    .slot-track,
    .landed {
      transition: none;
      animation: none;
    }
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


</style>
