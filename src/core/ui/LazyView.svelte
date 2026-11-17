<script module lang="ts">
  /**
   * Wraps `import('./Page.svelte')` once per screen, so asking for the same page
   * again reuses the resolved component instead of re-running the module.
   */
  export function lazyView<T extends Record<string, unknown>>(
    loader: () => Promise<{ default: Component<T> }>,
  ): () => Promise<Component<T>> {
    let cached: Promise<Component<T>> | null = null;
    return () => {
      cached ??= loader().then((module) => module.default);
      return cached;
    };
  }
</script>

<script lang="ts">
  /**
   * Mounts a component that lives in its own chunk: the shell's secondary pages
   * use it, so it never downloads a screen it is not showing. The label only
   * appears when a chunk is genuinely slow to arrive.
   */
  import type { Component } from 'svelte';

  let {
    load,
    props = {},
    label,
  }: {
    load: () => Promise<Component<any>>;
    props?: Record<string, unknown>;
    label: string;
  } = $props();

  // Derived, not captured: switching tabs changes `load` without remounting.
  const view = $derived(load());
  let showPending = $state(false);

  $effect(() => {
    const current = view;
    showPending = false;
    const timer = setTimeout(() => {
      showPending = true;
    }, 150);
    const settle = (): void => clearTimeout(timer);
    void current.then(settle, settle);
    return settle;
  });
</script>

{#await view}
  {#if showPending}
    <p class="loading" role="status">Loading {label}…</p>
  {/if}
{:then View}
  <View {...props} />
{:catch error}
  <div class="failed" role="alert">
    <p>{label} did not load. Your saved game is unchanged.</p>
    <pre>{String(error)}</pre>
  </div>
{/await}

<style>
  .loading {
    margin: 0;
    padding: var(--space-4);
    color: var(--text-dim);
  }
  .failed {
    padding: var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  .failed p {
    margin: 0;
  }
  .failed pre {
    margin: 0;
    white-space: pre-wrap;
    font-size: var(--text-sm);
    color: var(--danger);
  }
</style>
