/**
 * Template marks: images the player imported arrive at once, the built-in game
 * drawings in their own chunk after first paint. A template with no mark draws
 * an empty slot, never a wrong drawing.
 */

import { assetMark } from '../template/assets';

let render: ((name: string | undefined, id: string | undefined) => string) | null = null;
let pending = false;
let revision = $state(0);

/** Read during render so the list redraws once the mark chunk lands. */
export function templateMarksVersion(): number {
  return revision;
}

/**
 * The mark for a template: an uploaded image with the icon's (or template's)
 * name first, then the drawing stored beside that template.
 */
export function templateMarkLazy(name: string | undefined, id?: string): string {
  const uploaded = assetMark(name) || assetMark(id);
  if (uploaded) return uploaded;
  if (render) return render(name, id);
  return '';
}

export function ensureTemplateMarks(): void {
  if (render || pending) return;
  pending = true;
  void import('../../data/template-icons.generated')
    .then((module) => {
      render = (name, id) => module.templateIcons[name ?? ''] ?? module.templateIcons[id ?? ''] ?? '';
      revision += 1;
    })
    .catch(() => {
      pending = false;
    });
}
