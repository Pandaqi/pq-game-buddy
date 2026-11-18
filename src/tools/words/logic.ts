/** Offline word tools: validity, filters, anagram and rack solvers, letters, Codenames. */

import type { Rng } from '../../core/rng';
import { wordPack, type WordLang } from '../../data/words/packs';

export type WordMode = 'check' | 'filters' | 'anagram' | 'rack' | 'letters' | 'codenames';

export const WORD_MODES: WordMode[] = ['check', 'filters', 'anagram', 'rack', 'letters', 'codenames'];

export interface WordFilters {
  min: number;
  max: number;
  starts: string;
  ends: string;
  contains: string;
  pattern: string;
}

export const EMPTY_FILTERS: WordFilters = { min: 0, max: 0, starts: '', ends: '', contains: '', pattern: '' };

const SCRABBLE_VALUES: Record<string, number> = {
  a: 1, b: 3, c: 3, d: 2, e: 1, f: 4, g: 2, h: 4, i: 1, j: 8, k: 5, l: 1, m: 3,
  n: 1, o: 1, p: 3, q: 10, r: 1, s: 1, t: 1, u: 1, v: 4, w: 4, x: 8, y: 4, z: 10,
};

export function deaccent(text: string): string {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function normalise(word: string): string {
  // Deaccent first: stripping non-letters before that turns "café" into "caf".
  return deaccent(String(word ?? '').toLowerCase().trim()).replace(/[^a-z]/g, '');
}

export function scoreWord(word: string, lang: WordLang): number {
  if (lang !== 'en') return word.length;
  let total = 0;
  for (const letter of word) total += SCRABBLE_VALUES[letter] ?? 0;
  return total;
}

function patternToRegExp(pattern: string): RegExp | null {
  const text = normalise(pattern);
  if (!text) return null;
  const body = text.replace(/_|\?/g, '.').replace(/\*/g, '.*');
  try {
    return new RegExp(`^${body}$`);
  } catch {
    return null;
  }
}

export function matchesFilters(word: string, filters: WordFilters): boolean {
  if (filters.min > 0 && word.length < filters.min) return false;
  if (filters.max > 0 && word.length > filters.max) return false;
  const starts = normalise(filters.starts);
  if (starts && !word.startsWith(starts)) return false;
  const ends = normalise(filters.ends);
  if (ends && !word.endsWith(ends)) return false;
  const contains = normalise(filters.contains);
  if (contains && !word.includes(contains)) return false;
  const pattern = patternToRegExp(filters.pattern);
  if (pattern && !pattern.test(word)) return false;
  return true;
}

export function filterWords(words: string[], filters: WordFilters, limit = 200): string[] {
  const out: string[] = [];
  for (const word of words) {
    if (!matchesFilters(word, filters)) continue;
    out.push(word);
    if (out.length >= limit) break;
  }
  return out.sort((a, b) => a.length - b.length || a.localeCompare(b));
}

export function sortLetters(word: string): string {
  return word.split('').sort().join('');
}

export function countsOf(text: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const letter of text) out[letter] = (out[letter] ?? 0) + 1;
  return out;
}

/** Every dictionary word that can be built from these letters (no reuse). */
export function anagramWords(words: string[], letters: string, limit = 200): string[] {
  const rack = normalise(letters);
  if (!rack) return [];
  const rackCounts = countsOf(rack);
  const out: string[] = [];
  for (const word of words) {
    if (word.length < 2 || word.length > rack.length) continue;
    const counts = countsOf(word);
    let ok = true;
    for (const [letter, count] of Object.entries(counts)) {
      if ((rackCounts[letter] ?? 0) < count) {
        ok = false;
        break;
      }
    }
    if (ok) {
      out.push(word);
      if (out.length >= limit) break;
    }
  }
  return out.sort((a, b) => b.length - a.length || a.localeCompare(b));
}

