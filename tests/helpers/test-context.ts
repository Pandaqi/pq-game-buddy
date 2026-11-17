import { t } from '../../src/core/i18n';
import type { ToolContext } from '../../src/core/registry';
import { createRng } from '../../src/core/rng';
import { makePlayers } from '../../src/core/session';
import { createFakeClock, type FakeClock } from './fake-clock';

export interface TestContext extends ToolContext {
  clock: FakeClock;
}

export function testContext(seed = 'TEST'): TestContext {
  const clock = createFakeClock();
  return {
    instanceId: 'test',
    session: {
      players: () => makePlayers(['Ada', 'Bo', 'Cy']),
      instance: () => undefined,
      setActivePlayer: () => undefined,
      addPlayer: () => undefined,
      removePlayer: () => undefined,
      renamePlayer: () => undefined,
    },
    clock,
    rng: createRng(seed),
    audio: {
      unlock: () => undefined,
      play: () => undefined,
      setVolume: () => undefined,
      setMuted: () => undefined,
      isMuted: () => true,
    },
    haptics: {
      setEnabled: () => undefined,
      supported: () => false,
      buzz: () => undefined,
    },
    undo: {
      push: () => undefined,
      batch: (_label, run) => run(),
      undo: () => false,
      canUndo: () => false,
      label: () => null,
      size: () => 0,
      clear: () => undefined,
    },
    toast: () => undefined,
    t,
  };
}
