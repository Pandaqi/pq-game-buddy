/**
 * `.gamebuddy-tool`: one plain-text file, one new tool made of blocks the app
 * already draws, plus optional `[script]` sections for logic the blocks cannot
 * express. Every other value is still validated against a fixed vocabulary.
 *
 * A script is the one place a tool file carries code, and it is opt-in: the
 * parser compiles it to catch syntax errors, and only the plugin runtime runs
 * it, in a function call with a small API and a try/catch around every entry.
 *
 * This module is Svelte-free: the parser, the linter and the tests use it as is.
 */

import { translate } from './i18n';
import { schemas } from './schemas.generated';
import { KEYS, readJson, writeJson } from './storage';
import type { Diagnostic } from './template/parse';
import {
  coerceField,
  defaultsFor,
  nearestKey,
  parseBoolean,
  parseColor,
  parsePairs,
  splitList,
  type FieldSpec,
  type PresetSchema,
} from './template/schema';

export type BlockKind =
  | 'counter'
  | 'checklist'
  | 'table'
  | 'field'
  | 'roll'
  | 'pick'
  | 'readout'
  | 'button'
  | 'note';

export type ToolFamily = 'randomize' | 'time' | 'track' | 'reveal' | 'reference' | 'flow';
export type SeatScope = 'multi' | 'one' | 'none';

export const BLOCK_KINDS: BlockKind[] = [
  'counter',
  'checklist',
  'table',
  'field',
  'roll',
  'pick',
  'readout',
  'button',
  'note',
];

const FAMILIES: ToolFamily[] = ['randomize', 'time', 'track', 'reveal', 'reference', 'flow'];
const SEATS: SeatScope[] = ['multi', 'one', 'none'];

const MAX_TEXT = 16_384;
const MAX_BLOCKS = 24;
const MAX_SETTINGS = 20;
const MAX_SCRIPTS = 8;
const MAX_SCRIPT_CHARS = 8_192;
const MAX_SCRIPT_TOTAL = 16_384;
const SCRIPT_KEYS = ['when', 'body', 'file'];
const ID_RE = /^[a-z][a-z0-9-]{1,23}$/;
const BLOCK_ID_RE = /^[a-z][a-z0-9-]{0,23}$/;

const TOOL_KEYS = ['id', 'name', 'blurb', 'family', 'seats', 'icon', 'tags'];

/** When a script runs by itself; every script is also a command and a button target. */
export type ScriptWhen = 'start' | 'reset' | 'none';

export const SCRIPT_WHEN: ScriptWhen[] = ['start', 'reset', 'none'];

export interface ToolScript {
  id: string;
  when: ScriptWhen;
  /** The JavaScript, written inline or read from a `.js` file at install time. */
  body: string;
  /** The `.js` file it came from; empty when it was written in the file. */
  file: string;
  line: number;
}

/** The keys each kind reads; anything else is a typo, not a feature. */
const BLOCK_KEYS: Record<BlockKind, string[]> = {
  counter: ['label', 'start', 'step', 'min', 'max', 'per-player'],
  checklist: ['label', 'items'],
  table: ['label', 'rows', 'cols'],
  field: ['label', 'type', 'options', 'default'],
  roll: ['label', 'notation', 'faces', 'count'],
  pick: ['label', 'from', 'count'],
  readout: ['label', 'formula'],
  button: ['label', 'do', 'confirm', 'run'],
  note: ['label', 'text'],
};

export interface ToolBlockDef {
  id: string;
  kind: BlockKind;
  line: number;
  /** Raw option text; `{setting}` placeholders are filled when the session starts. */
  options: Record<string, string>;
  optionLines: Record<string, number>;
}

export interface ToolDefinition {
  id: string;
  name: string;
  blurb: string;
  family: ToolFamily;
  seats: SeatScope;
  icon: string;
  tags: string[];
  settings: PresetSchema;
  blocks: ToolBlockDef[];
  scripts: ToolScript[];
  /** The source text, so Settings can export exactly what was installed. */
  text: string;
  line: number;
}

