import './helpers/language';
import { describe, expect, test } from 'bun:test';
import type { ToolContext } from '../src/core/registry';
import { createRng } from '../src/core/rng';
import {
  alivePlayers,
  clampLives,
  gameOverLabel,
  isGameOver,
  isOut,
  resultsFor,
  type LivesInstance,
  type LivesState,
} from '../src/tools/lives/logic';
import livesTool from '../src/tools/lives/tool.svelte';

function state(overrides: Partial<LivesState> = {}): LivesState {
  return {
    mode: 'players',
    lives: 3,
    max: 5,
    step: 1,
    elimination: true,
    players: [
      { id: 'p1', name: 'Ada', lives: 3, max: 5, color: '#c0392b' },
      { id: 'p2', name: 'Bo', lives: 3, max: 5, color: '#2f6fc0' },
    ],
    extras: [],
    conditions: [],
    hidden: false,
    revealed: true,
    ...overrides,
  };
}

function makeContext(): { ctx: ToolContext; labels: string[] } {
  const labels: string[] = [];
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
    toast: () => undefined,
    t: (key: string) => key,
  } as unknown as ToolContext;
  return { ctx, labels };
}

describe('lives rules', () => {
  test('clamps to zero and the track maximum', () => {
    expect(clampLives(-2, 5)).toBe(0);
    expect(clampLives(9, 5)).toBe(5);
    expect(clampLives(2.6, 5)).toBe(3);
    expect(clampLives(Number.NaN, 5)).toBe(0);
  });

  test('elimination only applies when the option is on', () => {
    const track = { id: 'p1', name: 'Ada', lives: 0, max: 5, color: '#c0392b' };
    expect(isOut(state(), track)).toBe(true);
    expect(isOut(state({ elimination: false }), track)).toBe(false);
  });

  test('alive players drop the eliminated tracks', () => {
    const sheet = state();
    sheet.players[0].lives = 0;
    expect(alivePlayers(sheet).map((player) => player.name)).toEqual(['Bo']);
  });

  test('shared games end when the pool is empty', () => {
    expect(isGameOver(state({ mode: 'shared', lives: 0 }))).toBe(true);
    expect(isGameOver(state({ mode: 'shared', lives: 1 }))).toBe(false);
    expect(isGameOver(state({ mode: 'shared', lives: 0, elimination: false }))).toBe(false);
  });

  test('a player game ends with one player left, or a lone player out', () => {
    const sheet = state();
    sheet.players[0].lives = 0;
    expect(isGameOver(sheet)).toBe(true);
    expect(gameOverLabel(sheet)).toBe('Bo wins');

    const lone = state({ players: [{ id: 'p1', name: 'Ada', lives: 0, max: 5, color: '#c0392b' }] });
    expect(isGameOver(lone)).toBe(true);

    const everyone = state();
    for (const player of everyone.players) player.lives = 0;
    expect(isGameOver(everyone)).toBe(true);
    expect(gameOverLabel(everyone)).toBe('Everyone is out');
  });

  test('results sort by remaining lives', () => {
    const sheet = state();
    sheet.players[0].lives = 1;
    sheet.players[1].lives = 4;
    expect(resultsFor(sheet)).toEqual([
      { name: 'Bo', score: 4 },
      { name: 'Ada', score: 1 },
    ]);
    expect(resultsFor(state({ mode: 'shared', lives: 2 }))).toEqual([{ name: 'Table', score: 2 }]);
  });
});

describe('lives actions', () => {
  test('only records undo steps when a value actually changes', () => {
    const { ctx, labels } = makeContext();
    const instance = livesTool.create(ctx, { mode: 'players', lives: 1, max: 2 }) as LivesInstance;

    instance.adjust('p1', -1);
    expect(instance.data.players[0].lives).toBe(0);
    expect(labels).toEqual(['change lives']);

    instance.adjust('p1', -1);
    expect(labels).toEqual(['change lives']);

    instance.adjust('p1', 1);
    expect(instance.data.players[0].lives).toBe(1);
    expect(labels).toEqual(['change lives', 'change lives']);

    instance.setMode('shared');
    expect(labels.length).toBe(3);
    instance.setMode('shared');
    expect(labels.length).toBe(3);
  });

  test('eliminating the second-to-last player ends the game', () => {
    const { ctx } = makeContext();
    const instance = livesTool.create(ctx, { mode: 'players', lives: 1, max: 3 }) as LivesInstance;
    instance.adjust('p1', -1);
    instance.adjust('p2', -1);
    expect(isGameOver(instance.data)).toBe(true);
    expect(gameOverLabel(instance.data)).toBe('Everyone is out');
  });

  test('reset restores starting lives, tracks and conditions', () => {
    const { ctx } = makeContext();
    const instance = livesTool.create(ctx, {
      mode: 'players',
      lives: 2,
      max: 4,
      extras: { mana: 3 },
      conditions: ['poisoned'],
    }) as LivesInstance;
    instance.adjust('p1', -2);
    instance.adjustExtra('mana', 2);
    instance.toggleCondition('poisoned');
    instance.resetAll();
    expect(instance.data.players[0].lives).toBe(2);
    expect(instance.data.extras[0].value).toBe(0);
    expect(instance.data.conditions[0].active).toBe(false);
  });
});
