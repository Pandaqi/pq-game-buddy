/**
 * Dice notation: counts, sides, modifiers, keep/drop, reroll, exploding and
 * success counting. Fate dice use sides 0 and values -1..1.
 */

import { translate } from '../../core/i18n';
import type { Rng } from '../../core/rng';
import type { ToolInstance } from '../../core/registry';

export interface DiceTerm {
  count: number;
  /** 0 means Fate dice (dF). */
  sides: number;
  sign: 1 | -1;
  keepHigh?: number;
  keepLow?: number;
  reroll?: number;
  explode?: boolean;
  successAt?: number;
  source: string;
}

export interface DiceExpression {
  terms: DiceTerm[];
  modifier: number;
}

export interface RolledTerm extends DiceTerm {
  rolls: number[];
  kept: number[];
  successes: number;
}

export interface DiceResult {
  terms: RolledTerm[];
  total: number;
  successes: number;
  best: number;
  worst: number;
}

export type ParseOutcome =
  | { ok: true; expression: DiceExpression }
  | { ok: false; message: string };

const MAX_DICE = 100;
const MAX_SIDES = 1000;

export function parseDice(input: string): ParseOutcome {
  const text = String(input ?? '').trim().toLowerCase().replace(/\s+/g, '');
  if (!text) return { ok: false, message: translate('dice.error-empty') };

  const terms: DiceTerm[] = [];
  let modifier = 0;
  const parts = text.match(/[+-]?[^+-]+/g) ?? [];

  for (const rawPart of parts) {
    let part = rawPart;
    let sign: 1 | -1 = 1;
    if (part.startsWith('+')) part = part.slice(1);
    else if (part.startsWith('-')) {
      sign = -1;
      part = part.slice(1);
    }
    if (!part) return { ok: false, message: translate('dice.error-not-a-die', { part: rawPart }) };

    const match = part.match(/^(\d*)d(\d+|%|f)(.*)$/);
    if (!match) {
      const numeric = Number(part);
      if (!Number.isFinite(numeric)) {
        return { ok: false, message: translate('dice.error-unreadable', { part: rawPart }) };
      }
      modifier += sign * numeric;
      continue;
    }

    const count = match[1] === '' ? 1 : Number(match[1]);
    if (!Number.isFinite(count) || count < 1) {
      return { ok: false, message: translate('dice.error-count') };
    }
    if (count > MAX_DICE) return { ok: false, message: translate('dice.error-too-many', { max: MAX_DICE }) };

    let sides: number;
    if (match[2] === '%') sides = 100;
    else if (match[2] === 'f') sides = 0;
    else sides = Number(match[2]);
    if (sides !== 0 && (sides < 2 || sides > MAX_SIDES)) {
      return { ok: false, message: translate('dice.error-sides', { max: MAX_SIDES }) };
    }

    let rest = match[3] ?? '';
    const term: DiceTerm = { count, sides, sign, source: part };
    let guard = 0;
    while (rest && guard < 8) {
      guard += 1;
      const op = rest.match(/^(kh|kl|r|!|>)(\d*)/);
      if (!op) return { ok: false, message: translate('dice.error-modifier', { part: rest }) };
      const code = op[1];
      const value = op[2] ? Number(op[2]) : 0;
      rest = rest.slice(op[0].length);
      if (code === 'kh') {
        if (value < 1) return { ok: false, message: translate('dice.error-keep-high') };
        term.keepHigh = value;
      } else if (code === 'kl') {
        if (value < 1) return { ok: false, message: translate('dice.error-keep-low') };
        term.keepLow = value;
      }
      else if (code === 'r') {
        if (!value) return { ok: false, message: translate('dice.error-reroll') };
        term.reroll = value;
      } else if (code === '!') term.explode = true;
      else if (code === '>') {
        if (!value) return { ok: false, message: translate('dice.error-successes') };
        term.successAt = value;
      }
    }
    terms.push(term);
  }

  if (!terms.length && modifier === 0) {
    return { ok: false, message: translate('dice.error-no-dice') };
  }
  return { ok: true, expression: { terms, modifier } };
}

function rollDie(sides: number, rng: Rng): number {
  if (sides === 0) return rng.int(3) - 1;
  return rng.int(sides) + 1;
}

export function rollDice(expression: DiceExpression, rng: Rng): DiceResult {
  const terms: RolledTerm[] = [];
  let total = expression.modifier;
  let successes = 0;
  let best = -Infinity;
  let worst = Infinity;

  for (const term of expression.terms) {
    const rolls: number[] = [];
    for (let index = 0; index < term.count; index += 1) {
      let value = rollDie(term.sides, rng);
      if (term.reroll !== undefined && value === term.reroll) value = rollDie(term.sides, rng);
      rolls.push(value);
      if (term.explode && term.sides > 0) {
        let chain = 0;
        let current = value;
        while (current === term.sides && chain < 50) {
          chain += 1;
          current = rollDie(term.sides, rng);
          rolls.push(current);
        }
      }
    }

    const indexed = rolls.map((value, index) => ({ value, index }));
    indexed.sort((a, b) => b.value - a.value);
    let keepCount = indexed.length;
    if (term.keepHigh !== undefined) keepCount = Math.min(indexed.length, term.keepHigh);
    if (term.keepLow !== undefined) {
      indexed.reverse();
      keepCount = Math.min(indexed.length, term.keepLow);
    }
    const keptIndices = new Set(indexed.slice(0, keepCount).map((item) => item.index));
    const kept = rolls.filter((_, index) => keptIndices.has(index));
    const termSuccesses =
      term.successAt !== undefined ? kept.filter((value) => value >= (term.successAt as number)).length : 0;

    const sum = kept.reduce((acc, value) => acc + value, 0);
    total += term.sign * sum;
    successes += termSuccesses;
    for (const value of kept) {
      if (value > best) best = value;
      if (value < worst) worst = value;
    }

    terms.push({ ...term, rolls, kept, successes: termSuccesses });
  }

  return {
    terms,
    total,
    successes,
    best: Number.isFinite(best) ? best : 0,
    worst: Number.isFinite(worst) ? worst : 0,
  };
}

