/**
 * `.gamebuddy` parser: tolerant, line-numbered, schema-free. Values stay as
 * raw text here; `resolveTemplate` applies each tool's preset schema.
 */

import { translate } from '../i18n';
import type { PresetSchema, PresetValues } from './schema';
import { coerceField, defaultsFor, nearestKey } from './schema';

export type Severity = 'error' | 'warning';

export interface Diagnostic {
  severity: Severity;
  message: string;
  line: number;
}

export interface PlayerRange {
  min: number;
  max: number;
}

export interface GameMeta {
  name: string;
  players?: PlayerRange;
  time?: string;
  tags: string[];
  /** A mark name from `core/ui/icons.ts`, e.g. `dice`. Unknown names are ignored. */
  icon?: string;
  source?: string;
  author?: string;
  license?: string;
  format: number;
  line: number;
}

export interface RawValue {
  raw: string;
  line: number;
}

export interface ToolBlock {
  toolId: string;
  instanceId: string;
  line: number;
  values: Record<string, RawValue>;
}

export interface ScriptStep {
  verb: string;
  arg: string;
  line: number;
}

export interface ScriptBlock {
  instanceId: string;
  line: number;
  steps: ScriptStep[];
}

/** `[variant quick]`: an optional house-rule text chosen when the game starts. */
export interface TemplateVariant {
  id: string;
  name: string;
  players?: string;
  time?: string;
  text: string;
  line: number;
}

export interface Template {
  game: GameMeta;
  players: string[];
  tools: ToolBlock[];
  setup: string[];
  rules: string;
  notes: string;
  scripts: ScriptBlock[];
  variants: TemplateVariant[];
  raw: string;
}

export interface ParseResult {
  template: Template;
  diagnostics: Diagnostic[];
}

export const SCRIPT_VERBS = ['say', 'wait', 'reveal', 'timer', 'note'];

type SectionKind =
  | 'game'
  | 'tool'
  | 'players'
  | 'setup'
  | 'rules'
  | 'notes'
  | 'script'
  | 'variant'
  | 'unknown';

interface Section {
  kind: SectionKind;
  toolId?: string;
  instanceId?: string;
  line: number;
}

interface VariantBlock {
  id: string;
  line: number;
  name: string;
  players: string;
  time: string;
  textLines: string[];
}

const SECTION_RE = /^\s*\[([^\]]*)\]\s*$/;
const CONTINUATION_RE = /^(?:\s{2,}|\t)/;
const COMMENT_RE = /^\s*#/;

function normaliseKey(key: string): string {
  return key.trim().toLowerCase().replace(/\s+/g, '-');
}

function splitKeyValue(line: string): { key: string; value: string } | null {
  const colon = line.indexOf(':');
  const equals = line.indexOf('=');
  let index = -1;
  if (colon >= 0 && equals >= 0) index = Math.min(colon, equals);
  else index = Math.max(colon, equals);
  if (index < 0) return null;
  const key = normaliseKey(line.slice(0, index));
  if (!key) return null;
  return { key, value: line.slice(index + 1).trim() };
}

