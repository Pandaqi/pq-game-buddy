import type { Rng } from '../../core/rng';
import type { ToolInstance } from '../../core/registry';

export type RevealMode = 'roles' | 'ballot' | 'bid';

export interface RevealRole {
  name: string;
  count: number;
  description: string;
}

export interface RevealPlayer {
  id: string;
  name: string;
  color: string;
}

export interface BallotState {
  question: string;
  options: string[];
  votes: Record<string, string>;
  revealed: boolean;
}

export interface BidState {
  min: number;
  max: number;
  values: Record<string, number | null>;
  revealed: boolean;
}

export interface RevealState {
  mode: RevealMode;
  players: RevealPlayer[];
  roles: RevealRole[];
  /** Player id to role name, filled by a deal. */
  assignment: Record<string, string>;
  dealt: boolean;
  /** Index of the player holding the phone. */
  holder: number;
  /** Seconds before a secret covers itself again. */
  autoHide: number;
  ballot: BallotState;
  bids: BidState;
  allRevealed: boolean;
}

export interface RevealActions {
  setMode(mode: RevealMode): void;
  deal(): void;
  clearDeal(): void;
  setRoles(roles: RevealRole[]): void;
  setHolder(index: number): void;
  nextHolder(): void;
  setAutoHide(seconds: number): void;
  setBallotQuestion(text: string): void;
  setBallotOptions(options: string[]): void;
  castVote(playerId: string, option: string): void;
  revealBallot(): void;
  coverBallot(): void;
  setBid(playerId: string, value: number | null): void;
  setBidRange(min: number, max: number): void;
  revealBids(): void;
  coverBids(): void;
  revealAll(): void;
  coverAll(): void;
  syncPlayers(): void;
}

export type RevealInstance = ToolInstance<RevealState> & RevealActions;

/** One entry per card in the deck: a role with count 3 appears three times. */
export function rolePool(roles: RevealRole[]): string[] {
  const pool: string[] = [];
  for (const role of roles) {
    const count = Math.max(0, Math.round(role.count));
    for (let index = 0; index < count; index += 1) pool.push(role.name);
  }
  return pool;
}

/**
 * Deal the role pool across players. When there are more players than cards,
 * roles repeat from the top so everyone still gets a card.
 */
export function dealRoles(roles: RevealRole[], players: RevealPlayer[], rng: Rng): Record<string, string> {
  const pool = rolePool(roles);
  if (!pool.length || !players.length) return {};
  const shuffled = rng.shuffle(pool);
  const assignment: Record<string, string> = {};
  players.forEach((player, index) => {
    assignment[player.id] = shuffled[index % shuffled.length];
  });
  return assignment;
}

export function roleOf(state: RevealState, playerId: string): RevealRole | undefined {
  const name = state.assignment[playerId];
  return state.roles.find((role) => role.name === name);
}

export function tally(votes: Record<string, string>, options: string[]): { option: string; count: number }[] {
  return options.map((option) => ({
    option,
    count: Object.values(votes).filter((vote) => vote === option).length,
  }));
}

export function allVoted(state: RevealState): boolean {
  return state.players.length > 0 && state.players.every((player) => !!state.ballot.votes[player.id]);
}

export function allBid(state: RevealState): boolean {
  return (
    state.players.length > 0 &&
    state.players.every((player) => {
      const value = state.bids.values[player.id];
      return typeof value === 'number' && Number.isFinite(value);
    })
  );
}

/** Next player who still has to vote or bid, or -1 when everyone has. */
export function firstUnvoted(state: RevealState, kind: 'ballot' | 'bid'): number {
  return state.players.findIndex((player) =>
    kind === 'ballot' ? !state.ballot.votes[player.id] : typeof state.bids.values[player.id] !== 'number',
  );
}

/** Revealed ballot counts as standings, best first. Hidden votes stay secret. */
export function ballotResults(state: RevealState): { name: string; score: number }[] {
  if (!state.ballot.revealed) return [];
  return tally(state.ballot.votes, state.ballot.options)
    .sort((a, b) => b.count - a.count)
    .map((row) => ({ name: row.option, score: row.count }));
}

/** Revealed bids as standings, highest first. */
export function bidResults(state: RevealState): { name: string; score: number }[] {
  if (!state.bids.revealed) return [];
  return state.players
    .map((player) => ({
      name: player.name,
      score: typeof state.bids.values[player.id] === 'number' ? state.bids.values[player.id]! : 0,
    }))
    .sort((a, b) => b.score - a.score);
}

export function bidLeaders(state: RevealState): string[] {
  let best = -Infinity;
  const leaders: string[] = [];
  for (const player of state.players) {
    const value = state.bids.values[player.id];
    if (typeof value !== 'number') continue;
    if (value > best) {
      best = value;
      leaders.length = 0;
      leaders.push(player.name);
    } else if (value === best) {
      leaders.push(player.name);
    }
  }
  return leaders;
}

export function rolesFrom(pairs: Record<string, string | number>, descriptions: Record<string, string | number>): RevealRole[] {
  return Object.entries(pairs)
    .map(([name, count]) => ({
      name: name.trim(),
      count: Math.max(0, Math.round(Number(count) || 0)),
      description: String(descriptions[name] ?? '').trim(),
    }))
    .filter((role) => role.name && role.count > 0);
}
