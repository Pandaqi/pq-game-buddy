import { announce } from '../../core/dom';
import type { ToolContext } from '../../core/registry';
import { wake } from '../../core/wake';
import type { PresetValues } from '../../core/template/schema';
import { formatClock, formatDurationText, parseDuration } from '../../core/template/schema';
import meta from './meta';
import preset from './preset';
import Timer from './Timer.svelte';
import {
  applyIncrement,
  clampDuration,
  displayMs,
  flipClock,
  newClock,
  pauseClock,
  pendingMark,
  phasesFromPairs,
  remainingAt,
  resetClock,
  restoreClock,
  shiftDuration,
  startClock,
  toggleClock,
  type ClockState,
  type TimerInstance,
  type TimerMode,
  type TimerState,
} from './logic';

const COLORS = ['#c0392b', '#2f6fc0', '#3d8b55', '#c2631b', '#7550c8', '#23807f', '#bd4d8c', '#b58a12'];

function create(ctx: ToolContext, values: PresetValues = {}): TimerInstance {
  const mode = (values.mode as TimerMode) ?? 'countdown';
  const duration = Number(values.duration ?? 300000);
  const perPlayer = !!values['per-player'];
  const count = Math.max(1, Math.min(12, Number(values.players ?? 2)));
  const phases = phasesFromPairs(values.phases as Record<string, string | number>);
  const warnAt = Number(values['warn-at'] ?? 30000);
  const layout = (values.layout as TimerState['layout']) ?? 'single';
  const sound = (values.sound as TimerState['sound']) ?? 'bell';
  const haptic = (values.haptic as TimerState['haptic']) ?? 'short';
  const increment = Number(values.increment ?? 0);
  const delay = Number(values.delay ?? 0);
  const interval = Number(values.interval ?? 90000);
  const maxRepeats = Number(values.count ?? 0);
  const autoStart = values.start === 'auto';

  const playerNames = ctx.session.players().map((player) => player.name);

  function buildTimers(): ClockState[] {
    if (mode === 'sequence') {
      if (phases.length) {
        return phases.map((phase, index) =>
          newClock({ id: `t${index + 1}`, name: phase.name, color: COLORS[index % COLORS.length], duration: phase.duration, delay }),
        );
      }
      return [
        newClock({ id: 't1', name: 'Phase 1', color: COLORS[0], duration, delay }),
        newClock({ id: 't2', name: 'Phase 2', color: COLORS[1], duration, delay }),
      ];
    }
    const total = mode === 'chess' ? Math.max(2, count) : perPlayer || layout === 'grid' ? count : 1;
    return Array.from({ length: total }, (_, index) => {
      const limit = mode === 'interval' ? interval || duration : duration;
      return newClock({
        id: `t${index + 1}`,
        name: playerNames[index] ?? (total > 1 ? `Timer ${index + 1}` : 'Timer'),
        color: COLORS[index % COLORS.length],
        duration: limit,
        delay,
      });
    });
  }

  const data = $state<TimerState>({
    mode,
    layout,
    perPlayer,
    warnAt,
    sound,
    haptic,
    increment,
    delay,
    interval,
    maxRepeats,
    autoStart,
    timers: buildTimers(),
    active: 0,
  });

  let wakeHeld = false;

  /** Keep the screen awake while anything runs; let go when nothing does. */
  function syncWake(): void {
    const running = data.timers.some((clock) => clock.running);
    if (running && !wakeHeld) {
      wakeHeld = true;
      wake.retain();
    } else if (!running && wakeHeld) {
      wakeHeld = false;
      wake.release();
    }
  }

  function cue(): void {
    if (data.sound === 'none') return;
    ctx.audio.play(data.sound);
    ctx.haptics.buzz(data.haptic);
  }

  function announceTimer(clock: ClockState): void {
    announce(`${clock.name}: ${data.mode === 'up' ? 'stopped' : 'time is up'}`);
  }

  function start(index = 0): void {
    const clock = data.timers[index];
    if (!clock) return;
    startClock(clock, ctx.clock.now(), ctx.clock.wall());
    ctx.audio.unlock();
    ctx.undo.push('start', 'timer-start');
  }

  function pause(index = 0): void {
    const clock = data.timers[index];
    if (!clock) return;
    pauseClock(clock, ctx.clock.now(), ctx.clock.wall());
    ctx.undo.push('pause', 'timer-pause');
  }

  function toggle(index = 0): void {
    const clock = data.timers[index];
    if (!clock) return;
    ctx.audio.unlock();
    if (data.mode === 'flip') {
      flipClock(clock, ctx.clock.now(), ctx.clock.wall());
      ctx.undo.push('flip', 'timer-flip');
      return;
    }
    if (data.mode === 'chess') {
      if (data.active !== index || !clock.running) handover(index);
      else pause(index);
      return;
    }
    const running = toggleClock(clock, ctx.clock.now(), ctx.clock.wall());
    ctx.undo.push(running ? 'start' : 'pause', 'timer-toggle');
  }

  function handover(index: number): void {
    const mono = ctx.clock.now();
    const wall = ctx.clock.wall();
    const previous = data.timers[data.active];
    if (previous) {
      pauseClock(previous, mono, wall);
      applyIncrement(previous, data.increment);
    }
    data.active = Math.max(0, Math.min(data.timers.length - 1, index));
    const next = data.timers[data.active];
    if (next && !next.alarmed) {
      ctx.audio.unlock();
      startClock(next, mono, wall);
    }
    ctx.haptics.buzz('short');
    ctx.undo.push('handover');
  }

  function reset(index = 0): void {
    const clock = data.timers[index];
    if (!clock) return;
    ctx.undo.push('reset');
    resetClock(clock);
  }

  function resetAll(): void {
    ctx.undo.push('reset all');
    for (const clock of data.timers) resetClock(clock);
    data.active = 0;
    syncWake();
  }

  function startAll(): void {
    ctx.audio.unlock();
    ctx.undo.push('start all');
    const mono = ctx.clock.now();
    const wall = ctx.clock.wall();
    if (data.mode === 'chess' || data.mode === 'sequence') {
      const clock = data.timers[data.active];
      if (clock) startClock(clock, mono, wall);
      syncWake();
      return;
    }
    for (const clock of data.timers) startClock(clock, mono, wall);
    syncWake();
  }

  function pauseAll(): void {
    ctx.undo.push('pause all');
    const mono = ctx.clock.now();
    const wall = ctx.clock.wall();
    for (const clock of data.timers) pauseClock(clock, mono, wall);
    syncWake();
  }

  function flip(index = 0): void {
    const clock = data.timers[index];
    if (!clock) return;
    ctx.audio.unlock();
    flipClock(clock, ctx.clock.now(), ctx.clock.wall());
    ctx.undo.push('flip', 'timer-flip');
  }

  function shift(index: number, delta: number): void {
    const clock = data.timers[index];
    if (!clock) return;
    ctx.undo.push('adjust', 'timer-shift');
    shiftDuration(clock, delta);
  }

  function setDuration(index: number, ms: number): void {
    const clock = data.timers[index];
    if (!clock) return;
    ctx.undo.push('set duration', 'timer-duration');
    clock.duration = clampDuration(ms);
    if (!clock.running) {
      clock.elapsed = 0;
      clock.alarmed = false;
      clock.marks = { m60: false, m30: false };
    }
  }

  function addTimer(): void {
    if (data.timers.length >= 12) {
      ctx.toast('Twelve timers is the limit');
      return;
    }
    ctx.undo.push('add timer');
    const index = data.timers.length;
    data.timers.push(
      newClock({
        id: `t${index + 1}-${Date.now().toString(36)}`,
        name: playerNames[index] ?? `Timer ${index + 1}`,
        color: COLORS[index % COLORS.length],
        duration: data.mode === 'interval' ? data.interval : data.timers[0]?.duration ?? 300000,
        delay: data.delay,
      }),
    );
  }

  function removeTimer(index: number): void {
    if (data.timers.length <= 1) {
      ctx.toast('At least one timer stays');
      return;
    }
    ctx.undo.push('remove timer');
    data.timers.splice(index, 1);
    data.active = Math.max(0, Math.min(data.active, data.timers.length - 1));
  }

  function renameTimer(index: number, name: string): void {
    const clock = data.timers[index];
    if (!clock) return;
    ctx.undo.push('rename timer');
    clock.name = name.trim() || clock.name;
  }

  function goToPhase(index: number, autostart = true): void {
    const mono = ctx.clock.now();
    const wall = ctx.clock.wall();
    for (const clock of data.timers) pauseClock(clock, mono, wall);
    data.active = Math.max(0, Math.min(data.timers.length - 1, index));
    const target = data.timers[data.active];
    if (!target) return;
    target.elapsed = 0;
    target.alarmed = false;
    target.marks = { m60: false, m30: false };
    if (autostart) {
      ctx.audio.unlock();
      startClock(target, mono, wall);
    }
  }

  function tick(mono: number, wall: number): void {
    for (let index = 0; index < data.timers.length; index += 1) {
      const clock = data.timers[index];
      if (!clock.running) continue;
      if (data.mode === 'up') continue;

      if (data.mode === 'interval') {
        const remaining = remainingAt(clock, mono, wall);
        if (remaining <= 0) {
          clock.laps.push(wall);
          clock.elapsed = 0;
          clock.startWall = wall;
          clock.startMono = mono;
          cue();
          announce(`${clock.name}: interval ${clock.laps.length}`);
          if (data.maxRepeats > 0 && clock.laps.length >= data.maxRepeats) {
            pauseClock(clock, mono, wall);
            clock.alarmed = true;
          }
        }
        continue;
      }

      const remaining = remainingAt(clock, mono, wall);
      const mark = pendingMark(clock, remaining);
      if (mark) {
        clock.marks[mark] = true;
        if (remaining <= 30000) announce(`${clock.name}: ${Math.ceil(remaining / 1000)} seconds left`);
        else announce(`${clock.name}: one minute left`);
      }

      if (remaining > 0) continue;
      if (clock.alarmed) continue;
      clock.alarmed = true;
      pauseClock(clock, mono, wall);
      clock.elapsed = clock.duration;
      cue();
      announceTimer(clock);
      if (data.mode === 'sequence' && index === data.active) {
        const next = index + 1;
        if (next < data.timers.length) {
          goToPhase(next, true);
        } else {
          data.active = index;
        }
      }
      if (data.mode === 'chess') {
        data.active = index;
      }
    }
    syncWake();
  }

  function applySettings(patch: Partial<TimerState>): void {
    ctx.undo.push('settings');
    if (patch.mode && patch.mode !== data.mode) {
      data.mode = patch.mode;
      for (const clock of data.timers) {
        resetClock(clock);
        clock.delay = data.delay;
        if (patch.mode === 'interval' && data.interval) clock.duration = clampDuration(data.interval);
      }
      data.active = 0;
    }
    if (patch.layout) data.layout = patch.layout;
    if (patch.perPlayer !== undefined) data.perPlayer = patch.perPlayer;
    if (patch.warnAt !== undefined) data.warnAt = Math.max(0, patch.warnAt);
    if (patch.sound) data.sound = patch.sound;
    if (patch.haptic) data.haptic = patch.haptic;
    if (patch.increment !== undefined) data.increment = Math.max(0, patch.increment);
    if (patch.delay !== undefined) {
      data.delay = Math.max(0, patch.delay);
      for (const clock of data.timers) clock.delay = data.delay;
    }
    if (patch.interval !== undefined) data.interval = Math.max(1000, patch.interval);
    if (patch.maxRepeats !== undefined) data.maxRepeats = Math.max(0, patch.maxRepeats);
  }

  function usePlayers(): void {
    const players = ctx.session.players();
    if (!players.length) {
      ctx.toast('Add players in the session first');
      return;
    }
    ctx.undo.push('use players');
    data.timers = players.slice(0, 12).map((player, index) =>
      newClock({
        id: `t${index + 1}`,
        name: player.name,
        color: player.color ?? COLORS[index % COLORS.length],
        duration: data.timers[0]?.duration ?? 300000,
        delay: data.delay,
      }),
    );
    data.perPlayer = true;
    data.active = 0;
  }

  function clockLabel(index: number, mono: number, wall: number): string {
    const clock = data.timers[index];
    if (!clock) return '0:00';
    return formatClock(displayMs(clock, mono, wall, data.mode), data.mode === 'interval' || data.mode === 'chess');
  }

  const instance: TimerInstance = {
    data,
    state: () => JSON.parse(JSON.stringify(data)) as TimerState,
    load(state) {
      if (!state || typeof state !== 'object') return;
      const raw = state as Partial<TimerState>;
      if (raw.mode && typeof raw.mode === 'string') data.mode = raw.mode as TimerMode;
      if (raw.layout === 'single' || raw.layout === 'grid' || raw.layout === 'list') data.layout = raw.layout;
      if (typeof raw.perPlayer === 'boolean') data.perPlayer = raw.perPlayer;
      if (typeof raw.warnAt === 'number') data.warnAt = raw.warnAt;
      if (raw.sound) data.sound = raw.sound;
      if (raw.haptic) data.haptic = raw.haptic;
      if (typeof raw.increment === 'number') data.increment = raw.increment;
      if (typeof raw.delay === 'number') data.delay = raw.delay;
      if (typeof raw.interval === 'number') data.interval = raw.interval;
      if (typeof raw.maxRepeats === 'number') data.maxRepeats = raw.maxRepeats;
      if (typeof raw.autoStart === 'boolean') data.autoStart = raw.autoStart;
      if (Array.isArray(raw.timers) && raw.timers.length) {
        data.timers = raw.timers.map((clock, index) => restoreClock(clock, index));
      }
      data.active = Math.max(0, Math.min(Number(raw.active) || 0, data.timers.length - 1));
    },
    presetFromState() {
      const first = data.timers[0];
      const phases: Record<string, string> = {};
      if (data.mode === 'sequence') {
        for (const clock of data.timers) phases[clock.name] = formatDurationText(clock.duration);
      }
      return {
        mode: data.mode,
        duration: formatDurationText(first?.duration ?? 300000),
        'per-player': data.perPlayer,
        players: data.timers.length,
        layout: data.layout,
        'warn-at': formatDurationText(data.warnAt),
        sound: data.sound,
        haptic: data.haptic,
        increment: formatDurationText(data.increment),
        delay: formatDurationText(data.delay),
        interval: formatDurationText(data.interval),
        count: data.maxRepeats,
        phases,
        start: data.autoStart ? 'auto' : 'manual',
      };
    },
    commands: {
      start: (arg) => start(Number(arg ?? 0) || 0),
      pause: (arg) => pause(Number(arg ?? 0) || 0),
      reset: (arg) => reset(Number(arg ?? 0) || 0),
      flip: (arg) => flip(Number(arg ?? 0) || 0),
      next: () => goToPhase(data.active + 1, true),
      add: () => {
        const ms = parseDuration('1m');
        if (ms) setDuration(0, ms);
      },
    },
    summary() {
      const mono = ctx.clock.now();
      const wall = ctx.clock.wall();
      const lines = data.timers.map((clock, index) => {
        const shown = clockLabel(index, mono, wall);
        const state = clock.running ? 'running' : clock.elapsed > 0 ? 'paused' : 'ready';
        return `${clock.name}: ${shown} (${state}${clock.laps.length ? `, ${clock.laps.length} intervals` : ''})`;
      });
      return lines.join('\n');
    },
    toggle,
    start,
    pause,
    reset,
    resetAll,
    startAll,
    pauseAll,
    flip,
    shift,
    setDuration,
    addTimer,
    removeTimer,
    renameTimer,
    handover,
    goToPhase,
    tick,
    applySettings,
    usePlayers,
    clockLabel,
    dispose() {
      if (wakeHeld) {
        wakeHeld = false;
        wake.release();
      }
    },
  };

  if (data.autoStart) startAll();

  return instance;
}

export default { ...meta, preset, component: Timer, create };
