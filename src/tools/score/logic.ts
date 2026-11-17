import type { ToolInstance } from '../../core/registry';

export type ScoreMode = 'simple' | 'rounds' | 'categories';
export const SCORE_MODES: ScoreMode[] = ['simple', 'rounds', 'categories'];

export interface ScorePlayer {
  id: string;
  name: string;
  color: string;
}

export interface ScoreCategory {
  name: string;
  points: number;
}

export interface ScoreState {
  mode: ScoreMode;
  players: ScorePlayer[];
  /** Running totals for simple mode. */
  totals: Record<string, number>;
  /** Per-round cells for rounds mode. */
  rounds: Record<string, number[]>;
  /** Counts per player per category for categories mode. */
  counts: Record<string, Record<string, number>>;
  categories: ScoreCategory[];
  formula: string;
  roundCount: number;
  step: number;
  target: number;
  win: 'highest' | 'lowest';
  start: number;
  hidden: boolean;
  revealed: boolean;
}

export interface Standing {
  id: string;
  name: string;
  color: string;
  total: number;
  rank: number;
  tied: boolean;
}

export interface ScoreActions {
  adjust(id: string, delta: number): void;
  setTotal(id: string, value: number): void;
  setRound(id: string, round: number, value: number): void;
  addRound(): void;
  removeRound(): void;
  addPlayer(name: string): void;
  renamePlayer(id: string, name: string): void;
  syncPlayers(): void;
  clearAll(): void;
  setMode(mode: ScoreMode): void;
  setCategoryCount(id: string, category: string, value: number): void;
  setCategories(categories: ScoreCategory[]): void;
  setFormula(text: string): void;
  setHidden(value: boolean): void;
  reveal(): void;
  totalFor(id: string): number;
  standings(): Standing[];
}

export type ScoreInstance = ToolInstance<ScoreState> & ScoreActions;

/* ------------------------------------------------------------------ */
/* Formula evaluation                                                  */
/* ------------------------------------------------------------------ */

export interface FormulaResult {
  ok: boolean;
  value: number;
  message: string;
}

type Token = { type: 'number' | 'name' | 'op'; text: string; at: number };

const FUNCTIONS = ['min', 'max', 'sum', 'if', 'abs', 'round', 'floor', 'ceil'];

function tokenize(expression: string): Token[] | string {
  const tokens: Token[] = [];
  let index = 0;
  while (index < expression.length) {
    const char = expression[index];
    if (/\s/.test(char)) {
      index += 1;
      continue;
    }
    if (/[0-9.]/.test(char)) {
      const match = expression.slice(index).match(/^\d+(?:\.\d+)?/);
      if (!match) return `Unexpected character "${char}"`;
      tokens.push({ type: 'number', text: match[0], at: index });
      index += match[0].length;
      continue;
    }
    if (/[A-Za-z_]/.test(char)) {
      const match = expression.slice(index).match(/^[A-Za-z_][A-Za-z0-9_-]*/);
      if (!match) return 'Could not read a name';
      tokens.push({ type: 'name', text: match[0], at: index });
      index += match[0].length;
      continue;
    }
    const two = expression.slice(index, index + 2);
    if (['<=', '>=', '==', '!='].includes(two)) {
      tokens.push({ type: 'op', text: two, at: index });
      index += 2;
      continue;
    }
    if ('+-*/(),<>'.includes(char)) {
      tokens.push({ type: 'op', text: char, at: index });
      index += 1;
      continue;
    }
    return `Unexpected character "${char}"`;
  }
  return tokens;
}

/**
 * Tiny arithmetic language for score formulas: numbers, names, `+ - * /`,
 * parentheses and min/max/sum/if/abs/round/floor/ceil, plus comparisons inside
 * `if`. No eval, no property access, no loops.
 */
