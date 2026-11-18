<script lang="ts">
  import type { Snippet } from 'svelte';
  import { onMount } from 'svelte';
  import { t } from '../i18n.svelte';
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
  <div class="handle" aria-hidden="true"></div>
  <header>
    <h2>{title}</h2>
    <button class="close" type="button" onclick={onclose} aria-label={t('app.close')}>✕</button>
  </header>
  <div class="body">
    {@render children()}
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: var(--scrim);
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
    border-radius: var(--radius-card) var(--radius-card) 0 0;
    box-shadow: var(--shadow-lift);
    padding-bottom: env(safe-area-inset-bottom, 0);
    animation: settle var(--motion-settle) var(--ease-out);
  }
  .sheet.wide {
    max-width: 34rem;
    margin: 0 auto;
  }
  .handle {
    width: 46px;
    height: 5px;
    margin: var(--space-3) auto 0;
    border-radius: var(--radius-pill);
    background: var(--line);
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    padding: var(--space-2) var(--space-3) var(--space-2) var(--space-5);
  }
  h2 {
    margin: 0;
    font-size: var(--text-xl);
    color: var(--forest);
  }
  .close {
    min-width: 48px;
    min-height: 48px;
    --cutout-fill: transparent;
    color: var(--text-dim);
    font-size: var(--text-lg);
    border-radius: var(--radius-round);
    box-shadow: none;
    cursor: pointer;
  }
  .close:hover {
    transform: none;
  }
  .body {
    overflow: auto;
    padding: var(--space-2) var(--space-5) var(--space-6);
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }
  @media (min-width: 40rem) {
    .sheet {
      bottom: auto;
      top: 8vh;
      border-radius: var(--radius-card);
      max-width: 30rem;
      margin: 0 auto;
    }
    .handle {
      display: none;
    }
  }
  @keyframes settle {
    from {
      transform: translateY(18px);
      opacity: 0.55;
    }
    to {
      transform: none;
      opacity: 1;
    }
  }
</style>
