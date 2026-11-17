<script lang="ts">
  import { listRecentImports, type RecentImport } from '../core/recent-imports';
  import { navigate } from '../core/router';
  import { schemas } from '../core/schemas.generated';
  import { store } from '../core/session-store.svelte';
  import { KEYS, readJson, writeJson } from '../core/storage';
  import { parseTemplate, resolveTemplate, type TemplateVariant } from '../core/template/parse';
  import { applyVariant, toolsForSession } from '../core/template/session-tools';
  import { ensureTemplateMarks, templateMarkLazy, templateMarksVersion } from '../core/ui/marks.svelte';
  import Sheet from '../core/ui/Sheet.svelte';
  import { listTemplates, templateText, type TemplateSummary } from '../data/templates';

  const templates = listTemplates();
  const tags = [...new Set(templates.flatMap((template) => template.tags))].sort();

  let query = $state('');
  let playersFilter = $state('any');
  let timeFilter = $state('any');
  let tagFilter = $state('any');
  let mode = $state<'all' | 'favourites' | 'recent'>('all');
  let favourites = $state<string[]>(readJson<string[]>(KEYS.favorites, []));
  let recent = $state<string[]>(readJson<string[]>(KEYS.recent, []));
  let chosen = $state<TemplateSummary | null>(null);
  let chosenText = $state('');
  let chosenVariants = $state<TemplateVariant[]>([]);
  let variantId = $state('');
  let seats = $state(2);
  let imports = $state<RecentImport[]>(listRecentImports());
  let {
    onupload,
  }: {
    onupload: (files: File[]) => void;
  } = $props();

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
        if (timeFilter !== 'any') {
          const minutes = minutesOf(template);
          if (minutes === null) return false;
          if (timeFilter === 'short' && minutes > 20) return false;
          if (timeFilter === 'medium' && (minutes < 21 || minutes > 60)) return false;
          if (timeFilter === 'long' && minutes <= 60) return false;
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

  $effect(() => {
    ensureTemplateMarks();
  });

  /** A template may name a mark; unknown names simply draw nothing. */
  function iconOf(template: TemplateSummary): string {
    void templateMarksVersion();
    return templateMarkLazy(template.icon, template.id);
  }

  function rangeOf(template: TemplateSummary): { min: number; max: number } {
    const raw = template.players ?? '';
    const [min, max] = raw.split('-').map((value) => Number(value));
    if (!Number.isFinite(min)) return { min: 1, max: 8 };
    return { min, max: Number.isFinite(max) ? max : min };
  }

  /** Minutes from a free-text length: `20m`, `1h`, `10-60m`; null when unknown. */
  function minutesOf(template: TemplateSummary): number | null {
    const raw = (template.time ?? '').toLowerCase();
    const match = raw.match(/(\d+)\s*(h|m)/);
    if (!match) return null;
    const value = Number(match[1]);
    if (!Number.isFinite(value)) return null;
    return match[2] === 'h' ? value * 60 : value;
  }

  function toggleFavourite(id: string): void {
    favourites = favourites.includes(id) ? favourites.filter((item) => item !== id) : [...favourites, id];
    writeJson(KEYS.favorites, favourites);
  }

  function choose(template: TemplateSummary): void {
    chosen = template;
    seats = rangeOf(template).min;
    chosenText = '';
    chosenVariants = [];
    variantId = '';
    void templateText(template.id).then((text) => {
      if (chosen?.id !== template.id) return;
      chosenText = text ?? '';
      chosenVariants = parseTemplate(chosenText).template.variants;
    });
  }

  /** A paired image, the template's own name, then the built-in drawing. */
  function importIcon(entry: RecentImport): string {
    void templateMarksVersion();
    return templateMarkLazy(entry.icon, entry.source);
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
    };
    chosenText = entry.text;
    chosenVariants = parsed.variants;
    variantId = '';
    seats = range?.min ?? 2;
  }

  /** "What should we play?" offers a game from the current filters, not all of them. */
  function surprise(): void {
    if (!shown.length) {
      store.toast('No game matches those filters. Clear one and try again.', 'error');
      return;
    }
    choose(shown[Math.floor(Math.random() * shown.length)]);
  }

  async function startChosen(): Promise<void> {
    const template = chosen;
    const text = chosenText;
    if (!template || !text) return;
    const parsed = parseTemplate(text);
    const resolved = resolveTemplate(parsed.template, (id) => schemas[id]);
    const range = parsed.template.game.players;
    const count = parsed.template.players.length ? parsed.template.players.length : Math.max(1, Math.min(20, seats));
    const names = parsed.template.players.length
      ? parsed.template.players
      : Array.from({ length: count }, (_, index) => `Player ${index + 1}`);
    const baseTools = toolsForSession(parsed.template, resolved.tools);
    const variant = parsed.template.variants.find((item) => item.id === variantId);
    const tools = variant ? applyVariant(baseTools, variant) : baseTools;
    await store.start({
      gameName: parsed.template.game.name || template.name,
      players: names,
      tools: tools.map((tool) => ({
        toolId: tool.toolId,
        instanceId: tool.instanceId,
        values: tool.values,
      })),
      templateText: text,
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
        <span>Length</span>
        <select bind:value={timeFilter}>
          <option value="any">Any</option>
          <option value="short">20 min or less</option>
          <option value="medium">20–60 min</option>
          <option value="long">Over an hour</option>
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
      <button type="button" class="surprise" onclick={surprise}>What should we play?</button>
    </div>
  </div>

  {#if imports.length}
    <section class="imports">
      <h2>Recently imported</h2>
      <div class="chips">
        {#each imports as entry (entry.at)}
          <button type="button" class="import-chip" onclick={() => chooseImport(entry)}>
            <span class="import-mark" aria-hidden="true">{@html importIcon(entry)}</span>
            {entry.name}
          </button>
        {/each}
      </div>
    </section>
  {/if}

  {#if shown.length}
    <ul class="list">
      {#each shown as template (template.id)}
        <li>
          <button type="button" class="card" onclick={() => choose(template)}>
            <span class="card-head">
              <span class="card-mark" aria-hidden="true">{@html iconOf(template)}</span>
              <span class="title">{template.name}</span>
            </span>
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
    <p class="empty">No template matches those filters. Try “Any”, or clear the search.</p>
    <a class="primary link" href="#/editor">Write one in the editor</a>
  {/if}

  <section class="upload" aria-labelledby="upload-title">
    <h2 id="upload-title">Bring your own</h2>
    <p>
      Upload a <code>.gamebuddy</code> template, its images and a <code>.gamebuddy-theme</code> in one go.
      Everything stays on this device.
    </p>
    <label class="field">
      <span>Files</span>
      <input
        type="file"
        multiple
        accept=".gamebuddy,.gamebuddy-theme,.txt,.json,image/svg+xml,image/png,image/jpeg,image/webp"
        onchange={(event) => {
          const input = event.currentTarget as HTMLInputElement;
          const files = Array.from(input.files ?? []);
          if (files.length) onupload(files);
          input.value = '';
        }}
      />
    </label>
    <p class="hint">
      An image named like the template's <code>icon:</code> value — or like the template file — becomes its
      mark. A theme is applied straight away.
    </p>
  </section>
</div>

{#if chosen}
  {@const current = chosen}
  <Sheet title={current.name} onclose={() => (chosen = null)}>
    <p class="dim">
      {current.players ?? 'any'} players{#if current.time} · {current.time}{/if}
      {#if current.tags.length}· {current.tags.join(', ')}{/if}
    </p>
    <p class="dim small">Tools: {current.tools.join(', ') || 'none'}</p>
    {#if chosenVariants.length}
      <div class="variants" role="group" aria-label="House-rule variant">
        <button type="button" class:active={variantId === ''} onclick={() => (variantId = '')}>Base rules</button>
        {#each chosenVariants as variant (variant.id)}
          <button type="button" class:active={variantId === variant.id} onclick={() => (variantId = variant.id)}>{variant.name}</button>
        {/each}
      </div>
    {/if}
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
    <button type="button" class="wide" onclick={startChosen} disabled={!chosenText}>
      {chosenText ? 'Start game' : 'Loading…'}
    </button>
    <button type="button" class="wide ghost" onclick={() => toggleFavourite(current.id)}>
      {favourites.includes(current.id) ? 'Remove from favourites' : 'Add to favourites'}
    </button>
  </Sheet>
{/if}

<style>
  .gallery {
    max-width: 48rem;
    margin: 0 auto;
    padding: var(--space-4) var(--space-3) var(--space-6);
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
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
    color: var(--forest);
  }
  .dim {
    margin: var(--space-1) 0 0;
    color: var(--text-dim);
  }
  .small {
    font-size: var(--text-sm);
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
  .filters {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }
  .search input {
    width: 100%;
    min-height: 52px;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }
  .chips button {
    min-height: 46px;
    padding: 0 var(--space-4);
    border-radius: var(--radius-pill);
    background: var(--surface-2);
    color: var(--text-dim);
    cursor: pointer;
  }
  .chips button.active {
    background: var(--accent);
    color: var(--accent-text);
    font-weight: 800;
    box-shadow: var(--shadow-key);
  }
  .selects {
    display: flex;
    align-items: flex-end;
    gap: var(--space-3);
    flex-wrap: wrap;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    color: var(--text-dim);
    font-size: var(--text-sm);
    font-weight: 600;
  }
  .field select,
  .field input {
    min-height: 46px;
    min-width: 8.5rem;
    padding: 0 var(--space-3) 0 var(--space-4);
  }
  .surprise {
    min-height: 46px;
    padding: 0 var(--space-5);
    border-radius: var(--radius-pill);
    background: var(--accent-soft);
    color: var(--accent-deep);
    font-weight: 800;
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
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    min-height: 46px;
    padding: 0 var(--space-4);
    border-radius: var(--radius-pill);
    background: var(--surface-2);
    color: var(--text);
    cursor: pointer;
  }
  .import-mark {
    display: inline-flex;
    width: 20px;
    height: 20px;
  }
  .import-mark :global(svg),
  .import-mark :global(img) {
    width: 20px;
    height: 20px;
    object-fit: contain;
  }
  .upload {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin-top: var(--space-4);
    padding-top: var(--space-4);
    border-top: 1px solid var(--line);
  }
  .upload h2 {
    margin: 0;
    font-size: var(--text-lg);
  }
  .upload p {
    margin: 0;
    max-width: 46rem;
    color: var(--text-dim);
  }
  .list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: var(--space-3);
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
    padding: var(--space-4) var(--space-6) var(--space-4) var(--space-4);
    border-radius: var(--radius-card);
    background: var(--surface);
    color: var(--text);
    box-shadow: var(--shadow-card);
    cursor: pointer;
  }
  .card:hover {
    transform: translateY(-3px);
    box-shadow: var(--shadow-lift);
  }
  .card-head {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    width: 100%;
    min-height: 44px;
  }
  .card-mark {
    display: grid;
    place-items: center;
    flex: none;
    width: 44px;
    height: 44px;
    border-radius: var(--radius);
    background: var(--accent-soft);
    color: var(--accent-deep);
  }
  .card-mark :global(svg),
  .card-mark :global(img) {
    width: 26px;
    height: 26px;
    object-fit: contain;
  }
  .title {
    min-width: 0;
    font-family: var(--font-display);
    font-weight: 800;
    font-size: var(--text-xl);
    line-height: 1.1;
  }
  .meta {
    color: var(--text-dim);
    font-size: var(--text-sm);
  }
  .tools {
    color: var(--text-dim);
    font-size: var(--text-xs);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: 700;
  }
  .star {
    position: absolute;
    top: var(--space-2);
    right: var(--space-2);
    min-width: 44px;
    min-height: 44px;
    border-radius: var(--radius-round);
    background: transparent;
    box-shadow: none;
    color: var(--text-faint);
    font-size: var(--text-xl);
    cursor: pointer;
  }
  .star.on {
    color: var(--accent);
  }
  .empty {
    color: var(--text-dim);
  }
  .primary {
    min-height: 50px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0 var(--space-5);
    border-radius: var(--radius-pill);
    background: var(--accent);
    color: var(--accent-text);
    text-decoration: none;
    font-weight: 800;
  }
  .link {
    width: fit-content;
  }
  .wide {
    min-height: 54px;
    border-radius: var(--radius-pill);
    background: var(--accent);
    color: var(--accent-text);
    box-shadow: var(--shadow-key);
    font-weight: 800;
    cursor: pointer;
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
  .wide.ghost {
    background: transparent;
    color: var(--text-dim);
    box-shadow: none;
    font-weight: 600;
  }
</style>
