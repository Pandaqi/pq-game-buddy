/**
 * Wake Lock, ref-counted. Never claims background operation: if the API is
 * missing the UI says the screen may sleep instead.
 */

interface Sentinel {
  released: boolean;
  release(): Promise<void>;
  addEventListener?(type: 'release', handler: () => void): void;
}

type NavigatorWithWakeLock = Navigator & {
  wakeLock?: { request(type: 'screen'): Promise<Sentinel> };
};

let sentinel: Sentinel | null = null;
let holders = 0;

export function wakeSupported(): boolean {
  return typeof navigator !== 'undefined' && !!(navigator as NavigatorWithWakeLock).wakeLock;
}

async function acquireSentinel(): Promise<void> {
  if (sentinel || typeof document === 'undefined' || document.visibilityState !== 'visible') return;
  if (!wakeSupported()) return;
  try {
    sentinel = await (navigator as NavigatorWithWakeLock).wakeLock!.request('screen');
    sentinel.addEventListener?.('release', () => {
      sentinel = null;
    });
  } catch {
    sentinel = null;
  }
}

export const wake = {
  retain(): void {
    holders += 1;
    if (holders === 1) void acquireSentinel();
  },
  release(): void {
    holders = Math.max(0, holders - 1);
    if (holders > 0) return;
    const current = sentinel;
    sentinel = null;
    if (current && !current.released) void current.release().catch(() => undefined);
  },
};

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && holders > 0) void acquireSentinel();
  });
}
