<script lang="ts">
  import type { Snippet } from 'svelte';
  import { t } from '../i18n.svelte';

  let {
    name,
    hint = '',
    action = t('pass.show'),
    autoHide = 0,
    children,
    onshow,
    onhide,
    onnext,
    oncancel,
  }: {
    name: string;
    hint?: string;
    action?: string;
    /** Seconds before a revealed secret covers itself again. 0 turns it off. */
    autoHide?: number;
    children?: Snippet;
    onshow?: () => void;
    onhide?: () => void;
    /** Offered on the cover, so a player can pass without peeking first. */
    onnext?: () => void;
    /** Offered on the cover, so the table can get back to the tool. */
    oncancel?: () => void;
  } = $props();

  let covered = $state(true);
  let timer: ReturnType<typeof setTimeout> | null = null;
  let panel = $state<HTMLDialogElement | null>(null);

  // A native modal dialog puts the whole board behind the cover out of reach
  // for pointers, Tab and screen readers, which is the point of passing it.
  $effect(() => {
    const dialog = panel;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  });

  $effect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  });

  // A new holder always starts behind the cover: navigating back must never
  // land on the previous player's secret.
  $effect(() => {
    void name;
    clearTimer();
    covered = true;
  });

  function clearTimer(): void {
    if (timer) clearTimeout(timer);
    timer = null;
  }

  function show(): void {
    covered = false;
    onshow?.();
    if (autoHide > 0) {
      clearTimer();
      timer = setTimeout(() => hide(), autoHide * 1000);
    }
  }

  function hide(): void {
    clearTimer();
    covered = true;
    onhide?.();
  }

  $effect(() => () => clearTimer());
</script>

<dialog
  class="pass"
  bind:this={panel}
  aria-label={covered ? t('pass.aria-cover', { name }) : t('pass.aria-secret', { name })}
  oncancel={(event) => event.preventDefault()}
>
  {#if covered}
    <div class="cover">
      <p class="lead">{t('pass.lead')}</p>
      <h2>{name}</h2>
      {#if hint}<p class="hint">{hint}</p>{/if}
      <button type="button" class="primary" onclick={show}>{action}</button>
      {#if onnext}
        <button type="button" class="secondary" onclick={onnext}>{t('pass.next')}</button>
      {/if}
      {#if oncancel}
        <button type="button" class="ghost" onclick={oncancel}>{t('pass.back')}</button>
      {/if}
      <p class="small">{t('pass.hint')}</p>
    </div>
  {:else}
    <div class="secret">
      {@render children?.()}
      <button type="button" class="hide" onclick={hide}>{t('pass.hide')}</button>
    </div>
  {/if}
</dialog>

<style>
  .pass {
    position: fixed;
    inset: 0;
    width: 100%;
    max-width: none;
    height: 100%;
    max-height: none;
    margin: 0;
    border: 0;
    padding: 0;
    background: var(--cover);
    color: var(--text);
  }
  .pass::backdrop {
    background: var(--cover);
  }
  .cover,
  .secret {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    text-align: center;
    min-height: 100dvh;
    padding: calc(var(--space-5) + env(safe-area-inset-top, 0px)) var(--space-4)
      calc(var(--space-5) + env(safe-area-inset-bottom, 0px));
    overflow: auto;
    overscroll-behavior: contain;
    background-image: radial-gradient(680px 420px at 50% 0%, var(--accent-soft), transparent 70%);
  }
  .lead {
    margin: 0;
    color: var(--text-dim);
    text-transform: uppercase;
    letter-spacing: 0.14em;
    font-size: var(--text-xs);
    font-weight: 700;
  }
  h2 {
    margin: 0;
    font-size: clamp(2.6rem, 14vw, 4.5rem);
    line-height: 1;
    color: var(--forest);
  }
  .hint {
    margin: 0;
    color: var(--text-dim);
  }
  .small {
    margin: var(--space-3) 0 0;
    max-width: 22rem;
    color: var(--text-dim);
    font-size: var(--text-sm);
  }
  .primary {
    min-height: 62px;
    margin-top: var(--space-3);
    padding: 0 var(--space-6);
    --cutout-fill: var(--accent);
    color: var(--accent-text);
    font-size: var(--text-lg);
    font-weight: 800;
    cursor: pointer;
  }
  .secondary {
    min-height: 52px;
    margin-top: var(--space-1);
    padding: 0 var(--space-5);
    color: var(--text);
    font-weight: 700;
    cursor: pointer;
  }
  .ghost {
    min-height: 48px;
    margin-top: var(--space-1);
    padding: 0 var(--space-4);
    border-radius: var(--radius-pill);
    background: transparent;
    color: var(--text-dim);
    font-weight: 600;
    cursor: pointer;
  }
  .hide {
    min-height: 52px;
    margin-top: var(--space-3);
    padding: 0 var(--space-5);
    color: var(--text);
    font-weight: 700;
    cursor: pointer;
  }
</style>
