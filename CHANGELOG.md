# Changelog

All notable changes to Game Buddy. The template format is versioned separately
(`format: 1`) and only changes with a compatibility note.

## Unreleased — M4 and M5

### Added

- **Ten tools**: `decks`, `bag`, `bracket`, `draft`, `buzzer`, `script`, `words`,
  `prompts`, `custom`, `splits`. Twenty-one tools are live in total.
- **Decks**: standard, Euchre, Skat, Rummy, UNO, tarot, domino and custom decks;
  shuffle, cut, draw, deal, hidden hands behind the pass-the-phone cover.
- **Bag**: Scrabble, Bananagrams, generic and custom token sets, weighted draws,
  letter values, per-player trays.
- **Bracket**: single and double elimination with a grand-final reset, round robin,
  groups plus playoffs, Swiss; standings with tiebreaks; the tree is recomputed from
  results, so undo never drifts.
- **Draft**: linear and snake order, pool, per-pick clock, auction with budgets.
- **Buzzer**: random arm delay, false-start detection, reaction times in ms, keyboard
  lanes (`A S D F J K L ;`).
- **Script**: `say`, `wait`, `reveal`, `timer` and `note` steps, event deck,
  auto-advance, pause. Templates can narrate through `[script <instance>]` without a
  second tool block.
- **Words**: five curated language packs, validity checks, filters, anagram and rack
  solvers with blanks, letter picker, Codenames board.
- **Prompts**: eleven packs, locks and excludes, favourites, designer mode, custom pack
  import.
- **Custom**: fields, counters, checklist, a table with totals, a safe formula
  evaluator, per-player sheets.
- **Splits**: segments with targets, personal best comparison, gold splits,
  sum-of-best, attempts, `Space` to split and `R` to reset.
- **Display mode**: `#/display/<instance>` shows a read-only, very large readout in a
  second tab or on a projector, fed by `BroadcastChannel` from the controlling tab.
- **Print**: print styles for score sheets, brackets, rules and summaries, plus
  "Print this game" in the game menu.
- **Thirteen game templates**: Scrabble, Boggle, Bananagrams, Codenames, Just One,
  Werewolf, Uno, Exploding Kittens, Mario Kart night, Smash night, Speedrun practice,
  Escape room and Trivia night. Forty game templates and twenty-one tool examples ship.
- **Docs**: user guide, accessibility checklist, licensing notes, release guide, this
  changelog, and `AGENTS.md` for development.
- **Tests**: coverage for decks, bag, bracket, draft, buzzer, script, words, prompts,
  custom formulas and splits arithmetic.

### Changed

- Template serialization no longer quotes single-value text (a value containing a comma
  used to come back with the quotes attached); quoted single values are unwrapped on
  read, so old files still load.
- Token values may be zero (a blank tile counts as zero points) and survive a reload.
- Accent handling in the word tools now strips accents before removing punctuation, so
  "café" checks as "cafe".
- **Screens are code-split, styles included.** The gallery, editor, log, settings,
  self-test and display view load on demand behind `core/ui/LazyView.svelte`, and
  every component compiles with `css: 'injected'`, so a screen's styles arrive with
  its chunk. `app.css` is now only tokens and base styles (1.2 KB gzipped), and the
  build no longer emits the duplicated per-chunk stylesheets it used to write.
- **One tool, one chunk.** A tool imports its own view and exports it as
  `component`, instead of a second `loadView` chunk that only paid off while the
  module was static. Opening a six-tool game now fetches six chunks instead of about
  a dozen; deferred chunks fell from 70 to 31 (167 KB) and the first visit from
  62.1 KB to 61.7 KB. Secondary pages keep their lazy loader, which now lives with
  `core/ui/LazyView.svelte`. The per-chunk ceiling is restated as one screen, 24 KB,
  because the words tool carries five language packs beside its view and logic.
- **Tool modules are lazy.** The generated manifest now carries only each tool's
  metadata; `src/core/tools.generated.ts` holds one `import()` per tool, and the
  session store awaits that import before it builds a session, so a tool's logic,
  state, view and CSS arrive only when a session uses it. The first visit is 62 KB
  gzipped, down from 119 KB, and adding a tool no longer grows it at all. The
  per-chunk ceiling moved from 12 KB to 16 KB (a chunk is now a whole tool; the
  largest is `words` at 15 KB) and all deferred chunks together have a 250 KB
  ceiling.
- **One Svelte compile everywhere.** The dev server now loads
  `scripts/svelte-compile.ts` through `[serve.static] plugins` in `bunfig.toml`, so
  development compiles `.svelte` with the same `css: 'injected'` client output as the
  build and the tests, with `dev` taken from `NODE_ENV`. Dev and production deliver
  styles the same way.
- **Template texts are lazy.** `bun run gen` writes the summaries the lists render
  and puts all 61 template texts in their own chunk, read through `templateText(id)`.
  No template is parsed until one is picked.
- **Three build modes.** `bun run build` is the one-page app, `bun run build:site`
  adds `dist/<tool>/index.html` for every tool (each booting straight into that
  tool), and `bun run build:single` writes one `dist/index.html` with JS and CSS
  embedded and nothing else, for copying around. The first two also write the
  offline `dist/pq-game-buddy.html`.
- The app byte budget is now 150 KB gzipped, measured as the first visit (entry +
  shared chunk + CSS). The first visit is 62 KB, down from 196 KB. The single-file
  build has no ceiling: it is the whole app in one file. Reasoning in
  `ROADMAP.md` §5.2.

### Known limitations

- Word lists are curated starter lists, not tournament dictionaries; the checker says
  "not in this list", never "not a word".
- Copy for the newer tools is English literal text; the `t()` scaffolding and
  pseudo-locale exist, but no translation ships.
- Not built from the M4 sketch: the dice lab for custom symbol faces, wheel and slot
  views for `pick`, a dedicated initiative view for `turns`, and log filters/search.
  They are recorded in M7.
- Device matrix, screen-reader passes, low-end profiling, the five-person first-use
  test and hosting at pandaqi.com are release gates for the owner.

## Earlier milestones

- **M0–M2**: core shell, hash router, storage adapter chain with honest banners,
  session model and autosave, template format v1 frozen with a golden fixture,
  in-app editor with line-numbered diagnostics, import by drag/drop/picker/paste,
  and the timer, dice, coin, pick and score tools.
- **M3**: lives, counters, turns with a turn clock and pass cover, reveal with roles,
  inspect, ballots and blind bids, rules with setup and glossary, the play log with
  wins and streaks, and the first twenty-seven game templates.
