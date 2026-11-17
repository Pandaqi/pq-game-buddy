/**
 * Tournament brackets as a pure function of entrants and reported results:
 * single and double elimination, round robin, groups plus playoffs and Swiss.
 * Recomputing from results makes undo and corrections trivially correct.
 */

export type BracketFormat = 'single' | 'double' | 'round-robin' | 'groups' | 'swiss';

export const BRACKET_FORMATS: BracketFormat[] = ['single', 'double', 'round-robin', 'groups', 'swiss'];

export type Stage = 'winners' | 'losers' | 'grand' | 'group' | 'playoff' | 'swiss';

export interface Entrant {
  id: string;
  name: string;
  seed: number;
}

export interface Result {
  winner: string;
  scoreA: number;
  scoreB: number;
}

export type Slot =
  | { kind: 'entrant'; id: string }
  | { kind: 'winner'; match: string }
  | { kind: 'loser'; match: string }
  | { kind: 'bye' };

export interface MatchDef {
  id: string;
  stage: Stage;
  round: number;
  slot: number;
  a: Slot;
  b: Slot;
}

export interface Match extends MatchDef {
  aName: string | null;
  bName: string | null;
  result: Result | null;
  bestOf: number;
}

export interface Standing {
  id: string;
  name: string;
  played: number;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  diff: number;
}

export interface BracketView {
  matches: Match[];
  standings: Standing[];
  champion: string | null;
  next: Match | null;
}

export interface BracketInput {
  format: BracketFormat;
  entrants: Entrant[];
  results: Record<string, Result>;
  bestOf: number;
  tiebreak: 'diff' | 'head';
}

function nextPowerOfTwo(value: number): number {
  let size = 2;
  while (size < value) size *= 2;
  return size;
}

/** Standard bracket seeding: 1 v 8, 2 v 7, ... */
export function seedOrder(size: number): number[] {
  let order = [1];
  while (order.length < size) {
    const doubled = order.length * 2;
    const next: number[] = [];
    for (const seed of order) {
      next.push(seed, doubled + 1 - seed);
    }
    order = next;
  }
  return order;
}

function singleBracket(entrants: Entrant[], stage: Stage, prefix: string): MatchDef[] {
  const size = nextPowerOfTwo(Math.max(2, entrants.length));
  const order = seedOrder(size);
  const rounds = Math.round(Math.log2(size));
  const matches: MatchDef[] = [];
  let previous: string[] = [];
  for (let round = 1; round <= rounds; round += 1) {
    const count = size / 2 ** round;
    for (let slot = 1; slot <= count; slot += 1) {
      const id = `${prefix}${round}-${slot}`;
      let a: Slot;
      let b: Slot;
      if (round === 1) {
        const seedA = order[(slot - 1) * 2];
        const seedB = order[(slot - 1) * 2 + 1];
        a = seedA <= entrants.length ? { kind: 'entrant', id: entrants[seedA - 1].id } : { kind: 'bye' };
        b = seedB <= entrants.length ? { kind: 'entrant', id: entrants[seedB - 1].id } : { kind: 'bye' };
      } else {
        a = { kind: 'winner', match: previous[(slot - 1) * 2] };
        b = { kind: 'winner', match: previous[(slot - 1) * 2 + 1] };
      }
      matches.push({ id, stage, round, slot, a, b });
    }
    previous = matches.slice(-count).map((match) => match.id);
  }
  return matches;
}

