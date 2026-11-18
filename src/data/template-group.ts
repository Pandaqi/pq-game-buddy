/** Stable group for one template text, so the rulebooks can arrive a shelf at a time. */

export const TEMPLATE_GROUPS = 4;

/** FNV-1a: the same id must land in the same group in the generator and in the app. */
export function templateGroup(id: string, groups = TEMPLATE_GROUPS): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < id.length; index += 1) {
    hash ^= id.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) % groups;
}
