<script lang="ts">
  import { t } from '../core/i18n.svelte';
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
      ? t('settings.storage.local')
      : storage.kind === 'session'
        ? t('settings.storage.session')
        : t('settings.storage.memory'),
  );

  function doReset(): void {
    if (confirmText.trim().toUpperCase() !== t('settings.confirm-word')) return;
    settings.clearAllData();
    resetOpen = false;
    confirmText = '';
  }
</script>

<div class="settings">
  <header class="head">
    <h1>{t('settings.title')}</h1>
    <a class="back" href="#/">{t('settings.home')}</a>
  </header>

  <section>
    <h2>{t('settings.appearance')}</h2>
    <p class="dim small">{t('settings.appearance-hint')}</p>
    <div class="modes">
      {#each [['system', t('settings.theme.system')], ['light', t('settings.theme.light')], ['dark', t('settings.theme.dark')]] as item (item[0])}
        <button
          type="button"
          class:active={settings.values.theme === item[0]}
          onclick={() => settings.set('theme', item[0] as 'system' | 'light' | 'dark')}
        >
          {item[1]}
        </button>
      {/each}
    </div>
  </section>

  <section>
    <h2>{t('settings.theme-file')}</h2>
    <p class="dim small">{t('settings.theme-file-hint')}</p>
    {#if activeTheme.name}
      <p class="dim small">{t('settings.theme-active', { name: activeTheme.name })}</p>
    {/if}
    <label class="field">
      <span>{t('settings.theme-paste')}</span>
      <textarea rows="6" bind:value={themeDraft} spellcheck="false" placeholder="name: Lantern night&#10;paper: #fdf6e3&#10;ink: #2b2118"></textarea>
    </label>
    <label class="field">
      <span>{t('settings.theme-choose')}</span>
      <input type="file" accept=".gamebuddy-theme,.txt,text/plain" onchange={loadThemeFile} />
    </label>
    {#if themeName}
      <p class="dim small">{themeName}</p>
    {/if}
    {#if themeDiags.length}
      <ul class="diags">
        {#each themeDiags as item, index (index)}
          <li class:error={item.severity === 'error'}>
            <span class="line">{t('settings.line', { line: item.line })}</span>
            <span>{item.message}</span>
          </li>
        {/each}
      </ul>
    {/if}
    <div class="row">
      <button type="button" class="wide" onclick={useTheme} disabled={!themeDraft.trim()}>{t('settings.theme-use')}</button>
      {#if settings.values.themeText}
        <button type="button" class="wide" onclick={removeTheme}>{t('settings.theme-remove')}</button>
      {/if}
    </div>
  </section>

  <section>
    <h2>{t('settings.table')}</h2>
    <label class="check">
      <input type="checkbox" checked={settings.values.table} onchange={(event) => settings.set('table', (event.currentTarget as HTMLInputElement).checked)} />
      <span>{t('settings.table-hint')}</span>
    </label>
  </section>

  <section>
    <h2>{t('settings.huge')}</h2>
    <label class="check">
      <input type="checkbox" checked={settings.values.huge} onchange={(event) => settings.set('huge', (event.currentTarget as HTMLInputElement).checked)} />
      <span>{t('settings.huge-hint')}</span>
    </label>
  </section>

  <section>
    <h2>{t('settings.switch')}</h2>
    <label class="check">
      <input type="checkbox" checked={settings.values.switchAccess} onchange={(event) => settings.set('switchAccess', (event.currentTarget as HTMLInputElement).checked)} />
      <span>{t('settings.switch-hint')}</span>
    </label>
  </section>

  <section>
    <h2>{t('settings.motion')}</h2>
    <div class="modes">
      {#each [['system', t('settings.motion.system')], ['reduce', t('settings.motion.reduce')], ['allow', t('settings.motion.allow')]] as item (item[0])}
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
    <h2>{t('settings.sound')}</h2>
    <label class="check">
      <input type="checkbox" checked={settings.values.muted} onchange={(event) => settings.set('muted', (event.currentTarget as HTMLInputElement).checked)} />
      <span>{t('settings.mute')}</span>
    </label>
    <label class="range">
      <span>{t('settings.volume')}</span>
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
      <span>{t('settings.haptics')}</span>
    </label>
  </section>

  <section>
    <h2>{t('settings.saving')}</h2>
    <p class="dim">{storageText}</p>
    <p class="dim small">{t('settings.saving-hint')}</p>
  </section>

  <section>
    <h2>{t('settings.data')}</h2>
    <button type="button" class="danger" onclick={() => (resetOpen = true)}>{t('settings.reset')}</button>
    <p class="dim small">{t('settings.reset-hint')}</p>
  </section>

  <section>
    <h2>{t('settings.about')}</h2>
    <p class="dim">{t('settings.about-text')}</p>
    <p class="dim small">{t('settings.about-templates')}</p>
    <p class="dim small">{t('settings.about-names')}</p>
  </section>

  <footer class="made-by">
    <p>
      {t('settings.made-by')} <a href={SITE_URL} target="_blank" rel="noopener noreferrer">{AUTHOR}</a>.
      {t('settings.version', { version: VERSION })}
    </p>
    <p class="small">
      {t('settings.more-at')}
      <a href={SITE_URL} target="_blank" rel="noopener noreferrer">pandaqi.com</a>.
      {t('settings.source-at')}
      <a href={REPO_URL} target="_blank" rel="noopener noreferrer">github.com/Pandaqi/pq-game-buddy</a>.
    </p>
  </footer>
</div>

{#if resetOpen}
  <Sheet title={t('settings.reset')} onclose={() => (resetOpen = false)}>
    <p class="dim">{t('settings.reset-confirm', { word: t('settings.confirm-word') })}</p>
    <label class="field">
      <span>{t('settings.confirm-label')}</span>
      <input type="text" bind:value={confirmText} autocomplete="off" />
    </label>
    <button type="button" class="danger wide" disabled={confirmText.trim().toUpperCase() !== t('settings.confirm-word')} onclick={doReset}>
      {t('settings.delete-all')}
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
    min-height: 48px;
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
