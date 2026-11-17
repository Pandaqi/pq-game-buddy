import { describe, expect, test } from 'bun:test';
import { createRng, randomSeedCode } from '../src/core/rng';

describe('rng', () => {
  test('seeded sequences are deterministic', () => {
    const a = createRng('ALPHA').int(1000);
    const b = createRng('ALPHA').int(1000);
    expect(a).toBe(b);
  });

  test('different seeds diverge', () => {
    const a = createRng('ALPHA');
    const b = createRng('BETA');
    const left = Array.from({ length: 8 }, () => a.int(1000));
    const right = Array.from({ length: 8 }, () => b.int(1000));
    expect(left).not.toEqual(right);
  });

  test('integers stay in range', () => {
    const rng = createRng();
    for (let i = 0; i < 500; i += 1) {
      const value = rng.int(6);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(6);
    }
  });

  test('floats stay in [0, 1)', () => {
    const rng = createRng('F');
    for (let i = 0; i < 200; i += 1) {
      const value = rng.float();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  test('shuffle is a permutation and does not mutate', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const rng = createRng('SHUFFLE');
    const shuffled = rng.shuffle(input);
    expect(shuffled.slice().sort((a, b) => a - b)).toEqual(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  test('pick refuses an empty list', () => {
    expect(() => createRng().pick([])).toThrow();
  });

  test('seed codes are readable and stable length', () => {
    const code = randomSeedCode();
    expect(code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  });

  test('reseeding restarts the sequence', () => {
    const rng = createRng('ONE');
    const first = [rng.int(100), rng.int(100)];
    rng.seed('ONE');
    expect([rng.int(100), rng.int(100)]).toEqual(first);
  });
});
