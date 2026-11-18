<script lang="ts">
  import { language, t, toolBlurb, toolTitle } from '../core/i18n.svelte';
  import { gameName } from '../core/game-name';
  import { manifest } from '../core/manifest.generated';
  import { store } from '../core/session-store.svelte';
  import { assetMark } from '../core/template/assets';
  import { installedToolDefinitions } from '../core/tool-file';
  import { mark } from '../core/ui/icons';
  import { BRAND_MARK } from '../core/ui/brand-mark';
  import { doodle } from '../core/ui/doodles';
  import { ensureTemplateMarks, templateMarkLazy, templateMarksVersion } from '../core/ui/marks.svelte';
  import { recentTools, shelfIds } from '../core/ui/tool-shelf';
  import { listTemplates } from '../data/templates';

  let {
    onstart,
    onimport,
    oncontinue,
    ontemplate,
  }: {
    onstart: (toolId: string) => void;
    onimport: () => void;
    oncontinue: () => void;
    ontemplate: (id: string) => void;
  } = $props();

  let query = $state('');
  let showAll = $state(false);
  const templates = listTemplates();
  const recent = recentTools();

  // The mark set is its own chunk; reading the version here redraws the list
  // when it arrives, so no other screen pays for 40 game drawings up front.
  $effect(() => {
    ensureTemplateMarks();
  });

  function iconOf(template: { icon?: string; id: string }): string {
    void templateMarksVersion();
    return templateMarkLazy(template.icon, template.id);
  }

  /** A saved session's name: a one-tool session says its tool's name in this language. */
  const allTools = $derived.by(() => {
    // Reading the session version redraws the shelf after a tool file is installed.
    void store.version;
    // A tool file may name one of the bundled marks; that map is its own chunk.
    void templateMarksVersion();
    const built = manifest
      .filter((module) => !module.tags.includes('dev'))
      .map((module) => ({
        id: module.id,
        title: toolTitle(module.id, module.title),
        blurb: toolBlurb(module.id, module.blurb),
        family: module.family as string,
        icon: module.icon,
        mine: false,
        tags: module.tags,
      }));
    const mine = installedToolDefinitions().map((definition) => ({
      id: definition.id,
      title: definition.name,
      blurb: definition.blurb,
      family: definition.family as string,
      icon:
        assetMark(definition.icon) ||
        (definition.icon ? templateMarkLazy(definition.icon, '') : '') ||
        mark('gear'),
      mine: true,
      tags: definition.tags,
    }));
    return [...built, ...mine];
  });

  /** Search looks at every tool; the shelf itself is the everyday few. */
  const matches = $derived.by(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return allTools;
    return allTools.filter(
      (module) =>
        module.title.toLowerCase().includes(needle) ||
        module.blurb.toLowerCase().includes(needle) ||
        module.tags.some((tag) => tag.includes(needle)),
    );
  });

  const tools = $derived.by(() => {
    if (query.trim()) return matches;
    const ids = shelfIds(
      allTools.map((module) => module.id),
      recent,
      showAll,
    );
    // A tool you installed yourself is never hidden behind "show all".
    for (const module of allTools) {
      if (module.mine && !ids.includes(module.id)) ids.push(module.id);
    }
    return ids.map((id) => allTools.find((module) => module.id === id)).filter((module) => module !== undefined);
  });
</script>

<!-- The shelf: every tool is a coloured paper tile with its own mark, so the
     thing you want is the thing your eye lands on. -->
