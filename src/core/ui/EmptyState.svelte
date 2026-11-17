<script lang="ts">
  import type { Snippet } from 'svelte';
  import { doodle } from './doodles';

  let { title, body, action }: { title: string; body: string; action?: Snippet } = $props();
</script>

<div class="empty">
  <span class="mark" aria-hidden="true">{@html doodle('star')}</span>
  <p class="title">{title}</p>
  <p class="body">{body}</p>
  {#if action}
    <div class="action">{@render action()}</div>
  {/if}
</div>

<style>
  .empty {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    align-items: flex-start;
    padding: var(--space-5);
    border-radius: var(--radius-card);
    background: var(--accent-soft);
    color: var(--text-dim);
  }
  .mark {
    display: inline-block;
    width: 34px;
    height: 34px;
    color: var(--accent);
  }
  .mark :global(svg) {
    width: 34px;
    height: 34px;
  }
  .title {
    margin: 0;
    font-family: var(--font-display);
    font-size: var(--text-xl);
    font-weight: 800;
    color: var(--text);
  }
  .body {
    margin: 0;
    max-width: 34rem;
  }
</style>
