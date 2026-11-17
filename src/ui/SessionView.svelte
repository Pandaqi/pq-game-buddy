<script lang="ts">
  import { createDisplayChannel, displayUrl } from '../core/display';
  import { recordPlay, updatePlay, type PlayResult } from '../core/play-log';
  import { navigate } from '../core/router';
  import { store } from '../core/session-store.svelte';
  import { copyText, download } from '../core/share';
  import { suggestFilename } from '../core/template/serialize';
  import { shareTooLong, templateShareUrl } from '../core/template/share-link';
  import Confetti from '../core/ui/Confetti.svelte';
  import PlayerChip from '../core/ui/PlayerChip.svelte';
  import Sheet from '../core/ui/Sheet.svelte';

  let playersOpen = $state(false);
  let menuOpen = $state(false);
  let newName = $state('');
  let finishOpen = $state(false);
  let finishResults = $state<PlayResult[]>([]);
  let finishSources = $state<{ id: string; label: string; results: PlayResult[] }[]>([]);
  let finishSourceId = $state('');
  let finishWinner = $state('');
  let finishSaved = $state(false);
  let forgetOnClose = $state(false);
  const display = createDisplayChannel();

  // Feed the display tab: no network, just a broadcast of the active tool's state.
  $effect(() => {
    void store.version;
    const active = store.activeEntry;
    if (!active) return;
    display.post({ instanceId: active.id, toolId: active.toolId, state: active.instance.state() });
  });
  const finishTied = $derived(
    finishResults.length > 1 &&
      typeof finishResults[0]?.score === 'number' &&
      finishResults[0].score === finishResults[1]?.score,
  );

  const session = $derived(store.session);
  const entries = $derived.by(() => {
    void store.version;
    return store.entries;
  });
  const entry = $derived.by(() => {
    void store.version;
    return store.activeEntry;
  });
  const canUndo = $derived.by(() => {
    void store.version;
    return !!entry && entry.undo.canUndo();
  });
  const undoLabel = $derived.by(() => {
    void store.version;
    return entry?.undo.label() ?? null;
  });

  function closeGame(): void {
    store.close();
    menuOpen = false;
    navigate({ name: 'home' });
  }

  function copySummary(): void {
    if (!session) return;
    const lines = [`${session.gameName} — ${new Date().toLocaleString()}`, ''];
    for (const item of entries) {
      lines.push(`# ${item.label}`);
      lines.push(item.instance.summary());
      lines.push('');
    }
    void copyText(lines.join('\n')).then((ok) => {
      store.toast(ok ? 'Summary copied' : 'Could not copy', ok ? 'info' : 'error');
    });
    menuOpen = false;
  }

  function saveTemplate(): void {
    if (!session) return;
    const text = store.exportTemplate();
    download(suggestFilename(session.gameName), text);
    store.toast('Template saved');
    menuOpen = false;
  }

  function addPlayerNow(): void {
    store.addPlayer(newName);
    newName = '';
  }

  function shareLink(): void {
    const text = store.exportTemplate();
    if (shareTooLong(text)) {
      store.toast('Too big for a link. Save the file instead.', 'error');
      menuOpen = false;
      return;
    }
    void copyText(templateShareUrl(text)).then((ok) => {
      store.toast(ok ? 'Share link copied' : 'Could not copy', ok ? 'info' : 'error');
    });
    menuOpen = false;
  }

  function exportSession(): void {
    if (!session) return;
    const name = suggestFilename(session.gameName).replace(/\.gamebuddy$/, '-session.json');
    download(name, store.exportSessionJson(), 'application/json');
    store.toast('Session file exported');
    menuOpen = false;
  }

  function fallbackResults(): PlayResult[] {
    return (session?.players ?? []).map((player) => ({ name: player.name }));
  }

  function defaultWinner(rows: PlayResult[]): string {
    const first = rows[0];
    if (!first) return '';
    if (rows.length > 1 && typeof first.score === 'number' && first.score === rows[1].score) return '';
    return first.name;
  }

  function useSource(id: string): void {
    finishSourceId = id;
    const source = finishSources.find((item) => item.id === id);
    finishResults = source ? source.results.map((row) => ({ ...row })) : fallbackResults();
    finishWinner = defaultWinner(finishResults);
  }

  function openFinish(): void {
    finishSources = entries
      .map((item) => ({
        id: item.id,
        label: item.label,
        results: (item.instance.results?.() ?? []).map((row) => ({ ...row })),
      }))
      .filter((source) => source.results.length);
    const initial = finishSources.find((source) => source.id === store.activeId) ?? finishSources[0];
    finishResults = initial ? initial.results.map((row) => ({ ...row })) : fallbackResults();
    finishSourceId = initial?.id ?? '';
    finishWinner = defaultWinner(finishResults);
    finishSaved = !!session?.playId;
    forgetOnClose = false;
    finishOpen = true;
    menuOpen = false;
  }

  function savePlay(): void {
    if (!session) return;
    const players = session.players.map((player) => player.name);
    if (session.playId) {
      const updated = updatePlay(session.playId, { results: finishResults, winner: finishWinner, players });
      if (updated) {
        finishSaved = true;
        store.toast('Play log updated');
        return;
      }
    }
    const saved = recordPlay({
      game: session.gameName,
      players,
      results: finishResults,
      winner: finishWinner,
      templateId: session.templateId,
    });
    store.markPlaySaved(saved.id);
    finishSaved = true;
    store.toast('Saved to the play log');
  }

  function saveAndClose(): void {
    if (!finishSaved) savePlay();
    finishAndClose();
  }

  function syncPlayers(): void {
    const count = store.syncPlayersToTools();
    const message = count
      ? `Players synced in ${count} tool${count === 1 ? '' : 's'}`
      : 'No tools can sync players';
    store.toast(message, count ? 'info' : 'error');
    menuOpen = false;
  }

  function finishAndClose(): void {
    const id = session?.id;
    if (id && forgetOnClose) store.forgetSession(id);
    store.close();
    finishOpen = false;
    menuOpen = false;
    navigate({ name: 'home' });
  }

  function copyResult(): void {
    const lines = [`${session?.gameName ?? 'Game'} — ${new Date().toLocaleString()}`];
    lines.push(finishWinner ? `Winner: ${finishWinner}` : 'No single winner');
    for (const row of finishResults) {
      lines.push(`${row.name}${typeof row.score === 'number' ? `: ${row.score}` : ''}`);
    }
    void copyText(lines.join('\n')).then((ok) => {
      store.toast(ok ? 'Result copied' : 'Could not copy', ok ? 'info' : 'error');
    });
  }
