<script lang="ts">
  import type { ToolContext } from '../../core/registry';
  import EmptyState from '../../core/ui/EmptyState.svelte';
  import Sheet from '../../core/ui/Sheet.svelte';
  import { formatClock } from '../../core/template/schema';
  import { progressOf, stepLabel, waitFor } from './logic';
  import type { ScriptInstance } from './tool.svelte';

  let { ctx, instance }: { ctx: ToolContext; instance: ScriptInstance } = $props();
  const data = $derived(instance.data);

  let now = $state(Date.now());
  let editorOpen = $state(false);
  let stepsDraft = $state('');

  $effect(() =>
    ctx.clock.subscribe(() => {
      now = Date.now();
      if (data.autoAdvance && data.waitUntil !== null && !data.paused && now >= data.waitUntil && data.index < data.steps.length - 1) {
        const step = data.steps[data.index];
        if (step?.verb === 'wait') instance.next();
      }
    }),
  );

  const step = $derived(data.steps[data.index]);
  const progress = $derived(progressOf(data));
  const left = $derived(data.waitUntil ? Math.max(0, data.waitUntil - now) : 0);
  const waiting = $derived(!!step && step.verb === 'wait');
  const finished = $derived(data.index >= data.steps.length);

  function openEditor(): void {
    stepsDraft = data.steps.map((item) => `${item.verb}: ${item.arg}`).join('\n');
    editorOpen = true;
  }
</script>

