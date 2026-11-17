/** URL-fragment sharing: base64url, no network, no compression dependency. */

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

/** Full share URL for the current page, or a bare fragment outside a browser. */
export function templateShareUrl(text: string): string {
  const payload = encodeTemplateLink(text);
  if (typeof location === 'undefined') return `#/import/${payload}`;
  const base = `${location.origin}${location.pathname}`;
  return `${base}#/import/${payload}`;
}

/** Share links are convenient but long; warn before copying a huge one. */
export function shareTooLong(text: string): boolean {
  return encodeTemplateLink(text).length > MAX_FRAGMENT;
}
