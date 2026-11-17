<script lang="ts">
  import type { Snippet } from 'svelte';
  import { onMount } from 'svelte';
  import { trapFocus } from '../dom';

  let {
    title,
    onclose,
    children,
    wide = false,
  }: {
    title: string;
    onclose: () => void;
    children: Snippet;
    wide?: boolean;
  } = $props();

  let panel = $state<HTMLElement | null>(null);
  let restoreTo: HTMLElement | null = null;

  onMount(() => {
    restoreTo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const untrap = trapFocus(panel);
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onclose();
      }
    };
    window.addEventListener('keydown', onKey);
    const first = panel?.querySelector<HTMLElement>('button, input, select, textarea');
    (first ?? panel)?.focus();
    return () => {
      window.removeEventListener('keydown', onKey);
      untrap();
      restoreTo?.focus();
    };
  });
</script>

<div class="backdrop" role="presentation" onclick={onclose}></div>
<div class="sheet" class:wide bind:this={panel} role="dialog" aria-modal="true" aria-label={title} tabindex="-1">
  <header>
    <h2>{title}</h2>
    <button class="close" type="button" onclick={onclose} aria-label="Close">✕</button>
  </header>
  <div class="body">
    {@render children()}
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(20, 14, 8, 0.55);
    z-index: 40;
    border: 0;
  }
  .sheet {
    position: fixed;
    z-index: 41;
    left: 0;
    right: 0;
    bottom: 0;
    max-height: 88vh;
    display: flex;
    flex-direction: column;
    background: var(--surface);
    color: var(--text);
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    box-shadow: 0 -12px 40px rgba(0, 0, 0, 0.28);
    padding-bottom: env(safe-area-inset-bottom, 0);
  }
  .sheet.wide {
    max-width: 34rem;
    margin: 0 auto;
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    border-bottom: 1px solid var(--line);
  }
  h2 {
    margin: 0;
    font-size: var(--text-lg);
  }
  .close {
    min-width: 48px;
    min-height: 48px;
    border: 0;
    background: transparent;
    color: var(--text);
    font-size: var(--text-lg);
    border-radius: var(--radius);
    cursor: pointer;
  }
  .close:hover {
    background: var(--surface-2);
  }
  .body {
    overflow: auto;
    padding: var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }
  @media (min-width: 40rem) {
    .sheet {
      bottom: auto;
      top: 8vh;
      border-radius: var(--radius-lg);
      max-width: 30rem;
      margin: 0 auto;
    }
  }
</style>