/** Best-scoring words from a Scrabble-style rack, with optional blanks. */
export function rackWords(
  words: string[],
  rack: string,
  blanks: number,
  lang: WordLang,
  limit = 60,
): { word: string; score: number; exact: boolean }[] {
  const letters = normalise(rack);
  const available = countsOf(letters);
  const out: { word: string; score: number; exact: boolean }[] = [];
  for (const word of words) {
    if (word.length < 2) continue;
    const needed = countsOf(word);
    let missing = 0;
    for (const [letter, count] of Object.entries(needed)) {
      missing += Math.max(0, count - (available[letter] ?? 0));
    }
    if (missing > blanks) continue;
    out.push({ word, score: scoreWord(word, lang), exact: missing === 0 });
    if (out.length >= limit * 3) break;
  }
  return out.sort((a, b) => b.score - a.score || a.word.localeCompare(b.word)).slice(0, limit);
}

const ALPHABETS: Record<WordLang, string> = {
  en: 'etaoinshrdlucmfwypvbgkjqxz',
  nl: 'enairto slgdhkmvpbuwjzfcxyq'.replace(/\s/g, ''),
  de: 'enisrathdulgchmfkobwzvepüj'.replace(/ü/g, 'u'),
  fr: 'esaitnrulodcpmveqfbghjxzèy'.replace(/è/g, 'e'),
  es: 'eaosrnidlctumpbgvyqófhízj'.replace(/[óí]/g, 'o'),
  pt: 'aeosrinmdutclpvgbfhçjxzáâãéêóôõú',
  it: 'eaionlrtscdupmvghfbzqàèéìòù',
  id: 'aeinrstduklmgpbohjwycfzv',
  tr: 'aeinrltdkmsuyboşzgçvhpğcfjöüı',
  vi: 'nhatoiucmgldybvưêôơăâđsxp',
};

/** Weighted letters, following rough language frequency, without repeats. */
export function pickLetters(rng: Rng, lang: WordLang, count: number): string[] {
  const alphabet = ALPHABETS[lang] ?? ALPHABETS.en;
  const out: string[] = [];
  const pool = alphabet.split('');
  for (let index = 0; index < Math.max(1, Math.min(20, count)); index += 1) {
    if (!pool.length) pool.push(...alphabet.split(''));
    const at = rng.int(pool.length);
    out.push(pool[at]);
    pool.splice(at, 1);
  }
  return out;
}

export type CodenamesKey = 'red' | 'blue' | 'neutral' | 'assassin';

export interface CodenamesBoard {
  words: string[];
  key: CodenamesKey[];
  revealed: boolean[];
}

/** 25 words with a 9 / 8 / 7 / 1 key, shuffled together. */
export function codenamesBoard(rng: Rng, words: string[], reveal = false): CodenamesBoard {
  const pool = rng.shuffle(words.filter((word) => word.length > 2)).slice(0, 25);
  while (pool.length < 25) pool.push(`word ${pool.length + 1}`);
  const key: CodenamesKey[] = [
    ...Array.from({ length: 9 }, () => 'red' as CodenamesKey),
    ...Array.from({ length: 8 }, () => 'blue' as CodenamesKey),
    ...Array.from({ length: 7 }, () => 'neutral' as CodenamesKey),
    'assassin',
  ];
  return { words: pool, key: rng.shuffle(key), revealed: pool.map(() => reveal) };
}

export function editDistance(a: string, b: string): number {
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let last = previous[0];
    previous[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const saved = previous[j];
      previous[j] = Math.min(previous[j] + 1, previous[j - 1] + 1, last + (a[i - 1] === b[j - 1] ? 0 : 1));
      last = saved;
    }
  }
  return previous[b.length];
}

export function closeMatches(words: string[], word: string, limit = 5): string[] {
  const target = normalise(word);
  if (!target) return [];
  const scored: { word: string; distance: number }[] = [];
  for (const candidate of words) {
    if (Math.abs(candidate.length - target.length) > 2) continue;
    const distance = editDistance(target, candidate);
    if (distance <= 2 && distance > 0) scored.push({ word: candidate, distance });
  }
  return scored
    .sort((a, b) => a.distance - b.distance || a.word.localeCompare(b.word))
    .slice(0, limit)
    .map((item) => item.word);
}

export function packSize(lang: WordLang): number {
  return wordPack(lang).words.length;
}
