<script lang="ts">
  import type { ToolContext } from '../../core/registry';
  import EmptyState from '../../core/ui/EmptyState.svelte';
  import Sheet from '../../core/ui/Sheet.svelte';
  import { formatClock } from '../../core/template/schema';
  import { orderPreview, type DraftState } from './logic';
  import type { DraftInstance } from './tool.svelte';

  let { ctx, instance }: { ctx: ToolContext; instance: DraftInstance } = $props();
  const data = $derived(instance.data);

  let now = $state(Date.now());
  let settingsOpen = $state(false);
  let orderDraft = $state('');
  let poolDraft = $state('');
  let newItem = $state('');
  let bidStep = $state(5);
  let bidderDraft = $state('');

  $effect(() => {
    return ctx.clock.subscribe(() => {
      now = Date.now();
    });
  });

  const turn = $derived.by(() => {
    void data.picks.length;
    void data.snake;
    const preview = orderPreview(data.order, data.snake, data.picks.length + 1);
    return preview[preview.length - 1] ?? { pick: 1, picker: data.order[0] ?? '', round: 1 };
  });
  const preview = $derived(orderPreview(data.order, data.snake, Math.min(12, data.order.length * 2)));
  const remaining = $derived(data.deadline ? Math.max(0, data.deadline - now) : 0);
  const expired = $derived(!!data.deadline && remaining === 0);
  const myBudget = $derived(data.budgets[bidderDraft] ?? 0);

  function openSettings(): void {
    orderDraft = data.order.join('\n');
    poolDraft = data.pool.join('\n');
    settingsOpen = true;
  }

  function saveSettings(): void {
    ctx.undo.batch('draft settings', () => {
      instance.setOrder(orderDraft);
      instance.setPool(poolDraft);
    });
    settingsOpen = false;
  }
</script>