export interface ToolFileResult {
  definition: ToolDefinition | null;
  diagnostics: Diagnostic[];
  ok: boolean;
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

function numberOr(raw: string | undefined, fallback: number): number {
  const value = Number(String(raw ?? '').trim());
  return Number.isFinite(value) ? value : fallback;
}

function subst(text: string, values: Record<string, unknown>): string {
  return String(text ?? '').replace(/\{(\w+)\}/g, (match, name: string) =>
    name in values ? String(values[name]) : match,
  );
}

/** A setting's default value, built with the same coercion a template uses. */
function defaultFor(type: string, raw: string, args: string[]): unknown {
  const text = String(raw ?? '').trim();
  switch (type) {
    case 'number':
      return numberOr(text, 0);
    case 'duration':
      return text || '0s';
    case 'boolean':
      return parseBoolean(text) ?? false;
    case 'enum':
      return normaliseKey(text) || args[0] || '';
    case 'list':
      return splitList(text);
    case 'pairs':
      return parsePairs(text);
    case 'color':
      return parseColor(text) ?? '#6b7280';
    default:
      return text.replace(/^"([\s\S]*)"$/, '$1').replace(/\s+$/, '');
  }
}

const SETTING_RE =
  /^([a-z][a-z0-9-]*)\s*:\s*(number|duration|boolean|enum|string|text|list|pairs|color)\b\s*(?:\(([^)]*)\))?\s*(?:=\s*([\s\S]*))?$/i;

interface SettingDraft {
  key: string;
  type: string;
  args: string[];
  raw: string;
  line: number;
}

interface ScriptDraft {
  id: string;
  line: number;
  options: Record<string, string>;
  optionLines: Record<string, number>;
}

/** `new Function` compiles without running, so a typo is a line-numbered error. */
function scriptSyntaxError(body: string): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    new Function('gb', `"use strict";\n${body}`);
    return '';
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