function losersBracket(winners: MatchDef[], size: number): MatchDef[] {
  const winnersRounds = Math.round(Math.log2(size));
  const out: MatchDef[] = [];
  let previous: string[] = [];
  let round = 1;
  for (let wbRound = 1; wbRound <= winnersRounds; wbRound += 1) {
    const wbMatches = winners.filter((match) => match.round === wbRound);
    if (wbRound === 1) {
      const count = Math.floor(wbMatches.length / 2);
      const ids: string[] = [];
      for (let slot = 1; slot <= count; slot += 1) {
        const id = `l${round}-${slot}`;
        out.push({
          id,
          stage: 'losers',
          round,
          slot,
          a: { kind: 'loser', match: wbMatches[(slot - 1) * 2].id },
          b: { kind: 'loser', match: wbMatches[(slot - 1) * 2 + 1].id },
        });
        ids.push(id);
      }
      previous = ids;
      round += 1;
      continue;
    }
    if (wbRound < winnersRounds) {
      const ids: string[] = [];
      for (let slot = 1; slot <= wbMatches.length; slot += 1) {
        const id = `l${round}-${slot}`;
        out.push({
          id,
          stage: 'losers',
          round,
          slot,
          a: { kind: 'winner', match: previous[slot - 1] },
          b: { kind: 'loser', match: wbMatches[slot - 1].id },
        });
        ids.push(id);
      }
      previous = ids;
      round += 1;
      if (previous.length > 1) {
        const merged: string[] = [];
        for (let slot = 1; slot <= previous.length / 2; slot += 1) {
          const id = `l${round}-${slot}`;
          out.push({
            id,
            stage: 'losers',
            round,
            slot,
            a: { kind: 'winner', match: previous[(slot - 1) * 2] },
            b: { kind: 'winner', match: previous[(slot - 1) * 2 + 1] },
          });
          merged.push(id);
        }
        previous = merged;
        round += 1;
      }
      continue;
    }
    const id = `l${round}-1`;
    out.push({
      id,
      stage: 'losers',
      round,
      slot: 1,
      a: { kind: 'winner', match: previous[0] },
      b: { kind: 'loser', match: wbMatches[0].id },
    });
    previous = [id];
    round += 1;
  }
  return out;
}

export function roundRobinDefs(entrants: Entrant[], stage: Stage, prefix: string): MatchDef[] {
  const ids = entrants.map((entrant) => entrant.id);
  if (ids.length < 2) return [];
  if (ids.length % 2 === 1) ids.push('__bye__');
  const size = ids.length;
  const rounds = size - 1;
  const half = size / 2;
  let rotation = ids.slice();
  const out: MatchDef[] = [];
  for (let round = 1; round <= rounds; round += 1) {
    for (let slot = 0; slot < half; slot += 1) {
      const a = rotation[slot];
      const b = rotation[size - 1 - slot];
      if (a === '__bye__' || b === '__bye__') continue;
      out.push({
        id: `${prefix}${round}-${slot + 1}`,
        stage,
        round,
        slot: slot + 1,
        a: { kind: 'entrant', id: a },
        b: { kind: 'entrant', id: b },
      });
    }
    rotation = [rotation[0], rotation[size - 1], ...rotation.slice(1, size - 1)];
  }
  return out;
}

/** Resolve every slot to a player id (null when not decided yet). Byes auto-advance. */
function makeResolver(defs: Map<string, MatchDef>, results: Record<string, Result>) {
  const memo = new Map<string, string | null>();
  const sides = (def: MatchDef): [string | null, string | null] => [resolveSlot(def.a), resolveSlot(def.b)];

  function resolveSlot(slot: Slot): string | null {
    if (slot.kind === 'entrant') return slot.id;
    if (slot.kind === 'bye') return null;
    const key = `${slot.kind}:${slot.match}`;
    if (memo.has(key)) return memo.get(key) ?? null;
    memo.set(key, null);
    const def = defs.get(slot.match);
    if (!def) return null;
    const [a, b] = sides(def);
    let value: string | null = null;
    if (slot.kind === 'winner') {
      if (!a || !b) value = a ?? b;
      else {
        const result = results[def.id];
        if (result) value = result.winner === b ? b : result.winner === a ? a : result.scoreB > result.scoreA ? b : a;
      }
    } else {
      if (a && b) {
        const result = results[def.id];
        const winner = result
          ? result.winner === b
            ? b
            : result.winner === a
              ? a
              : result.scoreB > result.scoreA
                ? b
                : a
          : null;
        if (winner) value = winner === a ? b : a;
      }
    }
    memo.set(key, value);
    return value;
  }

  return { sides, winner: (id: string) => resolveSlot({ kind: 'winner', match: id }) };
}

