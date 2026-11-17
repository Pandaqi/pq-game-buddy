import type { ToolContext, ToolInstance } from '../../core/registry';
import type { PresetValues } from '../../core/template/schema';
import { wordPack, type WordLang } from '../../data/words/packs';
import {
  EMPTY_FILTERS,
  anagramWords,
  closeMatches,
  codenamesBoard,
  filterWords,
  normalise,
  pickLetters,
  rackWords,
  type CodenamesBoard,
  type WordFilters,
  type WordMode,
} from './logic';
import Words from './Words.svelte';
import meta from './meta';
import preset from './preset';

export interface ScoredWord {
  word: string;
  score: number;
  exact: boolean;
}

export interface WordsState {
  lang: WordLang;
  mode: WordMode;
  query: string;
  letters: string;
  blanks: number;
  count: number;
  seed: string;
  filters: WordFilters;
  results: string[];
  scored: ScoredWord[];
  check: { word: string; valid: boolean; close: string[] } | null;
  picked: string[];
  board: CodenamesBoard;
  showKey: boolean;
  extra: string[];
  history: string[];
}

export interface WordsActions {
  setLang(lang: WordLang): void;
  setMode(mode: WordMode): void;
  setQuery(value: string): void;
  setLetters(value: string): void;
  setCount(value: number): void;
  setBlanks(value: number): void;
  setSeed(value: string): void;
  setFilter(key: keyof WordFilters, value: string | number): void;
  setExtra(text: string): void;
  run(): void;
  newBoard(): void;
  toggleKey(): void;
  revealTile(index: number): void;
}

export type WordsInstance = ToolInstance<WordsState> & WordsActions;

