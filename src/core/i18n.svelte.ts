/**
 * The reactive face of `core/i18n.ts`. Reading any of these in a view is what
 * makes the screen redraw when a language chunk lands; the plain module holds
 * the words, and the parser and the CLI import that instead, so logic never
 * needs a rune.
 */

import {
  hasKey as hasKeyRaw,
  language as currentLanguage,
  onChange,
  toolBlurb as toolBlurbRaw,
  toolTitle as toolTitleRaw,
  translate,
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

/** Bumped whenever a chunk lands, so every read below is a tracked dependency. */
let revision = $state(0);
onChange(() => {
  revision += 1;
});

export function t(key: string, vars?: Record<string, string | number>, fallback?: string): string {
  void revision;
  return translate(key, vars, fallback);
}

export function language(): string {
  void revision;
  return currentLanguage();
}

export function hasKey(key: string): boolean {
  void revision;
  return hasKeyRaw(key);
}

export function toolTitle(id: string, fallback: string): string {
  void revision;
  return toolTitleRaw(id, fallback);
}

export function toolBlurb(id: string, fallback: string): string {
  void revision;
  return toolBlurbRaw(id, fallback);
}
