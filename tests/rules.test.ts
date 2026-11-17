import { describe, expect, test } from 'bun:test';
import {
  glossaryFrom,
  glossaryMatches,
  parseRules,
  plainText,
  rulesMatches,
  scoringFrom,
  setupProgress,
} from '../src/tools/rules/logic';

describe('rules text', () => {
  const text = ['# Goal', 'Score the most points.', '- Roll', '- Move', '', '## Details', 'Keep going.'].join('\n');

  test('reads headings, paragraphs and list items in order', () => {
    expect(parseRules(text)).toEqual([
      { kind: 'heading', level: 1, text: 'Goal' },
      { kind: 'paragraph', level: 0, text: 'Score the most points.' },
      { kind: 'item', level: 0, text: 'Roll' },
      { kind: 'item', level: 0, text: 'Move' },
      { kind: 'heading', level: 2, text: 'Details' },
      { kind: 'paragraph', level: 0, text: 'Keep going.' },
    ]);
  });

  test('joins wrapped paragraph lines', () => {
    expect(parseRules('One line\nand another')).toEqual([
      { kind: 'paragraph', level: 0, text: 'One line and another' },
    ]);
  });

  test('empty text has no blocks', () => {
    expect(parseRules('')).toEqual([]);
    expect(parseRules('   \n\n ')).toEqual([]);
  });

  test('strips inline markers without touching the words', () => {
    expect(plainText('**Goal:** `win` __now__')).toBe('Goal: win now');
  });

  test('search keeps only matching blocks', () => {
    expect(rulesMatches(text, 'roll').map((block) => block.text)).toEqual(['Roll']);
    expect(rulesMatches(text, '')).toHaveLength(6);
    expect(rulesMatches(text, 'nothing')).toEqual([]);
  });
});

describe('checklist and glossary', () => {
  test('progress counts checked items', () => {
    expect(setupProgress([{ text: 'a', done: true }, { text: 'b', done: false }])).toEqual({ done: 1, total: 2 });
    expect(setupProgress([])).toEqual({ done: 0, total: 0 });
  });

  test('glossary search matches terms and definitions', () => {
    const glossary = [
      { term: 'meeple', definition: 'a little wooden person' },
      { term: 'trick', definition: 'one round of cards' },
    ];
    expect(glossaryMatches(glossary, 'MEEP').map((entry) => entry.term)).toEqual(['meeple']);
    expect(glossaryMatches(glossary, 'round').map((entry) => entry.term)).toEqual(['trick']);
    expect(glossaryMatches(glossary, '')).toHaveLength(2);
  });

  test('pairs become entries and rows', () => {
    expect(glossaryFrom({ meeple: 'person' })).toEqual([{ term: 'meeple', definition: 'person' }]);
    expect(scoringFrom({ city: '2', road: 1 })).toEqual([
      { name: 'city', points: 2 },
      { name: 'road', points: 1 },
    ]);
  });
});
