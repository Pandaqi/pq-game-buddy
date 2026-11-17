import { describe, expect, test } from 'bun:test';
import {
  advance,
  currentName,
  currentPhase,
  jumpTo,
  normaliseOrder,
  normalisePhases,
  remainingMs,
  rewind,
  type TurnsState,
} from '../src/tools/turns/logic';

function state(overrides: Partial<TurnsState> = {}): TurnsState {
  return {
    order: ['Ada', 'Bo', 'Cy'],
    index: 0,
    round: 1,
    phases: ['Turn', 'Buy'],
    phase: 0,
    timer: { duration: 60000, remaining: 60000, running: false, startedWall: 0, startedMono: 0 },
    pass: true,
    autoStart: false,
    log: [],
    ...overrides,
  };
}

describe('turn order', () => {
  test('advance walks the order and rolls into the next round', () => {
    const sheet = state();
    advance(sheet);
    expect(currentName(sheet)).toBe('Bo');
    expect(sheet.round).toBe(1);
    advance(sheet);
    expect(currentName(sheet)).toBe('Cy');
    advance(sheet);
    expect(currentName(sheet)).toBe('Ada');
    expect(sheet.round).toBe(2);
  });

  test('jumping to a player keeps the round and restarts the phase', () => {
    const sheet = state({ index: 0, round: 3, phase: 1 });
    jumpTo(sheet, 2);
    expect(currentName(sheet)).toBe('Cy');
    expect(sheet.round).toBe(3);
    expect(sheet.phase).toBe(0);
    jumpTo(sheet, 99);
    expect(currentName(sheet)).toBe('Cy');
    jumpTo(sheet, -4);
    expect(currentName(sheet)).toBe('Ada');
  });

  test('rewind goes back and rolls the round back at the start', () => {
    const sheet = state({ index: 0, round: 2 });
    rewind(sheet);
    expect(sheet.round).toBe(1);
    expect(currentName(sheet)).toBe('Cy');
    rewind(sheet);
    expect(currentName(sheet)).toBe('Bo');
    rewind(sheet);
    expect(currentName(sheet)).toBe('Ada');
    rewind(sheet);
    expect(currentName(sheet)).toBe('Ada');
    expect(sheet.round).toBe(1);
  });

  test('advance resets the phase', () => {
    const sheet = state({ phase: 1 });
    advance(sheet);
    expect(sheet.phase).toBe(0);
    expect(currentPhase(sheet)).toBe('Turn');
  });

  test('orders are cleaned and always have a player', () => {
    expect(normaliseOrder(['Ada', ' Ada ', '', 'Bo'])).toEqual(['Ada', 'Bo']);
    expect(normaliseOrder([])).toEqual(['Player 1', 'Player 2']);
    expect(normalisePhases([' Turn ', '', 'Buy'])).toEqual(['Turn', 'Buy']);
  });

  test('current phase falls back when the list is empty', () => {
    expect(currentPhase(state({ phases: [] }))).toBe('Turn');
  });
});

describe('turn clock', () => {
  test('paused timers report the banked remaining time', () => {
    expect(remainingMs(state({ timer: { duration: 60000, remaining: 25000, running: false, startedWall: 0, startedMono: 0 } }), 0, 0)).toBe(25000);
  });

  test('running timers use the larger of wall and monotonic time', () => {
    const timer = { duration: 60000, remaining: 60000, running: true, startedWall: 1000, startedMono: 5000 };
    expect(remainingMs(state({ timer }), 11000, 8000)).toBe(50000);
    expect(remainingMs(state({ timer }), 9000, 45000)).toBe(20000);
  });

  test('never reports less than zero, and no timer means zero', () => {
    const timer = { duration: 5000, remaining: 5000, running: true, startedWall: 0, startedMono: 0 };
    expect(remainingMs(state({ timer }), 999999, 999999)).toBe(0);
    expect(remainingMs(state({ timer: { ...timer, duration: 0 } }), 10, 10)).toBe(0);
  });

});
