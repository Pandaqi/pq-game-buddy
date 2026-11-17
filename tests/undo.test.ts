import { describe, expect, test } from 'bun:test';
import { createUndo } from '../src/core/undo';

describe('undo', () => {
  test('restores the previous snapshot', () => {
    let state = { value: 0 };
    const undo = createUndo({
      read: () => state,
      write: (next) => {
        state = next as { value: number };
      },
    });
    undo.push('increment');
    state = { value: 1 };
    expect(undo.canUndo()).toBe(true);
    expect(undo.undo()).toBe(true);
    expect(state.value).toBe(0);
    expect(undo.canUndo()).toBe(false);
  });

  test('caps the stack at fifty entries', () => {
    let value = 0;
    const undo = createUndo({ read: () => ({ value }), write: () => undefined });
    for (let index = 0; index < 80; index += 1) {
      undo.push('step');
      value += 1;
    }
    expect(undo.size()).toBe(50);
  });

  test('coalesces rapid taps with the same key', () => {
    let clock = 1000;
    const undo = createUndo({
      read: () => ({ value: 0 }),
      write: () => undefined,
      now: () => clock,
    });
    undo.push('tap', 'plus');
    clock += 100;
    undo.push('tap', 'plus');
    expect(undo.size()).toBe(1);
    clock += 5000;
    undo.push('tap', 'plus');
    expect(undo.size()).toBe(2);
  });

  test('labels describe what will be undone', () => {
    const undo = createUndo({ read: () => ({}), write: () => undefined });
    undo.push('score change');
    expect(undo.label()).toBe('score change');
  });
});
