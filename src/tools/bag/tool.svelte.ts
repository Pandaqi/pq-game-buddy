import { registerToolStrings, t as translate } from '../../core/i18n.svelte';
import type { ToolContext, ToolInstance, ToolResult } from '../../core/registry';
import type { PresetValues } from '../../core/template/schema';
import {
  BAG_SETS,
  countsFor,
  drawType,
  summaryOf,
  totalOf,
  trayFor,
  trayTotal,
  valuesFor,
  type BagSet,
  type BagState,
  type Token,
} from './logic';
import Bag from './Bag.svelte';
import meta from './meta';
import preset from './preset';
import en from './locales/en';

// A tool's words travel with its chunk; the shell only knows its title.
registerToolStrings('bag', en);

export interface BagActions {
  draw(count?: number): void;
  assignTo(player: string): void;
  /** The seat the next draw lands in; empty when the bag is shared. */
  assignedTo(): string;
  returnAt(index: number): void;
  returnPlayer(player: string): void;
  returnAll(): void;
  refill(): void;
  setSet(set: BagSet): void;
  setDraw(count: number): void;
  setTrayMode(mode: BagState['trayMode']): void;
  adjustType(type: string, delta: number): void;
  addType(type: string, count: number): void;
  setCustom(countsText: string, valuesText: string): void;
}

export type BagInstance = ToolInstance<BagState> & BagActions;

function cleanPairs(input: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!input || typeof input !== 'object') return out;
  for (const [key, value] of Object.entries(input as Record<string, string | number>)) {
    const name = key.trim();
    const number = Number(value);
    if (name && Number.isFinite(number) && number > 0) out[name] = Math.round(number);
  }
  return out;
}

/** Points may legitimately be zero (a blank tile), so they are cleaned apart. */
function cleanValues(input: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!input || typeof input !== 'object') return out;
  for (const [key, value] of Object.entries(input as Record<string, string | number>)) {
    const name = key.trim();
    const number = Number(value);
    if (name && Number.isFinite(number) && number >= 0) out[name] = Math.round(number);
  }
  return out;
}