export function describeResult(result: DiceResult): string {
  return result.terms
    .map((term) => {
      // Count the kept dice rather than remembering their values: two 5s with
      // keep-highest-1 must show one 5 kept and one dropped.
      const keptLeft = new Map<number, number>();
      for (const value of term.kept) keptLeft.set(value, (keptLeft.get(value) ?? 0) + 1);
      const marks = term.rolls.map((value) => {
        const left = keptLeft.get(value) ?? 0;
        if (left <= 0) return `(${value})`;
        keptLeft.set(value, left - 1);
        return String(value);
      });
      return `${term.sign < 0 ? '−' : ''}${term.source}: ${marks.join(' ')}`;
    })
    .join(' · ');
}

export interface DiceRollRecord {
  notation: string;
  total: number;
  successes: number;
  detail: string;
  at: number;
}

export type DiceMode = 'single' | 'pool' | 'lab';

/** One roll of a die whose faces are words instead of numbers. */
export interface LabRoll {
  faces: string[];
  results: string[];
  tally: { face: string; count: number }[];
}

export interface DiceState {
  notation: string;
  pool: string;
  mode: DiceMode;
  advantage: 'none' | 'advantage' | 'disadvantage';
  successAt: number;
  seed: string;
  macros: Record<string, string>;
  /** Custom faces for the lab, in the order the player wrote them. */
  faces: string[];
  /** How many custom dice one lab roll throws. */
  labCount: number;
  /** Saved face sets, name to faces. */
  sets: Record<string, string[]>;
  lab: LabRoll | null;
  result: DiceResult | null;
  error: string;
  history: DiceRollRecord[];
  showBreakdown: boolean;
}

export interface DiceActions {
  roll(notation?: string): void;
  setNotation(notation: string): void;
  setPool(pool: string): void;
  setMode(mode: DiceMode): void;
  setAdvantage(mode: DiceState['advantage']): void;
  setSuccessAt(value: number): void;
  setSeed(code: string): void;
  clearHistory(): void;
  setFaces(faces: string[]): void;
  setLabCount(count: number): void;
  saveSet(name: string): void;
  loadSet(name: string): void;
  deleteSet(name: string): void;
  rollLab(): void;
}

/** Count every kept die at or above the target. */
export function successesAt(result: DiceResult, target: number): number {
  if (target <= 0) return 0;
  let total = 0;
  for (const term of result.terms) {
    total += term.kept.filter((value) => value >= target).length;
  }
  return total;
}

export type DiceInstance = ToolInstance<DiceState> & DiceActions;

export function normaliseMacros(input: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!input || typeof input !== 'object') return out;
  for (const [name, value] of Object.entries(input as Record<string, unknown>)) {
    const notation = String(value ?? '').trim();
    if (name.trim() && notation) out[name.trim()] = notation;
  }
  return out;
}

/**
 * Trim and cap the faces, but keep blank slots. Editing one face clears its text
 * for a moment; collapsing the list there would throw the whole set away.
 */
export function cleanFaces(input: unknown): string[] {
  const list = Array.isArray(input) ? input : typeof input === 'string' ? input.split(/[|,]/) : [];
  const faces = list.map((value) => String(value ?? '').trim().slice(0, 20)).slice(0, 12);
  while (faces.length < 2) faces.push('');
  return faces;
}

/** The faces that actually count: named ones, in order. */
export function namedFaces(faces: string[]): string[] {
  return faces.map((face) => face.trim()).filter(Boolean);
}

/** A usable die: the named faces, or the two defaults when fewer than two are named. */
export function normaliseFaces(input: unknown): string[] {
  const faces = namedFaces(cleanFaces(input));
  return faces.length >= 2 ? faces : ['Hit', 'Miss'];
}

/** Saved sets arrive as `Hit|Miss|Blank` from a template or as a list in state. */
export function normaliseSets(input: unknown): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) return out;
  for (const [name, value] of Object.entries(input as Record<string, unknown>)) {
    const clean = String(name ?? '').trim().slice(0, 24);
    if (!clean) continue;
    const faces = normaliseFaces(value);
    if (faces.length >= 2) out[clean] = faces;
  }
  return out;
}

/** Throw `count` dice over the given faces and tally what came up. */
export function rollFaces(faces: string[], count: number, rng: Rng): LabRoll {
  const die = normaliseFaces(faces);
  const throws = Math.max(1, Math.min(12, Math.round(count) || 1));
  const results = Array.from({ length: throws }, () => die[rng.int(die.length)]);
  const tally = die
    .map((face) => ({ face, count: results.filter((result) => result === face).length }))
    .filter((row) => row.count > 0);
  return { faces: die, results, tally };
}

export function facesFor(value: number, sides: number): string {
  if (sides === 6) {
    const pips: Record<number, string> = {
      1: '⚀',
      2: '⚁',
      3: '⚂',
      4: '⚃',
      5: '⚄',
      6: '⚅',
    };
    return pips[value] ?? String(value);
  }
  if (sides === 0) return value > 0 ? '+' : value < 0 ? '−' : '0';
  return String(value);
}
