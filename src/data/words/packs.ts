/**
 * Word packs, one per language, each its own lazy chunk. A list is a hand-curated set of
 * common, everyday words written for this project (see LICENSES.md); it is not a
 * tournament dictionary, so say so in the UI instead of pretending otherwise.
 */

import { languageInfo } from '../../core/langs';

export type WordLang = 'en' | 'nl' | 'de' | 'fr' | 'es' | 'pt' | 'it' | 'id' | 'tr' | 'vi';

export interface WordPack {
  code: WordLang;
  name: string;
  words: string[];
  license: string;
  source: string;
}

export const WORD_PACK_LICENSE = 'Original word list, CC BY-SA 4.0';

export const WORD_LANGS: WordLang[] = ['en', 'nl', 'de', 'fr', 'es', 'pt', 'it', 'id', 'tr', 'vi'];

const LOADERS: Record<WordLang, () => Promise<{ default: string }>> = {
  en: () => import('./en'),
  nl: () => import('./nl'),
  de: () => import('./de'),
  fr: () => import('./fr'),
  es: () => import('./es'),
  pt: () => import('./pt'),
  it: () => import('./it'),
  id: () => import('./id'),
  tr: () => import('./tr'),
  vi: () => import('./vi'),
};

const cache: Partial<Record<WordLang, WordPack>> = {};

/** The name in the language's own words, from the one list of languages the app keeps. */
export function packName(lang: WordLang): string {
  return languageInfo(lang)?.label ?? 'English';
}

export function cachedPack(lang: WordLang): WordPack | undefined {
  return cache[lang];
}

export function parseWords(text: string): string[] {
  // A pack is edited by appending, so the same word can be written twice; keep the
  // first one and keep the count the screen shows honest.
  // Japanese and Chinese write without spaces, so a CJK pack separates its words with
  // the ideographic comma or a newline and a single character can be a whole word.
  const cjk = /[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff\uac00-\ud7a3]/;
  const seen = new Set<string>();
  for (const word of text.split(/[\s、]+/)) {
    const clean = word.trim().toLowerCase();
    if (clean.length > 1 || (clean.length === 1 && cjk.test(clean))) seen.add(clean);
  }
  return [...seen];
}

/**
 * A pack is a chunk of its own, so it arrives after the view does: the tool shows its
 * frame at once and fills in the count when the words land. Ten packs in one chunk is
 * what used to cap every list at a few hundred words.
 */
export async function loadWordPack(lang: WordLang): Promise<WordPack> {
  const ready = cache[lang];
  if (ready) return ready;
  const raw = await (LOADERS[lang] ?? LOADERS.en)();
  const pack: WordPack = {
    code: lang,
    name: packName(lang),
    words: parseWords(raw.default),
    license: WORD_PACK_LICENSE,
    source: 'Hand-curated for Game Buddy; not an official tournament list',
  };
  cache[lang] = pack;
  return pack;
}
