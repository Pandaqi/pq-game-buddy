import type { ToolInstance } from '../../core/registry';
import type { Rng } from '../../core/rng';

export type CoinSide = 'heads' | 'tails';

export interface CoinHistory {
  at: number;
  heads: number;
  tails: number;
  call: CoinSide | 'none';
  won: boolean | null;
}

export interface CoinState {
  coins: number;
  /** Percent chance of heads, 0-100. */
  fairness: number;
  mode: 'single' | 'best';
  target: number;
  call: CoinSide | 'none';
  results: boolean[];
  history: CoinHistory[];
  wins: number;
  losses: number;
  streak: number;
  bestStreak: number;
  /** Best-of series tally. */
  series: { heads: number; tails: number };
  seriesWinner: CoinSide | null;
}

export interface CoinActions {
  flip(): void;
  setCoins(count: number): void;
  setFairness(percent: number): void;
  setCall(side: CoinSide | 'none'): void;
  setMode(mode: CoinState['mode']): void;
  setTarget(value: number): void;
  reset(): void;
}

export type CoinInstance = ToolInstance<CoinState> & CoinActions;

export function flipCoins(count: number, headsPercent: number, rng: Rng): boolean[] {
  const total = Math.max(1, Math.min(10, Math.round(count)));
  const percent = Math.max(0, Math.min(100, headsPercent));
  const out: boolean[] = [];
  for (let index = 0; index < total; index += 1) {
    out.push(rng.float() * 100 < percent);
  }
  return out;
}

export function sideName(heads: boolean): CoinSide {
  return heads ? 'heads' : 'tails';
}

export function countOf(results: boolean[], heads: boolean): number {
  return results.filter((value) => value === heads).length;
}

/** Winner of one toss, or null on a tie. */
export function tossWinner(results: boolean[]): CoinSide | null {
  const heads = countOf(results, true);
  const tails = results.length - heads;
  if (heads === tails) return null;
  return heads > tails ? 'heads' : 'tails';
}
