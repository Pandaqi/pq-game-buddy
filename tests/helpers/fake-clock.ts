import type { Clock } from '../../src/core/ticker';

export interface FakeClock extends Clock {
  advance(ms: number): void;
  listeners(): number;
}

/** A clock you drive by hand: no rAF, no real time. */
export function createFakeClock(wallStart = 1_700_000_000_000): FakeClock {
  let mono = 1000;
  let wall = wallStart;
  const subs = new Set<(now: number) => void>();
  const resyncs = new Set<() => void>();

  return {
    now: () => mono,
    wall: () => wall,
    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
    onResync(fn) {
      resyncs.add(fn);
      return () => resyncs.delete(fn);
    },
    advance(ms) {
      mono += ms;
      wall += ms;
      for (const fn of Array.from(subs)) fn(mono);
    },
    listeners: () => subs.size,
  };
}