/** Parse a tool file. Never throws; problems become line-numbered diagnostics. */
export function parseToolFile(
  text: string,
  files: Record<string, string> = {},
): ToolFileResult {
  const source = String(text ?? '');
  const diagnostics: Diagnostic[] = [];
  const lines = source.split(/\r?\n/);

  if (source.length > MAX_TEXT) {
    diagnostics.push({
      severity: 'error',
      message: translate('diag.tool-too-big', { bytes: MAX_TEXT }),
      line: 1,
    });
  }

  const toolRaw: Record<string, { raw: string; line: number }> = {};
  const settings: SettingDraft[] = [];
  const blocks: ToolBlockDef[] = [];
  const seenBlocks = new Set<string>();
  const scriptDrafts: ScriptDraft[] = [];
  const seenScripts = new Set<string>();

  let section: 'tool' | 'setting' | 'block' | 'script' | 'unknown' | null = null;
  let currentBlock: ToolBlockDef | null = null;
  let currentScript: ScriptDraft | null = null;
  let multiline: { target: Record<string, string>; key: string } | null = null;
  let multilineSetting: { draft: SettingDraft; collect: boolean } | null = null;

  const append = (target: Record<string, string>, key: string, line: string): void => {
    const value = line.replace(/^(?: {2,}|\t)/, '');
    target[key] = target[key] ? `${target[key]}\n${value}` : value;
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const lineNo = index + 1;

    if (multilineSetting?.collect) {
      const draft = multilineSetting.draft;
      if (CONTINUATION_RE.test(line)) {
        draft.raw = draft.raw ? `${draft.raw}\n${line.replace(/^(?: {2,}|\t)/, '')}` : line.replace(/^(?: {2,}|\t)/, '');
        continue;
      }
      if (line.trim() === '') {
        draft.raw += '\n';
        continue;
      }
      multilineSetting = null;
    }
    if (multiline) {
      if (CONTINUATION_RE.test(line)) {
        append(multiline.target, multiline.key, line);
        continue;
      }
      if (line.trim() === '') {
        const current = multiline.target[multiline.key] ?? '';
        multiline.target[multiline.key] = `${current}\n`;
        continue;
      }
      multiline = null;
    }
    if (line.trim() === '') continue;
    if (COMMENT_RE.test(line)) continue;

    const header = line.match(SECTION_RE);
    if (header) {
      const tokens = header[1].trim().split(/\s+/).filter(Boolean);
      const head = (tokens[0] ?? '').toLowerCase();
      currentBlock = null;
      currentScript = null;
      if (head === 'tool' && tokens.length === 1) {
        section = 'tool';
        continue;
      }
      if (head === 'setting') {
        section = 'setting';
        continue;
      }
      if (head === 'block') {
        const id = normaliseKey(tokens[1] ?? '');
        if (!BLOCK_ID_RE.test(id)) {
          diagnostics.push({
            severity: 'error',
            message: translate('diag.tool-block-id', { id: tokens[1] ?? '' }),
            line: lineNo,
          });
          section = 'unknown';
          continue;
        }
        if (seenBlocks.has(id)) {
          diagnostics.push({
            severity: 'warning',
            message: translate('diag.tool-duplicate-block', { id }),
            line: lineNo,
          });
          section = 'unknown';
          continue;
        }
        if (blocks.length >= MAX_BLOCKS) {
          diagnostics.push({
            severity: 'error',
            message: translate('diag.tool-too-many-blocks', { max: MAX_BLOCKS }),
            line: lineNo,
          });
          section = 'unknown';
          continue;
        }
        seenBlocks.add(id);
        const block: ToolBlockDef = { id, kind: 'note', line: lineNo, options: {}, optionLines: {} };
        blocks.push(block);
        currentBlock = block;
        section = 'block';
        continue;
      }
      if (head === 'script') {
        const id = normaliseKey(tokens[1] ?? '');
        if (!BLOCK_ID_RE.test(id)) {
          diagnostics.push({
            severity: 'error',
            message: translate('diag.tool-block-id', { id: tokens[1] ?? '' }),
            line: lineNo,
          });
          section = 'unknown';
          continue;
        }
        if (seenScripts.has(id)) {
          diagnostics.push({
            severity: 'warning',
            message: translate('diag.tool-script-duplicate', { id }),
            line: lineNo,
          });
          section = 'unknown';
          continue;
        }
        if (scriptDrafts.length >= MAX_SCRIPTS) {
          diagnostics.push({
            severity: 'error',
            message: translate('diag.tool-script-too-many', { max: MAX_SCRIPTS }),
            line: lineNo,
          });
          section = 'unknown';
          continue;
        }
        seenScripts.add(id);
        const draft: ScriptDraft = { id, line: lineNo, options: {}, optionLines: {} };
        scriptDrafts.push(draft);
        currentScript = draft;
        section = 'script';
        continue;
      }
      diagnostics.push({
        severity: 'warning',
        message: translate('diag.unknown-section', { name: tokens.join(' ') || head }),
        line: lineNo,
      });
      section = 'unknown';
      continue;
    }

    if (!section) {
      diagnostics.push({
        severity: 'warning',
        message: translate('diag.text-before', {}),
        line: lineNo,
      });
      continue;
    }

    if (section === 'setting') {
      const match = line.match(SETTING_RE);
      if (!match) {
        // A continuation line of a text setting that did not start with `=`.
        diagnostics.push({ severity: 'warning', message: translate('diag.tool-setting', {}), line: lineNo });
        continue;
      }
      const key = match[1].toLowerCase();
      const type = match[2].toLowerCase();
      const args = (match[3] ?? '').split(',').map((item) => item.trim()).filter(Boolean);
      const raw = match[4] ?? '';
      if (settings.some((draft) => draft.key === key)) {
        diagnostics.push({
          severity: 'warning',
          message: translate('diag.duplicate-key', { key, line: lineNo }),
          line: lineNo,
        });
      }
      const draft: SettingDraft = { key, type, args, raw, line: lineNo };
      settings.push(draft);
      if (type === 'text' && (raw === '' || raw === '|')) {
        draft.raw = '';
        multilineSetting = { draft, collect: true };
      }
      continue;
    }

    if (section === 'tool') {
      const pair = splitKeyValue(line);
      if (!pair) {
        diagnostics.push({ severity: 'warning', message: translate('diag.key-value', { line: line.trim() }), line: lineNo });
        continue;
      }
      if (toolRaw[pair.key]) {
        diagnostics.push({
          severity: 'warning',
          message: translate('diag.duplicate-key', { key: pair.key, line: toolRaw[pair.key].line }),
          line: lineNo,
        });
      }
      toolRaw[pair.key] = { raw: pair.value, line: lineNo };
      continue;
    }

    if (section === 'block' && currentBlock) {
      const pair = splitKeyValue(line);
      if (!pair) {
        diagnostics.push({ severity: 'warning', message: translate('diag.key-value', { line: line.trim() }), line: lineNo });
        continue;
      }
      if (pair.key in currentBlock.options) {
        diagnostics.push({
          severity: 'warning',
          message: translate('diag.duplicate-key', { key: pair.key, line: currentBlock.optionLines[pair.key] }),
          line: lineNo,
        });
      }
      currentBlock.options[pair.key] = pair.value;
      currentBlock.optionLines[pair.key] = lineNo;
      if (pair.value === '|') {
        currentBlock.options[pair.key] = '';
        multiline = { target: currentBlock.options, key: pair.key };
      }
      continue;
    }

    if (section === 'script' && currentScript) {
      const pair = splitKeyValue(line);
      if (!pair) {
        diagnostics.push({ severity: 'warning', message: translate('diag.key-value', { line: line.trim() }), line: lineNo });
        continue;
      }
      if (pair.key in currentScript.options) {
        diagnostics.push({
          severity: 'warning',
          message: translate('diag.duplicate-key', { key: pair.key, line: currentScript.optionLines[pair.key] }),
          line: lineNo,
        });
      }
      currentScript.options[pair.key] = pair.value;
      currentScript.optionLines[pair.key] = lineNo;
      if (pair.value === '|') {
        currentScript.options[pair.key] = '';
        multiline = { target: currentScript.options, key: pair.key };
      }
      continue;
    }
  }

  // A multi-line value ends with the blank line or the next section; trim it the
  // way `parseTemplate` does, so writing the file back reads the same.
  for (const block of blocks) {
    for (const key of Object.keys(block.options)) {
      block.options[key] = block.options[key].replace(/\s+$/, '');
    }
  }
  for (const draft of scriptDrafts) {
    for (const key of Object.keys(draft.options)) {
      draft.options[key] = draft.options[key].replace(/\s+$/, '');
    }
  }

  // --- tool section -------------------------------------------------------
  const id = (toolRaw.id?.raw ?? '').trim().toLowerCase();
  const name = (toolRaw.name?.raw ?? '').trim();
  const line = toolRaw.id?.line ?? 1;

  if (!id) {
    diagnostics.push({ severity: 'error', message: translate('diag.tool-id', {}), line: toolRaw.id?.line ?? 1 });
  } else if (!ID_RE.test(id)) {
    diagnostics.push({ severity: 'error', message: translate('diag.tool-id-shape', { id }), line: toolRaw.id?.line ?? 1 });
  } else if (schemas[id]) {
    diagnostics.push({ severity: 'error', message: translate('diag.tool-builtin', { id }), line: toolRaw.id?.line ?? 1 });
  }
  if (!name) {
    diagnostics.push({ severity: 'error', message: translate('diag.tool-name', {}), line: toolRaw.name?.line ?? 1 });
  }

  const familyRaw = (toolRaw.family?.raw ?? '').trim().toLowerCase();
  let family: ToolFamily = 'reference';
  if (!familyRaw) {
    diagnostics.push({ severity: 'error', message: translate('diag.tool-family', { values: FAMILIES.join(', ') }), line: toolRaw.family?.line ?? line });
  } else if (!FAMILIES.includes(familyRaw as ToolFamily)) {
    diagnostics.push({
      severity: 'warning',
      message: translate('diag.tool-not-one-of', { text: familyRaw, values: FAMILIES.join(', ') }),
      line: toolRaw.family?.line ?? line,
    });
  } else {
    family = familyRaw as ToolFamily;
  }

  const seatsRaw = (toolRaw.seats?.raw ?? 'multi').trim().toLowerCase();
  let seats: SeatScope = 'multi';
  if (!SEATS.includes(seatsRaw as SeatScope)) {
    diagnostics.push({
      severity: 'warning',
      message: translate('diag.tool-not-one-of', { text: seatsRaw, values: SEATS.join(', ') }),
      line: toolRaw.seats?.line ?? line,
    });
  } else {
    seats = seatsRaw as SeatScope;
  }

  for (const key of Object.keys(toolRaw)) {
    if (!TOOL_KEYS.includes(key)) {
      diagnostics.push({
        severity: 'warning',
        message: translate('diag.unknown-key', { key }),
        line: toolRaw[key].line,
      });
    }
  }

  // --- settings -----------------------------------------------------------
  const preset: PresetSchema = {};
  if (settings.length > MAX_SETTINGS) {
    diagnostics.push({
      severity: 'error',
      message: translate('diag.tool-too-many-settings', { max: MAX_SETTINGS }),
      line: settings[MAX_SETTINGS].line,
    });
  }
  for (const draft of settings) {
    const spec = settingSpec(draft, diagnostics);
    if (spec) preset[draft.key] = spec;
  }

  // --- scripts ------------------------------------------------------------
  const scripts: ToolScript[] = [];
  const scriptIds = new Set<string>();
  let scriptChars = 0;
  for (const draft of scriptDrafts) {
    const whenRaw = (draft.options.when ?? 'none').trim().toLowerCase();
    let when: ScriptWhen = 'none';
    if (whenRaw && !SCRIPT_WHEN.includes(whenRaw as ScriptWhen)) {
      diagnostics.push({
        severity: 'warning',
        message: translate('diag.tool-script-when', { id: draft.id, values: SCRIPT_WHEN.join(', ') }),
        line: draft.optionLines.when ?? draft.line,
      });
    } else if (whenRaw) {
      when = whenRaw as ScriptWhen;
    }
    const file = (draft.options.file ?? '').trim();
    let body = (draft.options.body ?? '').replace(/\s+$/, '');
    if (file) {
      const chosen = files[file] ?? files[file.toLowerCase()];
      if (chosen === undefined) {
        diagnostics.push({
          severity: 'error',
          message: translate('diag.tool-script-file', { id: draft.id, file }),
          line: draft.optionLines.file ?? draft.line,
        });
      } else if (body.trim()) {
        diagnostics.push({
          severity: 'warning',
          message: translate('diag.tool-script-both', { id: draft.id }),
          line: draft.optionLines.body ?? draft.line,
        });
      } else {
        body = chosen;
      }
    }
    for (const key of Object.keys(draft.options)) {
      if (!SCRIPT_KEYS.includes(key)) {
        diagnostics.push({
          severity: 'warning',
          message: translate('diag.unknown-key', { key }),
          line: draft.optionLines[key] ?? draft.line,
        });
      }
    }
    if (!body.trim()) {
      diagnostics.push({
        severity: 'error',
        message: translate('diag.tool-script-empty', { id: draft.id }),
        line: draft.line,
      });
      continue;
    }
    if (body.length > MAX_SCRIPT_CHARS) {
      diagnostics.push({
        severity: 'error',
        message: translate('diag.tool-script-big', { id: draft.id, max: MAX_SCRIPT_CHARS }),
        line: draft.line,
      });
      continue;
    }
    scriptChars += body.length;
    const syntax = scriptSyntaxError(body);
    if (syntax) {
      diagnostics.push({
        severity: 'error',
        message: translate('diag.tool-script-syntax', { id: draft.id, message: syntax }),
        line: draft.line,
      });
      continue;
    }
    scriptIds.add(draft.id);
    scripts.push({ id: draft.id, when, body, file, line: draft.line });
  }
  if (scriptChars > MAX_SCRIPT_TOTAL) {
    diagnostics.push({
      severity: 'error',
      message: translate('diag.tool-scripts-big', { max: MAX_SCRIPT_TOTAL }),
      line: scriptDrafts[0]?.line ?? line,
    });
  }

  // --- blocks -------------------------------------------------------------
  const blockIds = new Set(blocks.map((block) => block.id));
  for (const block of blocks) {
    const kindRaw = normaliseKey(block.options.kind ?? '');
    if (!kindRaw) {
      diagnostics.push({ severity: 'error', message: translate('diag.tool-block-kind', { id: block.id }), line: block.line });
      continue;
    }
    if (!BLOCK_KINDS.includes(kindRaw as BlockKind)) {
      diagnostics.push({
        severity: 'error',
        message: translate('diag.tool-not-one-of', { text: kindRaw, values: BLOCK_KINDS.join(', ') }),
        line: block.optionLines.kind ?? block.line,
      });
      continue;
    }
    block.kind = kindRaw as BlockKind;
    for (const key of Object.keys(block.options)) {
      if (key === 'kind') continue;
      if (!BLOCK_KEYS[block.kind].includes(key)) {
        const hint = BLOCK_KEYS[block.kind].find((candidate) => nearestBlockKey(key, candidate));
        diagnostics.push({
          severity: 'warning',
          message: hint
            ? translate('diag.unknown-key-hint', { key, hint })
            : translate('diag.unknown-key', { key }),
          line: block.optionLines[key] ?? block.line,
        });
      }
    }
    for (const [key, value] of Object.entries(block.options)) {
      if (key === 'kind') continue;
      for (const placeholder of value.matchAll(/\{(\w+)\}/g)) {
        if (!(placeholder[1] in preset)) {
          diagnostics.push({
            severity: 'warning',
            message: translate('diag.tool-placeholder', { name: placeholder[1], block: block.id }),
            line: block.optionLines[key] ?? block.line,
          });
        }
      }
    }
    if (block.kind === 'button') {
      const action = (block.options.do ?? '').trim();
      const run = (block.options.run ?? '').trim();
      if (!action && !run) {
        diagnostics.push({ severity: 'error', message: translate('diag.tool-button', { id: block.id }), line: block.line });
      } else if (action) {
        checkDo(action, blockIds, block.id, block.optionLines.do ?? block.line, diagnostics);
      }
      if (run && !scriptIds.has(run)) {
        diagnostics.push({
          severity: 'warning',
          message: translate('diag.tool-run-unknown', { id: block.id, script: run }),
          line: block.optionLines.run ?? block.line,
        });
      }
    }
    if (block.kind === 'readout') {
      const formula = (block.options.formula ?? '').trim();
      if (!formula) {
        diagnostics.push({ severity: 'error', message: translate('diag.tool-formula', { id: block.id }), line: block.line });
      }
    }
  }

  const definition: ToolDefinition | null = id
    ? {
        id,
        name,
        blurb: (toolRaw.blurb?.raw ?? '').trim(),
        family,
        seats,
        icon: (toolRaw.icon?.raw ?? '').trim(),
        tags: splitList(toolRaw.tags?.raw ?? ''),
        settings: preset,
        blocks,
        scripts,
        text: source,
        line,
      }
    : null;

  return { definition, diagnostics, ok: !diagnostics.some((item) => item.severity === 'error') };
}

