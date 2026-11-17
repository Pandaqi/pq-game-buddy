<script lang="ts">
  import { onMount } from 'svelte';
  import { audio } from './core/audio';
  import { scrollToStart } from './core/dom';
  import { availableLanguages, language, t, toolTitle } from './core/i18n.svelte';
  import { manifest } from './core/manifest.generated';
  import { rememberImport } from './core/recent-imports';
  import { navigate, parseRoute, routeTo } from './core/router';
  import { schemas } from './core/schemas.generated';
  import { parseSessionFile } from './core/session';
  import { store } from './core/session-store.svelte';
  import { settings } from './core/settings.svelte';
  import { readFileText } from './core/share';
  import { storage, storagePersistent } from './core/storage';
  import { allDiagnostics, parseTemplate, resolveTemplate, type Diagnostic, type ResolvedTool, type TemplateVariant } from './core/template/parse';
  import { assetName, isImageFile, isSessionFile, isTemplateFile, isThemeFile, rememberAsset } from './core/template/assets';
  import { applyVariant, toolsForSession } from './core/template/session-tools';
  import { decodeTemplateLink } from './core/template/share-link';
  import { parseTheme } from './core/theme';
  import LazyView, { lazyView } from './core/ui/LazyView.svelte';
  import { doodle } from './core/ui/doodles';
  import { mark } from './core/ui/icons';
  import { rememberTool } from './core/ui/tool-shelf';
  import { templateText } from './data/templates';
  import Sheet from './core/ui/Sheet.svelte';
  import Home from './ui/Home.svelte';
  import SessionView from './ui/SessionView.svelte';

  // Home and the session are the two screens everyone sees; everything else is
  // a chunk of its own, so the catalogue can grow without growing the start-up.
  const pageLoaders = {
    templates: lazyView(() => import('./ui/Gallery.svelte')),
    editor: lazyView(() => import('./ui/Editor.svelte')),
    log: lazyView(() => import('./ui/Log.svelte')),
    settings: lazyView(() => import('./ui/Settings.svelte')),
    selftest: lazyView(() => import('./ui/SelfTest.svelte')),
    display: lazyView(() => import('./ui/Display.svelte')),
  };

  let { bootTool = '' }: { bootTool?: string } = $props();

  let hash = $state(typeof location === 'undefined' ? '#/' : location.hash || '#/');
  const route = $derived(parseRoute(hash));

  // Table mode hides the shell chrome on a session screen, so the screen has to
  // say which one it is.
  $effect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.dataset.screen = route.name;
  });

  // Settings is a screen, not a sheet, so the header gear toggles it and has to
  // remember where it was opened from.
  let returnHash = $state('#/');
  $effect(() => {
    if (route.name === 'settings') return;
    returnHash = routeTo(route);
  });

  // Every new screen starts at its top. Home, settings, the log and a template
  // session all arrive through a hash change, so one effect covers them.
  let shownScreen = '';
  $effect(() => {
    const key = route.name === 'session' ? `session:${route.tab ?? ''}` : route.name;
    if (key === shownScreen) return;
    shownScreen = key;
    scrollToStart();
  });

  type Flow = 'none' | 'paste' | 'start';
  let flow = $state<Flow>('none');
  let pasteText = $state('');
  let seatCount = $state(2);
  let handledImport = $state('');
  let dragActive = $state(false);
  let cueOpen = $state(false);
  let langOpen = $state(false);
  let diagnostics = $state<Diagnostic[]>([]);
  let variantId = $state('');
  let pending = $state<{
    text: string;
    gameName: string;
    players: string[];
    tools: ResolvedTool[];
    variants: TemplateVariant[];
    range?: { min: number; max: number };
    notes: string;
  } | null>(null);

  $effect(() => {
    if (route.name !== 'session') return;
    if (!store.session) void store.loadLatest();
  });

  $effect(() => {
    if (route.name === 'session' && route.tab) store.setTab(route.tab);
  });

  // A share link is just template text in the fragment: decode, then import it.
  $effect(() => {
    if (route.name !== 'import') return;
    const payload = route.payload;
    if (!payload || payload === handledImport) return;
    handledImport = payload;
    const text = decodeTemplateLink(payload);
    if (!text) {
      store.toast(t('toast.link-incomplete'), 'error');
      return;
    }
    beginImport(text);
    navigate({ name: 'home' });
  });

  onMount(() => {
    const sync = (): void => {
      hash = location.hash || '#/';
    };
    sync();
    window.addEventListener('hashchange', sync);
    // A page in the site build is that tool: no home screen to click through.
    if (bootTool) void startTool(bootTool);
    const unlock = (): void => audio.unlock();
    window.addEventListener('pointerdown', unlock, { once: true });

    const onDragOver = (event: DragEvent): void => {
      if (!event.dataTransfer) return;
      event.preventDefault();
      dragActive = true;
    };
    const onDragLeave = (event: DragEvent): void => {
      if (event.relatedTarget) return;
      dragActive = false;
    };
    const onDrop = (event: DragEvent): void => {
      event.preventDefault();
      dragActive = false;
      const files = Array.from(event.dataTransfer?.files ?? []);
      if (!files.length) return;
      void importFiles(files);
    };
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);

    return () => {
      window.removeEventListener('hashchange', sync);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
    };
  });

  /**
   * One drop or one file picker can carry a template, a saved game, its images
   * and a theme. Images are stored under their base name, so the template's
   * `icon:` finds one, and a template with no `icon:` falls back to its own name.
   */
  async function importFiles(files: File[]): Promise<void> {
    const images = files.filter((file) => isImageFile(file));
    const themes = files.filter((file) => isThemeFile(file.name));
    const sessions = files.filter((file) => isSessionFile(file.name));
    const templates = files.filter((file) => isTemplateFile(file.name) && !isThemeFile(file.name));

    let imagesSaved = 0;
    for (const file of images) {
      if (await rememberAsset(file)) imagesSaved += 1;
    }

    let themeName = '';
    if (themes.length) {
      try {
        const text = await readFileText(themes[0]);
        const theme = parseTheme(text);
        settings.setTheme(text);
        themeName = theme.name || themes[0].name.replace(/\.(gamebuddy-theme|theme)$/i, '');
      } catch {
        store.toast(t('toast.theme-broken'), 'error');
      }
    }

    // Only one game can be open, so the first session file wins.
    let openedSession = false;
    for (const file of sessions) {
      if (openedSession) break;
      try {
        const record = parseSessionFile(await readFileText(file));
        if (!record) {
          store.toast(t('toast.not-session', { name: file.name }), 'error');
          continue;
        }
        await store.resume(record);
        openedSession = true;
      } catch {
        store.toast(t('toast.would-not-open', { name: file.name }), 'error');
      }
    }

    let extra = 0;
    for (const [index, file] of templates.entries()) {
      try {
        const text = await readFileText(file);
        const source = assetName(file.name);
        // A session already took the screen: keep the rest for the gallery.
        if (!openedSession && index === 0) {
          beginImport(text, source);
        } else {
          const parsed = parseTemplate(text);
          rememberImport(text, parsed.template.game.name, source, parsed.template.game.icon);
          extra += 1;
        }
      } catch {
        store.toast(t('toast.would-not-open', { name: file.name }), 'error');
      }
    }

    if (openedSession) {
      const notes: string[] = [];
      if (imagesSaved) notes.push(countOf('images', imagesSaved));
      if (themeName) notes.push(t('count.theme', { name: themeName }));
      if (extra) notes.push(countOf('imported', extra));
      store.toast(
        notes.length ? t('toast.saved-opened-also', { notes: notes.join(', ') }) : t('toast.saved-opened'),
      );
      navigate({ name: 'session' });
      return;
    }

    const parts: string[] = [];
    if (templates.length) parts.push(countOf('templates', templates.length));
    if (imagesSaved) parts.push(countOf('images', imagesSaved));
    if (themeName) parts.push(t('count.theme', { name: themeName }));
    if (!parts.length) {
      if (!sessions.length) {
        store.toast(t('toast.nothing'), 'error');
      }
      return;
    }
    if (!templates.length) flow = 'none';
    if (extra) parts.push(countOf('imported', extra));
    store.toast(t('toast.ready', { parts: parts.join(', ') }));
  }

  /** "1 image" / "4 images": a count that reads right in every language. */
  function countOf(what: 'images' | 'templates' | 'imported', count: number): string {
    if (what === 'images') return count === 1 ? t('count.images-one') : t('count.images-many', { count });
    if (what === 'templates') {
      return count === 1 ? t('count.templates-one') : t('count.templates-many', { count });
    }
    return count === 1 ? t('count.imported-one') : t('count.imported-many', { count });
  }

  function beginImport(text: string, source = ''): void {
    const record = parseSessionFile(text.trim());
    if (record) {
      void store.resume(record).then(() => navigate({ name: 'session' }));
      return;
    }
    const parsed = parseTemplate(text);
    const resolved = resolveTemplate(parsed.template, (id) => schemas[id]);
    diagnostics = allDiagnostics(parsed.diagnostics, resolved.diagnostics);
    rememberImport(text, parsed.template.game.name, source, parsed.template.game.icon);
    pending = {
      text,
      gameName: parsed.template.game.name,
      players: parsed.template.players,
      tools: toolsForSession(parsed.template, resolved.tools),
      variants: parsed.template.variants,
      range: parsed.template.game.players,
      notes: parsed.template.notes,
    };
    variantId = '';
    const range = parsed.template.game.players;
    seatCount = range ? range.min : 2;
    flow = 'start';
    pasteText = '';
  }

  /** A home tile carries only an id: the template text arrives when it is picked. */
  function startTemplate(id: string): void {
    void templateText(id).then((text) => {
      if (text) beginImport(text);
      else store.toast(t('toast.template-missing'), 'error');
    });
  }

  async function startPending(): Promise<void> {
    const target = pending;
    if (!target) return;
    const names = target.players.length
      ? target.players
      : Array.from({ length: Math.max(1, Math.min(20, seatCount)) }, (_, index) =>
          t('players.default', { count: index + 1 }),
        );
    const variant = target.variants.find((item) => item.id === variantId);
    const tools = variant ? applyVariant(target.tools, variant) : target.tools;
    await store.start({
      gameName: target.gameName,
      players: names,
      tools: tools.map((tool) => ({
        toolId: tool.toolId,
        instanceId: tool.instanceId,
        values: tool.values,
      })),
      templateText: target.text,
      notes: target.notes,
    });
    pending = null;
    flow = 'none';
    navigate({ name: 'session' });
  }

  async function startTool(toolId: string): Promise<void> {
    const tool = manifest.find((module) => module.id === toolId);
    if (!tool) return;
    // A bag, a timer or a coin does not get better with a second player, so only
    // a tool that seats everyone starts with two.
    const players =
      tool.seats === 'multi'
        ? [t('players.default', { count: 1 }), t('players.default', { count: 2 })]
        : [t('players.default', { count: 1 })];
    // The tool's own chunk arrives here; the shell only knew its name until now.
    rememberTool(toolId);
    await store.start({
      gameName: toolTitle(tool.id, tool.title) ?? toolId,
      players,
      tools: [{ toolId, instanceId: toolId, values: {} }],
    });
    navigate({ name: 'session' });
  }

  function continueSession(): void {
    void store.loadLatest().then((ok) => {
      if (ok) navigate({ name: 'session' });
      else store.toast(t('toast.no-saved'), 'error');
    });
  }

  function toggleMute(): void {
    settings.set('muted', !settings.values.muted);
    if (!settings.values.muted) audio.play('click');
  }

  function showPaste(): void {
    diagnostics = [];
    pending = null;
    flow = 'paste';
  }

  function playCue(id: 'bell' | 'buzzer' | 'tick' | 'gong' | 'drumroll' | 'success'): void {
    audio.unlock();
    audio.play(id);
  }
