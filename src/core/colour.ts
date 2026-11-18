/**
 * Seat paint: which ink is readable on a seat colour, and the fill that ink is read
 * on. The palette is AA with cream, but a template may name any hex, so this decides
 * per colour instead of per theme and nudges a colour only when neither ink works.
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface SeatPaint {
  /** The colour to paint: the stored seat, unless it needed one small step. */
  fill: string;
  /** The ink token to draw on it, cream or deep. */
  ink: string;
}

/** The two inks, named after the token each one is. Neither is a view's choice. */
export const SEAT_INK_LIGHT = { hex: '#fffaf0', token: 'var(--on-seat)' } as const;
export const SEAT_INK_DEEP = { hex: '#17100a', token: 'var(--on-seat-deep)' } as const;
export const SEAT_AA = 4.5;

const WHITE: Rgb = { r: 255, g: 255, b: 255 };
const BLACK: Rgb = { r: 0, g: 0, b: 0 };
const STEP = 0.04;
const MAX_STEPS = 25;

export function parseHex(text: string): Rgb | null {
  const value = String(text ?? '').trim().toLowerCase();
  const short = /^#([0-9a-f]{3})$/.exec(value);
  if (short) {
    const [r, g, b] = short[1];
    return {
      r: parseInt(r + r, 16),
      g: parseInt(g + g, 16),
      b: parseInt(b + b, 16),
    };
  }
  const long = /^#([0-9a-f]{6})$/.exec(value);
  if (!long) return null;
  return {
    r: parseInt(long[1].slice(0, 2), 16),
    g: parseInt(long[1].slice(2, 4), 16),
    b: parseInt(long[1].slice(4, 6), 16),
  };
}

export function toHex(rgb: Rgb): string {
  const part = (value: number): string =>
    Math.max(0, Math.min(255, Math.round(value)))
      .toString(16)
      .padStart(2, '0');
  return `#${part(rgb.r)}${part(rgb.g)}${part(rgb.b)}`;
}

/** WCAG relative luminance of an sRGB colour. */
export function luminance(rgb: Rgb): number {
  const channel = (value: number): number => {
    const unit = value / 255;
    return unit <= 0.03928 ? unit / 12.92 : Math.pow((unit + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

export function ratioOfLuminance(a: number, b: number): number {
  const light = Math.max(a, b);
  const dark = Math.min(a, b);
  return (light + 0.05) / (dark + 0.05);
}

/** Contrast between two hex colours; 0 when either one cannot be parsed. */
export function contrast(a: string, b: string): number {
  const first = parseHex(a);
  const second = parseHex(b);
  if (!first || !second) return 0;
  return ratioOfLuminance(luminance(first), luminance(second));
}

function mix(from: Rgb, towards: Rgb, amount: number): Rgb {
  return {
    r: from.r + (towards.r - from.r) * amount,
    g: from.g + (towards.g - from.g) * amount,
    b: from.b + (towards.b - from.b) * amount,
  };
}

/**
 * Walk towards one end until this ink reaches AA, measured on the rounded hex the
 * screen will actually paint — an unrounded step can land at 4.49 and read as broken.
 */
function nudgeTowards(rgb: Rgb, towards: Rgb, inkLuminance: number): { hex: string; step: number } | null {
  for (let step = 0; step <= MAX_STEPS; step += 1) {
    const hex = toHex(mix(rgb, towards, step * STEP));
    const painted = parseHex(hex);
    if (!painted) return null;
    if (ratioOfLuminance(luminance(painted), inkLuminance) >= SEAT_AA) return { hex, step };
  }
  return null;
}

const CREAM_LUMINANCE = luminance(parseHex(SEAT_INK_LIGHT.hex) as Rgb);
const DEEP_LUMINANCE = luminance(parseHex(SEAT_INK_DEEP.hex) as Rgb);

/**
 * The fill and ink for one seat colour. Cream on a dark seat, deep on a pale one; a
 * colour that neither ink can carry is nudged the shortest way until one can, because
 * a seat is identity and losing its hue matters less than losing its initials.
 */
export function seatPaint(color: string): SeatPaint {
  const rgb = parseHex(color);
  if (!rgb) return { fill: color, ink: SEAT_INK_LIGHT.token };
  const own = luminance(rgb);
  if (ratioOfLuminance(own, CREAM_LUMINANCE) >= SEAT_AA) {
    return { fill: toHex(rgb), ink: SEAT_INK_LIGHT.token };
  }
  if (ratioOfLuminance(own, DEEP_LUMINANCE) >= SEAT_AA) {
    return { fill: toHex(rgb), ink: SEAT_INK_DEEP.token };
  }
  const darker = nudgeTowards(rgb, BLACK, CREAM_LUMINANCE);
  const lighter = nudgeTowards(rgb, WHITE, DEEP_LUMINANCE);
  if (darker && (lighter === null || darker.step <= lighter.step)) {
    return { fill: darker.hex, ink: SEAT_INK_LIGHT.token };
  }
  if (lighter) return { fill: lighter.hex, ink: SEAT_INK_DEEP.token };
  return { fill: toHex(BLACK), ink: SEAT_INK_LIGHT.token };
}

/** `style` text for a seat element: the paint, plus the ink to use on it. */
export function seatVars(color: string): string {
  const paint = seatPaint(color);
  return `--player: ${paint.fill}; --seat-ink: ${paint.ink}`;
}
