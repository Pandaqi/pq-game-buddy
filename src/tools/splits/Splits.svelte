<script lang="ts">
  import { onMount } from 'svelte';
  import { isEditingTarget } from '../../core/dom';
  import { t } from '../../core/i18n.svelte';
  import type { ToolContext } from '../../core/registry';
  import EmptyState from '../../core/ui/EmptyState.svelte';
  import Sheet from '../../core/ui/Sheet.svelte';
  import { formatClock } from '../../core/template/schema';
  import { delta, sumOfBest, totalOf } from './logic';
  import type { SplitsInstance } from './tool.svelte';

  let { ctx, instance }: { ctx: ToolContext; instance: SplitsInstance } = $props();
  const data = $derived(instance.data);

  let now = $state(0);
  let settingsOpen = $state(false);
  let splitsDraft = $state('');

  $effect(() => ctx.clock.subscribe((value) => (now = value)));

  const total = $derived(instance.total(now || ctx.clock.now()));
  const best = $derived(totalOf(data.pb));
  const sumBest = $derived(sumOfBest(data));

  onMount(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (isEditingTarget(event.target)) return;
      if (event.code === 'Space') {
        event.preventDefault();
        if (data.running) instance.split();
        else instance.start();
      } else if (event.key.toLowerCase() === 'r') {
        instance.reset();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function openSettings(): void {
    splitsDraft = data.splits
      .map((split) => (split.target > 0 ? `${split.name} | ${(split.target / 1000).toFixed(2)}` : split.name))
      .join('\n');
    settingsOpen = true;
  }
</script>

<div class="splits">
  <header class="head">
    <h1>{data.game}{#if data.category}<span class="cat"> · {data.category}</span>{/if}</h1>
    <button type="button" onclick={openSettings} aria-label={t('splits.edit-aria')}>{t('splits.edit')}</button>
  </header>

  <p class="clock" aria-live="off">{formatClock(total, true)}</p>
  <p class="sub">
    {t('splits.attempt', { count: Math.max(1, data.attempts) })}{#if best}
      {t('splits.best', { time: formatClock(best) })}
      {t('splits.sum', { time: formatClock(sumBest) })}{/if}
  </p>

  {#if data.splits.length}
    <ol class="list">
      {#each data.splits as split, index (index)}
        <li class:done={index < data.run.length} class:current={index === data.run.length && data.running}>
          <span class="name">{split.name}</span>
          <span class="times">
            {#if split.target > 0}<span class="target">{formatClock(split.target)}</span>{/if}
            <span class="time">{data.run[index] !== undefined ? formatClock(data.run[index]) : '—'}</span>
            {#if data.run[index] !== undefined}
              {@const diff = delta(data.run[index], data.pb[index])}
              {#if diff !== null}
                <span class="delta" class:good={diff < 0} class:bad={diff > 0}>
                  {diff >= 0 ? '+' : '−'}{formatClock(Math.abs(diff), true)}
                </span>
              {/if}
            {/if}
          </span>
        </li>
      {/each}
    </ol>

    <div class="row">
      {#if !data.running}
        <button type="button" class="primary" onclick={() => (data.run.length ? instance.resume() : instance.start())}>
          {data.run.length ? t('splits.resume') : t('splits.start')}
        </button>
      {:else}
        <button type="button" class="primary" onclick={() => instance.split()}>{t('splits.split')}</button>
        <button type="button" onclick={() => instance.stop()}>{t('splits.pause')}</button>
      {/if}
      <button type="button" onclick={() => instance.reset()}>{t('splits.reset')}</button>
    </div>

    <div class="row small-row">
      <button type="button" onclick={() => instance.savePB()} disabled={!data.run.length}>{t('splits.save-best')}</button>
      <button type="button" onclick={() => instance.clearPB()} disabled={!data.pb.length}>{t('splits.clear-best')}</button>
      <button type="button" onclick={() => instance.resetAll()}>{t('splits.reset-attempts')}</button>
    </div>
    <p class="dim small">{t('splits.keys-hint')}</p>
  {:else}
    <EmptyState title={t('splits.empty-title')} body={t('splits.empty-body')}>
      {#snippet action()}
        <button type="button" onclick={openSettings}>{t('splits.add-splits')}</button>
      {/snippet}
    </EmptyState>
  {/if}
</div>

{#if settingsOpen}
  <Sheet title={t('splits.sheet')} onclose={() => (settingsOpen = false)}>
    <label class="field">
      <span>{t('splits.game')}</span>
      <input type="text" value={data.game} onchange={(event) => instance.setGame((event.currentTarget as HTMLInputElement).value)} />
    </label>
    <label class="field">
      <span>{t('splits.category')}</span>
      <input type="text" value={data.category} placeholder={t('splits.category-placeholder')} onchange={(event) => instance.setCategory((event.currentTarget as HTMLInputElement).value)} />
    </label>
    <label class="field">
      <span>{t('splits.splits-label')}</span>
      <textarea rows="8" bind:value={splitsDraft} spellcheck="false" placeholder="Forest&#10;Cave | 90"></textarea>
    </label>
    <button type="button" class="wide primary" onclick={() => { instance.setSplits(splitsDraft); settingsOpen = false; }}>{t('splits.save-splits')}</button>
    <p class="dim small">{t('splits.targets-hint')}</p>
  </Sheet>
{/if}

<style>
  .splits {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding: var(--space-3);
  }
  .head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-2);
  }
  h1 {
    margin: 0;
    font-size: var(--text-xl);
  }
  .cat {
    font-size: var(--text-base);
    color: var(--text-dim);
    font-weight: 400;
  }
  .head button {
    min-height: 44px;
    padding: 0 var(--space-3);
    border-radius: var(--radius);
    background: var(--surface);
    color: var(--text);
    cursor: pointer;
  }
  .clock {
    margin: 0;
    text-align: center;
    font-size: clamp(2.6rem, 18vw, 5rem);
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    line-height: 1;
    letter-spacing: -0.02em;
  }
  .sub {
    margin: 0;
    text-align: center;
    color: var(--text-dim);
    font-size: var(--text-sm);
  }
  .list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }
  .list li {
    display: flex;
    justify-content: space-between;
    gap: var(--space-2);
    min-height: 48px;
    align-items: center;
    padding: var(--space-1) var(--space-3);
    border-radius: var(--radius);
    background: var(--surface);
    font-variant-numeric: tabular-nums;
  }
  .list li.current {
    background: var(--accent-soft);
  }
  .list li.done {
    background: var(--surface-2);
  }
  .name {
    font-weight: 600;
  }
  .times {
    display: flex;
    gap: var(--space-2);
    align-items: baseline;
  }
  .target {
    color: var(--text-dim);
    font-size: var(--text-sm);
  }
  .time {
    font-weight: 800;
  }
  .delta.good {
    color: var(--success);
    font-weight: 700;
  }
  .delta.bad {
    color: var(--danger);
    font-weight: 700;
  }


  .row button.primary {
    background: var(--accent);
    color: var(--accent-text);
    font-weight: 800;
  }
  .row button:disabled {
    opacity: 0.55;
  }
  .small-row button {
    min-height: 44px;
    font-size: var(--text-sm);
    font-weight: 500;
  }

  .field input,
  .field textarea {
    border: 0;
    background: var(--surface-2);
    color: var(--text);
    padding: var(--space-2);
    font: inherit;
    min-height: 48px;
  }





</style>
