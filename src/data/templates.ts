/** The template index plus an on-demand loader for the template texts. */

import { bundledTemplates, communityTemplates } from './templates.generated';
import { templateGroup } from './template-group';
import type { TemplateSummary } from './template-summary';

export type { TemplateSummary };

/** One loader per shelf: a preview fetches a quarter of the rulebooks, not all of them. */
const loaders = [
  () => import('./template-text/part-0.generated'),
  () => import('./template-text/part-1.generated'),
  () => import('./template-text/part-2.generated'),
  () => import('./template-text/part-3.generated'),
];

const texts = new Map<string, string>();
const loaded = new Set<number>();

/** Summaries are generated, so this is a plain list: no parsing at start-up. */
export function listTemplates(): TemplateSummary[] {
  return [...bundledTemplates, ...communityTemplates];
}

/**
 * Full text of one bundled or community template. Texts are split across a few
 * chunks by id, so only the shelf that holds this game is pulled in.
 */
export async function templateText(id: string): Promise<string | undefined> {
  if (texts.has(id)) return texts.get(id);
  const group = templateGroup(id);
  if (!loaded.has(group)) {
    const module = await loaders[group]();
    for (const item of module.templateTexts) texts.set(item.id, item.text);
    loaded.add(group);
  }
  return texts.get(id);
}
