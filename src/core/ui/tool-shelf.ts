/** The everyday tools on Home, plus the last few the player actually opened. */

import { KEYS, readJson, writeJson } from '../storage';

/** Common enough to earn a tile: a session usually starts with one of these. */
export const CURATED_TOOLS = [
  'timer',
  'dice',
  'score',
  'turns',
  'reveal',
  'pick',
  'rules',
  'prompts',
] as const;

const RECENT_LIMIT = 3;
const SHELF_LIMIT = 10;

export function recentTools(): string[] {
  const raw = readJson<unknown[]>(KEYS.recentTools, []);
  return raw.filter((id): id is string => typeof id === 'string').slice(0, RECENT_LIMIT);
}

export function rememberTool(id: string): void {
  if (!id) return;
  const next = [id, ...recentTools().filter((item) => item !== id)].slice(0, RECENT_LIMIT);
  writeJson(KEYS.recentTools, next);
}

/**
 * Curated first, then recent, without repeats and only for tools this build
 * ships. `showAll` returns the full list in the caller's order.
 */
export function shelfIds(available: string[], recent: string[], showAll: boolean): string[] {
  if (showAll) return available;
  const ordered = [...CURATED_TOOLS, ...recent];
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const id of ordered) {
    if (seen.has(id) || !available.includes(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids.slice(0, SHELF_LIMIT);
}
