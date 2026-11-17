import { describe, expect, test } from 'bun:test';
import { qrSvg, QR_MAX_BYTES } from '../src/core/qr';
import { qrcodegen } from '../src/core/qr/qrcodegen';

describe('qr sharing', () => {
  test('a short alphanumeric payload fits version 1 and draws a quiet zone', () => {
    const image = qrSvg('HELLO WORLD');
    expect(image.size).toBe(23);
    expect(image.svg).toContain('<svg');
    expect(image.svg).toContain('fill="#000000"');
    expect(image.svg).toContain('aria-label="QR code for this template"');
  });

  test('the finder pattern is where a scanner looks for it', () => {
    const qr = qrcodegen.QrCode.encodeText('HELLO WORLD', qrcodegen.QrCode.Ecc.LOW);
    expect(qr.size).toBe(21);
    expect(qr.getModule(0, 0)).toBe(true);
    expect(qr.getModule(1, 1)).toBe(false);
    expect(qr.getModule(3, 3)).toBe(true);
    expect(qr.getModule(7, 0)).toBe(false);
  });

  test('a longer payload grows the symbol', () => {
    const short = qrSvg('x');
    const long = qrSvg('x'.repeat(180));
    expect(long.size).toBeGreaterThan(short.size);
  });

  test('the same text always draws the same code', () => {
    expect(qrSvg('https://example.com/#/import/abc').svg).toBe(
      qrSvg('https://example.com/#/import/abc').svg,
    );
  });

  test('the byte ceiling matches the encoder', () => {
    expect(QR_MAX_BYTES).toBe(2953);
    expect(() => qrSvg('x'.repeat(QR_MAX_BYTES))).not.toThrow();
  });
});
