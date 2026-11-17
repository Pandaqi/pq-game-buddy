/** Ordered game flow: say, wait, reveal, timer and note steps. No Svelte here. */

import { translate } from '../../core/i18n';
import { parseDuration } from '../../core/template/schema';

export interface ScriptStep {
  verb: string;
  arg: string;
}

export const SCRIPT_VERBS = ['say', 'wait', 'reveal', 'timer', 'note'] as const;

/** One locale key per verb; the words themselves live in the tool's locale files. */
export const VERB_KEYS: Record<string, string> = {
  say: 'script.step-say',
  wait: 'script.step-wait',
  reveal: 'script.step-reveal',
  timer: 'script.step-timer',
  note: 'script.step-note',
};

/** Turn "say: text" lines into steps; unknown verbs are kept so they can be fixed. */
export function parseSteps(lines: string[]): ScriptStep[] {
  const out: ScriptStep[] = [];
  for (const line of lines) {
    const text = String(line ?? '').trim();
    if (!text) continue;
    const match = text.match(/^([a-zA-Z]+)\s*:\s*([\s\S]*)$/);
    if (!match) {
      out.push({ verb: 'say', arg: text });
      continue;
    }
    out.push({ verb: match[1].toLowerCase(), arg: match[2].trim() });
  }
  return out;
}

export function waitFor(arg: string): number {
  return parseDuration(arg) ?? 0;
}

/** `clock start` means instance "clock", command "start". */
export function splitCommand(arg: string): { target: string; command: string } {
  const parts = String(arg ?? '').trim().split(/\s+/);
  return { target: parts[0] ?? '', command: parts[1] ?? '' };
}

export function stepLabel(step: ScriptStep | undefined): string {
  if (!step) return translate('script.step-end');
  const key = VERB_KEYS[step.verb];
  return key ? translate(key) : translate('script.step-unknown', { verb: step.verb });
}

export interface ScriptState {
  steps: ScriptStep[];
  index: number;
  /** Wall-clock time a `wait` step ends; null otherwise. */
  waitUntil: number | null;
  paused: boolean;
  /** Milliseconds left when a wait was paused. */
  pausedRemaining: number;
  autoAdvance: boolean;
  /** Read `say` steps aloud when the device has a voice. */
  voice: boolean;
  eventDeck: boolean;
  deck: string[];
  drawn: string[];
  lastCard: string;
  log: string[];
}

export function progressOf(state: ScriptState): { done: number; total: number; percent: number } {
  const total = state.steps.length;
  const done = Math.min(state.index, total);
  return { done, total, percent: total ? Math.round((done / total) * 100) : 0 };
}

export function summaryOf(state: ScriptState): string {
  const lines = [
    translate('script.summary-step', {
      index: Math.min(state.index + 1, state.steps.length),
      total: state.steps.length,
    }),
  ];
  const step = state.steps[state.index];
  if (step) lines.push(translate('script.summary-verb', { verb: step.verb, arg: step.arg }));
  for (const card of state.drawn) lines.push(translate('script.summary-drawn', { card }));
  return lines.join('\n');
}
