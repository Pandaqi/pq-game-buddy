import type { ToolInstance } from '../../core/registry';

export type ScoreMode = 'simple' | 'rounds';

export interface ScorePlayer {
  id: string;
  name: string;
  color: string;
}

export interface ScoreState {
  mode: ScoreMode;
  players: ScorePlayer[];
  totals: Record<string, number>;
  rounds: Record<string, number[]>;
  roundCount: number;
  step: number;
  target: number;
  win: 'highest' | 'lowest';
  start: number;
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
  totalFor(id: string): number;
  standings(): Standing[];
}

export type ScoreInstance = ToolInstance<ScoreState> & ScoreActions;

export function totalFor(state: ScoreState, id: string): number {
  if (state.mode === 'rounds') {
    const row = state.rounds[id] ?? [];
    return row.reduce((sum, value) => sum + (Number.isFinite(value) ? value : 0), state.start);
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

/** Plain-text score sheet for copy/paste and export. */
export function scoreSheet(state: ScoreState): string {
  const rows = standingsFor(state);
  const lines = [`${state.win === 'lowest' ? 'Lowest' : 'Highest'} score wins`];
  if (state.target) lines.push(`Target: ${state.target}`);
  lines.push('');
  for (const row of rows) {
    const rounds = state.rounds[row.id]?.filter((value) => Number.isFinite(value) && value !== 0);
    const detail = state.mode === 'rounds' && rounds?.length ? ` (${rounds.join(', ')})` : '';
    lines.push(`${row.rank}. ${row.name}: ${row.total}${detail}`);
  }
  return lines.join('\n');
}

export function csvSheet(state: ScoreState): string {
  const header = ['Player', 'Total'];
  if (state.mode === 'rounds') {
    for (let index = 1; index <= state.roundCount; index += 1) header.push(`Round ${index}`);
  }
  const rows = [header.join(',')];
  for (const player of state.players) {
    const cells: string[] = [quote(player.name), String(totalFor(state, player.id))];
    if (state.mode === 'rounds') {
      for (let index = 0; index < state.roundCount; index += 1) {
        cells.push(String(state.rounds[player.id]?.[index] ?? ''));
      }
    }
    rows.push(cells.join(','));
  }
  return rows.join('\n');
}

function quote(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}
