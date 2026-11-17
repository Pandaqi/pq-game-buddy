<script lang="ts">
  import { onMount } from 'svelte';
  import { createDisplayChannel } from '../core/display';
  import { t } from '../core/i18n.svelte';
  import { store } from '../core/session-store.svelte';

  let { instanceId }: { instanceId: string } = $props();

  let ready = $state(false);
  let broken = $state('');

  const entry = $derived.by(() => {
    void store.version;
    return store.entries.find((item) => item.id === instanceId) ?? null;
  });

  onMount(() => {
    if (!store.session) void store.loadLatest();
    ready = true;
    const channel = createDisplayChannel((message) => {
      const target = store.entries.find((item) => item.id === message.instanceId);
      if (!target) return;
      try {
        target.instance.load(message.state);
        store.bump();
      } catch (error) {
        broken = String(error);
      }
    });
    return () => channel.close();
  });
</script>

<div class="display">
  {#if entry}
    {@const Tool = entry.module.component}
    <header class="bar no-print">
      <span class="title">{entry.label}</span>
      <a href="#/play">{t('display.back')}</a>
    </header>
    <div class="stage">
      <svelte:boundary>
        <Tool ctx={entry.ctx} instance={entry.instance} />
        {#snippet failed(error)}
          <p class="error" role="alert">{t('display.broke', { error: String(error) })}</p>
        {/snippet}
      </svelte:boundary>
    </div>
  {:else if ready}
    <div class="empty">
      <h1>{t('display.empty-title')}</h1>
      <p>{t('display.empty-hint')}</p>
      <a class="link" href="#/">{t('app.home')}</a>
    </div>
  {:else}
    <p class="empty">{t('display.loading')}</p>
  {/if}
  {#if broken}<p class="error no-print">{broken}</p>{/if}
</div>

<style>
  .display {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background: var(--bg);
  }
  .bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-1) var(--space-3);
    border-bottom: 1px solid var(--line);
    font-size: var(--text-sm);
    color: var(--text-dim);
  }
  .bar a {
    min-height: 40px;
    display: inline-flex;
    align-items: center;
    color: var(--text-dim);
  }
  .stage {
    flex: 1;
    font-size: 1.15em;
  }
  .stage :global(.num),
  .stage :global(.clock),
  .stage :global(.total) {
    font-size: 1.2em;
  }
  .empty {
    margin: auto;
    padding: var(--space-6) var(--space-4);
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    align-items: center;
  }
  h1 {
    font-size: var(--text-2xl);
    margin: 0;
  }
  .link {
    min-height: 52px;
    display: inline-flex;
    align-items: center;
    padding: 0 var(--space-4);
    border-radius: var(--radius);
    color: var(--text);
    text-decoration: none;
  }
  .error {
    color: var(--danger);
    padding: var(--space-2) var(--space-3);
  }
</style>