function nearestBlockKey(key: string, candidate: string): boolean {
  const distance = (a: string, b: string): number => {
    const rows = a.length + 1;
    const cols = b.length + 1;
    let previous = Array.from({ length: cols }, (_, index) => index);
    let current = new Array<number>(cols).fill(0);
    for (let i = 1; i < rows; i += 1) {
      current[0] = i;
      for (let j = 1; j < cols; j += 1) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
      }
      [previous, current] = [current, previous];
    }
    return previous[cols - 1];
  };
  return distance(key, candidate) <= 3;
}

function checkDo(
  action: string,
  blockIds: Set<string>,
  blockId: string,
  line: number,
  diagnostics: Diagnostic[],
): void {
  const parts = action.split(/\s+/).filter(Boolean);
  const verb = (parts[0] ?? '').toLowerCase();
  const target = parts[1] ?? '';
  const verbs = [
    'counter',
    'toggle',
    'roll',
    'pick',
    'shuffle',
    'reset',
    'toast',
    'sound',
    'tool',
  ];
  if (!verbs.includes(verb)) {
    diagnostics.push({
      severity: 'warning',
      message: translate('diag.tool-not-one-of', { text: verb, values: verbs.join(', ') }),
      line,
    });
    return;
  }
  if (verb === 'toast' || verb === 'reset' || verb === 'sound') return;
  if (verb === 'tool') {
    if (!target) {
      diagnostics.push({ severity: 'error', message: translate('diag.tool-do-target', { id: blockId }), line });
    }
    return;
  }
  if (!target) {
    diagnostics.push({ severity: 'error', message: translate('diag.tool-do-target', { id: blockId }), line });
    return;
  }
  if (!blockIds.has(target)) {
    diagnostics.push({ severity: 'warning', message: translate('diag.tool-do-block', { id: target }), line });
  }
}

