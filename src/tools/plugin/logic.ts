/** The tool-file runtime's data shapes. No Svelte here. */

import { evaluateFormula } from '../../core/formula';
import { translate } from '../../core/i18n';
import type { Rng } from '../../core/rng';
import type { ResolvedBlock } from '../../core/tool-file';

export interface PluginSheet {
  /** Stable seat key, so two generated seats never collide. */
  id: string;
  name: string;
  seat?: number;
  values: Record<string, number>;
}

export interface PluginTable {
  rows: number;
  cols: number;
  cells: number[];
}

export interface PluginState {
  /** The definition this session was started from. */
  toolId: string;
  name: string;
  /** Coerced settings, exactly what the template block passed. */
  values: Record<string, unknown>;
  counters: Record<string, number>;
  /** Per-player values, keyed by the session player's stable id (or `seat-N`). */
  sheets: Record<string, Record<string, number>>;
  checks: Record<string, boolean[]>;
  fields: Record<string, string | number>;
  tables: Record<string, PluginTable>;
  rolls: Record<string, string>;
  picks: Record<string, string[]>;
  log: string[];
}

export function makeTable(rows: number, cols: number, previous?: PluginTable): PluginTable {
  const safeRows = Math.max(1, Math.min(20, Math.round(rows)));
  const safeCols = Math.max(1, Math.min(12, Math.round(cols)));
  const cells: number[] = [];
  for (let row = 0; row < safeRows; row += 1) {
    for (let col = 0; col < safeCols; col += 1) {
      cells.push(previous?.cells[row * previous.cols + col] ?? 0);
    }
  }
  return { rows: safeRows, cols: safeCols, cells };
}

export function rowTotal(table: PluginTable, row: number): number {
  let total = 0;
  for (let col = 0; col < table.cols; col += 1) total += table.cells[row * table.cols + col] ?? 0;
  return total;
}

export function colTotal(table: PluginTable, col: number): number {
  let total = 0;
  for (let row = 0; row < table.rows; row += 1) total += table.cells[row * table.cols + col] ?? 0;
  return total;
}

export function tableTotal(table: PluginTable): number {
  return table.cells.reduce((sum, value) => sum + (Number(value) || 0), 0);
}

/** One roll, read from `NdM+K` with the block's faces and count as fallbacks. */
export function rollOnce(
  block: ResolvedBlock,
  rng: Rng,
): { total: number; text: string } {
  const match = block.notation.match(/^\s*(\d*)\s*d\s*(\d+)\s*([+-]\s*\d+)?\s*$/i);
  const count = Math.max(1, Math.min(20, match?.[1] ? Number(match[1]) : block.count));
  const faces = Math.max(2, match?.[2] ? Number(match[2]) : block.faces);
  const bonus = match?.[3] ? Number(match[3].replace(/\s+/g, '')) : 0;
  const dice = Array.from({ length: count }, () => rng.int(faces) + 1);
  const total = dice.reduce((sum, value) => sum + value, 0) + bonus;
  const sign = bonus === 0 ? '' : bonus > 0 ? ` + ${bonus}` : ` − ${Math.abs(bonus)}`;
  return { total, text: count === 1 ? `${total}` : `${dice.join(' + ')}${sign} = ${total}` };
}

/** Every number a formula may name: counters, number fields and roll results. */
export function formulaVarsOf(
  state: PluginState,
  blocks: ResolvedBlock[],
  sheets: PluginSheet[],
): Record<string, number> {
  const vars: Record<string, number> = {
    total: Object.values(state.tables).reduce((sum, table) => sum + tableTotal(table), 0),
  };
  let counterTotal = 0;
  for (const block of blocks) {
    if (block.kind !== 'counter') continue;
    if (block.perPlayer) {
      for (const sheet of sheets) {
        const value = sheet.values[block.id] ?? block.start;
        vars[block.id] = (vars[block.id] ?? 0) + value;
        counterTotal += value;
      }
      continue;
    }
    const value = state.counters[block.id] ?? block.start;
    vars[block.id] = value;
    counterTotal += value;
  }
  vars.counters = counterTotal;
  for (const block of blocks) {
    if (block.kind === 'field' && block.fieldType === 'number') {
      vars[block.id] = Number(state.fields[block.id]) || 0;
    }
    if (block.kind === 'roll') {
      vars[block.id] = Number(state.rolls[block.id]?.split('=').pop() ?? '') || 0;
    }
  }
  return vars;
}

export function readoutOf(
  state: PluginState,
  blocks: ResolvedBlock[],
  block: ResolvedBlock,
  sheets: PluginSheet[],
): number | null {
  return evaluateFormula(block.formula, formulaVarsOf(state, blocks, sheets));
}

export function summaryOf(
  state: PluginState,
  blocks: ResolvedBlock[],
  sheets: PluginSheet[],
): string {
  if (!blocks.length) return translate('plugin.summary-empty');
  const lines: string[] = [];
  for (const block of blocks) {
    if (block.kind === 'counter') {
      if (block.perPlayer) {
        for (const sheet of sheets) {
          const name = sheet.seat ? translate('players.default', { count: sheet.seat }) : sheet.name;
          lines.push(`${block.label} · ${name}: ${sheet.values[block.id] ?? block.start}`);
        }
      } else {
        lines.push(`${block.label}: ${state.counters[block.id] ?? block.start}`);
      }
    } else if (block.kind === 'checklist') {
      const checks = state.checks[block.id] ?? [];
      const done = checks.filter(Boolean).length;
      lines.push(translate('plugin.summary-checklist', { label: block.label, done, total: block.items.length }));
    } else if (block.kind === 'table') {
      const table = state.tables[block.id];
      lines.push(
        translate('plugin.summary-table', {
          label: block.label,
          value: table ? tableTotal(table) : 0,
        }),
      );
    } else if (block.kind === 'field' && block.fieldType !== 'note') {
      lines.push(`${block.label}: ${state.fields[block.id] ?? ''}`);
    } else if (block.kind === 'roll' && state.rolls[block.id]) {
      lines.push(`${block.label}: ${state.rolls[block.id]}`);
    } else if (block.kind === 'pick' && state.picks[block.id]?.length) {
      lines.push(`${block.label}: ${state.picks[block.id].join(', ')}`);
    } else if (block.kind === 'readout') {
      const value = readoutOf(state, blocks, block, sheets);
      lines.push(`${block.label}: ${value === null ? '—' : value}`);
    }
  }
  return lines.length ? lines.join('\n') : translate('plugin.summary-empty');
}
