<script lang="ts">
  import { language, t } from '../core/i18n.svelte';
  import { gameName } from '../core/game-name';
  import { clearPlays, formatMinutes, listPlays, playsToCsv, playsToJson, statsFor } from '../core/play-log';
  import { copyText, download } from '../core/share';
  import Sheet from '../core/ui/Sheet.svelte';
  import { store } from '../core/session-store.svelte';

  let records = $state(listPlays());
  let query = $state('');
  let gameFilter = $state('any');
  let playerFilter = $state('any');
  let winnersOnly = $state(false);
  let confirmOpen = $state(false);

  const games = $derived.by(() => {
    const seen = new Map<string, string>();
    for (const record of records) {
      const key = record.toolId ?? record.game;
      if (!seen.has(key)) seen.set(key, gameName(language(), record.toolId, record.game));
    }
    return [...seen.entries()]
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  });
  const players = $derived(
    [...new Set(records.flatMap((record) => record.players))].sort((a, b) => a.localeCompare(b)),
  );

  const shown = $derived.by(() => {
    const needle = query.trim().toLowerCase();
    return records.filter((record) => {
      if (gameFilter !== 'any' && (record.toolId ?? record.game) !== gameFilter) return false;
      if (playerFilter !== 'any' && !record.players.includes(playerFilter)) return false;
      if (winnersOnly && !record.winner) return false;
      if (!needle) return true;
      return (
        gameName(language(), record.toolId, record.game).toLowerCase().includes(needle) ||
        record.winner.toLowerCase().includes(needle) ||
        record.players.some((name) => name.toLowerCase().includes(needle))
      );
    });
  });

  const stats = $derived(statsFor(shown));
  const filtering = $derived(
    !!query.trim() || gameFilter !== 'any' || playerFilter !== 'any' || winnersOnly,
  );

  function clearFilters(): void {
    query = '';
    gameFilter = 'any';
    playerFilter = 'any';
    winnersOnly = false;
  }

  function copyCsv(): void {
    void copyText(playsToCsv(shown)).then((ok) => {
      store.toast(ok ? t('toast.history-copied') : t('toast.could-not-copy'), ok ? 'info' : 'error');
    });
  }

  function clearAll(): void {
    clearPlays();
    records = [];
    confirmOpen = false;
    store.toast(t('toast.history-cleared'));
  }

  function when(at: number): string {
    return new Date(at).toLocaleString(language());
  }
</script>

