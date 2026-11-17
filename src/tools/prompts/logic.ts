/** Prompt packs: draw, lock, exclude, favourite and designer-mode combinations. */

import type { Rng } from '../../core/rng';

export interface PromptCard {
  pack: string;
  item: string;
}

export interface CustomPack {
  name: string;
  items: string[];
}

/** Draw `count` distinct items from a pool, ignoring locked and excluded ones. */
export function drawFrom(
  pool: string[],
  count: number,
  rng: Rng,
  excluded: string[] = [],
): string[] {
  const blocked = new Set(excluded);
  const available = pool.filter((item) => !blocked.has(item));
  if (!available.length) return [];
  const wanted = Math.max(1, Math.min(count, available.length));
  return rng.shuffle(available).slice(0, wanted);
}

export function parseCustomPacks(text: string): CustomPack[] {
  const packs: CustomPack[] = [];
  let current: CustomPack | null = null;
  for (const raw of String(text ?? '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const heading = line.match(/^\[(.+)\]$/);
    if (heading) {
      current = { name: heading[1].trim(), items: [] };
      packs.push(current);
      continue;
    }
    if (!current) {
      current = { name: 'My pack', items: [] };
      packs.push(current);
    }
    current.items.push(line.replace(/^-\s*/, ''));
  }
  return packs.filter((pack) => pack.items.length);
}

export function summaryOf(cards: PromptCard[], favorites: string[]): string {
  const lines = cards.map((card) => `${card.item} (${card.pack})`);
  if (favorites.length) lines.push(`Favourites: ${favorites.join(', ')}`);
  return lines.length ? lines.join('\n') : 'Nothing drawn yet.';
}
