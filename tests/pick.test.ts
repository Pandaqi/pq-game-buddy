import { describe, expect, test } from 'bun:test';
import {
  slotOffset,
  slicePath,
  viewPool,
  winnerAngle,
  winnerIndex,
  type PickState,
} from '../src/tools/pick/logic';

function state(overrides: Partial<PickState> = {}): PickState {
  return {
    source: 'number',
    min: 1,
    max: 6,
    count: 1,
    replacement: true,
    teams: 2,
    values: [],
    drawn: [],
    result: [],
    teamResult: null,
    history: [],
    view: 'list',
    revealed: [],
    seed: '',
    ...overrides,
  };
}

describe('pick views', () => {
  test('a small number range becomes a pool, a huge one does not', () => {
    expect(viewPool(state(), [], 12)).toEqual(['1', '2', '3', '4', '5', '6']);
    expect(viewPool(state({ min: 1, max: 100 }), [], 12)).toEqual([]);
    expect(viewPool(state({ min: 6, max: 4 }), [], 12)).toEqual(['4', '5', '6']);
  });

  test('lists and players become their own pools', () => {
    expect(viewPool(state({ source: 'list', values: ['a', 'b'] }), [], 12)).toEqual(['a', 'b']);
    expect(viewPool(state({ source: 'players' }), ['Ada', 'Bo'], 12)).toEqual(['Ada', 'Bo']);
    expect(viewPool(state({ source: 'seats' }), ['Ada', 'Bo', 'Cy'], 2)).toEqual(['Ada', 'Bo']);
  });

  test('the winner is found in the pool and falls back to the first slot', () => {
    expect(winnerIndex(['a', 'b', 'c'], 'b')).toBe(1);
    expect(winnerIndex(['a', 'b', 'c'], 'zzz')).toBe(0);
    expect(winnerIndex(['a'], undefined)).toBe(0);
  });

  test('the wheel stops with the winning slice under the pointer', () => {
    expect(winnerAngle(0, 4)).toBe(1395);
    expect(winnerAngle(3, 4)).toBe(1125);
    expect(winnerAngle(0, 0)).toBe(0);
  });

  test('slices start at the top and close into a full circle', () => {
    expect(slicePath(0, 4)).toContain('L50.00 4.00');
    expect(slicePath(0, 4)).toContain('A46 46 0 0 1 96.00 50.00');
    const last = slicePath(3, 4);
    expect(last).toContain('Z');
    expect(slicePath(0, 0)).toBe('');
  });

  test('the slot keeps the winner in the middle row', () => {
    expect(slotOffset(0)).toBe(1);
    expect(slotOffset(2)).toBe(-1);
    expect(slotOffset(-4)).toBe(1);
  });
});
