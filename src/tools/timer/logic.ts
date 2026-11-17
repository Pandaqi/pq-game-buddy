/**
 * Timer arithmetic. Everything is computed from timestamps: never decrement a
 * counter, so tab suspension and reloads cannot drift.
 *
 * `elapsed` is time already banked while paused. A running clock adds the time
 * since `startWall`/`startMono`, taking the larger of the wall and monotonic
 * deltas: monotonic wins normally, wall-clock wins after a device sleep or a
 * page reload (where the monotonic origin restarts at zero).
 */

import type { ToolInstance } from '../../core/registry';

export type TimerMode = 'countdown' | 'up' | 'flip' | 'chess' | 'interval' | 'sequence';
export const TIMER_MODES: TimerMode[] = ['countdown', 'up', 'flip', 'chess', 'interval', 'sequence'];

export type TimerSound = 'none' | 'bell' | 'buzzer' | 'gong';
export type TimerHaptic = 'none' | 'short' | 'long';

export const MIN_DURATION = 1000;
export const MAX_DURATION = 99 * 3600000;

export interface ClockMarks {
  m60: boolean;
  m30: boolean;
}

export interface ClockState {
  id: string;
  name: string;
  color: string;
  /** Limit in milliseconds for countdown, flip, chess, interval and sequence. */
  duration: number;
  elapsed: number;
  startWall: number;
  startMono: number;
  running: boolean;
  /** True once the zero alarm has fired for the current run. */
  alarmed: boolean;
  laps: number[];
  delay: number;
  marks: ClockMarks;
}

export interface Phase {
  name: string;
  duration: number;
}

export interface TimerState {
  mode: TimerMode;
  layout: 'single' | 'grid' | 'list';
  perPlayer: boolean;
  warnAt: number;
  sound: TimerSound;
  haptic: TimerHaptic;
  increment: number;
  delay: number;
  interval: number;
  maxRepeats: number;
  autoStart: boolean;
  timers: ClockState[];
  active: number;
}

export interface TimerActions {
  toggle(index?: number): void;
  start(index?: number): void;
  pause(index?: number): void;
  reset(index?: number): void;
  resetAll(): void;
  startAll(): void;
  pauseAll(): void;
  flip(index?: number): void;
  shift(index: number, delta: number): void;
  setDuration(index: number, ms: number): void;
  addTimer(): void;
  removeTimer(index: number): void;
  renameTimer(index: number, name: string): void;
  handover(index: number): void;
  goToPhase(index: number, autostart?: boolean): void;
  tick(mono: number, wall: number): void;
  applySettings(patch: Partial<TimerState>): void;
  usePlayers(): void;
  clockLabel(index: number, mono: number, wall: number): string;
}

export type TimerInstance = ToolInstance<TimerState> & TimerActions;

export function newClock(init: {
  id: string;
  name?: string;
  color?: string;
  duration: number;
  delay?: number;
}): ClockState {
  return {
    id: init.id,
    name: init.name ?? 'Timer',
    color: init.color ?? '#c0392b',
    duration: clampDuration(init.duration),
    elapsed: 0,
    startWall: 0,
    startMono: 0,
    running: false,
    alarmed: false,
    laps: [],
    delay: Math.max(0, init.delay ?? 0),
    marks: { m60: false, m30: false },
  };
}

export function clampDuration(value: number): number {
  if (!Number.isFinite(value)) return MIN_DURATION;
  return Math.min(MAX_DURATION, Math.max(MIN_DURATION, Math.round(value)));
}

export function runMs(c: ClockState, mono: number, wall: number): number {
  if (!c.running) return 0;
  return Math.max(0, wall - c.startWall, mono - c.startMono);
}

export function elapsedAt(c: ClockState, mono: number, wall: number): number {
  if (!c.running) return c.elapsed;
  const run = runMs(c, mono, wall);
  return c.elapsed + Math.max(0, run - (c.delay || 0));
}

export function remainingAt(c: ClockState, mono: number, wall: number): number {
  return c.duration - elapsedAt(c, mono, wall);
}

