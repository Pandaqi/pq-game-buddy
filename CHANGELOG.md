# Changelog

All notable changes to Game Buddy. The template format is versioned separately
(`format: 1`) and only changes with a compatibility note.

## Unreleased — M4, M5 and M6

### Style (M6)

- **The lantern table.** Every surface now uses one visual system: cream paper and
  deep forest ink, a lantern glow and CSS-only grain, six bright tool-family accents
  (berry randomize, honey time, teal track, plum reveal, moss reference, sky flow),
  10/16/26/28/999 radii, soft coloured shadows and almost no borders. No network
  asset and no image.
- **Typography.** Dosis and Raleway are self-hosted: downloaded, subset to the app's
  characters and base64-inlined, so the display face is warm and rounded and the body
  is friendly without a single runtime request. A rem scale at 13/15/17/22/30/40/52/72,
  a 72 px die result and 40–72 px score and clock readouts. No number a player must
  read is under 20 px.
- **Hierarchy and air.** Home is a hero scene plus a wash-tinted shelf; a session is a
  quiet strip and then the tool owns the screen with no wrapper card; readouts are the
  loudest thing on every tool, section labels are quiet uppercase Raleway, and
  secondary detail (roll options, history, timer settings) folds behind
  `core/ui/Fold.svelte` instead of crowding the stage.
- **Marks and doodles.** `core/ui/icons.ts` keeps the 24 px mark grid and gains a
  distinct `notes` mark for the sound board, so the header no longer shows two volume
  icons; `core/ui/doodles.ts` adds a woodland hero scene and five doodles as inline SVG
  placeholders for real illustrations.
- **Shape and motion.** Keys are pills that lift on hover without losing their colour;
  fields are cushions; cards float on a soft coloured shadow. Four one-shot motions
  (120/200/280/340 ms): shelf tiles stagger in, a tool blooms when its tab is tapped,
  the fold chevron bounces open. Nothing loops, and confetti appears once for a
  finished game with a winner, never under reduced motion.
- **Shared tool CSS.** The rules most tools repeated moved into
  `core/styles/components.css` — panels, stages, rows, fields, mode switches, keys,
  text helpers, tables and folds. 202 duplicated rules were deleted from the 21 tool
  views and the leftover ink outlines stripped in the same pass.
- **Modes.** Light is cream paper; dark is a dim room with pastel accents; table mode
  is 1.25× type with the shell chrome hidden on a session screen; print is ink on
  white. Seat colours are filled dots with dark initials, readable in both themes.
- **Warm copy** for empty states, confirms, errors and the sound board, plus a
  rewritten `docs/STYLE.md`: woodland tokens, family accents, fonts and their cost,
  shape rules, motion, layout, measured contrast and a restyle checklist.
- Budgets: first visit 65 → 125 KB gzipped (56 KB of it the two fonts), single file
  209 → 265 KB, largest chunk 21 KB, deferred total 164 KB. The 150 KB first-visit
  ceiling holds with 25 KB to spare.

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
