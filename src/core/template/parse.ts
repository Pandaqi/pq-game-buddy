/**
 * `.gamebuddy` parser: tolerant, line-numbered, schema-free. Values stay as
 * raw text here; `resolveTemplate` applies each tool's preset schema.
 */

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

export interface Template {
  game: GameMeta;
  players: string[];
  tools: ToolBlock[];
  setup: string[];
  rules: string;
  notes: string;
  scripts: ScriptBlock[];
  raw: string;
}

export interface ParseResult {
  template: Template;
  diagnostics: Diagnostic[];
}

export const SCRIPT_VERBS = ['say', 'wait', 'reveal', 'timer', 'note'];

type SectionKind = 'game' | 'tool' | 'players' | 'setup' | 'rules' | 'notes' | 'script' | 'unknown';

interface Section {
  kind: SectionKind;
  toolId?: string;
  instanceId?: string;
  line: number;
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
  const rulesLines: string[] = [];
  const notesLines: string[] = [];

  let section: Section | null = null;
  let currentTool: ToolBlock | null = null;
  let currentScript: ScriptBlock | null = null;
  let currentKV: Record<string, RawValue> | null = null;
  let lastKey: string | null = null;
  let blockKey: string | null = null;

  interface OpenedSection {
    section: Section;
    kv: Record<string, RawValue> | null;
    tool: ToolBlock | null;
    script: ScriptBlock | null;
  }

  const openSection = (name: string, line: number): OpenedSection => {
    const tokens = name.trim().split(/\s+/).filter(Boolean);
    const head = (tokens[0] ?? '').toLowerCase();
    if (head === 'tool') {
      const toolId = (tokens[1] ?? '').toLowerCase();
      const instanceId = (tokens[2] ?? tokens[1] ?? '').toLowerCase();
      if (!toolId) {
        diagnostics.push({ severity: 'error', message: 'A [tool] section needs a tool id', line });
        return { section: { kind: 'unknown', line }, kv: null, tool: null, script: null };
      }
      const block: ToolBlock = { toolId, instanceId, line, values: {} };
      tools.push(block);
      return { section: { kind: 'tool', toolId, instanceId, line }, kv: block.values, tool: block, script: null };
    }
    if (head === 'script') {
      const instanceId = (tokens[1] ?? 'script').toLowerCase();
      const block: ScriptBlock = { instanceId, line, steps: [] };
      scripts.push(block);
      return { section: { kind: 'script', instanceId, line }, kv: null, tool: null, script: block };
    }
    if (head === 'game') {
      return { section: { kind: 'game', line }, kv: gameRaw, tool: null, script: null };
    }
    if (head === 'players' || head === 'setup' || head === 'rules' || head === 'notes') {
      return { section: { kind: head, line }, kv: null, tool: null, script: null };
    }
    diagnostics.push({ severity: 'warning', message: `Unknown section [${tokens.join(' ')}] ignored`, line });
    return { section: { kind: 'unknown', line }, kv: null, tool: null, script: null };
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
      lastKey = null;
      continue;
    }

    if (!section) {
      diagnostics.push({
        severity: 'warning',
        message: 'Text before the first section was ignored (start with [game])',
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
          diagnostics.push({ severity: 'warning', message: `Expected "key: value", got "${line.trim()}"`, line: lineNo });
          continue;
        }
        if (!currentKV) break;
        const existing = currentKV[pair.key];
        if (existing) {
          diagnostics.push({
            severity: 'warning',
            message: `Duplicate key "${pair.key}" (first on line ${existing.line}); the last value wins`,
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
      case 'script': {
        const stepMatch = line.trim().match(/^(?:(\d+)[.)]\s*)?([a-zA-Z]+)\s*:\s*([\s\S]*)$/);
        if (!stepMatch) {
          diagnostics.push({
            severity: 'warning',
            message: `Script steps look like "1. say: text", got "${line.trim()}"`,
            line: lineNo,
          });
          continue;
        }
        const verb = stepMatch[2].toLowerCase();
        if (!SCRIPT_VERBS.includes(verb)) {
          diagnostics.push({
            severity: 'warning',
            message: `Unknown script verb "${verb}"; it will be skipped`,
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
    diagnostics.push({ severity: 'error', message: 'A template needs a name in [game]', line: 1 });
  } else {
    game.name = nameEntry.raw.trim();
  }
  if (gameRaw.players) {
    const range = gameRaw.players.raw.match(/^\s*(\d+)\s*(?:[-–]\s*(\d+))?\s*$/);
    if (!range) {
      diagnostics.push({
        severity: 'warning',
        message: `players: "${gameRaw.players.raw}" is not a count or range like 2-4`,
        line: gameRaw.players.line,
      });
    } else {
      const min = Number(range[1]);
      const max = range[2] ? Number(range[2]) : min;
      if (max < min) {
        diagnostics.push({ severity: 'warning', message: `players: ${min}-${max} has the range backwards`, line: gameRaw.players.line });
      }
      game.players = { min: Math.min(min, max), max: Math.max(min, max) };
    }
  }
  if (gameRaw.time) game.time = gameRaw.time.raw;
  if (gameRaw.source) game.source = gameRaw.source.raw;
  if (gameRaw.author) game.author = gameRaw.author.raw;
  if (gameRaw.license) game.license = gameRaw.license.raw;
  if (gameRaw.tags) game.tags = gameRaw.tags.raw.split(',').map((tag) => tag.trim()).filter(Boolean);
  if (gameRaw.format) {
    const format = Number(gameRaw.format.raw);
    if (Number.isFinite(format) && format >= 1) game.format = Math.floor(format);
    else diagnostics.push({ severity: 'warning', message: `format: "${gameRaw.format.raw}" is not a version number`, line: gameRaw.format.line });
    if (game.format > 1) {
      diagnostics.push({
        severity: 'warning',
        message: `This template uses format ${game.format}; this app understands format 1`,
        line: gameRaw.format.line,
      });
    }
  }

  for (const key of Object.keys(gameRaw)) {
    if (!['name', 'players', 'time', 'tags', 'source', 'author', 'license', 'format'].includes(key)) {
      diagnostics.push({
        severity: 'warning',
        message: `Unknown [game] key "${key}" ignored`,
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
        message: `Duplicate tool instance "${block.instanceId}" (first on line ${first})`,
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

  return {
    template: {
      game,
      players,
      tools,
      setup,
      rules: trimBlock(rulesLines),
      notes: trimBlock(notesLines),
      scripts,
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
        message: `Unknown tool "${block.toolId}"; it will show as unavailable`,
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
          message: hint ? `Unknown key "${key}", did you mean "${hint}"?` : `Unknown key "${key}" ignored`,
          line: entry.line,
        });
        continue;
      }
      const result = coerceField(spec, entry.raw);
      if (!result.ok) {
        diagnostics.push({ severity: 'error', message: `${key}: ${result.message}`, line: entry.line });
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
