/**
 * The font gate. Every face the stylesheet names must be a file that exists, and every
 * `:lang()` stack must name a face the stylesheet defines — otherwise a renamed file or a
 * renamed family silently falls back to a system font and nobody notices until a Japanese
 * player sees a different app.
 */

import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

const root = join(import.meta.dir, '..');
const sheet = join(root, 'src', 'core', 'styles', 'fonts.css');
const css = readFileSync(sheet, 'utf8');

interface Face {
  family: string;
  url: string;
}

const faces: Face[] = [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)].map((block) => ({
  family: /font-family:\s*'([^']+)'/.exec(block[1] ?? '')?.[1] ?? '',
  url: /src:\s*url\('([^']+)'\)/.exec(block[1] ?? '')?.[1] ?? '',
}));

/** Each `:lang()` block that sets the CJK tail, with the families it names, in order. */
const cjkStacks: { lang: string; families: string[] }[] = [
  ...css.matchAll(/(:lang\([^)]*\))\s*\{([^}]*)\}/g),
]
  .map((block) => {
    const value = /--font-cjk:\s*([^;]+);/.exec(block[2] ?? '')?.[1] ?? '';
    const families = value
      .split(',')
      .map((part) => part.trim().replace(/^['"]|['"]$/g, ''))
      .filter(Boolean);
    return { lang: block[1] ?? '', families };
  })
  .filter((stack) => stack.families.length > 0);

describe('bundled fonts', () => {
  test('every @font-face is a family and a file', () => {
    expect(faces.length).toBeGreaterThan(0);
    for (const face of faces) {
      expect({ face, empty: face.family === '' || face.url === '' }).toEqual({
        face,
        empty: false,
      });
    }
  });

  test('every @font-face points at a .woff2 that exists', () => {
    const missing: string[] = [];
    for (const face of faces) {
      const path = join(dirname(sheet), face.url);
      if (!face.url.endsWith('.woff2') || !existsSync(path)) missing.push(face.url);
    }
    expect(missing).toEqual([]);
  });

  test('every :lang() CJK stack starts with a bundled face', () => {
    expect(cjkStacks.length).toBeGreaterThanOrEqual(3);
    const declared = new Set(faces.map((face) => face.family));
    const unbundled = cjkStacks
      .filter((stack) => !declared.has(stack.families[0] ?? ''))
      .map((stack) => `${stack.lang} → ${stack.families[0] ?? '(none)'}`);
    expect(unbundled).toEqual([]);
  });

  test('the stylesheet only names files inside its own fonts folder', () => {
    const outside = faces
      .map((face) => relative(join(root, 'src', 'core', 'styles', 'fonts'), join(dirname(sheet), face.url)))
      .filter((path) => path.startsWith('..'));
    // Nothing may escape to a CDN or to another folder: the build copies exactly this
    // directory beside the app, and the single file inlines exactly these bytes.
    expect(outside).toEqual([]);
  });
});
