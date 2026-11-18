import { registerToolStrings, t as translate } from '../../core/i18n.svelte';
import type { ToolContext, ToolInstance } from '../../core/registry';
import type { PresetValues } from '../../core/template/schema';
import { WORD_LANGS, cachedPack, loadWordPack, packName, type WordLang } from '../../data/words/packs';
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
import en from './locales/en';

// A tool's words travel with its chunk; the shell only knows its title.
registerToolStrings('words', en);
import meta from './meta';
import preset from './preset';

export interface ScoredWord {
  word: string;
  score: number;
  exact: boolean;
}

export interface WordsState {
  lang: WordLang;
  /** False until this language's pack has arrived; every action waits for it. */
  ready: boolean;
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
    ready: false,
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
    board: { words: [], key: [], revealed: [] },
    showKey: false,
    extra,
    history: [],
  });

  function allWords(): string[] {
    return [...(cachedPack(data.lang)?.words ?? []), ...data.extra];
  }

  /** Fetch this language's pack (a chunk); answers false when the language moved on. */
  async function ensurePack(): Promise<boolean> {
    const wanted = data.lang;
    await loadWordPack(wanted);
    if (data.lang !== wanted) return false;
    data.ready = true;
    return true;
  }

  /**
   * A board only exists while Codenames is on: it is derived from the pack, so building
   * one on open would change a state that was just restored from a save.
   */
  function ensureBoard(): void {
    if (data.mode !== 'codenames' || data.board.words.length) return;
    if (!data.ready) {
      void ensurePack().then((ok) => {
        if (ok) ensureBoard();
      });
      return;
    }
    data.board = codenamesBoard(ctx.rng, allWords());
  }

  void ensurePack().then((ok) => {
    if (ok) ensureBoard();
  });

  function note(text: string): void {
    data.history = [text, ...data.history].slice(0, 10);
  }

  const instance: WordsInstance = {
    data,
    state() {
      // `ready` is whether this language's chunk has arrived, not something a save
      // should carry: it is derived from the cache on load instead.
      const { ready: _ready, ...rest } = JSON.parse(JSON.stringify(data)) as WordsState;
      return rest as WordsState;
    },
    load(state) {
      if (!state || typeof state !== 'object') return;
      const raw = state as Partial<WordsState>;
      if (WORD_LANGS.includes(raw.lang as WordLang)) data.lang = raw.lang as WordLang;
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
      data.ready = Boolean(cachedPack(data.lang));
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
      if (!data.ready) {
        void ensurePack().then((ok) => {
          if (ok) ensureBoard();
        });
      }
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
        const checked = translate(
          data.check.valid ? 'words.summary-in' : 'words.summary-not-in',
          { word: data.check.word, pack: packName(data.lang) },
        );
        const close =
          !data.check.valid && data.check.close.length
            ? ` ${translate('words.summary-close', { words: data.check.close.join(', ') })}`
            : '';
        return checked + close;
      }
      if (data.scored.length)
        return data.scored
          .map((row) => translate('words.summary-scored', { word: row.word, score: row.score }))
          .join(', ');
      if (data.results.length) return data.results.join(', ');
      if (data.picked.length) return translate('words.summary-letters', { letters: data.picked.join(' ') });
      if (data.mode === 'codenames')
        return translate('words.summary-codenames', { words: data.board.words.join(', ') });
      return translate('words.summary-none');
    },
    setLang(next) {
      if (next === data.lang) return;
      ctx.undo.push(translate('words.undo-lang'));
      data.lang = next;
      data.results = [];
      data.scored = [];
      data.check = null;
      data.picked = [];
      data.ready = Boolean(cachedPack(next));
      note(translate('words.note-pack', { pack: packName(next) }));
      data.board = { words: [], key: [], revealed: [] };
      void ensurePack().then((ok) => {
        if (ok) ensureBoard();
      });
    },
    setMode(mode) {
      if (mode === data.mode) return;
      data.mode = mode;
      data.results = [];
      data.scored = [];
      data.check = null;
      ensureBoard();
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
      ctx.undo.push(translate('words.undo-extra'));
      data.extra = text
        .split(/[\s,\n]+/)
        .map((word) => normalise(word))
        .filter(Boolean);
    },
    run() {
      if (!data.ready) {
        void ensurePack().then((ok) => {
          if (ok) instance.run();
        });
        return;
      }
      if (data.seed.trim()) ctx.rng.seed(data.seed.trim());
      const words = allWords();
      data.results = [];
      data.scored = [];
      data.check = null;
      switch (data.mode) {
        case 'check': {
          const word = normalise(data.query);
          if (!word) {
            ctx.toast(translate('words.toast-type'));
            return;
          }
          const set = new Set(words);
          const valid = set.has(word);
          data.check = { word, valid, close: valid ? [] : closeMatches(words, word) };
          note(
            translate(valid ? 'words.summary-in' : 'words.summary-not-in', {
              word,
              pack: packName(data.lang),
            }),
          );
          ctx.audio.play(valid ? 'success' : 'buzzer');
          break;
        }
        case 'filters':
          data.results = filterWords(words, data.filters);
          note(translate('words.note-matches', { count: data.results.length }));
          break;
        case 'anagram':
          data.results = anagramWords(words, data.letters || data.query);
          note(translate('words.note-anagrams', { count: data.results.length }));
          break;
        case 'rack':
          data.scored = rackWords(words, data.letters || data.query, data.blanks, data.lang);
          note(translate('words.note-rack', { count: data.scored.length }));
          break;
        case 'letters':
          data.picked = pickLetters(ctx.rng, data.lang, data.count);
          note(translate('words.summary-letters', { letters: data.picked.join(' ') }));
          break;
        case 'codenames':
          instance.newBoard();
          break;
      }
      ctx.haptics.buzz('short');
    },
    newBoard() {
      if (!data.ready) {
        void ensurePack().then((ok) => {
          if (ok) instance.newBoard();
        });
        return;
      }
      ctx.undo.push(translate('words.undo-board'));
      data.board = codenamesBoard(ctx.rng, allWords());
      data.showKey = false;
      note(translate('words.note-board'));
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
