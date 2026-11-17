/** Blind draws from a bag of tiles or tokens. No Svelte here. */

import type { Rng } from '../../core/rng';

export interface Token {
  id: string;
  type: string;
  value: number;
}

export type BagSet = 'scrabble' | 'bananagrams' | 'generic' | 'custom';

export const BAG_SETS: BagSet[] = ['scrabble', 'bananagrams', 'generic', 'custom'];

/** English Scrabble distribution: 98 tiles plus two blanks. */
const SCRABBLE_COUNTS: Record<string, number> = {
  A: 9, B: 2, C: 2, D: 4, E: 12, F: 2, G: 3, H: 2, I: 9, J: 1, K: 1, L: 4, M: 2,
  N: 6, O: 8, P: 2, Q: 1, R: 6, S: 4, T: 6, U: 4, V: 2, W: 2, X: 1, Y: 2, Z: 1, '?': 2,
};

const SCRABBLE_VALUES: Record<string, number> = {
  A: 1, B: 3, C: 3, D: 2, E: 1, F: 4, G: 2, H: 4, I: 1, J: 8, K: 5, L: 1, M: 3,
  N: 1, O: 1, P: 3, Q: 10, R: 1, S: 1, T: 1, U: 1, V: 4, W: 4, X: 8, Y: 4, Z: 10, '?': 0,
};

/** Bananagrams: 144 tiles, an even spread of the alphabet. */
const BANANAGRAMS_COUNTS: Record<string, number> = {
  A: 13, B: 3, C: 3, D: 6, E: 18, F: 3, G: 4, H: 3, I: 12, J: 2, K: 2, L: 5, M: 3,
  N: 8, O: 11, P: 3, Q: 2, R: 9, S: 6, T: 9, U: 6, V: 3, W: 3, X: 2, Y: 3, Z: 2,
};

export function countsFor(set: BagSet): Record<string, number> {
  if (set === 'scrabble') return { ...SCRABBLE_COUNTS };
  if (set === 'bananagrams') return { ...BANANAGRAMS_COUNTS };
  if (set === 'generic') return { red: 10, blue: 10, green: 10, yellow: 10 };
  return {};
}

export function valuesFor(set: BagSet): Record<string, number> {
  if (set === 'scrabble') return { ...SCRABBLE_VALUES };
  if (set === 'generic') return { red: 1, blue: 1, green: 1, yellow: 1 };
  return {};
}

export function totalOf(counts: Record<string, number>): number {
  return Object.values(counts).reduce((sum, value) => sum + Math.max(0, Math.round(Number(value) || 0)), 0);
}

/** Draw one type with probability proportional to how many are left. */
export function drawType(counts: Record<string, number>, rng: Rng): string | null {
  const entries = Object.entries(counts).filter(([, count]) => count > 0);
  if (!entries.length) return null;
  let roll = rng.int(totalOf(counts));
  for (const [type, count] of entries) {
    roll -= count;
    if (roll < 0) return type;
  }
  return entries[entries.length - 1][0];
}

export interface BagTray {
  player: string;
  tokens: Token[];
}

export interface BagState {
  set: BagSet;
  /** Configured counts; `remaining` is what is actually in the bag. */
  counts: Record<string, number>;
  values: Record<string, number>;
  remaining: Record<string, number>;
  drawCount: number;
  trayMode: 'shared' | 'per-player';
  tokens: Token[];
  trays: BagTray[];
  serial: number;
  history: string[];
}

export function trayFor(trays: BagTray[], player: string): Token[] {
  return trays.find((tray) => tray.player === player)?.tokens ?? [];
}

export function trayTotal(tokens: Token[]): number {
  return tokens.reduce((sum, token) => sum + (Number(token.value) || 0), 0);
}

export function summaryOf(state: BagState): string {
  const lines = [`Bag: ${totalOf(state.remaining)} tokens left`];
  const groups = new Map<string, string[]>();
  for (const token of state.tokens) {
    const list = groups.get(token.type) ?? [];
    list.push(token.type);
    groups.set(token.type, list);
  }
  if (groups.size) lines.push(`Tray: ${[...groups.keys()].join(' ')}`);
  for (const tray of state.trays) {
    if (tray.tokens.length) lines.push(`${tray.player}: ${tray.tokens.map((token) => token.type).join(' ')}`);
  }
  return lines.join('\n');
}
