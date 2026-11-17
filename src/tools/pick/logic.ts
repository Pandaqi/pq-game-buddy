import type { ToolInstance } from '../../core/registry';
import type { Rng } from '../../core/rng';

export type PickSource = 'number' | 'list' | 'players' | 'teams' | 'seats';

/** How a result is shown: a list, cards, a wheel or a slot. */
export type PickView = 'list' | 'cards' | 'wheel' | 'slot';

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
  view: PickView;
  /** Which result cards have been turned face up. */
  revealed: boolean[];
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
  setView(view: PickView): void;
  revealAt(index: number): void;
  revealAll(): void;
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

/**
 * The choices a wheel or slot shows. Numbers only join when the range is small
 * enough to read; otherwise the view falls back to the plain list.
 */
export function viewPool(state: PickState, playerNames: string[], max = 12): string[] {
  if (state.source === 'list' && state.values.length) return state.values.slice(0, max);
  if (state.source === 'number') {
    const low = Math.min(state.min, state.max);
    const high = Math.max(state.min, state.max);
    const span = high - low + 1;
    if (!Number.isFinite(span) || span < 2 || span > max) return [];
    return Array.from({ length: span }, (_, index) => String(low + index));
  }
  return playerNames.slice(0, max);
}

/** Which pool entry the result starts on; 0 when the result is not in the pool. */
export function winnerIndex(pool: string[], winner: string | undefined): number {
  const index = winner === undefined ? -1 : pool.indexOf(winner);
  return index >= 0 ? index : 0;
}

/**
 * Degrees to turn a wheel so the winning slice's centre sits under the top
 * pointer. Four full turns are added so the animation always travels forward.
 */
export function winnerAngle(index: number, count: number): number {
  if (count <= 0) return 0;
  const segment = 360 / count;
  const target = (index + 0.5) * segment;
  return 1440 - target;
}

/** One SVG sector of a 100 × 100 wheel, starting at twelve o'clock. */
export function slicePath(index: number, count: number, radius = 46): string {
  if (count <= 0) return '';
  const segment = 360 / count;
  const toPoint = (degrees: number): string => {
    const radians = ((degrees - 90) * Math.PI) / 180;
    return `${(50 + radius * Math.cos(radians)).toFixed(2)} ${(50 + radius * Math.sin(radians)).toFixed(2)}`;
  };
  const large = segment > 180 ? 1 : 0;
  return `M50 50 L${toPoint(index * segment)} A${radius} ${radius} 0 ${large} 1 ${toPoint((index + 1) * segment)} Z`;
}

/** Vertical offset of a slot strip, in rows, so the winner sits in the middle. */
export function slotOffset(index: number): number {
  return 1 - Math.max(0, index);
}
