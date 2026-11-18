import { seatNameIn, translateIn } from '../../core/i18n';
import type { ToolInstance } from '../../core/registry';
import { seatKey, seatPair, seatValues, type SeatPair } from '../../core/session';

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

/** `order` walks the list; `initiative` picks the highest roll first each round. */
export type TurnsMode = 'order' | 'initiative';

export interface TurnsState {
  /** Seats in turn order; `seat` marks one the app named, stored blank. */
  order: SeatPair[];
  index: number;
  round: number;
  phases: string[];
  phase: number;
  timer: TurnTimer;
  /** Cover the board between players when the turn changes. */
  pass: boolean;
  /** Start the turn clock when a turn begins. */
  autoStart: boolean;
  mode: TurnsMode;
  /** Initiative per seat, aligned with `order`. Higher goes first. */
  initiative: number[];
  log: TurnLogEntry[];
}

export interface TurnsActions {
  next(): void;
  previous(): void;
  goTo(index: number): void;
  setPhase(index: number): void;
  setOrder(seats: (string | SeatPair)[]): void;
  syncPlayers(): void;
  setPass(value: boolean): void;
  setAutoStart(value: boolean): void;
  setDuration(ms: number): void;
  setPhases(phases: string[]): void;
  setMode(mode: TurnsMode): void;
  setInitiative(index: number, value: number): void;
  newInitiativeRound(): void;
  startTimer(): void;
  pauseTimer(): void;
  resetTimer(): void;
  resetTurn(): void;
  clearLog(): void;
}

export type TurnsInstance = ToolInstance<TurnsState> & TurnsActions;

export function currentName(state: TurnsState, languageId: string): string {
  const seat = state.order[state.index];
  if (!seat) return translateIn(languageId, 'players.default', { count: 1 });
  return seatNameIn(languageId, seat.seat, seat.name);
}

export function currentPhase(state: TurnsState): string {
  return state.phases[state.phase] ?? 'Turn';
}

/**
 * Turn seats from template text, a text draft or a save. `seatPair()` decides
 * what a blank entry means; the turn order only adds its own two rules: a
 * repeated name is dropped, and the table always has two seats.
 */
export function seatList(values: unknown[]): SeatPair[] {
  const out: SeatPair[] = [];
  const seen = new Set<string>();
  for (const value of seatValues(values)) {
    const seat = seatPair(value, out.length);
    if (!seat.seat) {
      if (seen.has(seat.name)) continue;
      seen.add(seat.name);
    }
    out.push(seat);
  }
  return out.length ? out : [{ name: '', seat: 1 }, { name: '', seat: 2 }];
}

/** A turn order from names or seats, cleaned the same way. */
export function normaliseOrder(names: (string | SeatPair)[]): SeatPair[] {
  return seatList(names);
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

/** Initiative per seat, cleaned to one whole number each. */
export function normaliseInitiative(values: unknown, count: number): number[] {
  const list = Array.isArray(values) ? values : [];
  return Array.from({ length: count }, (_, index) => Math.round(Number(list[index]) || 0));
}

/** Seats sorted by initiative, highest first; ties keep the turn order. */
export function initiativeRanking(state: TurnsState): number[] {
  return state.order
    .map((_, index) => index)
    .sort((a, b) => (state.initiative[b] ?? 0) - (state.initiative[a] ?? 0) || a - b);
}

/** The next seat in initiative order, rolling the round when the list wraps. */
export function advanceInitiative(state: TurnsState): void {
  const ranking = initiativeRanking(state);
  const at = ranking.indexOf(state.index);
  const next = at + 1;
  if (next >= ranking.length) {
    state.round += 1;
    state.index = ranking[0] ?? 0;
  } else {
    state.index = ranking[next];
  }
  state.phase = 0;
}

/** Back one seat in initiative order, rolling the round back at the top. */
export function rewindInitiative(state: TurnsState): void {
  const ranking = initiativeRanking(state);
  const at = ranking.indexOf(state.index);
  if (at === 0) {
    if (state.round <= 1) return;
    state.round -= 1;
    state.index = ranking[ranking.length - 1] ?? 0;
  } else {
    state.index = ranking[at - 1];
  }
  state.phase = 0;
}

/** A new round clears every initiative value and starts at the top seat. */
export function newInitiativeRound(state: TurnsState): void {
  state.initiative = state.order.map(() => 0);
  state.index = 0;
  state.round += 1;
  state.phase = 0;
}

/**
 * A template may write `initiative: Ada=18, seat-2=12` (a pairs object) or a
 * plain list; a seat's own key wins, a typed name still reads older templates,
 * and anything missing is zero.
 */
export function initiativeFromPreset(raw: unknown, seats: (string | SeatPair)[]): number[] {
  const list = seats.map((seat, index) => seatPair(seat, index));
  if (Array.isArray(raw)) return normaliseInitiative(raw, list.length);
  if (raw && typeof raw === 'object') {
    const map = raw as Record<string, unknown>;
    return list.map((seat) => Math.round(Number(map[seatKey(seat)] ?? map[seat.name]) || 0));
  }
  return list.map(() => 0);
}
