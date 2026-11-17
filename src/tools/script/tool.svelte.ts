import { registerToolStrings, t as translate } from '../../core/i18n.svelte';
import type { ToolContext, ToolInstance } from '../../core/registry';
import type { PresetValues } from '../../core/template/schema';
import {
  parseSteps,
  progressOf,
  splitCommand,
  summaryOf,
  waitFor,
  type ScriptState,
  type ScriptStep,
} from './logic';
import Script from './Script.svelte';
import en from './locales/en';

// A tool's words travel with its chunk; the shell only knows its title.
registerToolStrings('script', en);
import meta from './meta';
import preset from './preset';

export interface ScriptActions {
  next(): void;
  back(): void;
  restart(): void;
  togglePause(): void;
  setAutoAdvance(value: boolean): void;
  setVoice(value: boolean): void;
  drawCard(): void;
  reshuffle(): void;
  setSteps(text: string): void;
  remaining(): number;
}

export type ScriptInstance = ToolInstance<ScriptState> & ScriptActions;

function create(ctx: ToolContext, values: PresetValues = {}): ScriptInstance {
  const steps = parseSteps((Array.isArray(values.steps) ? (values.steps as string[]) : []).map(String));
  const events = (Array.isArray(values.events) ? (values.events as string[]) : []).map(String);

  const data = $state<ScriptState>({
    steps,
    index: 0,
    waitUntil: null,
    paused: false,
    pausedRemaining: 0,
    autoAdvance: !!values['auto-advance'],
    voice: !!values.voice,
    eventDeck: !!values['event-deck'],
    deck: ctx.rng.shuffle(events),
    drawn: [],
    lastCard: '',
    log: [],
  });

  function note(text: string): void {
    data.log = [text, ...data.log].slice(0, 12);
  }

  /** The Web Speech API is optional and never fetched: no voice simply means text only. */
  function canSpeak(): boolean {
    return (
      typeof window !== 'undefined' &&
      'speechSynthesis' in window &&
      typeof SpeechSynthesisUtterance !== 'undefined'
    );
  }

  function stopVoice(): void {
    if (!canSpeak()) return;
    try {
      window.speechSynthesis.cancel();
    } catch {
      /* a cancelled or absent voice is not an error */
    }
  }

  function speak(text: string): void {
    if (!data.voice || !text.trim() || !canSpeak()) return;
    try {
      const synth = window.speechSynthesis;
      synth.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.lang = typeof document === 'undefined' ? 'en' : document.documentElement.lang || 'en';
      synth.speak(utterance);
    } catch {
      /* the text is already on screen; a failed voice is not worth a warning */
    }
  }

  function callExternal(arg: string): void {
    const { target, command } = splitCommand(arg);
    if (!target) return;
    const instance = ctx.session.instance(target);
    if (!instance) {
      ctx.toast(translate('script.toast-not-in-game', { tool: target }), 'error');
      return;
    }
    const commands = instance.commands ?? {};
    const chosen = command && commands[command] ? command : !command && commands.deal ? 'deal' : '';
    if (chosen) {
      commands[chosen]?.();
      note(`${target}: ${chosen}`);
      return;
    }
    ctx.toast(translate('script.toast-open-tool', { tool: target }));
  }

  function begin(index: number, run = true): void {
    data.index = Math.max(0, index);
    data.waitUntil = null;
    data.paused = false;
    stopVoice();
    const step: ScriptStep | undefined = data.steps[data.index];
    if (!step) return;
    if (step.verb === 'wait') {
      data.waitUntil = ctx.clock.wall() + waitFor(step.arg);
      return;
    }
    if (run && (step.verb === 'timer' || step.verb === 'reveal')) callExternal(step.arg);
    if (run && step.verb === 'say') speak(step.arg);
  }

  function remaining(): number {
    if (!data.waitUntil) return 0;
    return Math.max(0, data.waitUntil - ctx.clock.wall());
  }

  const instance: ScriptInstance = {
    data,
    state: () => JSON.parse(JSON.stringify(data)) as ScriptState,
    load(state) {
      if (!state || typeof state !== 'object') return;
      const raw = state as Partial<ScriptState>;
      if (Array.isArray(raw.steps)) {
        data.steps = raw.steps
          .filter((step) => step && typeof step.verb === 'string')
          .map((step) => ({ verb: step.verb, arg: String(step.arg ?? '') }));
      }
      if (typeof raw.index === 'number') data.index = Math.max(0, Math.min(raw.index, data.steps.length));
      data.waitUntil = null;
      data.paused = false;
      data.pausedRemaining = 0;
      if (typeof raw.lastCard === 'string') data.lastCard = raw.lastCard;
      if (typeof raw.autoAdvance === 'boolean') data.autoAdvance = raw.autoAdvance;
      if (typeof raw.voice === 'boolean') data.voice = raw.voice;
      if (typeof raw.eventDeck === 'boolean') data.eventDeck = raw.eventDeck;
      if (Array.isArray(raw.deck)) data.deck = raw.deck.map(String);
      if (Array.isArray(raw.drawn)) data.drawn = raw.drawn.map(String).slice(0, 20);
      if (Array.isArray(raw.log)) data.log = raw.log.map(String).slice(0, 12);
    },
    presetFromState() {
      return {
        steps: data.steps.map((step) => `${step.verb}: ${step.arg}`),
        events: data.deck.length ? data.deck : data.drawn,
        'event-deck': data.eventDeck,
        'auto-advance': data.autoAdvance,
        voice: data.voice,
      };
    },
    remaining,
    commands: {
      next: () => instance.next(),
      restart: () => instance.restart(),
      draw: () => instance.drawCard(),
      back: () => instance.back(),
    },
    summary: () => summaryOf(data),
    next() {
      const step = data.steps[data.index];
      if (!step) {
        ctx.toast(translate('script.toast-finished'));
        return;
      }
      if (data.waitUntil) {
        const left = remaining();
        if (left > 0 && !data.paused) {
          ctx.toast(translate('script.toast-left', { seconds: Math.ceil(left / 1000) }));
          return;
        }
      }
      if (data.index >= data.steps.length - 1) {
        note(translate('script.note-finished'));
        stopVoice();
        ctx.audio.play('success');
        data.index = data.steps.length;
        data.waitUntil = null;
        return;
      }
      ctx.undo.push(translate('script.undo-step'));
      begin(data.index + 1);
    },
    back() {
      if (data.index <= 0) return;
      ctx.undo.push(translate('script.undo-back'));
      begin(data.index - 1, false);
    },
    restart() {
      ctx.undo.push(translate('script.undo-restart'));
      data.drawn = [];
      data.log = [];
      begin(0);
    },
    togglePause() {
      if (!data.waitUntil) {
        ctx.toast(translate('script.toast-pause-wait'));
        return;
      }
      if (data.paused) {
        data.waitUntil = ctx.clock.wall() + (data.pausedRemaining ?? 0);
        data.paused = false;
        data.pausedRemaining = 0;
      } else {
        data.pausedRemaining = remaining();
        data.paused = true;
        data.waitUntil = null;
      }
    },
    setAutoAdvance(value) {
      ctx.undo.push(translate('script.undo-auto'));
      data.autoAdvance = value;
    },
    setVoice(value) {
      if (data.voice === value) return;
      ctx.undo.push(translate('script.undo-voice'));
      data.voice = value;
      if (!value) stopVoice();
      else if (data.steps[data.index]?.verb === 'say') speak(data.steps[data.index].arg);
    },
    drawCard() {
      if (!data.eventDeck && !data.deck.length) {
        ctx.toast(translate('script.toast-no-deck'));
        return;
      }
      if (!data.deck.length) {
        ctx.undo.push(translate('script.undo-reshuffle'));
        data.deck = ctx.rng.shuffle(data.drawn);
        data.drawn = [];
        if (!data.deck.length) {
          ctx.toast(translate('script.toast-deck-empty'), 'error');
          return;
        }
      }
      ctx.undo.push(translate('script.undo-draw'));
      const [card, ...rest] = data.deck;
      data.deck = rest;
      data.drawn = [card, ...data.drawn].slice(0, 20);
      data.lastCard = card;
      ctx.audio.play('click');
      ctx.haptics.buzz('short');
    },
    reshuffle() {
      ctx.undo.push(translate('script.undo-reshuffle-event'));
      data.deck = ctx.rng.shuffle([...data.deck, ...data.drawn]);
      data.drawn = [];
      data.lastCard = '';
    },
    setSteps(text) {
      const next = parseSteps(text.split('\n'));
      ctx.undo.push(translate('script.undo-steps'));
      data.steps = next;
      begin(Math.min(data.index, next.length));
    },
    dispose() {
      stopVoice();
    },
  };

  return instance;
}

export default { ...meta, preset, component: Script, create };
