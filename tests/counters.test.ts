import { describe, expect, test } from 'bun:test';
import type { ToolContext } from '../src/core/registry';
import { createRng } from '../src/core/rng';
import {
  denominationsFrom,
  downStep,
  grandTotal,
  resultsFor,
  transfer,
  type Counter,
  type CountersInstance,
  type CountersState,
} from '../src/tools/counters/logic';
import countersTool from '../src/tools/counters/tool.svelte';

function state(overrides: Partial<CountersState> = {}): CountersState {
  return {
    counters: [
      { id: 'c1', name: 'Coins', value: 4, step: 1, down: 0 },
      { id: 'c2', name: 'Wood', value: 2, step: 1, down: 0 },
    ],
    mode: 'bank',
    bank: 7,
    denominations: [1, 5, 10],
    step: 1,
    down: 0,
    hidden: false,
    revealed: true,
    history: [],
    ...overrides,
  };
}

function makeContext(): { ctx: ToolContext; labels: string[]; toasts: string[] } {
  const labels: string[] = [];
  const toasts: string[] = [];
  const ctx = {
    instanceId: 'test',
    session: {
      players: () => [],
      instance: () => undefined,
      setActivePlayer: () => undefined,
      addPlayer: () => undefined,
      removePlayer: () => undefined,
      renamePlayer: () => undefined,
    },
    clock: { now: () => 0, wall: () => 0, subscribe: () => () => undefined, onResync: () => () => undefined },
    rng: createRng('TEST'),
    audio: { play: () => undefined, unlock: () => undefined, setVolume: () => undefined },
    haptics: { buzz: () => undefined, enabled: () => false },
    undo: {
      push: (label?: string) => labels.push(label ?? 'change'),
      undo: () => false,
      canUndo: () => labels.length > 0,
      label: () => labels[labels.length - 1] ?? null,
      size: () => labels.length,
      clear: () => labels.splice(0),
    },
    toast: (message: string) => toasts.push(message),
    t: (key: string) => key,
  } as unknown as ToolContext;
  return { ctx, labels, toasts };
}

describe('counter transfers', () => {
  const counter: Counter = { id: 'c1', name: 'Coins', value: 4, step: 1, down: 0 };

  test('takes at most what the bank holds', () => {
    expect(transfer(counter, 7, 5)).toBe(5);
    expect(transfer(counter, 3, 5)).toBe(3);
    expect(transfer(counter, 0, 5)).toBe(0);
  });

  test('returns at most what the counter holds', () => {
    expect(transfer(counter, 7, -3)).toBe(-3);
    expect(transfer(counter, 7, -9)).toBe(-4);
    expect(transfer({ ...counter, value: 0 }, 7, -1)).toBe(0);
  });

  test('never moves a fraction or a nonsense amount', () => {
    expect(transfer(counter, 7, Number.NaN)).toBe(0);
  });
});

describe('counter totals', () => {
  test('grand total adds the bank to every counter', () => {
    expect(grandTotal(state())).toBe(13);
    expect(grandTotal(state({ counters: [], bank: 2 }))).toBe(2);
  });

  test('results sort counters by value', () => {
    expect(resultsFor(state({ counters: [
      { id: 'c1', name: 'Coins', value: 1, step: 1, down: 0 },
      { id: 'c2', name: 'Gems', value: 9, step: 1, down: 0 },
    ] }))).toEqual([
      { name: 'Gems', score: 9 },
      { name: 'Coins', score: 1 },
    ]);
  });

  test('denominations drop junk, duplicates and stay sorted', () => {
    expect(denominationsFrom(['10', '5', '5', '0', '-2', 'x'])).toEqual([5, 10]);
    expect(denominationsFrom([])).toEqual([1, 5, 10, 25, 100]);
  });
});

