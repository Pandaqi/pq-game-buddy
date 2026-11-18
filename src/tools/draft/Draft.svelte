<script lang="ts">
  import { seatName, t } from '../../core/i18n.svelte';
  import type { ToolContext } from '../../core/registry';
  import { seatKey } from '../../core/session';
  import EmptyState from '../../core/ui/EmptyState.svelte';
  import Sheet from '../../core/ui/Sheet.svelte';
  import { formatClock } from '../../core/template/schema';
  import { nameOfKey, orderPreview, type DraftState } from './logic';
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
    return preview[preview.length - 1] ?? { pick: 1, picker: data.order[0] ?? null, round: 1 };
  });
  const preview = $derived(orderPreview(data.order, data.snake, Math.min(12, data.order.length * 2)));
  const remaining = $derived(data.deadline ? Math.max(0, data.deadline - now) : 0);
  const expired = $derived(!!data.deadline && remaining === 0);
  const myBudget = $derived(data.budgets[bidderDraft] ?? 0);

  function openSettings(): void {
    orderDraft = data.order.map((seat) => seatName(seat.seat, seat.name)).join('\n');
    poolDraft = data.pool.join('\n');
    settingsOpen = true;
  }

  function saveSettings(): void {
    ctx.undo.batch(t('draft.undo-settings'), () => {
      instance.setOrder(orderDraft);
      instance.setPool(poolDraft);
    });
    settingsOpen = false;
  }
</script>

