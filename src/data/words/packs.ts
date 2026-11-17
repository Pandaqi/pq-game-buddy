/**
 * Word packs, one per language. Each list is a hand-curated set of common,
 * everyday words written for this project (see LICENSES.md); it is not a
 * tournament dictionary, so say so in the UI instead of pretending otherwise.
 */

import de from './de';
import en from './en';
import es from './es';
import fr from './fr';
import nl from './nl';

export type WordLang = 'en' | 'nl' | 'de' | 'fr' | 'es';

export interface WordPack {
  code: WordLang;
  name: string;
  words: string[];
  license: string;
  source: string;
}

function parse(text: string): string[] {
  return text
    .split(/\s+/)
    .map((word) => word.trim().toLowerCase())
    .filter((word) => word.length > 1);
}

const RAW: Record<WordLang, { name: string; text: string }> = {
  en: { name: 'English', text: en },
  nl: { name: 'Nederlands', text: nl },
  de: { name: 'Deutsch', text: de },
  fr: { name: 'Français', text: fr },
  es: { name: 'Español', text: es },
};

const cache: Partial<Record<WordLang, WordPack>> = {};

export const WORD_LANGS: WordLang[] = ['en', 'nl', 'de', 'fr', 'es'];

export function wordPack(lang: WordLang): WordPack {
  const cached = cache[lang];
  if (cached) return cached;
  const raw = RAW[lang] ?? RAW.en;
  const pack: WordPack = {
    code: lang,
    name: raw.name,
    words: parse(raw.text),
    license: 'Original word list, CC BY-SA 4.0',
    source: 'Hand-curated for Game Buddy; not an official tournament list',
  };
  cache[lang] = pack;
  return pack;
}