function settingSpec(draft: SettingDraft, diagnostics: Diagnostic[]): FieldSpec | null {
  const key = draft.key;
  const raw = draft.raw.trim();
  switch (draft.type) {
    case 'number': {
      const bounds = draft.args[0]?.match(/^\s*(-?\d+(?:\.\d+)?)\s*(?:\.\.\s*(-?\d+(?:\.\d+)?))?\s*$/);
      const spec: FieldSpec = { type: 'number', default: Number(raw) || 0 };
      if (bounds) {
        spec.min = Number(bounds[1]);
        if (bounds[2] !== undefined) spec.max = Number(bounds[2]);
      }
      if (raw && !Number.isFinite(Number(raw))) {
        diagnostics.push({ severity: 'warning', message: translate('diag.not-number', { text: raw }), line: draft.line });
      }
      return spec;
    }
    case 'duration': {
      const value = coerceField({ type: 'duration', default: '0s' }, raw || '0s');
      if (!value.ok) {
        diagnostics.push({ severity: 'warning', message: translate('diag.tool-setting-value', { key, message: value.message ?? '' }), line: draft.line });
        return { type: 'duration', default: '0s' };
      }
      return { type: 'duration', default: raw || '0s' };
    }
    case 'boolean': {
      if (!raw) return { type: 'boolean', default: false };
      const parsed = parseBoolean(raw);
      if (parsed === null) {
        diagnostics.push({ severity: 'warning', message: translate('diag.not-yes-no', { text: raw }), line: draft.line });
        return { type: 'boolean', default: false };
      }
      return { type: 'boolean', default: parsed };
    }
    case 'enum': {
      const values = draft.args.map((value) => normaliseKey(value)).filter(Boolean);
      if (!values.length) {
        diagnostics.push({ severity: 'error', message: translate('diag.tool-enum', { key }), line: draft.line });
        return null;
      }
      const fallback = values[0];
      const chosen = normaliseKey(raw) || fallback;
      if (values.length && !values.includes(chosen)) {
        diagnostics.push({
          severity: 'warning',
          message: translate('diag.not-one-of', { text: raw, values: values.join(', ') }),
          line: draft.line,
        });
      }
      return { type: 'enum', values, default: values.includes(chosen) ? chosen : fallback };
    }
    case 'list':
      return { type: 'list', default: splitList(raw) };
    case 'pairs':
      return { type: 'pairs', default: parsePairs(raw) };
    case 'color': {
      if (!raw) return { type: 'color', default: '#6b7280' };
      const colour = parseColor(raw);
      if (!colour) {
        diagnostics.push({ severity: 'warning', message: translate('diag.not-colour', { text: raw }), line: draft.line });
        return { type: 'color', default: '#6b7280' };
      }
      return { type: 'color', default: colour };
    }
    default:
      return { type: draft.type === 'text' ? 'text' : 'string', default: defaultFor(draft.type, raw, draft.args) as string };
  }
}

