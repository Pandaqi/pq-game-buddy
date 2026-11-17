<script lang="ts">
  import { navigate } from '../core/router';
  import { store } from '../core/session-store.svelte';
  import { copyText, download } from '../core/share';
  import { suggestFilename } from '../core/template/serialize';
  import PlayerChip from '../core/ui/PlayerChip.svelte';
  import Sheet from '../core/ui/Sheet.svelte';

  let playersOpen = $state(false);
  let menuOpen = $state(false);
  let newName = $state('');

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
</script>

<div class="session">
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
        >
          {item.label}
        </button>
      {/each}
    </div>
  {/if}

  {#if entry}
    {@const ToolComponent = entry.module.component}
    <div class="panel">
      <svelte:boundary>
        <ToolComponent ctx={entry.ctx} instance={entry.instance} />
        {#snippet failed(error, reset)}
          <div class="broken" role="alert">
            <h2>{entry.label} hit an error</h2>
            <pre>{String(error)}</pre>
            <button type="button" onclick={reset}>Try again</button>
          </div>
        {/snippet}
      </svelte:boundary>
    </div>
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
  </Sheet>
{/if}

{#if menuOpen}
  <Sheet title="Game menu" onclose={() => (menuOpen = false)}>
    <button type="button" class="wide" onclick={copySummary}>Copy summary</button>
    <button type="button" class="wide" onclick={saveTemplate}>Save as template</button>
    <button type="button" class="wide" onclick={() => { store.saveNow(); store.toast('Saved'); }}>Save now</button>
    <button type="button" class="wide danger" onclick={closeGame}>Close game</button>
    <p class="dim small">Closing keeps the game saved on this device, ready to resume from home.</p>
  </Sheet>
{/if}

<style>
  .session {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-2) var(--space-6);
    max-width: 52rem;
    margin: 0 auto;
  }
  .head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-2);
    padding: 0 var(--space-1);
  }
  h1 {
    font-size: var(--text-xl);
    letter-spacing: -0.01em;
    margin: 0;
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
    border-radius: var(--radius);
    border: 1px solid var(--line);
    background: var(--surface);
    color: var(--text);
    font-size: var(--text-lg);
    cursor: pointer;
  }
  .players {
    display: flex;
    gap: var(--space-1);
    overflow-x: auto;
    padding: var(--space-1);
  }
  .add-player {
    flex: none;
    min-width: 44px;
    min-height: 44px;
    border-radius: 999px;
    border: 1px dashed var(--line);
    background: transparent;
    color: var(--text-dim);
    cursor: pointer;
    font-size: var(--text-lg);
  }
  .warn {
    margin: 0;
    padding: var(--space-2);
    border-radius: var(--radius);
    background: var(--danger-soft);
    font-size: var(--text-sm);
  }
  .tabs {
    display: flex;
    gap: var(--space-1);
    overflow-x: auto;
    padding-bottom: var(--space-1);
  }
  .tabs button {
    min-height: 48px;
    padding: 0 var(--space-3);
    border-radius: 999px;
    border: 1px solid var(--line);
    background: var(--surface);
    color: var(--text);
    white-space: nowrap;
    cursor: pointer;
  }
  .tabs button.active {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--accent-text);
    font-weight: 700;
  }
  .panel {
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }
  .undo {
    position: sticky;
    bottom: var(--space-2);
    align-self: center;
    min-height: 44px;
    padding: 0 var(--space-4);
    border-radius: 999px;
    border: 1px solid var(--line);
    background: var(--text);
    color: var(--bg);
    cursor: pointer;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.2);
  }
  .broken {
    padding: var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  .broken pre {
    white-space: pre-wrap;
    font-size: var(--text-sm);
    color: var(--danger);
    margin: 0;
  }
  .broken button {
    min-height: 48px;
    border-radius: var(--radius);
    border: 1px solid var(--line);
    background: var(--surface-2);
    color: var(--text);
    cursor: pointer;
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
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--player);
    color: #fff;
    font-weight: 800;
    font-size: var(--text-xs);
    flex: none;
  }
  .player-list input {
    flex: 1;
    min-height: 44px;
    border-radius: var(--radius);
    border: 1px solid var(--line);
    background: var(--surface-2);
    color: var(--text);
    padding: 0 var(--space-2);
  }
  .player-list button {
    min-width: 44px;
    min-height: 44px;
    border-radius: var(--radius);
    border: 1px solid var(--line);
    background: transparent;
    color: var(--text-dim);
    cursor: pointer;
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
  .primary {
    min-height: 48px;
    border-radius: var(--radius);
    border: 0;
    background: var(--accent);
    color: var(--accent-text);
    font-weight: 700;
    cursor: pointer;
  }
  .wide {
    min-height: 52px;
    border-radius: var(--radius);
    border: 1px solid var(--line);
    background: var(--surface-2);
    color: var(--text);
    cursor: pointer;
    font: inherit;
  }
  .wide.danger {
    border-color: var(--danger);
    color: var(--danger);
  }
</style>
