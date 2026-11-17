/**
 * QR rendering for share links. The encoder is vendored (MIT, Project Nayuki) and
 * only this module imports it, so the ~1 KB of tables and mathematics arrive in
 * their own chunk when a player asks for a code.
 *
 * The code is deliberately black on white: a scanner needs that contrast, and a
 * theme that turned it cream-on-plum would produce a picture that does not scan.
 */

import { qrcodegen } from './qrcodegen';

export interface QrImage {
  /** Modules per side, including the quiet zone. */
  size: number;
  svg: string;
}

export function qrSvg(text: string): QrImage {
  const qr = qrcodegen.QrCode.encodeText(text, qrcodegen.QrCode.Ecc.LOW);
  const modules = qr.size;
  let path = '';
  for (let y = 0; y < modules; y += 1) {
    let x = 0;
    while (x < modules) {
      if (!qr.getModule(x, y)) {
        x += 1;
        continue;
      }
      let run = 1;
      while (x + run < modules && qr.getModule(x + run, y)) run += 1;
      path += `M${x} ${y}h${run}v1h-${run}z`;
      x += run;
    }
  }
  const size = modules + 2;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" ` +
    `shape-rendering="crispEdges" role="img" aria-label="QR code for this template">` +
    `<rect width="${size}" height="${size}" fill="#ffffff"/>` +
    `<path transform="translate(1 1)" d="${path}" fill="#000000"/></svg>`;
  return { size, svg };
}

/** The largest payload one QR symbol can carry in byte mode at low correction. */
export const QR_MAX_BYTES = 2953;