export function evaluateFormula(expression: string, scope: Record<string, number>): FormulaResult {
  const tokenized = tokenize(expression);
  if (typeof tokenized === 'string') return { ok: false, value: 0, message: tokenized };
  const tokens = tokenized;
  let position = 0;

  const fail = (message: string): FormulaResult => ({ ok: false, value: 0, message });
  const peek = (): Token | undefined => tokens[position];
  const take = (): Token | undefined => tokens[position++];
  const isOp = (text: string): boolean => peek()?.type === 'op' && peek()?.text === text;

  const parseArgs = (): number[] | string => {
    const args: number[] = [];
    if (isOp(')')) {
      take();
      return args;
    }
    for (;;) {
      const value = parseComparison();
      if (typeof value === 'string') return value;
      args.push(value);
      if (isOp(',')) {
        take();
        continue;
      }
      if (isOp(')')) {
        take();
        return args;
      }
      return 'Expected a comma or a closing bracket';
    }
  };

  function parseComparison(): number | string {
    let left = parseSum();
    if (typeof left === 'string') return left;
    const token = peek();
    if (token && token.type === 'op' && ['<', '>', '<=', '>=', '==', '!='].includes(token.text)) {
      take();
      const right = parseSum();
      if (typeof right === 'string') return right;
      switch (token.text) {
        case '<':
          return left < right ? 1 : 0;
        case '>':
          return left > right ? 1 : 0;
        case '<=':
          return left <= right ? 1 : 0;
        case '>=':
          return left >= right ? 1 : 0;
        case '==':
          return left === right ? 1 : 0;
        default:
          return left !== right ? 1 : 0;
      }
    }
    return left;
  }

  function parseSum(): number | string {
    let left = parseTerm();
    if (typeof left === 'string') return left;
    while (peek()?.type === 'op' && (peek()?.text === '+' || peek()?.text === '-')) {
      const op = take()!.text;
      const right = parseTerm();
      if (typeof right === 'string') return right;
      left = op === '+' ? left + right : left - right;
    }
    return left;
  }

  function parseTerm(): number | string {
    let left = parseUnary();
    if (typeof left === 'string') return left;
    while (peek()?.type === 'op' && (peek()?.text === '*' || peek()?.text === '/')) {
      const op = take()!.text;
      const right = parseUnary();
      if (typeof right === 'string') return right;
      if (op === '/') {
        if (right === 0) return 'Division by zero';
        left = left / right;
      } else {
        left = left * right;
      }
    }
    return left;
  }

  function parseUnary(): number | string {
    if (isOp('-')) {
      take();
      const value = parseUnary();
      if (typeof value === 'string') return value;
      return -value;
    }
    return parsePrimary();
  }

  function parsePrimary(): number | string {
    const token = peek();
    if (!token) return 'The formula stops too early';
    if (token.type === 'number') {
      take();
      return Number(token.text);
    }
    if (token.type === 'name') {
      take();
      const name = token.text;
      if (isOp('(')) {
        take();
        if (!FUNCTIONS.includes(name)) return `Unknown function "${name}"`;
        const args = parseArgs();
        if (typeof args === 'string') return args;
        switch (name) {
          case 'min':
            return args.length ? Math.min(...args) : 0;
          case 'max':
            return args.length ? Math.max(...args) : 0;
          case 'sum':
            return args.reduce((total, value) => total + value, 0);
          case 'abs':
            return Math.abs(args[0] ?? 0);
          case 'round':
            return Math.round(args[0] ?? 0);
          case 'floor':
            return Math.floor(args[0] ?? 0);
          case 'ceil':
            return Math.ceil(args[0] ?? 0);
          case 'if':
            return (args[0] ?? 0) !== 0 ? (args[1] ?? 0) : (args[2] ?? 0);
          default:
            return `Unknown function "${name}"`;
        }
      }
      const key = normaliseName(name);
      if (!(key in scope)) {
        return `Unknown name "${name}". Categories: ${Object.keys(scope).join(', ') || 'none yet'}`;
      }
      return scope[key];
    }
    if (isOp('(')) {
      take();
      const value = parseComparison();
      if (typeof value === 'string') return value;
      if (!isOp(')')) return 'Missing a closing bracket';
      take();
      return value;
    }
    return `Unexpected "${token.text}"`;
  }

  const value = parseComparison();
  if (typeof value === 'string') return fail(value);
  if (position < tokens.length) return fail(`Unexpected "${tokens[position].text}"`);
  if (!Number.isFinite(value)) return fail('That formula does not produce a number');
  return { ok: true, value: Math.round(value * 100) / 100, message: '' };
}

