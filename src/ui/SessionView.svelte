<script lang="ts">
  import { onMount } from 'svelte';
  import { createDisplayChannel, displayUrl } from '../core/display';
  import { language, t } from '../core/i18n.svelte';
  import { gameName } from '../core/game-name';
  import { scrollToStart } from '../core/dom';
  import { recordPlay, updatePlay, type PlayResult } from '../core/play-log';
  import { navigate } from '../core/router';
  import { store } from '../core/session-store.svelte';
  import { copyText, download } from '../core/share';
  import { parseTemplate } from '../core/template/parse';
  import { suggestFilename } from '../core/template/serialize';
  import { assetMark } from '../core/template/assets';
  import { exportToolFile, isInstalledToolFile, toolFileDefinition } from '../core/tool-file';
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
  let qrOpen = $state(false);
  let qrImage = $state('');
  let qrError = $state('');
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

  /**
   * The game's own page, from the `source:` line its template carries. The template text is
   * stored in the session, so this needs no extra field and covers imports as well.
   */
  const sourceUrl = $derived.by(() => {
    const text = session?.templateText;
    if (!text) return '';
    const url = parseTemplate(text).template.game.source ?? '';
    return /^https?:\/\//.test(url) ? url : '';
  });

  /** Seat names as this language says them: a generated seat is translated here. */
  const players = $derived(store.players());

  /** The name to say now: a one-tool session is translated again from its id. */
  const sessionName = $derived(
    gameName(language(), session?.toolId, session?.gameName ?? t('game.fallback')),
  );
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
  /** Installed tool files this game uses: each one can travel as its own file. */
  const toolFileEntries = $derived(entries.filter((item) => isInstalledToolFile(item.toolId)));

  // A tool tab swap is not a route change, so it asks for the same reset itself.
  let shownTool = '';
  $effect(() => {
    const id = store.activeId ?? '';
    if (id === shownTool) return;
    shownTool = id;
    scrollToStart();
  });

  // The seat strip is chrome, not content: open where a tool seats everyone,
  // folded away everywhere else. The choice sticks per tool instance.
  // An installed definition's own seats and accent win over the shared runtime's.
  function familyOf(item: { toolId: string; module: { family: string } }): string {
    return toolFileDefinition(item.toolId)?.family ?? item.module.family;
  }
  function iconOf(item: { toolId: string; module: { icon: string } }): string {
    const definition = toolFileDefinition(item.toolId);
    return definition ? assetMark(definition.icon) || item.module.icon : item.module.icon;
  }
  const seats = $derived(
    (entry ? toolFileDefinition(entry.toolId)?.seats : undefined) ?? entry?.module.seats ?? 'multi',
  );
  let seatPrefs = $state<Record<string, boolean>>({});
  let toolsOpen = $state(false);
  const seatsOpen = $derived(seatPrefs[entry?.id ?? ''] ?? seats === 'multi');
  const seatCount = $derived(session?.players.length ?? 0);
  const seatSummary = $derived(
    seatCount === 1 ? t('session.players-one') : t('session.players-many', { count: seatCount }),
  );

  function toggleSeats(): void {
    if (!entry) return;
    seatPrefs = { ...seatPrefs, [entry.id]: !seatsOpen };
  }

  function closeGame(): void {
    store.close();
    menuOpen = false;
    navigate({ name: 'home' });
  }

  function copySummary(): void {
    if (!session) return;
    const lines = [`${sessionName} — ${new Date().toLocaleString(language())}`, ''];
    for (const item of entries) {
      lines.push(`# ${item.label}`);
      lines.push(item.instance.summary());
      lines.push('');
    }
    void copyText(lines.join('\n')).then((ok) => {
      store.toast(ok ? t('toast.summary-copied') : t('toast.could-not-copy'), ok ? 'info' : 'error');
    });
    menuOpen = false;
  }

  function saveTemplate(): void {
    if (!session) return;
    const text = store.exportTemplate();
    download(suggestFilename(session.gameName), text);
    store.toast(t('toast.template-saved'));
    menuOpen = false;
  }

  function saveToolFile(id: string): void {
    const text = exportToolFile(id);
    if (!text) return;
    download(`${id}.gamebuddy-tool`, text);
    store.toast(t('toast.template-saved'));
    menuOpen = false;
  }

  function addPlayerNow(): void {
    store.addPlayer(newName);
    newName = '';
  }

  /** QR needs a real origin; a file:// path cannot be opened by a phone camera. */
  async function showQr(): Promise<void> {
    menuOpen = false;
    if (typeof location === 'undefined' || !/^https?:$/.test(location.protocol)) {
      store.toast(t('toast.qr-hosted'), 'error');
      return;
    }
    const link = templateShareUrl(store.exportTemplate());
    // One symbol holds 2953 bytes in byte mode; the share URL is ASCII, so length is bytes.
    if (new TextEncoder().encode(link).length > 2953) {
      store.toast(t('toast.qr-too-big'), 'error');
      return;
    }
    qrImage = '';
    qrError = '';
    qrOpen = true;
    try {
      const { qrSvg } = await import('../core/qr');
      qrImage = qrSvg(link).svg;
    } catch {
      qrError = t('toast.qr-too-big');
    }
  }

  function shareLink(): void {
    const text = store.exportTemplate();
    if (shareTooLong(text)) {
      store.toast(t('toast.share-too-long'), 'error');
      menuOpen = false;
      return;
    }
    void copyText(templateShareUrl(text)).then((ok) => {
      store.toast(ok ? t('toast.share-copied') : t('toast.could-not-copy'), ok ? 'info' : 'error');
    });
    menuOpen = false;
  }

  function exportSession(): void {
    if (!session) return;
    const name = suggestFilename(session.gameName).replace(/\.gamebuddy$/, '-session.json');
    download(name, store.exportSessionJson(), 'application/json');
    store.toast(t('toast.session-exported'));
    menuOpen = false;
  }

  function fallbackResults(): PlayResult[] {
    return players.map((player) => ({ name: player.name }));
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
    const names = players.map((player) => player.name);
    // Rounded up: a 4½ minute game still counts as 5 minutes of table time.
    const minutes = Math.max(1, Math.ceil((Date.now() - session.createdAt) / 60000));
    if (session.playId) {
      const updated = updatePlay(session.playId, { results: finishResults, winner: finishWinner, players: names, minutes });
      if (updated) {
        finishSaved = true;
        store.toast(t('toast.play-updated'));
        return;
      }
    }
    const saved = recordPlay({
      game: session.gameName,
      toolId: session.toolId,
      players: names,
      results: finishResults,
      winner: finishWinner,
      templateId: session.templateId,
      minutes,
    });
    store.markPlaySaved(saved.id);
    finishSaved = true;
    store.toast(t('toast.play-saved'));
  }

  function saveAndClose(): void {
    if (!finishSaved) savePlay();
    finishAndClose();
  }

  function syncPlayers(): void {
    const count = store.syncPlayersToTools();
    const message = count
      ? count === 1
        ? t('toast.players-synced-one')
        : t('toast.players-synced', { count })
      : t('toast.no-sync-tools');
    store.toast(message, count ? 'info' : 'error');
    menuOpen = false;
  }

  /**
   * A rematch is a new session with the same table and settings. It is offered
   * once the result is in the log, so restarting can never lose a play.
   */
  async function playAgain(): Promise<void> {
    // Always write the latest result first, even when the play was saved earlier.
    savePlay();
    finishOpen = false;
    menuOpen = false;
    if (await store.restart()) navigate({ name: 'session' });
  }

  // Ctrl/Cmd+Z undoes the active tool, except while typing in a field.
  onMount(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (!(event.ctrlKey || event.metaKey) || event.shiftKey) return;
      if (event.key.toLowerCase() !== 'z') return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName ?? '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return;
      if (!store.activeEntry?.undo.canUndo()) return;
      event.preventDefault();
      store.undoActive();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function finishAndClose(): void {
    const id = session?.id;
    if (id && forgetOnClose) store.forgetSession(id);
    store.close();
    finishOpen = false;
    menuOpen = false;
    navigate({ name: 'home' });
  }

  function copyResult(): void {
    const lines = [`${sessionName} — ${new Date().toLocaleString(language())}`];
    lines.push(
      finishWinner ? t('finish.winner', { name: finishWinner }) : t('finish.no-single-winner'),
    );
    for (const row of finishResults) {
      lines.push(`${row.name}${typeof row.score === 'number' ? `: ${row.score}` : ''}`);
    }
    void copyText(lines.join('\n')).then((ok) => {
      store.toast(ok ? t('toast.result-copied') : t('toast.could-not-copy'), ok ? 'info' : 'error');
    });
  }
</script>

<div class="session" data-family={entry ? familyOf(entry) : 'track'}>
  <header class="head">
    <div class="title">
      <h1>{sessionName}</h1>
      <p class="dim">
        {entries.length === 1
          ? t('session.tool-count-one', { count: 1 })
          : t('session.tool-count-many', { count: entries.length })}
      </p>
    </div>
    <button type="button" class="menu" onclick={() => (menuOpen = true)} aria-label={t('session.menu')}>⋯</button>
  </header>

  {#if entry && seats !== 'none'}
    <div class="seats">
      <button
        type="button"
        class="seats-toggle"
        aria-expanded={seatsOpen}
        aria-label={seatsOpen ? t('session.seats-hide') : t('session.seats-show')}
        onclick={toggleSeats}
      >
        <span class="seats-dots" aria-hidden="true">
          {#each players.slice(0, 4) as player (player.id)}
            <span class="mini" style="--player: {player.color}">{player.initial}</span>
          {/each}
        </span>
        <span class="seats-label">{seatSummary}</span>
        <span class="chev" class:open={seatsOpen} aria-hidden="true">▾</span>
      </button>

      {#if seatsOpen}
        <div class="players">
          {#each players as player (player.id)}
            <PlayerChip name={player.name} initial={player.initial} color={player.color} active={player.active} onclick={() => store.setActivePlayer(player.id)} />
          {/each}
          <button type="button" class="add-player" onclick={() => (playersOpen = true)} aria-label={t('session.edit-players')}>+</button>
        </div>
      {/if}
    </div>
  {/if}

  {#if store.unavailable.length}
    <p class="warn" role="status">
      {t('session.unavailable', { tools: store.unavailable.map((item) => item.toolId).join(', ') })}
    </p>
  {/if}

  {#if entries.length > 1}
    <div class="tools">
      <button
        type="button"
        class="tools-toggle"
        aria-expanded={toolsOpen}
        aria-controls="session-tools"
        onclick={() => (toolsOpen = !toolsOpen)}
      >
        <span class="tab-marks" aria-hidden="true">
          {#each entries.slice(0, 3) as item (item.id)}
            <span class="tab-mark">{@html iconOf(item)}</span>
          {/each}
        </span>
        <span>
          {entry?.label ?? t('session.tools')} ·
          {entries.length === 1
            ? t('session.tool-count-one', { count: 1 })
            : t('session.tool-count-many', { count: entries.length })}
        </span>
        <span class="chev" class:open={toolsOpen} aria-hidden="true">▾</span>
      </button>
      {#if toolsOpen}
        <div class="tabs" id="session-tools" role="tablist" aria-label={t('session.tools')}>
          {#each entries as item (item.id)}
            <button
              type="button"
              role="tab"
              id={`tab-${item.id}`}
              aria-controls="session-panel"
              aria-selected={store.activeId === item.id}
              class:active={store.activeId === item.id}
              onclick={() => store.setTab(item.id)}
              data-family={familyOf(item)}
            >
              <span class="tab-mark" aria-hidden="true">{@html iconOf(item)}</span>
              {item.label}
            </button>
          {/each}
        </div>
      {/if}
    </div>
  {/if}

  {#if entry}
    {@const Tool = entry.module.component}
    {#key store.activeId}
    <div class="panel" id="session-panel" role="tabpanel" aria-labelledby={`tab-${store.activeId}`}>
      <svelte:boundary>
        <Tool ctx={entry.ctx} instance={entry.instance} />
        {#snippet failed(error, reset)}
          <div class="broken" role="alert">
            <h2>{t('session.tool-broke', { label: entry.label })}</h2>
            <pre>{String(error)}</pre>
            <button type="button" onclick={reset}>{t('app.try-again')}</button>
          </div>
        {/snippet}
      </svelte:boundary>
    </div>
    {/key}
  {:else}
    <p class="dim pad">{t('session.no-tools')}</p>
  {/if}

  {#if canUndo}
    <button type="button" class="undo" onclick={() => store.undoActive()}>
      {undoLabel ? t('session.undo-with', { label: undoLabel }) : t('session.undo')}
    </button>
  {/if}
</div>

{#if playersOpen}
  <Sheet title={t('players.title')} onclose={() => (playersOpen = false)}>
    <ul class="player-list">
      {#each players as player (player.id)}
        <li>
          <span class="dot" style="--player: {player.color}">{player.initial}</span>
          <input
            type="text"
            value={player.name}
            aria-label={t('players.name', { name: player.name })}
            onchange={(event) => store.renamePlayer(player.id, (event.currentTarget as HTMLInputElement).value)}
          />
          <button
            type="button"
            onclick={() => store.removePlayer(player.id)}
            aria-label={t('players.remove', { name: player.name })}
            disabled={players.length <= 1}
          >
            ✕
          </button>
        </li>
      {/each}
    </ul>
    <label class="field">
      <span>{t('players.add-label')}</span>
      <input type="text" bind:value={newName} onkeydown={(event) => { if (event.key === 'Enter') addPlayerNow(); }} />
    </label>
    <button type="button" class="primary" onclick={addPlayerNow}>{t('players.add')}</button>
    <button type="button" class="wide" onclick={() => { syncPlayers(); playersOpen = false; }}>{t('players.sync')}</button>
  </Sheet>
{/if}

{#if finishOpen}
  <Sheet title={t('finish.title')} onclose={() => (finishOpen = false)}>
    {#if finishWinner}<Confetti />{/if}
    <p class="dim small">{t('finish.hint')}</p>

    {#if finishSources.length > 1}
      <div class="sources" role="group" aria-label={t('finish.source')}>
        {#each finishSources as source (source.id)}
          <button type="button" class:active={finishSourceId === source.id} onclick={() => useSource(source.id)}>
            {source.label}
          </button>
        {/each}
      </div>
    {/if}

    {#if finishTied}
      <p class="tie" role="status">{t('finish.tied')}</p>
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
          <span>{t('finish.no-winner')}</span>
        </label>
      </li>
    </ul>

    {#if finishSaved}
      <p class="saved" role="status">{t('finish.in-log')}</p>
      <button type="button" class="wide" onclick={savePlay}>{t('finish.update')}</button>
      <button type="button" class="wide primary-wide" onclick={playAgain}>{t('finish.play-again')}</button>
      <button type="button" class="wide" onclick={finishAndClose}>
        {forgetOnClose ? t('finish.forget-close') : t('finish.close-home')}
      </button>
    {:else}
      <button type="button" class="wide" onclick={savePlay}>{t('finish.save')}</button>
      <button type="button" class="wide primary-wide" onclick={saveAndClose}>{t('finish.save-close')}</button>
      <button type="button" class="wide danger" onclick={finishAndClose}>{t('finish.close-unsaved')}</button>
    {/if}
    <button type="button" class="wide" onclick={copyResult}>{t('finish.copy')}</button>

    <label class="check">
      <input type="checkbox" bind:checked={forgetOnClose} />
      <span>{t('finish.forget')}</span>
    </label>
    <p class="dim small">{t('finish.forget-hint')}</p>
  </Sheet>
{/if}

{#if qrOpen}
  <Sheet title={t('qr.title')} onclose={() => (qrOpen = false)}>
    {#if qrImage}
      <div class="qr">{@html qrImage}</div>
      <p class="dim small">{t('qr.hint')}</p>
    {:else if qrError}
      <p class="dim">{qrError}</p>
    {:else}
      <p class="dim">{t('qr.drawing')}</p>
    {/if}
  </Sheet>
{/if}

{#if menuOpen}
  <Sheet title={t('menu.title')} onclose={() => (menuOpen = false)}>
    <button type="button" class="wide" onclick={copySummary}>{t('menu.copy-summary')}</button>
    <button type="button" class="wide" onclick={() => window.print()}>{t('menu.print')}</button>
    {#if entry}
      <a class="wide link" href={displayUrl(entry.id)} target="_blank" rel="noopener noreferrer">{t('menu.display')}</a>
    {/if}
    <button type="button" class="wide" onclick={saveTemplate}>{t('menu.save-template')}</button>
    {#each toolFileEntries as item (item.id)}
      <button type="button" class="wide" onclick={() => saveToolFile(item.toolId)}>{t('menu.save-tool', { name: item.toolId })}</button>
    {/each}
    <button type="button" class="wide" onclick={shareLink}>{t('menu.share')}</button>
    <button type="button" class="wide" onclick={showQr}>{t('menu.qr')}</button>
    <button type="button" class="wide" onclick={exportSession}>{t('menu.export-session')}</button>
    {#if sourceUrl}
      <a class="wide link" href={sourceUrl} target="_blank" rel="noopener noreferrer">{t('menu.game-page')}</a>
    {/if}
    <a class="wide link" href="#/log">{t('menu.log')}</a>
    <a class="wide link" href="#/settings">{t('menu.settings')}</a>
    <button type="button" class="wide" onclick={() => { store.saveNow(); store.toast(t('toast.saved')); }}>{t('menu.save-now')}</button>
    <button type="button" class="wide" onclick={syncPlayers}>{t('menu.sync')}</button>
    <button type="button" class="wide primary-wide" onclick={openFinish}>{t('menu.finish')}</button>
    <button type="button" class="wide danger" onclick={closeGame}>{t('menu.close')}</button>
    <p class="dim small">{t('menu.close-hint')}</p>
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
    line-height: 1.15;
    overflow-wrap: break-word;
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
  .seats {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    padding: 0 var(--space-2);
  }
  .seats-toggle,
  .tools-toggle {
    align-self: flex-start;
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    min-height: 48px;
    padding: 0 var(--space-3) 0 var(--space-2);
    background: transparent;
    color: var(--text-dim);
    box-shadow: none;
    border-radius: var(--radius-pill);
    font-size: var(--text-sm);
    font-weight: 600;
  }
  .seats-toggle:hover,
  .tools-toggle:hover {
    background: var(--surface-2);
    color: var(--text);
    transform: none;
    box-shadow: none;
  }
  .seats-dots {
    display: inline-flex;
  }
  .mini {
    display: inline-grid;
    place-items: center;
    width: 26px;
    height: 26px;
    border-radius: var(--radius-round);
    background: var(--player);
    color: var(--on-seat);
    font-family: var(--font-display);
    font-size: 0.7rem;
    font-weight: 800;
  }
  .mini + .mini {
    margin-left: -7px;
  }
  .chev {
    font-size: 0.9em;
    transition: transform var(--motion-pop) var(--ease-out);
  }
  .chev.open {
    transform: rotate(180deg);
  }
  .players {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    padding: 0 0 var(--space-1);
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
  .tools {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    padding: 0 var(--space-2);
  }
  .tab-marks {
    display: inline-flex;
  }
  .tab-marks .tab-mark {
    width: 26px;
    height: 26px;
    border-radius: var(--radius-sm);
    background: var(--surface-2);
  }
  .tab-marks .tab-mark :global(svg) {
    width: 17px;
    height: 17px;
  }
  .tab-marks .tab-mark + .tab-mark {
    margin-left: -6px;
  }
  .tabs {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    padding: 0 0 var(--space-1);
  }
  .tabs button {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    min-height: 48px;
    padding: var(--space-1) var(--space-4);
    background: var(--surface-2);
    color: var(--text-dim);
    text-align: left;
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
    min-height: 48px;
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
  .qr {
    display: grid;
    place-items: center;
    padding: var(--space-3);
    border-radius: var(--radius);
    background: #ffffff;
  }
  .qr :global(svg) {
    display: block;
    width: min(22rem, 78vw);
    height: auto;
  }
</style>