<div class="draft">
  {#if data.auction}
    <section class="panel">
      <h2>{t('draft.auction')}</h2>
      {#if data.nomination}
        <p class="nomination">{t('draft.on-block')} <strong>{data.nomination}</strong></p>
        <p class="bid" role="status">{t('draft.bid')} <strong>{data.bid}</strong>{#if data.bidder}
            {t('draft.by', { name: nameOfKey(data, data.bidder) })}{/if}</p>
        <div class="auction-controls">
          <label class="field">
            <span>{t('draft.bidder')}</span>
            <select value={data.bidder} onchange={(event) => instance.setBidder((event.currentTarget as HTMLSelectElement).value)}>
              <option value="">{t('draft.pick-player')}</option>
              {#each data.order as seat (seatKey(seat))}
                <option value={seatKey(seat)}>{seatName(seat.seat, seat.name)} ({data.budgets[seatKey(seat)] ?? 0})</option>
              {/each}
            </select>
          </label>
          <label class="field">
            <span>{t('draft.step')}</span>
            <input type="number" min="1" value={bidStep} onchange={(event) => (bidStep = Math.max(1, Number((event.currentTarget as HTMLInputElement).value)))} />
          </label>
        </div>
        <div class="row">
          <button type="button" onclick={() => instance.raise(bidStep)}>{t('draft.raise', { step: bidStep })}</button>
          <button type="button" class="primary" onclick={() => instance.sell()}>{t('draft.sold')}</button>
          <button type="button" onclick={() => instance.cancelNomination()}>{t('draft.withdraw')}</button>
        </div>
      {:else}
        <p class="dim small">{t('draft.nominate-hint')}</p>
      {/if}

      <table>
        <thead>
          <tr><th scope="col">{t('draft.player')}</th><th scope="col">{t('draft.left')}</th></tr>
        </thead>
        <tbody>
          {#each data.order as seat (seatKey(seat))}
            <tr><th scope="row">{seatName(seat.seat, seat.name)}</th><td>{data.budgets[seatKey(seat)] ?? 0}</td></tr>
          {/each}
        </tbody>
      </table>
      {#if data.sales.length}
        <ol class="log">
          {#each data.sales as sale, index (index)}
            <li>{t('draft.sale-line', { item: sale.item, buyer: nameOfKey(data, sale.buyer), price: sale.price })}</li>
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
        {t('draft.round-label', { round: turn.round })} ·
        <strong>{turn.picker ? seatName(turn.picker.seat, turn.picker.name) : t('draft.nobody')}</strong> {t('draft.picks-verb')}
      </p>
      {#if data.seconds > 0}
        <button type="button" class="clock-toggle" onclick={() => (data.deadline ? instance.stopTimer() : instance.startTimer())}>
          {data.deadline
            ? t('draft.stop-clock')
            : t('draft.start-clock', { time: formatClock(data.seconds) })}
        </button>
      {/if}
    </section>

    <section class="panel">
      <header>
        <h2>{t('draft.pool')}</h2>
        <span class="dim small">{t('draft.pool-left', { count: data.pool.length })}</span>
      </header>
      {#if data.pool.length}
        <ul class="pool">
          {#each data.pool as item (item)}
            <li><button type="button" onclick={() => instance.pick(item)}>{item}</button></li>
          {/each}
        </ul>
      {:else}
        <EmptyState title={t('draft.pool-empty')} body={t('draft.pool-empty-body')} />
      {/if}
      <div class="add">
        <label class="sr-only" for="draft-new">{t('draft.add-to-pool')}</label>
        <input id="draft-new" type="text" bind:value={newItem} placeholder={t('draft.add-to-pool')} />
        <button type="button" onclick={() => { instance.addPoolItem(newItem); newItem = ''; }}>{t('draft.add')}</button>
      </div>
    </section>
  {/if}

  <section class="panel">
    <header>
      <h2>{t('draft.order')}</h2>
      <span class="dim small">{data.snake ? t('draft.snake') : t('draft.linear')}</span>
    </header>
    <ol class="preview">
      {#each preview as item (item.pick)}
        <li class:next={item.pick === turn.pick && !data.auction}>
          <span class="pick">{item.pick}</span>
          <span class="name">{item.picker ? seatName(item.picker.seat, item.picker.name) : '—'}</span>
        </li>
      {/each}
    </ol>
  </section>

  {#if data.picks.length}
    <section class="panel">
      <header>
        <h2>{t('draft.picks')}</h2>
        <span class="dim small">{data.picks.length}</span>
      </header>
      <ol class="log">
        {#each data.picks as pick, index (index)}
          <li>
            <span>{nameOfKey(data, pick.picker)}: <strong>{pick.item}</strong></span>
            <button type="button" onclick={() => instance.removePick(index)} aria-label={t('draft.undo-pick', { item: pick.item })}>↺</button>
          </li>
        {/each}
      </ol>
    </section>
  {/if}

  <div class="row">
    <button type="button" onclick={openSettings}>{t('draft.settings')}</button>
    <button type="button" onclick={() => instance.randomizeOrder()}>{t('draft.shuffle')}</button>
    <button type="button" onclick={() => instance.reset()}>{t('draft.reset')}</button>
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
  <Sheet title={t('draft.settings-title')} onclose={() => (settingsOpen = false)}>
    <label class="field">
      <span>{t('draft.order-label')}</span>
      <textarea rows="5" bind:value={orderDraft} spellcheck="false"></textarea>
    </label>
    <label class="field">
      <span>{t('draft.pool-label')}</span>
      <textarea rows="6" bind:value={poolDraft} spellcheck="false"></textarea>
    </label>
    <label class="check">
      <input type="checkbox" checked={data.snake} onchange={(event) => instance.setSnake((event.currentTarget as HTMLInputElement).checked)} />
      <span>{t('draft.snake-check')}</span>
    </label>
    <label class="check">
      <input type="checkbox" checked={data.auction} onchange={(event) => {           ctx.undo.push(t('draft.undo-auction')); instance.data.auction = (event.currentTarget as HTMLInputElement).checked; }} />
      <span>{t('draft.auction-check')}</span>
    </label>
    <label class="field">
      <span>{t('draft.seconds-label')}</span>
      <input
        type="number"
        min="0"
        max="600"
        value={Math.round(data.seconds / 1000)}
        onchange={(event) => instance.setSeconds(Number((event.currentTarget as HTMLInputElement).value) * 1000)}
      />
    </label>
    <label class="field">
      <span>{t('draft.budget-label')}</span>
      <input
        type="number"
        min="1"
        value={data.budget}
        onchange={(event) => {
          const value = Math.max(1, Number((event.currentTarget as HTMLInputElement).value));
          ctx.undo.push(t('draft.undo-budget'));
          instance.data.budget = value;
          instance.data.budgets = Object.fromEntries(instance.data.order.map((seat) => [seatKey(seat), value]));
        }}
      />
    </label>
    <button type="button" class="wide primary" onclick={saveSettings}>{t('draft.save')}</button>
    <p class="dim small">{t('draft.save-hint')}</p>
    <p class="dim small">{t('draft.budget-left', {
          name: bidderDraft || t('draft.nobody').toLowerCase(),
          amount: myBudget,
        })}</p>
  </Sheet>
{/if}

<style>
  .draft {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding: var(--space-3);
  }


  h2 {
    margin: 0;
    font-size: var(--text-base);
  }
  .turn {
    align-items: center;
    text-align: center;
    background: var(--accent-soft);
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
    border-radius: var(--radius-pill);
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
    color: var(--text);
    font-weight: 600;
    cursor: pointer;
  }
  .add {
    display: flex;
    gap: var(--space-2);
  }
  .add input {
    border: 0;
    flex: 1;
    min-height: 48px;
    background: var(--surface-2);
    color: var(--text);
    padding: 0 var(--space-3);
  }
  .add button {
    min-height: 48px;
    padding: 0 var(--space-4);
    border-radius: var(--radius);
    color: var(--text);
    cursor: pointer;
  }
  .preview {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
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
  }
  .preview li.next {
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
    background: transparent;
    color: var(--text-dim);
    cursor: pointer;
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












</style>