/** Category names become formula-safe identifiers. */
export function normaliseName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-');
}

/* ------------------------------------------------------------------ */
/* Totals                                                              */
/* ------------------------------------------------------------------ */

export function categoryValue(state: ScoreState, playerId: string, name: string): number {
  const category = state.categories.find((item) => item.name === name);
  const count = state.counts[playerId]?.[name] ?? 0;
  return count * (category?.points ?? 0);
}

function formulaScope(state: ScoreState, playerId: string): Record<string, number> {
  const scope: Record<string, number> = {};
  for (const category of state.categories) {
    scope[normaliseName(category.name)] = categoryValue(state, playerId, category.name);
  }
  return scope;
}

export function categoryTotal(state: ScoreState, playerId: string): number {
  if (state.formula.trim()) {
    const result = evaluateFormula(state.formula, formulaScope(state, playerId));
    if (result.ok) return result.value;
  }
  return state.categories.reduce((sum, category) => sum + categoryValue(state, playerId, category.name), 0);
}

export function totalFor(state: ScoreState, id: string): number {
  if (state.mode === 'rounds') {
    const row = state.rounds[id] ?? [];
    return row.reduce((sum, value) => sum + (Number.isFinite(value) ? value : 0), state.start);
  }
  if (state.mode === 'categories') {
    return categoryTotal(state, id) + state.start;
  }
  return state.totals[id] ?? state.start;
}

/** Ranked standings; ties share a rank and are flagged so the UI can say so. */
export function standingsFor(state: ScoreState): Standing[] {
  const rows = state.players.map((player) => ({
    id: player.id,
    name: player.name,
    color: player.color,
    total: totalFor(state, player.id),
  }));
  const sorted = rows.slice().sort((a, b) => (state.win === 'lowest' ? a.total - b.total : b.total - a.total));
  const out: Standing[] = [];
  let rank = 0;
  let previous: number | null = null;
  let seen = 0;
  for (const row of sorted) {
    seen += 1;
    if (previous === null || row.total !== previous) {
      rank = seen;
      previous = row.total;
    }
    out.push({ ...row, rank, tied: false });
  }
  for (const row of out) {
    row.tied = out.filter((other) => other.total === row.total).length > 1;
  }
  return out;
}

export function scoreSheet(state: ScoreState): string {
  const rows = standingsFor(state);
  const lines = [`${state.win === 'lowest' ? 'Lowest' : 'Highest'} score wins`];
  if (state.target) lines.push(`Target: ${state.target}`);
  if (state.mode === 'categories' && state.formula.trim()) lines.push(`Formula: ${state.formula}`);
  lines.push('');
  for (const row of rows) {
    const detail =
      state.mode === 'categories'
        ? state.categories.map((cat) => `${cat.name} ${state.counts[row.id]?.[cat.name] ?? 0}`).join(', ')
        : state.mode === 'rounds'
          ? (state.rounds[row.id] ?? []).filter((value) => Number.isFinite(value) && value !== 0).join(', ')
          : '';
    lines.push(`${row.rank}. ${row.name}: ${row.total}${detail ? ` (${detail})` : ''}`);
  }
  return lines.join('\n');
}

export function csvSheet(state: ScoreState): string {
  const header = ['Player', 'Total'];
  if (state.mode === 'rounds') {
    for (let index = 1; index <= state.roundCount; index += 1) header.push(`Round ${index}`);
  }
  if (state.mode === 'categories') {
    for (const category of state.categories) header.push(category.name);
    if (state.formula.trim()) header.push('Formula');
  }
  const rows = [header.join(',')];
  for (const player of state.players) {
    const cells: string[] = [quote(player.name), String(totalFor(state, player.id))];
    if (state.mode === 'rounds') {
      for (let index = 0; index < state.roundCount; index += 1) {
        cells.push(String(state.rounds[player.id]?.[index] ?? ''));
      }
    }
    if (state.mode === 'categories') {
      for (const category of state.categories) cells.push(String(state.counts[player.id]?.[category.name] ?? 0));
      if (state.formula.trim()) cells.push(quote(state.formula));
    }
    rows.push(cells.join(','));
  }
  return rows.join('\n');
}

function quote(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}
