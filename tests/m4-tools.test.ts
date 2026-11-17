import { describe, expect, test } from 'bun:test';
import { buildBracket, roundRobinDefs, seedOrder, type Entrant, type Result } from '../src/tools/bracket/logic';
import { delayFor, isLive, type BuzzerState } from '../src/tools/buzzer/logic';
import {
  colTotal,
  evaluateFormula,
  grandTotal,
  makeTable,
  rowTotal,
} from '../src/tools/custom/logic';
import { deckCards, shuffled, take } from '../src/tools/decks/logic';
import { orderPreview, turnAt } from '../src/tools/draft/logic';
import { parseSteps, splitCommand, waitFor } from '../src/tools/script/logic';
import {
  codenamesBoard,
  closeMatches,
  anagramWords,
  deaccent,
  normalise,
  pickLetters,
  rackWords,
  scoreWord,
} from '../src/tools/words/logic';
import { drawFrom, parseCustomPacks } from '../src/tools/prompts/logic';
import { bestSegments, delta, parseSplits, sumOfBest, totalOf, type SplitsState } from '../src/tools/splits/logic';
import { drawType, totalOf as bagTotal } from '../src/tools/bag/logic';
import { countsFor } from '../src/tools/bag/logic';
import { createRng } from '../src/core/rng';

const FIXED_WORDS = ['cat', 'act', 'tac', 'cot', 'dog', 'god', 'stone', 'notes', 'tones', 'onset'];

describe('decks', () => {
  test('the standard deck has 52 cards and its variants have the right sizes', () => {
    expect(deckCards('standard')).toHaveLength(52);
    expect(deckCards('euchre')).toHaveLength(24);
    expect(deckCards('skat')).toHaveLength(32);
    expect(deckCards('uno')).toHaveLength(108);
    expect(deckCards('tarot')).toHaveLength(78);
    expect(deckCards('domino')).toHaveLength(28);
    expect(deckCards('standard', 2, 2)).toHaveLength(108);
  });

  test('cards carry unique ids and a readable label', () => {
    const cards = deckCards('standard', 2, 2);
    expect(new Set(cards.map((card) => card.id)).size).toBe(cards.length);
    expect(cards.every((card) => card.label.length > 0)).toBe(true);
  });

  test('dealing takes from the top and never invents cards', () => {
    const deck = shuffled(deckCards('standard'), createRng('DEAL'));
    const { drawn, rest } = take(deck, 5);
    expect(drawn).toHaveLength(5);
    expect(rest).toHaveLength(47);
    expect(drawn[0].id).toBe(deck[0].id);
  });
});

describe('bag', () => {
  test('the scrabble and bananagrams sets add up', () => {
    expect(bagTotal(countsFor('scrabble'))).toBe(100);
    expect(bagTotal(countsFor('bananagrams'))).toBe(144);
  });

  test('weighted draws only return types that are left', () => {
    const rng = createRng('BAG');
    const counts = { red: 2, blue: 0, green: 1 };
    for (let index = 0; index < 40; index += 1) {
      expect(['red', 'green']).toContain(drawType(counts, rng) as string);
    }
    expect(drawType({ red: 0 }, rng)).toBeNull();
  });
});

function entrant(seed: number): Entrant {
  return { id: `e${seed}`, name: `Player ${seed}`, seed };
}

function fillResults(format: 'single' | 'double' | 'round-robin' | 'groups' | 'swiss') {
  const entrants = Array.from({ length: 8 }, (_, index) => entrant(index + 1));
  const results: Record<string, Result> = {};
  for (let pass = 0; pass < 20; pass += 1) {
    const view = buildBracket({ format, entrants, results, bestOf: 1, tiebreak: 'diff' });
    const open = view.matches.filter((match) => match.aName && match.bName && !match.result);
    if (!open.length) break;
    for (const match of open) {
      results[match.id] = { winner: match.aName as string, scoreA: 2, scoreB: 1 };
    }
  }
  return buildBracket({ format, entrants, results, bestOf: 1, tiebreak: 'diff' });
}

