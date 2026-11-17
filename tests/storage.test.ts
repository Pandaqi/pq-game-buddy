import { describe, expect, test } from 'bun:test';
import { createMemoryAdapter, probeStorage, readJson, writeJson, KEYS } from '../src/core/storage';

function throwingStorage(): Storage {
  return {
    length: 0,
    clear: () => undefined,
    getItem: () => {
      throw new Error('blocked');
    },
    key: () => null,
    removeItem: () => undefined,
    setItem: () => {
      throw new Error('blocked');
    },
  } as unknown as Storage;
}

describe('storage', () => {
  test('memory adapter behaves like storage', () => {
    const adapter = createMemoryAdapter();
    expect(adapter.get('x')).toBeNull();
    expect(adapter.set('x', '1')).toBe(true);
    expect(adapter.get('x')).toBe('1');
    adapter.remove('x');
    expect(adapter.get('x')).toBeNull();
    expect(adapter.kind).toBe('memory');
  });

  test('prefers localStorage when it works', () => {
    const adapter = probeStorage(globalThis as unknown as { localStorage: Storage });
    expect(adapter.kind).toBe('local');
  });

  test('falls back to memory when every store is blocked', () => {
    const blocked = { localStorage: throwingStorage(), sessionStorage: throwingStorage() };
    expect(probeStorage(blocked).kind).toBe('memory');
  });

  test('falls back to sessionStorage when localStorage is blocked', () => {
    const blocked = { localStorage: throwingStorage(), sessionStorage: globalThis.sessionStorage };
    expect(probeStorage(blocked).kind).toBe('session');
  });

  test('json round trip and corrupt data handling', () => {
    writeJson(KEYS.recent, { hello: 'world' });
    expect(readJson(KEYS.recent, { hello: 'none' })).toEqual({ hello: 'world' });
    globalThis.localStorage.setItem(KEYS.recent, 'not json');
    expect(readJson(KEYS.recent, { fallback: true })).toEqual({ fallback: true });
  });
});
