import { registerToolStrings, seatName, t as translate } from '../../core/i18n.svelte';
import type { ToolContext, ToolInstance, ToolResult } from '../../core/registry';
import { seatPair, toolSeats } from '../../core/session';
import type { PresetValues } from '../../core/template/schema';
import {
  evaluateFormula,
  formulaVars,
  grandTotal,
  makeTable,
  summaryOf,
  type ChecklistItem,
  type CustomCounter,
  type CustomField,
  type CustomState,
  type FieldType,
  type PlayerSheet,
  type TableData,
} from './logic';
import Custom from './Custom.svelte';
import meta from './meta';
import preset from './preset';
import en from './locales/en';

// A tool's words travel with its chunk; the shell only knows its title.
registerToolStrings('custom', en);

export interface CustomActions {
  setFieldValue(id: string, value: string | number | boolean): void;
  addField(label: string, type: FieldType): void;
  removeField(id: string): void;
  adjustCounter(id: string, amount: number): void;
  setCounterValue(id: string, value: number): void;
  addCounter(label: string): void;
  removeCounter(id: string): void;
  toggleChecklist(index: number): void;
  addChecklist(text: string): void;
  resetChecklist(): void;
  setTableSize(rows: number, cols: number): void;
  setCell(row: number, col: number, value: number): void;
  setFormula(value: string): void;
  setPerPlayer(value: boolean): void;
  setPlayerValue(playerId: string, key: string, value: number): void;
  adjustPlayerValue(playerId: string, key: string, amount: number): void;
  formulaResult(playerId?: string): number | null;
}

export type CustomInstance = ToolInstance<CustomState> & CustomActions;

function parseSize(text: string): { rows: number; cols: number } {
  const match = String(text ?? '').match(/^\s*(\d+)\s*[x×]\s*(\d+)\s*$/i);
  if (!match) return { rows: 3, cols: 3 };
  return { rows: Number(match[1]), cols: Number(match[2]) };
}

