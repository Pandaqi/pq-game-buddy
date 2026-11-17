/**
 * Preset schemas. One declarative schema per tool drives the settings UI,
 * template validation, persistence and "save as template".
 */

import { translate } from '../i18n';

export type FieldSpec =
  | { type: 'enum'; values: string[]; default: string; label?: string }
  | { type: 'boolean'; default: boolean; label?: string }
  | { type: 'number'; default: number; min?: number; max?: number; label?: string }
  | { type: 'duration'; default: string; label?: string }
  | { type: 'string'; default: string; label?: string }
  | { type: 'text'; default: string; label?: string }
  | { type: 'list'; default: string[]; label?: string }
  | { type: 'pairs'; default: Record<string, string | number>; label?: string }
  | { type: 'color'; default: string; label?: string };

export type PresetSchema = Record<string, FieldSpec>;
export type PresetValues = Record<string, unknown>;

export const PALETTE_COLORS: Record<string, string> = {
  red: '#c0392b',
  orange: '#c2631b',
  yellow: '#966f04',
  green: '#3d8b55',
  teal: '#23807f',
  blue: '#2f6fc0',
  purple: '#8464d0',
  pink: '#bd4d8c',
  gray: '#6b7280',
};

export interface CoerceResult {
  ok: boolean;
  value?: unknown;
  message?: string;
}

const DURATION_PART =
  /(\d+(?:\.\d+)?)\s*(ms|min|mins|minute|minutes|m|hr|hrs|hour|hours|h|sec|secs|second|seconds|s)/gi;

/** Parse `500ms`, `90s`, `3m`, `1h30m`, `45` (seconds). Returns null when invalid. */
export function parseDuration(input: string | number): number | null {
  if (typeof input === 'number') return Number.isFinite(input) ? input : null;
  const text = String(input).trim();
  if (!text) return null;
  const minutesColon = text.match(/^(\d+):(\d{1,2})$/);
  if (minutesColon) {
    return Number(minutesColon[1]) * 60000 + Number(minutesColon[2]) * 1000;
  }
  if (/^-?\d+(?:\.\d+)?$/.test(text)) {
    const bare = Number(text);
    return Number.isFinite(bare) ? bare * 1000 : null;
  }
  const sign = text.startsWith('-') ? -1 : 1;
  const body = sign < 0 ? text.slice(1) : text;
  let total = 0;
  let matched = false;
  let consumed = 0;
  DURATION_PART.lastIndex = 0;
  let match = DURATION_PART.exec(body);
  while (match) {
    if (match.index !== consumed) return null;
    consumed = match.index + match[0].length;
    matched = true;
    const amount = Number(match[1]);
    const unit = match[2].toLowerCase();
    if (unit === 'ms') total += amount;
    else if (unit.startsWith('h')) total += amount * 3600000;
    else if (unit.startsWith('m')) total += amount * 60000;
    else total += amount * 1000;
    match = DURATION_PART.exec(body);
  }
  if (!matched || consumed !== body.trim().length) return null;
  return sign * Math.round(total);
}

/** Compact duration text for template output: `90s`, `3m`, `1h30m`, `1.5s`, `250ms`. */
export function formatDurationText(ms: number): string {
  const sign = ms < 0 ? '-' : '';
  let rest = Math.abs(Math.round(ms));
  if (rest === 0) return '0s';
  const hours = Math.floor(rest / 3600000);
  rest -= hours * 3600000;
  const minutes = Math.floor(rest / 60000);
  rest -= minutes * 60000;
  const parts: string[] = [];
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (rest) parts.push(rest % 1000 === 0 ? `${rest / 1000}s` : `${rest}ms`);
  return sign + parts.join('');
}

/** Clock face: `4:59`, `1:04:59`, or `0:04.3` under ten seconds, tenths optional. */
export function formatClock(ms: number, tenths = false): string {
  const clamped = Math.max(-359999000, Math.round(ms));
  const negative = clamped < 0;
  const total = Math.abs(clamped);
  const hours = Math.floor(total / 3600000);
  const minutes = Math.floor((total % 3600000) / 60000);
  const seconds = Math.floor((total % 60000) / 1000);
  const tenth = Math.floor((total % 1000) / 100);
  const pad = (value: number): string => String(value).padStart(2, '0');
  let out: string;
  if (hours > 0) out = `${hours}:${pad(minutes)}:${pad(seconds)}`;
  else if (tenths && total < 10000) out = `${minutes}:${pad(seconds)}.${tenth}`;
  else out = `${minutes}:${pad(seconds)}`;
  return negative ? `-${out}` : out;
}

export function parseBoolean(raw: string): boolean | null {
  const text = raw.trim().toLowerCase();
  if (['yes', 'on', 'true', '1'].includes(text)) return true;
  if (['no', 'off', 'false', '0'].includes(text)) return false;
  return null;
}

