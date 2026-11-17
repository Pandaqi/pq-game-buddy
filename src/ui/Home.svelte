<script lang="ts">
  import { manifest } from '../core/manifest.generated';
  import { store } from '../core/session-store.svelte';
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
    ontemplate: (text: string) => void;
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

<div class="home">
  <section class="hero">
    <h1>Game night, sorted.</h1>
    <p class="dim">Timers, dice, scorepads and templates. Offline, no account, no install.</p>
  </section>

  {#if store.lastSession}
    <button type="button" class="continue" onclick={oncontinue}>
      <span class="label">Continue playing</span>
      <span class="game">{store.lastSession.game}</span>
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
      <ul class="tools">
        {#each tools as module (module.id)}
          <li>
            <button type="button" onclick={() => onstart(module.id)} class="tool">
              <span class="icon" aria-hidden="true">{@html module.icon}</span>
              <span class="title">{module.title}</span>
              <span class="blurb">{module.blurb}</span>
            </button>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="dim">No tools match "{query}".</p>
    {/if}
  </section>

  <section>
    <header class="section-head">
      <h2>Try a template</h2>
      <button type="button" class="ghost" onclick={onimport}>Import</button>
    </header>
    <ul class="templates">
      {#each templates as template (template.id)}
        <li>
          <button type="button" class="template" onclick={() => ontemplate(template.text)}>
            <span class="title">{template.name}</span>
            <span class="meta">
              {template.players ?? 'any'} players{#if template.time} · {template.time}{/if}
              {#if template.tools.length}· {template.tools.join(', ')}{/if}
            </span>
          </button>
        </li>
      {/each}
    </ul>
    <p class="dim small">Drop a .gamebuddy file anywhere to load it.</p>
  </section>

  <nav class="links" aria-label="More">
    <a href="#/templates">All templates</a>
    <a href="#/editor">Template editor</a>
    <a href="#/log">Play log</a>
  </nav>
</div>

<style>
  .home {
    max-width: 46rem;
    margin: 0 auto;
    padding: var(--space-4) var(--space-3) var(--space-6);
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
  }
  .hero h1 {
    font-size: var(--text-2xl);
    letter-spacing: -0.02em;
    margin-bottom: var(--space-1);
  }
  .dim {
    color: var(--text-dim);
  }
  .small {
    font-size: var(--text-sm);
    margin-top: var(--space-2);
  }
  .continue {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-1);
    text-align: left;
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-lg);
    border: 2px solid var(--accent);
    background: var(--accent-soft);
    color: var(--text);
    cursor: pointer;
  }
  .continue .label {
    font-size: var(--text-xs);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: 700;
    color: var(--text-dim);
  }
  .continue .game {
    font-size: var(--text-xl);
    font-weight: 800;
  }
  .section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    margin-bottom: var(--space-2);
  }
  h2 {
    font-size: var(--text-lg);
  }
  .search input {
    min-height: 44px;
    min-width: 10rem;
    border-radius: 999px;
    border: 1px solid var(--line);
    background: var(--surface);
    color: var(--text);
    padding: 0 var(--space-3);
  }
  .tools {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-2);
  }
  @media (min-width: 34rem) {
    .tools {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }
  .tool {
    width: 100%;
    min-height: 9rem;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-1);
    text-align: left;
    padding: var(--space-3);
    border-radius: var(--radius-lg);
    border: 1px solid var(--line);
    background: var(--surface);
    color: var(--text);
    cursor: pointer;
  }
  .tool:hover {
    border-color: var(--accent);
  }
  .icon :global(svg) {
    width: 28px;
    height: 28px;
    color: var(--accent);
  }
  .title {
    font-weight: 700;
    font-size: var(--text-lg);
  }
  .blurb {
    color: var(--text-dim);
    font-size: var(--text-sm);
    line-height: 1.3;
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
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-1);
    text-align: left;
    padding: var(--space-3);
    border-radius: var(--radius);
    border: 1px solid var(--line);
    background: var(--surface);
    color: var(--text);
    cursor: pointer;
  }
  .template:hover {
    border-color: var(--accent);
  }
  .template .meta {
    color: var(--text-dim);
    font-size: var(--text-sm);
  }
  .links {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    border-top: 1px solid var(--line);
    padding-top: var(--space-3);
  }
  .links a {
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    padding: 0 var(--space-3);
    border-radius: var(--radius);
    border: 1px solid var(--line);
    background: var(--surface);
    color: var(--text);
    text-decoration: none;
    font-size: var(--text-sm);
  }
  .ghost {
    min-height: 44px;
    padding: 0 var(--space-3);
    border-radius: var(--radius);
    border: 1px solid var(--line);
    background: var(--surface);
    color: var(--text);
    cursor: pointer;
  }
</style>
