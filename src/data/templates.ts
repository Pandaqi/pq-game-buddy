/** The template index plus an on-demand loader for the template texts. */

import { bundledTemplates } from './templates.generated';
import type { TemplateSummary } from './template-summary';

export type { TemplateSummary };

let texts: Map<string, string> | null = null;

/** Summaries are generated, so this is a plain list: no parsing at start-up. */
export function listTemplates(): TemplateSummary[] {
  return bundledTemplates;
}

/**
 * Full text of one bundled template. All 61 texts live in their own chunk, which
 * only a real "start this game" (or the gallery and editor) pulls in.
 */
export async function templateText(id: string): Promise<string | undefined> {
  if (!texts) {
    const module = await import('./template-text.generated');
    texts = new Map(module.templateTexts.map((item) => [item.id, item.text]));
  }
  return texts.get(id);
}
