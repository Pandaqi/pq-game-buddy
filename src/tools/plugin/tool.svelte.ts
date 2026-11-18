import { registerToolStrings, t as translate } from '../../core/i18n.svelte';
import type { ToolContext, ToolInstance } from '../../core/registry';
import { seatKey, toolSeats } from '../../core/session';
import type { PresetValues } from '../../core/template/schema';
import {
  resolveToolBlocks,
  toolFileDefinition,
  type ResolvedBlock,
  type ToolScript,
} from '../../core/tool-file';
import {
  makeTable,
  readoutOf,
  rollOnce,
  summaryOf,
  type PluginSheet,
  type PluginState,
  type PluginTable,
} from './logic';
import Plugin from './Plugin.svelte';
import en from './locales/en';
import meta from './meta';
import preset from './preset';

// A tool's words travel with its chunk; the shell only knows its title.
registerToolStrings('plugin', en);

const CUES = ['bell', 'buzzer', 'tick', 'gong', 'drumroll', 'success', 'click'] as const;

/**
 * What a `[script]` section receives as `gb`. Every call goes through the same
 * action a button uses, so a script is undoable and cannot bypass a limit.
 */
export interface PluginApi {
  helpers: Record<string, unknown>;
  setting(name: string): unknown;
  players(): PluginSheet[];
  counter(id: string): number;
  add(id: string, amount?: number): void;
  set(id: string, value: number): void;
  field(id: string): string | number;
  setField(id: string, value: string | number): void;
  /** Tables are read and written one-based, the way a person counts rows. */
  cell(id: string, row: number, col: number): number;
  setCell(id: string, row: number, col: number, value: number): void;
  toggle(id: string): void;
  roll(id: string): string;
  pick(id: string): string[];
  reset(): void;
  toast(text: string): void;
  log(text: string): void;
  sound(cue: string): void;
  tool(instance: string, command: string, arg?: string): void;
}

export interface PluginActions {
  blocks: ResolvedBlock[];
  adjustCounter(id: string, amount: number): void;
  setCounter(id: string, value: number): void;
  /** The table as it is now: rows follow the session's players, values stay by id. */
  sheets(): PluginSheet[];
  adjustSheet(id: string, sheetId: string, amount: number): void;
  syncPlayers(): void;
  toggleCheck(id: string, index: number): void;
  toggleAll(id: string): void;
  setField(id: string, value: string | number): void;
  setCell(id: string, row: number, col: number, value: number): void;
  doRoll(id: string): void;
  doPick(id: string): void;
  shufflePick(id: string): void;
  run(id: string): void;
  reset(): void;
  readout(id: string): number | null;
}

export type PluginInstance = ToolInstance<PluginState> & PluginActions;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function fieldStart(block: ResolvedBlock): string | number {
  if (block.fieldType === 'number') return Number(block.defaultValue) || 0;
  return block.defaultValue;
}

