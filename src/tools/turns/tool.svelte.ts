import { language, registerToolStrings, seatName, t as translate } from '../../core/i18n.svelte';
import type { ToolContext } from '../../core/registry';
import { seatKey, toolSeats } from '../../core/session';
import type { PresetValues } from '../../core/template/schema';
import { wake } from '../../core/wake';
import {
  advance,
  advanceInitiative,
  currentName,
  currentPhase,
  initiativeFromPreset,
  initiativeRanking,
  jumpTo,
  newInitiativeRound,
  normaliseInitiative,
  normaliseOrder,
  normalisePhases,
  remainingMs,
  seatList,
  rewind,
  rewindInitiative,
  type TurnsInstance,
  type TurnsMode,
  type TurnsState,
} from './logic';
import Turns from './Turns.svelte';
import meta from './meta';
import preset from './preset';
import en from './locales/en';

// A tool's words travel with its chunk; the shell only knows its title.
registerToolStrings('turns', en);

function create(ctx: ToolContext, values: PresetValues = {}): TurnsInstance {
  const presetOrder = Array.isArray(values.order) ? (values.order as string[]) : [];
  // A template's blank entry and an empty table both become generated seats, so
  // the order is said in whichever language is active when it is shown.
  const order = presetOrder.length ? normaliseOrder(presetOrder) : toolSeats(ctx.session.players(), 2);
  const presetPhases = normalisePhases(Array.isArray(values.phases) ? (values.phases as string[]) : []);
  const phases = presetPhases.length ? presetPhases : [translate('turns.default-phase')];
  const duration = Math.max(0, Number(values.timer ?? 0));
  const mode: TurnsMode = values.mode === 'initiative' ? 'initiative' : 'order';

  const data = $state<TurnsState>({
    order,
    index: 0,
    round: 1,
    phases,
    phase: 0,
    timer: { duration, remaining: duration, running: false, startedWall: 0, startedMono: 0 },
    pass: values.pass !== false,
    autoStart: values['auto-start'] === true,
    mode,
    initiative: initiativeFromPreset(values.initiative, order),
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
    log(`${currentName(data, language())} ran out of time`);
    ctx.audio.play('bell');
    ctx.haptics.buzz('long');
    ctx.toast(translate('turns.toast-time-up', { name: currentName(data, language()) }));
  }

  function beginTimer(pushUndo: boolean): void {
    if (data.timer.duration <= 0) return;
    if (pushUndo) ctx.undo.push(translate('turns.undo-clock-start'));
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
        // Older saves hold plain names; a pair keeps its seat.
        data.order = seatList(raw.order);
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
      if (raw.mode === 'order' || raw.mode === 'initiative') data.mode = raw.mode;
      data.initiative = normaliseInitiative(raw.initiative, data.order.length);
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
      const initiative: Record<string, number> = {};
      data.order.forEach((seat, index) => {
        initiative[seatKey(seat)] = data.initiative[index] ?? 0;
      });
      return {
        // Only a typed name travels: a generated seat is blank, so the template
        // makes the same seat again instead of freezing one language's words.
        order: data.order.map((seat) => seat.name),
        phases: data.phases.slice(),
        timer: data.timer.duration,
        pass: data.pass,
        'auto-start': data.autoStart,
        mode: data.mode,
        initiative,
      };
    },
    commands: {
      next: () => instance.next(),
      previous: () => instance.previous(),
      phase: (arg) => instance.setPhase(Number(arg ?? 0) || 0),
      start: () => instance.startTimer(),
      pause: () => instance.pauseTimer(),
      round: () => instance.newInitiativeRound(),
    },
    summary() {
      const lines = [
        translate('turns.summary-round', { round: data.round, phase: currentPhase(data) }),
        translate('turns.summary-turn', { name: currentName(data, language()) }),
      ];
      if (data.mode === 'initiative') {
        const ranking = initiativeRanking(data);
        lines.push(
          translate('turns.summary-initiative', {
            order: ranking
              .map((seat) => `${seatName(data.order[seat]?.seat, data.order[seat]?.name ?? '')} ${data.initiative[seat] ?? 0}`)
              .join(' → '),
          }),
        );
      } else {
        lines.push(
          translate('turns.summary-order', {
            order: data.order.map((seat) => seatName(seat.seat, seat.name)).join(' → '),
          }),
        );
      }
      if (data.timer.duration) {
        const seconds = Math.ceil(data.timer.remaining / 1000);
        lines.push(
          translate(data.timer.running ? 'turns.summary-clock-running' : 'turns.summary-clock', { seconds }),
        );
      }
      return lines.join('\n');
    },
    next() {
      ctx.undo.push(translate('turns.undo-next'));
      if (data.mode === 'initiative') advanceInitiative(data);
      else advance(data);
      stopTimer();
      data.timer.remaining = data.timer.duration;
      log(`Round ${data.round} · ${currentName(data, language())}`);
      ctx.haptics.buzz('short');
      // With a pass cover up, the clock waits until the next player taps in.
      if (data.autoStart && data.timer.duration > 0 && !data.pass) beginTimer(false);
    },
    previous() {
      if (data.mode === 'initiative') {
        const ranking = initiativeRanking(data);
        if (ranking.indexOf(data.index) === 0 && data.round <= 1) return;
        ctx.undo.push(translate('turns.undo-previous'));
        rewindInitiative(data);
        stopTimer();
        data.timer.remaining = data.timer.duration;
        return;
      }
      if (data.index === 0 && data.round <= 1) return;
      ctx.undo.push(translate('turns.undo-previous'));
      rewind(data);
      stopTimer();
      data.timer.remaining = data.timer.duration;
    },
    goTo(index) {
      const next = Math.max(0, Math.min(data.order.length - 1, Math.round(index)));
      if (next === data.index) return;
      ctx.undo.push(translate('turns.undo-jump'));
      jumpTo(data, next);
      stopTimer();
      data.timer.remaining = data.timer.duration;
      log(`Round ${data.round} · ${currentName(data, language())}`);
      ctx.haptics.buzz('short');
    },
    setPhase(index) {
      const next = Math.max(0, Math.min(data.phases.length - 1, Math.round(index)));
      if (next === data.phase) return;
      ctx.undo.push(translate('turns.undo-phase'));
      data.phase = next;
      log(`Phase: ${currentPhase(data)}`);
    },
    setOrder(seats) {
      // A text edit keeps a generated seat when its shown label was left alone,
      // so opening the settings and saving does not turn labels into names.
      const kept = seats.map((raw, index) => {
        const current = data.order[index];
        if (current && typeof raw === 'string' && raw.trim() === seatName(current.seat, current.name)) return current;
        return raw;
      });
      const next = normaliseOrder(kept);
      if (JSON.stringify(next) === JSON.stringify(data.order)) return;
      ctx.undo.push(translate('turns.undo-order'));
      data.order = next;
      data.initiative = normaliseInitiative([], next.length);
      data.index = 0;
      data.round = 1;
    },
    setMode(next) {
      const modeNext: TurnsMode = next === 'initiative' ? 'initiative' : 'order';
      if (modeNext === data.mode) return;
      ctx.undo.push(translate('turns.undo-style'));
      data.mode = modeNext;
      data.initiative = normaliseInitiative(data.initiative, data.order.length);
      data.index = 0;
      data.phase = 0;
    },
    setInitiative(index, value) {
      const seat = Math.max(0, Math.min(data.order.length - 1, Math.round(index)));
      const next = Math.max(-99, Math.min(999, Math.round(Number.isFinite(value) ? value : 0)));
      if ((data.initiative[seat] ?? 0) === next) return;
      ctx.undo.push(translate('turns.undo-initiative'), `initiative:${seat}`);
      const copy = data.order.map((_, at) => data.initiative[at] ?? 0);
      copy[seat] = next;
      data.initiative = copy;
    },
    newInitiativeRound() {
      ctx.undo.push(translate('turns.undo-new-initiative'));
      newInitiativeRound(data);
      stopTimer();
      data.timer.remaining = data.timer.duration;
      log(`Round ${data.round} · initiative reset`);
    },
    syncPlayers() {
      const players = ctx.session.players();
      if (!players.length) {
        ctx.toast(translate('turns.toast-no-players'));
        return;
      }
      instance.setOrder(toolSeats(players, 2));
    },
    setPass(value) {
      if (data.pass === value) return;
      ctx.undo.push(translate('turns.undo-pass'));
      data.pass = value;
    },
    setAutoStart(value) {
      if (data.autoStart === value) return;
      ctx.undo.push(translate('turns.undo-auto-start'));
      data.autoStart = value;
    },
    setDuration(ms) {
      const next = Math.max(0, Math.round(Number.isFinite(ms) ? ms : 0));
      if (next === data.timer.duration) return;
      ctx.undo.push(translate('turns.undo-timer'));
      data.timer.duration = next;
      if (!data.timer.running) data.timer.remaining = next;
    },
    setPhases(next) {
      const clean = normalisePhases(next);
      const phasesNext = clean.length ? clean : [translate('turns.default-phase')];
      if (phasesNext.join('|') === data.phases.join('|')) return;
      ctx.undo.push(translate('turns.undo-phases'));
      data.phases = phasesNext;
      data.phase = Math.min(data.phase, phasesNext.length - 1);
    },
    startTimer() {
      if (data.timer.running) return;
      if (data.timer.duration <= 0) {
        ctx.toast(translate('turns.toast-set-timer'));
        return;
      }
      beginTimer(true);
    },
    pauseTimer() {
      if (!data.timer.running) return;
      ctx.undo.push(translate('turns.undo-pause'));
      stopTimer();
    },
    resetTimer() {
      if (!data.timer.running && data.timer.remaining === data.timer.duration) return;
      ctx.undo.push(translate('turns.undo-reset'));
      stopTimer();
      data.timer.remaining = data.timer.duration;
    },
    resetTurn() {
      ctx.undo.push(translate('turns.undo-new-round'));
      stopTimer();
      data.index = 0;
      data.round = 1;
      data.phase = 0;
      data.timer.remaining = data.timer.duration;
      data.log = [];
    },
    clearLog() {
      if (!data.log.length) return;
      ctx.undo.push(translate('turns.undo-clear-log'));
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
