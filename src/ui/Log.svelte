<script lang="ts">
  import { clearPlays, listPlays, playsToCsv, playsToJson, statsFor } from '../core/play-log';
  import { copyText, download } from '../core/share';
  import Sheet from '../core/ui/Sheet.svelte';
  import { store } from '../core/session-store.svelte';

  let records = $state(listPlays());
  let confirmOpen = $state(false);
  const stats = $derived(statsFor(records));

  function copyCsv(): void {
    void copyText(playsToCsv(records)).then((ok) => {
      store.toast(ok ? 'History copied as CSV' : 'Could not copy', ok ? 'info' : 'error');
    });
  }

  function clearAll(): void {
    clearPlays();
    records = [];
    confirmOpen = false;
    store.toast('Play history cleared');
  }

  function when(at: number): string {
    return new Date(at).toLocaleString();
  }
</script>

<div class="log-page">
  <header class="head">
    <div>
      <h1>Play log</h1>
      <p class="dim">Finished games on this device. Nothing leaves it.</p>
    </div>
    <a class="back" href="#/">Home</a>
  </header>

  {#if records.length}
    <section class="stats">
      <div class="stat">
        <span class="value">{stats.plays}</span>
        <span class="label">plays</span>
      </div>
      <div class="stat">
        <span class="value">{stats.streak?.length ?? 0}</span>
        <span class="label">
          {stats.streak
            ? `${stats.streak.length === 1 ? 'win' : 'wins'} in a row · ${stats.streak.name}`
            : 'no streak yet'}
        </span>
      </div>
      <div class="stat">
        <span class="value">{stats.wins[0]?.wins ?? 0}</span>
        <span class="label">{stats.wins[0] ? `wins for ${stats.wins[0].name}` : 'no wins yet'}</span>
      </div>
    </section>

    {#if stats.wins.length > 1}
      <ul class="wins">
        {#each stats.wins as row (row.name)}
          <li><span>{row.name}</span><span class="count">{row.wins}</span></li>
        {/each}
      </ul>
    {/if}

    <ul class="plays">
      {#each records as record (record.id)}
        <li>
          <div class="game">
            <strong>{record.game}</strong>
            <span class="when">{when(record.at)}</span>
          </div>
          <p class="winner">{record.winner ? `Won by ${record.winner}` : 'No winner recorded'}</p>
          {#if record.results.length}
            <p class="results">
              {record.results.map((item) => (typeof item.score === 'number' ? `${item.name} ${item.score}` : item.name)).join(' · ')}
            </p>
          {/if}
        </li>
      {/each}
    </ul>

    <div class="actions">
      <button type="button" onclick={copyCsv}>Copy CSV</button>
      <button type="button" onclick={() => download('play-log.csv', playsToCsv(records), 'text/csv')}>CSV file</button>
      <button type="button" onclick={() => download('play-log.json', playsToJson(records), 'application/json')}>JSON file</button>
    </div>
    <button type="button" class="danger" onclick={() => (confirmOpen = true)}>Clear history</button>
  {:else}
    <div class="empty">
      <p class="title">No finished games yet.</p>
      <p class="dim">Open a game, use its menu and tap “Finish game”. The result lands here, with winners and streaks.</p>
      <a class="primary link" href="#/">Pick a tool</a>
    </div>
  {/if}
</div>

{#if confirmOpen}
  <Sheet title="Clear play history" onclose={() => (confirmOpen = false)}>
    <p>Clear the whole log? Every finished game on this device goes; nothing else does. This cannot be undone.</p>
    <button type="button" class="danger wide" onclick={clearAll}>Clear {records.length} plays</button>
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
  .stat .label {
    color: var(--text-dim);
    font-size: var(--text-xs);
    line-height: 1.2;
  }
  .wins {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }
  .wins li {
    display: flex;
    justify-content: space-between;
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-pill);
    background: var(--surface-2);
  }
  .wins .count {
    font-weight: 800;
    font-variant-numeric: tabular-nums;
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
  }
  .link {
    width: fit-content;
  }
</style>