function create(ctx: ToolContext, values: PresetValues = {}): CustomInstance {
  const fieldPairs = (values.fields as Record<string, string | number>) ?? {};
  const counterPairs = (values.counters as Record<string, string | number>) ?? {};
  const size = parseSize(String(values.table ?? '3x3'));
  const seats = toolSeats(ctx.session.players(), 2);

  const fields: CustomField[] = Object.entries(fieldPairs).map(([label, type], index) => ({
    id: `f${index + 1}`,
    label,
    type: (['text', 'number', 'checkbox', 'select', 'note'].includes(String(type)) ? String(type) : 'text') as FieldType,
    options: [],
    value: String(type) === 'checkbox' ? false : String(type) === 'number' ? 0 : '',
  }));

  const counters: CustomCounter[] = Object.entries(counterPairs).map(([label, start], index) => ({
    id: `c${index + 1}`,
    label,
    value: Number(start) || 0,
    step: 1,
    min: -999,
    max: 9999,
  }));

  const data = $state<CustomState>({
    fields,
    counters,
    checklist: (Array.isArray(values.checklist) ? (values.checklist as string[]) : []).map((text, index) => ({
      id: `k${index + 1}`,
      text: String(text),
      done: false,
    })),
    table: makeTable(size.rows, size.cols),
    formula: String(values.formula ?? ''),
    perPlayer: !!values['per-player'],
    players: seats.map<PlayerSheet>((seat, index) => ({
      id: `p${index + 1}`,
      name: seat.name,
      ...(seat.seat ? { seat: seat.seat } : {}),
      values: Object.fromEntries(counters.map((counter) => [counter.id, counter.value])),
    })),
    history: [],
  });

  function note(text: string): void {
    data.history = [text, ...data.history].slice(0, 12);
  }

  function playerById(id: string): PlayerSheet | undefined {
    return data.players.find((player) => player.id === id);
  }

  const instance: CustomInstance = {
    data,
    state: () => JSON.parse(JSON.stringify(data)) as CustomState,
    load(state) {
      if (!state || typeof state !== 'object') return;
      const raw = state as Partial<CustomState>;
      if (Array.isArray(raw.fields)) {
        data.fields = raw.fields
          .filter((field) => field && typeof field.label === 'string')
          .map((field, index) => ({
            id: String(field.id ?? `f${index + 1}`),
            label: field.label,
            type: (['text', 'number', 'checkbox', 'select', 'note'].includes(field.type) ? field.type : 'text') as FieldType,
            options: Array.isArray(field.options) ? field.options.map(String) : [],
            value: field.value ?? '',
          }));
      }
      if (Array.isArray(raw.counters)) {
        data.counters = raw.counters
          .filter((counter) => counter && typeof counter.label === 'string')
          .map((counter, index) => ({
            id: String(counter.id ?? `c${index + 1}`),
            label: counter.label,
            value: Number(counter.value) || 0,
            step: Math.max(1, Number(counter.step) || 1),
            min: Number.isFinite(counter.min) ? Number(counter.min) : -999,
            max: Number.isFinite(counter.max) ? Number(counter.max) : 9999,
          }));
      }
      if (Array.isArray(raw.checklist)) {
        data.checklist = raw.checklist
          .filter((item) => item && typeof item.text === 'string')
          .map((item, index) => ({ id: String(item.id ?? `k${index + 1}`), text: item.text, done: !!item.done }));
      }
      if (raw.table && Array.isArray(raw.table.cells)) {
        data.table = makeTable(Number(raw.table.rows) || 1, Number(raw.table.cols) || 1, {
          rows: Number(raw.table.rows) || 1,
          cols: Number(raw.table.cols) || 1,
          cells: raw.table.cells.map((value) => Number(value) || 0),
        });
      }
      if (typeof raw.formula === 'string') data.formula = raw.formula;
      if (typeof raw.perPlayer === 'boolean') data.perPlayer = raw.perPlayer;
      if (Array.isArray(raw.players)) {
        data.players = raw.players
          .filter((player) => player && typeof player.name === 'string')
          .map((player, index) => {
            const seat = Number(player.seat);
            return {
              id: typeof player.id === 'string' && player.id ? player.id : `p${index + 1}`,
              name: player.name,
              ...(Number.isInteger(seat) && seat > 0 ? { seat } : {}),
              values: { ...(player.values ?? {}) },
            };
          });
      }
      if (Array.isArray(raw.history)) data.history = raw.history.map(String).slice(0, 12);
    },
    presetFromState() {
      const fieldPairs: Record<string, string> = {};
      for (const field of data.fields) fieldPairs[field.label] = field.type;
      const counterPairs: Record<string, number> = {};
      for (const counter of data.counters) counterPairs[counter.label] = counter.value;
      return {
        fields: fieldPairs,
        counters: counterPairs,
        checklist: data.checklist.map((item) => item.text),
        table: `${data.table.rows}x${data.table.cols}`,
        formula: data.formula,
        'per-player': data.perPlayer,
      };
    },
    commands: {
      reset: () => instance.resetChecklist(),
    },
    summary: () => summaryOf(data),
    results() {
      if (data.perPlayer) {
        return data.players.map((player): ToolResult => {
          const vars = formulaVars(data, player);
          const value = evaluateFormula(data.formula, vars) ?? Object.values(player.values).reduce((sum, entry) => sum + entry, 0);
          return { name: seatName(player.seat, player.name), score: value };
        });
      }
      const result = evaluateFormula(data.formula, formulaVars(data));
      return result === null ? [] : [{ name: translate('custom.results-sheet'), score: result }];
    },
    setFieldValue(id, value) {
      const field = data.fields.find((item) => item.id === id);
      if (!field) return;
      ctx.undo.push(translate('custom.undo-field-value'), `field-${id}`);
      field.value = value;
    },
    addField(label, type) {
      const trimmed = label.trim();
      if (!trimmed) return;
      ctx.undo.push(translate('custom.undo-add-field'));
      data.fields = [
        ...data.fields,
        { id: `f${Date.now().toString(36)}`, label: trimmed, type, options: [], value: type === 'checkbox' ? false : type === 'number' ? 0 : '' },
      ];
    },
    removeField(id) {
      ctx.undo.push(translate('custom.undo-remove-field'));
      data.fields = data.fields.filter((field) => field.id !== id);
    },
    adjustCounter(id, amount) {
      const counter = data.counters.find((item) => item.id === id);
      if (!counter) return;
      const next = Math.max(counter.min, Math.min(counter.max, counter.value + amount));
      if (next === counter.value) return;
      ctx.undo.push(translate('custom.undo-counter'), `counter-${id}`);
      counter.value = next;
      for (const player of data.players) {
        if (!(id in player.values)) player.values[id] = counter.value;
      }
      ctx.haptics.buzz('short');
    },
    setCounterValue(id, value) {
      const counter = data.counters.find((item) => item.id === id);
      if (!counter) return;
      ctx.undo.push(translate('custom.undo-counter-value'));
      counter.value = Math.max(counter.min, Math.min(counter.max, Math.round(value)));
    },
    addCounter(label) {
      const trimmed = label.trim();
      if (!trimmed) return;
      ctx.undo.push(translate('custom.undo-add-counter'));
      const id = `c${Date.now().toString(36)}`;
      data.counters = [...data.counters, { id, label: trimmed, value: 0, step: 1, min: -999, max: 9999 }];
      data.players = data.players.map((player) => ({ ...player, values: { ...player.values, [id]: 0 } }));
    },
    removeCounter(id) {
      ctx.undo.push(translate('custom.undo-remove-counter'));
      data.counters = data.counters.filter((counter) => counter.id !== id);
      data.players = data.players.map((player) => {
        const values = { ...player.values };
        delete values[id];
        return { ...player, values };
      });
    },
    toggleChecklist(index) {
      const item: ChecklistItem | undefined = data.checklist[index];
      if (!item) return;
      ctx.undo.push(translate('custom.undo-checklist'));
      item.done = !item.done;
      ctx.haptics.buzz('short');
    },
    addChecklist(text) {
      const trimmed = text.trim();
      if (!trimmed) return;
      ctx.undo.push(translate('custom.undo-add-check'));
      data.checklist = [...data.checklist, { id: `k${Date.now().toString(36)}`, text: trimmed, done: false }];
    },
    resetChecklist() {
      if (!data.checklist.some((item) => item.done)) return;
      ctx.undo.push(translate('custom.undo-reset-checklist'));
      for (const item of data.checklist) item.done = false;
    },
    setTableSize(rows, cols) {
      ctx.undo.push(translate('custom.undo-table-size'));
      data.table = makeTable(rows, cols, data.table);
    },
    setCell(row, col, value) {
      if (row < 0 || col < 0 || row >= data.table.rows || col >= data.table.cols) return;
      ctx.undo.push(translate('custom.undo-cell'), `cell-${row}-${col}`);
      const cells = data.table.cells.slice();
      cells[row * data.table.cols + col] = Number.isFinite(value) ? value : 0;
      data.table = { ...data.table, cells };
    },
    setFormula(value) {
      ctx.undo.push(translate('custom.undo-formula'));
      data.formula = value;
    },
    setPerPlayer(value) {
      if (value === data.perPlayer) return;
      ctx.undo.push(translate('custom.undo-per-player'));
      data.perPlayer = value;
      if (value && !data.players.length) {
        data.players = toolSeats(ctx.session.players(), 2).map<PlayerSheet>((seat, index) => ({
          id: `p${index + 1}`,
          name: seat.name,
          ...(seat.seat ? { seat: seat.seat } : {}),
          values: Object.fromEntries(data.counters.map((counter) => [counter.id, counter.value])),
        }));
      }
    },
    setPlayerValue(playerId, key, value) {
      const sheet = playerById(playerId);
      if (!sheet) return;
      ctx.undo.push(translate('custom.undo-player-value'), `player-${playerId}-${key}`);
      sheet.values = { ...sheet.values, [key]: Math.round(value) };
    },
    adjustPlayerValue(playerId, key, amount) {
      const sheet = playerById(playerId);
      if (!sheet) return;
      ctx.undo.push(translate('custom.undo-player-value'), `player-${playerId}-${key}`);
      sheet.values = { ...sheet.values, [key]: (sheet.values[key] ?? 0) + amount };
      ctx.haptics.buzz('short');
    },
    formulaResult(playerId) {
      const sheet = playerId ? playerById(playerId) : undefined;
      return evaluateFormula(data.formula, formulaVars(data, sheet));
    },
  };

  void grandTotal;
  return instance;
}

export default { ...meta, preset, component: Custom, create };
