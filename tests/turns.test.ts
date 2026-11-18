import { describe, expect, test } from 'bun:test';
import {
  advance,
  advanceInitiative,
  currentName,
  currentPhase,
  initiativeFromPreset,
  initiativeRanking,
  jumpTo,
  newInitiativeRound,
  normaliseInitiative,
  normaliseOrder,
  normalisePhases,
  remainingMs,
  rewind,
  rewindInitiative,
  type TurnsState,
} from '../src/tools/turns/logic';

function state(overrides: Partial<TurnsState> = {}): TurnsState {
  return {
    order: [{ name: 'Ada' }, { name: 'Bo' }, { name: 'Cy' }],
    index: 0,
    round: 1,
    phases: ['Turn', 'Buy'],
    phase: 0,
    timer: { duration: 60000, remaining: 60000, running: false, startedWall: 0, startedMono: 0 },
    pass: true,
    autoStart: false,
    mode: 'order',
    initiative: [0, 0, 0],
    log: [],
    ...overrides,
  };
}

describe('turn order', () => {
  test('advance walks the order and rolls into the next round', () => {
    const sheet = state();
    advance(sheet);
    expect(currentName(sheet, 'en')).toBe('Bo');
    expect(sheet.round).toBe(1);
    advance(sheet);
    expect(currentName(sheet, 'en')).toBe('Cy');
    advance(sheet);
    expect(currentName(sheet, 'en')).toBe('Ada');
    expect(sheet.round).toBe(2);
  });

  test('jumping to a player keeps the round and restarts the phase', () => {
    const sheet = state({ index: 0, round: 3, phase: 1 });
    jumpTo(sheet, 2);
    expect(currentName(sheet, 'en')).toBe('Cy');
    expect(sheet.round).toBe(3);
    expect(sheet.phase).toBe(0);
    jumpTo(sheet, 99);
    expect(currentName(sheet, 'en')).toBe('Cy');
    jumpTo(sheet, -4);
    expect(currentName(sheet, 'en')).toBe('Ada');
  });

  test('rewind goes back and rolls the round back at the start', () => {
    const sheet = state({ index: 0, round: 2 });
    rewind(sheet);
    expect(sheet.round).toBe(1);
    expect(currentName(sheet, 'en')).toBe('Cy');
    rewind(sheet);
    expect(currentName(sheet, 'en')).toBe('Bo');
    rewind(sheet);
    expect(currentName(sheet, 'en')).toBe('Ada');
    rewind(sheet);
    expect(currentName(sheet, 'en')).toBe('Ada');
    expect(sheet.round).toBe(1);
  });

  test('advance resets the phase', () => {
    const sheet = state({ phase: 1 });
    advance(sheet);
    expect(sheet.phase).toBe(0);
    expect(currentPhase(sheet)).toBe('Turn');
  });

  test('orders are cleaned, de-duplicated and always have two seats', () => {
    expect(normaliseOrder(['Ada', ' Ada ', 'Bo'])).toEqual([{ name: 'Ada' }, { name: 'Bo' }]);
    // A blank entry is a seat the app names, said in the active language.
    expect(normaliseOrder(['Ada', ''])).toEqual([{ name: 'Ada' }, { name: '', seat: 2 }]);
    expect(normaliseOrder([])).toEqual([
      { name: '', seat: 1 },
      { name: '', seat: 2 },
    ]);
    expect(normalisePhases([' Turn ', '', 'Buy'])).toEqual(['Turn', 'Buy']);
  });

  test('a generated seat is said in the active language and a typed name stands', () => {
    const sheet = state({ order: [{ name: '', seat: 1 }, { name: 'Ada' }] });
    expect(currentName(sheet, 'en')).toBe('Player 1');
    expect(currentName(sheet, 'nl')).toBe('Speler 1');
    sheet.index = 1;
    expect(currentName(sheet, 'nl')).toBe('Ada');
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

describe('initiative', () => {
  test('ranks seats by value, highest first, ties in turn order', () => {
    const sheet = state({ mode: 'initiative', initiative: [12, 18, 12] });
    expect(initiativeRanking(sheet)).toEqual([1, 0, 2]);
  });

  test('next walks the ranking and rolls the round at the bottom', () => {
    const sheet = state({ mode: 'initiative', initiative: [12, 18, 12], index: 1 });
    advanceInitiative(sheet);
    expect(currentName(sheet, 'en')).toBe('Ada');
    advanceInitiative(sheet);
    expect(currentName(sheet, 'en')).toBe('Cy');
    expect(sheet.round).toBe(1);
    advanceInitiative(sheet);
    expect(currentName(sheet, 'en')).toBe('Bo');
    expect(sheet.round).toBe(2);
  });

  test('previous walks back and rolls back only above the first round', () => {
    const sheet = state({ mode: 'initiative', initiative: [12, 18, 12], index: 1, round: 1 });
    rewindInitiative(sheet);
    expect(currentName(sheet, 'en')).toBe('Bo');
    expect(sheet.round).toBe(1);
    sheet.index = 1;
    sheet.round = 2;
    rewindInitiative(sheet);
    expect(sheet.round).toBe(1);
    expect(currentName(sheet, 'en')).toBe('Cy');
  });

  test('a new round clears every value and restarts at the first seat', () => {
    const sheet = state({ mode: 'initiative', initiative: [5, 9, 3], index: 1, round: 4 });
    newInitiativeRound(sheet);
    expect(sheet.initiative).toEqual([0, 0, 0]);
    expect(sheet.index).toBe(0);
    expect(sheet.round).toBe(5);
  });

  test('the initiative preset names the seat, not the words on screen', () => {
    const seats = [{ name: '', seat: 1 }, { name: 'Ada' }];
    expect(initiativeFromPreset({ 'seat-1': 18, Ada: 12 }, seats)).toEqual([18, 12]);
    expect(initiativeFromPreset([4, 2], seats)).toEqual([4, 2]);
    expect(initiativeFromPreset(null, seats)).toEqual([0, 0]);
  });

  test('initiative values are whole numbers and the preset may name players', () => {
    expect(normaliseInitiative([5.4, 'x'], 3)).toEqual([5, 0, 0]);
    expect(normaliseInitiative(undefined, 2)).toEqual([0, 0]);
    expect(initiativeFromPreset({ Ada: 18, Bo: '12' }, ['Ada', 'Bo', 'Cy'])).toEqual([18, 12, 0]);
    expect(initiativeFromPreset([4, 2], ['Ada', 'Bo', 'Cy'])).toEqual([4, 2, 0]);
    expect(initiativeFromPreset(null, ['Ada'])).toEqual([0]);
  });
});
