/**
 * Generated seat names: stored blank with their seat number, said in the active
 * language, and replaced the moment a player types a name of their own.
 */

import { describe, expect, test } from 'bun:test';
import { setLanguage, startLanguage } from '../src/core/i18n.svelte';
import { makePlayers, parseSessionFile, playerName, seatKey, toolSeats } from '../src/core/session';

describe('player names', () => {
  test('a seat the app named is stored blank and said in the active language', async () => {
    const players = makePlayers(['', 'Ada']);
    expect(players[0]).toMatchObject({ id: 'p1', name: '', seat: 1 });
    expect(players[1]).toMatchObject({ id: 'p2', name: 'Ada' });
    expect(players[1].seat).toBeUndefined();

    await startLanguage('en');
    expect(playerName(players[0], 'en')).toBe('Player 1');
    expect(playerName(players[1], 'en')).toBe('Ada');

    expect(await setLanguage('nl')).toBe(true);
    expect(playerName(players[0], 'nl')).toBe('Speler 1');

    await setLanguage('en');
  });

  test('a tool copies the pair, and invents seat pairs only when the table is empty', () => {
    const players = makePlayers(['', 'Ada']);
    expect(toolSeats(players, 4)).toEqual([{ name: '', seat: 1 }, { name: 'Ada' }]);
    // A stored key names the seat itself, never the words on screen.
    expect(seatKey({ name: '', seat: 2 })).toBe('seat-2');
    expect(seatKey({ name: 'Ada' })).toBe('Ada');
    expect(toolSeats([], 2)).toEqual([
      { name: '', seat: 1 },
      { name: '', seat: 2 },
    ]);
  });

  test('a saved session keeps its generated seats and drops a junk seat', () => {
    const data = {
      version: 1,
      session: {
        id: 's1',
        gameName: 'Timer',
        players: [
          { id: 'p1', name: '', seat: 2, color: '#000', initial: '?', active: true },
          { id: 'p2', name: 'Ada', seat: -4, color: '#111', initial: 'A', active: false },
        ],
        instances: [],
      },
    };
    const parsed = parseSessionFile(JSON.stringify(data));
    expect(parsed?.players[0].seat).toBe(2);
    expect(parsed?.players[1].seat).toBeUndefined();
    expect(parsed?.players[1].name).toBe('Ada');
  });
});