<div class="draft">
  {#if data.auction}
    <section class="panel">
      <h2>Auction</h2>
      {#if data.nomination}
        <p class="nomination">On the block: <strong>{data.nomination}</strong></p>
        <p class="bid" role="status">Bid: <strong>{data.bid}</strong>{#if data.bidder} by {data.bidder}{/if}</p>
        <div class="auction-controls">
          <label class="field">
            <span>Bidder</span>
            <select value={data.bidder} onchange={(event) => instance.setBidder((event.currentTarget as HTMLSelectElement).value)}>
              <option value="">Pick a player</option>
              {#each data.order as name (name)}
                <option value={name}>{name} ({data.budgets[name] ?? 0})</option>
              {/each}
            </select>
          </label>
          <label class="field">
            <span>Step</span>
            <input type="number" min="1" value={bidStep} onchange={(event) => (bidStep = Math.max(1, Number((event.currentTarget as HTMLInputElement).value)))} />
          </label>
        </div>
        <div class="row">
          <button type="button" onclick={() => instance.raise(bidStep)}>Raise {bidStep}</button>
          <button type="button" class="primary" onclick={() => instance.sell()}>Sold</button>
          <button type="button" onclick={() => instance.cancelNomination()}>Withdraw</button>
        </div>
      {:else}
        <p class="dim small">Nominate something from the pool. Bids are checked against the bidder's budget.</p>
      {/if}

      <table>
        <thead>
          <tr><th scope="col">Player</th><th scope="col">Left</th></tr>
        </thead>
        <tbody>
          {#each data.order as name (name)}
            <tr><th scope="row">{name}</th><td>{data.budgets[name] ?? 0}</td></tr>
          {/each}
        </tbody>
      </table>
      {#if data.sales.length}
        <ol class="log">
          {#each data.sales as sale, index (index)}
            <li>{sale.item} → {sale.buyer} for {sale.price}</li>
          {/each}
        </ol>
      {/if}
    </section>
  {:else}
    <section class="panel turn">
      {#if data.deadline}
        <p class="clock" class:pulse={expired} aria-live="polite">{formatClock(remaining, true)}</p>
      {/if}
      <p class="who">
        Round {turn.round} · <strong>{turn.picker || 'Nobody'}</strong> picks
      </p>
      {#if data.seconds > 0}
        <button type="button" class="clock-toggle" onclick={() => (data.deadline ? instance.stopTimer() : instance.startTimer())}>
          {data.deadline ? 'Stop the clock' : `Start ${formatClock(data.seconds)} clock`}
        </button>
      {/if}
    </section>

    <section class="panel">
      <header>
        <h2>Pool</h2>
        <span class="dim small">{data.pool.length} left</span>
      </header>
      {#if data.pool.length}
        <ul class="pool">
          {#each data.pool as item (item)}
            <li><button type="button" onclick={() => instance.pick(item)}>{item}</button></li>
          {/each}
        </ul>
      {:else}
        <EmptyState title="The pool is empty" body="Add cards, players or heroes to draft in the settings." />
      {/if}
      <div class="add">
        <label class="sr-only" for="draft-new">Add to the pool</label>
        <input id="draft-new" type="text" bind:value={newItem} placeholder="Add to the pool" />
        <button type="button" onclick={() => { instance.addPoolItem(newItem); newItem = ''; }}>Add</button>
      </div>
    </section>
  {/if}

  <section class="panel">
    <header>
      <h2>Order</h2>
      <span class="dim small">{data.snake ? 'snake' : 'linear'}</span>
    </header>
    <ol class="preview">
      {#each preview as item (item.pick)}
        <li class:next={item.pick === turn.pick && !data.auction}>
          <span class="pick">{item.pick}</span>
          <span class="name">{item.picker}</span>
        </li>
      {/each}
    </ol>
  </section>

  {#if data.picks.length}
    <section class="panel">
      <header>
        <h2>Picks</h2>
        <span class="dim small">{data.picks.length}</span>
      </header>
      <ol class="log">
        {#each data.picks as pick, index (index)}
          <li>
            <span>{pick.picker}: <strong>{pick.item}</strong></span>
            <button type="button" onclick={() => instance.removePick(index)} aria-label="Undo the pick of {pick.item}">↺</button>
          </li>
        {/each}
      </ol>
    </section>
  {/if}

  <div class="row">
    <button type="button" onclick={openSettings}>Settings</button>
    <button type="button" onclick={() => instance.randomizeOrder()}>Shuffle order</button>
    <button type="button" onclick={() => instance.reset()}>Reset</button>
  </div>

  {#if data.log.length}
    <ol class="log dim small">
      {#each data.log as line, index (index)}
        <li>{line}</li>
      {/each}
    </ol>
  {/if}
</div>

{#if settingsOpen}
  <Sheet title="Draft settings" onclose={() => (settingsOpen = false)}>
    <label class="field">
      <span>Order (one name per line)</span>
      <textarea rows="5" bind:value={orderDraft} spellcheck="false"></textarea>
    </label>
    <label class="field">
      <span>Pool (one item per line)</span>
      <textarea rows="6" bind:value={poolDraft} spellcheck="false"></textarea>
    </label>
    <label class="check">
      <input type="checkbox" checked={data.snake} onchange={(event) => instance.setSnake((event.currentTarget as HTMLInputElement).checked)} />
      <span>Snake order (the last picker goes first next round)</span>
    </label>
    <label class="check">
      <input type="checkbox" checked={data.auction} onchange={(event) => { ctx.undo.push('auction mode'); instance.data.auction = (event.currentTarget as HTMLInputElement).checked; }} />
      <span>Auction instead of a draft</span>
    </label>
    <label class="field">
      <span>Seconds per pick</span>
      <input
        type="number"
        min="0"
        max="600"
        value={Math.round(data.seconds / 1000)}
        onchange={(event) => instance.setSeconds(Number((event.currentTarget as HTMLInputElement).value) * 1000)}
      />
    </label>
    <label class="field">
      <span>Budget per player</span>
      <input
        type="number"
        min="1"
        value={data.budget}
        onchange={(event) => {
          const value = Math.max(1, Number((event.currentTarget as HTMLInputElement).value));
          ctx.undo.push('auction budget');
          instance.data.budget = value;
          instance.data.budgets = Object.fromEntries(instance.data.order.map((name) => [name, value]));
        }}
      />
    </label>
    <button type="button" class="wide primary" onclick={saveSettings}>Save settings</button>
    <p class="dim small">Saving a new order or pool clears the picks, because the turn sequence changed.</p>
    <p class="dim small">Budget left for {bidderDraft || 'nobody'}: {myBudget}</p>
  </Sheet>
{/if}

<style>
  .draft {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding: var(--space-3);
  }
  .panel {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: var(--space-3);
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    background: var(--surface);
  }
  .panel header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  h2 {
    margin: 0;
    font-size: var(--text-base);
  }
  .turn {
    align-items: center;
    text-align: center;
    background: var(--accent-soft);
    border-color: var(--accent);
  }
  .who {
    margin: 0;
    font-size: var(--text-lg);
  }
  .clock {
    margin: 0;
    font-size: clamp(2.5rem, 16vw, 4rem);
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    line-height: 1;
  }
  .clock.pulse {
    color: var(--danger);
  }
  .clock-toggle {
    min-height: 44px;
    padding: 0 var(--space-3);
    border-radius: 999px;
    border: 1px solid var(--line);
    background: var(--surface);
    color: var(--text);
    cursor: pointer;
  }
  .pool {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }
  .pool button {
    min-height: 52px;
    padding: 0 var(--space-3);
    border-radius: var(--radius);
    border: 1px solid var(--line);
    background: var(--surface-2);
    color: var(--text);
    font-weight: 600;
    cursor: pointer;
  }
  .pool button:hover {
    border-color: var(--accent);
  }
  .add {
    display: flex;
    gap: var(--space-2);
  }
  .add input {
    flex: 1;
    min-height: 48px;
    border-radius: var(--radius);
    border: 1px solid var(--line);
    background: var(--surface-2);
    color: var(--text);
    padding: 0 var(--space-3);
  }
  .add button {
    min-height: 48px;
    padding: 0 var(--space-4);
    border-radius: var(--radius);
    border: 1px solid var(--line);
    background: var(--surface);
    color: var(--text);
    cursor: pointer;
  }
  .preview {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    gap: var(--space-1);
    overflow-x: auto;
  }
  .preview li {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    min-width: 4.5rem;
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius);
    background: var(--surface-2);
    border: 1px solid var(--line);
  }
  .preview li.next {
    border-color: var(--accent);
    background: var(--accent-soft);
    font-weight: 700;
  }
  .pick {
    font-size: var(--text-xs);
    color: var(--text-dim);
    font-variant-numeric: tabular-nums;
  }
  .name {
    font-size: var(--text-sm);
    white-space: nowrap;
  }
  .log {
    margin: 0;
    padding-left: var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }
  .log li {
    display: flex;
    justify-content: space-between;
    gap: var(--space-2);
  }
  .log button {
    min-width: 40px;
    min-height: 40px;
    border-radius: var(--radius);
    border: 1px solid var(--line);
    background: transparent;
    color: var(--text-dim);
    cursor: pointer;
  }
  table {
    width: 100%;
    border-collapse: collapse;
  }
  th,
  td {
    text-align: left;
    padding: var(--space-1) var(--space-2);
    border-bottom: 1px solid var(--line);
    font-variant-numeric: tabular-nums;
  }
  td {
    text-align: right;
    font-weight: 700;
  }
  .nomination,
  .bid {
    margin: 0;
  }
  .bid {
    font-size: var(--text-lg);
  }
  .auction-controls {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: var(--space-2);
  }
  .row {
    display: flex;
    gap: var(--space-2);
    flex-wrap: wrap;
  }
  .row button {
    flex: 1;
    min-height: 48px;
    border-radius: var(--radius);
    border: 1px solid var(--line);
    background: var(--surface);
    color: var(--text);
    cursor: pointer;
  }
  .row .primary {
    border-color: var(--accent);
    background: var(--accent);
    color: var(--accent-text);
    font-weight: 700;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    color: var(--text-dim);
  }
  .field input,
  .field select,
  .field textarea {
    min-height: 48px;
    border-radius: var(--radius);
    border: 1px solid var(--line);
    background: var(--surface-2);
    color: var(--text);
    padding: 0 var(--space-2);
    font: inherit;
  }
  .field textarea {
    padding: var(--space-2);
    font-family: var(--font-mono);
    font-size: var(--text-sm);
  }
  .check {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-height: 48px;
  }
  .check input {
    width: 24px;
    height: 24px;
  }
  .wide {
    min-height: 52px;
    border-radius: var(--radius);
    border: 1px solid var(--line);
    background: var(--surface-2);
    color: var(--text);
    cursor: pointer;
  }
  .wide.primary {
    border-color: var(--accent);
    background: var(--accent);
    color: var(--accent-text);
    font-weight: 700;
  }
  .dim {
    color: var(--text-dim);
  }
  .small {
    font-size: var(--text-sm);
  }
</style>
