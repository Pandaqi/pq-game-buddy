/** Templates the user pasted or opened, kept locally so they can pick them up again. */

import { KEYS, readJson, writeJson } from './storage';

export interface RecentImport {
  name: string;
  text: string;
  at: number;
}

const LIMIT = 5;
const MAX_BYTES = 20000;

export function listRecentImports(): RecentImport[] {
  const raw = readJson<unknown[]>(KEYS.imports, []);
  return raw
    .filter((item): item is RecentImport => {
      if (!item || typeof item !== 'object') return false;
      const entry = item as Partial<RecentImport>;
      return typeof entry.text === 'string' && entry.text.trim().length > 0;
    })
    .map((entry) => ({
      name: typeof entry.name === 'string' && entry.name.trim() ? entry.name.trim() : 'Imported template',
      text: entry.text,
      at: Number(entry.at) || 0,
    }))
    .sort((a, b) => b.at - a.at)
    .slice(0, LIMIT);
}

export function rememberImport(text: string, name: string): void {
  const clean = String(text ?? '');
  if (!clean.trim() || clean.length > MAX_BYTES) return;
  const entry: RecentImport = {
    name: String(name ?? '').trim() || 'Imported template',
    text: clean,
    at: Date.now(),
  };
  const next = [entry, ...listRecentImports().filter((item) => item.text !== clean)].slice(0, LIMIT);
  writeJson(KEYS.imports, next);
}

export function clearRecentImports(): void {
  writeJson(KEYS.imports, []);
}