// --- blocks at run time ----------------------------------------------------

export interface ResolvedBlock {
  id: string;
  kind: BlockKind;
  label: string;
  line: number;
  start: number;
  step: number;
  min: number;
  max: number;
  rows: number;
  cols: number;
  faces: number;
  count: number;
  perPlayer: boolean;
  confirm: boolean;
  notation: string;
  formula: string;
  action: string;
  /** The script a button runs after its `do:` action, if it names one. */
  run: string;
  text: string;
  defaultValue: string;
  fieldType: 'text' | 'number' | 'select' | 'note';
  items: string[];
  from: string[];
  options: string[];
}

/** Fill `{setting}` placeholders and read each option as the value it means. */
export function resolveToolBlocks(
  definition: ToolDefinition,
  values: Record<string, unknown>,
): ResolvedBlock[] {
  // A template passes only the settings it changes; the file's defaults fill the rest.
  const merged = { ...defaultsFor(definition.settings), ...values };
  return definition.blocks.map((block) => {
    const option = (key: string): string => subst(block.options[key] ?? '', merged).trim();
    const number = (key: string, fallback: number): number => {
      const value = Number(option(key));
      return Number.isFinite(value) && option(key) !== '' ? value : fallback;
    };
    const bool = (key: string): boolean => parseBoolean(option(key)) ?? false;
    const list = (key: string): string[] => splitList(block.options[key] ?? '').map((item) => subst(item, merged));
    const type = option('type').toLowerCase();
    return {
      id: block.id,
      kind: block.kind,
      label: option('label') || block.id,
      line: block.line,
      start: number('start', 0),
      step: Math.max(1, number('step', 1)),
      min: number('min', -999),
      max: number('max', 9999),
      rows: Math.max(1, Math.min(20, Math.round(number('rows', 3)))),
      cols: Math.max(1, Math.min(12, Math.round(number('cols', 3)))),
      faces: Math.max(2, Math.round(number('faces', 6))),
      count: Math.max(1, Math.round(number('count', 1))),
      perPlayer: bool('per-player'),
      confirm: bool('confirm'),
      notation: option('notation') || '1d6',
      formula: option('formula'),
      action: option('do'),
      run: option('run'),
      text: option('text'),
      defaultValue: option('default'),
      fieldType: (['text', 'number', 'select', 'note'].includes(type) ? type : 'text') as ResolvedBlock['fieldType'],
      items: list('items'),
      from: list('from'),
      options: list('options'),
    };
  });
}