function create(ctx: ToolContext, values: PresetValues = {}): WordsInstance {
  const lang = (values.profile as WordLang) ?? 'en';
  const extra = Array.isArray(values.words) ? (values.words as string[]).map((word) => normalise(String(word))).filter(Boolean) : [];
  const length = Math.max(0, Number(values.length ?? 0));
  const seed = String(values.seed ?? '');
  if (seed.trim()) ctx.rng.seed(seed.trim());

  const data = $state<WordsState>({
    lang,
    mode: (values.mode as WordMode) ?? 'check',
    query: '',
    letters: String(values.letters ?? ''),
    blanks: Math.max(0, Number(values.blanks ?? 0)),
    count: Math.max(1, Number(values.count ?? 7)),
    seed,
    filters: { ...EMPTY_FILTERS, min: length, max: length, pattern: String(values.pattern ?? '') },
    results: [],
    scored: [],
    check: null,
    picked: [],
    board: codenamesBoard(ctx.rng, wordPack(lang).words),
    showKey: false,
    extra,
    history: [],
  });

  function allWords(): string[] {
    return [...wordPack(data.lang).words, ...data.extra];
  }

  function note(text: string): void {
    data.history = [text, ...data.history].slice(0, 10);
  }

  const instance: WordsInstance = {
    data,
    state: () => JSON.parse(JSON.stringify(data)) as WordsState,
    load(state) {
      if (!state || typeof state !== 'object') return;
      const raw = state as Partial<WordsState>;
      if (raw.lang === 'en' || raw.lang === 'nl' || raw.lang === 'de' || raw.lang === 'fr' || raw.lang === 'es') data.lang = raw.lang;
      if (typeof raw.mode === 'string') data.mode = raw.mode;
      if (typeof raw.query === 'string') data.query = raw.query;
      if (typeof raw.letters === 'string') data.letters = raw.letters;
      if (typeof raw.blanks === 'number') data.blanks = Math.max(0, raw.blanks);
      if (typeof raw.count === 'number') data.count = Math.max(1, raw.count);
      if (typeof raw.seed === 'string') data.seed = raw.seed;
      if (raw.filters && typeof raw.filters === 'object') {
        data.filters = {
          min: Number(raw.filters.min) || 0,
          max: Number(raw.filters.max) || 0,
          starts: String(raw.filters.starts ?? ''),
          ends: String(raw.filters.ends ?? ''),
          contains: String(raw.filters.contains ?? ''),
          pattern: String(raw.filters.pattern ?? ''),
        };
      }
      if (Array.isArray(raw.extra)) data.extra = raw.extra.map(String);
      if (raw.board && Array.isArray(raw.board.words) && Array.isArray(raw.board.key)) {
        data.board = {
          words: raw.board.words.map(String).slice(0, 25),
          key: raw.board.key.slice(0, 25),
          revealed: Array.isArray(raw.board.revealed) ? raw.board.revealed.map(Boolean).slice(0, 25) : [],
        };
      }
      data.results = [];
      data.scored = [];
      data.check = null;
      data.picked = [];
      data.showKey = false;
    },
    presetFromState() {
      return {
        profile: data.lang,
        mode: data.mode,
        letters: data.letters,
        pattern: data.filters.pattern,
        length: data.filters.min === data.filters.max ? data.filters.min : 0,
        count: data.count,
        blanks: data.blanks,
        seed: data.seed,
        words: data.extra,
      };
    },
    commands: {
      run: () => instance.run(),
      newboard: () => instance.newBoard(),
      letters: () => instance.run(),
    },
    summary() {
      if (data.mode === 'check' && data.check) {
        return data.check.valid
          ? `"${data.check.word}" is in the ${wordPack(data.lang).name} list.`
          : `"${data.check.word}" is not in this list.${data.check.close.length ? ` Close: ${data.check.close.join(', ')}` : ''}`;
      }
      if (data.scored.length) return data.scored.map((row) => `${row.word} (${row.score})`).join(', ');
      if (data.results.length) return data.results.join(', ');
      if (data.picked.length) return `Letters: ${data.picked.join(' ')}`;
      if (data.mode === 'codenames') return `Codenames board: ${data.board.words.join(', ')}`;
      return 'No word result yet.';
    },
    setLang(next) {
      if (next === data.lang) return;
      ctx.undo.push('word pack');
      data.lang = next;
      data.results = [];
      data.scored = [];
      data.check = null;
      data.picked = [];
      data.board = codenamesBoard(ctx.rng, allWords());
      note(`Switched to ${wordPack(next).name}`);
    },
    setMode(mode) {
      if (mode === data.mode) return;
      data.mode = mode;
      data.results = [];
      data.scored = [];
      data.check = null;
    },
    setQuery(value) {
      data.query = value;
    },
    setLetters(value) {
      data.letters = value;
    },
    setCount(value) {
      data.count = Math.max(1, Math.min(20, Math.round(value)));
    },
    setBlanks(value) {
      data.blanks = Math.max(0, Math.min(4, Math.round(value)));
    },
    setSeed(value) {
      data.seed = value;
    },
    setFilter(key, value) {
      if (key === 'min' || key === 'max') data.filters[key] = Math.max(0, Number(value) || 0);
      else data.filters[key] = String(value);
    },
    setExtra(text) {
      ctx.undo.push('extra words');
      data.extra = text
        .split(/[\s,\n]+/)
        .map((word) => normalise(word))
        .filter(Boolean);
    },
    run() {
      if (data.seed.trim()) ctx.rng.seed(data.seed.trim());
      const words = allWords();
      data.results = [];
      data.scored = [];
      data.check = null;
      switch (data.mode) {
        case 'check': {
          const word = normalise(data.query);
          if (!word) {
            ctx.toast('Type a word to check');
            return;
          }
          const set = new Set(words);
          const valid = set.has(word);
          data.check = { word, valid, close: valid ? [] : closeMatches(words, word) };
          note(`${word}: ${valid ? 'in the list' : 'not in the list'}`);
          ctx.audio.play(valid ? 'success' : 'buzzer');
          break;
        }
        case 'filters':
          data.results = filterWords(words, data.filters);
          note(`${data.results.length} words match`);
          break;
        case 'anagram':
          data.results = anagramWords(words, data.letters || data.query);
          note(`${data.results.length} anagrams`);
          break;
        case 'rack':
          data.scored = rackWords(words, data.letters || data.query, data.blanks, data.lang);
          note(`${data.scored.length} rack words`);
          break;
        case 'letters':
          data.picked = pickLetters(ctx.rng, data.lang, data.count);
          note(`Picked ${data.picked.join(' ')}`);
          break;
        case 'codenames':
          instance.newBoard();
          break;
      }
      ctx.haptics.buzz('short');
    },
    newBoard() {
      ctx.undo.push('new board');
      data.board = codenamesBoard(ctx.rng, allWords());
      data.showKey = false;
      note('New Codenames board');
    },
    toggleKey() {
      data.showKey = !data.showKey;
    },
    revealTile(index) {
      if (index < 0 || index >= data.board.words.length) return;
      const next = data.board.revealed.slice();
      next[index] = !next[index];
      data.board = { ...data.board, revealed: next };
    },
  };

  return instance;
}

export default { ...meta, preset, component: Words, create };
