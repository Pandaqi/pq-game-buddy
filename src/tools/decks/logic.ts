/** Card decks: build, shuffle, draw, deal and hide. No Svelte here. */

import type { Rng } from '../../core/rng';

export interface Card {
  id: string;
  label: string;
  suit: string;
  rank: string;
}

export type DeckKind = 'standard' | 'euchre' | 'skat' | 'rummy' | 'uno' | 'tarot' | 'domino' | 'custom';

export const DECK_KINDS: DeckKind[] = ['standard', 'euchre', 'skat', 'rummy', 'uno', 'tarot', 'domino', 'custom'];

const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SHORT_RANKS = ['9', '10', 'J', 'Q', 'K', 'A'];
const SKAT_RANKS = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const UNO_COLORS = ['Red', 'Yellow', 'Green', 'Blue'];
const UNO_ACTIONS = ['Skip', 'Reverse', 'Draw 2'];
const TAROT_RANKS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Page', 'Knight', 'Queen', 'King'];

function card(id: string, suit: string, rank: string): Card {
  return { id, label: `${rank}${suit}`, suit, rank };
}

/** Every card for one deck, in a stable order before shuffling. */
export function deckCards(kind: DeckKind, copies = 1, jokers = 0, custom: string[] = []): Card[] {
  const out: Card[] = [];
  const copyCount = Math.max(1, Math.min(6, Math.round(copies)));
  for (let copy = 1; copy <= copyCount; copy += 1) {
    const tag = `${kind}-${copy}`;
    if (kind === 'domino') {
      for (let high = 0; high <= 6; high += 1) {
        for (let low = 0; low <= high; low += 1) {
          out.push({ id: `${tag}-${high}${low}`, label: `${high}·${low}`, suit: 'tile', rank: `${high}-${low}` });
        }
      }
      continue;
    }
    if (kind === 'uno') {
      for (const color of UNO_COLORS) {
        out.push(card(`${tag}-${color}-0`, color, '0'));
        for (let value = 1; value <= 9; value += 1) {
          out.push(card(`${tag}-${color}-${value}a`, color, String(value)));
          out.push(card(`${tag}-${color}-${value}b`, color, String(value)));
        }
        for (const action of UNO_ACTIONS) {
          out.push(card(`${tag}-${color}-${action}a`, color, action));
          out.push(card(`${tag}-${color}-${action}b`, color, action));
        }
      }
      for (let index = 1; index <= 4; index += 1) {
        out.push(card(`${tag}-wild-${index}`, 'Wild', 'Wild'));
        out.push(card(`${tag}-wild4-${index}`, 'Wild', 'Draw 4'));
      }
      continue;
    }
    if (kind === 'tarot') {
      for (let index = 0; index <= 21; index += 1) {
        out.push({ id: `${tag}-major-${index}`, label: `Trump ${index}`, suit: 'trump', rank: String(index) });
      }
      for (const suit of SUITS) {
        for (const rank of TAROT_RANKS) {
          out.push(card(`${tag}-${suit}-${rank}`, suit, rank));
        }
      }
      continue;
    }
    const ranks = kind === 'euchre' ? SHORT_RANKS : kind === 'skat' ? SKAT_RANKS : RANKS;
    for (const suit of SUITS) {
      for (const rank of ranks) out.push(card(`${tag}-${suit}-${rank}`, suit, rank));
    }
    for (let index = 1; index <= jokers; index += 1) {
      out.push({ id: `${tag}-joker-${index}`, label: 'Joker', suit: 'joker', rank: 'Joker' });
    }
  }
  if (kind === 'custom') {
    const items = custom.map((item) => item.trim()).filter(Boolean);
    items.forEach((label, index) => {
      out.push({ id: `custom-${index}-${label.replace(/\s+/g, '_')}`, label, suit: 'custom', rank: label });
    });
  }
  return out;
}

export function shuffled(cards: Card[], rng: Rng): Card[] {
  return rng.shuffle(cards);
}

/** Take up to `count` cards off the top; never throws on an empty deck. */
export function take(pool: Card[], count: number): { drawn: Card[]; rest: Card[] } {
  const amount = Math.max(0, Math.round(count));
  return { drawn: pool.slice(0, amount), rest: pool.slice(amount) };
}

export interface Hand {
  player: string;
  cards: Card[];
  open: boolean;
}

export interface DeckState {
  kind: DeckKind;
  copies: number;
  jokers: number;
  custom: string[];
  pool: Card[];
  discard: Card[];
  table: Card[];
  hands: Hand[];
  hidden: boolean;
  deal: number;
  seen: string[];
  log: string[];
  lastDraw: Card[];
}

export function handFor(hands: Hand[], player: string): Hand {
  return hands.find((hand) => hand.player === player) ?? { player, cards: [], open: false };
}

export function deckSize(state: DeckState): number {
  return state.pool.length + state.discard.length + state.table.length + state.hands.reduce((sum, hand) => sum + hand.cards.length, 0);
}

export function summaryOf(state: DeckState): string {
  const lines = [`Deck: ${state.pool.length} left, ${state.discard.length} discarded`];
  for (const hand of state.hands) lines.push(`${hand.player}: ${hand.cards.map((item) => item.label).join(' ') || '—'}`);
  if (state.table.length) lines.push(`Table: ${state.table.map((item) => item.label).join(' ')}`);
  if (state.lastDraw.length) lines.push(`Drawn: ${state.lastDraw.map((item) => item.label).join(' ')}`);
  return lines.join('\n');
}
