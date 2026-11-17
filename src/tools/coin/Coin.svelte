<script lang="ts">
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
      <p class="big">{data.seriesWinner === 'heads' ? 'Heads' : 'Tails'} wins</p>
      <p class="sub">Best of {data.target} · {data.series.heads}–{data.series.tails}</p>
    {:else if data.results.length === 0}
      <p class="big">Ready</p>
      <p class="sub">Tap flip to toss {data.coins === 1 ? 'the coin' : `${data.coins} coins`}.</p>
    {:else if data.coins === 1}
      <p class="big">{data.results[0] ? 'Heads' : 'Tails'}</p>
      <p class="sub">{data.results[0] ? '♛' : '✦'}</p>
    {:else}
      <p class="big">{headsCount} / {tailsCount}</p>
      <p class="sub">heads / tails{headsCount === data.results.length ? ' — all heads!' : ''}</p>
      <div class="coins">
        {#each data.results as heads, index (index)}
          <span class="mini" class:heads>{heads ? 'H' : 'T'}</span>
        {/each}
      </div>
    {/if}
  </div>

  <button type="button" class="flip" onclick={() => instance.flip()}>
    {data.seriesWinner ? 'Flip again' : 'Flip'}
  </button>

  <div class="modes" role="group" aria-label="Coin format">
    <button type="button" class:active={data.mode === 'single'} onclick={() => instance.setMode('single')}>Single toss</button>
    <button type="button" class:active={data.mode === 'best'} onclick={() => instance.setMode('best')}>Best of</button>
  </div>

  {#if data.mode === 'best'}
    <div class="series">
      <span class="tally">Heads {data.series.heads} · Tails {data.series.tails}</span>
      <label class="field">
        <span>First to</span>
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
    <span class="label">Call it</span>
    <div class="row">
      <button type="button" class:active={data.call === 'heads'} onclick={() => instance.setCall(data.call === 'heads' ? 'none' : 'heads')}>Heads</button>
      <button type="button" class:active={data.call === 'tails'} onclick={() => instance.setCall(data.call === 'tails' ? 'none' : 'tails')}>Tails</button>
    </div>
  </div>

  {#if data.call !== 'none'}
    <p class="tally">
      {data.wins} won · {data.losses} lost · streak {data.streak} (best {data.bestStreak})
    </p>
  {/if}

  <div class="options">
    <label class="field">
      <span>Coins</span>
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
      <span>Heads chance</span>
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
    <p class="warn">Weighted coin: {data.fairness}% heads, as configured.</p>
  {/if}

  <button type="button" class="ghost" onclick={() => instance.reset()}>Reset tallies</button>

  {#if data.history.length}
    <ol class="history">
      {#each data.history as item, index (index)}
        <li>
          <span>{item.heads}H · {item.tails}T</span>
          {#if item.call !== 'none'}
            <span class:won={item.won === true} class:lost={item.won === false}>
              {item.won === null ? 'tie' : item.won ? 'called it' : 'missed'}
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
  .stage {
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    padding: var(--space-5) var(--space-3);
    text-align: center;
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
    border-radius: 50%;
    border: 2px solid var(--line);
    font-weight: 800;
  }
  .mini.heads {
    background: var(--accent-soft);
    border-color: var(--accent);
  }
  .flip {
    min-height: 72px;
    font-size: var(--text-xl);
    font-weight: 800;
    border: 0;
    border-radius: var(--radius-lg);
    background: var(--accent);
    color: var(--accent-text);
    cursor: pointer;
  }
  .modes {
    display: flex;
    gap: var(--space-1);
    padding: var(--space-1);
    border-radius: var(--radius);
    background: var(--surface-2);
  }
  .modes button {
    flex: 1;
    min-height: 48px;
    border-radius: var(--radius-sm);
    border: 0;
    background: transparent;
    color: var(--text);
    cursor: pointer;
  }
  .modes button.active {
    background: var(--surface);
    font-weight: 700;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
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
  .row {
    display: flex;
    gap: var(--space-2);
    margin-top: var(--space-1);
  }
  .row button {
    flex: 1;
    min-height: 56px;
    border-radius: var(--radius);
    border: 2px solid var(--line);
    background: var(--surface);
    color: var(--text);
    font-size: var(--text-lg);
    cursor: pointer;
  }
  .row button.active {
    border-color: var(--accent);
    background: var(--accent-soft);
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
  .field {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    font-size: var(--text-sm);
    color: var(--text-dim);
  }
  .field input[type='number'] {
    min-height: 48px;
    border-radius: var(--radius);
    border: 1px solid var(--line);
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
  .ghost {
    min-height: 48px;
    border-radius: var(--radius);
    border: 1px solid var(--line);
    background: transparent;
    color: var(--text);
    cursor: pointer;
  }
  .history {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }
  .history li {
    display: flex;
    justify-content: space-between;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--line);
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
