<script lang="ts">
  import { onMount } from 'svelte';
  import { navigate } from '../core/router';
  import { schemas } from '../core/schemas.generated';
  import { store } from '../core/session-store.svelte';
  import { copyText, download } from '../core/share';
  import { allDiagnostics, hasErrors, parseTemplate, resolveTemplate } from '../core/template/parse';
  import { toolsForSession } from '../core/template/session-tools';
  import { suggestFilename } from '../core/template/serialize';
  import { shareTooLong, templateShareUrl } from '../core/template/share-link';
  import { listTemplates, templateText } from '../data/templates';

  const starters = listTemplates();
  const blank = '[game]\nname: My Game\nplayers: 2-4\n\n[tool score]\nmode: simple\n';
  let text = $state(starters.length ? '' : blank);
  let seats = $state(2);
  let area = $state<HTMLTextAreaElement | null>(null);
  let gutter = $state<HTMLElement | null>(null);
  let picked = $state(starters[0]?.id ?? '');

  const parsed = $derived(parseTemplate(text));
  const resolved = $derived(resolveTemplate(parsed.template, (id) => schemas[id]));
  const diagnostics = $derived(allDiagnostics(parsed.diagnostics, resolved.diagnostics));
  const fatal = $derived(hasErrors(diagnostics));
  const lineCount = $derived(text.split('\n').length);
  const range = $derived(parsed.template.game.players);

  // Starter texts live in their own chunk, so the first one arrives after mount.
  onMount(() => {
    if (picked) void loadStarter(picked);
  });

  async function loadStarter(id: string): Promise<void> {
    picked = id;
    if (!starters.some((item) => item.id === id)) return;
    const starter = await templateText(id);
    if (!starter) return;
    text = starter;
    seats = parseTemplate(starter).template.game.players?.min ?? 2;
  }

  function syncScroll(): void {
    if (area && gutter) gutter.scrollTop = area.scrollTop;
  }

  function jump(line: number): void {
    if (!area) return;
    const lines = text.split('\n');
    let offset = 0;
    for (let index = 0; index < Math.min(line - 1, lines.length); index += 1) {
      offset += lines[index].length + 1;
    }
    area.focus();
    area.setSelectionRange(offset, offset + (lines[line - 1]?.length ?? 0));
    area.scrollTop = Math.max(0, (line - 4) * 21);
    syncScroll();
  }

  async function testDrive(): Promise<void> {
    const names = parsed.template.players.length
      ? parsed.template.players
      : Array.from({ length: Math.max(1, Math.min(20, seats)) }, (_, index) => `Player ${index + 1}`);
    await store.start({
      gameName: parsed.template.game.name || 'Untitled game',
      players: names,
      tools: toolsForSession(parsed.template, resolved.tools).map((tool) => ({
        toolId: tool.toolId,
        instanceId: tool.instanceId,
        values: tool.values,
      })),
      templateText: text,
      notes: parsed.template.notes,
    });
    navigate({ name: 'session' });
  }

  function share(): void {
    if (shareTooLong(text)) {
      store.toast('This template is too big for a link. Share the file instead.', 'error');
      return;
    }
    void copyText(templateShareUrl(text)).then((ok) => {
      store.toast(ok ? 'Share link copied' : 'Could not copy', ok ? 'info' : 'error');
    });
  }
</script>

