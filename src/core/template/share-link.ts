/** URL-fragment sharing: base64url, no network, no compression dependency. */

import { routeTo } from '../router';

const MAX_FRAGMENT = 12000;

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64(text: string): Uint8Array {
  const padded = text.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((text.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export function encodeTemplateLink(text: string): string {
  return toBase64(new TextEncoder().encode(String(text ?? '')));
}

export function decodeTemplateLink(payload: string): string | null {
  try {
    const bytes = fromBase64(String(payload ?? ''));
    const text = new TextDecoder().decode(bytes);
    return text.trim() ? text : null;
  } catch {
    return null;
  }
}

/**
 * The app's own root, so a copied link points at the app instead of at the page it was
 * copied from: on `/game-buddy/score/` the pathname already names a page, and appending
 * a route to it would double it. A site page carries the answer the build already used
 * for its asset paths, as `data-root` (`../`, `../../`); everywhere else the current
 * directory is the root.
 */
function appRoot(): string {
  const declared = typeof document === 'undefined' ? '' : (document.body?.dataset.root ?? '');
  return new URL(declared || './', location.href).href;
}

/** Full share URL for the current app, or a bare fragment outside a browser. */
export function templateShareUrl(text: string): string {
  const payload = encodeTemplateLink(text);
  if (typeof location === 'undefined') return `#/import/${payload}`;
  return `${appRoot()}#/import/${payload}`;
}

/**
 * Full URL for one bundled template by id. The text stays in the build, so this is a
 * short, stable link where a share link would be kilobytes of base64.
 */
export function templateIdUrl(id: string): string {
  const fragment = routeTo({ name: 'template', id });
  if (typeof location === 'undefined') return fragment;
  return `${appRoot()}${fragment}`;
}

/** Full share URL for one tool file: same payload rules, a different route. */
export function toolFileShareUrl(text: string): string {
  const payload = encodeTemplateLink(text);
  if (typeof location === 'undefined') return `#/toolfile/${payload}`;
  return `${appRoot()}#/toolfile/${payload}`;
}

/** Share links are convenient but long; warn before copying a huge one. */
export function shareTooLong(text: string): boolean {
  return encodeTemplateLink(text).length > MAX_FRAGMENT;
}
