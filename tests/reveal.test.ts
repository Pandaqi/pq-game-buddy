import { describe, expect, test } from 'bun:test';
import { createRng } from '../src/core/rng';
import {
  allBid,
  allVoted,
  ballotResults,
  bidLeaders,
  bidResults,
  dealRoles,
  firstUnvoted,
  roleOf,
  rolePool,
  rolesFrom,
  tally,
  type RevealPlayer,
  type RevealState,
} from '../src/tools/reveal/logic';

const players: RevealPlayer[] = [
  { id: 'p1', name: 'Ada', color: '#c0392b' },
  { id: 'p2', name: 'Bo', color: '#2f6fc0' },
  { id: 'p3', name: 'Cy', color: '#3d8b55' },
];

const roles = [
  { name: 'werewolf', count: 1, description: 'picks a victim' },
  { name: 'villager', count: 2, description: '' },
];

function state(overrides: Partial<RevealState> = {}): RevealState {
  return {
    mode: 'roles',
    players,
    roles,
    assignment: { p1: 'werewolf', p2: 'villager', p3: 'villager' },
    dealt: true,
    holder: 0,
    autoHide: 8,
    ballot: { question: 'Who starts?', options: ['Ada', 'Bo'], votes: {}, revealed: false },
    bids: { min: 1, max: 10, values: {}, revealed: false },
    allRevealed: false,
    ...overrides,
  };
}

describe('role dealing', () => {
  test('the pool repeats a role by its count', () => {
    expect(rolePool(roles)).toEqual(['werewolf', 'villager', 'villager']);
    expect(rolePool([{ name: 'ghost', count: 0, description: '' }])).toEqual([]);
  });

  test('every player gets a role and the pool is respected', () => {
    const assignment = dealRoles(roles, players, createRng('SEED'));
    expect(Object.keys(assignment)).toEqual(['p1', 'p2', 'p3']);
    const dealt = Object.values(assignment);
    expect(dealt.filter((role) => role === 'werewolf')).toHaveLength(1);
    expect(dealt.filter((role) => role === 'villager')).toHaveLength(2);
  });

  test('a short pool repeats roles so nobody is left out', () => {
    const assignment = dealRoles(
      [{ name: 'spy', count: 1, description: '' }],
      players,
      createRng('SEED'),
    );
    expect(Object.values(assignment)).toEqual(['spy', 'spy', 'spy']);
  });

  test('dealing is deterministic with a seed and different without', () => {
    const first = dealRoles(roles, players, createRng('ABC'));
    const again = dealRoles(roles, players, createRng('ABC'));
    expect(first).toEqual(again);
  });

  test('empty roles or players deal nothing', () => {
    expect(dealRoles([], players, createRng('X'))).toEqual({});
    expect(dealRoles(roles, [], createRng('X'))).toEqual({});
  });

  test('roleOf resolves the description', () => {
    expect(roleOf(state(), 'p1')?.description).toBe('picks a victim');
    expect(roleOf(state(), 'nobody')).toBeUndefined();
  });

  test('rolesFrom drops empty names and zero counts', () => {
    expect(rolesFrom({ werewolf: 2, ghost: 0, ' ': 3 }, { werewolf: 'hunts' })).toEqual([
      { name: 'werewolf', count: 2, description: 'hunts' },
    ]);
  });
});

describe('ballots and bids', () => {
  test('tally counts votes per option, including zeroes', () => {
    const votes = { p1: 'Ada', p2: 'Bo', p3: 'Ada' };
    expect(tally(votes, ['Ada', 'Bo', 'Cy'])).toEqual([
      { option: 'Ada', count: 2 },
      { option: 'Bo', count: 1 },
      { option: 'Cy', count: 0 },
    ]);
  });

  test('allVoted and firstUnvoted follow the vote map', () => {
    const sheet = state();
    expect(allVoted(sheet)).toBe(false);
    expect(firstUnvoted(sheet, 'ballot')).toBe(0);
    sheet.ballot.votes = { p1: 'Ada', p2: 'Bo' };
    expect(firstUnvoted(sheet, 'ballot')).toBe(2);
    sheet.ballot.votes.p3 = 'Ada';
    expect(allVoted(sheet)).toBe(true);
    expect(firstUnvoted(sheet, 'ballot')).toBe(-1);
  });

  test('bids need finite numbers for everyone', () => {
    const sheet = state();
    expect(allBid(sheet)).toBe(false);
    expect(firstUnvoted(sheet, 'bid')).toBe(0);
    sheet.bids.values = { p1: 4, p2: null, p3: 7 };
    expect(firstUnvoted(sheet, 'bid')).toBe(1);
    expect(allBid(sheet)).toBe(false);
    sheet.bids.values.p2 = 0;
    expect(allBid(sheet)).toBe(true);
    expect(firstUnvoted(sheet, 'bid')).toBe(-1);
  });

  test('bid leaders keep ties and ignore missing bids', () => {
    const sheet = state({ bids: { min: 0, max: 10, values: { p1: 5, p2: 9, p3: 9 }, revealed: true } });
    expect(bidLeaders(sheet, 'en')).toEqual(['Bo', 'Cy']);
    expect(bidLeaders(state(), 'en')).toEqual([]);
  });

  test('revealed ballots and bids become standings, hidden ones do not', () => {
    const hidden = state({ ballot: { question: 'Who?', options: ['Ada', 'Bo'], votes: { p1: 'Ada', p2: 'Ada', p3: 'Bo' }, revealed: false } });
    expect(ballotResults(hidden)).toEqual([]);
    const shown = state({ ballot: { ...hidden.ballot, revealed: true } });
    expect(ballotResults(shown)).toEqual([
      { name: 'Ada', score: 2 },
      { name: 'Bo', score: 1 },
    ]);

    const bids = state({ bids: { min: 0, max: 10, values: { p1: 4, p2: 9, p3: 7 }, revealed: true } });
    expect(bidResults(bids, 'en')).toEqual([
      { name: 'Bo', score: 9 },
      { name: 'Cy', score: 7 },
      { name: 'Ada', score: 4 },
    ]);
    expect(bidResults(state(), 'en')).toEqual([]);
  });
});
