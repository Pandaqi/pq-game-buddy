import { registerToolStrings, seatName, t as translate } from '../../core/i18n.svelte';
import type { ToolContext, ToolInstance, ToolResult } from '../../core/registry';
import { seatPair, toolSeats } from '../../core/session';
import type { PresetValues } from '../../core/template/schema';
import {
  buildBracket,
  type BracketFormat,
  type BracketInput,
  type BracketView,
  type Entrant,
  type Result,
} from './logic';
import Bracket from './Bracket.svelte';
import meta from './meta';
import preset from './preset';
import en from './locales/en';

// A tool's words travel with its chunk; the shell only knows its title.
registerToolStrings('bracket', en);

export interface BracketState {
  format: BracketFormat;
  entrants: Entrant[];
  results: Record<string, Result>;
  scores: Record<string, { a: number; b: number }>;
  bestOf: number;
  tiebreak: 'diff' | 'head';
  seeding: 'order' | 'random';
}

export interface BracketActions {
  report(matchId: string, winner: string): void;
  clearResult(matchId: string): void;
  setScore(matchId: string, side: 'a' | 'b', value: number): void;
  setFormat(format: BracketFormat): void;
  setBestOf(value: number): void;
  setTiebreak(value: 'diff' | 'head'): void;
  regenerate(seeding?: 'order' | 'random'): void;
  addEntrant(name: string): void;
  renameEntrant(id: string, name: string): void;
  removeEntrant(id: string): void;
  clearResults(): void;
  view(): BracketView;
}

export type BracketInstance = ToolInstance<BracketState> & BracketActions;

function makeEntrants(slots: { name: string; seat?: number }[]): Entrant[] {
  return slots.map((slot, index) => ({
    id: `e${index + 1}`,
    name: slot.name,
    ...(slot.seat ? { seat: slot.seat } : {}),
    seed: index + 1,
  }));
}

