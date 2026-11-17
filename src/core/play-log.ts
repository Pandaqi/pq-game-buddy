/** Finished plays: the only history that outlives a session. Plain, local, exportable. */

import { KEYS, readJson, writeJson } from './storage';

export interface PlayResult {
  name: string;
  score?: number;
}

export interface PlayRecord {
  id: string;
  at: number;
  game: string;
  players: string[];
  results: PlayResult[];
  winner: string;
  templateId?: string;
}

export interface PlayStats {
  plays: number;
  wins: { name: string; wins: number }[];
  streak: { name: string; length: number } | null;
  lastPlayed: number | null;
}

function cleanRecord(value: unknown): PlayRecord | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<PlayRecord>;
  if (typeof raw.id !== 'string' || typeof raw.game !== 'string') return null;
  const results = Array.isArray(raw.results)
    ? raw.results
        .filter((item) => item && typeof item.name === 'string')
        .map((item) => ({
          name: item.name,
          score: typeof item.score === 'number' && Number.isFinite(item.score) ? item.score : undefined,
        }))
    : [];
  return {
    id: raw.id,
    at: Number(raw.at) || 0,
    game: raw.game,
    players: Array.isArray(raw.players) ? raw.players.filter((name) => typeof name === 'string') : [],
    results,
    winner: typeof raw.winner === 'string' ? raw.winner : '',
    templateId: typeof raw.templateId === 'string' ? raw.templateId : undefined,
  };
}

export function listPlays(): PlayRecord[] {
  const raw = readJson<unknown[]>(KEYS.plays, []);
  return raw
    .map(cleanRecord)
    .filter((record): record is PlayRecord => !!record)
    .sort((a, b) => b.at - a.at);
}

export function recordPlay(input: {
  game: string;
  players?: string[];
  results?: PlayResult[];
  winner: string;
  templateId?: string;
  at?: number;
}): PlayRecord {
  const record: PlayRecord = {
    id: `play${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`,
    at: input.at ?? Date.now(),
    game: input.game.trim() || 'Untitled game',
    players: input.players ?? [],
    results: input.results ?? [],
    winner: input.winner.trim(),
    templateId: input.templateId,
  };
  const next = [record, ...listPlays()].slice(0, 100);
  writeJson(KEYS.plays, next);
  return record;
}

export function updatePlay(
  id: string,
  input: Pick<PlayRecord, 'winner'> & Partial<Pick<PlayRecord, 'results' | 'players'>>,
): PlayRecord | null {
  const records = listPlays();
  const index = records.findIndex((record) => record.id === id);
  if (index < 0) return null;
  const next: PlayRecord = {
    ...records[index],
    winner: input.winner.trim(),
    results: input.results ?? records[index].results,
    players: input.players ?? records[index].players,
  };
  records[index] = next;
  writeJson(KEYS.plays, records);
  return next;
}

export function clearPlays(): void {
  writeJson(KEYS.plays, []);
}

/** Plays, wins and the current winning streak, newest first. */
export function statsFor(records: PlayRecord[]): PlayStats {
  const wins = new Map<string, number>();
  for (const record of records) {
    if (!record.winner) continue;
    wins.set(record.winner, (wins.get(record.winner) ?? 0) + 1);
  }
  const ordered = records.slice().sort((a, b) => b.at - a.at);
  let streak: PlayStats['streak'] = null;
  const start = ordered.findIndex((record) => !!record.winner);
  if (start >= 0) {
    const name = ordered[start].winner;
    let length = 0;
    for (let index = start; index < ordered.length; index += 1) {
      if (ordered[index].winner !== name) break;
      length += 1;
    }
    streak = { name, length };
  }
  return {
    plays: records.length,
    wins: [...wins.entries()]
      .map(([name, count]) => ({ name, wins: count }))
      .sort((a, b) => b.wins - a.wins || a.name.localeCompare(b.name)),
    streak,
    lastPlayed: ordered.length ? ordered[0].at : null,
  };
}

function quote(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function playsToCsv(records: PlayRecord[]): string {
  const rows = ['Game,Date,Winner,Players,Results'];
  for (const record of records) {
    const results = record.results
      .map((item) => (typeof item.score === 'number' ? `${item.name}=${item.score}` : item.name))
      .join('; ');
    rows.push(
      [
        quote(record.game),
        quote(new Date(record.at).toISOString()),
        quote(record.winner),
        quote(record.players.join(', ')),
        quote(results),
      ].join(','),
    );
  }
  return rows.join('\n');
}

export function playsToJson(records: PlayRecord[]): string {
  return JSON.stringify({ version: 1, plays: records }, null, 2);
}
