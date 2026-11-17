import { beforeEach, describe, expect, test } from 'bun:test';
import { clearRecentImports, listRecentImports, rememberImport } from '../src/core/recent-imports';
import { parseSessionFile } from '../src/core/session';

beforeEach(() => {
  clearRecentImports();
});

describe('recent imports', () => {
  test('remembers the newest text first and de-duplicates', () => {
    rememberImport('[game]\nname: One', 'One');
    rememberImport('[game]\nname: Two', 'Two');
    rememberImport('[game]\nname: One', 'One again');
    const list = listRecentImports();
    expect(list).toHaveLength(2);
    expect(list[0].name).toBe('One again');
    expect(list[1].name).toBe('Two');
  });

  test('ignores empty text and fills in a default name', () => {
    rememberImport('   ', 'Empty');
    expect(listRecentImports()).toEqual([]);
    rememberImport('[game]\nname: X', '   ');
    expect(listRecentImports()[0].name).toBe('Imported template');
  });

  test('keeps at most five imports', () => {
    for (let index = 0; index < 8; index += 1) {
      rememberImport(`[game]\nname: Game ${index}`, `Game ${index}`);
    }
    expect(listRecentImports()).toHaveLength(5);
    expect(listRecentImports()[0].name).toBe('Game 7');
  });
});

describe('session files', () => {
  const record = { id: 's1', gameName: 'Catan', players: [{ name: 'Ada' }], instances: [] };

  test('reads the wrapped export and a bare record', () => {
    expect(parseSessionFile(JSON.stringify({ version: 1, session: record }))?.gameName).toBe('Catan');
    expect(parseSessionFile(JSON.stringify(record))?.gameName).toBe('Catan');
  });

  test('junk and other JSON are refused, not thrown', () => {
    expect(parseSessionFile('[game]\nname: Catan')).toBeNull();
    expect(parseSessionFile('{"hello":1}')).toBeNull();
    expect(parseSessionFile('{ broken')).toBeNull();
  });
});