/** Parse template text. Never throws; problems become diagnostics. */
export function parseTemplate(text: string): ParseResult {
  const diagnostics: Diagnostic[] = [];
  const lines = String(text ?? '').split(/\r?\n/);

  const gameRaw: Record<string, RawValue> = {};
  const players: string[] = [];
  const tools: ToolBlock[] = [];
  const setup: string[] = [];
  const scripts: ScriptBlock[] = [];
  const variants: VariantBlock[] = [];
  const rulesLines: string[] = [];
  const notesLines: string[] = [];

  let section: Section | null = null;
  let currentTool: ToolBlock | null = null;
  let currentScript: ScriptBlock | null = null;
  let currentVariant: VariantBlock | null = null;
  let currentKV: Record<string, RawValue> | null = null;
  let lastKey: string | null = null;
  let blockKey: string | null = null;

  interface OpenedSection {
    section: Section;
    kv: Record<string, RawValue> | null;
    tool: ToolBlock | null;
    script: ScriptBlock | null;
    variant: VariantBlock | null;
  }

  const openSection = (name: string, line: number): OpenedSection => {
    const tokens = name.trim().split(/\s+/).filter(Boolean);
    const head = (tokens[0] ?? '').toLowerCase();
    if (head === 'tool') {
      const toolId = (tokens[1] ?? '').toLowerCase();
      const instanceId = (tokens[2] ?? tokens[1] ?? '').toLowerCase();
      if (!toolId) {
        diagnostics.push({ severity: 'error', message: translate('diag.tool-id'), line });
        return { section: { kind: 'unknown', line }, kv: null, tool: null, script: null, variant: null };
      }
      const block: ToolBlock = { toolId, instanceId, line, values: {} };
      tools.push(block);
      return { section: { kind: 'tool', toolId, instanceId, line }, kv: block.values, tool: block, script: null, variant: null };
    }
    if (head === 'script') {
      const instanceId = (tokens[1] ?? 'script').toLowerCase();
      const block: ScriptBlock = { instanceId, line, steps: [] };
      scripts.push(block);
      return { section: { kind: 'script', instanceId, line }, kv: null, tool: null, script: block, variant: null };
    }
    if (head === 'variant') {
      const id = (tokens[1] ?? '').toLowerCase();
      if (!id) {
        diagnostics.push({
          severity: 'warning',
          message: translate('diag.variant-name'),
          line,
        });
        return { section: { kind: 'unknown', line }, kv: null, tool: null, script: null, variant: null };
      }
      const block: VariantBlock = { id, line, name: '', players: '', time: '', textLines: [] };
      variants.push(block);
      return { section: { kind: 'variant', instanceId: id, line }, kv: null, tool: null, script: null, variant: block };
    }
    if (head === 'game') {
      return { section: { kind: 'game', line }, kv: gameRaw, tool: null, script: null, variant: null };
    }
    if (head === 'players' || head === 'setup' || head === 'rules' || head === 'notes') {
      return { section: { kind: head, line }, kv: null, tool: null, script: null, variant: null };
    }
    diagnostics.push({ severity: 'warning', message: translate('diag.unknown-section', { name: tokens.join(' ') }), line });
    return { section: { kind: 'unknown', line }, kv: null, tool: null, script: null, variant: null };
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const lineNo = index + 1;

    // Multi-line value: `key: |` then indented lines, preserved verbatim.
    if (blockKey && currentKV && CONTINUATION_RE.test(line)) {
      const entry = currentKV[blockKey];
      const stripped = line.replace(/^(?: {2,}|\t)/, '');
      entry.raw = entry.raw ? `${entry.raw}\n${stripped}` : stripped;
      continue;
    }
    if (blockKey && line.trim() === '') {
      const entry = currentKV?.[blockKey];
      if (entry) entry.raw = `${entry.raw}\n`;
      continue;
    }
    if (blockKey) blockKey = null;

    if (line.trim() === '') {
      lastKey = null;
      continue;
    }
    if (COMMENT_RE.test(line)) continue;

    const anySection = line.match(SECTION_RE);
    if (anySection) {
      const opened = openSection(anySection[1], lineNo);
      section = opened.section;
      currentKV = opened.kv;
      currentTool = opened.tool;
      currentScript = opened.script;
      currentVariant = opened.variant;
      lastKey = null;
      continue;
    }

    if (!section) {
      diagnostics.push({
        severity: 'warning',
        message: translate('diag.text-before'),
        line: lineNo,
      });
      continue;
    }

    switch (section.kind) {
      case 'game':
      case 'tool': {
        if (CONTINUATION_RE.test(line) && lastKey && currentKV?.[lastKey]) {
          currentKV[lastKey].raw += ` ${line.trim()}`;
          continue;
        }
        const pair = splitKeyValue(line);
        if (!pair) {
          diagnostics.push({ severity: 'warning', message: translate('diag.key-value', { line: line.trim() }), line: lineNo });
          continue;
        }
        if (!currentKV) break;
        const existing = currentKV[pair.key];
        if (existing) {
          diagnostics.push({
            severity: 'warning',
            message: translate('diag.duplicate-key', { key: pair.key, line: existing.line }),
            line: lineNo,
          });
        }
        currentKV[pair.key] = { raw: pair.value, line: lineNo };
        lastKey = pair.key;
        if (pair.value === '|') {
          currentKV[pair.key].raw = '';
          blockKey = pair.key;
        }
        break;
      }
      case 'players':
      case 'setup': {
        const item = line.replace(/^\s*-\s*/, '').trim();
        if (!item) continue;
        if (section.kind === 'players') players.push(item);
        else setup.push(item);
        break;
      }
      case 'rules':
        rulesLines.push(line);
        break;
      case 'notes':
        notesLines.push(line);
        break;
      case 'variant': {
        if (!currentVariant) break;
        // Only three keys are metadata; every other line is house-rule text,
        // so a variant can say "Note: this changes the scoring" without confusion.
        const meta = line.trim().match(/^(name|players|time)\s*[:=]\s*(.+)$/i);
        if (meta) {
          const value = meta[2].trim();
          if (meta[1].toLowerCase() === 'name') currentVariant.name = value;
          else if (meta[1].toLowerCase() === 'players') currentVariant.players = value;
          else currentVariant.time = value;
          break;
        }
        currentVariant.textLines.push(line);
        break;
      }
      case 'script': {
        const stepMatch = line.trim().match(/^(?:(\d+)[.)]\s*)?([a-zA-Z]+)\s*:\s*([\s\S]*)$/);
        if (!stepMatch) {
          diagnostics.push({
            severity: 'warning',
            message: translate('diag.script-step', { line: line.trim() }),
            line: lineNo,
          });
          continue;
        }
        const verb = stepMatch[2].toLowerCase();
        if (!SCRIPT_VERBS.includes(verb)) {
          diagnostics.push({
            severity: 'warning',
            message: translate('diag.script-verb', { verb }),
            line: lineNo,
          });
        }
        currentScript?.steps.push({ verb, arg: stepMatch[3].trim(), line: lineNo });
        break;
      }
      default:
        break;
    }
  }

  const trimValues = (values: Record<string, RawValue>): void => {
    for (const entry of Object.values(values)) entry.raw = entry.raw.replace(/\s+$/, '');
  };
  trimValues(gameRaw);
  for (const block of tools) trimValues(block.values);

  // Resolve [game]
  const game: GameMeta = { name: '', tags: [], format: 1, line: gameRaw.name?.line ?? 1 };
  const nameEntry = gameRaw.name;
  if (!nameEntry || !nameEntry.raw.trim()) {
    diagnostics.push({ severity: 'error', message: translate('diag.name'), line: 1 });
  } else {
    game.name = nameEntry.raw.trim();
  }
  if (gameRaw.players) {
    const range = gameRaw.players.raw.match(/^\s*(\d+)\s*(?:[-–]\s*(\d+))?\s*$/);
    if (!range) {
      diagnostics.push({
        severity: 'warning',
        message: translate('diag.players', { raw: gameRaw.players.raw }),
        line: gameRaw.players.line,
      });
    } else {
      const min = Number(range[1]);
      const max = range[2] ? Number(range[2]) : min;
      if (max < min) {
        diagnostics.push({ severity: 'warning', message: translate('diag.players-backwards', { min, max }), line: gameRaw.players.line });
      }
      game.players = { min: Math.min(min, max), max: Math.max(min, max) };
    }
  }
  if (gameRaw.time) game.time = gameRaw.time.raw;
  if (gameRaw.icon) game.icon = gameRaw.icon.raw.trim().slice(0, 24);
  if (gameRaw.source) game.source = gameRaw.source.raw;
  if (gameRaw.author) game.author = gameRaw.author.raw;
  if (gameRaw.license) game.license = gameRaw.license.raw;
  if (gameRaw.tags) game.tags = gameRaw.tags.raw.split(',').map((tag) => tag.trim()).filter(Boolean);
  if (gameRaw.format) {
    const format = Number(gameRaw.format.raw);
    if (Number.isFinite(format) && format >= 1) game.format = Math.floor(format);
    else diagnostics.push({ severity: 'warning', message: translate('diag.format-version', { raw: gameRaw.format.raw }), line: gameRaw.format.line });
    if (game.format > 1) {
      diagnostics.push({
        severity: 'warning',
        message: translate('diag.format-newer', { format: game.format, current: 1 }),
        line: gameRaw.format.line,
      });
    }
  }

  for (const key of Object.keys(gameRaw)) {
    if (!['name', 'players', 'time', 'tags', 'icon', 'source', 'author', 'license', 'format'].includes(key)) {
      diagnostics.push({
        severity: 'warning',
        message: translate('diag.unknown-game-key', { key }),
        line: gameRaw[key].line,
      });
    }
  }

  const seenInstances = new Map<string, number>();
  for (const block of tools) {
    const first = seenInstances.get(block.instanceId);
    if (first !== undefined) {
      diagnostics.push({
        severity: 'warning',
        message: translate('diag.duplicate-tool', { id: block.instanceId, line: first }),
        line: block.line,
      });
    } else {
      seenInstances.set(block.instanceId, block.line);
    }
  }

  const trimBlock = (linesToTrim: string[]): string => {
    const copy = linesToTrim.slice();
    while (copy.length && copy[0].trim() === '') copy.shift();
    while (copy.length && copy[copy.length - 1].trim() === '') copy.pop();
    return copy.join('\n');
  };

  const seenVariants = new Set<string>();
  for (const block of variants) {
    if (seenVariants.has(block.id)) {
      diagnostics.push({
        severity: 'warning',
        message: translate('diag.duplicate-variant', { id: block.id, line: block.line }),
        line: block.line,
      });
    }
    seenVariants.add(block.id);
  }

  return {
    template: {
      game,
      players,
      tools,
      setup,
      rules: trimBlock(rulesLines),
      notes: trimBlock(notesLines),
      scripts,
      variants: variants.map((block) => ({
        id: block.id,
        name: block.name.trim() || block.id,
        players: block.players.trim() || undefined,
        time: block.time.trim() || undefined,
        text: trimBlock(block.textLines),
        line: block.line,
      })),
      raw: text,
    },
    diagnostics,
  };
}

