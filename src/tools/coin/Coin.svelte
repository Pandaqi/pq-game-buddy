<script lang="ts">
  import { t } from '../../core/i18n.svelte';
  import type { ToolContext } from '../../core/registry';
  import type { CoinInstance } from './logic';

  let { ctx, instance }: { ctx: ToolContext; instance: CoinInstance } = $props();
  const data = $derived(instance.data);

  const headsCount = $derived(data.results.filter(Boolean).length);
  const tailsCount = $derived(data.results.length - headsCount);
</script>

<div class="coin">
  <div class="stage" aria-live="polite">
    {#if data.seriesWinner}
      <p class="big">
        {t('coin.series-won', { side: data.seriesWinner === 'heads' ? t('coin.heads') : t('coin.tails') })}
      </p>
      <p class="sub">
        {t('coin.best-of', {
          target: data.target,
          heads: data.series.heads,
          tails: data.series.tails,
        })}
      </p>
    {:else if data.results.length === 0}
      <p class="big">{t('coin.ready')}</p>
      <p class="sub">
        {data.coins === 1 ? t('coin.tap-one') : t('coin.tap-many', { count: data.coins })}
      </p>
    {:else if data.coins === 1}
      <p class="big">{data.results[0] ? t('coin.heads') : t('coin.tails')}</p>
      <p class="sub">{data.results[0] ? '♛' : '✦'}</p>
    {:else}
      <p class="big">{headsCount} / {tailsCount}</p>
      <p class="sub">
        {t('coin.tally-label')}{headsCount === data.results.length ? t('coin.all-heads') : ''}
      </p>
      <div class="coins">
        {#each data.results as heads, index (index)}
          <span class="mini" class:heads>{heads ? t('coin.initial-heads') : t('coin.initial-tails')}</span>
        {/each}
      </div>
    {/if}
  </div>

  <button type="button" class="flip band" onclick={() => instance.flip()}>
    {data.seriesWinner ? t('coin.flip-again') : t('coin.flip')}
  </button>

  <div class="modes" role="group" aria-label={t('coin.format')}>
    <button type="button" class:active={data.mode === 'single'} onclick={() => instance.setMode('single')}>{t('coin.single')}</button>
    <button type="button" class:active={data.mode === 'best'} onclick={() => instance.setMode('best')}>{t('coin.best')}</button>
  </div>

  {#if data.mode === 'best'}
    <div class="series">
      <span class="tally">
        {t('coin.tally', { heads: data.series.heads, tails: data.series.tails })}
      </span>
      <label class="field">
        <span>{t('coin.first-to')}</span>
        <input
          type="number"
          min="1"
          max="20"
          value={data.target}
          onchange={(event) => instance.setTarget(Number((event.currentTarget as HTMLInputElement).value))}
        />
      </label>
    </div>
  {/if}

  <div class="call">
    <span class="label">{t('coin.call')}</span>
    <div class="row">
      <button type="button" class:active={data.call === 'heads'} onclick={() => instance.setCall(data.call === 'heads' ? 'none' : 'heads')}>{t('coin.heads')}</button>
      <button type="button" class:active={data.call === 'tails'} onclick={() => instance.setCall(data.call === 'tails' ? 'none' : 'tails')}>{t('coin.tails')}</button>
    </div>
  </div>

  {#if data.call !== 'none'}
    <p class="tally">
      {t('coin.stats', {
        won: data.wins,
        lost: data.losses,
        streak: data.streak,
        best: data.bestStreak,
      })}
    </p>
  {/if}

  <div class="options">
    <label class="field">
      <span>{t('coin.coins')}</span>
      <input
        type="range"
        min="1"
        max="10"
        value={data.coins}
        oninput={(event) => instance.setCoins(Number((event.currentTarget as HTMLInputElement).value))}
      />
      <strong>{data.coins}</strong>
    </label>
    <label class="field">
      <span>{t('coin.heads-chance')}</span>
      <input
        type="range"
        min="0"
        max="100"
        step="5"
        value={data.fairness}
        oninput={(event) => instance.setFairness(Number((event.currentTarget as HTMLInputElement).value))}
      />
      <strong>{data.fairness}%</strong>
    </label>
  </div>
  {#if data.fairness !== 50}
    <p class="warn">{t('coin.weighted', { percent: data.fairness })}</p>
  {/if}

  <button type="button" class="ghost" onclick={() => instance.reset()}>{t('coin.reset')}</button>

  {#if data.history.length}
    <ol class="history">
      {#each data.history as item, index (index)}
        <li>
          <span>{item.heads}H · {item.tails}T</span>
          {#if item.call !== 'none'}
            <span class:won={item.won === true} class:lost={item.won === false}>
              {item.won === null ? t('coin.tie') : item.won ? t('coin.called-it') : t('coin.missed')}
            </span>
          {/if}
        </li>
      {/each}
    </ol>
  {/if}
</div>

<style>
  .coin {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding: var(--space-3);
  }

  .big {
    margin: 0;
    font-size: clamp(2.6rem, 16vw, 4.5rem);
    font-weight: 800;
    line-height: 1;
  }
  .sub {
    margin: var(--space-2) 0 0;
    color: var(--text-dim);
  }
  .coins {
    display: flex;
    justify-content: center;
    gap: var(--space-2);
    margin-top: var(--space-3);
    flex-wrap: wrap;
  }
  .mini {
    display: inline-grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border-radius: var(--radius-round);
    font-weight: 800;
  }
  .mini.heads {
    background: var(--accent-soft);
  }
  .flip {
    min-height: 72px;
    font-size: var(--text-xl);
    font-weight: 800;
    border: 0;
    --cutout-fill: var(--accent);
    color: var(--accent-text);
    cursor: pointer;
  }



  .series {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: var(--space-2);
  }
  .series .tally {
    font-variant-numeric: tabular-nums;
    font-weight: 600;
  }
  .series .field {
    width: 6rem;
  }
  .call .label {
    font-size: var(--text-sm);
    color: var(--text-dim);
    font-weight: 600;
  }


  .row button.active {
    --cutout-fill: var(--accent-soft);
  }
  .tally {
    margin: 0;
    color: var(--text-dim);
    font-variant-numeric: tabular-nums;
  }
  .options {
    display: grid;
    gap: var(--space-3);
    grid-template-columns: 1fr 1fr;
  }

  .field input[type='number'] {
    border: 0;
    min-height: 48px;
    background: var(--surface-2);
    color: var(--text);
    padding: 0 var(--space-2);
    font-size: var(--text-base);
  }
  .field strong {
    color: var(--text);
    font-variant-numeric: tabular-nums;
  }
  .warn {
    margin: 0;
    font-size: var(--text-sm);
    color: var(--warning);
  }


  .history li {
    display: flex;
    justify-content: space-between;
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius);
    background: var(--surface);
    font-variant-numeric: tabular-nums;
  }
  .won {
    color: var(--success);
    font-weight: 700;
  }
  .lost {
    color: var(--danger);
  }
</style>
