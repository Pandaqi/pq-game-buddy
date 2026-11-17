/**
 * One requestAnimationFrame loop plus one coarse interval for every time-based
 * feature in the app. Tools never start their own loops.
 */

export interface Clock {
  /** Monotonic milliseconds (performance.now based). */
  now(): number;
  /** Wall-clock milliseconds. Used for persistence and sleep catch-up. */
  wall(): number;
  /** Called on every frame (and on the coarse interval in throttled tabs). */
  subscribe(fn: (now: number) => void): () => void;
  /** Called after the tab becomes visible again or the window regains focus. */
  onResync(fn: () => void): () => void;
}

type FrameListener = (now: number) => void;

const frameSubs = new Set<FrameListener>();
const resyncSubs = new Set<() => void>();

let rafId = 0;
let coarseId: ReturnType<typeof setInterval> | null = null;
let listening = false;

function monoNow(): number {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

function hasRaf(): boolean {
  return typeof requestAnimationFrame === 'function';
}

function tick(): void {
  const now = monoNow();
  for (const fn of Array.from(frameSubs)) {
    try {
      fn(now);
    } catch (error) {
      console.error('[ticker] listener failed', error);
    }
  }
}

function frame(): void {
  tick();
  if (frameSubs.size > 0 && hasRaf()) rafId = requestAnimationFrame(frame);
  else rafId = 0;
}

function ensureLoops(): void {
  if (frameSubs.size === 0) return;
  if (hasRaf() && rafId === 0) rafId = requestAnimationFrame(frame);
  if (coarseId === null) {
    // Safety net for throttled/hidden tabs where rAF stops firing.
    coarseId = setInterval(tick, 250);
    const handle = coarseId as unknown as { unref?: () => void };
    if (handle && typeof handle.unref === 'function') handle.unref();
  }
}

function stopLoops(): void {
  if (rafId !== 0 && hasRaf() && typeof cancelAnimationFrame === 'function') {
    cancelAnimationFrame(rafId);
  }
  rafId = 0;
  if (coarseId !== null) {
    clearInterval(coarseId);
    coarseId = null;
  }
}

function onResync(): void {
  for (const fn of Array.from(resyncSubs)) {
    try {
      fn();
    } catch (error) {
      console.error('[ticker] resync failed', error);
    }
  }
  tick();
}

function listen(): void {
  if (listening || typeof window === 'undefined') return;
  listening = true;
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') onResync();
  });
  window.addEventListener('focus', onResync);
}

export const clock: Clock = {
  now: monoNow,
  wall: () => Date.now(),
  subscribe(fn) {
    listen();
    frameSubs.add(fn);
    ensureLoops();
    return () => {
      frameSubs.delete(fn);
      if (frameSubs.size === 0) stopLoops();
    };
  },
  onResync(fn) {
    listen();
    resyncSubs.add(fn);
    return () => {
      resyncSubs.delete(fn);
    };
  },
};
