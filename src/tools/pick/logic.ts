import type { ToolInstance } from '../../core/registry';
import type { Rng } from '../../core/rng';

export type PickSource = 'number' | 'list' | 'players' | 'teams' | 'seats';

export interface PickRecord {
  at: number;
  items: string[];
}

export interface PickState {
  source: PickSource;
  min: number;
  max: number;
  count: number;
  replacement: boolean;
  teams: number;
  values: string[];
  drawn: string[];
  result: string[];
  teamResult: string[][] | null;
  history: PickRecord[];
  view: 'list' | 'cards';
  seed: string;
}

export interface PickActions {
  draw(): void;
  setSource(source: PickSource): void;
  addValue(value: string): void;
  removeValue(value: string): void;
  usePlayers(): void;
  clearValues(): void;
  reset(): void;
  setCount(count: number): void;
  setTeams(count: number): void;
  setRange(min: number, max: number): void;
  setReplacement(value: boolean): void;
  setSeed(value: string): void;
}

export type PickInstance = ToolInstance<PickState> & PickActions;

/** Unique integers between min and max, inclusive. Falls back to repeats when the range is too small. */
export function drawNumbers(min: number, max: number, count: number, unique: boolean, rng: Rng): number[] {
  const low = Math.min(min, max);
  const high = Math.max(min, max);
  const span = high - low + 1;
  const total = Math.max(1, Math.min(50, Math.round(count)));
  if (!unique || total >= span) {
    return Array.from({ length: total }, () => low + rng.int(span));
  }
  const pool: number[] = [];
  for (let value = low; value <= high; value += 1) pool.push(value);
  return rng.shuffle(pool).slice(0, total);
}

export function drawFromPool(pool: string[], count: number, rng: Rng): string[] {
  if (!pool.length) return [];
  const total = Math.max(1, Math.min(pool.length, Math.round(count)));
  return rng.shuffle(pool).slice(0, total);
}

export function splitTeams(players: string[], teams: number, rng: Rng): string[][] {
  const shuffled = rng.shuffle(players);
  const count = Math.max(2, Math.min(12, Math.round(teams)));
  const buckets: string[][] = Array.from({ length: count }, () => []);
  shuffled.forEach((player, index) => {
    buckets[index % count].push(player);
  });
  return buckets;
}

export function seatOrder(players: string[], rng: Rng): string[] {
  return rng.shuffle(players);
}