<div class="home">
  <section class="hero">
    <div class="hero-art home-hero-art" aria-hidden="true"></div>
    <div class="hero-copy">
      <p class="kicker">
        <span class="kicker-leaf" aria-hidden="true">{@html doodle('leaf')}</span>
        {t('home.kicker')}
      </p>
      <h1>{t('home.title-1')}<br />{t('home.title-2')}</h1>
      <p class="lede">{t('home.lede')}</p>
    </div>
  </section>

  {#if store.lastSession}
    <button type="button" class="continue" onclick={oncontinue}>
      <span class="continue-art" aria-hidden="true"><img src={BRAND_MARK} alt="" /></span>
      <span class="continue-text">
        <span class="label">{t('home.continue')}</span>
        <span class="game">{gameName(language(), store.lastSession.toolId, store.lastSession.game)}</span>
      </span>
      <span class="when">{new Date(store.lastSession.updatedAt).toLocaleDateString(language())}</span>
    </button>
  {/if}

  <section>
    <header class="section-head">
      <h2>{t('home.tools')}</h2>
      <label class="search">
        <span class="sr-only">{t('home.search')}</span>
        <input type="search" bind:value={query} placeholder={t('home.search')} />
      </label>
    </header>

    {#if tools.length}
      <ul class="shelf">
        {#each tools as module, index (module.id)}
          <li style="--i: {index}">
            <button
              type="button"
              onclick={() => onstart(module.id)}
              class="tool"
              data-family={module.family}
            >
              <span class="mark" aria-hidden="true">{@html module.icon}</span>
              <span class="title">{module.title}</span>
              <span class="blurb">{module.blurb}</span>
              {#if module.mine}<span class="mine">{t('home.yours')}</span>{/if}
            </button>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="dim">{t('home.empty', { query })}</p>
    {/if}

    {#if !query.trim()}
      <div class="shelf-foot">
        <p class="hint">
          {showAll ? t('home.all-tools', { count: allTools.length }) : t('home.everyday')}
        </p>
        <button type="button" class="wide ghost" onclick={() => (showAll = !showAll)}>
          {showAll ? t('home.fewer') : t('home.show-all', { count: allTools.length })}
        </button>
      </div>
    {/if}
  </section>

  <section>
    <details class="fold">
      <summary>{t('home.templates-fold')}</summary>
      <div class="fold-body">
        <p class="hint">{t('home.templates-hint', { count: templates.length })}</p>
        <ul class="templates">
          {#each templates as template (template.id)}
            <li>
              <button type="button" class="template" onclick={() => ontemplate(template.id)}>
                <span class="template-head">
                  <span class="template-mark" aria-hidden="true">{@html iconOf(template)}</span>
                  <span class="title">{template.name}</span>
                </span>
                <span class="meta">
                  {template.players
                    ? t('home.players', { count: template.players })
                    : t('home.any-players')}{#if template.time} · {template.time}{/if}
                  {#if template.tools.length}· {template.tools.join(', ')}{/if}
                </span>
              </button>
            </li>
          {/each}
        </ul>
        <button type="button" class="wide ghost" onclick={onimport}>{t('home.import')}</button>
      </div>
    </details>
  </section>

  <nav class="links" aria-label={t('nav.more')}>
    <a href="#/templates">{t('home.all-templates')}</a>
    <a href="#/editor">{t('home.editor')}</a>
    <a href="#/log">{t('home.log')}</a>
    <a href="#/settings">{t('home.settings')}</a>
  </nav>
</div>

<style>
  /* The page has no column of its own: the hero's art is the one thing that runs edge
     to edge, so each block gets the 60 rem column and the gutter instead. Nothing here
     measures against 100vw, which counts a classic scrollbar and would push the page
     sideways. */
  .home {
    padding: var(--space-5) 0 var(--space-7);
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }
  .home > :not(.hero),
  .hero-copy {
    max-width: 60rem;
    margin-inline: auto;
    padding-inline: var(--space-4);
  }
  .hero {
    position: relative;
    isolation: isolate;
    padding: var(--space-6) 0 var(--space-7);
    animation: bloom var(--motion-bounce) var(--ease-bounce) both;
  }
  /* The game room behind the words: the full width of the page, blurred in the file
     itself and masked off slowly from the first third to the last pixel, so it melts
     into the paper instead of ending on a line. Behind everything (z-index -2), and
     it never takes a tap. */
  .hero-art {
    position: absolute;
    inset: calc(-1 * var(--space-5)) 0 0;
    background-position: center 38%;
    background-size: cover;
    opacity: 0.55;
    pointer-events: none;
    z-index: -2;
    -webkit-mask-image: linear-gradient(to bottom, #000 0%, #000 34%, transparent 100%);
    mask-image: linear-gradient(to bottom, #000 0%, #000 34%, transparent 100%);
  }
  /* A paper cloud under the copy: the heading keeps its contrast over the art, and in
     dark mode the same layer dims the picture instead of lighting up the room. It is
     a radial on purpose: a straight edge here would show as a seam of its own. */
  .hero::before {
    content: '';
    position: absolute;
    inset: calc(-1 * var(--space-5)) 0 0;
    pointer-events: none;
    z-index: -1;
    background: radial-gradient(120% 80% at 28% 38%, var(--paper) 0%, transparent 70%);
  }
  .kicker {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    font-family: var(--font-display);
    font-size: var(--text-xs);
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--accent);
    padding: var(--space-1) var(--space-3);
    border-radius: var(--radius-pill);
    background: var(--accent-soft);
  }
  .kicker-leaf {
    display: inline-block;
    width: 18px;
    height: 18px;
  }
  .kicker-leaf :global(svg) {
    width: 18px;
    height: 18px;
  }
  .hero h1 {
    font-size: clamp(3rem, 12vw, 5.5rem);
    line-height: 0.95;
    margin: var(--space-3) 0 var(--space-3);
    color: var(--forest);
  }
  .lede {
    max-width: 24rem;
    font-size: var(--text-lg);
    color: var(--text-dim);
  }
  .dim {
    color: var(--text-dim);
  }
  .shelf-foot {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    margin-top: var(--space-3);
  }
  .shelf-foot .hint {
    margin: 0;
  }
  .continue {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    text-align: left;
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-pill);
    background: var(--accent-soft);
    color: var(--text);
    box-shadow: var(--shadow-card);
    animation: bloom var(--motion-bounce) var(--ease-bounce) 80ms both;
  }
  .continue-art {
    display: inline-grid;
    place-items: center;
    width: 46px;
    height: 46px;
    border-radius: var(--radius-round);
    background: var(--surface);
    flex: none;
  }
  .continue-art :global(img) {
    width: 34px;
    height: 34px;
    object-fit: contain;
  }
  .continue-text {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
  }
  .continue .label {
    font-size: var(--text-xs);
    letter-spacing: 0.1em;
    text-transform: uppercase;
    font-weight: 700;
    color: var(--accent-deep);
  }
  .continue .game {
    font-family: var(--font-display);
    font-size: var(--text-xl);
    font-weight: 800;
    line-height: 1.15;
  }
  .continue .when {
    font-size: var(--text-sm);
    color: var(--text-dim);
    flex: none;
  }
  /* The heading and the search share a line while there is room, and the search drops
     to its own line below that: at 320 px a fixed 11 rem field would push the page wide. */
  .section-head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    margin-bottom: var(--space-4);
  }
  .section-head h2 {
    font-size: var(--text-2xl);
    color: var(--forest);
  }
  .search {
    display: flex;
    justify-content: flex-end;
    flex: 1 1 12rem;
    min-width: 0;
  }
  .search input {
    flex: 1 1 auto;
    min-height: 48px;
    min-width: 0;
    max-width: 16rem;
  }
  .shelf {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-3);
  }
  @media (min-width: 40rem) {
    .shelf {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }
  @media (min-width: 54rem) {
    .shelf {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
  }
  .shelf li {
    animation: bloom var(--motion-bounce) var(--ease-bounce) both;
    animation-delay: calc(var(--i) * 18ms + 60ms);
  }
  .tool {
    width: 100%;
    height: 100%;
    min-height: 10rem;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-1);
    text-align: left;
    padding: var(--space-4);
    border-radius: var(--radius-card);
    background:
      linear-gradient(180deg, var(--accent-soft), var(--surface) 58%);
    color: var(--text);
    box-shadow: var(--shadow-card);
  }
  @media (hover: hover) {
    .tool:hover:not(:disabled) {
      background:
        linear-gradient(180deg, var(--accent-soft), var(--surface) 42%);
      transform: translateY(-4px) rotate(-0.4deg);
      box-shadow: 0 26px 46px -28px rgba(74, 46, 10, 0.55);
    }
  }
  .mark {
    display: grid;
    place-items: center;
    width: 54px;
    height: 54px;
    margin-bottom: var(--space-1);
    border-radius: var(--radius-lg);
    background: var(--surface);
    color: var(--accent);
    box-shadow: var(--shadow-soft);
  }
  .mark :global(svg) {
    width: 30px;
    height: 30px;
  }
  .title {
    font-family: var(--font-display);
    font-weight: 800;
    font-size: var(--text-xl);
    line-height: 1.1;
    /* A long word (Dutch "Dobbelstenen") must break inside the tile: a flex item
       keeps its min-content width, which would widen the column and the page. */
    max-width: 100%;
    overflow-wrap: break-word;
  }
  .blurb {
    color: var(--text-dim);
    font-size: var(--text-sm);
    line-height: 1.45;
  }
  .mine {
    margin-top: auto;
    padding: 2px var(--space-2);
    border-radius: var(--radius-pill);
    background: var(--accent);
    color: var(--accent-text);
    font-size: var(--text-xs);
    font-weight: 700;
  }
  .templates {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: var(--space-2);
  }
  @media (min-width: 34rem) {
    .templates {
      /* minmax(0, …) so a long game name wraps instead of widening the grid at 320 px
         or at 200 percent zoom. */
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
  .template {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-1);
    text-align: left;
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-lg);
    background: var(--surface-2);
    color: var(--text);
  }
  .template-head {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    width: 100%;
  }
  .template-mark {
    display: grid;
    place-items: center;
    flex: none;
    width: 38px;
    height: 38px;
    border-radius: var(--radius-sm);
    background: var(--surface);
    color: var(--accent-deep);
  }
  .template-mark :global(svg),
  .template-mark :global(img) {
    width: 23px;
    height: 23px;
    object-fit: contain;
  }
  .template .title {
    min-width: 0;
    font-size: var(--text-lg);
  }
  .template .meta {
    color: var(--text-dim);
    font-size: var(--text-sm);
  }
  .links {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }
  .links a {
    min-height: 48px;
    display: inline-flex;
    align-items: center;
    padding: 0 var(--space-4);
    border-radius: var(--radius-pill);
    background: var(--surface-2);
    color: var(--text);
    text-decoration: none;
    font-weight: 600;
    font-size: var(--text-sm);
    transition: background-color var(--motion-pop) linear;
  }
  .links a:hover {
    background: var(--surface);
  }
</style>
