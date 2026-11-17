/**
 * Language state and lookup, as plain TypeScript. Every language, English
 * included, is a chunk: no dictionary is compiled into the start-up and nothing
 * is ever fetched.
 *
 * The parser, the theme reader and the CLI scripts use these words, and logic
 * never takes a rune, so this module holds no reactivity at all. The view layer
 * wraps it in `i18n.svelte.ts`, which is what a component or a tool imports.
 */

import { DEFAULT_LANGUAGE, languageInfo, type LanguageInfo } from './langs';
import { coreLocaleLoaders, toolTextLoaders } from './locales/registry.generated';

export type Dict = Record<string, string>;

/** What a view or a tool calls: a key, optional vars, optional fallback. */
export type Translate = (
  key: string,
  vars?: Record<string, string | number>,
  fallback?: string,
) => string;

/** Loaded dictionaries, per language. Empty until the boot load lands. */
const core: Record<string, Dict> = {};
const toolText: Record<string, Dict> = {};

let active = DEFAULT_LANGUAGE;
let listener: (() => void) | null = null;

/** The view layer subscribes once, so a screen redraws when a chunk lands. */
export function onChange(fn: () => void): void {
  listener = fn;
}

export function language(): string {
  return active;
}

/** The languages this particular build carries, the default one first. */
export function availableLanguages(): LanguageInfo[] {
  const ids = Object.keys(coreLocaleLoaders).sort();
  const ordered = ids.includes(DEFAULT_LANGUAGE)
    ? [DEFAULT_LANGUAGE, ...ids.filter((id) => id !== DEFAULT_LANGUAGE)]
    : ids;
  return ordered.map((id) => languageInfo(id) ?? { id, label: id, english: id });
}

/**
 * Called by a tool module once, with its own `locales/en.ts`. English tool words
 * ride in the tool's chunk; there is no aggregated English tool chunk, so a
 * language nobody picked never pays for text it cannot show.
 */
export function registerToolStrings(toolId: string, dict: Dict): void {
  const merged = (toolText[DEFAULT_LANGUAGE] ??= {});
  for (const [key, value] of Object.entries(dict)) merged[`${toolId}.${key}`] = value;
}

/** Called when a language's tool-text chunk lands; keys are already namespaced. */
export function registerToolText(languageId: string, dict: Dict): void {
  toolText[languageId] = { ...(toolText[languageId] ?? {}), ...dict };
}

/**
 * The active language only. There is no English safety net underneath: the gate
 * in `tests/i18n.test.ts` proves every shipped language carries every key, and
 * `fallback` covers text that arrives with data rather than from a dictionary.
 */
function resolve(languageId: string, key: string): string | undefined {
  return core[languageId]?.[key] ?? toolText[languageId]?.[key];
}

/**
 * `fallback` is for text that arrives with data rather than from a dictionary —
 * a tool's own title, for instance, which the manifest already carries.
 */
export function translate(
  key: string,
  vars?: Record<string, string | number>,
  fallback?: string,
): string {
  const template = resolve(active, key) ?? fallback ?? key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

export function hasKey(key: string): boolean {
  return resolve(active, key) !== undefined;
}

/**
 * A tool's own name and blurb, from its locale file, falling back to the
 * English metadata the manifest already carries.
 */
export function toolTitle(id: string, fallback: string): string {
  return translate(`${id}.title`, undefined, fallback);
}

export function toolBlurb(id: string, fallback: string): string {
  return translate(`${id}.blurb`, undefined, fallback);
}

/** Resolves to false when this build does not carry the language. */
async function load(languageId: string): Promise<boolean> {
  if (core[languageId]) return true;
  const loadCore = coreLocaleLoaders[languageId];
  if (!loadCore) return false;
  try {
    core[languageId] = (await loadCore()).default;
  } catch {
    return false;
  }
  const loadTools = toolTextLoaders[languageId];
  if (loadTools) {
    try {
      registerToolText(languageId, (await loadTools()).default);
    } catch {
      /* the tool text is missing: those tools then show the key, which the gate forbids */
    }
  }
  return true;
}

/** Switches language, loading its chunks first. False when the build lacks it. */
export async function setLanguage(languageId: string): Promise<boolean> {
  const ok = await load(languageId);
  if (!ok) return false;
  active = languageId;
  if (typeof document !== 'undefined') document.documentElement.lang = languageId;
  listener?.();
  return true;
}

/**
 * Boot path: load a language before the first paint. The stored choice wins; if
 * this build does not carry it, the default is tried, then anything it does
 * carry. Resolves to the language that is actually active.
 */
export async function startLanguage(languageId: string): Promise<string> {
  const wanted = [languageId, DEFAULT_LANGUAGE, ...Object.keys(coreLocaleLoaders)];
  for (const id of wanted) {
    if (await setLanguage(id)) return id;
  }
  return active;
}