describe('bracket', () => {
  test('standard seeding pairs the best with the worst', () => {
    expect(seedOrder(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6]);
  });

  test('single elimination runs an eight-player bracket to a champion', () => {
    const view = fillResults('single');
    expect(view.matches).toHaveLength(7);
    expect(view.champion).not.toBeNull();
    expect(view.next).toBeNull();
  });

  test('double elimination has a losers bracket and a grand final', () => {
    const view = fillResults('double');
    expect(view.matches.some((match) => match.stage === 'losers')).toBe(true);
    expect(view.matches.some((match) => match.stage === 'grand')).toBe(true);
    expect(view.champion).not.toBeNull();
  });

  test('round robin pairs everyone once', () => {
    const entrants = Array.from({ length: 5 }, (_, index) => entrant(index + 1));
    const defs = roundRobinDefs(entrants, 'group', 'rr');
    expect(defs).toHaveLength(10);
    const pairs = new Set(
      defs.map((match) => [match.a, match.b].map((slot) => (slot.kind === 'entrant' ? slot.id : '')).join('|')),
    );
    expect(pairs.size).toBe(10);
  });

  test('round robin, groups and swiss all produce standings', () => {
    for (const format of ['round-robin', 'groups', 'swiss'] as const) {
      const view = fillResults(format);
      expect(view.standings.length).toBe(8);
      expect(view.standings[0].wins).toBeGreaterThan(0);
      expect(view.champion).not.toBeNull();
    }
  });

  test('removing a result resets the bracket deterministically', () => {
    const entrants = Array.from({ length: 4 }, (_, index) => entrant(index + 1));
    const results: Record<string, Result> = { 'w1-1': { winner: 'e1', scoreA: 1, scoreB: 0 } };
    const view = buildBracket({ format: 'single', entrants, results, bestOf: 1, tiebreak: 'diff' });
    expect(view.matches.find((match) => match.id === 'w1-1')?.result?.winner).toBe('e1');
    const cleared = buildBracket({ format: 'single', entrants, results: {}, bestOf: 1, tiebreak: 'diff' });
    expect(cleared.matches.every((match) => !match.result)).toBe(true);
    expect(cleared.champion).toBeNull();
  });
});

describe('draft', () => {
  test('snake order reverses on even rounds', () => {
    const order = ['a', 'b', 'c'];
    expect(turnAt(order, true, 0).picker).toBe('a');
    expect(turnAt(order, true, 2).picker).toBe('c');
    expect(turnAt(order, true, 3).picker).toBe('c');
    expect(turnAt(order, true, 4).picker).toBe('b');
    expect(turnAt(order, false, 3).picker).toBe('a');
    expect(orderPreview(order, true, 4).map((item) => item.picker)).toEqual(['a', 'b', 'c', 'c']);
  });
});

describe('buzzer', () => {
  test('the random delay stays inside its window', () => {
    const rng = createRng('BUZZ');
    for (let index = 0; index < 50; index += 1) {
      const value = delayFor(rng, 1000, 3000);
      expect(value).toBeGreaterThanOrEqual(1000);
      expect(value).toBeLessThanOrEqual(3000);
    }
  });

  test('buzzers are only live once armed and past the delay', () => {
    const state = { armed: true, liveAt: 100 } as BuzzerState;
    expect(isLive(state, 50)).toBe(false);
    expect(isLive(state, 150)).toBe(true);
    expect(isLive({ ...state, armed: false }, 150)).toBe(false);
  });
});

describe('script', () => {
  test('steps parse with or without a verb', () => {
    const steps = parseSteps(['say: hello there', 'wait: 5s', 'plain text', 'note: host only']);
    expect(steps).toHaveLength(4);
    expect(steps[0]).toEqual({ verb: 'say', arg: 'hello there' });
    expect(steps[2]).toEqual({ verb: 'say', arg: 'plain text' });
  });

  test('waits and commands read correctly', () => {
    expect(waitFor('5s')).toBe(5000);
    expect(waitFor('1m30s')).toBe(90000);
    expect(waitFor('soon')).toBe(0);
    expect(splitCommand('clock start')).toEqual({ target: 'clock', command: 'start' });
    expect(splitCommand('roles')).toEqual({ target: 'roles', command: '' });
  });
});

