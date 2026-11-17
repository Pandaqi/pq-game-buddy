/**
 * `.gamebuddy-theme`: a handful of validated design tokens, written by the player.
 * Applied as custom properties so no view has to know a theme exists.
 */

export interface ThemeDiagnostic {
  line: number;
  severity: 'error' | 'warning';
  message: string;
}

export interface Theme {
  name: string;
  /** Light values, keyed by theme key (not by CSS property). */
  values: Record<string, string>;
  /** Values that only apply in dark mode, from `dark-<key>` lines. */
  dark: Record<string, string>;
  /** Chrome the shell should hide: sound, mute, settings. */
  hide: string[];
  diagnostics: ThemeDiagnostic[];
}

type TokenKind = 'color' | 'length' | 'font';

interface TokenSpec {
  kind: TokenKind;
  prop: string;
}

const FAMILIES = ['randomize', 'time', 'track', 'reveal', 'reference', 'flow'];

const TOKENS: Record<string, TokenSpec> = {
  paper: { kind: 'color', prop: '--paper' },
  surface: { kind: 'color', prop: '--surface' },
  'surface-2': { kind: 'color', prop: '--surface-2' },
  field: { kind: 'color', prop: '--field' },
  ink: { kind: 'color', prop: '--ink' },
  'text-dim': { kind: 'color', prop: '--text-dim' },
  'text-faint': { kind: 'color', prop: '--text-faint' },
  line: { kind: 'color', prop: '--line' },
  forest: { kind: 'color', prop: '--forest' },
  glow: { kind: 'color', prop: '--glow' },
  shade: { kind: 'color', prop: '--shade' },
  danger: { kind: 'color', prop: '--danger' },
  'danger-soft': { kind: 'color', prop: '--danger-soft' },
  warning: { kind: 'color', prop: '--warning' },
  success: { kind: 'color', prop: '--success' },
  focus: { kind: 'color', prop: '--focus' },
  'on-accent': { kind: 'color', prop: '--on-accent' },
  'on-seat': { kind: 'color', prop: '--on-seat' },
  radius: { kind: 'length', prop: '--radius' },
  'radius-small': { kind: 'length', prop: '--radius-sm' },
  'radius-large': { kind: 'length', prop: '--radius-lg' },
  'radius-card': { kind: 'length', prop: '--radius-card' },
  'font-display': { kind: 'font', prop: '--font-display' },
  'font-body': { kind: 'font', prop: '--font-body' },
};

for (const family of FAMILIES) {
  TOKENS[`fam-${family}`] = { kind: 'color', prop: `--fam-${family}` };
  TOKENS[`fam-${family}-deep`] = { kind: 'color', prop: `--fam-${family}-deep` };
  TOKENS[`fam-${family}-wash`] = { kind: 'color', prop: `--fam-${family}-wash` };
}

/**
 * Chrome names a theme may hide. Settings is deliberately absent: it is the only
 * page that can remove a theme, so hiding its door would lock the player out.
 */
export const HIDE_CHROME = ['sound', 'mute'] as const;

