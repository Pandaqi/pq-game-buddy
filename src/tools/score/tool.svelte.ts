import { registerToolStrings, seatName, t as translate } from '../../core/i18n.svelte';
import type { ToolContext } from '../../core/registry';
import { PLAYER_COLORS, toolSeats } from '../../core/session';
import type { PresetValues } from '../../core/template/schema';
import {
  csvSheet,
  evaluateFormula,
  ledgerTotal,
  normaliseName,
  noteKey,
  scoreSheet,
  standingsFor,
  totalFor,
  type LedgerEntry,
  type ScoreCategory,
  type ScoreInstance,
  type ScoreMode,
  type ScorePlayer,
  type ScoreState,
} from './logic';
import Score from './Score.svelte';
import en from './locales/en';

// A tool's words travel with its chunk; the shell only knows its title.
registerToolStrings('score', en);
import meta from './meta';
import preset from './preset';

function categoriesFrom(pairs: unknown): ScoreCategory[] {
  if (!pairs || typeof pairs !== 'object') return [];
  return Object.entries(pairs as Record<string, unknown>).map(([name, points]) => ({
    name: name.trim(),
    points: Number(points) || 0,
  }));
}

function create(ctx: ToolContext, values: PresetValues = {}): ScoreInstance {
  const mode = (values.mode as ScoreMode) ?? 'simple';
  const start = Number(values.start ?? 0);
  const categories = categoriesFrom(values.categories);
  const formula = String(values.formula ?? '').trim();
  const hidden = !!values.hidden;
  const sessionPlayers = ctx.session.players();

  function buildPlayers(): ScorePlayer[] {
    // Rows keep the session's pair, so a generated seat is said in the active
    // language rather than the words it was created with.
    return toolSeats(sessionPlayers, 2).map((slot, index) => ({
      id: sessionPlayers[index]?.id ?? `p${index + 1}`,
      name: slot.name,
      ...(slot.seat ? { seat: slot.seat } : {}),
      color: sessionPlayers[index]?.color || PLAYER_COLORS[index % PLAYER_COLORS.length],
    }));
  }

  const players = buildPlayers();
  const totals: Record<string, number> = {};
  const rounds: Record<string, number[]> = {};
  const counts: Record<string, Record<string, number>> = {};
  const ledger: Record<string, LedgerEntry[]> = {};
  for (const player of players) {
    totals[player.id] = start;
    rounds[player.id] = [];
    counts[player.id] = Object.fromEntries(categories.map((category) => [category.name, 0]));
    ledger[player.id] = [];
  }

  const requestedRounds = Math.max(0, Math.round(Number(values.rounds) || 0));
  // A rounds pad with no rounds is an empty screen, so it starts with one.
  const initialRounds = mode === 'rounds' ? Math.max(1, requestedRounds) : requestedRounds;

  const data = $state<ScoreState>({
    mode,
    players,
    totals,
    rounds,
    counts,
    ledger,
    notes: {},
    categories,
    formula,
    roundCount: initialRounds,
    step: Math.max(1, Number(values.step ?? 1)),
    target: Math.max(0, Number(values.target ?? 0)),
    hint: String(values.hint ?? '').trim(),
    win: (values.win as ScoreState['win']) ?? 'highest',
    start,
    hidden,
    revealed: !hidden,
  });

  if (data.mode === 'rounds') {
    for (const player of data.players) {
      const row = data.rounds[player.id] ?? [];
      while (row.length < data.roundCount) row.push(0);
      data.rounds[player.id] = row;
    }
  }

  function announceScore(id: string): void {
    const player = data.players.find((item) => item.id === id);
    if (!player) return;
    ctx.haptics.buzz('short');
    const total = totalFor(data, id);
    if (!data.target) return;
    const reached = translate('score.toast-target', { name: seatName(player.seat, player.name), total });
    if (data.win === 'highest' && total >= data.target) ctx.toast(reached);
    if (data.win === 'lowest' && total <= data.target) ctx.toast(reached);
  }

  function emptyRow(): Record<string, number> {
    return Object.fromEntries(data.categories.map((category) => [category.name, 0]));
  }

  const instance: ScoreInstance = {
    data,
    state: () => JSON.parse(JSON.stringify(data)) as ScoreState,
    load(state) {
      if (!state || typeof state !== 'object') return;
      const raw = state as Partial<ScoreState>;
      if (raw.mode && ['simple', 'rounds', 'categories', 'ledger'].includes(raw.mode)) data.mode = raw.mode;
      if (Array.isArray(raw.players) && raw.players.length) {
        data.players = raw.players
          .filter((player) => player && typeof player.id === 'string')
          .map((player, index) => {
            const seat = Number(player.seat);
            return {
              id: player.id,
              name: typeof player.name === 'string' ? player.name : '',
              ...(Number.isInteger(seat) && seat > 0 ? { seat } : {}),
              color: typeof player.color === 'string' ? player.color : PLAYER_COLORS[index % PLAYER_COLORS.length],
            };
          });
      }
      if (Array.isArray(raw.categories)) {
        data.categories = raw.categories
          .filter((category) => category && typeof category.name === 'string')
          .map((category) => ({ name: category.name, points: Number(category.points) || 0 }));
      }
      if (typeof raw.formula === 'string') data.formula = raw.formula;
      if (typeof raw.hidden === 'boolean') data.hidden = raw.hidden;
      data.revealed = raw.revealed === true ? true : !data.hidden;
      if (raw.totals && typeof raw.totals === 'object') {
        const next: Record<string, number> = {};
        for (const player of data.players) next[player.id] = Number(raw.totals[player.id] ?? data.start) || 0;
        data.totals = next;
      }
      if (raw.rounds && typeof raw.rounds === 'object') {
        const next: Record<string, number[]> = {};
        for (const player of data.players) {
          const row = Array.isArray(raw.rounds[player.id]) ? raw.rounds[player.id] : [];
          next[player.id] = row.map((value) => (Number.isFinite(Number(value)) ? Number(value) : 0));
        }
        data.rounds = next;
      }
      if (raw.counts && typeof raw.counts === 'object') {
        const next: Record<string, Record<string, number>> = {};
        for (const player of data.players) {
          const saved = raw.counts[player.id];
          const row: Record<string, number> = {};
          for (const category of data.categories) {
            row[category.name] = Math.max(0, Number(saved?.[category.name]) || 0);
          }
          next[player.id] = row;
        }
        data.counts = next;
      }
      if (raw.ledger && typeof raw.ledger === 'object') {
        const next: Record<string, LedgerEntry[]> = {};
        for (const player of data.players) {
          const saved = raw.ledger[player.id];
          next[player.id] = Array.isArray(saved)
            ? saved
                .filter((entry) => entry && typeof entry.id === 'string')
                .map((entry) => ({
                  id: entry.id,
                  label:
                    typeof entry.label === 'string'
                      ? entry.label
                      : translate('score.entry-default'),
                  amount: Number(entry.amount) || 0,
                }))
            : [];
        }
        data.ledger = next;
      }
      if (raw.notes && typeof raw.notes === 'object') {
        const next: Record<string, string> = {};
        for (const [key, value] of Object.entries(raw.notes)) {
          if (typeof value === 'string' && value.trim()) next[key] = value;
        }
        data.notes = next;
      }
      if (typeof raw.roundCount === 'number') data.roundCount = Math.max(0, raw.roundCount);
      if (typeof raw.step === 'number') data.step = Math.max(1, raw.step);
      if (typeof raw.target === 'number') data.target = Math.max(0, raw.target);
      if (typeof raw.hint === 'string') data.hint = raw.hint;
      if (raw.win === 'highest' || raw.win === 'lowest') data.win = raw.win;
    },
    presetFromState() {
      const categoriesOut: Record<string, number> = {};
      for (const category of data.categories) categoriesOut[category.name] = category.points;
      return {
        mode: data.mode,
        rounds: data.roundCount,
        categories: categoriesOut,
        formula: data.formula,
        win: data.win,
        target: data.target,
        hint: data.hint,
        hidden: data.hidden,
        start: data.start,
        step: data.step,
      };
    },
    commands: {
      add: (arg) => {
        const [id, delta] = String(arg ?? '').split(',');
        if (id) instance.adjust(id, Number(delta ?? 1) || 1);
      },
      reveal: () => instance.reveal(),
    },
    summary: () => scoreSheet(data),
    results: () => standingsFor(data).map((row) => ({ name: row.name, score: row.total })),
    adjust(id, delta) {
      ctx.undo.push(translate('score.undo-score'), `score-${id}`);
      if (data.mode === 'rounds' && data.roundCount > 0) {
        const row = data.rounds[id] ?? [];
        const index = Math.max(0, data.roundCount - 1);
        while (row.length <= index) row.push(0);
        row[index] = (row[index] ?? 0) + delta;
        data.rounds[id] = row;
      } else if (data.mode === 'categories') {
        const first = data.categories[0];
        if (!first) return;
        const row = data.counts[id] ?? {};
        row[first.name] = Math.max(0, (row[first.name] ?? 0) + delta);
        data.counts[id] = row;
      } else if (data.mode === 'ledger') {
        instance.addLedgerEntry(id, translate('score.entry-default'), delta);
      } else {
        data.totals[id] = (data.totals[id] ?? data.start) + delta;
      }
      announceScore(id);
    },
    setTotal(id, value) {
      ctx.undo.push(translate('score.undo-set'));
      if (data.mode === 'rounds' && data.roundCount > 0) {
        const row = data.rounds[id] ?? [];
        while (row.length < data.roundCount) row.push(0);
        row[data.roundCount - 1] = value;
        data.rounds[id] = row;
      } else {
        data.totals[id] = value;
      }
      announceScore(id);
    },
    setRound(id, round, value) {
      ctx.undo.push(translate('score.undo-round'), `round-${id}-${round}`);
      const row = data.rounds[id] ?? [];
      while (row.length <= round) row.push(0);
      row[round] = Number.isFinite(value) ? value : 0;
      data.rounds[id] = row;
      data.roundCount = Math.max(data.roundCount, row.length);
    },
    addRound() {
      ctx.undo.push(translate('score.undo-add-round'));
      data.roundCount += 1;
      for (const player of data.players) {
        const row = data.rounds[player.id] ?? [];
        while (row.length < data.roundCount) row.push(0);
        data.rounds[player.id] = row;
      }
    },
    removeRound() {
      if (data.roundCount <= 1) return;
      ctx.undo.push(translate('score.undo-remove-round'));
      data.roundCount -= 1;
      for (const player of data.players) {
        const row = data.rounds[player.id] ?? [];
        data.rounds[player.id] = row.slice(0, data.roundCount);
      }
    },
    addPlayer(name) {
      const trimmed = name.trim();
      if (!trimmed) return;
      ctx.undo.push(translate('score.undo-add'));
      const id = `x${Date.now().toString(36)}`;
      data.players.push({ id, name: trimmed, color: PLAYER_COLORS[data.players.length % PLAYER_COLORS.length] });
      data.totals[id] = data.start;
      data.rounds[id] = Array.from({ length: data.roundCount }, () => 0);
      data.counts[id] = emptyRow();
      data.ledger[id] = [];
    },
    renamePlayer(id, name) {
      const player = data.players.find((item) => item.id === id);
      if (!player) return;
      const trimmed = name.trim();
      if (!trimmed || trimmed === player.name) return;
      ctx.undo.push(translate('score.undo-rename'));
      player.name = trimmed;
      // A typed name is the player's own, so the seat stops naming it.
      delete player.seat;
    },
    syncPlayers() {
      const source = ctx.session.players();
      if (!source.length) {
        ctx.toast(translate('score.toast-no-players'));
        return;
      }
      ctx.undo.push(translate('score.undo-sync'));
      data.players = toolSeats(source, 2).map((slot, index) => ({
        id: source[index].id,
        name: slot.name,
        ...(slot.seat ? { seat: slot.seat } : {}),
        color: source[index].color || PLAYER_COLORS[index % PLAYER_COLORS.length],
      }));
      const totals: Record<string, number> = {};
      const rounds: Record<string, number[]> = {};
      const counts: Record<string, Record<string, number>> = {};
      const ledger: Record<string, LedgerEntry[]> = {};
      for (const player of data.players) {
        totals[player.id] = data.totals[player.id] ?? data.start;
        rounds[player.id] = data.rounds[player.id] ?? Array.from({ length: data.roundCount }, () => 0);
        counts[player.id] = data.counts[player.id] ?? emptyRow();
        ledger[player.id] = data.ledger[player.id] ?? [];
      }
      data.totals = totals;
      data.rounds = rounds;
      data.counts = counts;
      data.ledger = ledger;
    },
    clearAll() {
      ctx.undo.push(translate('score.undo-clear'));
      for (const player of data.players) {
        data.totals[player.id] = data.start;
        data.rounds[player.id] = Array.from({ length: data.roundCount }, () => 0);
        data.counts[player.id] = emptyRow();
        data.ledger[player.id] = [];
      }
      data.notes = {};
    },
    setMode(mode) {
      ctx.undo.push(translate('score.undo-mode'));
      data.mode = mode;
    },
    setWin(win) {
      if (data.win === win) return;
      ctx.undo.push(translate('score.undo-win'));
      data.win = win;
    },
    setStep(value) {
      const next = Math.max(1, Math.round(Number.isFinite(value) ? value : 1));
      if (data.step === next) return;
      ctx.undo.push(translate('score.undo-step'));
      data.step = next;
    },
    setTarget(value) {
      const next = Math.max(0, Math.round(Number.isFinite(value) ? value : 0));
      if (data.target === next) return;
      ctx.undo.push(translate('score.undo-target'));
      data.target = next;
    },
    setHint(text) {
      const next = text.trim();
      if (data.hint === next) return;
      ctx.undo.push(translate('score.undo-hint'));
      data.hint = next;
    },
    setCategoryCount(id, category, value) {
      ctx.undo.push(translate('score.undo-category'), `count-${id}-${category}`);
      const row = data.counts[id] ?? {};
      row[category] = Math.max(0, Number.isFinite(value) ? Math.round(value) : 0);
      data.counts[id] = row;
      announceScore(id);
    },
    setCategories(next) {
      ctx.undo.push(translate('score.undo-categories'));
      const clean: ScoreCategory[] = [];
      const seen = new Set<string>();
      for (const entry of next) {
        const name = entry.name.trim();
        if (!name || seen.has(name)) continue;
        seen.add(name);
        clean.push({ name, points: Number(entry.points) || 0 });
      }
      data.categories = clean;
      for (const player of data.players) {
        const previous = data.counts[player.id] ?? {};
        const row: Record<string, number> = {};
        for (const category of clean) row[category.name] = Math.max(0, Number(previous[category.name]) || 0);
        data.counts[player.id] = row;
      }
    },
    setFormula(text) {
      const trimmed = text.trim();
      if (trimmed) {
        const scope: Record<string, number> = {};
        for (const category of data.categories) scope[normaliseName(category.name)] = 0;
        const check = evaluateFormula(trimmed, scope);
        if (!check.ok) {
          ctx.toast(check.message, 'error');
          return;
        }
      }
      ctx.undo.push(translate('score.undo-formula'));
      data.formula = trimmed;
    },
    addLedgerEntry(id, label, amount) {
      if (!data.players.some((player) => player.id === id)) return;
      const clean = label.trim() || translate('score.entry-default');
      const value = Number.isFinite(amount) ? Math.round(amount * 100) / 100 : 0;
      if (value === 0) {
        ctx.toast(translate('score.toast-entry-zero'), 'error');
        return;
      }
      ctx.undo.push(translate('score.undo-entry'), `ledger-${id}`);
      const entries = data.ledger[id] ?? [];
      entries.push({ id: `e${Date.now().toString(36)}${entries.length}`, label: clean, amount: value });
      data.ledger[id] = entries;
      announceScore(id);
    },
    removeLedgerEntry(id, entryId) {
      const entries = data.ledger[id] ?? [];
      if (!entries.some((entry) => entry.id === entryId)) return;
      ctx.undo.push(translate('score.undo-remove-entry'));
      data.ledger[id] = entries.filter((entry) => entry.id !== entryId);
    },
    note(playerId, cell) {
      return data.notes[noteKey(playerId, cell)] ?? '';
    },
    setNote(playerId, cell, text) {
      const key = noteKey(playerId, cell);
      const clean = text.trim();
      if ((data.notes[key] ?? '') === clean) return;
      ctx.undo.push(clean ? translate('score.undo-note') : translate('score.undo-clear-note'));
      if (clean) data.notes[key] = clean;
      else delete data.notes[key];
    },
    setHidden(value) {
      ctx.undo.push(translate('score.undo-hidden-scores'));
      data.hidden = value;
      data.revealed = !value;
    },
    reveal() {
      data.revealed = true;
      ctx.audio.play('success');
    },
    totalFor(id) {
      return totalFor(data, id);
    },
    standings() {
      return standingsFor(data);
    },
  };

  return instance;
}

export default { ...meta, preset, component: Score, create };
export { csvSheet, ledgerTotal };
