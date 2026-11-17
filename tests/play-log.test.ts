import { beforeEach, describe, expect, test } from 'bun:test';
import {
  clearPlays,
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
    expect(statsFor([])).toEqual({ plays: 0, wins: [], streak: null, lastPlayed: null });
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
  test('csv quotes commas and lists results', () => {
    const csv = playsToCsv([record({ game: 'Catan, the card game' })]);
    const [header, row] = csv.split('\n');
    expect(header).toBe('Game,Date,Winner,Players,Results');
    expect(row).toContain('"Catan, the card game"');
    expect(row).toContain('Ada=10; Bo=8');
  });

  test('json carries a version and every record', () => {
    const json = JSON.parse(playsToJson([record()]));
    expect(json.version).toBe(1);
    expect(json.plays[0].winner).toBe('Ada');
  });
});
