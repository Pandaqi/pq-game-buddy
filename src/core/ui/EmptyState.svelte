<script lang="ts">
  import type { Snippet } from 'svelte';

  let { title, body, action }: { title: string; body: string; action?: Snippet } = $props();
</script>

<div class="empty">
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
    padding: var(--space-4);
    border: 1px dashed var(--line);
    border-radius: var(--radius-lg);
    color: var(--text-dim);
  }
  .title {
    margin: 0;
    font-weight: 700;
    color: var(--text);
  }
  .body {
    margin: 0;
  }
</style>
