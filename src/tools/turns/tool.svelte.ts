import type { ToolContext } from '../../core/registry';
import type { PresetValues } from '../../core/template/schema';
import { wake } from '../../core/wake';
import {
  advance,
  currentName,
  currentPhase,
  jumpTo,
  normaliseOrder,
  normalisePhases,
  remainingMs,
  rewind,
  type TurnsInstance,
  type TurnsState,
} from './logic';
import Turns from './Turns.svelte';
import meta from './meta';
import preset from './preset';

function create(ctx: ToolContext, values: PresetValues = {}): TurnsInstance {
  const presetOrder = Array.isArray(values.order) ? (values.order as string[]) : [];
  const sessionNames = ctx.session.players().map((player) => player.name);
  const order = normaliseOrder(presetOrder.length ? presetOrder : sessionNames);
  const presetPhases = normalisePhases(Array.isArray(values.phases) ? (values.phases as string[]) : []);
  const phases = presetPhases.length ? presetPhases : ['Turn'];
  const duration = Math.max(0, Number(values.timer ?? 0));

  const data = $state<TurnsState>({
    order,
    index: 0,
    round: 1,
    phases,
    phase: 0,
    timer: { duration, remaining: duration, running: false, startedWall: 0, startedMono: 0 },
    pass: values.pass !== false,
    autoStart: values['auto-start'] === true,
    log: [],
  });

  let stopTicker: (() => void) | null = null;
  let wakeHeld = false;

  function log(text: string): void {
    data.log = [{ at: Date.now(), text }, ...data.log].slice(0, 40);
  }

  function holdWake(): void {
    if (wakeHeld) return;
    wakeHeld = true;
    wake.retain();
  }

  function dropWake(): void {
    if (!wakeHeld) return;
    wakeHeld = false;
    wake.release();
  }

  function stopTimer(): void {
    data.timer.running = false;
    data.timer.remaining = remainingMs(data, ctx.clock.wall(), ctx.clock.now());
    stopTicker?.();
    stopTicker = null;
    dropWake();
  }

  function tick(): void {
    if (!data.timer.running) return;
    const left = remainingMs(data, ctx.clock.wall(), ctx.clock.now());
    data.timer.remaining = left;
    if (left > 0) return;
    stopTimer();
    log(`${currentName(data)} ran out of time`);
    ctx.audio.play('bell');
    ctx.haptics.buzz('long');
    ctx.toast(`Time is up for ${currentName(data)}`);
  }

  function beginTimer(pushUndo: boolean): void {
    if (data.timer.duration <= 0) return;
    if (pushUndo) ctx.undo.push('start turn clock');
    if (data.timer.remaining <= 0) data.timer.remaining = data.timer.duration;
    data.timer.startedWall = ctx.clock.wall();
    data.timer.startedMono = ctx.clock.now();
    data.timer.running = true;
    if (!stopTicker) stopTicker = ctx.clock.subscribe(tick);
    holdWake();
  }

  const instance: TurnsInstance = {
    data,
    state: () => JSON.parse(JSON.stringify(data)) as TurnsState,
    load(state) {
      if (!state || typeof state !== 'object') return;
      // Drop any ticker and wake lock from the state being replaced; the saved
      // state decides whether a new one is needed.
      stopTicker?.();
      stopTicker = null;
      dropWake();
      const raw = state as Partial<TurnsState>;
      if (Array.isArray(raw.order)) {
        const next = normaliseOrder(raw.order.filter((name) => typeof name === 'string'));
        if (next.length) data.order = next;
      }
      if (Array.isArray(raw.phases)) {
        const next = normalisePhases(raw.phases.filter((phase) => typeof phase === 'string'));
        if (next.length) data.phases = next;
      }
      if (typeof raw.round === 'number') data.round = Math.max(1, Math.round(raw.round));
      if (typeof raw.index === 'number') data.index = Math.max(0, Math.min(data.order.length - 1, Math.round(raw.index)));
      if (typeof raw.phase === 'number') data.phase = Math.max(0, Math.min(data.phases.length - 1, Math.round(raw.phase)));
      if (typeof raw.pass === 'boolean') data.pass = raw.pass;
      if (typeof raw.autoStart === 'boolean') data.autoStart = raw.autoStart;
      if (Array.isArray(raw.log)) {
        data.log = raw.log
          .filter((entry) => entry && typeof entry.text === 'string')
          .slice(0, 40)
          .map((entry) => ({ at: Number(entry.at) || 0, text: entry.text }));
      }
      if (raw.timer && typeof raw.timer === 'object') {
        const saved = raw.timer as Partial<TurnsState['timer']>;
        const savedDuration = Math.max(0, Number(saved.duration) || 0);
        data.timer.duration = savedDuration;
        data.timer.remaining = Math.max(0, Math.min(savedDuration, Number(saved.remaining) || 0));
        data.timer.startedWall = Number(saved.startedWall) || 0;
        data.timer.startedMono = Number(saved.startedMono) || 0;
        data.timer.running = !!saved.running && savedDuration > 0;
      }
      if (data.timer.running) {
        const left = remainingMs(data, ctx.clock.wall(), ctx.clock.now());
        data.timer.remaining = left;
        if (left <= 0) {
          data.timer.running = false;
        } else {
          data.timer.startedWall = ctx.clock.wall();
          data.timer.startedMono = ctx.clock.now();
          if (!stopTicker) stopTicker = ctx.clock.subscribe(tick);
          holdWake();
        }
      }
    },
    presetFromState() {
      return {
        order: data.order.slice(),
        phases: data.phases.slice(),
        timer: data.timer.duration,
        pass: data.pass,
        'auto-start': data.autoStart,
      };
    },
    commands: {
      next: () => instance.next(),
      previous: () => instance.previous(),
      phase: (arg) => instance.setPhase(Number(arg ?? 0) || 0),
      start: () => instance.startTimer(),
      pause: () => instance.pauseTimer(),
    },
    summary() {
      const lines = [
        `Round ${data.round} · ${currentPhase(data)}`,
        `Turn: ${currentName(data)}`,
        `Order: ${data.order.join(' → ')}`,
      ];
      if (data.timer.duration) {
        lines.push(`Clock: ${Math.ceil(data.timer.remaining / 1000)}s left${data.timer.running ? ' (running)' : ''}`);
      }
      return lines.join('\n');
    },
    next() {
      ctx.undo.push('next turn');
      advance(data);
      stopTimer();
      data.timer.remaining = data.timer.duration;
      log(`Round ${data.round} · ${currentName(data)}`);
      ctx.haptics.buzz('short');
      // With a pass cover up, the clock waits until the next player taps in.
      if (data.autoStart && data.timer.duration > 0 && !data.pass) beginTimer(false);
    },
    previous() {
      if (data.index === 0 && data.round <= 1) return;
      ctx.undo.push('previous turn');
      rewind(data);
      stopTimer();
      data.timer.remaining = data.timer.duration;
    },
    goTo(index) {
      const next = Math.max(0, Math.min(data.order.length - 1, Math.round(index)));
      if (next === data.index) return;
      ctx.undo.push('jump turn');
      jumpTo(data, next);
      stopTimer();
      data.timer.remaining = data.timer.duration;
      log(`Round ${data.round} · ${currentName(data)}`);
      ctx.haptics.buzz('short');
    },
    setPhase(index) {
      const next = Math.max(0, Math.min(data.phases.length - 1, Math.round(index)));
      if (next === data.phase) return;
      ctx.undo.push('phase');
      data.phase = next;
      log(`Phase: ${currentPhase(data)}`);
    },
    setOrder(names) {
      const next = normaliseOrder(names);
      if (next.join('|') === data.order.join('|')) return;
      ctx.undo.push('turn order');
      data.order = next;
      data.index = 0;
      data.round = 1;
    },
    syncPlayers() {
      const names = ctx.session.players().map((player) => player.name);
      if (!names.length) {
        ctx.toast('No players in the session yet');
        return;
      }
      instance.setOrder(names);
    },
    setPass(value) {
      if (data.pass === value) return;
      ctx.undo.push('pass-the-phone');
      data.pass = value;
    },
    setAutoStart(value) {
      if (data.autoStart === value) return;
      ctx.undo.push('auto start');
      data.autoStart = value;
    },
    setDuration(ms) {
      const next = Math.max(0, Math.round(Number.isFinite(ms) ? ms : 0));
      if (next === data.timer.duration) return;
      ctx.undo.push('turn timer');
      data.timer.duration = next;
      if (!data.timer.running) data.timer.remaining = next;
    },
    setPhases(next) {
      const clean = normalisePhases(next);
      const phasesNext = clean.length ? clean : ['Turn'];
      if (phasesNext.join('|') === data.phases.join('|')) return;
      ctx.undo.push('phases');
      data.phases = phasesNext;
      data.phase = Math.min(data.phase, phasesNext.length - 1);
    },
    startTimer() {
      if (data.timer.running) return;
      if (data.timer.duration <= 0) {
        ctx.toast('Set a turn timer first');
        return;
      }
      beginTimer(true);
    },
    pauseTimer() {
      if (!data.timer.running) return;
      ctx.undo.push('pause turn clock');
      stopTimer();
    },
    resetTimer() {
      if (!data.timer.running && data.timer.remaining === data.timer.duration) return;
      ctx.undo.push('reset turn clock');
      stopTimer();
      data.timer.remaining = data.timer.duration;
    },
    resetTurn() {
      ctx.undo.push('new turn round');
      stopTimer();
      data.index = 0;
      data.round = 1;
      data.phase = 0;
      data.timer.remaining = data.timer.duration;
      data.log = [];
    },
    clearLog() {
      if (!data.log.length) return;
      ctx.undo.push('clear turn log');
      data.log = [];
    },
    dispose() {
      stopTicker?.();
      stopTicker = null;
      dropWake();
    },
  };

  if (data.timer.running) beginTimer(false);

  return instance;
}

export default { ...meta, preset, component: Turns, create };
