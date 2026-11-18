<script lang="ts">
  import { seatName, t } from '../../core/i18n.svelte';
  import type { ToolContext } from '../../core/registry';
  import EmptyState from '../../core/ui/EmptyState.svelte';
  import PassThePhone from '../../core/ui/PassThePhone.svelte';
  import Sheet from '../../core/ui/Sheet.svelte';
  import { DECK_KINDS, handKey, type DeckKind } from './logic';
  import type { DecksInstance } from './tool.svelte';

  let { ctx, instance }: { ctx: ToolContext; instance: DecksInstance } = $props();
  const data = $derived(instance.data);

  let peek = $state<string | null>(null);
  let settingsOpen = $state(false);
  let customDraft = $state('');

  function openSettings(): void {
    customDraft = data.custom.join('\n');
    settingsOpen = true;
  }

  const back = '🂠';
  /** The hand whose cards the pass-the-phone sheet is covering, if any. */
  const peekHand = $derived(peek ? data.hands.find((hand) => handKey(hand) === peek) ?? null : null);
</script>

<div class="decks">
  <div class="stats">
    <div class="stat">
      <span class="num">{data.pool.length}</span>
      <span class="label">{t('decks.in-deck')}</span>
    </div>
    <div class="stat">
      <span class="num">{data.discard.length}</span>
      <span class="label">{t('decks.discarded')}</span>
    </div>
    <div class="stat">
      <span class="num">{data.hands.length}</span>
      <span class="label">{t('decks.hands')}</span>
    </div>
  </div>

  <div class="actions">
    <button type="button" class="primary band" onclick={() => instance.deal()}>{t('decks.deal', { count: data.deal })}</button>
    <button type="button" onclick={() => instance.draw(1)}>{t('decks.draw-one')}</button>
    <button type="button" onclick={() => instance.toTable()}>{t('decks.flip')}</button>
    <button type="button" onclick={() => instance.shuffle()}>{t('decks.shuffle')}</button>
    <button type="button" onclick={() => instance.cut()}>{t('decks.cut')}</button>
    <button type="button" onclick={() => instance.returnAll()}>{t('decks.collect')}</button>
  </div>

  {#if data.lastDraw.length}
    <p class="drawn" role="status">
      {t('decks.drew', { cards: data.lastDraw.map((card) => card.label).join(', ') })}
    </p>
  {/if}

  {#if data.table.length}
    <section class="block">
      <h2>{t('decks.table')}</h2>
      <ul class="cards">
        {#each data.table as card (card.id)}
          <li class="card">{card.label}</li>
        {/each}
      </ul>
    </section>
  {/if}

  {#if data.hands.length}
    <section class="block">
      <h2>{t('decks.hands-title')}</h2>
      <ul class="hands">
        {#each data.hands as hand (handKey(hand))}
          <li>
            <div class="hand-head">
              <span class="player">{seatName(hand.seat, hand.name)}</span>
              <span class="count">{t(hand.cards.length === 1 ? 'decks.card-one' : 'decks.card-many', {
                  count: hand.cards.length,
                })}</span>
            </div>
            {#if hand.cards.length}
              {#if data.hidden && !hand.open}
                <button type="button" class="peek" onclick={() => (peek = handKey(hand))}>
                  {t('decks.show-privately', { count: hand.cards.length, back })}
                </button>
              {:else}
                <ul class="cards">
                  {#each hand.cards as card (card.id)}
                    <li class="card">{card.label}</li>
                  {/each}
                </ul>
              {/if}
            {:else}
              <p class="dim small">{t('decks.no-cards')}</p>
            {/if}
            <div class="hand-actions">
              <button type="button" onclick={() => instance.discardHand(handKey(hand))} disabled={!hand.cards.length}>
                {t('decks.discard')}
              </button>
            </div>
          </li>
        {/each}
      </ul>
    </section>
  {:else}
    <EmptyState title={t('decks.no-hands')} body={t('decks.no-hands-body')} />
  {/if}

  {#if data.log.length}
    <section class="block">
      <h2>{t('decks.recent')}</h2>
      <ol class="log">
        {#each data.log as line, index (index)}
          <li>{line}</li>
        {/each}
      </ol>
    </section>
  {/if}

  <div class="row">
    <button type="button" onclick={openSettings}>{t('decks.settings')}</button>
    <button type="button" onclick={() => instance.reset()}>{t('decks.reset')}</button>
  </div>
</div>

{#if peekHand}
  <PassThePhone
    name={seatName(peekHand.seat, peekHand.name)}
    hint={t('decks.peek-hint')}
    action={t('decks.show-hand')}
    oncancel={() => (peek = null)}
    onnext={() => (peek = null)}
  >
    <ul class="cards big">
      {#each peekHand.cards as card (card.id)}
        <li class="card">{card.label}</li>
      {/each}
    </ul>
  </PassThePhone>
{/if}

{#if settingsOpen}
  <Sheet title={t('decks.settings')} onclose={() => (settingsOpen = false)}>
    <label class="field">
      <span>{t('decks.deck')}</span>
      <select value={data.kind} onchange={(event) => instance.setKind((event.currentTarget as HTMLSelectElement).value as DeckKind)}>
        {#each DECK_KINDS as kind (kind)}
          <option value={kind}>{t(`decks.kind-${kind}`, undefined, kind)}</option>
        {/each}
      </select>
    </label>
    <div class="grid">
      <label class="field">
        <span>{t('decks.decks')}</span>
        <input type="number" min="1" max="6" value={data.copies} onchange={(event) => instance.setCopies(Number((event.currentTarget as HTMLInputElement).value))} />
      </label>
      <label class="field">
        <span>{t('decks.jokers')}</span>
        <input type="number" min="0" max="4" value={data.jokers} onchange={(event) => instance.setJokers(Number((event.currentTarget as HTMLInputElement).value))} />
      </label>
      <label class="field">
        <span>{t('decks.cards-per-deal')}</span>
        <input type="number" min="0" max="30" value={data.deal} onchange={(event) => instance.setDeal(Number((event.currentTarget as HTMLInputElement).value))} />
      </label>
    </div>
    <label class="check">
      <input type="checkbox" checked={data.hidden} onchange={(event) => instance.setHidden((event.currentTarget as HTMLInputElement).checked)} />
      <span>{t('decks.hide-hands')}</span>
    </label>
    {#if data.kind === 'custom'}
      <label class="field">
        <span>{t('decks.custom-cards')}</span>
        <textarea rows="6" bind:value={customDraft} spellcheck="false"></textarea>
      </label>
      <button type="button" class="wide" onclick={() => instance.setCustom(customDraft)}>{t('decks.save-custom')}</button>
    {/if}
    <button type="button" class="wide primary" onclick={() => (settingsOpen = false)}>{t('decks.done')}</button>
    <p class="dim small">{t('decks.hint')}</p>
  </Sheet>
{/if}

<style>
  .decks {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding: var(--space-3);
  }
  .stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-2);
  }
  .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--space-2);
    border-radius: var(--radius);
    background: var(--surface-2);
  }
  .num {
    font-size: var(--text-xl);
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }
  .label {
    font-size: var(--text-xs);
    color: var(--text-dim);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-2);
  }
  .actions button {
    min-height: 52px;
    border-radius: var(--radius);
    color: var(--text);
    font-weight: 600;
    cursor: pointer;
  }
  .actions .primary {
    grid-column: 1 / -1;
    min-height: 64px;
    border: 0;
    background: var(--accent);
    color: var(--accent-text);
    font-size: var(--text-lg);
    font-weight: 800;
  }
  .drawn {
    margin: 0;
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius);
    background: var(--accent-soft);
    font-weight: 600;
  }

  h2 {
    margin: 0;
    font-size: var(--text-base);
  }
  .cards {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
  }
  .card {
    display: inline-grid;
    place-items: center;
    min-width: 44px;
    min-height: 58px;
    padding: 0 var(--space-2);
    border-radius: var(--radius-sm);
    background: var(--surface-2);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .cards.big .card {
    min-width: 64px;
    min-height: 84px;
    font-size: var(--text-xl);
  }
  .hands {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  .hands > li {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    padding-bottom: var(--space-2);
    border-bottom: 1px solid var(--line);
  }
  .hands > li:last-child {
    border-bottom: 0;
    padding-bottom: 0;
  }
  .hand-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  .player {
    font-weight: 700;
  }
  .count {
    color: var(--text-dim);
    font-size: var(--text-sm);
  }
  .peek {
    min-height: 48px;
    border-radius: var(--radius);
    background: var(--accent-soft);
    color: var(--text);
    cursor: pointer;
  }
  .hand-actions button {
    min-height: 40px;
    padding: 0 var(--space-3);
    border-radius: var(--radius);
    background: transparent;
    color: var(--text-dim);
    cursor: pointer;
  }
  .hand-actions button:disabled {
    opacity: 0.6;
  }
  .log {
    margin: 0;
    padding-left: var(--space-4);
    color: var(--text-dim);
    font-size: var(--text-sm);
  }



  .field select,
  .field input,
  .field textarea {
    border: 0;
    min-height: 48px;
    background: var(--surface-2);
    color: var(--text);
    padding: 0 var(--space-2);
    font: inherit;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
    gap: var(--space-2);
  }






</style>
