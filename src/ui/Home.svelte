<script lang="ts">
  import { manifest } from '../core/manifest.generated';
  import { store } from '../core/session-store.svelte';
  import { doodle, HERO_SCENE } from '../core/ui/doodles';
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
  const templates = listTemplates();

  const tools = $derived(
    manifest
      .filter((module) => !module.tags.includes('dev'))
      .filter((module) => {
        const needle = query.trim().toLowerCase();
        if (!needle) return true;
        return (
          module.title.toLowerCase().includes(needle) ||
          module.blurb.toLowerCase().includes(needle) ||
          module.tags.some((tag) => tag.includes(needle))
        );
      }),
  );
</script>

<!-- The shelf: every tool is a coloured paper tile with its own mark, so the
     thing you want is the thing your eye lands on. -->
<div class="home">
  <section class="hero">
    <div class="hero-art" aria-hidden="true">{@html HERO_SCENE}</div>
    <p class="kicker">
      <span class="kicker-leaf" aria-hidden="true">{@html doodle('leaf')}</span>
      No account. No internet. No install.
    </p>
    <h1>Game night,<br />sorted.</h1>
    <p class="lede">Timers, dice, scorepads and templates for the games on your shelf.</p>
  </section>

  {#if store.lastSession}
    <button type="button" class="continue" onclick={oncontinue}>
      <span class="continue-art" aria-hidden="true">{@html doodle('acorn')}</span>
      <span class="continue-text">
        <span class="label">Pick up where you stopped</span>
        <span class="game">{store.lastSession.game}</span>
      </span>
      <span class="when">{new Date(store.lastSession.updatedAt).toLocaleDateString()}</span>
    </button>
  {/if}

  <section>
    <header class="section-head">
      <h2>Tools</h2>
      <label class="search">
        <span class="sr-only">Search tools</span>
        <input type="search" bind:value={query} placeholder="Search tools" />
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
            </button>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="dim">No tool matches “{query}”. Try a shorter word.</p>
    {/if}
  </section>

  <section>
    <details class="fold">
      <summary>Or start from a game template</summary>
      <div class="fold-body">
        <p class="hint">
          Forty games, already set up. Drop a .gamebuddy file anywhere on this page to load your
          own.
        </p>
        <ul class="templates">
          {#each templates as template (template.id)}
            <li>
              <button type="button" class="template" onclick={() => ontemplate(template.id)}>
                <span class="title">{template.name}</span>
                <span class="meta">
                  {template.players ?? 'any'} players{#if template.time} · {template.time}{/if}
                  {#if template.tools.length}· {template.tools.join(', ')}{/if}
                </span>
              </button>
            </li>
          {/each}
        </ul>
        <button type="button" class="wide ghost" onclick={onimport}>Import a template file</button>
      </div>
    </details>
  </section>

  <nav class="links" aria-label="More">
    <a href="#/templates">All templates</a>
    <a href="#/editor">Template editor</a>
    <a href="#/log">Play log</a>
    <a href="#/settings">Settings</a>
  </nav>
</div>

<style>
  .home {
    max-width: 60rem;
    margin: 0 auto;
    padding: var(--space-5) var(--space-4) var(--space-7);
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }
  .hero {
    position: relative;
    padding: var(--space-5) 0 var(--space-6);
    overflow: hidden;
    animation: bloom var(--motion-bounce) var(--ease-bounce) both;
  }
  .hero-art {
    position: absolute;
    right: -1rem;
    bottom: -1.5rem;
    width: min(32rem, 78%);
    opacity: 0.95;
    pointer-events: none;
    z-index: -1;
    -webkit-mask-image: linear-gradient(to right, transparent, #000 10%, #000 88%, transparent);
    mask-image: linear-gradient(to right, transparent, #000 10%, #000 88%, transparent);
  }
  @media (max-width: 34rem) {
    .hero-art {
      display: none;
    }
  }
  .hero-art :global(svg) {
    width: 100%;
    height: auto;
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
  .continue-art :global(svg) {
    width: 28px;
    height: 28px;
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
  .section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    margin-bottom: var(--space-4);
  }
  .section-head h2 {
    font-size: var(--text-2xl);
    color: var(--forest);
  }
  .search input {
    min-height: 46px;
    min-width: 11rem;
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
  }
  .blurb {
    color: var(--text-dim);
    font-size: var(--text-sm);
    line-height: 1.45;
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
      grid-template-columns: 1fr 1fr;
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
  .template .title {
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
    min-height: 46px;
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
