import './helpers/language';
/**
 * Per-player bag trays are keyed by the player's id, not by the words on
 * screen, so a rename or a language switch keeps the tiles where they were.
 */
import { describe, expect, test } from 'bun:test';
import { makePlayers } from '../src/core/session';
import { trayLabel } from '../src/tools/bag/logic';
import bagTool, { type BagInstance } from '../src/tools/bag/tool.svelte';
import { testContext } from './helpers/test-context';

function bagWith(players: ReturnType<typeof makePlayers>): BagInstance {
  const ctx = testContext();
  ctx.session.players = () => players;
  return bagTool.create(ctx, { tray: 'per-player', draw: 1 }) as BagInstance;
}

describe('per-player trays', () => {
  test('drawing for a seat keys the tray by id, and a rename keeps it', () => {
    const instance = bagWith(makePlayers(['Ada', '']));
    instance.assignTo('p2');
    instance.draw(1);
    expect(instance.state().trays.map((tray) => tray.player)).toEqual(['p2']);

    // The seat was named by the app while it had no name of its own.
    expect(trayLabel('p2', makePlayers(['Ada', '']))).toBe('Player 2');
  });

  test('a tray saved under a name takes its player id back on load', () => {
    const instance = bagWith(makePlayers(['Ada', 'Bo']));
    instance.load({
      ...instance.state(),
      trays: [{ player: 'Bo', tokens: [{ id: 't1', type: 'A', value: 1 }] }],
    });
    expect(instance.state().trays[0].player).toBe('p2');
    expect(instance.results?.()[0]?.name).toBe('Bo');
  });
});