// --- storage ---------------------------------------------------------------

interface StoredTool {
  text: string;
  /** `.js` files installed beside the tool file, by name. */
  files: Record<string, string>;
}

let cache: { raw: string; definitions: Map<string, ToolDefinition> } | null = null;

/** Both shapes: a bare string from the first build, or text plus its scripts. */
function installedTools(): Record<string, StoredTool> {
  const raw = readJson<Record<string, unknown>>(KEYS.toolFiles, {});
  const out: Record<string, StoredTool> = {};
  for (const [id, value] of Object.entries(raw)) {
    if (typeof value === 'string') {
      out[id] = { text: value, files: {} };
      continue;
    }
    if (!value || typeof value !== 'object') continue;
    const entry = value as Partial<StoredTool>;
    if (typeof entry.text !== 'string') continue;
    const files: Record<string, string> = {};
    if (entry.files && typeof entry.files === 'object') {
      for (const [name, body] of Object.entries(entry.files)) {
        if (typeof body === 'string') files[name] = body;
      }
    }
    out[id] = { text: entry.text, files };
  }
  return out;
}

function definitions(): Map<string, ToolDefinition> {
  const tools = installedTools();
  const raw = JSON.stringify(tools);
  if (cache && cache.raw === raw) return cache.definitions;
  const map = new Map<string, ToolDefinition>();
  for (const [id, entry] of Object.entries(tools)) {
    const result = parseToolFile(entry.text, entry.files);
    if (result.definition && result.definition.id === id) map.set(id, result.definition);
  }
  cache = { raw, definitions: map };
  return map;
}