function standingsFor(entrants: Entrant[], matches: Match[], input: BracketInput): Standing[] {
  const rows = new Map<string, Standing>();
  for (const entrant of entrants) {
    rows.set(entrant.id, {
      id: entrant.id,
      name: entrant.name,
      played: 0,
      wins: 0,
      losses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      diff: 0,
    });
  }
  const headToHead = new Map<string, number>();
  for (const match of matches) {
    if (!match.aName || !match.bName || !match.result) continue;
    const a = rows.get(match.aName);
    const b = rows.get(match.bName);
    if (!a || !b) continue;
    const winner = match.result.winner;
    a.played += 1;
    b.played += 1;
    a.pointsFor += match.result.scoreA;
    a.pointsAgainst += match.result.scoreB;
    b.pointsFor += match.result.scoreB;
    b.pointsAgainst += match.result.scoreA;
    if (winner === a.id) {
      a.wins += 1;
      b.losses += 1;
      headToHead.set(`${a.id}>${b.id}`, (headToHead.get(`${a.id}>${b.id}`) ?? 0) + 1);
    } else {
      b.wins += 1;
      a.losses += 1;
      headToHead.set(`${b.id}>${a.id}`, (headToHead.get(`${b.id}>${a.id}`) ?? 0) + 1);
    }
    a.diff = a.pointsFor - a.pointsAgainst;
    b.diff = b.pointsFor - b.pointsAgainst;
  }
  return [...rows.values()].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (input.tiebreak === 'diff' && b.diff !== a.diff) return b.diff - a.diff;
    if (input.tiebreak === 'head') {
      const direct = (headToHead.get(`${a.id}>${b.id}`) ?? 0) - (headToHead.get(`${b.id}>${a.id}`) ?? 0);
      if (direct !== 0) return -direct;
    }
    if (b.diff !== a.diff) return b.diff - a.diff;
    return a.name.localeCompare(b.name);
  });
}

function swissDefs(entrants: Entrant[], results: Record<string, Result>, rounds: number): MatchDef[] {
  const played = new Set<string>();
  const wins = new Map<string, number>(entrants.map((entrant) => [entrant.id, 0]));
  const defs: MatchDef[] = [];
  const history: { a: string; b: string; winner: string | null }[] = [];

  for (let round = 1; round <= rounds; round += 1) {
    const order = entrants
      .slice()
      .sort((a, b) => (wins.get(b.id) ?? 0) - (wins.get(a.id) ?? 0) || a.seed - b.seed);
    const pool = order.map((entrant) => entrant.id);
    const pairs: [string, string][] = [];
    while (pool.length > 1) {
      const a = pool.shift() as string;
      let index = 0;
      while (index < pool.length && played.has(`${a}|${pool[index]}`)) index += 1;
      const b = pool.splice(Math.min(index, pool.length - 1), 1)[0];
      if (!b) break;
      played.add(`${a}|${b}`);
      played.add(`${b}|${a}`);
      pairs.push([a, b]);
    }
    pairs.forEach(([a, b], index) => {
      const id = `s${round}-${index + 1}`;
      const result = results[id] ?? null;
      const winner = result ? (result.winner === b ? b : a) : null;
      if (winner) wins.set(winner, (wins.get(winner) ?? 0) + 1);
      history.push({ a, b, winner });
      defs.push({
        id,
        stage: 'swiss',
        round,
        slot: index + 1,
        a: { kind: 'entrant', id: a },
        b: { kind: 'entrant', id: b },
      });
    });
  }
  return defs;
}