function create(ctx: ToolContext, values: PresetValues = {}): BagInstance {
  const set = (values.set as BagSet) ?? 'scrabble';
  const customCounts = cleanPairs(values.counts);
  const customValues = cleanValues(values.values);
  const counts = set === 'custom' ? customCounts : countsFor(set);
  const trayMode = (values.tray as BagState['trayMode']) ?? 'shared';

  const data = $state<BagState>({
    set,
    counts,
    values: set === 'custom' ? customValues : valuesFor(set),
    remaining: { ...counts },
    drawCount: Math.max(1, Number(values.draw ?? 7)),
    trayMode,
    tokens: [],
    trays: [],
    serial: 0,
    history: [],
  });

  let target = '';

  /** The seat in play, for the cases where a per-player draw needs a default. */
  function seatName(): string {
    const players = ctx.session.players();
    return players.find((player) => player.active)?.name ?? players[0]?.name ?? '';
  }

  function note(text: string): void {
    data.history = [text, ...data.history].slice(0, 12);
  }

  function newToken(type: string): Token {
    data.serial += 1;
    return { id: `t${data.serial}`, type, value: Number(data.values[type] ?? 0) };
  }

  function place(token: Token): void {
    if (data.trayMode === 'shared') {
      data.tokens = [...data.tokens, token];
      return;
    }
    // Never fall back to the shared pile in per-player mode: that is how a
    // second player's draw used to vanish into the first player's tray.
    target = target || seatName();
    if (!target) {
      data.tokens = [...data.tokens, token];
      return;
    }
    const existing = data.trays.find((tray) => tray.player === target);
    if (existing) existing.tokens = [...existing.tokens, token];
    else data.trays = [...data.trays, { player: target, tokens: [token] }];
  }

  function builder(setName: BagSet): void {
    const nextCounts = setName === 'custom' ? data.counts : countsFor(setName);
    data.set = setName;
    data.counts = { ...nextCounts };
    data.values = setName === 'custom' ? data.values : valuesFor(setName);
    data.remaining = { ...nextCounts };
    data.tokens = [];
    data.trays = [];
    note(translate('bag.note-new-bag', { set: setName, count: totalOf(nextCounts) }));
  }

  const instance: BagInstance = {
    data,
    state: () => JSON.parse(JSON.stringify(data)) as BagState,
    load(state) {
      if (!state || typeof state !== 'object') return;
      const raw = state as Partial<BagState>;
      if (raw.set && BAG_SETS.includes(raw.set)) data.set = raw.set;
      if (raw.counts && typeof raw.counts === 'object') data.counts = cleanPairs(raw.counts);
      if (raw.values && typeof raw.values === 'object') data.values = cleanValues(raw.values);
      if (raw.remaining && typeof raw.remaining === 'object') data.remaining = cleanPairs(raw.remaining);
      if (typeof raw.drawCount === 'number') data.drawCount = Math.max(1, raw.drawCount);
      if (raw.trayMode === 'per-player' || raw.trayMode === 'shared') data.trayMode = raw.trayMode;
      if (Array.isArray(raw.tokens)) {
        data.tokens = raw.tokens
          .filter((token) => token && typeof token.type === 'string')
          .map((token) => ({ id: String(token.id ?? ''), type: token.type, value: Number(token.value) || 0 }));
      }
      if (Array.isArray(raw.trays)) {
        data.trays = raw.trays
          .filter((tray) => tray && typeof tray.player === 'string' && Array.isArray(tray.tokens))
          .map((tray) => ({ player: tray.player, tokens: tray.tokens }));
      }
      if (typeof raw.serial === 'number') data.serial = Math.max(0, Math.round(raw.serial));
      if (Array.isArray(raw.history)) data.history = raw.history.map(String).slice(0, 12);
    },
    presetFromState() {
      return {
        set: data.set,
        counts: data.set === 'custom' ? data.counts : {},
        values: data.set === 'custom' ? data.values : {},
        draw: data.drawCount,
        tray: data.trayMode,
      };
    },
    commands: {
      draw: (arg) => instance.draw(arg ? Number(arg) : undefined),
      refill: () => instance.refill(),
      returnall: () => instance.returnAll(),
    },
    summary: () => summaryOf(data),
    results() {
      const rows: ToolResult[] = [];
      for (const tray of data.trays) {
        if (!tray.tokens.length) continue;
        rows.push({ name: tray.player, score: trayTotal(tray.tokens) });
      }
      if (rows.length) return rows.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
      if (data.tokens.length) return [{ name: 'Tray', score: trayTotal(data.tokens) }];
      return [];
    },
    draw(count) {
      const amount = Math.max(1, Math.round(count ?? data.drawCount));
      if (totalOf(data.remaining) === 0) {
        ctx.toast(translate('bag.toast-empty'), 'error');
        return;
      }
      ctx.undo.push(translate('bag.undo-draw', { count: amount }));
      const drawn: Token[] = [];
      for (let index = 0; index < amount; index += 1) {
        const type = drawType(data.remaining, ctx.rng);
        if (!type) break;
        data.remaining[type] = Math.max(0, (data.remaining[type] ?? 0) - 1);
        const token = newToken(type);
        drawn.push(token);
        place(token);
      }
      ctx.audio.play('click');
      ctx.haptics.buzz('short');
      note(
        translate('bag.note-drew', {
          tiles: drawn.map((token) => token.type).join(' ') || translate('bag.note-nothing'),
        }),
      );
      if (drawn.length < amount) ctx.toast(translate('bag.toast-ran-out'));
    },
    assignTo(player) {
      target = player.trim();
      note(target ? translate('bag.note-for', { player: target }) : translate('bag.note-shared'));
    },
    assignedTo: () => target,
    returnAt(index) {
      const token = data.tokens[index];
      if (!token) return;
      ctx.undo.push(translate('bag.undo-return-token'));
      data.tokens = data.tokens.filter((_, at) => at !== index);
      data.remaining[token.type] = (data.remaining[token.type] ?? 0) + 1;
      note(translate('bag.note-returned', { type: token.type }));
    },
    returnPlayer(player) {
      const tray = data.trays.find((item) => item.player === player);
      if (!tray || !tray.tokens.length) return;
      ctx.undo.push(translate('bag.undo-return-tray'));
      for (const token of tray.tokens) {
        data.remaining[token.type] = (data.remaining[token.type] ?? 0) + 1;
      }
      data.trays = data.trays.filter((item) => item.player !== player);
      note(translate('bag.note-player-returned', { player }));
    },
    returnAll() {
      const every = [...data.tokens, ...data.trays.flatMap((tray) => tray.tokens)];
      if (!every.length) return;
      ctx.undo.push(translate('bag.undo-return-all'));
      for (const token of every) {
        data.remaining[token.type] = (data.remaining[token.type] ?? 0) + 1;
      }
      data.tokens = [];
      data.trays = [];
      note(translate('bag.note-all-back'));
    },
    refill() {
      ctx.undo.push(translate('bag.undo-refill'));
      data.remaining = { ...data.counts };
      data.tokens = [];
      data.trays = [];
      note(translate('bag.note-refilled', { count: totalOf(data.counts) }));
    },
    setSet(next) {
      if (next === data.set) return;
      ctx.undo.push(translate('bag.undo-set'));
      builder(next);
    },
    setDraw(count) {
      data.drawCount = Math.max(1, Math.min(50, Math.round(count)));
    },
    setTrayMode(mode) {
      if (mode === data.trayMode) return;
      ctx.undo.push(translate('bag.undo-tray-mode'));
      if (mode === 'shared') {
        data.tokens = [...data.tokens, ...data.trays.flatMap((tray) => tray.tokens)];
        data.trays = [];
      }
      data.trayMode = mode;
      if (mode === 'per-player' && !target) target = seatName();
    },
    adjustType(type, delta) {
      const current = data.remaining[type] ?? 0;
      const next = Math.max(0, current + delta);
      if (next === current) return;
      ctx.undo.push(translate('bag.undo-counts'));
      data.remaining[type] = next;
      data.counts[type] = Math.max(data.counts[type] ?? 0, next);
    },
    addType(type, count) {
      const name = type.trim();
      if (!name || !count) return;
      ctx.undo.push(translate('bag.undo-add-type'));
      data.counts[name] = (data.counts[name] ?? 0) + count;
      data.remaining[name] = (data.remaining[name] ?? 0) + count;
    },
    setCustom(countsText, valuesText) {
      const parse = (text: string): Record<string, number> => {
        const out: Record<string, number> = {};
        for (const line of text.split('\n')) {
          const match = line.trim().match(/^(.+?)\s*[=:,]\s*(-?\d+(?:\.\d+)?)$/);
          if (!match) continue;
          out[match[1].trim()] = Number(match[2]);
        }
        return out;
      };
      const counts = parse(countsText);
      const points = parse(valuesText);
      if (!Object.keys(counts).length) {
        ctx.toast(translate('bag.toast-format'), 'error');
        return;
      }
      ctx.undo.batch(translate('bag.undo-custom'), () => {
        data.set = 'custom';
        data.counts = counts;
        data.values = points;
        data.remaining = { ...counts };
        data.tokens = [];
        data.trays = [];
      });
      note(translate('bag.note-custom', { count: totalOf(counts) }));
    },
  };

  if (trayMode === 'per-player') target = seatName();

  return instance;
}

export default { ...meta, preset, component: Bag, create };
