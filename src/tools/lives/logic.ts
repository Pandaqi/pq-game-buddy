import { seatNameIn, translateIn } from '../../core/i18n';
import type { ToolInstance } from '../../core/registry';

export interface LifeTrack {
  id: string;
  /** The session player's name, blank for a seat the app generated. */
  name: string;
  /** Set for a generated seat: said in the active language when it is shown. */
  seat?: number;
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
export function gameOverLabel(state: LivesState, languageId: string): string {
  if (!isGameOver(state)) return '';
  if (state.mode === 'shared') return translateIn(languageId, 'lives.over-out');
  const alive = alivePlayers(state);
  if (alive.length === 1) {
    const name = seatNameIn(languageId, alive[0].seat, alive[0].name);
    return translateIn(languageId, 'lives.over-wins', { name });
  }
  return translateIn(languageId, 'lives.over-all-out');
}

/** Final standings for the finish-game flow: players by lives, shared pool last. */
export function resultsFor(state: LivesState, languageId: string): { name: string; score: number }[] {
  if (state.mode === 'shared') {
    return [{ name: translateIn(languageId, 'lives.table-name'), score: state.lives }];
  }
  return state.players
    .map((track) => ({ name: seatNameIn(languageId, track.seat, track.name), score: track.lives }))
    .sort((a, b) => b.score - a.score);
}
