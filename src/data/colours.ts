/**
 * The one colour list. A seat and a template's `colour = green` are the same green,
 * so the palette lives here once instead of drifting into two near-identical sets.
 * Every value clears AA against cream ink (docs/STYLE.md §1); core/colour.ts still
 * chooses ink per colour, because a template may write any hex it likes.
 */

export const COLOURS = {
  red: '#c0392b',
  blue: '#2f6fc0',
  green: '#357a4a',
  orange: '#a8540f',
  purple: '#7452c4',
  teal: '#23807f',
  pink: '#ad3f7e',
  yellow: '#876100',
  gray: '#6b7280',
} as const;

export type ColourName = keyof typeof COLOURS;

/**
 * Seat order, not the object order: P1 is red, P2 is blue, and chairs are handed out
 * in this sequence, so reordering this list reassigns everyone's colour.
 */
export const SEAT_ORDER: ColourName[] = [
  'red',
  'blue',
  'green',
  'orange',
  'purple',
  'teal',
  'pink',
  'yellow',
  'gray',
];
