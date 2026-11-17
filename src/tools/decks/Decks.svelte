<script lang="ts">
  import type { ToolContext } from '../../core/registry';
  import EmptyState from '../../core/ui/EmptyState.svelte';
  import PassThePhone from '../../core/ui/PassThePhone.svelte';
  import Sheet from '../../core/ui/Sheet.svelte';
  import { DECK_KINDS, type DeckKind } from './logic';
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
</script>

<div class="decks">
  <div class="stats">
    <div class="stat">
      <span class="num">{data.pool.length}</span>
      <span class="label">in the deck</span>
    </div>
    <div class="stat">
      <span class="num">{data.discard.length}</span>
      <span class="label">discarded</span>
    </div>
    <div class="stat">
      <span class="num">{data.hands.length}</span>
      <span class="label">hands</span>
    </div>
  </div>

  <div class="actions">
    <button type="button" class="primary" onclick={() => instance.deal()}>Deal {data.deal}</button>
    <button type="button" onclick={() => instance.draw(1)}>Draw 1</button>
    <button type="button" onclick={() => instance.toTable()}>Flip to table</button>
    <button type="button" onclick={() => instance.shuffle()}>Shuffle</button>
    <button type="button" onclick={() => instance.cut()}>Cut</button>
    <button type="button" onclick={() => instance.returnAll()}>Collect all</button>
  </div>

  {#if data.lastDraw.length}
    <p class="drawn" role="status">
      Drew {data.lastDraw.map((card) => card.label).join(', ')}
    </p>
  {/if}

  {#if data.table.length}
    <section class="block">
      <h2>On the table</h2>
      <ul class="cards">
        {#each data.table as card (card.id)}
          <li class="card">{card.label}</li>
        {/each}
      </ul>
    </section>
  {/if}

  {#if data.hands.length}
    <section class="block">
      <h2>Hands</h2>
      <ul class="hands">
        {#each data.hands as hand (hand.player)}
          <li>
            <div class="hand-head">
              <span class="player">{hand.player}</span>
              <span class="count">{hand.cards.length} card{hand.cards.length === 1 ? '' : 's'}</span>
            </div>
            {#if hand.cards.length}
              {#if data.hidden && !hand.open}
                <button type="button" class="peek" onclick={() => (peek = hand.player)}>
                  Show privately ({hand.cards.length} {back})
                </button>
              {:else}
                <ul class="cards">
                  {#each hand.cards as card (card.id)}
                    <li class="card">{card.label}</li>
                  {/each}
                </ul>
              {/if}
            {:else}
              <p class="dim small">No cards yet.</p>
            {/if}
            <div class="hand-actions">
              <button type="button" onclick={() => instance.discardHand(hand.player)} disabled={!hand.cards.length}>
                Discard
              </button>
            </div>
          </li>
        {/each}
      </ul>
    </section>
  {:else}
    <EmptyState title="No hands yet" body="Deal cards to the players, or draw to the table for a shared game." />
  {/if}

  {#if data.log.length}
    <section class="block">
      <h2>Recent</h2>
      <ol class="log">
        {#each data.log as line, index (index)}
          <li>{line}</li>
        {/each}
      </ol>
    </section>
  {/if}

  <div class="row">
    <button type="button" onclick={openSettings}>Deck settings</button>
    <button type="button" onclick={() => instance.reset()}>Reset deck</button>
  </div>
</div>

{#if peek}
  <PassThePhone
    name={peek}
    hint="Your hand is hidden until you tap."
    action="Show my hand"
    oncancel={() => (peek = null)}
    onnext={() => (peek = null)}
  >
    <ul class="cards big">
      {#each data.hands.find((hand) => hand.player === peek)?.cards ?? [] as card (card.id)}
        <li class="card">{card.label}</li>
      {/each}
    </ul>
  </PassThePhone>
{/if}

{#if settingsOpen}
  <Sheet title="Deck settings" onclose={() => (settingsOpen = false)}>
    <label class="field">
      <span>Deck</span>
      <select value={data.kind} onchange={(event) => instance.setKind((event.currentTarget as HTMLSelectElement).value as DeckKind)}>
        {#each DECK_KINDS as kind (kind)}
          <option value={kind}>{kind}</option>
        {/each}
      </select>
    </label>
    <div class="grid">
      <label class="field">
        <span>Decks</span>
        <input type="number" min="1" max="6" value={data.copies} onchange={(event) => instance.setCopies(Number((event.currentTarget as HTMLInputElement).value))} />
      </label>
      <label class="field">
        <span>Jokers</span>
        <input type="number" min="0" max="4" value={data.jokers} onchange={(event) => instance.setJokers(Number((event.currentTarget as HTMLInputElement).value))} />
      </label>
      <label class="field">
        <span>Cards per deal</span>
        <input type="number" min="0" max="30" value={data.deal} onchange={(event) => instance.setDeal(Number((event.currentTarget as HTMLInputElement).value))} />
      </label>
    </div>
    <label class="check">
      <input type="checkbox" checked={data.hidden} onchange={(event) => instance.setHidden((event.currentTarget as HTMLInputElement).checked)} />
      <span>Hide hands until each player taps to look</span>
    </label>
    {#if data.kind === 'custom'}
      <label class="field">
        <span>Custom cards (one per line)</span>
        <textarea rows="6" bind:value={customDraft} spellcheck="false"></textarea>
      </label>
      <button type="button" class="wide" onclick={() => instance.setCustom(customDraft)}>Save custom cards</button>
    {/if}
    <button type="button" class="wide primary" onclick={() => (settingsOpen = false)}>Done</button>
    <p class="dim small">Changing the deck or its size builds a fresh, shuffled deck. Hands are cleared.</p>
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
    background: var(--surface-2);
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
