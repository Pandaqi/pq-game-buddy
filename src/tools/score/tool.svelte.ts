import type { ToolContext } from '../../core/registry';
import type { PresetValues } from '../../core/template/schema';
import Score from './Score.svelte';
import {
  csvSheet,
  scoreSheet,
  standingsFor,
  totalFor,
  type ScoreInstance,
  type ScoreMode,
  type ScorePlayer,
  type ScoreState,
} from './logic';
import meta from './meta';
import preset from './preset';

const COLORS = ['#c0392b', '#2f6fc0', '#3d8b55', '#c2631b', '#7550c8', '#23807f', '#bd4d8c', '#b58a12'];

function create(ctx: ToolContext, values: PresetValues = {}): ScoreInstance {
  const mode = (values.mode as ScoreMode) ?? 'simple';
  const start = Number(values.start ?? 0);
  const sessionPlayers = ctx.session.players();

  function buildPlayers(): ScorePlayer[] {
    const source = sessionPlayers.length
      ? sessionPlayers
      : [
          { id: 'p1', name: 'Player 1', color: COLORS[0] },
          { id: 'p2', name: 'Player 2', color: COLORS[1] },
        ];
    return source.map((player, index) => ({
      id: player.id,
      name: player.name,
      color: (player as { color?: string }).color ?? COLORS[index % COLORS.length],
    }));
  }

  const players = buildPlayers();
  const totals: Record<string, number> = {};
  const rounds: Record<string, number[]> = {};
  for (const player of players) {
    totals[player.id] = start;
    rounds[player.id] = [];
  }

  const requestedRounds = Math.max(0, Number(values.rounds ?? 0));

  const data = $state<ScoreState>({
    mode,
    players,
    totals,
    rounds,
    roundCount: requestedRounds,
    step: Math.max(1, Number(values.step ?? 1)),
    target: Math.max(0, Number(values.target ?? 0)),
    win: (values.win as ScoreState['win']) ?? 'highest',
    start,
  });

  if (data.mode === 'rounds' && data.roundCount > 0) {
    for (const player of data.players) {
      const row = data.rounds[player.id] ?? [];
      while (row.length < data.roundCount) row.push(0);
      data.rounds[player.id] = row;
    }
  }

  function adjust(id: string, delta: number): void {
    ctx.undo.push('score change', `score-${id}`);
    if (data.mode === 'rounds' && data.roundCount > 0) {
      const row = data.rounds[id] ?? [];
      const index = Math.max(0, data.roundCount - 1);
      while (row.length <= index) row.push(0);
      row[index] = (row[index] ?? 0) + delta;
      data.rounds[id] = row;
    } else {
      data.totals[id] = (data.totals[id] ?? data.start) + delta;
    }
    announceScore(id);
  }

  function announceScore(id: string): void {
    const player = data.players.find((item) => item.id === id);
    if (!player) return;
    ctx.haptics.buzz('short');
    const total = totalFor(data, id);
    const target = data.target;
    if (target) {
      if (data.win === 'highest' && total >= target) ctx.toast(`${player.name} reached ${total} — game over?`);
      if (data.win === 'lowest' && total <= target) ctx.toast(`${player.name} reached ${total} — game over?`);
    }
  }

  const instance: ScoreInstance = {
    data,
    state: () => JSON.parse(JSON.stringify(data)) as ScoreState,
    load(state) {
      if (!state || typeof state !== 'object') return;
      const raw = state as Partial<ScoreState>;
      if (raw.mode === 'simple' || raw.mode === 'rounds') data.mode = raw.mode;
      if (Array.isArray(raw.players) && raw.players.length) {
        data.players = raw.players
          .filter((player) => player && typeof player.id === 'string')
          .map((player, index) => ({
            id: player.id,
            name: typeof player.name === 'string' ? player.name : `Player ${index + 1}`,
            color: typeof player.color === 'string' ? player.color : COLORS[index % COLORS.length],
          }));
      }
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
      if (typeof raw.roundCount === 'number') data.roundCount = Math.max(0, raw.roundCount);
      if (typeof raw.step === 'number') data.step = Math.max(1, raw.step);
      if (typeof raw.target === 'number') data.target = Math.max(0, raw.target);
      if (raw.win === 'highest' || raw.win === 'lowest') data.win = raw.win;
    },
    presetFromState() {
      return {
        mode: data.mode,
        rounds: data.roundCount,
        categories: {},
        formula: '',
        win: data.win,
        target: data.target,
        start: data.start,
        step: data.step,
      };
    },
    commands: {
      add: (arg) => {
        const [id, delta] = String(arg ?? '').split(',');
        if (id) adjust(id, Number(delta ?? 1) || 1);
      },
    },
    summary: () => scoreSheet(data),
    adjust,
    setTotal(id, value) {
      ctx.undo.push('set score');
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
      ctx.undo.push('set round', `round-${id}-${round}`);
      const row = data.rounds[id] ?? [];
      while (row.length <= round) row.push(0);
      row[round] = Number.isFinite(value) ? value : 0;
      data.rounds[id] = row;
      data.roundCount = Math.max(data.roundCount, row.length);
    },
    addRound() {
      ctx.undo.push('add round');
      data.roundCount += 1;
      for (const player of data.players) {
        const row = data.rounds[player.id] ?? [];
        while (row.length < data.roundCount) row.push(0);
        data.rounds[player.id] = row;
      }
    },
    removeRound() {
      if (data.roundCount <= 1) return;
      ctx.undo.push('remove round');
      data.roundCount -= 1;
      for (const player of data.players) {
        const row = data.rounds[player.id] ?? [];
        data.rounds[player.id] = row.slice(0, data.roundCount);
      }
    },
    addPlayer(name) {
      const trimmed = name.trim();
      if (!trimmed) return;
      ctx.undo.push('add player');
      const id = `x${Date.now().toString(36)}`;
      data.players.push({ id, name: trimmed, color: COLORS[data.players.length % COLORS.length] });
      data.totals[id] = data.start;
      data.rounds[id] = Array.from({ length: data.roundCount }, () => 0);
    },
    renamePlayer(id, name) {
      const player = data.players.find((item) => item.id === id);
      if (!player) return;
      ctx.undo.push('rename player');
      player.name = name.trim() || player.name;
    },
    syncPlayers() {
      const source = ctx.session.players();
      if (!source.length) {
        ctx.toast('No players in the session yet');
        return;
      }
      ctx.undo.push('use session players');
      data.players = source.map((player, index) => ({
        id: player.id,
        name: player.name,
        color: player.color ?? COLORS[index % COLORS.length],
      }));
      const totals: Record<string, number> = {};
      const rounds: Record<string, number[]> = {};
      for (const player of data.players) {
        totals[player.id] = data.totals[player.id] ?? data.start;
        rounds[player.id] = data.rounds[player.id] ?? Array.from({ length: data.roundCount }, () => 0);
      }
      data.totals = totals;
      data.rounds = rounds;
    },
    clearAll() {
      ctx.undo.push('clear scores');
      for (const player of data.players) {
        data.totals[player.id] = data.start;
        data.rounds[player.id] = Array.from({ length: data.roundCount }, () => 0);
      }
    },
    setMode(mode) {
      ctx.undo.push('score mode');
      data.mode = mode;
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
export { csvSheet };