export function buildBracket(input: BracketInput): BracketView {
  const entrants = input.entrants.slice();
  const names = new Map(entrants.map((entrant) => [entrant.id, entrant.name]));
  let defs: MatchDef[] = [];
  let grandSource: string | null = null;
  let size = 2;

  if (input.format === 'single') {
    defs = singleBracket(entrants, 'winners', 'w');
    const final = defs[defs.length - 1];
    grandSource = final ? final.id : null;
  } else if (input.format === 'double') {
    size = nextPowerOfTwo(Math.max(2, entrants.length));
    const winners = singleBracket(entrants, 'winners', 'w');
    const final = winners[winners.length - 1];
    defs = [...winners];
    if (size > 2) {
      const losers = losersBracket(winners, size);
      defs = [...defs, ...losers];
      const lastLosers = losers[losers.length - 1];
      if (final && lastLosers) {
        defs.push({
          id: 'grand-1',
          stage: 'grand',
          round: 1,
          slot: 1,
          a: { kind: 'winner', match: final.id },
          b: { kind: 'winner', match: lastLosers.id },
        });
        grandSource = 'grand-1';
      }
    } else {
      grandSource = final ? final.id : null;
    }
  } else if (input.format === 'round-robin') {
    defs = roundRobinDefs(entrants, 'group', 'rr');
  } else if (input.format === 'groups') {
    const groupCount = Math.max(1, Math.round(entrants.length / 4));
    const groups: Entrant[][] = Array.from({ length: groupCount }, () => []);
    entrants.forEach((entrant, index) => {
      const round = Math.floor(index / groupCount);
      const offset = index % groupCount;
      const slot = round % 2 === 0 ? offset : groupCount - 1 - offset;
      groups[slot].push(entrant);
    });
    groups.forEach((group, index) => {
      defs = [...defs, ...roundRobinDefs(group, 'group', `g${index + 1}-`)];
    });
    const table = new Map(defs.map((def) => [def.id, def]));
    const sidesOf = makeResolver(table, input.results);
    const qualified: Entrant[] = [];
    groups.forEach((group, index) => {
      const rows: Standing[] = group.map((entrant) => ({
        id: entrant.id,
        name: entrant.name,
        played: 0,
        wins: 0,
        losses: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        diff: 0,
      }));
      const rowsById = new Map(rows.map((row) => [row.id, row]));
      for (const def of defs) {
        if (!def.id.startsWith(`g${index + 1}-`)) continue;
        const [a, b] = sidesOf.sides(def);
        const result = input.results[def.id];
        if (!a || !b || !result) continue;
        const rowA = rowsById.get(a);
        const rowB = rowsById.get(b);
        if (!rowA || !rowB) continue;
        rowA.played += 1;
        rowB.played += 1;
        rowA.pointsFor += result.scoreA;
        rowB.pointsFor += result.scoreB;
        if (result.winner === a || result.scoreA > result.scoreB) rowA.wins += 1;
        else rowB.wins += 1;
      }
      rows.sort((a, b) => b.wins - a.wins || b.pointsFor - a.pointsFor || a.name.localeCompare(b.name));
      const top = rows.slice(0, Math.min(2, rows.length));
      top.forEach((row, place) => {
        const entrant = group.find((item) => item.id === row.id);
        if (entrant) qualified.push({ ...entrant, seed: index * 2 + place + 1 });
      });
    });
    if (qualified.length >= 2) {
      defs = [...defs, ...singleBracket(qualified, 'playoff', 'p')];
      const finals = defs.filter((def) => def.stage === 'playoff').sort((a, b) => a.round - b.round);
      grandSource = finals.length ? finals[finals.length - 1].id : null;
    }
  } else {
    defs = swissDefs(entrants, input.results, Math.max(1, Math.ceil(Math.log2(Math.max(2, entrants.length)))));
  }

  const table = new Map(defs.map((def) => [def.id, def]));
  const resolver = makeResolver(table, input.results);

  const matches: Match[] = defs.map((def) => {
    const [a, b] = resolver.sides(def);
    return {
      ...def,
      aName: a,
      bName: b,
      result: input.results[def.id] ?? null,
      bestOf: input.bestOf,
    };
  });

  // Grand-final reset: the losers-bracket side has to win twice.
  if (input.format === 'double' && grandSource === 'grand-1') {
    const grand = matches.find((match) => match.id === 'grand-1');
    const resetResult = input.results['grand-2'];
    if (grand?.result && grand.bName && grand.result.winner === grand.bName) {
      const reset: Match = {
        id: 'grand-2',
        stage: 'grand',
        round: 2,
        slot: 1,
        a: grand.a,
        b: grand.b,
        aName: grand.aName,
        bName: grand.bName,
        result: resetResult ?? null,
        bestOf: input.bestOf,
      };
      matches.push(reset);
      grandSource = 'grand-2';
    }
  }

  const standings = standingsFor(entrants, matches, input);
  const byId = new Map(matches.map((match) => [match.id, match]));
  let champion: string | null = null;
  if (grandSource) {
    const source = byId.get(grandSource);
    if (source) champion = resolver.winner(grandSource);
    if (!champion && source?.result) champion = source.result.winner;
  } else if (standings.length && standings[0].played > 0) {
    champion = standings[0].id;
  }

  const next = matches.find((match) => match.aName && match.bName && !match.result) ?? null;
  return { matches, standings, champion, next };
}

export function winnerOf(match: Match): string | null {
  if (!match.result) return null;
  if (match.result.winner === match.aName || match.result.winner === match.bName) return match.result.winner;
  return match.result.scoreB > match.result.scoreA ? match.bName : match.aName;
}

export function labelFor(match: Match, names: Map<string, string>): string {
  return `${names.get(match.aName ?? '') ?? 'Winner'} vs ${names.get(match.bName ?? '') ?? 'Winner'}`;
}

export const STAGE_LABELS: Record<Stage, string> = {
  winners: 'Winners bracket',
  losers: 'Losers bracket',
  grand: 'Grand final',
  group: 'Group stage',
  playoff: 'Playoffs',
  swiss: 'Swiss rounds',
};