<div class="script">
  {#if !data.steps.length}
    <EmptyState
      title="No script yet"
      body="Write steps like “say: Everyone, close your eyes.” A template can supply them too."
    >
      {#snippet action()}
        <button type="button" onclick={openEditor}>Write the first step</button>
      {/snippet}
    </EmptyState>
  {:else}
    <div class="progress" aria-hidden="true"><div style="width: {progress.percent}%"></div></div>
    <p class="counter">Step {Math.min(data.index + 1, data.steps.length)} of {data.steps.length}{#if step} · {stepLabel(step)}{/if}</p>

    <section class="narration" aria-live="polite">
      {#if finished}
        <p class="big">That is the whole script.</p>
        <p class="dim">Restart it, or go back a step to repeat something.</p>
      {:else if waiting}
        <p class="big">{formatClock(left, true)}</p>
        <p class="dim">{data.paused ? 'Paused' : 'Waiting…'}</p>
      {:else if step}
        <p class="big">{step.arg || stepLabel(step)}</p>
        {#if step.verb === 'note'}
          <p class="host">Host note: not read aloud.</p>
        {:else if step.verb === 'timer' || step.verb === 'reveal'}
          <p class="host">Controls the “{step.arg.split(/\s+/)[0]}” tool in this game.</p>
        {/if}
      {/if}
    </section>

    <div class="row">
      <button type="button" onclick={() => instance.back()} disabled={data.index === 0}>Back</button>
      <button type="button" class="primary" onclick={() => instance.next()}>
        {#if waiting && left > 0}Skip wait{:else if finished}Finish{:else}Next{/if}
      </button>
    </div>
    <div class="row">
      {#if waiting}
        <button type="button" onclick={() => instance.togglePause()}>{data.paused ? 'Resume wait' : 'Pause wait'}</button>
      {/if}
      <button type="button" onclick={() => instance.restart()}>Restart</button>
      <button type="button" onclick={openEditor}>Edit steps</button>
    </div>

    <label class="check">
      <input type="checkbox" checked={data.autoAdvance} onchange={(event) => instance.setAutoAdvance((event.currentTarget as HTMLInputElement).checked)} />
      <span>Continue automatically when a wait ends</span>
    </label>
  {/if}

  {#if data.eventDeck || data.deck.length}
    <section class="panel">
      <header>
        <h2>Event deck</h2>
        <span class="dim small">{data.deck.length} left</span>
      </header>
      {#if data.lastCard}
        <p class="card" role="status">{data.lastCard}</p>
      {/if}
      <div class="row">
        <button type="button" onclick={() => instance.drawCard()}>Draw a card</button>
        <button type="button" onclick={() => instance.reshuffle()}>Reshuffle</button>
      </div>
      {#if data.drawn.length > 1}
        <ol class="drawn">
          {#each data.drawn.slice(1) as card, index (index)}
            <li>{card}</li>
          {/each}
        </ol>
      {/if}
    </section>
  {/if}

  {#if data.steps.length > 1}
    <details class="panel">
      <summary>Every step</summary>
      <ol class="all">
        {#each data.steps as item, index (index)}
          <li class:current={index === data.index}>
            <span class="verb">{item.verb}</span>
            <span>{item.arg}</span>
          </li>
        {/each}
      </ol>
    </details>
  {/if}
</div>

{#if editorOpen}
  <Sheet title="Script steps" onclose={() => (editorOpen = false)}>
    <p class="dim small">One step per line: <code>say:</code>, <code>wait: 5s</code>, <code>reveal: roles</code>, <code>timer: clock start</code>, <code>note:</code>.</p>
    <label class="field">
      <span>Steps</span>
      <textarea rows="12" bind:value={stepsDraft} spellcheck="true"></textarea>
    </label>
    <button type="button" class="wide primary" onclick={() => { instance.setSteps(stepsDraft); editorOpen = false; }}>Save steps</button>
    {#if data.steps.some((item) => item.verb === 'wait' && waitFor(item.arg) === 0)}
      <p class="dim small">A wait step needs a duration like 5s or 90s.</p>
    {/if}
  </Sheet>
{/if}

<style>
  .script {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding: var(--space-3);
  }
  .progress {
    height: 8px;
    border-radius: 999px;
    background: var(--surface-2);
    overflow: hidden;
  }
  .progress div {
    height: 100%;
    background: var(--accent);
    transition: width 160ms ease-out;
  }
  .counter {
    margin: 0;
    color: var(--text-dim);
    font-size: var(--text-sm);
  }
  .narration {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    min-height: 9rem;
    justify-content: center;
    text-align: center;
    padding: var(--space-4);
    border-radius: var(--radius-lg);
    border: 2px solid var(--accent);
    background: var(--accent-soft);
  }
  .big {
    margin: 0;
    font-size: clamp(1.4rem, 6vw, 2rem);
    font-weight: 700;
    line-height: 1.3;
  }
  .host {
    margin: 0;
    color: var(--text-dim);
    font-size: var(--text-sm);
  }
  .row {
    display: flex;
    gap: var(--space-2);
  }
  .row button {
    flex: 1;
    min-height: 56px;
    border-radius: var(--radius);
    border: 1px solid var(--line);
    background: var(--surface-2);
    color: var(--text);
    font-weight: 600;
    cursor: pointer;
  }
  .row button.primary {
    border-color: var(--accent);
    background: var(--accent);
    color: var(--accent-text);
    font-weight: 800;
  }
  .row button:disabled {
    opacity: 0.55;
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
  }
  .panel {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: var(--space-3);
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    background: var(--surface);
  }
  .panel header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  h2 {
    margin: 0;
    font-size: var(--text-base);
  }
  summary {
    cursor: pointer;
    font-weight: 700;
    min-height: 44px;
  }
  .card {
    margin: 0;
    padding: var(--space-3);
    border-radius: var(--radius);
    background: var(--surface-2);
    font-size: var(--text-lg);
    font-weight: 700;
  }
  .drawn {
    margin: 0;
    padding-left: var(--space-4);
    color: var(--text-dim);
    font-size: var(--text-sm);
  }
  .all {
    margin: var(--space-2) 0 0;
    padding-left: var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    font-size: var(--text-sm);
  }
  .all li.current {
    font-weight: 700;
  }
  .verb {
    display: inline-block;
    min-width: 4.5rem;
    color: var(--text-dim);
    font-family: var(--font-mono);
    text-transform: uppercase;
    font-size: var(--text-xs);
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    color: var(--text-dim);
  }
  .field textarea {
    border-radius: var(--radius);
    border: 1px solid var(--line);
    background: var(--surface-2);
    color: var(--text);
    padding: var(--space-2);
    font-family: var(--font-mono);
    font-size: var(--text-sm);
  }
  .wide {
    min-height: 52px;
    border-radius: var(--radius);
    border: 1px solid var(--line);
    background: var(--surface-2);
    color: var(--text);
    cursor: pointer;
  }
  .wide.primary {
    border-color: var(--accent);
    background: var(--accent);
    color: var(--accent-text);
    font-weight: 700;
  }
  .dim {
    color: var(--text-dim);
    margin: 0;
  }
  .small {
    font-size: var(--text-sm);
  }
  button:not(.wide) {
    min-height: 44px;
  }
</style>