</script>

<div class="session" data-family={entry?.module.family ?? 'track'}>
  <header class="head">
    <div class="title">
      <h1>{session?.gameName ?? 'Game'}</h1>
      <p class="dim">{entries.length} tool{entries.length === 1 ? '' : 's'}</p>
    </div>
    <button type="button" class="menu" onclick={() => (menuOpen = true)} aria-label="Game menu">⋯</button>
  </header>

  <div class="players">
    {#each session?.players ?? [] as player (player.id)}
      <PlayerChip name={player.name} initial={player.initial} color={player.color} active={player.active} onclick={() => store.setActivePlayer(player.id)} />
    {/each}
    <button type="button" class="add-player" onclick={() => (playersOpen = true)} aria-label="Edit players">+</button>
  </div>

  {#if store.unavailable.length}
    <p class="warn" role="status">
      This template uses tools this build does not have ({store.unavailable.map((item) => item.toolId).join(', ')}). Everything else still runs.
    </p>
  {/if}

  {#if entries.length > 1}
    <div class="tabs" role="tablist" aria-label="Tools">
      {#each entries as item (item.id)}
        <button
          type="button"
          role="tab"
          aria-selected={store.activeId === item.id}
          class:active={store.activeId === item.id}
          onclick={() => store.setTab(item.id)}
          data-family={item.module.family}
        >
          <span class="tab-mark" aria-hidden="true">{@html item.module.icon}</span>
          {item.label}
        </button>
      {/each}
    </div>
  {/if}

  {#if entry}
    {@const Tool = entry.module.component}
    {#key store.activeId}
    <div class="panel">
      <svelte:boundary>
        <Tool ctx={entry.ctx} instance={entry.instance} />
        {#snippet failed(error, reset)}
          <div class="broken" role="alert">
            <h2>{entry.label} hit an error</h2>
            <pre>{String(error)}</pre>
            <button type="button" onclick={reset}>Try again</button>
          </div>
        {/snippet}
      </svelte:boundary>
    </div>
    {/key}
  {:else}
    <p class="dim pad">This session has no tools yet. Close it and start from a template.</p>
  {/if}

  {#if canUndo}
    <button type="button" class="undo" onclick={() => store.undoActive()}>
      Undo{undoLabel ? `: ${undoLabel}` : ''}
    </button>
  {/if}
</div>

{#if playersOpen}
  <Sheet title="Players" onclose={() => (playersOpen = false)}>
    <ul class="player-list">
      {#each store.players() as player (player.id)}
        <li>
          <span class="dot" style="--player: {player.color}">{player.initial}</span>
          <input
            type="text"
            value={player.name}
            aria-label="Name for {player.name}"
            onchange={(event) => store.renamePlayer(player.id, (event.currentTarget as HTMLInputElement).value)}
          />
          <button
            type="button"
            onclick={() => store.removePlayer(player.id)}
            aria-label="Remove {player.name}"
            disabled={store.players().length <= 1}
          >
            ✕
          </button>
        </li>
      {/each}
    </ul>
    <label class="field">
      <span>Add a player</span>
      <input type="text" bind:value={newName} onkeydown={(event) => { if (event.key === 'Enter') addPlayerNow(); }} />
    </label>
    <button type="button" class="primary" onclick={addPlayerNow}>Add player</button>
    <button type="button" class="wide" onclick={() => { syncPlayers(); playersOpen = false; }}>Sync tools with these players</button>
  </Sheet>
{/if}

{#if finishOpen}
  <Sheet title="Finish game" onclose={() => (finishOpen = false)}>
    {#if finishWinner}<Confetti />{/if}
    <p class="dim small">Results come from this game's tools. Pick the source and the winner, then save it to the log.</p>

    {#if finishSources.length > 1}
      <div class="sources" role="group" aria-label="Results source">
        {#each finishSources as source (source.id)}
          <button type="button" class:active={finishSourceId === source.id} onclick={() => useSource(source.id)}>
            {source.label}
          </button>
        {/each}
      </div>
    {/if}

    {#if finishTied}
      <p class="tie" role="status">That score is tied. Choose who won, or pick “no single winner”.</p>
    {/if}

    <ul class="finish-list">
      {#each finishResults as row (row.name)}
        <li>
          <label>
            <input
              type="radio"
              name="finish-winner"
              value={row.name}
              checked={finishWinner === row.name}
              onchange={() => (finishWinner = row.name)}
            />
            <span>{row.name}</span>
          </label>
          {#if typeof row.score === 'number'}<span class="finish-score">{row.score}</span>{/if}
        </li>
      {/each}
      <li>
        <label>
          <input
            type="radio"
            name="finish-winner"
            value=""
            checked={finishWinner === ''}
            onchange={() => (finishWinner = '')}
          />
          <span>No single winner (co-op or abandoned)</span>
        </label>
      </li>
    </ul>

    {#if finishSaved}
      <p class="saved" role="status">This game is in the play log.</p>
      <button type="button" class="wide" onclick={savePlay}>Update play log</button>
      <button type="button" class="wide primary-wide" onclick={finishAndClose}>
        {forgetOnClose ? 'Forget game and close' : 'Close game and go home'}
      </button>
    {:else}
      <button type="button" class="wide" onclick={savePlay}>Save to the play log</button>
      <button type="button" class="wide primary-wide" onclick={saveAndClose}>Save and close</button>
      <button type="button" class="wide danger" onclick={finishAndClose}>Close without saving</button>
    {/if}
    <button type="button" class="wide" onclick={copyResult}>Copy result</button>

    <label class="check">
      <input type="checkbox" bind:checked={forgetOnClose} />
      <span>Also forget the saved game on this device</span>
    </label>
    <p class="dim small">Closing keeps the game resumable unless you tick the box. Nothing is deleted without that choice.</p>
  </Sheet>
{/if}

{#if menuOpen}
  <Sheet title="Game menu" onclose={() => (menuOpen = false)}>
    <button type="button" class="wide" onclick={copySummary}>Copy summary</button>
    <button type="button" class="wide" onclick={() => window.print()}>Print this game</button>
    {#if entry}
      <a class="wide link" href={displayUrl(entry.id)} target="_blank" rel="noopener noreferrer">Open display view</a>
    {/if}
    <button type="button" class="wide" onclick={saveTemplate}>Save as template</button>
    <button type="button" class="wide" onclick={shareLink}>Share as link</button>
    <button type="button" class="wide" onclick={exportSession}>Export session JSON</button>
    <a class="wide link" href="#/log">Play log</a>
    <a class="wide link" href="#/settings">Settings</a>
    <button type="button" class="wide" onclick={() => { store.saveNow(); store.toast('Saved'); }}>Save now</button>
    <button type="button" class="wide" onclick={syncPlayers}>Sync players to tools</button>
    <button type="button" class="wide primary-wide" onclick={openFinish}>Finish game</button>
    <button type="button" class="wide danger" onclick={closeGame}>Close game</button>
    <p class="dim small">Closing keeps the game saved on this device, ready to resume from home.</p>
  </Sheet>
{/if}

<style>
  /* A strip, then the tool owns the screen. No box around the tool: the blocks
     inside it are the only cards on screen. */
  .session {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding: var(--space-2) var(--space-3) var(--space-7);
    max-width: 56rem;
    margin: 0 auto;
  }
  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    padding: 0 var(--space-2);
  }
  h1 {
    font-size: var(--text-xl);
    margin: 0;
    color: var(--forest);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .title {
    min-width: 0;
  }
  .title .dim {
    font-size: var(--text-xs);
    margin: 0;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    font-weight: 700;
  }
  .dim {
    color: var(--text-dim);
  }
  .small {
    font-size: var(--text-sm);
  }
  .menu {
    min-width: 48px;
    min-height: 48px;
    border-radius: var(--radius-round);
    background: var(--surface-2);
    color: var(--text);
    font-size: var(--text-lg);
    box-shadow: none;
    flex: none;
  }
  .players {
    display: flex;
    gap: var(--space-2);
    overflow-x: auto;
    padding: var(--space-1) var(--space-2) var(--space-2);
  }
  .add-player {
    flex: none;
    min-width: 48px;
    min-height: 48px;
    border-radius: var(--radius-round);
    background: var(--surface-2);
    color: var(--text-dim);
    box-shadow: none;
    font-size: var(--text-lg);
  }
  .warn {
    margin: 0 var(--space-2);
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-pill);
    background: var(--danger-soft);
    font-size: var(--text-sm);
  }
  .tabs {
    display: flex;
    gap: var(--space-2);
    overflow-x: auto;
    padding: 0 var(--space-2) var(--space-1);
  }
  .tabs button {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    min-height: 46px;
    padding: 0 var(--space-4);
    background: var(--surface-2);
    color: var(--text-dim);
    white-space: nowrap;
    box-shadow: none;
  }
  .tabs button.active {
    background: var(--accent);
    color: var(--accent-text);
    box-shadow: var(--shadow-key);
  }
  .tab-mark {
    display: inline-grid;
    place-items: center;
  }
  .tab-mark :global(svg) {
    width: 20px;
    height: 20px;
  }
  /* Transparent: a tool's own blocks are the cards. */
  .panel {
    background: transparent;
    box-shadow: none;
    padding: 0 var(--space-1);
    overflow: visible;
    animation: bloom var(--motion-bounce) var(--ease-bounce);
  }
  .undo {
    position: sticky;
    bottom: var(--space-3);
    align-self: center;
    min-height: 48px;
    padding: 0 var(--space-5);
    background: var(--ink);
    color: var(--paper);
    box-shadow: var(--shadow-lift);
    animation: bloom var(--motion-settle) var(--ease-bounce);
  }
  .broken {
    padding: var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    background: var(--danger-soft);
    border-radius: var(--radius-card);
  }
  .broken pre {
    white-space: pre-wrap;
    font-size: var(--text-sm);
    color: var(--danger);
    margin: 0;
  }
  .broken button {
    min-height: 48px;
    background: var(--surface);
  }
  .pad {
    padding: var(--space-4);
  }
  .player-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  .player-list li {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }
  .dot {
    display: inline-grid;
    place-items: center;
    width: 38px;
    height: 38px;
    border-radius: var(--radius-round);
    background: var(--player);
    color: var(--on-seat);
    font-family: var(--font-display);
    font-weight: 800;
    font-size: var(--text-sm);
    flex: none;
  }
  .player-list input {
    flex: 1;
    min-height: 48px;
  }
  .player-list button {
    min-width: 48px;
    min-height: 48px;
    border-radius: var(--radius-round);
    background: var(--surface-2);
    color: var(--text-dim);
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    color: var(--text-dim);
  }
  .primary {
    min-height: 54px;
    background: var(--accent);
    color: var(--accent-text);
    box-shadow: var(--shadow-key);
    font-weight: 800;
    font-size: var(--text-lg);
  }
  .wide {
    min-height: 54px;
    background: var(--surface-2);
    color: var(--text);
    font: inherit;
    font-family: var(--font-display);
    font-weight: 700;
  }
  .wide.danger {
    background: var(--danger-soft);
    color: var(--danger);
  }
  .link {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 54px;
    border-radius: var(--radius-pill);
    background: var(--surface-2);
    color: var(--text);
    text-decoration: none;
    font-family: var(--font-display);
    font-weight: 700;
  }
  .primary-wide {
    background: var(--accent);
    color: var(--accent-text);
    box-shadow: var(--shadow-key);
    font-weight: 800;
  }
  .finish-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }
  .finish-list li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    min-height: 52px;
    padding: 0 var(--space-2);
    border-radius: var(--radius-pill);
  }
  .finish-list li:hover {
    background: var(--surface-2);
  }
  .finish-list label {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    cursor: pointer;
  }
  .finish-score {
    font-family: var(--font-num);
    font-size: var(--text-lg);
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }
  .sources {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
  }
  .sources button {
    min-height: 44px;
    padding: 0 var(--space-4);
    background: var(--surface-2);
    color: var(--text);
  }
  .sources button.active {
    background: var(--accent-soft);
    color: var(--accent-deep);
    font-weight: 800;
  }
  .tie,
  .saved {
    margin: 0;
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-lg);
    background: var(--accent-soft);
    font-size: var(--text-sm);
  }
  .saved {
    font-weight: 800;
  }
  .check {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-height: 48px;
  }
</style>
