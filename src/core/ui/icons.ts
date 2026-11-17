/**
 * The house marks: one 24 px grid, one line weight, round caps, paths drawn a
 * little by hand. Inline strings, no images, no emoji, so they look the same
 * on every OS and arrive with the chunk that uses them.
 */

const MARKS = {
  clock: '<path d="M12.1 3.6a8.4 8.5 0 1 1-.4 17 8.5 8.4 0 0 1 .4-17"/><path d="M12 7.8v4.6l3 1.9"/>',
  stopwatch: '<path d="M12.1 4.2a8 8 0 1 1-.3 16 8 8 0 0 1 .3-16"/><path d="M12 8.4v4.2l2.7 1.7M9.4 2.4h5.4M17.8 6.3l1.7-1.6"/>',
  dice: '<rect x="3.7" y="3.9" width="16.5" height="16.3" rx="4.2"/><circle cx="8.6" cy="8.7" r="1.3" fill="currentColor" stroke="none"/><circle cx="15.5" cy="8.4" r="1.3" fill="currentColor" stroke="none"/><circle cx="12.1" cy="12.2" r="1.3" fill="currentColor" stroke="none"/><circle cx="8.4" cy="15.6" r="1.3" fill="currentColor" stroke="none"/><circle cx="15.6" cy="15.4" r="1.3" fill="currentColor" stroke="none"/>',
  card: '<rect x="7.3" y="3.2" width="10.8" height="14.6" rx="2.4"/><path d="M6.4 6.3H5.3a2 2 0 0 0-2 2v10.4a2 2 0 0 0 2 2h8.6a2 2 0 0 0 2-1.9"/><path d="m12.7 8.6-2.4 2.5 2.4 2.5 2.4-2.5z" fill="currentColor" stroke="none"/>',
  chip: '<path d="M12.2 3.9a8.2 8.2 0 1 1-.4 16.2 8.2 8.2 0 0 1 .4-16.2"/><path d="M12 7.6a4.4 4.4 0 1 1-.2 8.8 4.4 4.4 0 0 1 .2-8.8"/>',
  token: '<path d="m9 4.1 6.1-.3 4.9 4.6-.4 6.2-6 4.6-6.1-.4-3.4-5.2z"/><path d="M9.4 9.2h5.2M9 12.6h5.6"/>',
  bracket: '<path d="M3.4 5.2h4.8v3.9H3.4zM3.5 15.1h4.7v3.8H3.5zM15.9 10.1h4.7v3.9h-4.7z"/><path d="M8.3 7.2h3.9v10h3.7M8.3 17h3.9"/>',
  words: '<path d="M4.2 19.2 8.9 5.1l4.8 14.1M6.2 14.2h5.5"/><path d="m15.8 19.1 2.4-6.8 2.3 6.8"/>',
  sparkle: '<path d="M12 3.4c.7 4.4 1.7 5.4 6 6.1-4.3.7-5.3 1.7-6 6.1-.7-4.4-1.7-5.4-6-6.1 4.3-.7 5.3-1.7 6-6.1z"/><path d="M17.6 15.6c.3 1.7.8 2.2 2.5 2.5-1.7.3-2.2.8-2.5 2.5-.3-1.7-.8-2.2-2.5-2.5 1.7-.3 2.2-.8 2.5-2.5z"/>',
  paw: '<path d="M8.1 6.4a1.9 1.9 0 1 1 0 3.8 1.9 1.9 0 0 1 0-3.8zM15.9 6.4a1.9 1.9 0 1 1 0 3.8 1.9 1.9 0 0 1 0-3.8zM4.8 11.1a1.8 1.8 0 1 1-.1 3.6 1.8 1.8 0 0 1 .1-3.6zM19.2 11.1a1.8 1.8 0 1 1-.1 3.6 1.8 1.8 0 0 1 .1-3.6z"/><path d="M12 12.2c2.3-.1 4.5 2.3 4.4 4.2-.1 1.6-1.6 2.4-4.4 2.4s-4.3-.8-4.4-2.4c-.1-1.9 2.1-4.3 4.4-4.2z"/>',
  flag: '<path d="M6.3 3.6v16.8"/><path d="M6.5 4.3c3.1-1.4 5.9 1.3 9.2.2l2.2-.8-.2 7.3-2.2.8c-3.3 1.1-6.1-1.6-9.2-.2"/>',
  heart: '<path d="M12.1 20.1S4.8 15.5 4.9 10.5A3.9 3.9 0 0 1 12 8.1a3.9 3.9 0 0 1 7.1 2.4c.1 5-7 9.6-7 9.6z"/>',
  key: '<path d="M9.3 19.6a4.7 4.7 0 1 1 0-9.4 4.7 4.7 0 0 1 0 9.4z"/><path d="m12.9 13.9 7.2-7.1M17.2 9.6l2.2 2.2M15.1 11.7l2.1 2.1"/>',
  eye: '<path d="M2.6 12.1C4.6 8.1 8.2 5.8 12 5.8s7.4 2.3 9.4 6.3c-2 4-5.6 6.3-9.4 6.3S4.6 16.1 2.6 12.1z"/><path d="M12 9.4a2.7 2.7 0 1 1 0 5.4 2.7 2.7 0 0 1 0-5.4z"/>',
  book: '<path d="M4.3 5.7A2.4 2.4 0 0 1 6.7 3.3h12.9v14.4H6.7a2.4 2.4 0 0 0-2.4 2.4z"/><path d="M4.5 18.4a2.4 2.4 0 0 1 2.4-2.3h12.7v4.9H6.9a2.4 2.4 0 0 1-2.4-2.6z"/><path d="M8 7.2h7.9M8 10.9h5.6"/>',
  scroll: '<path d="M6.4 3.8h9.2l3.9 3.8v12.3H6.4z"/><path d="M9.3 9.8h6.1M9.3 13.6h6.1M9.3 17.2h3.3"/>',
  sheet: '<path d="M5.2 3.7h13.5v16.5H5.2z"/><path d="M8 8.1h7.9M8 12h4.8M8 15.9h7.9"/>',
  sound: '<path d="M4.2 9.4h3.2l4.3-3.6v12.4l-4.3-3.6H4.2z"/><path d="M15.1 9.1a4.2 4.2 0 0 1 0 5.8M17.6 6.7a7.6 7.6 0 0 1 0 10.6"/>',
  notes: '<path d="M9.8 17.6V6.2l8-1.9v11" /><ellipse cx="7.1" cy="18" rx="2.8" ry="2.4"/><ellipse cx="15.1" cy="16.2" rx="2.8" ry="2.4"/>',
  muted: '<path d="M4.2 9.4h3.2l4.3-3.6v12.4l-4.3-3.6H4.2z"/><path d="m15.4 9.6 4.2 4.4M19.6 9.6l-4.2 4.4"/>',
  gear: '<path d="M12 8.6a3.4 3.4 0 1 1-.1 6.8 3.4 3.4 0 0 1 .1-6.8z"/><path d="M12 3.4v2.2M12 18.4v2.2M4.6 12H6.8M17.2 12h2.2M6.9 6.9l1.6 1.6M15.5 15.5l1.6 1.6M17.1 6.9l-1.6 1.6M8.5 15.5l-1.6 1.6"/>',
} as const;

export type MarkName = keyof typeof MARKS;

/** The shared drawing rules live here so a new mark cannot drift in weight. */
export function mark(name: MarkName): string {
  return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${MARKS[name]}</svg>`;
}
