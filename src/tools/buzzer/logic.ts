/** Reaction buzzers: fair timing, false starts and keyboard lanes. No Svelte here. */

export const BUZZER_KEYS = ['a', 's', 'd', 'f', 'j', 'k', 'l', ';'];

export interface BuzzPlayer {
  id: string;
  name: string;
  color: string;
  key: string;
}

export interface BuzzRound {
  winner: string;
  ms: number;
  falseStart: string | null;
}

export interface BuzzerState {
  players: BuzzPlayer[];
  /** Monotonic time the buzzers become live; null when idle. */
  liveAt: number | null;
  armed: boolean;
  winner: string | null;
  reactionMs: number | null;
  falseStart: string | null;
  rounds: BuzzRound[];
  delayMin: number;
  delayMax: number;
  allowFalseStart: boolean;
  keyPlay: boolean;
  round: number;
}

export function delayFor(rng: { int(max: number): number }, minMs: number, maxMs: number): number {
  const min = Math.max(0, Math.round(minMs));
  const max = Math.max(min, Math.round(maxMs));
  return min + rng.int(max - min + 1);
}

export function isLive(state: BuzzerState, now: number): boolean {
  return state.armed && state.liveAt !== null && now >= state.liveAt;
}

export function summaryOf(state: BuzzerState): string {
  const lines: string[] = [];
  for (const round of state.rounds) {
    const player = state.players.find((item) => item.id === round.winner);
    lines.push(`${player?.name ?? round.winner}: ${round.ms} ms${round.falseStart ? ` (false start: ${round.falseStart})` : ''}`);
  }
  const wins = new Map<string, number>();
  for (const round of state.rounds) wins.set(round.winner, (wins.get(round.winner) ?? 0) + 1);
  const tally = [...wins.entries()]
    .map(([id, count]) => `${state.players.find((player) => player.id === id)?.name ?? id}: ${count}`)
    .join(', ');
  if (tally) lines.push(`Wins: ${tally}`);
  return lines.length ? lines.join('\n') : 'No rounds yet.';
}
