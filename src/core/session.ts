/** Players and the plain session model. No Svelte here. */

export interface Player {
  id: string;
  name: string;
  color: string;
  initial: string;
  active: boolean;
}

/** Colorblind-aware set with initials as the non-colour fallback. */
export const PLAYER_COLORS = [
  '#c0392b',
  '#2f6fc0',
  '#3d8b55',
  '#c2631b',
  '#7550c8',
  '#23807f',
  '#bd4d8c',
  '#b58a12',
  '#6b7280',
];

export function initialOf(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/);
  const first = parts[0][0] ?? '?';
  const second = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + second).toUpperCase();
}

export function makePlayers(names: string[]): Player[] {
  return names.map((name, index) => ({
    id: `p${index + 1}`,
    name: name.trim() || `Player ${index + 1}`,
    color: PLAYER_COLORS[index % PLAYER_COLORS.length],
    initial: initialOf(name.trim() || `Player ${index + 1}`),
    active: index === 0,
  }));
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
    const data = JSON.parse(text) as Partial<Session>;
    if (!data || typeof data !== 'object') return null;
    if (typeof data.id !== 'string' || typeof data.gameName !== 'string') return null;
    const players = Array.isArray(data.players) ? data.players : [];
    const instances = Array.isArray(data.instances) ? data.instances : [];
    return {
      id: data.id,
      gameName: data.gameName,
      templateId: data.templateId,
      templateText: data.templateText,
      playId: typeof data.playId === 'string' ? data.playId : undefined,
      players: players.filter((player) => player && typeof player.name === 'string') as Player[],
      instances: instances.filter(
        (record) => record && typeof record.id === 'string' && typeof record.toolId === 'string',
      ) as InstanceRecord[],
      notes: typeof data.notes === 'string' ? data.notes : '',
      createdAt: Number(data.createdAt) || Date.now(),
      updatedAt: Number(data.updatedAt) || Date.now(),
    };
  } catch {
    return null;
  }
}