/** Milliseconds the display should show for this clock in this mode. */
export function displayMs(c: ClockState, mono: number, wall: number, mode: TimerMode): number {
  if (mode === 'up') return elapsedAt(c, mono, wall);
  return remainingAt(c, mono, wall);
}

export function progressOf(c: ClockState, mono: number, wall: number): number {
  if (c.duration <= 0) return 0;
  return Math.min(1, Math.max(0, elapsedAt(c, mono, wall) / c.duration));
}

export function startClock(c: ClockState, mono: number, wall: number): void {
  if (c.running) return;
  c.startWall = wall;
  c.startMono = mono;
  c.running = true;
  c.alarmed = false;
  c.marks = { m60: false, m30: false };
}

export function pauseClock(c: ClockState, mono: number, wall: number): void {
  if (!c.running) return;
  c.elapsed = elapsedAt(c, mono, wall);
  c.running = false;
}

export function resetClock(c: ClockState): void {
  c.elapsed = 0;
  c.running = false;
  c.alarmed = false;
  c.laps = [];
  c.marks = { m60: false, m30: false };
}

export function toggleClock(c: ClockState, mono: number, wall: number): boolean {
  if (c.running) {
    pauseClock(c, mono, wall);
    return false;
  }
  startClock(c, mono, wall);
  return true;
}

export function flipClock(c: ClockState, mono: number, wall: number): void {
  c.elapsed = 0;
  c.running = false;
  c.alarmed = false;
  c.laps = [];
  c.marks = { m60: false, m30: false };
  startClock(c, mono, wall);
}

export function shiftDuration(c: ClockState, delta: number): void {
  c.duration = clampDuration(c.duration + delta);
}

export function applyIncrement(c: ClockState, incrementMs: number): void {
  if (incrementMs > 0) c.elapsed = Math.max(0, c.elapsed - incrementMs);
}

/** Threshold announcements: one minute, thirty seconds, never every second. */
export function pendingMark(c: ClockState, remaining: number): 'm60' | 'm30' | null {
  if (remaining <= 0) return null;
  if (!c.marks.m60 && remaining <= 60000 && remaining > 30000) return 'm60';
  if (!c.marks.m30 && remaining <= 30000) return 'm30';
  return null;
}

/** Phase list from a `phases` preset of `name=duration` pairs. */
export function phasesFromPairs(pairs: Record<string, string | number> | undefined): Phase[] {
  const out: Phase[] = [];
  if (!pairs) return out;
  for (const [name, value] of Object.entries(pairs)) {
    const text = String(value);
    const ms = typeof value === 'number' ? value * 1000 : parseDurationLoose(text);
    if (ms && ms > 0) out.push({ name, duration: clampDuration(ms) });
  }
  return out;
}

function parseDurationLoose(text: string): number | null {
  const match = text.trim().match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i);
  if (!match || (!match[1] && !match[2] && !match[3])) {
    const numeric = Number(text);
    return Number.isFinite(numeric) ? numeric : null;
  }
  return (
    Number(match[1] ?? 0) * 3600000 + Number(match[2] ?? 0) * 60000 + Number(match[3] ?? 0) * 1000
  );
}

/** Tolerant clock restore: unknown or missing fields become safe defaults. */
export function restoreClock(value: unknown, index: number): ClockState {
  const raw = (value ?? {}) as Partial<ClockState>;
  const duration = clampDuration(Number(raw.duration ?? 300000));
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : `t${index + 1}`,
    name: typeof raw.name === 'string' ? raw.name : `Timer ${index + 1}`,
    color: typeof raw.color === 'string' ? raw.color : '#c0392b',
    duration,
    elapsed: Math.max(0, Number(raw.elapsed) || 0),
    startWall: Number(raw.startWall) || 0,
    startMono: Number(raw.startMono) || 0,
    running: !!raw.running,
    alarmed: !!raw.alarmed,
    laps: Array.isArray(raw.laps) ? raw.laps.filter((item) => typeof item === 'number') : [],
    delay: Math.max(0, Number(raw.delay) || 0),
    marks: {
      m60: !!(raw.marks && raw.marks.m60),
      m30: !!(raw.marks && raw.marks.m30),
    },
  };
}
