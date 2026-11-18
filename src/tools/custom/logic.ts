/** Build-your-own tracker: fields, counters, a checklist, a table and formulas. */

import { evaluateFormula } from '../../core/formula';
import { translate } from '../../core/i18n';

export { evaluateFormula };

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
  /** Stable key, so two generated seats never collide on a blank name. */
  id: string;
  /** The name as stored: blank for a seat the app generated. */
  name: string;
  /** Set for a generated seat: said in the active language when it is shown. */
  seat?: number;
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
    lines.push(translate('custom.summary-field', { label: field.label, value: String(field.value) }));
  }
  for (const counter of state.counters)
    lines.push(translate('custom.summary-field', { label: counter.label, value: counter.value }));
  const done = state.checklist.filter((item) => item.done).length;
  if (state.checklist.length)
    lines.push(translate('custom.summary-checklist', { done, total: state.checklist.length }));
  if (state.table.cells.length)
    lines.push(translate('custom.summary-table', { value: grandTotal(state.table) }));
  const result = evaluateFormula(state.formula, formulaVars(state));
  if (result !== null) lines.push(translate('custom.summary-formula', { value: result }));
  return lines.length ? lines.join('\n') : translate('custom.summary-none');
}