<div class="log-page">
  <header class="head">
    <div>
      <h1>{t('log.title')}</h1>
      <p class="dim">{t('log.hint')}</p>
    </div>
    <a class="back" href="#/">{t('nav.home')}</a>
  </header>

  {#if records.length}
    <section class="filters">
      <label class="search">
        <span class="sr-only">{t('log.search')}</span>
        <input type="search" bind:value={query} placeholder={t('log.search-placeholder')} />
      </label>
      <div class="picks">
        <label class="field">
          <span>{t('log.game')}</span>
          <select bind:value={gameFilter}>
            <option value="any">{t('log.any')}</option>
            {#each games as game (game.id)}
              <option value={game.id}>{game.label}</option>
            {/each}
          </select>
        </label>
        <label class="field">
          <span>{t('log.player')}</span>
          <select bind:value={playerFilter}>
            <option value="any">{t('log.any')}</option>
            {#each players as name (name)}
              <option value={name}>{name}</option>
            {/each}
          </select>
        </label>
        <label class="check">
          <input type="checkbox" bind:checked={winnersOnly} />
          <span>{t('log.won-by-someone')}</span>
        </label>
      </div>
      {#if filtering}
        <div class="found">
          <span>{t('log.found', { shown: shown.length, total: records.length })}</span>
          <button type="button" onclick={clearFilters}>{t('log.clear-filters')}</button>
        </div>
      {/if}
    </section>

    {#if shown.length}
      <section class="stats">
        <div class="stat">
          <span class="value">{stats.plays}</span>
          <span class="label">{stats.plays === 1 ? t('log.plays-one') : t('log.plays-many')}</span>
        </div>
        <div class="stat">
          <span class="value small-value">{stats.minutes ? formatMinutes(stats.minutes) : '—'}</span>
          <span class="label">{t('log.at-table')}</span>
        </div>
        <div class="stat">
          <span class="value">{stats.games}</span>
          <span class="label">{stats.games === 1 ? t('log.games-one') : t('log.games-many')}</span>
        </div>
      </section>

      <p class="streak">
        {#if stats.streak}
          {stats.streak.length === 1
            ? t('log.streak-one', { name: stats.streak.name })
            : t('log.streak', { name: stats.streak.name, count: stats.streak.length })}
        {:else}
          {t('log.no-streak')}
        {/if}
      </p>

      {#if stats.winRates.length}
        <section class="rates">
          <h2>{t('log.win-rate')}</h2>
          <ul>
            {#each stats.winRates as row (row.name)}
              <li>
                <span class="who">{row.name}</span>
                <span class="record">{row.wins} / {row.plays}</span>
                <span class="rate">{Math.round(row.rate * 100)}%</span>
                <span class="bar" aria-hidden="true"><span style="--fill: {Math.round(row.rate * 100)}%"></span></span>
              </li>
            {/each}
          </ul>
          <p class="hint">{t('log.win-rate-hint')}</p>
        </section>
      {/if}

      <ul class="plays">
        {#each shown as record (record.id)}
          <li>
            <div class="game">
              <strong>{gameName(language(), record.toolId, record.game)}</strong>
              <span class="when">{when(record.at)}</span>
            </div>
            <p class="winner">
              {record.winner ? t('log.won-by', { name: record.winner }) : t('log.no-winner')}
              {#if record.minutes}· {formatMinutes(record.minutes)}{/if}
            </p>
            {#if record.results.length}
              <p class="results">
                {record.results.map((item) => (typeof item.score === 'number' ? `${item.name} ${item.score}` : item.name)).join(' · ')}
              </p>
            {/if}
          </li>
        {/each}
      </ul>

      <div class="actions">
        <button type="button" onclick={copyCsv}>{t('log.copy-csv')}</button>
        <button type="button" onclick={() => download('play-log.csv', playsToCsv(shown), 'text/csv')}>{t('log.csv-file')}</button>
        <button type="button" onclick={() => download('play-log.json', playsToJson(shown), 'application/json')}>{t('log.json-file')}</button>
      </div>
      <p class="hint">
        {shown.length === 1
          ? t('log.export-hint-one')
          : t('log.export-hint', { count: shown.length })}
      </p>
      <button type="button" class="danger" onclick={() => (confirmOpen = true)}>{t('log.clear-history')}</button>
    {:else}
      <div class="empty">
        <p class="title">{t('log.nothing-title')}</p>
        <p class="dim">{t('log.nothing-hint')}</p>
        <button type="button" class="primary" onclick={clearFilters}>{t('log.clear-filters')}</button>
      </div>
    {/if}
  {:else}
    <div class="empty">
      <p class="title">{t('log.no-games-title')}</p>
      <p class="dim">{t('log.no-games-hint')}</p>
      <a class="primary link" href="#/">{t('log.pick-tool')}</a>
    </div>
  {/if}
</div>

{#if confirmOpen}
  <Sheet title={t('log.clear-sheet')} onclose={() => (confirmOpen = false)}>
    <p>{t('log.clear-confirm')}</p>
    <button type="button" class="danger wide" onclick={clearAll}>{t('log.clear-count', { count: records.length })}</button>
  </Sheet>
{/if}

<style>
  .log-page {
    max-width: 40rem;
    margin: 0 auto;
    padding: var(--space-4) var(--space-3) var(--space-6);
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }
  .head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-3);
  }
  h1 {
    margin: 0;
    font-size: var(--text-2xl);
    color: var(--forest);
  }
  .dim {
    color: var(--text-dim);
    margin: var(--space-1) 0 0;
  }
  .hint {
    margin: 0;
    color: var(--text-dim);
    font-size: var(--text-sm);
  }
  .back {
    min-height: 46px;
    display: inline-flex;
    align-items: center;
    padding: 0 var(--space-4);
    border-radius: var(--radius-pill);
    background: var(--surface-2);
    color: var(--text);
    text-decoration: none;
    font-weight: 600;
  }
  .filters {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }
  .search input {
    width: 100%;
    min-height: 52px;
  }
  .picks {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: var(--space-3);
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    color: var(--text-dim);
    font-size: var(--text-sm);
    font-weight: 600;
  }
  .field select {
    min-height: 46px;
    min-width: 9rem;
    padding: 0 var(--space-3) 0 var(--space-4);
  }
  .check {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-height: 46px;
    font-size: var(--text-sm);
    color: var(--text-dim);
  }
  .check input {
    width: 22px;
    height: 22px;
  }
  .found {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    color: var(--text-dim);
    font-size: var(--text-sm);
  }
  .found button {
    min-height: 44px;
    padding: 0 var(--space-4);
    border-radius: var(--radius-pill);
    background: var(--surface-2);
    color: var(--text);
    cursor: pointer;
  }
  .stats {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--space-2);
  }
  .stat {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    padding: var(--space-4);
    border-radius: var(--radius-lg);
    background: var(--surface);
    box-shadow: var(--shadow-card);
  }
  .stat .value {
    font-size: var(--text-2xl);
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    color: var(--accent);
  }
  .stat .small-value {
    font-size: var(--text-xl);
  }
  .stat .label {
    color: var(--text-dim);
    font-size: var(--text-xs);
    line-height: 1.2;
  }
  .streak {
    margin: 0;
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-lg);
    background: var(--accent-soft);
    font-weight: 600;
  }
  .rates h2 {
    margin: 0 0 var(--space-2);
    font-family: var(--font-body);
    font-size: var(--text-xs);
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--text-dim);
  }
  .rates ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }
  .rates li {
    display: grid;
    grid-template-columns: 1fr auto auto;
    grid-template-areas: 'who record rate' 'bar bar bar';
    gap: var(--space-1) var(--space-2);
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-lg);
    background: var(--surface);
  }
  .who {
    grid-area: who;
    font-weight: 700;
  }
  .record {
    grid-area: record;
    color: var(--text-dim);
    font-variant-numeric: tabular-nums;
  }
  .rate {
    grid-area: rate;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }
  .bar {
    grid-area: bar;
    height: 7px;
    border-radius: var(--radius-pill);
    background: var(--surface-2);
    overflow: hidden;
  }
  .bar span {
    display: block;
    height: 100%;
    width: var(--fill);
    background: var(--accent);
    border-radius: var(--radius-pill);
  }
  .plays {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  .plays li {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    padding: var(--space-4);
    border-radius: var(--radius-card);
    background: var(--surface);
    box-shadow: var(--shadow-card);
  }
  .game {
    display: flex;
    justify-content: space-between;
    gap: var(--space-2);
  }
  .when {
    color: var(--text-dim);
    font-size: var(--text-sm);
  }
  .winner {
    margin: 0;
    font-weight: 700;
  }
  .results {
    margin: 0;
    color: var(--text-dim);
    font-size: var(--text-sm);
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }
  .actions button {
    flex: 1;
    min-height: 48px;
    border-radius: var(--radius-pill);
    background: var(--surface-2);
    color: var(--text);
    cursor: pointer;
  }
  .danger {
    min-height: 48px;
    border-radius: var(--radius-pill);
    background: var(--danger-soft);
    color: var(--danger);
    cursor: pointer;
  }
  .wide {
    width: 100%;
  }
  .empty {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    align-items: flex-start;
    padding: var(--space-5);
    border-radius: var(--radius-card);
    background: var(--accent-soft);
  }
  .empty .title {
    margin: 0;
    font-family: var(--font-display);
    font-weight: 800;
    font-size: var(--text-xl);
  }
  .primary {
    min-height: 52px;
    display: inline-flex;
    align-items: center;
    padding: 0 var(--space-5);
    border-radius: var(--radius-pill);
    background: var(--accent);
    color: var(--accent-text);
    box-shadow: var(--shadow-key);
    text-decoration: none;
    font-weight: 800;
    cursor: pointer;
  }
  .link {
    width: fit-content;
  }
</style>
