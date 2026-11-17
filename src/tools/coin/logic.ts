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
}

export interface CoinActions {
  flip(): void;
  setCoins(count: number): void;
  setFairness(percent: number): void;
  setCall(side: CoinSide | 'none'): void;
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
