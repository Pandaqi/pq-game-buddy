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

/** Move `delta` between the bank and a counter. Returns what actually moved. */
export function transfer(counter: Counter, bank: number, delta: number): number {
  if (delta >= 0) return Math.max(0, Math.min(delta, bank));
  return -Math.max(0, Math.min(-delta, counter.value));
}

/** Everything the table holds: bank plus every counter. */
export function grandTotal(state: CountersState): number {
  return state.counters.reduce((total, counter) => total + counter.value, state.bank);
}
