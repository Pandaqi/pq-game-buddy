import { registerToolStrings, seatName, t as translate } from '../../core/i18n.svelte';
import type { ToolContext, ToolInstance } from '../../core/registry';
import type { PresetValues } from '../../core/template/schema';
import { toolSeats } from '../../core/session';
import {
  deckCards,
  handFor,
  handKey,
  shuffled,
  summaryOf,
  take,
  type Card,
  type DeckKind,
  type DeckState,
  type Hand,
} from './logic';
import Decks from './Decks.svelte';
import meta from './meta';
import preset from './preset';
import en from './locales/en';

// A tool's words travel with its chunk; the shell only knows its title.
registerToolStrings('decks', en);

export interface DeckActions {
  shuffle(): void;
  cut(): void;
  draw(count?: number): void;
  deal(): void;
  toTable(): void;
  discardHand(key: string): void;
  returnAll(): void;
  revealHand(key: string): void;
  hideHand(key: string): void;
  setKind(kind: DeckKind): void;
  setCopies(count: number): void;
  setJokers(count: number): void;
  setDeal(count: number): void;
  setHidden(value: boolean): void;
  setCustom(text: string): void;
  reset(): void;
}

export type DecksInstance = ToolInstance<DeckState> & DeckActions;

function create(ctx: ToolContext, values: PresetValues = {}): DecksInstance {
  const kind = (values.deck as DeckKind) ?? 'standard';
  const copies = Math.max(1, Number(values.decks ?? 1));
  const jokers = Math.max(0, Number(values.jokers ?? 0));
  const custom = Array.isArray(values.cards) ? (values.cards as string[]).map(String) : [];
  const seats = Math.max(1, Number(values.players ?? 2));

  const data = $state<DeckState>({
    kind,
    copies,
    jokers,
    custom,
    pool: shuffled(deckCards(kind, copies, jokers, custom), ctx.rng),
    discard: [],
    table: [],
    hands: [],
    hidden: !!values.hidden,
    deal: Math.max(0, Number(values.deal ?? 5)),
    seen: [],
    log: [],
    lastDraw: [],
  });

  function note(text: string): void {
    data.log = [text, ...data.log].slice(0, 12);
  }

  function rebuild(): void {
    data.pool = shuffled(deckCards(data.kind, data.copies, data.jokers, data.custom), ctx.rng);
    data.discard = [];
    data.table = [];
    data.hands = [];
    data.seen = [];
    data.lastDraw = [];
    note(
      translate('decks.note-new', {
        kind: translate(`decks.kind-${data.kind}`),
        count: data.pool.length,
      }),
    );
  }

  // Hands follow the table, so `players` only fills in when the session is empty;
  // a template never invents a seat nobody is sitting in.
  function ensureHands(): void {
    const existing = new Map(data.hands.map((hand) => [handKey(hand), hand]));
    data.hands = toolSeats(ctx.session.players(), seats).map((slot) => {
      const found = existing.get(handKey(slot));
      return found ?? { ...slot, cards: [], open: false };
    });
  }

  const instance: DecksInstance = {
    data,
    state: () => JSON.parse(JSON.stringify(data)) as DeckState,
    load(state) {
      if (!state || typeof state !== 'object') return;
      const raw = state as Partial<DeckState>;
      if (typeof raw.kind === 'string') data.kind = raw.kind;
      if (typeof raw.copies === 'number') data.copies = Math.max(1, raw.copies);
      if (typeof raw.jokers === 'number') data.jokers = Math.max(0, raw.jokers);
      if (Array.isArray(raw.custom)) data.custom = raw.custom.map(String);
      if (Array.isArray(raw.pool)) data.pool = raw.pool.filter((card) => card && typeof card.label === 'string');
      if (Array.isArray(raw.discard)) data.discard = raw.discard.filter((card) => card && typeof card.label === 'string');
      if (Array.isArray(raw.table)) data.table = raw.table.filter((card) => card && typeof card.label === 'string');
      if (Array.isArray(raw.hands)) {
        data.hands = raw.hands
          .filter((hand) => hand && typeof hand.name === 'string' && Array.isArray(hand.cards))
          .map((hand) => {
            const seat = Number(hand.seat);
            return {
              name: hand.name,
              ...(Number.isInteger(seat) && seat > 0 ? { seat } : {}),
              cards: hand.cards,
              open: !!hand.open,
            };
          });
      }
      if (typeof raw.hidden === 'boolean') data.hidden = raw.hidden;
      if (typeof raw.deal === 'number') data.deal = Math.max(0, raw.deal);
      if (Array.isArray(raw.seen)) data.seen = raw.seen.map(String).slice(0, 100);
      if (Array.isArray(raw.log)) data.log = raw.log.map(String).slice(0, 12);
      data.lastDraw = [];
    },
    presetFromState() {
      return {
        deck: data.kind,
        decks: data.copies,
        jokers: data.jokers,
        players: Math.max(1, data.hands.length || seats),
        deal: data.deal,
        hidden: data.hidden,
        cards: data.custom,
      };
    },
    commands: {
      deal: () => instance.deal(),
      draw: (arg) => instance.draw(arg ? Number(arg) : 1),
      shuffle: () => instance.shuffle(),
      reset: () => instance.reset(),
    },
    summary: () => summaryOf(data),
    shuffle() {
      ctx.undo.push(translate('decks.undo-shuffle'));
      data.pool = shuffled(data.pool, ctx.rng);
      ctx.audio.play('click');
      note(translate('decks.note-shuffled', { count: data.pool.length }));
    },
    cut() {
      if (data.pool.length < 2) return;
      ctx.undo.push(translate('decks.undo-cut'));
      const half = Math.floor(data.pool.length / 2);
      data.pool = [...data.pool.slice(half), ...data.pool.slice(0, half)];
      note(translate('decks.note-cut'));
    },
    draw(count = 1) {
      if (!data.pool.length) {
        if (!data.discard.length) {
          ctx.toast(translate('decks.toast-empty'), 'error');
          return;
        }
        data.pool = shuffled([...data.discard], ctx.rng);
        data.discard = [];
        ctx.toast(translate('decks.toast-reshuffled'));
      }
      // One undo step for the whole draw, including the reshuffle it needed.
      ctx.undo.push(translate('decks.undo-draw'));
      const { drawn, rest } = take(data.pool, count);
      data.pool = rest;
      data.table = [...data.table, ...drawn];
      data.lastDraw = drawn;
      data.seen = [...data.seen, ...drawn.map((card) => card.label)].slice(-100);
      ctx.haptics.buzz('short');
      note(translate('decks.note-drew', { cards: drawn.map((card) => card.label).join(' ') }));
    },
    deal() {
      if (!data.pool.length && !data.discard.length) {
        ctx.toast(translate('decks.toast-no-deal'), 'error');
        return;
      }
      ctx.undo.push(translate('decks.undo-deal'));
      if (!data.pool.length) {
        data.pool = shuffled(data.discard, ctx.rng);
        data.discard = [];
      }
      ensureHands();
      let dealt = 0;
      for (let round = 0; round < data.deal; round += 1) {
        for (const hand of data.hands) {
          const card = data.pool.shift();
          if (!card) break;
          hand.cards.push(card);
          dealt += 1;
        }
      }
      data.lastDraw = [];
      ctx.haptics.buzz('short');
      note(translate('decks.note-dealt', { deal: data.deal, players: data.hands.length }));
      if (!dealt) ctx.toast(translate('decks.toast-ran-out'), 'error');
    },
    toTable() {
      if (!data.pool.length) {
        ctx.toast(translate('decks.toast-deck-empty'), 'error');
        return;
      }
      ctx.undo.push(translate('decks.undo-table'));
      const card = data.pool.shift();
      if (card) {
        data.table = [...data.table, card];
        data.lastDraw = [card];
        data.seen = [...data.seen, card.label].slice(-100);
        note(translate('decks.note-table', { card: card.label }));
      }
    },
    discardHand(key) {
      const hand = handFor(data.hands, key);
      if (!hand || !hand.cards.length) return;
      ctx.undo.push(translate('decks.undo-discard'));
      data.discard = [...data.discard, ...hand.cards];
      hand.cards = [];
      note(translate('decks.note-discarded', { player: seatName(hand.seat, hand.name) }));
    },
    returnAll() {
      ctx.undo.push(translate('decks.undo-collect'));
      data.pool = [...data.pool, ...data.table, ...data.discard, ...data.hands.flatMap((hand) => hand.cards)];
      data.discard = [];
      data.table = [];
      data.hands = [];
      data.lastDraw = [];
      data.pool = shuffled(data.pool, ctx.rng);
      note(translate('decks.note-collected'));
    },
    revealHand(key) {
      ensureHands();
      const hand = handFor(data.hands, key);
      if (hand) hand.open = true;
    },
    hideHand(key) {
      const hand = handFor(data.hands, key);
      if (hand) hand.open = false;
    },
    setKind(next) {
      if (next === data.kind) return;
      ctx.undo.push(translate('decks.undo-kind'));
      data.kind = next;
      rebuild();
    },
    setCopies(count) {
      const next = Math.max(1, Math.min(6, Math.round(count)));
      if (next === data.copies) return;
      ctx.undo.push(translate('decks.undo-copies'));
      data.copies = next;
      rebuild();
    },
    setJokers(count) {
      const next = Math.max(0, Math.min(4, Math.round(count)));
      if (next === data.jokers) return;
      ctx.undo.push(translate('decks.undo-jokers'));
      data.jokers = next;
      rebuild();
    },
    setDeal(count) {
      data.deal = Math.max(0, Math.min(30, Math.round(count)));
    },
    setHidden(value) {
      ctx.undo.push(translate('decks.undo-hidden'));
      data.hidden = value;
      for (const hand of data.hands) hand.open = !value;
    },
    setCustom(text) {
      ctx.undo.push(translate('decks.undo-custom'));
      data.custom = text
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
      if (data.kind === 'custom') rebuild();
    },
    reset() {
      ctx.undo.push(translate('decks.undo-reset'));
      rebuild();
    },
  };

  return instance;
}

export default { ...meta, preset, component: Decks, create };
