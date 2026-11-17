import { beforeEach, describe, expect, test } from 'bun:test';
import {
  clearPlays,
  formatMinutes,
  listPlays,
  playsToCsv,
  playsToJson,
  recordPlay,
  statsFor,
  updatePlay,
  type PlayRecord,
} from '../src/core/play-log';

function record(overrides: Partial<PlayRecord> = {}): PlayRecord {
  return {
    id: 'p1',
    at: 1000,
    game: 'Catan',
    players: ['Ada', 'Bo'],
    results: [
      { name: 'Ada', score: 10 },
      { name: 'Bo', score: 8 },
    ],
    winner: 'Ada',
    ...overrides,
  };
}

beforeEach(() => {
  clearPlays();
});

describe('play stats', () => {
  test('counts plays and wins per player', () => {
    const stats = statsFor([
      record(),
      record({ id: 'p2', at: 2000, winner: 'Bo' }),
      record({ id: 'p3', at: 3000, winner: 'Ada' }),
    ]);
    expect(stats.plays).toBe(3);
    expect(stats.wins).toEqual([
      { name: 'Ada', wins: 2 },
      { name: 'Bo', wins: 1 },
    ]);
  });

  test('the streak is the newest run of the same winner', () => {
    const stats = statsFor([
      record({ id: 'p1', at: 1000, winner: 'Bo' }),
      record({ id: 'p2', at: 3000, winner: 'Ada' }),
      record({ id: 'p3', at: 2000, winner: 'Ada' }),
    ]);
    expect(stats.streak).toEqual({ name: 'Ada', length: 2 });
    expect(stats.lastPlayed).toBe(3000);
  });

  test('no records means empty stats', () => {
    expect(statsFor([])).toEqual({
      plays: 0,
      minutes: 0,
      games: 0,
      wins: [],
      winRates: [],
      streak: null,
      lastPlayed: null,
    });
  });

  test('playtime and distinct games are summed', () => {
    const stats = statsFor([
      record({ id: 'p1', minutes: 45 }),
      record({ id: 'p2', game: 'Poker', minutes: 20 }),
      record({ id: 'p3', game: 'Catan' }),
    ]);
    expect(stats.minutes).toBe(65);
    expect(stats.games).toBe(2);
  });

  test('win rate counts the games a player sat in, not just won', () => {
    const stats = statsFor([
      record({ id: 'p1', at: 1000, winner: 'Ada' }),
      record({ id: 'p2', at: 2000, winner: 'Bo' }),
      record({ id: 'p3', at: 3000, winner: '', players: ['Ada', 'Bo'] }),
    ]);
    expect(stats.winRates).toEqual([
      { name: 'Ada', plays: 3, wins: 1, rate: 1 / 3 },
      { name: 'Bo', plays: 3, wins: 1, rate: 1 / 3 },
    ]);
  });

  test('a play without a winner still counts but breaks the streak', () => {
    const stats = statsFor([record({ id: 'p1', at: 3000, winner: 'Ada' }), record({ id: 'p2', at: 2000, winner: '' })]);
    expect(stats.wins).toEqual([{ name: 'Ada', wins: 1 }]);
    expect(stats.streak).toEqual({ name: 'Ada', length: 1 });
  });

  test('a newest play without a winner does not fake a zero-length streak', () => {
    const stats = statsFor([
      record({ id: 'p1', at: 2000, winner: 'Ada' }),
      record({ id: 'p2', at: 3000, winner: '' }),
    ]);
    expect(stats.streak).toEqual({ name: 'Ada', length: 1 });
  });
});

describe('play records', () => {
  test('records are stored newest first and trimmed to the fields we know', () => {
    const first = recordPlay({ game: 'Catan', winner: 'Ada', results: [{ name: 'Ada', score: 10 }], at: 1000 });
    const second = recordPlay({ game: 'Poker', winner: 'Bo', at: 2000 });
    const plays = listPlays();
    expect(plays).toHaveLength(2);
    expect(plays[0].game).toBe('Poker');
    expect(plays[1].id).toBe(first.id);
    expect(plays[0].id).toBe(second.id);
    expect(plays[0].results).toEqual([]);
  });

  test('an empty game name falls back and clearing removes everything', () => {
    const saved = recordPlay({ game: '   ', winner: 'Ada' });
    expect(saved.game).toBe('Untitled game');
    clearPlays();
    expect(listPlays()).toEqual([]);
  });

  test('a saved play can be updated in place instead of duplicated', () => {
    const saved = recordPlay({ game: 'Catan', winner: 'Ada', results: [{ name: 'Ada', score: 10 }] });
    const updated = updatePlay(saved.id, { winner: 'Bo', results: [{ name: 'Bo', score: 12 }] });
    expect(updated?.winner).toBe('Bo');
    expect(listPlays()).toHaveLength(1);
    expect(listPlays()[0].results).toEqual([{ name: 'Bo', score: 12 }]);
    expect(updatePlay('missing', { winner: 'Ada' })).toBeNull();
  });
});

describe('exports', () => {
  test('csv quotes commas, lists results and carries minutes', () => {
    const csv = playsToCsv([record({ game: 'Catan, the card game', minutes: 42 })]);
    const [header, row] = csv.split('\n');
    expect(header).toBe('Game,Date,Winner,Players,Results,Minutes');
    expect(row).toContain('"Catan, the card game"');
    expect(row).toContain('Ada=10; Bo=8');
    expect(row).toContain(',42');
  });

  test('json carries a version and every record', () => {
    const json = JSON.parse(playsToJson([record()]));
    expect(json.version).toBe(1);
    expect(json.plays[0].winner).toBe('Ada');
  });

  test('minutes format as minutes under an hour and hours above', () => {
    expect(formatMinutes(0)).toBe('0 min');
    expect(formatMinutes(45)).toBe('45 min');
    expect(formatMinutes(125)).toBe('2h 05m');
    expect(formatMinutes(120)).toBe('2h');
  });
});

describe('play durations', () => {
  test('a duration is stored and can be corrected', () => {
    const saved = recordPlay({ game: 'Catan', winner: 'Ada', minutes: 50.4 });
    expect(saved.minutes).toBe(50);
    const updated = updatePlay(saved.id, { winner: 'Ada', minutes: 61 });
    expect(updated?.minutes).toBe(61);
  });

  test('junk durations are dropped rather than saved', () => {
    const saved = recordPlay({ game: 'Catan', winner: 'Ada', minutes: -3 });
    expect(saved.minutes).toBeUndefined();
  });
});
