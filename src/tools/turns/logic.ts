import type { ToolInstance } from '../../core/registry';

export interface TurnLogEntry {
  at: number;
  text: string;
}

export interface TurnTimer {
  /** Whole turn length in milliseconds; 0 means no timer. */
  duration: number;
  remaining: number;
  running: boolean;
  startedWall: number;
  startedMono: number;
}

export interface TurnsState {
  order: string[];
  index: number;
  round: number;
  phases: string[];
  phase: number;
  timer: TurnTimer;
  /** Cover the board between players when the turn changes. */
  pass: boolean;
  /** Start the turn clock when a turn begins. */
  autoStart: boolean;
  log: TurnLogEntry[];
}

export interface TurnsActions {
  next(): void;
  previous(): void;
  goTo(index: number): void;
  setPhase(index: number): void;
  setOrder(names: string[]): void;
  syncPlayers(): void;
  setPass(value: boolean): void;
  setAutoStart(value: boolean): void;
  setDuration(ms: number): void;
  setPhases(phases: string[]): void;
  startTimer(): void;
  pauseTimer(): void;
  resetTimer(): void;
  resetTurn(): void;
  clearLog(): void;
}

export type TurnsInstance = ToolInstance<TurnsState> & TurnsActions;

export function currentName(state: TurnsState): string {
  return state.order[state.index] ?? 'Player 1';
}

export function currentPhase(state: TurnsState): string {
  return state.phases[state.phase] ?? 'Turn';
}

/** Fill in a turn order from session players, keeping names unique. */
export function normaliseOrder(names: string[]): string[] {
  const out: string[] = [];
  for (const name of names) {
    const clean = String(name).trim();
    if (!clean || out.includes(clean)) continue;
    out.push(clean);
  }
  return out.length ? out : ['Player 1', 'Player 2'];
}

export function normalisePhases(phases: string[]): string[] {
  return phases.map((phase) => String(phase).trim()).filter(Boolean);
}

/** Milliseconds left on the turn clock, using the larger of wall and monotonic time. */
export function remainingMs(state: TurnsState, wall: number, mono: number): number {
  const timer = state.timer;
  if (!timer.duration) return 0;
  if (!timer.running) return Math.max(0, timer.remaining);
  const wallDelta = Math.max(0, wall - timer.startedWall);
  const monoDelta = Math.max(0, mono - timer.startedMono);
  return Math.max(0, timer.duration - Math.max(wallDelta, monoDelta));
}

/** Advance one turn, rolling over into the next round. Mutates the state. */
export function advance(state: TurnsState): void {
  state.index += 1;
  if (state.index >= state.order.length) {
    state.index = 0;
    state.round += 1;
  }
  state.phase = 0;
}

/** Step back one turn, rolling the round back when needed. */
export function rewind(state: TurnsState): void {
  if (state.index > 0) {
    state.index -= 1;
  } else if (state.round > 1) {
    state.round -= 1;
    state.index = Math.max(0, state.order.length - 1);
  }
  state.phase = 0;
}

/** Jump to a player without changing the round; phases restart. */
export function jumpTo(state: TurnsState, index: number): void {
  const next = Math.max(0, Math.min(state.order.length - 1, Math.round(index)));
  state.index = next;
  state.phase = 0;
}
