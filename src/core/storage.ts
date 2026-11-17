/**
 * Storage adapter chain: localStorage, then sessionStorage, then memory.
 * Never throws at boot; reports what it got so the UI can tell the truth.
 */

export type StorageKind = 'local' | 'session' | 'memory';

export interface StorageAdapter {
  kind: StorageKind;
  get(key: string): string | null;
  set(key: string, value: string): boolean;
  remove(key: string): void;
}

export const KEYS = {
  settings: 'pqgb:v1:settings',
  sessions: 'pqgb:v1:sessions',
  session: (id: string): string => `pqgb:v1:session:${id}`,
  recent: 'pqgb:v1:recent',
  plays: 'pqgb:v1:plays',
  favorites: 'pqgb:v1:favorites',
  imports: 'pqgb:v1:imports',
};

function wrap(raw: Storage | null, kind: StorageKind): StorageAdapter | null {
  if (!raw) return null;
  try {
    const probe = '__pqgb_probe__';
    raw.setItem(probe, '1');
    raw.removeItem(probe);
  } catch {
    return null;
  }
  return {
    kind,
    get(key) {
      try {
        return raw.getItem(key);
      } catch {
        return null;
      }
    },
    set(key, value) {
      try {
        raw.setItem(key, value);
        return true;
      } catch {
        return false;
      }
    },
    remove(key) {
      try {
        raw.removeItem(key);
      } catch {
        /* nothing to do */
      }
    },
  };
}

export function createMemoryAdapter(): StorageAdapter {
  const map = new Map<string, string>();
  return {
    kind: 'memory',
    get: (key) => (map.has(key) ? (map.get(key) as string) : null),
    set: (key, value) => {
      map.set(key, value);
      return true;
    },
    remove: (key) => {
      map.delete(key);
    },
  };
}

export function probeStorage(scope: { localStorage?: Storage; sessionStorage?: Storage }): StorageAdapter {
  const local = wrap((scope.localStorage as Storage) ?? null, 'local');
  if (local) return local;
  const session = wrap((scope.sessionStorage as Storage) ?? null, 'session');
  if (session) return session;
  return createMemoryAdapter();
}

export const storage: StorageAdapter = probeStorage(
  typeof globalThis === 'undefined'
    ? {}
    : (globalThis as unknown as { localStorage?: Storage; sessionStorage?: Storage }),
);

/** True when data survives a reload without keeping the tab open. */
export const storagePersistent = storage.kind === 'local';

export function readJson<T>(key: string, fallback: T): T {
  const raw = storage.get(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): boolean {
  try {
    return storage.set(key, JSON.stringify(value));
  } catch {
    return false;
  }
}

export function removeKey(key: string): void {
  storage.remove(key);
}
