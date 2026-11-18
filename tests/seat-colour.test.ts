import { describe, expect, test } from 'bun:test';
import {
  SEAT_AA,
  SEAT_INK_DEEP,
  SEAT_INK_LIGHT,
  contrast,
  parseHex,
  seatPaint,
  toHex,
} from '../src/core/colour';
import { PLAYER_COLORS } from '../src/core/session';
import { PALETTE_COLORS } from '../src/core/template/schema';

const tokenHex = (token: string): string =>
  token === SEAT_INK_DEEP.token ? SEAT_INK_DEEP.hex : SEAT_INK_LIGHT.hex;

describe('seat paint', () => {
  test('every player seat keeps cream ink and clears AA', () => {
    for (const seat of PLAYER_COLORS) {
      const paint = seatPaint(seat);
      expect(paint.fill).toBe(seat.toLowerCase());
      expect(paint.ink).toBe(SEAT_INK_LIGHT.token);
      expect(contrast(paint.fill, tokenHex(paint.ink))).toBeGreaterThanOrEqual(SEAT_AA);
    }
  });

  test('every palette colour a template can name clears AA', () => {
    for (const [name, hex] of Object.entries(PALETTE_COLORS)) {
      const paint = seatPaint(hex);
      const ratio = contrast(paint.fill, tokenHex(paint.ink));
      expect({ name, ratio }).toEqual({ name, ratio: expect.any(Number) });
      expect(ratio).toBeGreaterThanOrEqual(SEAT_AA);
    }
  });

  test('a pale stored seat gets deep ink instead of cream on cream', () => {
    const paint = seatPaint('#ffe066');
    expect(paint.ink).toBe(SEAT_INK_DEEP.token);
    expect(contrast(paint.fill, SEAT_INK_DEEP.hex)).toBeGreaterThanOrEqual(SEAT_AA);
  });

  test('any colour at all ends up readable, nudged when it has to be', () => {
    for (let r = 0; r < 256; r += 15) {
      for (let g = 0; g < 256; g += 15) {
        for (let b = 0; b < 256; b += 15) {
          const hex = toHex({ r, g, b });
          const paint = seatPaint(hex);
          const ratio = contrast(paint.fill, tokenHex(paint.ink));
          if (ratio < SEAT_AA) throw new Error(`${hex} painted ${paint.fill} at ${ratio.toFixed(2)}`);
        }
      }
    }
  });

  test('an unparseable colour is left alone rather than repainted', () => {
    expect(seatPaint('tomato')).toEqual({ fill: 'tomato', ink: SEAT_INK_LIGHT.token });
  });

  test('short hex is read the long way', () => {
    expect(parseHex('#f80')).toEqual({ r: 255, g: 136, b: 0 });
  });
});
