import { describe, expect, test } from 'bun:test';
import {
  categoryTotal,
  csvSheet,
  evaluateFormula,
  standingsFor,
  totalFor,
  type ScoreState,
} from '../src/tools/score/logic';

function state(overrides: Partial<ScoreState> = {}): ScoreState {
  return {
    mode: 'simple',
    players: [
      { id: 'a', name: 'Ada', color: '#c0392b' },
      { id: 'b', name: 'Bo', color: '#2f6fc0' },
    ],
    totals: { a: 4, b: 6 },
    rounds: { a: [1, 2], b: [3, 1] },
    counts: { a: { cities: 2, roads: 3 }, b: { cities: 1, roads: 0 } },
    categories: [
      { name: 'cities', points: 2 },
      { name: 'roads', points: 1 },
    ],
    formula: '',
    roundCount: 2,
    step: 1,
    target: 0,
    win: 'highest',
    start: 0,
    hidden: false,
    revealed: true,
    ...overrides,
  };
}

describe('score formulas', () => {
  test('respects precedence and brackets', () => {
    expect(evaluateFormula('2 + 3 * 4', {}).value).toBe(14);
    expect(evaluateFormula('(2 + 3) * 4', {}).value).toBe(20);
    expect(evaluateFormula('-(2 + 3) + 10', {}).value).toBe(5);
  });

  test('reads category names from the scope', () => {
    const scope = { cities: 4, roads: 3 };
    expect(evaluateFormula('cities + roads * 2', scope).value).toBe(10);
  });

  test('supports min, max, sum and if', () => {
    const scope = { cities: 2, roads: 5 };
    expect(evaluateFormula('max(cities, roads)', scope).value).toBe(5);
    expect(evaluateFormula('sum(cities, roads, 3)', scope).value).toBe(10);
    expect(evaluateFormula('if(roads > cities, 10, 0)', scope).value).toBe(10);
    expect(evaluateFormula('if(roads < cities, 10, 0)', scope).value).toBe(0);
  });

  test('reports unknown names, bad syntax and division by zero', () => {
    const unknown = evaluateFormula('castles * 2', { cities: 1 });
    expect(unknown.ok).toBe(false);
    expect(unknown.message).toContain('castles');
    expect(evaluateFormula('(1 + 2', {}).ok).toBe(false);
    expect(evaluateFormula('1 +', {}).ok).toBe(false);
    expect(evaluateFormula('4 / 0', {}).ok).toBe(false);
    expect(evaluateFormula('eval(1)', {}).ok).toBe(false);
  });
});

describe('category totals', () => {
  test('multiplies counts by points and adds the starting score', () => {
    const sheet = state({ mode: 'categories' });
    expect(categoryTotal(sheet, 'a')).toBe(7);
    expect(categoryTotal(sheet, 'b')).toBe(2);
    expect(totalFor(sheet, 'a')).toBe(7);
    expect(totalFor(state({ mode: 'categories', start: 5 }), 'a')).toBe(12);
  });

  test('uses the formula when it parses, otherwise falls back to the sum', () => {
    // Formula names carry the points earned: 2 cities x 2 points = 4.
    expect(totalFor(state({ mode: 'categories', formula: 'cities * 10' }), 'a')).toBe(40);
    expect(totalFor(state({ mode: 'categories', formula: 'cities +' }), 'a')).toBe(7);
  });
});

describe('standings and export', () => {
  test('ranks by the chosen direction and flags ties', () => {
    const high = standingsFor(state({ totals: { a: 10, b: 10 } }));
    expect(high.map((row) => row.rank)).toEqual([1, 1]);
    expect(high[0].tied).toBe(true);

    const low = standingsFor(state({ win: 'lowest' }));
    expect(low[0].id).toBe('a');
    expect(low[0].rank).toBe(1);
  });

  test('csv includes category counts', () => {
    const csv = csvSheet(state({ mode: 'categories' }));
    const [header, ada] = csv.split('\n');
    expect(header).toBe('Player,Total,cities,roads');
    expect(ada).toBe('Ada,7,2,3');
  });
});
