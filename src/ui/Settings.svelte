<script lang="ts">
  import { settings } from '../core/settings.svelte';
  import { readFileText } from '../core/share';
  import { storage, storagePersistent } from '../core/storage';
  import { parseTheme } from '../core/theme';
  import { AUTHOR, REPO_URL, SITE_URL } from '../core/about';
  import { VERSION } from '../core/version.generated';
  import Sheet from '../core/ui/Sheet.svelte';

  let resetOpen = $state(false);
  let confirmText = $state('');
  let themeDraft = $state(settings.values.themeText);
  let themeName = $state('');

  const activeTheme = $derived(parseTheme(settings.values.themeText));
  const draft = $derived(parseTheme(themeDraft));
  const themeDiags = $derived(draft.diagnostics);

  function useTheme(): void {
    settings.setTheme(themeDraft);
    themeName = '';
  }

  function removeTheme(): void {
    themeDraft = '';
    themeName = '';
    settings.setTheme('');
  }

  function loadThemeFile(event: Event): void {
    const file = (event.currentTarget as HTMLInputElement).files?.[0];
    if (!file) return;
    void readFileText(file)
      .then((text) => {
        themeDraft = text;
        themeName = file.name;
        useTheme();
      })
      .catch(() => (themeName = ''));
  }

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
  <header class="head">
    <h1>Settings</h1>
    <a class="back" href="#/">Home</a>
  </header>

  <section>
    <h2>Light or dark</h2>
    <p class="dim small">Light is paper and ink. Dark is a dim room: warm charcoal, no glare.</p>
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
    <h2>Theme file</h2>
    <p class="dim small">
      A .gamebuddy-theme is plain text with a few colours, sizes and fonts. It stays on this device and is never fetched.
    </p>
    {#if activeTheme.name}
      <p class="dim small">Active theme: {activeTheme.name}</p>
    {/if}
    <label class="field">
      <span>Paste a theme</span>
      <textarea rows="6" bind:value={themeDraft} spellcheck="false" placeholder="name: Lantern night&#10;paper: #fdf6e3&#10;ink: #2b2118"></textarea>
    </label>
    <label class="field">
      <span>Or choose a file</span>
      <input type="file" accept=".gamebuddy-theme,.txt,text/plain" onchange={loadThemeFile} />
    </label>
    {#if themeName}
      <p class="dim small">{themeName}</p>
    {/if}
    {#if themeDiags.length}
      <ul class="diags">
        {#each themeDiags as item, index (index)}
          <li class:error={item.severity === 'error'}>
            <span class="line">line {item.line}</span>
            <span>{item.message}</span>
          </li>
        {/each}
      </ul>
    {/if}
    <div class="row">
      <button type="button" class="wide" onclick={useTheme} disabled={!themeDraft.trim()}>Use this theme</button>
      {#if settings.values.themeText}
        <button type="button" class="wide" onclick={removeTheme}>Remove theme</button>
      {/if}
    </div>
  </section>

  <section>
    <h2>Table mode</h2>
    <label class="check">
      <input type="checkbox" checked={settings.values.table} onchange={(event) => settings.set('table', (event.currentTarget as HTMLInputElement).checked)} />
      <span>Bigger type, thicker targets and less chrome, for a phone lying flat on the table.</span>
    </label>
  </section>

  <section>
    <h2>Huge mode</h2>
    <label class="check">
      <input type="checkbox" checked={settings.values.huge} onchange={(event) => settings.set('huge', (event.currentTarget as HTMLInputElement).checked)} />
      <span>Bigger than table mode, for a large screen or low vision. Screens scroll more.</span>
    </label>
  </section>

  <section>
    <h2>Switch access</h2>
    <label class="check">
      <input type="checkbox" checked={settings.values.switchAccess} onchange={(event) => settings.set('switchAccess', (event.currentTarget as HTMLInputElement).checked)} />
      <span>Bigger targets and a thicker focus ring, for a single switch or a head pointer.</span>
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
    <p class="dim small">Games live in this browser only. There is no account and no server.</p>
  </section>

  <section>
    <h2>Data</h2>
    <button type="button" class="danger" onclick={() => (resetOpen = true)}>Reset all data</button>
    <p class="dim small">Deletes saved games and settings from this device. Export anything you want to keep first; it cannot be undone.</p>
  </section>

  <section>
    <h2>About</h2>
    <p class="dim">
      Game Buddy lives on your device. No account, no tracking, no requests. I built it for my own
      table first, then kept going.
    </p>
    <p class="dim small">
      Templates are plain text: write one in Notepad, send it in the group chat, drop it here.
    </p>
    <p class="dim small">Game names are used descriptively; this is not affiliated with or endorsed by any publisher.</p>
  </section>

  <footer class="made-by">
    <p>
      Made by <a href={SITE_URL} target="_blank" rel="noopener noreferrer">{AUTHOR}</a>.
      Game Buddy version {VERSION}.
    </p>
    <p class="small">
      More games and tools at
      <a href={SITE_URL} target="_blank" rel="noopener noreferrer">pandaqi.com</a>.
      The source lives at
      <a href={REPO_URL} target="_blank" rel="noopener noreferrer">github.com/Pandaqi/pq-game-buddy</a>.
    </p>
  </footer>
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
  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
  }
  h1 {
    font-size: var(--text-2xl);
    margin: 0;
    color: var(--forest);
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
  h2 {
    font-family: var(--font-body);
    font-size: var(--text-xs);
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--text-dim);
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
    border-radius: var(--radius-pill);
    background: var(--surface-2);
  }
  .segment button {
    flex: 1;
    min-height: 48px;
    border-radius: var(--radius-pill);
    background: transparent;
    color: var(--text-dim);
    text-transform: capitalize;
    cursor: pointer;
  }
  .segment button.active {
    background: var(--surface);
    font-weight: 700;
    box-shadow: var(--shadow-soft);
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
    border-radius: var(--radius-pill);
    background: var(--danger-soft);
    color: var(--danger);
    font-weight: 700;
    cursor: pointer;
    align-self: flex-start;
    padding: 0 var(--space-5);
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
    padding: 0 var(--space-4);
  }
  .wide {
    width: 100%;
    min-height: 52px;
    border-radius: var(--radius-pill);
    background: var(--surface-2);
    color: var(--text);
    font-weight: 700;
    cursor: pointer;
  }
  .wide:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }
  .row .wide {
    width: auto;
    flex: 1;
  }
  .field textarea {
    min-height: 8rem;
    padding: var(--space-3);
    font-family: var(--font-mono);
    font-size: var(--text-sm);
  }
  .diags {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    font-size: var(--text-sm);
    color: var(--text-dim);
  }
  .diags li {
    display: flex;
    gap: var(--space-2);
  }
  .diags li.error {
    color: var(--danger);
  }
  .line {
    font-family: var(--font-mono);
    flex: none;
  }
  .made-by {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: var(--space-4) var(--space-5);
    border-radius: var(--radius-card);
    background: var(--accent-soft);
  }
  .made-by p {
    margin: 0;
    color: var(--text);
  }
  .made-by .small {
    font-size: var(--text-sm);
    color: var(--text-dim);
  }
  .made-by a {
    color: var(--accent-deep);
    font-weight: 700;
    text-decoration: none;
  }
  .made-by a:hover,
  .made-by a:focus-visible {
    text-decoration: underline;
  }
</style>