describe('counter actions', () => {
  test('moves value between the bank and a counter', () => {
    const { ctx, labels } = makeContext();
    const instance = countersTool.create(ctx, { counters: { Coins: 4 }, bank: 7 }) as CountersInstance;
    instance.adjust('c1', 5);
    expect(instance.data.counters[0].value).toBe(9);
    expect(instance.data.bank).toBe(2);
    expect(labels).toEqual(['counter change']);

    instance.adjust('c1', -4);
    expect(instance.data.counters[0].value).toBe(5);
    expect(instance.data.bank).toBe(6);
  });

  test('refuses moves the bank cannot cover and says why', () => {
    const { ctx, labels, toasts } = makeContext();
    const instance = countersTool.create(ctx, { counters: { Coins: 0 }, bank: 0 }) as CountersInstance;
    instance.adjust('c1', 3);
    expect(instance.data.counters[0].value).toBe(0);
    expect(labels).toEqual([]);
    expect(toasts[0]).toContain('bank is empty');
  });

  test('removing a counter returns its value to the bank', () => {
    const { ctx } = makeContext();
    const instance = countersTool.create(ctx, { counters: { Coins: 4, Wood: 2 }, bank: 1 }) as CountersInstance;
    instance.removeCounter('c1');
    expect(instance.data.bank).toBe(5);
    expect(instance.data.counters.map((counter) => counter.name)).toEqual(['Wood']);
  });

  test('step changes apply to every counter and are undoable once', () => {
    const { ctx, labels } = makeContext();
    const instance = countersTool.create(ctx, { counters: { Coins: 4, Wood: 2 }, step: 1 }) as CountersInstance;
    instance.setStep(5);
    expect(instance.data.counters.every((counter) => counter.step === 5)).toBe(true);
    instance.setStep(5);
    expect(labels).toEqual(['counter step']);

    instance.tapDenomination(25);
    expect(instance.data.bank).toBe(25);
  });

  test('reset clears values, the bank and the log', () => {
    const { ctx, labels } = makeContext();
    const instance = countersTool.create(ctx, { counters: { Coins: 4 }, bank: 2 }) as CountersInstance;
    instance.reset();
    expect(instance.data.bank).toBe(0);
    expect(instance.data.counters[0].value).toBe(0);
    expect(instance.data.history).toEqual([]);
    expect(labels).toEqual(['reset counters']);

    instance.reset();
    expect(labels).toEqual(['reset counters']);
  });

  test('bank mode returns the step, even when a counting decrease step is set', () => {
    const { ctx } = makeContext();
    const instance = countersTool.create(ctx, {
      counters: { Coins: 8 },
      bank: 2,
      step: 5,
      down: 1,
    }) as CountersInstance;
    instance.adjust('c1', -5);
    expect(instance.data.counters[0].value).toBe(3);
    expect(instance.data.bank).toBe(7);
  });
});

describe('counting mode', () => {
  test('adds and takes away points without a bank', () => {
    const { ctx, labels } = makeContext();
    const instance = countersTool.create(ctx, {
      mode: 'count',
      counters: { Points: 0 },
      step: 5,
      down: 1,
    }) as CountersInstance;
    instance.adjust('c1', 5);
    expect(instance.data.counters[0].value).toBe(5);
    expect(instance.data.bank).toBe(0);

    instance.adjust('c1', -1);
    expect(instance.data.counters[0].value).toBe(4);
    expect(instance.data.bank).toBe(0);
    expect(labels).toEqual(['counter change', 'counter change']);
  });

  test('stops at zero and says so', () => {
    const { ctx, toasts } = makeContext();
    const instance = countersTool.create(ctx, {
      mode: 'count',
      counters: { Points: 0 },
      step: 5,
      down: 1,
    }) as CountersInstance;
    instance.adjust('c1', -1);
    expect(instance.data.counters[0].value).toBe(0);
    expect(toasts[0]).toContain('already at 0');
  });

  test('a counting pad keeps no bank', () => {
    const { ctx } = makeContext();
    const instance = countersTool.create(ctx, { mode: 'count', counters: { Points: 2 }, bank: 50 }) as CountersInstance;
    expect(instance.data.bank).toBe(0);
    expect(instance.summary()).toBe('Points: 2');
  });

  test('a zero decrease step follows the step', () => {
    expect(downStep({ id: 'c1', name: 'Points', value: 0, step: 5, down: 0 })).toBe(5);
    expect(downStep({ id: 'c1', name: 'Points', value: 0, step: 5, down: 1 })).toBe(1);
  });

  test('mode and decrease step survive a reload and a save', () => {
    const { ctx } = makeContext();
    const instance = countersTool.create(ctx, {
      mode: 'count',
      counters: { Points: 3 },
      step: 5,
      down: 2,
    }) as CountersInstance;
    const next = countersTool.create(ctx, {}) as CountersInstance;
    next.load(instance.state());
    expect(next.data.mode).toBe('count');
    expect(next.data.counters[0].down).toBe(2);
    expect(downStep(next.data.counters[0])).toBe(2);
    expect((next.presetFromState() as unknown as Record<string, unknown>).mode).toBe('count');
    expect((next.presetFromState() as unknown as Record<string, unknown>).down).toBe(2);
  });
});
