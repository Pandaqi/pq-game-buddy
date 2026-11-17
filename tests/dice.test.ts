import { describe, expect, test } from 'bun:test';
import { createRng } from '../src/core/rng';
import { parseDice, rollDice } from '../src/tools/dice/logic';

function roll(notation: string, seed = 'TEST') {
  const parsed = parseDice(notation);
  if (!parsed.ok) throw new Error(parsed.message);
  return rollDice(parsed.expression, createRng(seed));
}

describe('dice notation', () => {
  test('parses plain dice and modifiers', () => {
    const parsed = parseDice('2d6+3');
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.expression.terms[0]).toMatchObject({ count: 2, sides: 6 });
    expect(parsed.expression.modifier).toBe(3);
  });

  test('parses keep highest and lowest', () => {
    const high = parseDice('4d6kh3');
    expect(high.ok && high.expression.terms[0].keepHigh).toBe(3);
    const low = parseDice('2d20kl1');
    expect(low.ok && low.expression.terms[0].keepLow).toBe(1);
  });

  test('parses reroll, explode, success and mixed terms', () => {
    const parsed = parseDice('8d10>7+2d6r1+1d6!');
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.expression.terms).toHaveLength(3);
    expect(parsed.expression.terms[0].successAt).toBe(7);
    expect(parsed.expression.terms[1].reroll).toBe(1);
    expect(parsed.expression.terms[2].explode).toBe(true);
  });

  test('understands percentile and Fate dice', () => {
    const percent = parseDice('d%');
    expect(percent.ok && percent.expression.terms[0].sides).toBe(100);
    const fate = parseDice('4dF');
    expect(fate.ok && fate.expression.terms[0].sides).toBe(0);
  });

  test('reports plain-language errors', () => {
    for (const bad of ['', 'd', '2d6kh', '12x6', '0d6', 'd1', 'r1']) {
      const parsed = parseDice(bad);
      expect(parsed.ok).toBe(false);
      if (!parsed.ok) expect(parsed.message.length).toBeGreaterThan(3);
    }
  });

  test('caps absurd pools', () => {
    const parsed = parseDice('500d6');
    expect(parsed.ok).toBe(false);
  });
});

describe('dice rolling', () => {
  test('produces values inside each die range', () => {
    const result = roll('10d6');
    for (const value of result.terms[0].rolls) {
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(6);
    }
  });

  test('is reproducible with a seed', () => {
    const first = roll('4d6+1d8', 'SEEDY');
    const second = roll('4d6+1d8', 'SEEDY');
    expect(first.total).toBe(second.total);
    expect(first.terms[0].rolls).toEqual(second.terms[0].rolls);
  });

  test('keep-high drops the rest', () => {
    const result = roll('4d6kh3');
    expect(result.terms[0].kept).toHaveLength(3);
    expect(result.terms[0].rolls).toHaveLength(4);
    const keptSum = result.terms[0].kept.reduce((a, b) => a + b, 0);
    expect(result.total).toBe(keptSum);
  });

  test('success counting uses kept dice', () => {
    const result = roll('10d10>7', 'LUCK');
    const expected = result.terms[0].kept.filter((value) => value >= 7).length;
    expect(result.successes).toBe(expected);
  });

  test('exploding dice stay bounded', () => {
    const result = roll('1d2!');
    expect(result.terms[0].rolls.length).toBeLessThan(60);
  });

  test('fate dice are -1, 0 or 1', () => {
    const result = roll('8dF');
    for (const value of result.terms[0].rolls) {
      expect([-1, 0, 1]).toContain(value);
    }
  });

  test('modifiers apply once', () => {
    const result = roll('1d1+5'.replace('1d1', '2d2'));
    const sum = result.terms[0].rolls.reduce((a, b) => a + b, 0);
    expect(result.total).toBe(sum + 5);
  });
});