/** Split a comma list, honouring double quotes. */
export function splitList(raw: string): string[] {
  const text = String(raw ?? '').trim();
  // `[]` is how an explicitly empty list is written in a template.
  if (!text || text === '[]') return [];
  const out: string[] = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (char === ',' && !quoted) {
      out.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  out.push(current.trim());
  return out.map((item) => item.replace(/^"(.*)"$/, '$1')).filter((item) => item.length > 0);
}

/** Parse `name=value, name2=value2`; numeric values become numbers. */
export function parsePairs(raw: string): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const item of splitList(raw)) {
    const index = item.indexOf('=');
    if (index < 0) {
      out[item.trim()] = 1;
      continue;
    }
    const key = item.slice(0, index).trim();
    const value = item.slice(index + 1).trim();
    if (!key) continue;
    out[key] = /^-?\d+(?:\.\d+)?$/.test(value) ? Number(value) : value;
  }
  return out;
}

export function parseColor(raw: string): string | null {
  const text = raw.trim().toLowerCase();
  if (PALETTE_COLORS[text]) return PALETTE_COLORS[text];
  if (/^#[0-9a-f]{3}$/.test(text) || /^#[0-9a-f]{6}$/.test(text)) return text;
  return null;
}

export function coerceField(spec: FieldSpec, raw: string): CoerceResult {
  const text = raw.trim();
  switch (spec.type) {
    case 'enum': {
      const value = text.toLowerCase().replace(/\s+/g, '-');
      if (spec.values.includes(value)) return { ok: true, value };
      return {
        ok: false,
        message: translate('diag.not-one-of', { text, values: spec.values.join(', ') }),
      };
    }
    case 'boolean': {
      const value = parseBoolean(text);
      if (value === null) return { ok: false, message: translate('diag.not-yes-no', { text }) };
      return { ok: true, value };
    }
    case 'number': {
      const value = Number(text);
      if (!Number.isFinite(value)) {
        return { ok: false, message: translate('diag.not-number', { text }) };
      }
      if (spec.min !== undefined && value < spec.min) {
        return { ok: false, message: translate('diag.below-min', { value, min: spec.min }) };
      }
      if (spec.max !== undefined && value > spec.max) {
        return { ok: false, message: translate('diag.above-max', { value, max: spec.max }) };
      }
      return { ok: true, value };
    }
    case 'duration': {
      const value = parseDuration(text);
      if (value === null) {
        return { ok: false, message: translate('diag.not-duration', { text }) };
      }
      return { ok: true, value };
    }
    case 'list':
      return { ok: true, value: splitList(text) };
    case 'pairs':
      return { ok: true, value: parsePairs(text) };
    case 'color': {
      const value = parseColor(text);
      if (!value) return { ok: false, message: translate('diag.not-colour', { text }) };
      return { ok: true, value };
    }
    case 'text':
    case 'string':
    default: {
      // A quoted single value is unwrapped so hand-written files and older
      // serialized files both mean the same thing.
      const unquoted = /^"([\s\S]*)"$/.test(text) ? text.slice(1, -1) : text;
      return { ok: true, value: unquoted };
    }
  }
}

export function defaultsFor(schema: PresetSchema): PresetValues {
  const values: PresetValues = {};
  for (const [key, spec] of Object.entries(schema)) {
    if (spec.type === 'duration') values[key] = parseDuration(spec.default) ?? 0;
    else if (spec.type === 'list') values[key] = spec.default.slice();
    else if (spec.type === 'pairs') values[key] = { ...spec.default };
    else values[key] = spec.default;
  }
  return values;
}

function editDistance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  let previous = new Array<number>(cols);
  let current = new Array<number>(cols);
  for (let j = 0; j < cols; j += 1) previous[j] = j;
  for (let i = 1; i < rows; i += 1) {
    current[0] = i;
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
    }
    const swap = previous;
    previous = current;
    current = swap;
  }
  return previous[cols - 1];
}

/** Closest schema key within a small edit distance, for "did you mean" hints. */
export function nearestKey(key: string, schema: PresetSchema): string | undefined {
  const target = key.toLowerCase();
  let best: string | undefined;
  let bestScore = Number.POSITIVE_INFINITY;
  for (const candidate of Object.keys(schema)) {
    const score = editDistance(target, candidate.toLowerCase());
    if (score <= 3 && score < bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  return best;
}

/** Merge a preset's keys with defaults; used by tool settings UI and tests. */
export function withDefaults(schema: PresetSchema, values: PresetValues | undefined): PresetValues {
  const base = defaultsFor(schema);
  if (!values) return base;
  for (const key of Object.keys(base)) {
    if (values[key] !== undefined) base[key] = values[key];
  }
  return base;
}