export interface ResolvedTool {
  toolId: string;
  instanceId: string;
  values: PresetValues;
  line: number;
}

export interface ResolveResult {
  tools: ResolvedTool[];
  diagnostics: Diagnostic[];
  unavailable: { toolId: string; instanceId: string; line: number }[];
}

/** Apply each tool's preset schema: defaults, coercion, unknown-key hints. */
export function resolveTemplate(
  template: Template,
  schemaOf: (toolId: string) => PresetSchema | undefined,
): ResolveResult {
  const diagnostics: Diagnostic[] = [];
  const tools: ResolvedTool[] = [];
  const unavailable: { toolId: string; instanceId: string; line: number }[] = [];

  for (const block of template.tools) {
    const schema = schemaOf(block.toolId);
    if (!schema) {
      diagnostics.push({
        severity: 'warning',
        message: translate('diag.unknown-tool', { id: block.toolId }),
        line: block.line,
      });
      unavailable.push({ toolId: block.toolId, instanceId: block.instanceId, line: block.line });
      continue;
    }
    const values = defaultsFor(schema);
    for (const [key, entry] of Object.entries(block.values)) {
      const spec = schema[key];
      if (!spec) {
        const hint = nearestKey(key, schema);
        diagnostics.push({
          severity: 'warning',
          message: hint
            ? translate('diag.unknown-key-hint', { key, hint })
            : translate('diag.unknown-key', { key }),
          line: entry.line,
        });
        continue;
      }
      const result = coerceField(spec, entry.raw);
      if (!result.ok) {
        diagnostics.push({ severity: 'error', message: translate('diag.value', { key, message: result.message ?? '' }), line: entry.line });
        continue;
      }
      values[key] = result.value;
    }
    tools.push({ toolId: block.toolId, instanceId: block.instanceId, values, line: block.line });
  }

  return { tools, diagnostics, unavailable };
}

/** Merge parse and resolve diagnostics into one ordered list. */
export function allDiagnostics(...lists: Diagnostic[][]): Diagnostic[] {
  return lists.flat().sort((a, b) => a.line - b.line || (a.severity === 'error' ? -1 : 1));
}

export function hasErrors(diagnostics: Diagnostic[]): boolean {
  return diagnostics.some((item) => item.severity === 'error');
}
