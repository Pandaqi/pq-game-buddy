<script lang="ts">
  import { t } from '../../core/i18n.svelte';
  import type { ToolContext } from '../../core/registry';
  import type { ToolInstance } from '../../core/registry';

  interface DemoState {
    label: string;
    count: number;
  }

  let { ctx, instance }: { ctx: ToolContext; instance: ToolInstance<DemoState> } = $props();
  const data = $derived(instance.data);
</script>

<div class="demo">
  <p class="count" aria-live="polite">{data.count}</p>
  <button type="button" onclick={() => { ctx.undo.push(t('demo.tap')); data.count += 1; ctx.audio.play('click'); }}>
    {data.label}
  </button>
</div>

<style>
  .demo {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-5) var(--space-3);
  }
  .count {
    margin: 0;
    font-size: clamp(3rem, 20vw, 6rem);
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }
  button {
    min-width: 12rem;
    min-height: 64px;
    border-radius: var(--radius-lg);
    border: 0;
    --cutout-fill: var(--accent);
    color: var(--accent-text);
    font-size: var(--text-lg);
    font-weight: 700;
    cursor: pointer;
  }
</style>
