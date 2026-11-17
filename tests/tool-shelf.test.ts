import { describe, expect, test } from 'bun:test';
import { CURATED_TOOLS, recentTools, rememberTool, shelfIds } from '../src/core/ui/tool-shelf';
import { KEYS, writeJson } from '../src/core/storage';

const ALL = [...CURATED_TOOLS, 'splits', 'custom', 'demo', 'script'];

describe('tool shelf', () => {
  test('the everyday shelf is curated, then recent, without repeats', () => {
    const ids = shelfIds(ALL, ['splits', 'timer'], false);
    expect(ids.slice(0, 8)).toEqual([...CURATED_TOOLS]);
    expect(ids).toContain('splits');
    expect(ids.filter((id) => id === 'timer')).toHaveLength(1);
  });

  test('tools this build does not ship are ignored', () => {
    expect(shelfIds(ALL, ['ghost'], false)).not.toContain('ghost');
  });

  test('show all keeps the catalogue order', () => {
    expect(shelfIds(ALL, [], true)).toEqual(ALL);
  });

  test('recent tools keep the last three, newest first', () => {
    writeJson(KEYS.recentTools, []);
    for (const id of ['timer', 'dice', 'score', 'pick']) rememberTool(id);
    expect(recentTools()).toEqual(['pick', 'score', 'dice']);
  });
});
