import type { ToolInstance } from '../../core/registry';

export interface Counter {
  id: string;
  name: string;
  value: number;
  step: number;
}

export interface CounterEntry {
  at: number;
  text: string;
}

export interface CountersState {
  counters: Counter[];
  bank: number;
  denominations: number[];
  step: number;
  hidden: boolean;
  revealed: boolean;
  history: CounterEntry[];
}

export interface CountersActions {
  adjust(id: string, delta: number): void;
  adjustBank(delta: number): void;
  tapDenomination(value: number): void;
  addCounter(name: string, start: number): void;
  renameCounter(id: string, name: string): void;
  removeCounter(id: string): void;
  setStep(value: number): void;
  setHidden(value: boolean): void;
  reveal(): void;
  reset(): void;
}

export type CountersInstance = ToolInstance<CountersState> & CountersActions;

/** Clean, positive, deduplicated denominations; falls back to the default set. */
export function denominationsFrom(values: readonly unknown[]): number[] {
  const out: number[] = [];
  for (const value of values) {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    if (!out.includes(amount)) out.push(amount);
  }
  return out.length ? out.sort((a, b) => a - b) : [1, 5, 10, 25, 100];
}

/** Move `delta` between the bank and a counter. Returns what actually moved. */
export function transfer(counter: Counter, bank: number, delta: number): number {
  if (!Number.isFinite(delta) || delta === 0) return 0;
  if (delta > 0) return Math.max(0, Math.min(delta, bank));
  const moved = Math.max(0, Math.min(-delta, counter.value));
  return moved === 0 ? 0 : -moved;
}

/** Everything the table holds: bank plus every counter. */
export function grandTotal(state: CountersState): number {
  return state.counters.reduce((total, counter) => total + counter.value, state.bank);
}

/** Final standings for the finish-game flow, highest counter first. */
export function resultsFor(state: CountersState): { name: string; score: number }[] {
  return state.counters
    .map((counter) => ({ name: counter.name, score: counter.value }))
    .sort((a, b) => b.score - a.score);
}