function create(ctx: ToolContext, values: PresetValues = {}): PluginInstance {
  const toolId = ctx.toolId && ctx.toolId !== 'plugin' ? ctx.toolId : String(values.definition ?? '');
  const definition = toolId ? toolFileDefinition(toolId) : undefined;
  const settings: Record<string, unknown> = definition ? { ...values } : {};
  if (definition && !definition.settings.definition) delete settings.definition;
  const blocks = definition ? resolveToolBlocks(definition, settings) : [];
  const scripts: ToolScript[] = definition?.scripts ?? [];
  const compiled = new Map<string, ((gb: PluginApi) => void) | null>();
  const helpers: Record<string, unknown> = {};

  const perPlayer = blocks.filter((block) => block.kind === 'counter' && block.perPlayer);

  const data = $state<PluginState>({
    toolId,
    name: definition?.name ?? '',
    values: settings,
    counters: Object.fromEntries(
      blocks.filter((block) => block.kind === 'counter').map((block) => [block.id, block.start]),
    ),
    sheets: {},
    checks: Object.fromEntries(
      blocks
        .filter((block) => block.kind === 'checklist')
        .map((block) => [block.id, block.items.map(() => false)]),
    ),
    fields: Object.fromEntries(
      blocks
        .filter((block) => block.kind === 'field')
        .map((block) => [block.id, fieldStart(block)]),
    ),
    tables: Object.fromEntries(
      blocks
        .filter((block) => block.kind === 'table')
        .map((block) => [block.id, makeTable(block.rows, block.cols)]),
    ),
    rolls: {},
    picks: {},
    log: [],
  });

  function block(id: string): ResolvedBlock | undefined {
    return blocks.find((entry) => entry.id === id);
  }

  /**
   * One row per seat at the table, named as the session names it. The id is the
   * player's own id, so a rename keeps the values; adding or removing a player adds
   * or drops a row on the next read, with no action needed.
   */
  function sheets(): PluginSheet[] {
    const players = ctx.session.players();
    const pairs = toolSeats(players, 2);
    return pairs.map((pair, index) => {
      const id = players[index]?.id ?? seatKey(pair);
      return {
        id,
        name: pair.name,
        ...(pair.seat ? { seat: pair.seat } : {}),
        values: Object.fromEntries(
          perPlayer.map((entry) => [entry.id, data.sheets[id]?.[entry.id] ?? entry.start]),
        ),
      };
    });
  }

  function note(text: string): void {
    data.log = [text, ...data.log].slice(0, 12);
  }

  function adjustSheet(id: string, sheetId: string, amount: number): void {
    const sheet = sheets().find((entry) => entry.id === sheetId);
    const counter = block(id);
    if (!sheet || !counter) return;
    const current = sheet.values[id] ?? counter.start;
    const next = clamp(current + amount, counter.min, counter.max);
    if (next === current) return;
    ctx.undo.push(translate('plugin.undo-change'), `sheet-${sheetId}-${id}`);
    data.sheets = { ...data.sheets, [sheetId]: { ...(data.sheets[sheetId] ?? {}), [id]: next } };
    ctx.haptics.buzz('short');
  }

  function adjustCounter(id: string, amount: number): void {
    const counter = block(id);
    if (!counter) return;
    if (counter.perPlayer) {
      for (const sheet of sheets()) adjustSheet(id, sheet.id, amount);
      return;
    }
    const current = data.counters[id] ?? counter.start;
    const next = clamp(current + amount, counter.min, counter.max);
    if (next === current) return;
    ctx.undo.push(translate('plugin.undo-change'), `counter-${id}`);
    data.counters[id] = next;
    ctx.haptics.buzz('short');
  }

  function setCounter(id: string, value: number): void {
    const counter = block(id);
    if (!counter) return;
    if (counter.perPlayer) {
      const next = clamp(value, counter.min, counter.max);
      for (const sheet of sheets()) {
        data.sheets = { ...data.sheets, [sheet.id]: { ...(data.sheets[sheet.id] ?? {}), [id]: next } };
      }
      return;
    }
    ctx.undo.push(translate('plugin.undo-change'));
    data.counters[id] = clamp(value, counter.min, counter.max);
  }

  function toggleCheck(id: string, index: number): void {
    const checks = data.checks[id];
    if (!checks || index < 0 || index >= checks.length) return;
    ctx.undo.push(translate('plugin.undo-change'), `check-${id}-${index}`);
    data.checks[id] = checks.map((value, position) => (position === index ? !value : value));
    ctx.haptics.buzz('short');
  }

  function toggleAll(id: string): void {
    const checks = data.checks[id];
    if (!checks) return;
    const next = !checks.every(Boolean);
    ctx.undo.push(translate('plugin.undo-change'));
    data.checks[id] = checks.map(() => next);
  }

  function setField(id: string, value: string | number): void {
    if (!(id in data.fields)) return;
    ctx.undo.push(translate('plugin.undo-change'), `field-${id}`);
    data.fields[id] = value;
  }

  function setCell(id: string, row: number, col: number, value: number): void {
    const table = data.tables[id];
    if (!table || row < 0 || col < 0 || row >= table.rows || col >= table.cols) return;
    ctx.undo.push(translate('plugin.undo-change'), `cell-${id}-${row}-${col}`);
    const cells = table.cells.slice();
    cells[row * table.cols + col] = Number.isFinite(value) ? value : 0;
    data.tables = { ...data.tables, [id]: { ...table, cells } };
  }

  function doRoll(id: string): void {
    const roll = block(id);
    if (!roll) return;
    ctx.undo.push(translate('plugin.undo-change'));
    const result = rollOnce(roll, ctx.rng);
    data.rolls = { ...data.rolls, [id]: result.text };
    ctx.audio.play('click');
    ctx.haptics.buzz('short');
    note(`${roll.label}: ${result.text}`);
  }

  function doPick(id: string): void {
    const pick = block(id);
    if (!pick || !pick.from.length) return;
    ctx.undo.push(translate('plugin.undo-change'));
    const count = Math.max(1, Math.min(pick.count, pick.from.length));
    const chosen = ctx.rng.shuffle(pick.from).slice(0, count);
    data.picks = { ...data.picks, [id]: chosen };
    ctx.audio.play('click');
    ctx.haptics.buzz('short');
    note(`${pick.label}: ${chosen.join(', ')}`);
  }

  function shufflePick(id: string): void {
    if (!data.picks[id]) return;
    ctx.undo.push(translate('plugin.undo-change'));
    data.picks = { ...data.picks, [id]: [] };
  }

  /** Compile once per script; the parser already refused one that will not compile. */
  function compiledScript(id: string): ((gb: PluginApi) => void) | null {
    const known = compiled.get(id);
    if (known !== undefined) return known;
    const script = scripts.find((entry) => entry.id === id);
    if (!script) {
      compiled.set(id, null);
      return null;
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      const run = new Function('gb', `"use strict";\n${script.body}`) as (gb: PluginApi) => void;
      compiled.set(id, run);
      return run;
    } catch {
      compiled.set(id, null);
      return null;
    }
  }

  /** Another mounted tool's documented command, the same seam `do: tool` uses. */
  function pressExternal(target: string, command: string, arg: string): void {
    const other = ctx.session.instance(target);
    const action = command ? other?.commands?.[command] : undefined;
    if (!other || !action) {
      ctx.toast(translate('plugin.toast-no-command', { command: command || target }));
      return;
    }
    action(arg);
  }

  function scriptApi(): PluginApi {
    return {
      helpers,
      setting: (name) => data.values[name],
      players: () => sheets(),
      counter: (id) => data.counters[id] ?? block(id)?.start ?? 0,
      add: (id, amount = 1) => adjustCounter(id, Number(amount) || 0),
      set: (id, value) => setCounter(id, Number(value) || 0),
      field: (id) => data.fields[id] ?? '',
      setField: (id, value) => setField(id, value),
      cell: (id, row, col) => {
        const table = data.tables[id];
        if (!table) return 0;
        return table.cells[(Math.round(row) - 1) * table.cols + (Math.round(col) - 1)] ?? 0;
      },
      setCell: (id, row, col, value) => setCell(id, Math.round(row) - 1, Math.round(col) - 1, value),
      toggle: (id) => toggleAll(id),
      roll: (id) => {
        doRoll(id);
        return data.rolls[id] ?? '';
      },
      pick: (id) => {
        doPick(id);
        return data.picks[id] ?? [];
      },
      reset: () => reset(),
      toast: (text) => ctx.toast(String(text ?? '')),
      log: (text) => note(String(text ?? '')),
      sound: (cue) => {
        const found = CUES.find((name) => name === cue);
        if (found) ctx.audio.play(found);
      },
      tool: (instance, command, arg = '') => pressExternal(instance, command, String(arg ?? '')),
    };
  }

  /** One entry point. A thrown error is shown and logged, never left to escape. */
  function runScript(id: string): void {
    const run = compiledScript(id);
    if (!run) {
      ctx.toast(translate('plugin.toast-no-script', { name: id }), 'error');
      return;
    }
    try {
      run(scriptApi());
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const text = translate('plugin.toast-script-error', { name: id, message });
      note(text);
      ctx.toast(text, 'error');
    }
  }

  function reset(): void {
    const counters = blocks.filter((entry) => entry.kind === 'counter');
    const checklists = blocks.filter((entry) => entry.kind === 'checklist');
    const fields = blocks.filter((entry) => entry.kind === 'field');
    ctx.undo.push(translate('plugin.undo-change'));
    data.counters = Object.fromEntries(counters.map((entry) => [entry.id, entry.start]));
    data.sheets = {};
    data.checks = Object.fromEntries(checklists.map((entry) => [entry.id, entry.items.map(() => false)]));
    data.fields = Object.fromEntries(fields.map((entry) => [entry.id, fieldStart(entry)]));
    data.tables = Object.fromEntries(
      blocks.filter((entry) => entry.kind === 'table').map((entry) => [entry.id, makeTable(entry.rows, entry.cols)]),
    );
    data.rolls = {};
    data.picks = {};
    data.log = [];
    for (const script of scripts) if (script.when === 'reset') runScript(script.id);
  }

  function readout(id: string): number | null {
    const target = block(id);
    if (!target || target.kind !== 'readout') return null;
    return readoutOf(data, blocks, target, sheets());
  }

  /** The game menu's sync action: keep the current table, drop seats that left. */
  function syncPlayers(): void {
    const next: Record<string, Record<string, number>> = {};
    for (const sheet of sheets()) next[sheet.id] = { ...sheet.values };
    ctx.undo.push(translate('plugin.undo-change'));
    data.sheets = next;
  }

  /** `do:` — the closed verb list a tool file's button may run. */
  function runAction(action: string): void {
    const parts = String(action ?? '').trim().split(/\s+/).filter(Boolean);
    const verb = (parts[0] ?? '').toLowerCase();
    const target = parts[1] ?? '';
    const rest = parts.slice(2).join(' ');
    switch (verb) {
      case 'counter': {
        const amount = rest.startsWith('=') ? 0 : Number(rest.replace('+', '')) || 1;
        if (!block(target)) return;
        if (rest.startsWith('=')) setCounter(target, Number(rest.slice(1)));
        else adjustCounter(target, amount);
        return;
      }
      case 'toggle':
        toggleAll(target);
        return;
      case 'roll':
        doRoll(target);
        return;
      case 'pick':
        doPick(target);
        return;
      case 'shuffle':
        shufflePick(target);
        return;
      case 'reset':
        reset();
        return;
      case 'toast':
        ctx.toast([target, rest].filter(Boolean).join(' '));
        return;
      case 'sound': {
        const cue = CUES.find((name) => name === target);
        if (cue) ctx.audio.play(cue);
        return;
      }
      case 'tool':
        pressExternal(target, parts[2] ?? '', parts.slice(3).join(' '));
        return;
      default:
        return;
    }
  }

  const instance: PluginInstance = {
    data,
    blocks,
    state: () => JSON.parse(JSON.stringify(data)) as PluginState,
    start() {
      for (const script of scripts) if (script.when === 'start') runScript(script.id);
    },
    load(state) {
      if (!state || typeof state !== 'object') return;
      const raw = state as Partial<PluginState>;
      if (typeof raw.toolId === 'string' && raw.toolId) data.toolId = raw.toolId;
      if (typeof raw.name === 'string') data.name = raw.name;
      if (raw.values && typeof raw.values === 'object') data.values = { ...raw.values };
      if (raw.counters && typeof raw.counters === 'object') {
        const counters: Record<string, number> = {};
        for (const [key, value] of Object.entries(raw.counters)) {
          if (Number.isFinite(Number(value))) counters[key] = Number(value);
        }
        data.counters = counters;
      }
      if (Array.isArray(raw.sheets)) {
        // Saved by the first build of this runtime: a list, not a map.
        const legacy: Record<string, Record<string, number>> = {};
        for (const sheet of raw.sheets as unknown as PluginSheet[]) {
          if (sheet && typeof sheet.id === 'string') legacy[sheet.id] = { ...(sheet.values ?? {}) };
        }
        data.sheets = legacy;
      } else if (raw.sheets && typeof raw.sheets === 'object') {
        const sheets: Record<string, Record<string, number>> = {};
        for (const [id, value] of Object.entries(raw.sheets)) {
          if (value && typeof value === 'object') sheets[id] = { ...(value as Record<string, number>) };
        }
        data.sheets = sheets;
      }
      if (raw.checks && typeof raw.checks === 'object') {
        const checks: Record<string, boolean[]> = {};
        for (const [key, value] of Object.entries(raw.checks)) {
          if (Array.isArray(value)) checks[key] = value.map(Boolean);
        }
        data.checks = checks;
      }
      if (raw.fields && typeof raw.fields === 'object') {
        const fields: Record<string, string | number> = {};
        for (const [key, value] of Object.entries(raw.fields)) {
          if (typeof value === 'string' || typeof value === 'number') fields[key] = value;
        }
        data.fields = fields;
      }
      if (raw.tables && typeof raw.tables === 'object') {
        const tables: Record<string, PluginTable> = {};
        for (const [key, value] of Object.entries(raw.tables)) {
          if (!value || !Array.isArray(value.cells)) continue;
          tables[key] = makeTable(Number(value.rows) || 1, Number(value.cols) || 1, {
            rows: Number(value.rows) || 1,
            cols: Number(value.cols) || 1,
            cells: value.cells.map((cell) => Number(cell) || 0),
          });
        }
        data.tables = tables;
      }
      if (raw.rolls && typeof raw.rolls === 'object') {
        data.rolls = { ...(raw.rolls as Record<string, string>) };
      }
      if (raw.picks && typeof raw.picks === 'object') {
        const picks: Record<string, string[]> = {};
        for (const [key, value] of Object.entries(raw.picks)) {
          if (Array.isArray(value)) picks[key] = value.map(String);
        }
        data.picks = picks;
      }
      if (Array.isArray(raw.log)) data.log = raw.log.map(String).slice(0, 12);
    },
    presetFromState() {
      // `definition` is the runtime's own fallback key, never a file's setting.
      return Object.keys(data.values).length ? { ...data.values } : { definition: data.toolId };
    },
    commands: {
      ...Object.fromEntries(
        blocks.filter((entry) => entry.kind === 'button').map((entry) => [entry.id, () => instance.run(entry.id)]),
      ),
      ...Object.fromEntries(scripts.map((script) => [script.id, () => runScript(script.id)])),
      reset: () => reset(),
    },
    summary: () => summaryOf(data, blocks, sheets()),
    adjustCounter,
    setCounter,
    sheets,
    adjustSheet,
    syncPlayers,
    toggleCheck,
    toggleAll,
    setField,
    setCell,
    doRoll,
    doPick,
    shufflePick,
    run(id) {
      const button = block(id);
      if (!button) return;
      if (button.action) runAction(button.action);
      if (button.run) runScript(button.run);
    },
    reset,
    readout,
  };

  return instance;
}

export default { ...meta, preset, component: Plugin, create };
