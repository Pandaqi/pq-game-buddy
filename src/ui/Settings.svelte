<script lang="ts">
  import { settings } from '../core/settings.svelte';
  import { storage, storagePersistent } from '../core/storage';
  import Sheet from '../core/ui/Sheet.svelte';

  let resetOpen = $state(false);
  let confirmText = $state('');

  const storageText = $derived(
    storagePersistent
      ? 'Saved on this device.'
      : storage.kind === 'session'
        ? 'Only while this tab stays open. Export your game to keep it.'
        : 'This browser cannot save. Export your game to keep it.',
  );

  function doReset(): void {
    if (confirmText.trim().toUpperCase() !== 'DELETE') return;
    settings.clearAllData();
    resetOpen = false;
    confirmText = '';
  }
</script>

<div class="settings">
  <h1>Settings</h1>

  <section>
    <h2>Theme</h2>
    <div class="segment">
      {#each ['system', 'light', 'dark'] as theme (theme)}
        <button
          type="button"
          class:active={settings.values.theme === theme}
          onclick={() => settings.set('theme', theme as 'system' | 'light' | 'dark')}
        >
          {theme}
        </button>
      {/each}
    </div>
  </section>

  <section>
    <h2>Table mode</h2>
    <label class="check">
      <input type="checkbox" checked={settings.values.table} onchange={(event) => settings.set('table', (event.currentTarget as HTMLInputElement).checked)} />
      <span>Huge type and bigger targets for a phone lying on the table.</span>
    </label>
  </section>

  <section>
    <h2>Motion</h2>
    <div class="segment">
      {#each [['system', 'System'], ['reduce', 'Reduced'], ['allow', 'Full']] as item (item[0])}
        <button
          type="button"
          class:active={settings.values.motion === item[0]}
          onclick={() => settings.set('motion', item[0] as 'system' | 'reduce' | 'allow')}
        >
          {item[1]}
        </button>
      {/each}
    </div>
  </section>

  <section>
    <h2>Sound</h2>
    <label class="check">
      <input type="checkbox" checked={settings.values.muted} onchange={(event) => settings.set('muted', (event.currentTarget as HTMLInputElement).checked)} />
      <span>Mute all cues</span>
    </label>
    <label class="range">
      <span>Volume</span>
      <input
        type="range"
        min="0"
        max="100"
        value={Math.round(settings.values.volume * 100)}
        oninput={(event) => settings.set('volume', Number((event.currentTarget as HTMLInputElement).value) / 100)}
      />
      <output>{Math.round(settings.values.volume * 100)}%</output>
    </label>
    <label class="check">
      <input type="checkbox" checked={settings.values.haptics} onchange={(event) => settings.set('haptics', (event.currentTarget as HTMLInputElement).checked)} />
      <span>Vibration where the device supports it</span>
    </label>
  </section>

  <section>
    <h2>Saving</h2>
    <p class="dim">{storageText}</p>
    <p class="dim small">Games are stored in this browser only. There is no account and no server.</p>
  </section>

  <section>
    <h2>Data</h2>
    <button type="button" class="danger" onclick={() => (resetOpen = true)}>Reset all data</button>
    <p class="dim small">Deletes saved games and settings from this device. Export anything you want to keep first.</p>
  </section>

  <section>
    <h2>About</h2>
    <p class="dim">
      Game Buddy runs entirely offline. No accounts, no tracking, no network requests. Templates are plain text you own.
    </p>
    <p class="dim small">Game names are used descriptively; this is not affiliated with or endorsed by any publisher.</p>
  </section>
</div>

{#if resetOpen}
  <Sheet title="Reset all data" onclose={() => (resetOpen = false)}>
    <p class="dim">This deletes every saved game and setting on this device. Type DELETE to confirm.</p>
    <label class="field">
      <span>Confirmation</span>
      <input type="text" bind:value={confirmText} autocomplete="off" />
    </label>
    <button type="button" class="danger wide" disabled={confirmText.trim().toUpperCase() !== 'DELETE'} onclick={doReset}>
      Delete everything
    </button>
  </Sheet>
{/if}

<style>
  .settings {
    max-width: 34rem;
    margin: 0 auto;
    padding: var(--space-4) var(--space-3) var(--space-6);
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
  }
  h1 {
    font-size: var(--text-2xl);
    margin: 0;
  }
  h2 {
    font-size: var(--text-base);
    margin-bottom: var(--space-2);
  }
  section {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  .segment {
    display: flex;
    gap: var(--space-1);
    padding: var(--space-1);
    border-radius: var(--radius);
    background: var(--surface-2);
  }
  .segment button {
    flex: 1;
    min-height: 48px;
    border-radius: var(--radius-sm);
    border: 0;
    background: transparent;
    color: var(--text);
    text-transform: capitalize;
    cursor: pointer;
  }
  .segment button.active {
    background: var(--surface);
    font-weight: 700;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
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
    flex: none;
  }
  .range {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: var(--space-2);
    align-items: center;
    min-height: 48px;
  }
  .range input {
    width: 100%;
  }
  .dim {
    color: var(--text-dim);
    margin: 0;
  }
  .small {
    font-size: var(--text-sm);
  }
  .danger {
    min-height: 52px;
    border-radius: var(--radius);
    border: 1px solid var(--danger);
    background: transparent;
    color: var(--danger);
    font-weight: 600;
    cursor: pointer;
    align-self: flex-start;
    padding: 0 var(--space-4);
  }
  .danger:disabled {
    opacity: 0.6;
    cursor: not-allowed;
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
  .wide {
    width: 100%;
  }
</style>
