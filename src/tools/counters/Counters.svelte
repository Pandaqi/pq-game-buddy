<script lang="ts">
  import { t } from '../../core/i18n.svelte';
  import type { ToolContext } from '../../core/registry';
  import Sheet from '../../core/ui/Sheet.svelte';
  import { downStep, grandTotal, type CountersInstance } from './logic';

  let { ctx, instance }: { ctx: ToolContext; instance: CountersInstance } = $props();
  const data = $derived(instance.data);

  let adding = $state(false);
  let newName = $state('');
  let newStart = $state(0);

  const hiddenNow = $derived(data.hidden && !data.revealed);
  const total = $derived(grandTotal(data));

  function shown(value: number): string {
    return hiddenNow ? '•••' : String(value);
  }

  function addNow(): void {
    instance.addCounter(newName, newStart);
    newName = '';
    newStart = 0;
    adding = false;
  }
</script>

<div class="counters">
  {#if data.mode !== 'count'}
    <div class="bank">
      <div class="bank-head">
        <span>{t('counters.shared-bank')}</span>
        {#if !hiddenNow}<span class="all">{t('counters.all', { total })}</span>{/if}
      </div>
      <p class="big" aria-live="polite">{shown(data.bank)}</p>
      <div class="denoms">
        {#each data.denominations as value (value)}
          <button type="button" onclick={() => instance.tapDenomination(value)} aria-label={t('counters.add-to-bank', { value })}>+{value}</button>
        {/each}
      </div>
      <div class="bank-actions">
        <button type="button" onclick={() => instance.adjustBank(-data.step)} aria-label={t('counters.take-from-bank', { value: data.step })}>−{data.step}</button>
        <button type="button" onclick={() => instance.adjustBank(data.step)} aria-label={t('counters.add-to-bank', { value: data.step })}>+{data.step}</button>
      </div>
    </div>
  {/if}

  <ul class="list">
    {#each data.counters as counter (counter.id)}
      {@const back = data.mode === 'count' ? downStep(counter) : counter.step}
      <li>
        <span class="name">{counter.name}</span>
        <p class="value">{shown(counter.value)}</p>
        <div class="row-actions">
          <button type="button" onclick={() => instance.adjust(counter.id, -back)} aria-label={t('counters.take-from', { value: back, name: counter.name })}>−{back}</button>
          <button type="button" class="plus" onclick={() => instance.adjust(counter.id, counter.step)} aria-label={t('counters.add-to', { value: counter.step, name: counter.name })}>+{counter.step}</button>
          <button type="button" class="remove" onclick={() => instance.removeCounter(counter.id)} aria-label={t('counters.remove', { name: counter.name })}>✕</button>
        </div>
      </li>
    {/each}
  </ul>

  <div class="row">
    <button type="button" onclick={() => (adding = true)}>{t('counters.add-counter')}</button>
    {#if hiddenNow}
      <button type="button" class="reveal" onclick={() => instance.reveal()}>{t('counters.reveal')}</button>
    {:else}
      <button type="button" onclick={() => instance.setHidden(true)}>{t('counters.hide')}</button>
    {/if}
  </div>
  <button type="button" class="ghost" onclick={() => instance.reset()}>{t('counters.reset')}</button>

  {#if data.history.length}
    <details class="log">
      <summary>{t('counters.log', { count: data.history.length })}</summary>
      <ol>
        {#each data.history as entry, index (index)}
          <li>{entry.text}</li>
        {/each}
      </ol>
    </details>
  {/if}
</div>

{#if adding}
  <Sheet title={t('counters.add-counter')} onclose={() => (adding = false)}>
    <label class="field">
      <span>{t('counters.name')}</span>
      <input type="text" bind:value={newName} />
    </label>
    <label class="field">
      <span>{t('counters.start-value')}</span>
      <input type="number" min="0" bind:value={newStart} />
    </label>
    <button type="button" class="wide" onclick={addNow}>{t('counters.add')}</button>
  </Sheet>
{/if}

<style>
  .counters {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding: var(--space-3);
  }
  .bank {
    background: var(--surface);
    border-radius: var(--radius-lg);
    padding: var(--space-3);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  .bank-head {
    display: flex;
    justify-content: space-between;
    color: var(--text-dim);
    font-size: var(--text-sm);
    font-weight: 600;
  }
  .all {
    font-variant-numeric: tabular-nums;
  }
  .big {
    margin: 0;
    font-size: clamp(2.6rem, 16vw, 4rem);
    font-weight: 800;
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }
  .denoms {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }
  .denoms button {
    min-height: 44px;
    padding: 0 var(--space-3);
    border-radius: var(--radius-pill);
    background: var(--accent-soft);
    color: var(--text);
    font-weight: 700;
    cursor: pointer;
    font-variant-numeric: tabular-nums;
  }
  .bank-actions {
    display: flex;
    gap: var(--space-2);
  }
  .bank-actions button {
    flex: 1;
    min-height: 48px;
    border-radius: var(--radius);
    background: var(--surface-2);
    color: var(--text);
    font-size: var(--text-base);
    font-weight: 700;
    cursor: pointer;
  }
  .list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  .list li {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: var(--space-1) var(--space-2);
    align-items: center;
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius);
    background: var(--surface);
  }
  .name {
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .value {
    margin: 0;
    grid-column: 2;
    grid-row: 1;
    font-size: var(--text-xl);
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }
  .row-actions {
    grid-column: 1 / span 2;
    display: flex;
    gap: var(--space-2);
  }
  .row-actions button {
    min-width: 56px;
    min-height: 44px;
    border-radius: var(--radius);
    background: var(--surface-2);
    color: var(--text);
    font-size: var(--text-lg);
    font-weight: 700;
    cursor: pointer;
  }
  .row-actions button.plus {
    background: var(--accent-soft);
  }
  .row-actions button.remove {
    margin-left: auto;
    font-size: var(--text-sm);
    color: var(--text-dim);
    min-width: 44px;
  }


  .row button.reveal {
    background: var(--accent-soft);
    font-weight: 700;
  }

  .log summary {
    min-height: 44px;
    display: flex;
    align-items: center;
    cursor: pointer;
    color: var(--text-dim);
  }
  .log ol {
    margin: var(--space-1) 0 0;
    padding-left: var(--space-4);
    color: var(--text-dim);
    font-size: var(--text-sm);
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }



</style>
