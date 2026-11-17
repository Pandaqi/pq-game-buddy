<script lang="ts">
  import { onMount, mount, unmount } from 'svelte';
  import { audio } from '../core/audio';
  import { haptics } from '../core/haptics';
  import { t } from '../core/i18n.svelte';
  import { manifest } from '../core/manifest.generated';
  import type { ToolContext } from '../core/registry';
  import { loadTool } from '../core/tools.generated';
  import { createRng } from '../core/rng';
  import { makePlayers } from '../core/session';
  import { clock } from '../core/ticker';
  import { defaultsFor } from '../core/template/schema';

  interface Result {
    id: string;
    ok: boolean;
    error: string;
  }

  let results = $state<Result[]>([]);
  let networkAttempts = $state(0);
  let ran = $state(false);

  function makeContext(): ToolContext {
    return {
      instanceId: 'selftest',
      session: {
        players: () => makePlayers(['Ada', 'Bo']),
        instance: () => undefined,
        setActivePlayer: () => undefined,
        addPlayer: () => undefined,
        removePlayer: () => undefined,
        renamePlayer: () => undefined,
      },
      clock,
      rng: createRng('SELFTEST'),
      audio,
      haptics,
      undo: {
        push: () => undefined,
        batch: (_label, run) => run(),
        undo: () => false,
        canUndo: () => false,
        label: () => null,
        size: () => 0,
        clear: () => undefined,
      },
      toast: () => undefined,
      t,
    };
  }

  async function run(): Promise<void> {
    results = [];
    const host = document.getElementById('selftest-host');
    for (const meta of manifest) {
      const ctx = makeContext();
      const module = await loadTool(meta.id).catch(() => null);
      if (!module) {
        results = [...results, { id: meta.id, ok: false, error: 'load: this build has no code for it' }];
        continue;
      }
      let instance;
      try {
        instance = module.create(ctx, defaultsFor(module.preset));
      } catch (error) {
        results = [...results, { id: module.id, ok: false, error: `create: ${String(error)}` }];
        continue;
      }
      try {
        const view = module.component;
        const component = mount(view as never, {
          target: host as HTMLElement,
          props: { ctx, instance } as never,
        });
        await new Promise((resolve) => setTimeout(resolve, 0));
        unmount(component as never);
        results = [...results, { id: module.id, ok: true, error: '' }];
      } catch (error) {
        results = [...results, { id: module.id, ok: false, error: `mount: ${String(error)}` }];
      }
    }
    ran = true;
  }

  onMount(() => {
    const originalFetch = window.fetch;
    const originalOpen = XMLHttpRequest.prototype.open;
    window.fetch = ((...args: Parameters<typeof fetch>) => {
      networkAttempts += 1;
      console.error('[selftest] network request attempted', args[0]);
      return Promise.reject(new Error('network is disabled'));
    }) as typeof fetch;
    XMLHttpRequest.prototype.open = function patched(this: XMLHttpRequest) {
      networkAttempts += 1;
      return originalOpen.apply(this, arguments as never);
    };
    void run();
    return () => {
      window.fetch = originalFetch;
      XMLHttpRequest.prototype.open = originalOpen;
    };
  });
</script>

<div class="selftest">
  <h1>{t('selftest.title')}</h1>
  <p class="dim">{t('selftest.hint')}</p>

  <ul class="results">
    {#each results as item (item.id)}
      <li class:bad={!item.ok}>
        <span class="id">{item.id}</span>
        <span>{item.ok ? t('selftest.ok') : item.error}</span>
      </li>
    {/each}
    {#if !ran}
      <li><span class="id">…</span><span>{t('selftest.running')}</span></li>
    {/if}
  </ul>

  <p class="net" class:bad={networkAttempts > 0}>
    {t('selftest.network', { count: networkAttempts })}
    {networkAttempts === 0 ? t('selftest.network-fine') : t('selftest.network-bug')}
  </p>

  <button type="button" onclick={() => run()}>{t('selftest.again')}</button>
  <div id="selftest-host" class="host" aria-hidden="true"></div>
</div>

<style>
  .selftest {
    max-width: 34rem;
    margin: 0 auto;
    padding: var(--space-4) var(--space-3) var(--space-6);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }
  h1 {
    font-size: var(--text-2xl);
    margin: 0;
  }
  .dim {
    color: var(--text-dim);
    margin: 0;
  }
  .results {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }
  .results li {
    display: flex;
    gap: var(--space-2);
    padding: var(--space-2);
    border-radius: var(--radius);
    background: var(--surface);
    font-size: var(--text-sm);
  }
  .results li.bad {
    border-color: var(--danger);
    color: var(--danger);
  }
  .id {
    font-family: var(--font-mono);
    font-weight: 700;
    min-width: 5rem;
  }
  .net {
    margin: 0;
    font-weight: 600;
  }
  .net.bad {
    color: var(--danger);
  }
  button {
    min-height: 48px;
    border-radius: var(--radius);
    background: var(--surface);
    color: var(--text);
    cursor: pointer;
  }
  .host {
    position: absolute;
    left: -9999px;
    top: 0;
  }
</style>