</script>

<svelte:boundary>
  <a class="skip" href="#main">{t('app.skip')}</a>

  <header class="top no-print">
    <a class="brand" href="#/" aria-label={t('app.name')}>
      <span class="brand-mark" aria-hidden="true">{@html doodle('acorn')}</span>
      <span class="brand-text">{t('app.name')}</span>
    </a>
    <div class="top-actions">
      {#if availableLanguages().length > 1}
        <button
          type="button"
          class="icon chrome-lang"
          onclick={() => (langOpen = true)}
          aria-label={t('app.language')}
          aria-haspopup="dialog"
        >
          {@html mark('language')}
        </button>
      {/if}
      <button type="button" class="icon chrome-sound" onclick={() => (cueOpen = true)} aria-label={t('app.sound-board')}>
        {@html mark('notes')}
      </button>
      <button
        type="button"
        class="icon chrome-mute"
        onclick={toggleMute}
        aria-pressed={settings.values.muted}
        aria-label={settings.values.muted ? t('app.unmute') : t('app.mute')}
      >
        {@html mark(settings.values.muted ? 'muted' : 'sound')}
      </button>
      <a
        class="icon"
        href={route.name === 'settings' ? returnHash : '#/settings'}
        aria-label={route.name === 'settings' ? t('app.close-settings') : t('app.settings')}
        aria-current={route.name === 'settings' ? 'page' : undefined}
      >{@html mark('gear')}</a>
    </div>
  </header>

  {#if !storagePersistent}
    <p class="banner no-print" role="status">
      {t('app.storage', { kind: storage.kind })}
    </p>
  {/if}

  <main id="main" tabindex="-1">
    {#if route.name === 'home'}
      <Home
        onstart={startTool}
        onimport={showPaste}
        oncontinue={continueSession}
        ontemplate={startTemplate}
      />
    {:else if route.name === 'session'}
      {#if store.session}
        <SessionView />
      {:else}
        <section class="page">
          <h1>{t('session.none-title')}</h1>
          <p class="dim">{t('session.none-hint')}</p>
          <div class="actions">
            <button type="button" class="primary" onclick={() => navigate({ name: 'home' })}>{t('app.home')}</button>
            <button type="button" onclick={continueSession}>{t('session.resume')}</button>
          </div>
        </section>
      {/if}
    {:else if route.name === 'settings'}
      <LazyView load={pageLoaders.settings} label="settings" />
    {:else if route.name === 'display'}
      <LazyView load={pageLoaders.display} props={{ instanceId: route.instanceId }} label="the display view" />
    {:else if route.name === 'selftest'}
      <LazyView load={pageLoaders.selftest} label="the self-test" />
    {:else if route.name === 'log'}
      <LazyView load={pageLoaders.log} label="the play log" />
    {:else if route.name === 'templates'}
      <LazyView
        load={pageLoaders.templates}
        label="templates"
        props={{ onupload: (files: File[]) => void importFiles(files) }}
      />
    {:else if route.name === 'editor'}
      <LazyView load={pageLoaders.editor} label="the editor" />
    {:else if route.name === 'notfound'}
      <section class="page">
        <h1>{t('notfound.title')}</h1>
        <p class="dim">{t('notfound.hint', { path: route.path })}</p>
        <a class="primary link" href="#/">{t('notfound.home')}</a>
      </section>
    {:else}
      <section class="page">
        <h1>{t('app.loading')}</h1>
        <p class="dim">{t('app.loading-hint')}</p>
        <a class="primary link" href="#/">{t('app.home')}</a>
      </section>
    {/if}
  </main>

  {#if dragActive}
    <div class="dropzone" aria-hidden="true"><p>{t('app.drop')}</p></div>
  {/if}

  {#if store.notice}
    <div class="toast" class:error={store.notice.kind === 'error'} role="status">
      <span>{store.notice.message}</span>
      <button type="button" onclick={() => store.dismissNotice()} aria-label={t('app.dismiss')}>✕</button>
    </div>
  {/if}

  {#snippet failed(error, reset)}
    <section class="page">
      <h1>{t('app.broke')}</h1>
      <p class="dim">{t('app.broke-hint')}</p>
      <pre class="detail">{String(error)}</pre>
      <div class="actions">
        <button type="button" class="primary" onclick={reset}>{t('app.try-again')}</button>
        <button type="button" onclick={() => navigate({ name: 'home' })}>{t('app.back-home')}</button>
      </div>
    </section>
  {/snippet}
</svelte:boundary>

{#if langOpen}
  <Sheet title={t('app.language')} onclose={() => (langOpen = false)}>
    <div class="langs">
      {#each availableLanguages() as item (item.id)}
        <button
          type="button"
          class:active={language() === item.id}
          aria-pressed={language() === item.id}
          onclick={() =>
            void settings.useLanguage(item.id).then((ok) => {
              if (ok) langOpen = false;
            })}
        >
          <span class="lang-label">{item.label}</span>
          {#if item.english !== item.label}<span class="lang-english">{item.english}</span>{/if}
        </button>
      {/each}
    </div>
  </Sheet>
{/if}

{#if cueOpen}
  <Sheet title={t('cue.title')} onclose={() => (cueOpen = false)}>
    <p class="dim">{t('cue.hint')}</p>
    <div class="cues">
      <button type="button" onclick={() => playCue('bell')}>{t('cue.bell')}</button>
      <button type="button" onclick={() => playCue('buzzer')}>{t('cue.buzzer')}</button>
      <button type="button" onclick={() => playCue('tick')}>{t('cue.tick')}</button>
      <button type="button" onclick={() => playCue('gong')}>{t('cue.gong')}</button>
      <button type="button" onclick={() => playCue('drumroll')}>{t('cue.drumroll')}</button>
      <button type="button" onclick={() => playCue('success')}>{t('cue.success')}</button>
    </div>
  </Sheet>
{/if}

{#if flow === 'paste'}
  <Sheet title={t('import.own')} onclose={() => (flow = 'none')}>
    <p class="dim">{t('import.hint')}</p>
    <label class="field">
      <span>{t('import.files')}</span>
      <input
        type="file"
        multiple
        accept=".gamebuddy,.gamebuddy-theme,.txt,.json,image/svg+xml,image/png,image/jpeg,image/webp"
        onchange={(event) => {
          const input = event.currentTarget as HTMLInputElement;
          const files = Array.from(input.files ?? []);
          if (files.length) void importFiles(files);
          input.value = '';
        }}
      />
    </label>
    <p class="hint">{t('import.image-hint')}</p>
    <label class="field">
      <span>{t('import.paste-label')}</span>
      <textarea rows="7" bind:value={pasteText} placeholder="[game]&#10;name: My Game&#10;…" spellcheck="false"></textarea>
    </label>
    <button type="button" class="primary" onclick={() => beginImport(pasteText)}>{t('import.check')}</button>
  </Sheet>
{/if}

{#if flow === 'start' && pending}
  <Sheet title={pending.gameName || t('seats.template')} onclose={() => (flow = 'none')}>
    {#if pending.players.length}
      <p class="dim">{t('seats.from-template', { names: pending.players.join(', ') })}</p>
    {:else if pending.range}
      <p class="dim">{t('seats.range', { min: pending.range.min, max: pending.range.max })}</p>
      <label class="field">
        <span>{t('seats.label')}</span>
        <input
          type="number"
          min={pending.range.min}
          max={pending.range.max}
          bind:value={seatCount}
        />
      </label>
    {:else}
      <label class="field">
        <span>{t('seats.label')}</span>
        <input type="number" min="1" max="20" bind:value={seatCount} />
      </label>
    {/if}

    {#if pending.variants.length}
      <div class="variants" role="group" aria-label={t('seats.variant')}>
        <button type="button" class:active={variantId === ''} onclick={() => (variantId = '')}>{t('seats.base')}</button>
        {#each pending.variants as variant (variant.id)}
          <button type="button" class:active={variantId === variant.id} onclick={() => (variantId = variant.id)}>
            {variant.name}
          </button>
        {/each}
      </div>
    {/if}

    <p class="dim">
      {#if pending.tools.length === 0}
        {t('seats.tools-empty')}
      {:else if pending.tools.length === 1}
        {t('seats.tools-one', { count: 1, tools: pending.tools[0].toolId })}
      {:else}
        {t('seats.tools-many', {
          count: pending.tools.length,
          tools: pending.tools.map((tool) => tool.toolId).join(', '),
        })}
      {/if}
    </p>

    {#if diagnostics.length}
      <ul class="diags">
        {#each diagnostics as item, index (index)}
          <li class:error={item.severity === 'error'}>
            <span class="line">{t('settings.line', { line: item.line })}</span>
            <span>{item.message}</span>
          </li>
        {/each}
      </ul>
    {/if}

    <button type="button" class="primary" onclick={startPending}>
      {diagnostics.some((item) => item.severity === 'error') ? t('seats.start-anyway') : t('seats.start')}
    </button>
  </Sheet>
{/if}

<style>
  .skip {
    position: absolute;
    left: -999px;
    top: 0;
    background: var(--surface);
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-pill);
    z-index: 60;
  }
  .skip:focus {
    left: var(--space-2);
  }
  /* A theme file may hide the sound buttons; the settings door always stays. */
  :global(:root[data-hide~='sound']) .chrome-sound,
  :global(:root[data-hide~='mute']) .chrome-mute {
    display: none;
  }
  .top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    /* Solid paper: the header is sticky, so a transparent one lets a scrolled
       screen print through it. */
    background: var(--paper);
    position: sticky;
    top: 0;
    z-index: 20;
  }
  .brand {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    font-family: var(--font-display);
    font-weight: 800;
    letter-spacing: 0.01em;
    color: var(--forest);
    text-decoration: none;
    font-size: clamp(1.4rem, 4vw, 1.75rem);
  }
  .brand-mark {
    display: inline-grid;
    place-items: center;
    width: 42px;
    height: 42px;
    border-radius: var(--radius-round);
    background: var(--accent-soft);
    box-shadow: var(--shadow-card);
    transform: rotate(-6deg);
    transition: transform var(--motion-bounce) var(--ease-bounce);
  }
  .brand:hover .brand-mark {
    transform: rotate(6deg) scale(1.06);
  }
  .brand-mark :global(svg) {
    width: 26px;
    height: 26px;
  }
  .brand-text {
    white-space: nowrap;
  }
  /* Four chrome buttons plus the mark are wider than a 320 px phone, so the
     wordmark folds away and the acorn keeps the way home. */
  @media (max-width: 26rem) {
    .brand-text {
      display: none;
    }
  }
  .top-actions {
    display: flex;
    gap: var(--space-1);
  }
  .icon {
    display: inline-grid;
    place-items: center;
    min-width: 48px;
    min-height: 48px;
    border-radius: var(--radius-round);
    background: transparent;
    box-shadow: none;
    color: var(--text-dim);
    text-decoration: none;
    cursor: pointer;
  }
  .icon :global(svg) {
    width: 23px;
    height: 23px;
  }
  .icon:hover {
    background: var(--surface-2);
    color: var(--text);
    transform: none;
    box-shadow: none;
  }
  .icon[aria-pressed='true'],
  .icon[aria-current='page'] {
    background: var(--accent-soft);
    color: var(--accent-deep);
  }
  main {
    min-height: 60vh;
  }
  .banner {
    margin: var(--space-2) var(--space-4) 0;
    padding: var(--space-2) var(--space-4);
    background: var(--danger-soft);
    color: var(--text);
    border-radius: var(--radius-pill);
    font-size: var(--text-sm);
  }
  .page {
    max-width: 36rem;
    margin: 0 auto;
    padding: var(--space-6) var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }
  h1 {
    color: var(--forest);
  }
  .dim {
    color: var(--text-dim);
  }
  .actions {
    display: flex;
    gap: var(--space-2);
    flex-wrap: wrap;
  }
  .primary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 56px;
    padding: 0 var(--space-5);
    background: var(--accent);
    color: var(--accent-text);
    box-shadow: var(--shadow-key);
    font-weight: 800;
    font-size: var(--text-lg);
  }
  @media (hover: hover) {
    .primary:hover:not(:disabled) {
      transform: translateY(-3px);
      box-shadow: var(--shadow);
    }
  }
  .link {
    display: inline-flex;
    align-items: center;
    text-decoration: none;
    width: fit-content;
  }
  .actions button {
    min-height: 52px;
    padding: 0 var(--space-4);
    background: var(--surface-2);
  }
  .dropzone {
    position: fixed;
    inset: var(--space-3);
    border: 3px dashed var(--accent);
    border-radius: var(--radius-lg);
    display: grid;
    place-items: center;
    background: var(--accent-soft);
    color: var(--text);
    z-index: 55;
    pointer-events: none;
    font-family: var(--font-display);
    font-weight: 800;
    font-size: var(--text-xl);
  }
  .toast {
    position: fixed;
    left: 50%;
    transform: translateX(-50%);
    bottom: calc(var(--space-5) + env(safe-area-inset-bottom, 0px));
    background: var(--ink);
    color: var(--paper);
    padding: var(--space-2) var(--space-2) var(--space-2) var(--space-5);
    border-radius: var(--radius-pill);
    display: flex;
    align-items: center;
    gap: var(--space-2);
    z-index: 50;
    max-width: min(92vw, 32rem);
    box-shadow: var(--shadow-lift);
    animation: bloom var(--motion-settle) var(--ease-bounce);
  }
  .toast.error {
    background: var(--danger);
    color: var(--on-accent);
  }
  .toast button {
    min-width: 40px;
    min-height: 40px;
    border-radius: var(--radius-round);
    background: transparent;
    box-shadow: none;
    color: inherit;
    cursor: pointer;
  }
  .cues {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-3);
  }
  .langs {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  .langs button {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-3);
    min-height: 56px;
    padding: 0 var(--space-4);
    text-align: left;
    background: var(--surface-2);
    color: var(--text);
  }
  .langs button.active {
    background: var(--accent-soft);
    color: var(--accent-deep);
    font-weight: 800;
  }
  .lang-label {
    font-family: var(--font-display);
    font-size: var(--text-lg);
    font-weight: 800;
  }
  .lang-english {
    font-size: var(--text-sm);
    color: var(--text-dim);
  }
  .cues button {
    min-height: 62px;
    background: var(--surface-2);
    color: var(--text);
    font-size: var(--text-lg);
    font-weight: 700;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    color: var(--text-dim);
  }
  .field textarea,
  .field input {
    font-family: var(--font-mono);
    font-size: var(--text-sm);
  }
  .variants {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
  }
  .variants button {
    min-height: 44px;
    padding: 0 var(--space-4);
    background: var(--surface-2);
    color: var(--text);
  }
  .variants button.active {
    background: var(--accent-soft);
    color: var(--accent-deep);
    font-weight: 800;
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
    max-height: 12rem;
    overflow: auto;
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
    color: var(--text-dim);
    flex: none;
  }
  .detail {
    white-space: pre-wrap;
    background: var(--surface-2);
    padding: var(--space-3);
    border-radius: var(--radius);
    font-size: var(--text-sm);
    overflow: auto;
    max-height: 12rem;
  }
</style>
