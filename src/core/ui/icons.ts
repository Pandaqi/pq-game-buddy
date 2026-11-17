/**
 * The shell's own marks: sound, mute, the sound board, settings and language.
 * Everything else owns its drawing: a tool keeps its icon in its folder, a
 * template keeps its `.icon.svg` beside the file.
 */

const MARKS = {
  sound:
    '<path d="M4.2 9.4h3.2l4.3-3.6v12.4l-4.3-3.6H4.2z"/><path d="M15.1 9.1a4.2 4.2 0 0 1 0 5.8M17.6 6.7a7.6 7.6 0 0 1 0 10.6"/>',
  notes:
    '<path d="M9.8 17.6V6.2l8-1.9v11" /><ellipse cx="7.1" cy="18" rx="2.8" ry="2.4"/><ellipse cx="15.1" cy="16.2" rx="2.8" ry="2.4"/>',
  muted:
    '<path d="M4.2 9.4h3.2l4.3-3.6v12.4l-4.3-3.6H4.2z"/><path d="m15.4 9.6 4.2 4.4M19.6 9.6l-4.2 4.4"/>',
  gear: '<path d="M12 8.6a3.4 3.4 0 1 1-.1 6.8 3.4 3.4 0 0 1 .1-6.8z"/><path d="M12 3.4v2.2M12 18.4v2.2M4.6 12H6.8M17.2 12h2.2M6.9 6.9l1.6 1.6M15.5 15.5l1.6 1.6M17.1 6.9l-1.6 1.6M8.5 15.5l-1.6 1.6"/>',
  // Two meridians and one equator: a globe, not a letter.
  language:
    '<circle cx="12" cy="12" r="8.2"/><path d="M3.8 12h16.4M12 3.8c2.6 2.2 2.6 14.2 0 16.4M12 3.8c-2.6 2.2-2.6 14.2 0 16.4"/>',
} as const;

export type MarkName = keyof typeof MARKS;

/** The shared drawing rules live here so a new mark cannot drift in weight. */
export function mark(name: MarkName): string {
  return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${MARKS[name]}</svg>`;
}
