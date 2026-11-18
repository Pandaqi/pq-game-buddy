/**
 * How a saved game name is said. A one-tool session, the continue tile and a
 * play-log entry keep the tool's id, so the words are looked up again instead of
 * freezing the language they were written in.
 *
 * The language is an argument, not a reactive import: a view passes the tracked
 * one, so a switch redraws it, and plain logic passes the active one.
 */

import { translateIn } from './i18n';
import { manifest } from './manifest.generated';

/**
 * A saved name in a named language. A tool id is translated, with the manifest's
 * English title underneath as a stable fallback; any other text is already a name.
 */
export function gameName(languageId: string, toolId: string | undefined, saved: string): string {
  if (!toolId) return saved;
  const english = manifest.find((module) => module.id === toolId)?.title;
  return translateIn(languageId, `${toolId}.title`, undefined, english ?? saved);
}
