/**
 * Images that arrive with a `.gamebuddy` file. They stay on this device: the
 * template names one with `icon:`, or falls back to the file's own name. Stored
 * as data URLs so a reload, an export or a printed sheet needs no second file.
 *
 * SVG is accepted, but always rendered through `<img>`: scripts inside an SVG do
 * not run in that context, so a contributed image cannot reach the page.
 */

import { KEYS, readJson, writeJson } from '../storage';

export interface TemplateAsset {
  name: string;
  mime: string;
  url: string;
  at: number;
}

const MAX_ONE = 350_000;
const MAX_TOTAL = 1_500_000;
const MIME = new Set(['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp']);
const DATA_URL = /^data:image\/(svg\+xml|png|jpeg|webp);base64,[a-z0-9+/=]+$/i;

/** `Catan.Icon.svg` and `my game.png` both become the name a template can use. */
export function assetName(filename: string): string {
  return filename
    .replace(/\.[^.]+$/, '')
    .replace(/\.icon$/i, '')
    .replace(/[^a-z0-9_-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 40);
}

export function isImageFile(file: { type: string; name: string }): boolean {
  if (MIME.has(file.type)) return true;
  return /\.(svg|png|jpe?g|webp)$/i.test(file.name);
}

export function isThemeFile(name: string): boolean {
  return /\.(gamebuddy-theme|theme)$/i.test(name);
}

export function isTemplateFile(name: string): boolean {
  return /\.(gamebuddy|txt)$/i.test(name);
}

/** A tool file is its own kind: installed before a template that needs it. */
export function isToolFile(name: string): boolean {
  return /\.gamebuddy-tool$/i.test(name);
}

/**
 * JavaScript picked or dropped beside a tool file, which a `[script]` section
 * names with `file:`. It is stored with the definition, never served.
 */
export function isScriptFile(name: string): boolean {
  return /\.js$/i.test(name);
}

/** An exported session resumes a game; it is never parsed as a template. */
export function isSessionFile(name: string): boolean {
  return /\.json$/i.test(name);
}

export function listAssets(): TemplateAsset[] {
  const raw = readJson<unknown[]>(KEYS.templateAssets, []);
  return raw.filter((item): item is TemplateAsset => {
    if (!item || typeof item !== 'object') return false;
    const entry = item as Partial<TemplateAsset>;
    return typeof entry.name === 'string' && typeof entry.url === 'string' && DATA_URL.test(entry.url);
  });
}

export function saveAsset(name: string, mime: string, url: string): boolean {
  if (!name || !MIME.has(mime) || !DATA_URL.test(url) || url.length > MAX_ONE) return false;
  const others = listAssets().filter((item) => item.name !== name);
  if (url.length + others.reduce((sum, item) => sum + item.url.length, 0) > MAX_TOTAL) return false;
  const next = [{ name, mime, url, at: Date.now() }, ...others].slice(0, 24);
  return writeJson(KEYS.templateAssets, next);
}

export function removeAsset(name: string): void {
  writeJson(
    KEYS.templateAssets,
    listAssets().filter((item) => item.name !== name),
  );
}

/** The markup for one stored image, in the same slot as an inline mark. */
export function assetMark(name: string | undefined): string {
  if (!name) return '';
  const key = assetName(name);
  const asset = listAssets().find((item) => item.name === key);
  if (!asset) return '';
  return `<img src="${asset.url}" alt="" aria-hidden="true" decoding="async">`;
}

/** Reads a picked image into storage under its name. Resolves false when refused. */
export function rememberAsset(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    if (!isImageFile(file) || file.size > MAX_ONE) {
      resolve(false);
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => resolve(false);
    reader.onload = () => {
      const url = typeof reader.result === 'string' ? reader.result : '';
      resolve(saveAsset(assetName(file.name), file.type || mimeOf(file.name), url));
    };
    reader.readAsDataURL(file);
  });
}

function mimeOf(name: string): string {
  if (/\.svg$/i.test(name)) return 'image/svg+xml';
  if (/\.png$/i.test(name)) return 'image/png';
  if (/\.webp$/i.test(name)) return 'image/webp';
  return 'image/jpeg';
}
