<script lang="ts">
  import { listRecentImports, type RecentImport } from '../core/recent-imports';
  import { navigate } from '../core/router';
  import { schemas } from '../core/schemas.generated';
  import { store } from '../core/session-store.svelte';
  import { KEYS, readJson, writeJson } from '../core/storage';
  import { parseTemplate, resolveTemplate } from '../core/template/parse';
  import { toolsForSession } from '../core/template/session-tools';
  import Sheet from '../core/ui/Sheet.svelte';
  import { listTemplates, type TemplateSummary } from '../data/templates';

  const templates = listTemplates();
  const tags = [...new Set(templates.flatMap((template) => template.tags))].sort();

  let query = $state('');
  let playersFilter = $state('any');
  let tagFilter = $state('any');
  let mode = $state<'all' | 'favourites' | 'recent'>('all');
  let favourites = $state<string[]>(readJson<string[]>(KEYS.favorites, []));
  let recent = $state<string[]>(readJson<string[]>(KEYS.recent, []));
  let chosen = $state<TemplateSummary | null>(null);
  let seats = $state(2);
  let imports = $state<RecentImport[]>(listRecentImports());

  const shown = $derived(
    templates
      .filter((template) => {
        if (mode === 'favourites' && !favourites.includes(template.id)) return false;
        if (mode === 'recent' && !recent.includes(template.id)) return false;
        if (tagFilter !== 'any' && !template.tags.includes(tagFilter)) return false;
        if (playersFilter !== 'any') {
          const range = rangeOf(template);
          if (playersFilter === '1-2' && range.max > 2) return false;
          if (playersFilter === '3-4' && (range.max < 3 || range.min > 4)) return false;
          if (playersFilter === '5+' && range.max < 5) return false;
        }
        const needle = query.trim().toLowerCase();
        if (!needle) return true;
        return (
          template.name.toLowerCase().includes(needle) ||
          template.tools.some((tool) => tool.includes(needle)) ||
          template.tags.some((tag) => tag.includes(needle))
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name)),
  );

  function rangeOf(template: TemplateSummary): { min: number; max: number } {
    const raw = template.players ?? '';
    const [min, max] = raw.split('-').map((value) => Number(value));
    if (!Number.isFinite(min)) return { min: 1, max: 8 };
    return { min, max: Number.isFinite(max) ? max : min };
  }

  function toggleFavourite(id: string): void {
    favourites = favourites.includes(id) ? favourites.filter((item) => item !== id) : [...favourites, id];
    writeJson(KEYS.favorites, favourites);
  }

  function choose(template: TemplateSummary): void {
    chosen = template;
    seats = rangeOf(template).min;
  }

  function chooseImport(entry: RecentImport): void {
    const parsed = parseTemplate(entry.text).template;
    const range = parsed.game.players;
    const tools = parsed.tools.map((tool) => tool.toolId);
    if (!tools.includes('rules') && (parsed.rules.trim() || parsed.setup.length)) tools.push('rules');
    chosen = {
      id: `import-${entry.at}`,
      name: parsed.game.name || entry.name,
      players: range ? (range.min === range.max ? String(range.min) : `${range.min}-${range.max}`) : undefined,
      time: parsed.game.time,
      tags: parsed.game.tags,
      tools,
      text: entry.text,
    };
    seats = range?.min ?? 2;
  }

  function surprise(): void {
    if (!templates.length) return;
    choose(templates[Math.floor(Math.random() * templates.length)]);
  }

  function startChosen(): void {
    const template = chosen;
    if (!template) return;
    const parsed = parseTemplate(template.text);
    const resolved = resolveTemplate(parsed.template, (id) => schemas[id]);
    const range = parsed.template.game.players;
    const count = parsed.template.players.length ? parsed.template.players.length : Math.max(1, Math.min(20, seats));
    const names = parsed.template.players.length
      ? parsed.template.players
      : Array.from({ length: count }, (_, index) => `Player ${index + 1}`);
    store.start({
      gameName: parsed.template.game.name || template.name,
      players: names,
      tools: toolsForSession(parsed.template, resolved.tools).map((tool) => ({
        toolId: tool.toolId,
        instanceId: tool.instanceId,
        values: tool.values,
      })),
      templateText: template.text,
      templateId: template.id,
      notes: parsed.template.notes,
    });
    recent = [template.id, ...recent.filter((id) => id !== template.id)].slice(0, 8);
    writeJson(KEYS.recent, recent);
    chosen = null;
    navigate({ name: 'session' });
    if (range && names.length < range.min) store.toast(`This game wants at least ${range.min} players`);
  }
</script>

<div class="gallery">
  <header class="head">
    <div>
      <h1>Template gallery</h1>
      <p class="dim">{templates.length} games, ready to play. Nothing to download.</p>
    </div>
    <a class="back" href="#/">Home</a>
  </header>

  <div class="filters">
    <label class="search">
      <span class="sr-only">Search templates</span>
      <input type="search" bind:value={query} placeholder="Search games or tools" />
    </label>
    <div class="chips" role="group" aria-label="Template collection">
      {#each [['all', 'All'], ['favourites', 'Favourites'], ['recent', 'Recent']] as item (item[0])}
        <button type="button" class:active={mode === item[0]} onclick={() => (mode = item[0] as typeof mode)}>{item[1]}</button>
      {/each}
    </div>
    <div class="selects">
      <label class="field">
        <span>Players</span>
        <select bind:value={playersFilter}>
          <option value="any">Any</option>
          <option value="1-2">1–2</option>
          <option value="3-4">3–4</option>
          <option value="5+">5+</option>
        </select>
      </label>
      <label class="field">
        <span>Tag</span>
        <select bind:value={tagFilter}>
          <option value="any">Any</option>
          {#each tags as tag (tag)}
            <option value={tag}>{tag}</option>
          {/each}
        </select>
      </label>
      <button type="button" class="surprise" onclick={surprise}>Surprise me</button>
    </div>
  </div>

  {#if imports.length}
    <section class="imports">
      <h2>Recently imported</h2>
      <div class="chips">
        {#each imports as entry (entry.at)}
          <button type="button" class="import-chip" onclick={() => chooseImport(entry)}>{entry.name}</button>
        {/each}
      </div>
    </section>
  {/if}

  {#if shown.length}
    <ul class="list">
      {#each shown as template (template.id)}
        <li>
          <button type="button" class="card" onclick={() => choose(template)}>
            <span class="title">{template.name}</span>
            <span class="meta">
              {template.players ?? 'any'} players{#if template.time} · {template.time}{/if}
            </span>
            <span class="tools">{template.tools.join(' · ')}</span>
          </button>
          <button
            type="button"
            class="star"
            class:on={favourites.includes(template.id)}
            aria-label={favourites.includes(template.id) ? `Remove ${template.name} from favourites` : `Favourite ${template.name}`}
            aria-pressed={favourites.includes(template.id)}
            onclick={() => toggleFavourite(template.id)}
          >★</button>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="empty">Nothing matches those filters. Try “Any” or another tag.</p>
    <a class="primary link" href="#/editor">Write one in the editor</a>
  {/if}
</div>

{#if chosen}
  {@const current = chosen}
  <Sheet title={current.name} onclose={() => (chosen = null)}>
    <p class="dim">
      {current.players ?? 'any'} players{#if current.time} · {current.time}{/if}
      {#if current.tags.length}· {current.tags.join(', ')}{/if}
    </p>
    <p class="dim small">Tools: {current.tools.join(', ') || 'none'}</p>
    {#if !current.players}
      <label class="field">
        <span>Seats</span>
        <input type="number" min="1" max="20" bind:value={seats} />
      </label>
    {:else if current.players.includes('-')}
      <label class="field">
        <span>Seats (this game takes {current.players})</span>
        <input type="number" min={rangeOf(current).min} max={rangeOf(current).max} bind:value={seats} />
      </label>
    {/if}
    <button type="button" class="wide" onclick={startChosen}>Start game</button>
    <button type="button" class="wide ghost" onclick={() => toggleFavourite(current.id)}>
      {favourites.includes(current.id) ? 'Remove from favourites' : 'Add to favourites'}
    </button>
  </Sheet>
{/if}

<style>
  .gallery {
    max-width: 46rem;
    margin: 0 auto;
    padding: var(--space-4) var(--space-3) var(--space-6);
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }
  .head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-3);
  }
  h1 {
    margin: 0;
    font-size: var(--text-2xl);
  }
  .dim {
    margin: var(--space-1) 0 0;
    color: var(--text-dim);
  }
  .small {
    font-size: var(--text-sm);
  }
  .back {
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    padding: 0 var(--space-3);
    border-radius: var(--radius);
    border: 1px solid var(--line);
    background: var(--surface);
    color: var(--text);
    text-decoration: none;
  }
  .filters {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  .search input {
    width: 100%;
    min-height: 48px;
    border-radius: 999px;
    border: 1px solid var(--line);
    background: var(--surface);
    color: var(--text);
    padding: 0 var(--space-3);
  }
  .chips {
    display: flex;
    gap: var(--space-1);
  }
  .chips button {
    min-height: 44px;
    padding: 0 var(--space-3);
    border-radius: 999px;
    border: 1px solid var(--line);
    background: var(--surface);
    color: var(--text);
    cursor: pointer;
  }
  .chips button.active {
    border-color: var(--accent);
    background: var(--accent-soft);
    font-weight: 700;
  }
  .selects {
    display: flex;
    align-items: flex-end;
    gap: var(--space-2);
    flex-wrap: wrap;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    color: var(--text-dim);
    font-size: var(--text-sm);
  }
  .field select,
  .field input {
    min-height: 44px;
    border-radius: var(--radius);
    border: 1px solid var(--line);
    background: var(--surface-2);
    color: var(--text);
    padding: 0 var(--space-2);
  }
  .surprise {
    min-height: 44px;
    padding: 0 var(--space-3);
    border-radius: var(--radius);
    border: 1px solid var(--accent);
    background: var(--accent-soft);
    color: var(--text);
    font-weight: 700;
    cursor: pointer;
  }
  .imports {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  .imports h2 {
    margin: 0;
    font-size: var(--text-base);
  }
  .import-chip {
    min-height: 44px;
    padding: 0 var(--space-3);
    border-radius: var(--radius);
    border: 1px dashed var(--line);
    background: var(--surface);
    color: var(--text);
    cursor: pointer;
  }
  .list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: var(--space-2);
  }
  @media (min-width: 34rem) {
    .list {
      grid-template-columns: 1fr 1fr;
    }
  }
  .list li {
    position: relative;
  }
  .card {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-1);
    text-align: left;
    padding: var(--space-3) var(--space-5) var(--space-3) var(--space-3);
    border-radius: var(--radius-lg);
    border: 1px solid var(--line);
    background: var(--surface);
    color: var(--text);
    cursor: pointer;
  }
  .card:hover {
    border-color: var(--accent);
  }
  .title {
    font-weight: 800;
    font-size: var(--text-lg);
  }
  .meta {
    color: var(--text-dim);
    font-size: var(--text-sm);
  }
  .tools {
    color: var(--text-dim);
    font-size: var(--text-xs);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .star {
    position: absolute;
    top: var(--space-1);
    right: var(--space-1);
    min-width: 44px;
    min-height: 44px;
    border: 0;
    border-radius: 50%;
    background: transparent;
    color: var(--text-dim);
    font-size: var(--text-lg);
    cursor: pointer;
  }
  .star.on {
    color: var(--accent);
  }
  .empty {
    color: var(--text-dim);
  }
  .primary {
    min-height: 48px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0 var(--space-4);
    border-radius: var(--radius);
    background: var(--accent);
    color: var(--accent-text);
    text-decoration: none;
    font-weight: 700;
  }
  .link {
    width: fit-content;
  }
  .wide {
    min-height: 52px;
    border-radius: var(--radius);
    border: 0;
    background: var(--accent);
    color: var(--accent-text);
    font-weight: 700;
    cursor: pointer;
  }
  .wide.ghost {
    background: var(--surface);
    border: 1px solid var(--line);
    color: var(--text);
    font-weight: 600;
  }
</style>
