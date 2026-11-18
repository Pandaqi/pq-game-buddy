/** Players and the plain session model. No Svelte here. */

import { COLOURS, SEAT_ORDER } from '../data/colours';
import { seatNameIn } from './i18n';

export interface Player {
  id: string;
  name: string;
  /**
   * Set when the app named this seat itself. The stored name is then blank and
   * the label is said in whichever language is active; a typed name clears it.
   */
  seat?: number;
  color: string;
  initial: string;
  active: boolean;
}

/**
 * Colorblind-aware set with initials as the non-colour fallback.
 *
 * The colours themselves live in `data/colours.ts`, shared with the names a template
 * writes, so a seat and `colour = green` can never drift apart. Every entry clears
 * 4.5:1 against cream ink (the lowest is teal at 4.52:1); core/colour.ts still picks
 * ink per seat, because an imported template may name any hex at all.
 */
export const PLAYER_COLORS: string[] = SEAT_ORDER.map((name) => COLOURS[name]);

export function initialOf(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/);
  const first = parts[0][0] ?? '?';
  const second = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + second).toUpperCase();
}

export function makePlayers(names: string[]): Player[] {
  return names.map((name, index) => {
    const trimmed = name.trim();
    return {
      id: `p${index + 1}`,
      name: trimmed,
      // A blank entry is a seat the app names: stored bare, said when it is shown.
      ...(trimmed ? {} : { seat: index + 1 }),
      color: PLAYER_COLORS[index % PLAYER_COLORS.length],
      initial: initialOf(trimmed),
      active: index === 0,
    };
  });
}

/**
 * Seats the app names itself, one blank entry each. A session keeps saying
 * "Player 1" in whatever language it is read in.
 */
export function seatNames(count: number): string[] {
  return Array.from({ length: Math.max(0, Math.round(count)) }, () => '');
}

/** A seat's name in a named language: a generated seat is said, a typed name stands. */
export function playerName(player: Player, languageId: string): string {
  return seatNameIn(languageId, player.seat, player.name);
}

/** What a tool keeps when it copies the session's seats: the pair, never its words. */
export interface SeatPair {
  name: string;
  seat?: number;
}

/**
 * One tool seat from a name or a stored pair. A blank name is a seat the app
 * named, and a stored seat number wins, because that is what it was saved as.
 * This is the only place that rule lives: templates, saves and the session all
 * arrive here, so "blank means generated" cannot drift between tools.
 */
export function seatPair(value: string | SeatPair, index: number): SeatPair {
  const stored = typeof value === 'string' ? null : value;
  const seat = Number(stored?.seat);
  if (Number.isInteger(seat) && seat > 0) return { name: '', seat };
  const name = (stored?.name ?? (value as string)).trim();
  return name ? { name } : { name: '', seat: index + 1 };
}

/**
 * A stable key for a seat, safe to store: its number when the app named it and
 * the typed name otherwise. Never the words on screen, which change language.
 */
export function seatKey(seat: SeatPair): string {
  return seat.seat ? `seat-${seat.seat}` : seat.name;
}

/** The entries of a save or a template that could be a seat. */
export function seatValues(values: unknown[]): (string | SeatPair)[] {
  return values.filter(
    (value) =>
      typeof value === 'string' || (!!value && typeof (value as SeatPair).name === 'string'),
  ) as (string | SeatPair)[];
}

/**
 * A tool's own seats: the session's pairs, or `count` generated ones when the
 * session has no players. A named player arrives with the words it was given.
 */
export function toolSeats(players: Player[], count: number): SeatPair[] {
  if (players.length) return players.map((player, index) => seatPair(player, index));
  return Array.from({ length: Math.max(1, Math.round(count)) }, (_, index) => ({ name: '', seat: index + 1 }));
}

export function nextPlayerId(players: Player[]): string {
  let index = players.length + 1;
  const used = new Set(players.map((player) => player.id));
  while (used.has(`p${index}`)) index += 1;
  return `p${index}`;
}

export interface InstanceRecord {
  id: string;
  toolId: string;
  state: unknown;
}

export interface Session {
  id: string;
  gameName: string;
  /** The tool a single-tool session was started from, so its name can be translated again later. */
  toolId?: string;
  templateId?: string;
  templateText?: string;
  /** Set once the play has been written to the play log. */
  playId?: string;
  players: Player[];
  instances: InstanceRecord[];
  notes: string;
  createdAt: number;
  updatedAt: number;
}

export function newSessionId(): string {
  return `s${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
}

export function serializeSession(session: Session): string {
  return JSON.stringify(session, null, 2);
}

/** Tolerant JSON import: returns null instead of throwing. */
export function parseSession(text: string): Session | null {
  try {
    return normalizeSession(JSON.parse(text));
  } catch {
    return null;
  }
}

/** An exported file wraps the record as `{ version, session }`; a bare record works too. */
export function parseSessionFile(text: string): Session | null {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  const wrapped = data !== null && typeof data === 'object' && 'session' in data;
  return normalizeSession(wrapped ? (data as { session: unknown }).session : data);
}

function normalizeSession(value: unknown): Session | null {
  if (!value || typeof value !== 'object') return null;
  const data = value as Partial<Session>;
  if (typeof data.id !== 'string' || typeof data.gameName !== 'string') return null;
    const players = Array.isArray(data.players) ? data.players : [];
    const instances = Array.isArray(data.instances) ? data.instances : [];
    return {
      id: data.id,
      gameName: data.gameName,
      toolId: typeof data.toolId === 'string' ? data.toolId : undefined,
      templateId: data.templateId,
      templateText: data.templateText,
      playId: typeof data.playId === 'string' ? data.playId : undefined,
      players: players
        .filter((player) => player && typeof player.name === 'string')
        .map((player) => {
          const seat = Number(player.seat);
          return { ...player, seat: Number.isInteger(seat) && seat > 0 ? seat : undefined };
        }) as Player[],
      instances: instances.filter(
        (record) => record && typeof record.id === 'string' && typeof record.toolId === 'string',
      ) as InstanceRecord[],
      notes: typeof data.notes === 'string' ? data.notes : '',
      createdAt: Number(data.createdAt) || Date.now(),
      updatedAt: Number(data.updatedAt) || Date.now(),
    };
}
