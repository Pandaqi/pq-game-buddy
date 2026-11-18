/**
 * Woodland doodles: decorative inline SVG, drawn on the same 24 px grid as the
 * marks. They are placeholders for Tiamo's own illustrations; every colour is a
 * token, so a theme swaps them for free and nothing is fetched.
 */

const LEAF =
  '<path d="M12 21c-5.2-2.6-7.8-7-6.9-12.3C10.4 7.4 16.2 8.4 20 13c-1 5.2-4 7.1-8 8z" fill="var(--accent-soft)" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M8.4 17.4C10 14.2 12.8 11.7 16 10" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>';

const MUSHROOM =
  '<path d="M4.4 11.2c.4-4 3.7-6.6 7.6-6.6s7.2 2.6 7.6 6.6c0 .8-.6 1.2-1.4 1.2H5.8c-.8 0-1.4-.4-1.4-1.2z" fill="var(--accent)" stroke="var(--accent-deep)" stroke-width="1.4" stroke-linejoin="round"/><path d="M9.3 12.4h5.4l.9 6.1a1.7 1.7 0 0 1-1.7 1.9h-3.8a1.7 1.7 0 0 1-1.7-1.9z" fill="var(--surface)" stroke="var(--accent-deep)" stroke-width="1.4" stroke-linejoin="round"/><circle cx="9" cy="9.4" r="1.1" fill="var(--surface)"/><circle cx="14.6" cy="8.2" r="1.4" fill="var(--surface)"/>';

const STAR =
  '<path d="M12 3.4c.8 4.6 1.9 5.7 6.5 6.5-4.6.8-5.7 1.9-6.5 6.5-.8-4.6-1.9-5.7-6.5-6.5 4.6-.8 5.7-1.9 6.5-6.5z" fill="var(--accent-soft)" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><circle cx="18.6" cy="17.4" r="1.6" fill="var(--accent)"/>';

const FIREFLY =
  '<circle cx="12" cy="12" r="2.8" fill="var(--accent)" stroke="currentColor" stroke-width="1.2"/><path d="M12 6.2V3.4M12 20.6v-2.8M6.2 12H3.4M20.6 12h-2.8M8 8 6 6M18 18l-2-2M16 8l2-2M6 18l2-2" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>';

export type DoodleName = 'leaf' | 'mushroom' | 'star' | 'firefly';

const DOODLES: Record<DoodleName, string> = {
  leaf: LEAF,
  mushroom: MUSHROOM,
  star: STAR,
  firefly: FIREFLY,
};

/** One doodle mark, 24 px grid, safe to inline: a trusted build-time constant. */
export function doodle(name: DoodleName): string {
  return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none">${DOODLES[name]}</svg>`;
}