describe('words', () => {
  test('normalising strips accents and punctuation', () => {
    expect(deaccent('Café')).toBe('Cafe');
    expect(normalise('Café!')).toBe('cafe');
  });

  test('anagrams only use the letters available', () => {
    const found = anagramWords(FIXED_WORDS, 'tac');
    expect(found.sort()).toEqual(['act', 'cat', 'tac']);
    expect(anagramWords(FIXED_WORDS, 'stone').sort()).toEqual(['notes', 'onset', 'stone', 'tones']);
  });

  test('the rack solver respects blanks and scores words', () => {
    const exact = rackWords(FIXED_WORDS, 'cat', 0, 'en');
    expect(exact.map((row) => row.word)).toContain('cat');
    expect(exact.every((row) => row.exact)).toBe(true);
    const withBlank = rackWords(FIXED_WORDS, 'ct', 1, 'en', 10);
    expect(withBlank.some((row) => row.word === 'cat' && !row.exact)).toBe(true);
    expect(scoreWord('cat', 'en')).toBe(5);
    expect(scoreWord('cat', 'nl')).toBe(3);
  });

  test('close matches catch a typo', () => {
    expect(closeMatches(FIXED_WORDS, 'caat')).toContain('cat');
  });

  test('letter picks are unique and inside the alphabet', () => {
    const picked = pickLetters(createRng('LETTERS'), 'en', 20);
    expect(picked).toHaveLength(20);
    expect(new Set(picked).size).toBe(20);
    expect(picked.every((letter) => /^[a-z]$/.test(letter))).toBe(true);
  });

  test('a codenames board has 25 words and a 9/8/7/1 key', () => {
    const board = codenamesBoard(createRng('CODENAMES'), FIXED_WORDS);
    expect(board.words).toHaveLength(25);
    expect(board.key.filter((key) => key === 'red')).toHaveLength(9);
    expect(board.key.filter((key) => key === 'blue')).toHaveLength(8);
    expect(board.key.filter((key) => key === 'neutral')).toHaveLength(7);
    expect(board.key.filter((key) => key === 'assassin')).toHaveLength(1);
  });
});

describe('prompts', () => {
  test('draws are distinct, respect exclusions and can be repeated with a seed', () => {
    const pool = ['a', 'b', 'c', 'd', 'e'];
    const first = drawFrom(pool, 3, createRng('PROMPT'), ['a']);
    expect(first).toHaveLength(3);
    expect(first).not.toContain('a');
    expect(new Set(first).size).toBe(3);
    expect(drawFrom(pool, 3, createRng('PROMPT'), ['a'])).toEqual(first);
    expect(drawFrom(['x'], 2, createRng('P'))).toEqual(['x']);
  });

  test('custom packs parse headings and entries', () => {
    const packs = parseCustomPacks('[Snacks]\ntoast\n- olives\n[Places]\nbeach');
    expect(packs).toHaveLength(2);
    expect(packs[0]).toEqual({ name: 'Snacks', items: ['toast', 'olives'] });
  });
});

describe('custom sheet', () => {
  test('formulas respect precedence and functions', () => {
    expect(evaluateFormula('2 + 3 * 4', {})).toBe(14);
    expect(evaluateFormula('(2 + 3) * 4', {})).toBe(20);
    expect(evaluateFormula('wood * 2 + gold', { wood: 3, gold: 1 })).toBe(7);
    expect(evaluateFormula('max(2, 9) - round(2.6)', {})).toBe(6);
    expect(evaluateFormula('10 / 0', {})).toBeNull();
    expect(evaluateFormula('unknown + 1', {})).toBeNull();
    expect(evaluateFormula('2 +', {})).toBeNull();
    expect(evaluateFormula('alert(1)', {})).toBeNull();
  });

  test('tables keep their totals when resized', () => {
    const table = makeTable(2, 2);
    table.cells[0] = 4;
    table.cells[1] = 6;
    expect(rowTotal(table, 0)).toBe(10);
    expect(colTotal(table, 1)).toBe(6);
    expect(grandTotal(table)).toBe(10);
    const bigger = makeTable(3, 3, table);
    expect(bigger.cells[0]).toBe(4);
    expect(bigger.rows).toBe(3);
  });
});

describe('splits', () => {
  const state: SplitsState = {
    game: 'Test',
    category: 'Any%',
    splits: [{ name: 'One', target: 30000 }, { name: 'Two', target: 0 }],
    pb: [30000, 25000],
    run: [28000],
    running: false,
    lastAt: 0,
    elapsed: 0,
    attempts: 1,
    golds: [27000],
    keys: true,
  };

  test('splits parse names and targets', () => {
    const parsed = parseSplits('Forest | 45\nCave | 1:30\nCastle');
    expect(parsed[0]).toEqual({ name: 'Forest', target: 45000 });
    expect(parsed[1]).toEqual({ name: 'Cave', target: 90000 });
    expect(parsed[2]).toEqual({ name: 'Castle', target: 0 });
  });

  test('deltas and best segments compare against the saved run', () => {
    expect(delta(28000, 30000)).toBe(-2000);
    expect(delta(undefined, 30000)).toBeNull();
    expect(totalOf([1000, 2000])).toBe(3000);
    expect(bestSegments(state)).toEqual([27000, 25000]);
    expect(sumOfBest(state)).toBe(52000);
  });
});