/** Every installed tool file the app can still read, newest name order. */
export function installedToolDefinitions(): ToolDefinition[] {
  return [...definitions().values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function toolFileDefinition(id: string): ToolDefinition | undefined {
  return definitions().get(id);
}

export function isInstalledToolFile(id: string): boolean {
  return definitions().has(id);
}

export function exportToolFile(id: string): string {
  const entry = installedTools()[id];
  if (!entry) return '';
  // A definition that came with `.js` files exports with those bodies inline, so
  // one file still carries everything it needs.
  if (!Object.keys(entry.files).length) return entry.text;
  const definition = toolFileDefinition(id);
  return definition ? serializeToolFile(definition) : entry.text;
}

/** Parse first, then store. A file with errors is never installed. */
export function installToolFile(
  text: string,
  files: Record<string, string> = {},
): ToolFileResult {
  const clean: Record<string, string> = {};
  for (const [name, body] of Object.entries(files)) {
    const key = String(name ?? '').trim();
    if (key && typeof body === 'string') clean[key] = body;
  }
  const result = parseToolFile(text, clean);
  if (!result.ok || !result.definition) return result;
  const tools = installedTools();
  tools[result.definition.id] = { text: String(text), files: clean };
  writeJson(KEYS.toolFiles, tools);
  cache = null;
  return result;
}

export function removeToolFile(id: string): void {
  const tools = installedTools();
  delete tools[id];
  writeJson(KEYS.toolFiles, tools);
  cache = null;
}

/** The schema a template resolves an id against: compiled tools first, files second. */
export function toolSchema(id: string): PresetSchema | undefined {
  return schemas[id] ?? toolFileDefinition(id)?.settings;
}

/** A file's shape back to text: same input, same file, diff-friendly. */
export function serializeToolFile(definition: ToolDefinition): string {
  const out: string[] = [];
  out.push(`# ${definition.name} — a Game Buddy tool`);
  out.push('');
  out.push('[tool]');
  out.push(`id: ${definition.id}`);
  out.push(`name: ${definition.name}`);
  if (definition.blurb) out.push(`blurb: ${definition.blurb}`);
  out.push(`family: ${definition.family}`);
  out.push(`seats: ${definition.seats}`);
  if (definition.icon) out.push(`icon: ${definition.icon}`);
  if (definition.tags.length) out.push(`tags: ${definition.tags.join(', ')}`);

  const settings = Object.entries(definition.settings);
  if (settings.length) {
    out.push('');
    out.push('[setting]');
    for (const [key, spec] of settings) {
      if (spec.type === 'text' && spec.default.includes('\n')) {
        out.push(`${key}: text = |`);
        for (const line of spec.default.split('\n')) out.push(`  ${line}`);
        continue;
      }
      out.push(`${key}: ${settingText(spec)}`);
    }
  }

  for (const block of definition.blocks) {
    out.push('');
    out.push(`[block ${block.id}]`);
    out.push(`kind: ${block.kind}`);
    const keys = BLOCK_KEYS[block.kind];
    for (const key of keys) {
      const value = block.options[key];
      if (value === undefined) continue;
      if (key === 'text' && value.includes('\n')) {
        out.push('text: |');
        for (const line of value.split('\n')) out.push(`  ${line}`);
        continue;
      }
      out.push(`${key}: ${value}`);
    }
  }

  for (const script of definition.scripts) {
    out.push('');
    out.push(`[script ${script.id}]`);
    if (script.when !== 'none') out.push(`when: ${script.when}`);
    out.push('body: |');
    for (const line of script.body.split('\n')) out.push(`  ${line}`);
  }

  out.push('');
  return out.join('\n');
}

function settingText(spec: FieldSpec): string {
  switch (spec.type) {
    case 'number': {
      const bounds =
        spec.min === undefined && spec.max === undefined
          ? ''
          : `(${spec.min ?? 0}..${spec.max ?? ''})`;
      return `number${bounds} = ${spec.default}`;
    }
    case 'duration':
      return `duration = ${spec.default}`;
    case 'boolean':
      return `boolean = ${spec.default ? 'yes' : 'no'}`;
    case 'enum':
      return `enum(${spec.values.join(', ')}) = ${spec.default}`;
    case 'list':
      return `list = ${spec.default.map((item) => (item.includes(',') ? `"${item}"` : item)).join(', ')}`;
    case 'pairs':
      return `pairs = ${Object.entries(spec.default)
        .map(([key, value]) => `${key}=${value}`)
        .join(', ')}`;
    case 'color':
      return `color = ${spec.default}`;
    case 'text':
      return `text = ${spec.default}`;
    default:
      return `string = ${spec.default}`;
  }
}

/** The words a formula may name, for the editor's preview. */
export function formulaNames(definition: ToolDefinition): string[] {
  return definition.blocks
    .filter((block) => block.kind === 'counter' || block.kind === 'field' || block.kind === 'roll')
    .map((block) => block.id);
}
