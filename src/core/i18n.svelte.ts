/**
 * The reactive face of `core/i18n.ts`. The active language lives here as state,
 * so reading it from a view is what redraws the screen when a chunk lands; the
 * plain module holds the words, and the parser and the CLI import that instead,
 * so logic never needs a rune.
 */

import {
  language as currentLanguage,
  onChange,
  seatNameIn,
  translateIn,
  type Dict,
  type Translate,
} from './i18n';

export type { Dict, Translate };
export {
  availableLanguages,
  registerToolStrings,
  registerToolText,
  setLanguage,
  startLanguage,
} from './i18n';

/**
 * The language as reactive state. Every read below passes it into the lookup,
 * which is the read the compiler keeps: a bare `void revision;` statement is
 * elided, so it tracked nothing and a switch left the current screen in the old
 * language until something else redrew it.
 */
let active = $state(currentLanguage());
onChange(() => {
  active = currentLanguage();
});

export function language(): string {
  return active;
}

export function t(key: string, vars?: Record<string, string | number>, fallback?: string): string {
  return translateIn(active, key, vars, fallback);
}

export function toolTitle(id: string, fallback: string): string {
  return translateIn(active, `${id}.title`, undefined, fallback);
}

export function toolBlurb(id: string, fallback: string): string {
  return translateIn(active, `${id}.blurb`, undefined, fallback);
}

/** A stored name that may be a generated seat: blank plus a seat is said here. */
export function seatName(seat: number | undefined, name: string): string {
  return seatNameIn(active, seat, name);
}