const COLOR =
  /^(#[0-9a-f]{3}|#[0-9a-f]{6}|#[0-9a-f]{8}|rgba?\([0-9.,%\s/]+\)|hsla?\([0-9.,%\s/deg]+\)|transparent|[a-z]{3,24})$/i;
const LENGTH = /^(0|[0-9]{1,3}(px|rem))$/;
const FONT = /^[A-Za-z0-9 ,'"_\-]{1,120}$/;
const UNSAFE = /[;{}@\\]|url\s*\(|expression\s*\(/i;

function invalidReason(kind: TokenKind): string {
  if (kind === 'color') return 'Use a hex colour such as #fdf6e3, or rgb(), hsl() or transparent';
  if (kind === 'length') return 'Use a size such as 16px or 1rem, or 0';
  return 'Use a font stack such as Dosis, system-ui, sans-serif';
}

function validValue(kind: TokenKind, value: string): boolean {
  if (!value || value.length > 120 || UNSAFE.test(value)) return false;
  if (kind === 'color') return COLOR.test(value);
  if (kind === 'length') return LENGTH.test(value);
  return FONT.test(value);
}

function tokenSpec(key: string): TokenSpec | null {
  return TOKENS[key] ?? null;
}

/**
 * Parse a theme file. Unknown keys warn, bad values are left out and reported with
 * their line, and everything that did validate is applied: a typo never blanks the app.
 */
export function parseTheme(text: string): Theme {
  const theme: Theme = { name: '', values: {}, dark: {}, hide: [], diagnostics: [] };
  const seen = new Set<string>();
  const lines = String(text ?? '').split(/\r?\n/);

  lines.forEach((raw, index) => {
    const line = index + 1;
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    const cut = trimmed.indexOf(':');
    if (cut < 0) {
      theme.diagnostics.push({
        line,
        severity: 'error',
        message: 'Each line needs a key and a value, like paper: #fdf6e3',
      });
      return;
    }

    const key = trimmed.slice(0, cut).trim().toLowerCase();
    const value = trimmed.slice(cut + 1).trim();

    if (key === 'name') {
      theme.name = value.slice(0, 60);
      return;
    }

    if (key === 'hide-chrome') {
      const names = value
        .split(',')
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean);
      for (const name of names) {
        if (name === 'settings') {
          theme.diagnostics.push({
            line,
            severity: 'warning',
            message: 'Settings cannot be hidden: that page is how a theme is removed.',
          });
          continue;
        }
        if (!(HIDE_CHROME as readonly string[]).includes(name)) {
          theme.diagnostics.push({
            line,
            severity: 'warning',
            message: `There is no "${name}" button to hide. Try sound or mute.`,
          });
          continue;
        }
        if (!theme.hide.includes(name)) theme.hide.push(name);
      }
      return;
    }

    const dark = key.startsWith('dark-');
    const plain = dark ? key.slice(5) : key;
    const spec = tokenSpec(plain);

    if (!spec) {
      theme.diagnostics.push({
        line,
        severity: 'warning',
        message: `Unknown theme key "${key}". Try paper, ink, forest, fam-time or radius.`,
      });
      return;
    }

    const slot = dark ? 'dark' : 'values';
    if (seen.has(`${slot}:${plain}`)) {
      theme.diagnostics.push({
        line,
        severity: 'warning',
        message: `"${key}" appears twice; the last one wins.`,
      });
    }
    seen.add(`${slot}:${plain}`);

    if (!validValue(spec.kind, value)) {
      theme.diagnostics.push({ line, severity: 'error', message: invalidReason(spec.kind) });
      return;
    }

    theme[slot][plain] = value;
  });

  return theme;
}

export function themeIsEmpty(theme: Theme): boolean {
  return !Object.keys(theme.values).length && !Object.keys(theme.dark).length;
}

/** CSS for a theme: light on `:root`, `dark-` keys under both dark switches. */
export function themeCss(theme: Theme): string {
  const light = Object.entries(theme.values).map(([key, value]) => `${TOKENS[key].prop}: ${value};`);
  const dark = Object.entries(theme.dark).map(([key, value]) => `${TOKENS[key].prop}: ${value};`);
  const rules: string[] = [];
  if (light.length) rules.push(`:root{${light.join('')}}`);
  if (dark.length) {
    rules.push(`@media (prefers-color-scheme: dark){:root:not([data-theme='light']){${dark.join('')}}}`);
    rules.push(`:root[data-theme='dark']{${dark.join('')}}`);
  }
  return rules.join('\n');
}

/** Write a theme onto the document. An empty theme removes the one that was there. */
export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const existing = document.getElementById('pqgb-theme') as HTMLStyleElement | null;
  const css = themeCss(theme);

  if (!css) {
    existing?.remove();
  } else if (existing) {
    existing.textContent = css;
  } else {
    const style = document.createElement('style');
    style.id = 'pqgb-theme';
    style.textContent = css;
    document.head.appendChild(style);
  }

  if (theme.hide.length) root.dataset.hide = theme.hide.join(' ');
  else delete root.dataset.hide;
}

/** Apply raw theme text, as stored in settings. */
export function applyThemeText(text: string): Theme {
  const theme = parseTheme(text);
  applyTheme(theme);
  return theme;
}

/** Write a theme back out in the format that produced it. */
export function themeToText(theme: Theme): string {
  const lines: string[] = ['# Game Buddy theme', '# Each line is key: value. dark- sets a value for dark mode only.'];
  if (theme.name.trim()) lines.push(`name: ${theme.name.trim()}`);
  const entries = Object.entries(theme.values);
  if (entries.length || Object.keys(theme.dark).length) lines.push('');
  for (const [key, value] of entries) lines.push(`${key}: ${value}`);
  const dark = Object.entries(theme.dark);
  if (dark.length) {
    lines.push('');
    lines.push('# Only in dark mode');
    for (const [key, value] of dark) lines.push(`dark-${key}: ${value}`);
  }
  if (theme.hide.length) {
    lines.push('');
    lines.push(`hide-chrome: ${theme.hide.join(', ')}`);
  }
  return `${lines.join('\n')}\n`;
}
