/** Speedrun splits: targets, best times, deltas and gold splits. No Svelte here. */

import { translate } from '../../core/i18n';

export interface Split {
  name: string;
  /** Target or best time for this segment, in milliseconds. 0 means unset. */
  target: number;
}

export interface SplitsState {
  game: string;
  category: string;
  splits: Split[];
  /** Segment times of the personal best run. */
  pb: number[];
  /** Elapsed segment times of the current run. */
  run: number[];
  running: boolean;
  /** Monotonic timestamp of the last segment boundary. */
  lastAt: number;
  elapsed: number;
  attempts: number;
  golds: number[];
  /** Space splits, R resets. */
  keys: boolean;
}

export function totalOf(times: number[]): number {
  return times.reduce((sum, value) => sum + value, 0);
}

export function delta(time: number | undefined, best: number | undefined): number | null {
  if (time === undefined || best === undefined || best <= 0) return null;
  return time - best;
}

export function bestSegments(state: SplitsState): number[] {
  return state.splits.map((_, index) => {
    const candidates = [state.pb[index], state.golds[index]].filter((value): value is number => typeof value === 'number' && value > 0);
    return candidates.length ? Math.min(...candidates) : 0;
  });
}

export function sumOfBest(state: SplitsState): number {
  const best = bestSegments(state);
  return best.every((value) => value > 0) ? totalOf(best) : 0;
}

export function nextGold(state: SplitsState, index: number): number {
  const previous = state.golds[index] ?? 0;
  const current = state.run[index];
  if (current === undefined) return previous;
  if (previous > 0 && previous <= current) return previous;
  return current;
}

export function summaryOf(state: SplitsState): string {
  const lines: string[] = [`${state.game}${state.category ? ` — ${state.category}` : ''}`];
  state.splits.forEach((split, index) => {
    const time = state.run[index];
    const best = state.pb[index];
    const diff = delta(time, best);
    const shown = `${time === undefined ? '—' : `${(time / 1000).toFixed(2)}s`}${
      diff === null ? '' : ` (${diff >= 0 ? '+' : ''}${(diff / 1000).toFixed(2)})`
    }`;
    lines.push(translate('splits.summary-split', { name: split.name, time: shown }));
  });
  if (state.run.length) lines.push(translate('splits.summary-total', { time: (totalOf(state.run) / 1000).toFixed(2) }));
  if (state.pb.length) lines.push(translate('splits.summary-best', { time: (totalOf(state.pb) / 1000).toFixed(2) }));
  lines.push(translate('splits.summary-attempts', { count: state.attempts }));
  return lines.join('\n');
}

export function parseSplits(text: string): Split[] {
  const out: Split[] = [];
  for (const raw of String(text ?? '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const match = line.match(/^(.*?)\s*[|,]\s*(\d+(?::\d+)?(?:\.\d+)?)$/);
    if (!match) {
      out.push({ name: line, target: 0 });
      continue;
    }
    const parts = match[2].split(':');
    const seconds = parts.length > 1 ? Number(parts[0]) * 60 + Number(parts[1]) : Number(parts[0]);
    out.push({ name: match[1].trim(), target: Math.round(seconds * 1000) });
  }
  return out;
}
