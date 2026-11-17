/** Build-your-own tracker: fields, counters, a checklist, a table and formulas. */

export type FieldType = 'text' | 'number' | 'checkbox' | 'select' | 'note';

export interface CustomField {
  id: string;
  label: string;
  type: FieldType;
  options: string[];
  value: string | number | boolean;
}

export interface CustomCounter {
  id: string;
  label: string;
  value: number;
  step: number;
  min: number;
  max: number;
}

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface TableData {
  rows: number;
  cols: number;
  /** Row-major numeric cells, `rows * cols` long. */
  cells: number[];
}

export interface PlayerSheet {
  name: string;
  values: Record<string, number>;
}

export interface CustomState {
  fields: CustomField[];
  counters: CustomCounter[];
  checklist: ChecklistItem[];
  table: TableData;
  formula: string;
  perPlayer: boolean;
  players: PlayerSheet[];
  history: string[];
}

export function makeTable(rows: number, cols: number, previous?: TableData): TableData {
  const safeRows = Math.max(1, Math.min(20, Math.round(rows)));
  const safeCols = Math.max(1, Math.min(12, Math.round(cols)));
  const cells: number[] = [];
  for (let row = 0; row < safeRows; row += 1) {
    for (let col = 0; col < safeCols; col += 1) {
      cells.push(previous?.cells[row * (previous.cols) + col] ?? 0);
    }
  }
  return { rows: safeRows, cols: safeCols, cells };
}

export function rowTotal(table: TableData, row: number): number {
  let total = 0;
  for (let col = 0; col < table.cols; col += 1) total += table.cells[row * table.cols + col] ?? 0;
  return total;
}

export function colTotal(table: TableData, col: number): number {
  let total = 0;
  for (let row = 0; row < table.rows; row += 1) total += table.cells[row * table.cols + col] ?? 0;
  return total;
}

export function grandTotal(table: TableData): number {
  return table.cells.reduce((sum, value) => sum + (Number(value) || 0), 0);
}

const ALLOWED = /^[a-z0-9_+\-*/().,%\s]+$/i;

/**
 * Tiny formula evaluator: numbers, variables, + - * / ( ) and min/max/round/abs.
 * Returns null instead of throwing, so a half-typed formula never breaks a sheet.
 */
export function evaluateFormula(expression: string, vars: Record<string, number>): number | null {
  const text = String(expression ?? '').trim();
  if (!text) return null;
  if (!ALLOWED.test(text.replace(/\b(min|max|round|abs)\b/gi, ''))) return null;
  const found = text.match(/[a-zA-Z_][a-zA-Z0-9_]*|\d+(?:\.\d+)?|[()+\-*/,]/g);
  if (!found) return null;
  const tokens: string[] = found;
  let position = 0;

  const peek = (): string | undefined => tokens[position];

  function parseExpression(): number | null {
    let left = parseTerm();
    if (left === null) return null;
    while (peek() === '+' || peek() === '-') {
      const operator = tokens[position];
      position += 1;
      const right = parseTerm();
      if (right === null) return null;
      left = operator === '+' ? left + right : left - right;
    }
    return left;
  }

  function parseTerm(): number | null {
    let left = parseFactor();
    if (left === null) return null;
    while (peek() === '*' || peek() === '/') {
      const operator = tokens[position];
      position += 1;
      const right = parseFactor();
      if (right === null) return null;
      if (operator === '/' && right === 0) return null;
      left = operator === '*' ? left * right : left / right;
    }
    return left;
  }

  function parseFactor(): number | null {
    const token = peek();
    if (token === undefined) return null;
    if (token === '(') {
      position += 1;
      const value = parseExpression();
      if (peek() !== ')') return null;
      position += 1;
      return value;
    }
    if (token === '-') {
      position += 1;
      const value = parseFactor();
      return value === null ? null : -value;
    }
    if (/^\d/.test(token)) {
      position += 1;
      return Number(token);
    }
    if (/^[a-zA-Z_]/.test(token)) {
      position += 1;
      const name = token.toLowerCase();
      if (['min', 'max', 'round', 'abs'].includes(name)) {
        if (peek() !== '(') return null;
        position += 1;
        const args: number[] = [];
        let value = parseExpression();
        if (value === null) return null;
        args.push(value);
        while (peek() === ',') {
          position += 1;
          value = parseExpression();
          if (value === null) return null;
          args.push(value);
        }
        if (peek() !== ')') return null;
        position += 1;
        if (name === 'min') return Math.min(...args);
        if (name === 'max') return Math.max(...args);
        if (name === 'round') return Math.round(args[0]);
        return Math.abs(args[0]);
      }
      return vars[name] ?? null;
    }
    return null;
  }

  const result = parseExpression();
  if (result === null || position !== tokens.length) return null;
  return Number.isFinite(result) ? result : null;
}

export function formulaVars(state: CustomState, player?: PlayerSheet): Record<string, number> {
  const vars: Record<string, number> = { total: grandTotal(state.table) };
  let counterTotal = 0;
  for (const counter of state.counters) {
    const value = player ? player.values[counter.id] ?? counter.value : counter.value;
    vars[counter.id.toLowerCase()] = value;
    vars[counter.label.toLowerCase().replace(/\s+/g, '_')] = value;
    counterTotal += value;
  }
  vars.counters = counterTotal;
  for (const field of state.fields) {
    if (field.type === 'number') vars[field.id.toLowerCase()] = Number(field.value) || 0;
  }
  return vars;
}

export function summaryOf(state: CustomState): string {
  const lines: string[] = [];
  for (const field of state.fields) {
    if (field.type === 'note') continue;
    lines.push(`${field.label}: ${String(field.value)}`);
  }
  for (const counter of state.counters) lines.push(`${counter.label}: ${counter.value}`);
  const done = state.checklist.filter((item) => item.done).length;
  if (state.checklist.length) lines.push(`Checklist: ${done}/${state.checklist.length}`);
  if (state.table.cells.length) lines.push(`Table total: ${grandTotal(state.table)}`);
  const result = evaluateFormula(state.formula, formulaVars(state));
  if (result !== null) lines.push(`Formula: ${result}`);
  return lines.length ? lines.join('\n') : 'An empty sheet. Add a field or a counter.';
}