<div class="editor">
  <header class="head">
    <div>
      <h1>Template editor</h1>
      <p class="dim">Plain text, checked as you type. Test drive it before you share.</p>
    </div>
    <a class="back" href="#/templates">Gallery</a>
  </header>

  <div class="toolbar">
    <label class="field">
      <span>Start from</span>
      <select bind:value={picked} onchange={() => void loadStarter(picked)}>
        {#each starters as starter (starter.id)}
          <option value={starter.id}>{starter.name}</option>
        {/each}
      </select>
    </label>
    <button type="button" onclick={() => download(suggestFilename(parsed.template.game.name || 'game'), text)}>Download</button>
    <button type="button" onclick={share}>Copy link</button>
  </div>

  <div class="code" class:bad={fatal}>
    <pre class="gutter" bind:this={gutter} aria-hidden="true">{Array.from({ length: lineCount }, (_, index) => index + 1).join('\n')}</pre>
    <textarea
      bind:this={area}
      bind:value={text}
      spellcheck="false"
      aria-label="Template text"
      onscroll={syncScroll}
    ></textarea>
  </div>

  <div class="status">
    <span class="pill" class:error={fatal}>{fatal ? 'Has errors' : 'Valid'}</span>
    <span class="dim small">{parsed.template.game.name || 'No name yet'} · {resolved.tools.length} tools · {lineCount} lines</span>
  </div>

  {#if diagnostics.length}
    <ul class="diagnostics">
      {#each diagnostics as item, index (index)}
        <li class:error={item.severity === 'error'}>
          <button type="button" onclick={() => jump(item.line)}>
            <span class="line">line {item.line}</span>
            <span>{item.message}</span>
          </button>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="ok">No warnings. This template parses and every tool setting is known.</p>
  {/if}

  <div class="preview">
    <h2>What starts</h2>
    {#if resolved.tools.length}
      <ul>
        {#each resolved.tools as tool (tool.instanceId)}
          <li>
            <strong>{tool.toolId}</strong>
            <span class="dim">{tool.instanceId !== tool.toolId ? tool.instanceId : ''}</span>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="dim">No tools yet. Add a `[tool score]`-style section.</p>
    {/if}
    {#if parsed.template.players.length}
      <p class="dim">Players: {parsed.template.players.join(', ')}</p>
    {:else if range}
      <label class="field">
        <span>Seats ({range.min}–{range.max})</span>
        <input type="number" min={range.min} max={range.max} bind:value={seats} />
      </label>
    {:else}
      <label class="field">
        <span>Seats</span>
        <input type="number" min="1" max="20" bind:value={seats} />
      </label>
    {/if}
  </div>

  <button type="button" class="primary" onclick={testDrive}>{fatal ? 'Test drive with defaults' : 'Test drive'}</button>
</div>

<style>
  .editor {
    max-width: 52rem;
    margin: 0 auto;
    padding: var(--space-4) var(--space-3) var(--space-6);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
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
  h2 {
    margin: 0 0 var(--space-1);
    font-size: var(--text-lg);
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
  .toolbar {
    display: flex;
    align-items: flex-end;
    flex-wrap: wrap;
    gap: var(--space-2);
  }
  .toolbar button {
    min-height: 46px;
    padding: 0 var(--space-4);
    border-radius: var(--radius-pill);
    background: var(--surface-2);
    color: var(--text);
    cursor: pointer;
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
    min-height: 46px;
    padding: 0 var(--space-4);
  }
  .code {
    display: grid;
    grid-template-columns: 3rem 1fr;
    border-radius: var(--radius);
    overflow: hidden;
    background: var(--surface);
    min-height: 18rem;
  }
  .code.bad {
    box-shadow: inset 0 0 0 3px var(--danger);
  }
  .gutter {
    margin: 0;
    padding: var(--space-2) var(--space-1);
    text-align: right;
    overflow: hidden;
    background: var(--surface-2);
    color: var(--text-dim);
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    line-height: 21px;
    user-select: none;
  }
  textarea {
    width: 100%;
    min-height: 18rem;
    padding: var(--space-3);
    resize: vertical;
    background: var(--surface);
    color: var(--text);
    border-radius: 0;
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    line-height: 21px;
    tab-size: 2;
  }
  .status {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex-wrap: wrap;
  }
  .pill {
    padding: var(--space-1) var(--space-4);
    border-radius: var(--radius-pill);
    background: var(--accent-soft);
    color: var(--accent-deep);
    font-weight: 800;
    font-size: var(--text-sm);
  }
  .pill.error {
    background: var(--danger-soft);
    color: var(--danger);
  }
  .diagnostics {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }
  .diagnostics button {
    width: 100%;
    display: flex;
    gap: var(--space-2);
    align-items: baseline;
    text-align: left;
    min-height: 44px;
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-sm);
    background: var(--surface);
    color: var(--text-dim);
    font: inherit;
    font-size: var(--text-sm);
    cursor: pointer;
  }
  .diagnostics li.error button {
    color: var(--danger);
  }
  .line {
    font-family: var(--font-mono);
    flex: none;
  }
  .ok {
    margin: 0;
    color: var(--text-dim);
    font-size: var(--text-sm);
  }
  .preview {
    padding: var(--space-3);
    border-radius: var(--radius-lg);
    background: var(--surface);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  .preview ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }
  .preview li {
    padding: var(--space-1) var(--space-3);
    border-radius: var(--radius-pill);
    background: var(--surface-2);
  }
  .primary {
    min-height: 56px;
    border-radius: var(--radius-pill);
    background: var(--accent);
    color: var(--accent-text);
    box-shadow: var(--shadow-key);
    font-size: var(--text-lg);
    font-weight: 800;
    cursor: pointer;
  }
</style>
