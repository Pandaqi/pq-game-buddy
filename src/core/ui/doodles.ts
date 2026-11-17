/**
 * Woodland doodles: decorative inline SVG, drawn on the same 24 px grid as the
 * marks. They are placeholders for Tiamo's own illustrations; every colour is a
 * token, so a theme swaps them for free and nothing is fetched.
 */

const LEAF =
  '<path d="M12 21c-5.2-2.6-7.8-7-6.9-12.3C10.4 7.4 16.2 8.4 20 13c-1 5.2-4 7.1-8 8z" fill="var(--accent-soft)" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M8.4 17.4C10 14.2 12.8 11.7 16 10" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>';

const MUSHROOM =
  '<path d="M4.4 11.2c.4-4 3.7-6.6 7.6-6.6s7.2 2.6 7.6 6.6c0 .8-.6 1.2-1.4 1.2H5.8c-.8 0-1.4-.4-1.4-1.2z" fill="var(--accent)" stroke="var(--accent-deep)" stroke-width="1.4" stroke-linejoin="round"/><path d="M9.3 12.4h5.4l.9 6.1a1.7 1.7 0 0 1-1.7 1.9h-3.8a1.7 1.7 0 0 1-1.7-1.9z" fill="var(--surface)" stroke="var(--accent-deep)" stroke-width="1.4" stroke-linejoin="round"/><circle cx="9" cy="9.4" r="1.1" fill="var(--surface)"/><circle cx="14.6" cy="8.2" r="1.4" fill="var(--surface)"/>';

const ACORN =
  '<path d="M6.6 10.4h10.8c.4 4.3-1.8 9.3-5.4 9.3s-5.8-5-5.4-9.3z" fill="var(--accent)" stroke="var(--accent-deep)" stroke-width="1.5" stroke-linejoin="round"/><path d="M6.2 10.2c.3-2.4 2.7-4 5.8-4s5.5 1.6 5.8 4z" fill="var(--accent-deep)" stroke="var(--accent-deep)" stroke-width="1.4" stroke-linejoin="round"/><path d="M12 6.2c0-1.4.8-2.2 2-2.6" fill="none" stroke="var(--accent-deep)" stroke-width="1.5" stroke-linecap="round"/>';

const STAR =
  '<path d="M12 3.4c.8 4.6 1.9 5.7 6.5 6.5-4.6.8-5.7 1.9-6.5 6.5-.8-4.6-1.9-5.7-6.5-6.5 4.6-.8 5.7-1.9 6.5-6.5z" fill="var(--accent-soft)" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><circle cx="18.6" cy="17.4" r="1.6" fill="var(--accent)"/>';

const FIREFLY =
  '<circle cx="12" cy="12" r="2.8" fill="var(--accent)" stroke="currentColor" stroke-width="1.2"/><path d="M12 6.2V3.4M12 20.6v-2.8M6.2 12H3.4M20.6 12h-2.8M8 8 6 6M18 18l-2-2M16 8l2-2M6 18l2-2" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>';

export type DoodleName = 'leaf' | 'mushroom' | 'acorn' | 'star' | 'firefly';

const DOODLES: Record<DoodleName, string> = {
  leaf: LEAF,
  mushroom: MUSHROOM,
  acorn: ACORN,
  star: STAR,
  firefly: FIREFLY,
};

/** One doodle mark, 24 px grid, safe to inline: a trusted build-time constant. */
export function doodle(name: DoodleName): string {
  return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none">${DOODLES[name]}</svg>`;
}

/** The home scene: rolling moss hills, pines, a honey moon and fireflies.
 *  Placeholder art; replace with real illustrations and the layout stays. */
export const HERO_SCENE = `<svg viewBox="0 0 720 260" aria-hidden="true" preserveAspectRatio="xMidYMax slice">
  <circle cx="552" cy="72" r="46" fill="var(--fam-time-wash)"/>
  <circle cx="552" cy="72" r="28" fill="var(--fam-time)" opacity="0.45"/>
  <path d="M0 210c70-26 128-10 190 6s130 18 200-6 140-30 210-4 90 28 120 22v32H0z" fill="var(--fam-track-wash)"/>
  <path d="M0 232c90-18 150 4 230 10s150-16 230-12 160 18 260 4v26H0z" fill="var(--fam-reference-wash)"/>
  <g fill="var(--forest)" opacity="0.9">
    <path d="M120 214l26-62 26 62z"/>
    <path d="M150 226l20-48 20 48z"/>
    <path d="M598 216l24-58 24 58z"/>
  </g>
  <g fill="var(--forest)">
    <rect x="144" y="214" width="5" height="16" rx="2"/>
    <rect x="618" y="216" width="5" height="14" rx="2"/>
  </g>
  <g fill="var(--fam-time)">
    <circle cx="330" cy="150" r="3"/>
    <circle cx="392" cy="118" r="2.4"/>
    <circle cx="272" cy="104" r="2"/>
    <circle cx="470" cy="146" r="2.2"/>
    <circle cx="216" cy="160" r="1.8"/>
  </g>
  <g stroke="var(--fam-time)" stroke-width="1.4" stroke-linecap="round" opacity="0.7">
    <path d="M330 144v-4M324 150h-4M336 150h4M392 112v-4M386 118h-4M398 118h4"/>
  </g>
</svg>`;
