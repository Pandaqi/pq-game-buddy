/** Ordered game flow: say, wait, reveal, timer and note steps. No Svelte here. */

import { parseDuration } from '../../core/template/schema';

export interface ScriptStep {
  verb: string;
  arg: string;
}

export const SCRIPT_VERBS = ['say', 'wait', 'reveal', 'timer', 'note'] as const;

export const VERB_HINTS: Record<string, string> = {
  say: 'Read this out loud',
  wait: 'Hold the table for a moment',
  reveal: 'Hand the phone over for a secret',
  timer: 'Controls another tool',
  note: 'Host note, not read aloud',
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
  if (!step) return 'End of the script';
  return VERB_HINTS[step.verb] ?? `Unknown step "${step.verb}"`;
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
  const lines = [`Step ${Math.min(state.index + 1, state.steps.length)} of ${state.steps.length}`];
  const step = state.steps[state.index];
  if (step) lines.push(`${step.verb}: ${step.arg}`);
  for (const card of state.drawn) lines.push(`Drawn: ${card}`);
  return lines.join('\n');
}
