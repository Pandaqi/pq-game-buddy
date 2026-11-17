/**
 * Randomness: crypto-grade by default, PCG32 when a seed is given so rolls and
 * puzzles can be replayed or shared. Uniform integers, no modulo bias.
 */

export interface Rng {
  /** Uniform float in [0, 1). */
  float(): number;
  /** Uniform integer in [0, maxExclusive). */
  int(maxExclusive: number): number;
  /** One random element; throws on an empty list. */
  pick<T>(items: readonly T[]): T;
  /** Fisher-Yates copy. */
  shuffle<T>(items: readonly T[]): T[];
  /** Reseed. Returns the seed code now in use. */
  seed(code?: string): string;
  /** The current seed code, or null for crypto randomness. */
  seedCode(): string | null;
}

const SEED_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function randomSeedCode(length = 8): string {
  const bytes = new Uint8Array(length);
  fillRandom(bytes);
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += SEED_ALPHABET[bytes[i] % SEED_ALPHABET.length];
    if (i === 3 && length === 8) out += '-';
  }
  return out;
}

function fillRandom(target: Uint8Array): void {
  const cryptoApi = typeof crypto !== 'undefined' ? crypto : undefined;
  if (cryptoApi && typeof cryptoApi.getRandomValues === 'function') {
    cryptoApi.getRandomValues(target);
    return;
  }
  for (let i = 0; i < target.length; i += 1) target[i] = Math.floor(Math.random() * 256);
}

function hashSeed(code: string): number {
  let hash = 2166136261;
  const text = code.trim().toUpperCase();
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** PCG32: tiny, fast, good enough for games and fully deterministic. */
function pcg32(seed: number): () => number {
  let state = seed >>> 0;
  let inc = (Math.imul(seed, 2891336453) + 1) >>> 0;
  const next = (): number => {
    const old = state;
    state = (Math.imul(old, 747796405) + inc) >>> 0;
    const words = Math.imul(((old >>> ((old >>> 28) + 4)) ^ old) >>> 0, 277803737) >>> 0;
    return ((words >>> 22) ^ words) >>> 0;
  };
  next();
  return next;
}

export function createRng(seedCode?: string): Rng {
  let seeded = seedCode ? pcg32(hashSeed(seedCode)) : null;

  const float = (): number => {
    if (seeded) return seeded() / 4294967296;
    const buf = new Uint32Array(1);
    fillRandom(new Uint8Array(buf.buffer));
    return buf[0] / 4294967296;
  };

  const int = (maxExclusive: number): number => {
    if (!Number.isFinite(maxExclusive) || maxExclusive <= 0) return 0;
    const max = Math.floor(maxExclusive);
    if (seeded) return Math.floor(float() * max) % max;
    // Rejection sampling keeps the distribution exactly uniform.
    const limit = Math.floor(4294967296 / max) * max;
    const buf = new Uint32Array(1);
    for (let attempt = 0; attempt < 64; attempt += 1) {
      fillRandom(new Uint8Array(buf.buffer));
      if (buf[0] < limit) return buf[0] % max;
    }
    return Math.floor(float() * max);
  };

  return {
    float,
    int,
    pick(items) {
      if (!items.length) throw new Error('Cannot pick from an empty list');
      return items[int(items.length)];
    },
    shuffle(items) {
      const copy = items.slice();
      for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = int(i + 1);
        const tmp = copy[i];
        copy[i] = copy[j];
        copy[j] = tmp;
      }
      return copy;
    },
    seed(code) {
      const chosen = code && code.trim() ? code.trim() : randomSeedCode();
      seeded = pcg32(hashSeed(chosen));
      return chosen;
    },
    seedCode() {
      return seeded ? '<seeded>' : null;
    },
  };
}
