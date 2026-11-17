import type { ToolInstance } from '../../core/registry';

export interface LifeTrack {
  id: string;
  name: string;
  lives: number;
  max: number;
  color: string;
}

export interface ExtraTrack {
  name: string;
  value: number;
  step: number;
}

export interface Condition {
  name: string;
  active: boolean;
}

export interface LivesState {
  mode: 'shared' | 'players';
  lives: number;
  max: number;
  step: number;
  elimination: boolean;
  players: LifeTrack[];
  extras: ExtraTrack[];
  conditions: Condition[];
  hidden: boolean;
  revealed: boolean;
}

export interface LivesActions {
  adjust(id: string, delta: number): void;
  setLives(id: string, value: number): void;
  setMode(mode: LivesState['mode']): void;
  addPlayer(name: string): void;
  removePlayer(id: string): void;
  syncPlayers(): void;
  adjustExtra(name: string, delta: number): void;
  toggleCondition(name: string): void;
  resetAll(): void;
  setHidden(value: boolean): void;
  reveal(): void;
}

export type LivesInstance = ToolInstance<LivesState> & LivesActions;

/** Lives never go below zero or above the track maximum. */
export function clampLives(value: number, max: number): number {
  const limit = Math.max(1, Math.round(max));
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(limit, Math.round(value)));
}

export function isOut(state: LivesState, track: LifeTrack): boolean {
  return state.elimination && track.lives <= 0;
}

export function alivePlayers(state: LivesState): LifeTrack[] {
  return state.players.filter((track) => !isOut(state, track));
}

export function isGameOver(state: LivesState): boolean {
  if (!state.elimination) return false;
  if (state.mode === 'shared') return state.lives <= 0;
  if (state.players.length < 2) return state.players[0] ? isOut(state, state.players[0]) : false;
  return alivePlayers(state).length <= 1;
}

/** The last player standing, or the shared pool when it is empty. */
export function gameOverLabel(state: LivesState): string {
  if (!isGameOver(state)) return '';
  if (state.mode === 'shared') return 'Out of lives';
  const alive = alivePlayers(state);
  return alive.length === 1 ? `${alive[0].name} wins` : 'Everyone is out';
}

/** Final standings for the finish-game flow: players by lives, shared pool last. */
export function resultsFor(state: LivesState): { name: string; score: number }[] {
  if (state.mode === 'shared') return [{ name: 'Table', score: state.lives }];
  return state.players
    .map((track) => ({ name: track.name, score: track.lives }))
    .sort((a, b) => b.score - a.score);
}