function create(ctx: ToolContext, values: PresetValues = {}): BracketInstance {
  const fromTemplate = Array.isArray(values.entrants) ? (values.entrants as string[]) : [];
  const seeding = (values.seeding as BracketState['seeding']) ?? 'order';

  const data = $state<BracketState>({
    format: (values.format as BracketFormat) ?? 'single',
    entrants: makeEntrants(
      fromTemplate.length
        ? fromTemplate.map((name, index) => seatPair(name, index))
        : toolSeats(ctx.session.players(), 2),
    ),
    results: {},
    scores: {},
    bestOf: Math.max(1, Number(values['best-of'] ?? 1)),
    tiebreak: (values.tiebreak as BracketState['tiebreak']) ?? 'diff',
    seeding,
  });

  /** An entrant's name in the active language; an id nobody knows prints as itself. */
  function nameOf(id: string | null): string {
    if (!id) return '?';
    const entrant = data.entrants.find((item) => item.id === id);
    return entrant ? seatName(entrant.seat, entrant.name) : id;
  }

  function input(): BracketInput {
    return {
      format: data.format,
      entrants: data.entrants,
      results: data.results,
      bestOf: data.bestOf,
      tiebreak: data.tiebreak,
    };
  }

  function sideName(matchId: string, side: 'a' | 'b'): string | null {
    const match = buildBracket(input()).matches.find((item) => item.id === matchId);
    if (!match) return null;
    return side === 'a' ? match.aName : match.bName;
  }

  const instance: BracketInstance = {
    data,
    state: () => JSON.parse(JSON.stringify(data)) as BracketState,
    load(state) {
      if (!state || typeof state !== 'object') return;
      const raw = state as Partial<BracketState>;
      if (typeof raw.format === 'string') data.format = raw.format;
      if (Array.isArray(raw.entrants)) {
        const list = raw.entrants
          .filter((item) => item && typeof item.name === 'string')
          .map((item, index) => {
            const seat = Number(item.seat);
            return {
              id: String(item.id ?? `e${index + 1}`),
              name: item.name,
              ...(Number.isInteger(seat) && seat > 0 ? { seat } : {}),
              seed: Number(item.seed) || index + 1,
            };
          });
        if (list.length) data.entrants = list;
      }
      if (raw.results && typeof raw.results === 'object') {
        const out: Record<string, Result> = {};
        for (const [key, value] of Object.entries(raw.results as Record<string, Partial<Result>>)) {
          if (!value || typeof value.winner !== 'string') continue;
          out[key] = {
            winner: value.winner,
            scoreA: Number(value.scoreA) || 0,
            scoreB: Number(value.scoreB) || 0,
          };
        }
        data.results = out;
      }
      if (raw.scores && typeof raw.scores === 'object') data.scores = raw.scores;
      if (typeof raw.bestOf === 'number') data.bestOf = Math.max(1, raw.bestOf);
      if (raw.tiebreak === 'head' || raw.tiebreak === 'diff') data.tiebreak = raw.tiebreak;
      if (raw.seeding === 'order' || raw.seeding === 'random') data.seeding = raw.seeding;
    },
    presetFromState() {
      return {
        format: data.format,
        entrants: data.entrants.map((entrant) => entrant.name),
        'best-of': data.bestOf,
        seeding: data.seeding,
        tiebreak: data.tiebreak,
      };
    },
    commands: {
      next: () => {
        const view = buildBracket(input());
        if (!view.next) return;
        const { aName, bName, id } = view.next;
        if (aName) instance.report(id, aName);
        else if (bName) instance.report(id, bName);
      },
      champion: () => {
        const champion = buildBracket(input()).champion;
        if (champion) {
          ctx.toast(
            translate('bracket.toast-champion', {
              name: nameOf(champion),
            }),
          );
        }
      },
    },
    summary() {
      const view = buildBracket(input());
      const lines: string[] = [];
      if (view.champion) {
        lines.push(translate('bracket.summary-champion', { name: nameOf(view.champion) }));
      }
      if (view.next) {
        lines.push(
          translate('bracket.summary-next', {
            a: nameOf(view.next.aName),
            b: nameOf(view.next.bName),
          }),
        );
      }
      lines.push(translate('bracket.summary-standings'));
      for (const row of view.standings) {
        lines.push(
          translate('bracket.summary-row', {
            name: seatName(row.seat, row.name),
            wins: row.wins,
            losses: row.losses,
            diff: `${row.diff >= 0 ? '+' : ''}${row.diff}`,
          }),
        );
      }
      return lines.join('\n');
    },
    results() {
      const view = buildBracket(input());
      return view.standings
        .slice()
        .sort((a, b) => (b.wins - a.wins) || (b.diff - a.diff))
        .map((row): ToolResult => {
          const entrant = data.entrants.find((item) => item.id === row.id);
          return { name: entrant ? seatName(entrant.seat, entrant.name) : row.name, score: row.wins };
        });
    },
    view: () => buildBracket(input()),
    report(matchId, winner) {
      const a = sideName(matchId, 'a');
      const b = sideName(matchId, 'b');
      if (!a || !b || (winner !== a && winner !== b)) return;
      const saved = data.scores[matchId];
      const scoreA = saved ? saved.a : winner === a ? 1 : 0;
      const scoreB = saved ? saved.b : winner === b ? 1 : 0;
      ctx.undo.push(translate('bracket.undo-report'));
      data.results = { ...data.results, [matchId]: { winner, scoreA, scoreB } };
      ctx.audio.play('click');
      ctx.haptics.buzz('short');
    },
    clearResult(matchId) {
      if (!data.results[matchId]) return;
      ctx.undo.push(translate('bracket.undo-clear'));
      const next = { ...data.results };
      delete next[matchId];
      if (matchId === 'grand-1') delete next['grand-2'];
      data.results = next;
    },
    setScore(matchId, side, value) {
      const clean = Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
      const current = data.scores[matchId] ?? { a: 0, b: 0 };
      const next = { ...current, [side]: clean };
      ctx.undo.push(translate('bracket.undo-score'), `score-${matchId}-${side}`);
      data.scores = { ...data.scores, [matchId]: next };
      const existing = data.results[matchId];
      if (existing) {
        data.results = {
          ...data.results,
          [matchId]: { ...existing, scoreA: next.a, scoreB: next.b },
        };
      }
    },
    setFormat(format) {
      if (format === data.format) return;
      ctx.undo.push(translate('bracket.undo-format'));
      data.format = format;
      data.results = {};
    },
    setBestOf(value) {
      const next = Math.max(1, Math.min(9, Math.round(value)));
      if (next === data.bestOf) return;
      ctx.undo.push(translate('bracket.undo-best-of'));
      data.bestOf = next;
    },
    setTiebreak(value) {
      if (value === data.tiebreak) return;
      ctx.undo.push(translate('bracket.undo-tiebreak'));
      data.tiebreak = value;
    },
    regenerate(seeding) {
      ctx.undo.push(translate('bracket.undo-regenerate'));
      const chosen = seeding ?? data.seeding;
      data.seeding = chosen;
      // Shuffle the entrants themselves, so a generated seat keeps its seat.
      const ordered = chosen === 'random' ? ctx.rng.shuffle(data.entrants) : data.entrants;
      data.entrants = ordered.map((entrant, index) => ({ ...entrant, seed: index + 1 }));
      data.results = {};
      data.scores = {};
      ctx.toast(translate('bracket.toast-reset'));
    },
    addEntrant(name) {
      const trimmed = name.trim();
      if (!trimmed) return;
      ctx.undo.push(translate('bracket.undo-add'));
      data.entrants = [...data.entrants, { id: `e${Date.now().toString(36)}`, name: trimmed, seed: data.entrants.length + 1 }];
      data.results = {};
    },
    renameEntrant(id, name) {
      const entrant = data.entrants.find((item) => item.id === id);
      if (!entrant) return;
      const trimmed = name.trim();
      // The field shows a generated seat as its label, so leaving it untouched
      // must not turn that label into a typed name.
      if (!trimmed || trimmed === entrant.name || trimmed === nameOf(entrant.id)) return;
      ctx.undo.push(translate('bracket.undo-rename'));
      entrant.name = trimmed;
      delete entrant.seat;
    },
    removeEntrant(id) {
      if (data.entrants.length <= 2) {
        ctx.toast(translate('bracket.toast-two'), 'error');
        return;
      }
      ctx.undo.push(translate('bracket.undo-remove'));
      data.entrants = data.entrants.filter((entrant) => entrant.id !== id);
      data.results = {};
    },
    clearResults() {
      if (!Object.keys(data.results).length) return;
      ctx.undo.push(translate('bracket.undo-clear-all'));
      data.results = {};
      data.scores = {};
    },
  };

  if (seeding === 'random') {
    data.entrants = ctx.rng.shuffle(data.entrants).map((entrant, index) => ({ ...entrant, seed: index + 1 }));
  }

  return instance;
}

export default { ...meta, preset, component: Bracket, create };
