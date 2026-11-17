# Changelog

All notable changes to Game Buddy. The template format is versioned separately
(`format: 1`) and only changes with a compatibility note.

## Unreleased — M10 localization (five languages complete)

### Added

- **A language layer.** `t()` now resolves through a dictionary instead of a fixed map.
  Every language, English included, is a chunk that arrives when it is picked and is
  never fetched; `main.ts` waits for the first one before it mounts, so no words are
  compiled into the start-up and the first visit fell by 5.6 KB. There is no English
  safety net under a translation — `tests/i18n.test.ts` resolves every literal `t('…')`
  call and compares each shipped language against the English key set, which is what
  keeps a raw key off the screen.
- **A language switcher** in the header. It lists only the languages the build carries,
  opens a sheet like the sound board, and saves the choice with the other settings.
  The wordmark folds away under 26rem so four 48 px controls still fit a 320 px phone.
- **Per-tool words.** A tool keeps its strings in `src/tools/<id>/locales/<lang>.ts` and
  registers the English one with `registerToolStrings`, so its text travels in its own
  chunk. `bun run gen` gathers the translations into one `tool-text-<lang>.generated.ts`
  per language for the tools that have them.
- **A build filter.** `bun run build --langs=nl` drops every other language chunk through
  a bundle-time plugin, without touching the generated files. English is not special: a
  build that leaves it out carries no English words at all.
- **Localized diagnostics.** The parser, the schema and the theme reader print `diag.*`
  keys through `translate()` in the new plain `core/i18n.ts`; the reactive
  `core/i18n.svelte.ts` on top of it is what views import, so logic never takes a rune.
  The English wording is unchanged, so every existing message still reads the same.
- **German, Spanish and French, complete.** Each is `core/locales/<lang>.ts` plus
  twenty-one `src/tools/<id>/locales/<lang>.ts`, gathered by `bun run gen` into one
  `tool-text-<lang>.generated.ts`; the header switcher lists all five and the choice is
  saved with your settings. The gate compares every language against the English key
  set, so a language only ships when nothing is missing.
- **Every tool's copied summary.** `summaryOf` and `stepLabel` went through `translate()`
  in the last ten tools — bag, buzzer, custom, decks, draft, pick, prompts, script,
  splits and words — so the copy button and the play log use the active language
  everywhere.

### Changed

- **The shell is in five languages.** Home, session, gallery, settings, editor, play
  log, display, self-test, the import and finish sheets, the toasts and the undo labels
  all go through `t()`, with complete `core/locales/en.ts`, `nl.ts`, `de.ts`, `es.ts` and
  `fr.ts`.
- **All twenty-one tools are in all five languages**, view, aria labels, actions, toasts
  and undo labels included. Their tool titles and blurbs are keys too,
  so the home shelf and the gallery follow the switch.
- **The deferred ceiling moved once, 250 KB to 320 KB**, because three complete
  translations cost 66.4 KB; `ROADMAP.md` §5.2 has the arithmetic.
- Dates and times in the session summary, the finish sheet and the play log now use the
  active language (`toLocaleDateString(language())`).

### Known limits

- **A language costs about 22 KB gzipped, so languages are where the deferred budget
  goes.** The three new ones took the deferred total from 236.2 KB to 302.6 KB, which is
  why the ceiling moved once to 320 KB (`ROADMAP.md` §5.2). A sixth language needs its
  own arithmetic before it ships.
- **The five dictionaries are hand-written translations, not reviewed by native
  speakers.** Wording follows `docs/STYLE.md` (plain, warm, short) and the English key
  set exactly, but a language pass by a speaker is the human check that remains.

## Unreleased — counting mode, I Bid You Not and the gallery grid

### Added

- **Counting mode for counters.** `[tool counters]` takes `mode: count` beside the
  default `mode: bank`. Counting has no pool: `+` adds `step` straight to a counter and
  `−` takes `down` away (0 means "the same as `step`"), never below zero. Bank mode is
  unchanged: `+` and `−` both move `step` between the bank and a counter, so `down`
  applies only while counting. The view shows both amounts on each row and hides the
  bank while counting.
- **I Bid You Not.** A twentieth first-party template, with blind bids from
  `[tool reveal] mode: bid` and the score pile kept as a ledger. Its rule page now
  carries setup, so the "no verified rulebook" reason recorded in the audit no longer
  applies; the set covers 47 of the 100 catalogue entries (11 collections, 9 standalone
  games). Its auction paddle mark ships beside the file.

### Changed

- `bun run gen` indexes 60 templates, 60 marks and 81 files for the template lint.
- The Slippery Slopes counter uses counting mode: `+5` for a correct guess and `−1` for
  each Glidy Gifts action, as its rulebook says. Mammoth Messages and Naivigation use
  counting mode too, after bank-mode counters could not add anything with an empty bank.

### Fixed

- **The gallery no longer scrolls sideways.** The two-column template grid used `1fr`
  tracks, whose automatic minimum is the widest card's content, so between 34rem and
  roughly 40rem the list was wider than the page. The tracks are now `minmax(0, 1fr)`,
  which keeps the gallery inside the viewport down to 320 px, as `docs/STYLE.md`
  requires.

### Known limits

- A real play test of each template beside its physical game, and the look of each mark
  in both themes, are human checks in `ROADMAP.md` §7 and are not claimed.
- Blind bids record 0 to 100, which covers the base deck and Double Devices; the
  negative numbers in Odd Inventions have to be noted by hand.

## Unreleased — catalogue audit

### Added

- **Ten more Pandaqi templates.** Throneless Games and Keebble Games as collection
  templates, plus Captain Flip, Magnetmen, Waterfall, Firecrackers, Hasty Accusations,
  The Game of Dilemmas, Slippery Slopes and Mammoth Messages. Nineteen first-party
  templates then covered 46 of the 100 catalogue entries: 11 collections and 8 standalone
  games. Tools follow the verified rules: a one-life elimination track for Hasty
  Accusations, a five-round score for Dilemmas, a word checker and score for Keebble,
  a 2-minute timer and 5-point counter for Slippery Slopes, and a 60-second timer and
  shared counter for Mammoth Messages.
- **Named audit reasons for the other 54 entries.** The folder README now lists every
  remaining game under one of five causes: no shared core, already runs on
  pandaqi.com, the table is the game, no verified rulebook, or an older project or
  expansion. No entry is omitted and no rule is inferred.

### Changed

- `bun run gen` indexed 59 templates, 59 marks and 80 files for the template lint at
  that point.
- The roadmap, root README and folder ledger carry the new counts and the narrowed
  template scope.

### Fixed

- **Bag warning.** The Bag tool now reads `instance.assignedTo()` through `untrack`,
  so the intentional one-time read no longer warns during `svelte-check`; behaviour is
  unchanged. `svelte-check` reports 0 errors and 0 warnings.

### Known limits

- A real play test of each new template beside its physical game, and the look of each
  new mark in both themes, are human checks in `ROADMAP.md` §7 and are not claimed.

## Unreleased — M8 and M9

### Added

- **Pandaqi's own games.** Nine first-party templates in
  `src/data/templates/pandaqi/`, one for each of nine collections in the pandaqi.com
  catalogue: Bidding Blocks, Mapped Out, Death by Digits, Fiddlefoo, The Luck Legends,
  Naivigation, Chiptales, Feed the Beast and Maybe Games. Each carries the rules sheet
  and only the trackers its published rules support: scorepads for Bidding Blocks,
  Mapped Out, Fiddlefoo, Chiptales and Maybe Games, turn phases where the round has
  them, a damage tally for Naivigation, and no scorepad for Death by Digits, The Luck
  Legends or Feed the Beast, whose endings are a correct accusation, a race to a card
  or point total, or an empty food storage. The folder's README records the 100-entry catalogue audit, which
  collections are templated and which are not, and the rule pages each summary was
  checked against.
- **Pandaqi gallery filter.** A collection chip beside All, Favourites and Recent
  narrows the gallery to the first-party set; the tag dropdown keeps the family tags.
  Every file in the folder carries `tags: pandaqi`, and the linter fails one that does
  not.
- **Nine new marks.** One drawn SVG per new template, beside it on the 24 px grid,
  in `currentColor` at 1.8 px. A test asserts every shipping template resolves a mark
  and that no drawing uses text, an image or a different grid, which is the “no letter
  in a box” rule as far as a machine can check it.

### Changed

- `bun run gen` scans `src/data/templates/` and its `pandaqi/` folder, refuses a
  duplicate template id, and indexes marks from both folders; `lint:templates` lints
  both, so the round-trip and lint counts now cover 49 templates and 70 files.
- The user guide, template format, style guide, licensing notes and roadmap describe
  the first-party folder, the filter and the new mark set.

### Known limits

- A real play test of each Pandaqi template beside its physical game, and the look of
  each new mark beside its title in both themes, are human checks listed in
  `ROADMAP.md` §7. They are not claimed here.

## Unreleased — M7 (partly)

### Added

- **Theme files.** A `.gamebuddy-theme` is plain text over the design tokens: paper,
  ink, the six family accents, radii, font stacks, `hide-chrome` flags, and `dark-`
  values for dark mode. Settings holds a paste box and a file picker, the checker
  reports line numbers, and everything is applied as custom properties. Values are
  validated against a fixed key list and strict colour, length and font patterns, so a
  theme cannot add CSS rules or fetch anything. Contract: `docs/THEME-FORMAT.md`.
- **Dice lab.** The dice tool has a third mode for custom word faces: type the faces,
  choose one to twelve dice, roll, and see the tally. **Save set** keeps a face list by
  name, and a template can carry faces and sets with `faces`, `lab-count` and `sets`.
  Faces are text, not pictures, so they read aloud and print in black and white.
- **Initiative order.** The turns tool can follow initiative instead of a fixed order:
  a value per seat, highest first, next and previous through that ranking, and a new
  round that clears the values. A template can start from `mode: initiative` plus
  `initiative: Ada=18, Bo=12`.
- **Play log: search, filters, playtime and win rates.** Filter by text, game, player
  or "won by someone"; the stats show time at the table and win rate per player, and
  CSV/JSON export follows the filters. The finish flow now records how long the session
  ran.
- **"What should we play?"** The gallery gained a length filter and its suggestion
  button now picks from the filtered list instead of the whole catalogue.
- **Docs and tests**: `docs/THEME-FORMAT.md`, theme, initiative, custom-face and log
  stats tests, and the user guide entries for each feature.

### Changed

- Play records carry `minutes`; the CSV gains a `Minutes` column.
- The `turns` preset gains `mode` and `initiative`; the `dice` preset gains `faces`,
  `lab-count` and `sets`.

### Fixed and continued (second M7 pass)

- **Settings can no longer be locked away.** A theme could hide the gear, and the only
  page that removes a theme is Settings. `hide-chrome` now accepts `sound` and `mute`
  only; `settings` warns and is ignored, the Settings page has its own Home link, and
  docs say where else Settings is always reachable.
- **Clearing a dice face no longer wipes the set.** Editing one face left the list with
  an empty slot, which the cleanup treated as a one-face die and reset to Hit/Miss.
  Blanks now stay slots while editing; rolling and saving only use named faces, with a
  clear message when fewer than two are named.
- **Huge mode.** A settings scale above table mode for a large screen or low vision:
  bigger type and spacing, full-strength dim text, no control hidden.
- **Narrator voice.** The script tool can read `say` steps aloud with the device's own
  voice (`voice: yes` in a template). It is always paired with the written step, and a
  device without speech stays silent instead of failing.
- **Session files return to the upload panel.** The picker accepted `.json` and the old
  import path read it, but the upload panel and drag-and-drop only counted `.gamebuddy`
  and `.txt` as importable, so an exported session was silently ignored. A session now
  resumes from either path; templates in the same batch stay in Recently imported.
- **Template icons.** `[game]` accepts `icon: catan` (a bundled mark name) and the gallery and
  home draw it beside the game. Unknown names are ignored rather than becoming an
  error, so older and newer files both open.
- **Specific game marks.** Forty-one hand-drawn SVGs, one per bundled template, name
  the games directly (`icon: catan`, `werewolf`, `uno`, `monopoly`, `scrabble`, `poker`,
  `d20`, `azul`, `dixit`, `gloomhaven`, `hanabi`, `pandemic`, `risk`, …) instead of a
  generic house mark standing in for all of them.
- **Title beside the mark.** In the gallery and on home the template's name sits next
  to its icon on one line, vertically centred, rather than wrapping underneath on
  narrow screens. Tool screens keep their icon above the name.
- **Pick views: wheel and slot.** A result can be shown as a spinning wheel (slice
  geometry and the stopping angle are pure functions) or a slot strip that lands the
  winner in the middle. Both keep the winner as readable text, hide the decoration from
  screen readers and stop moving when reduced motion is on.
- **House-rule variants.** `[variant quick]` adds optional rules with `name:`, `players:`
  and `time:` keys plus free text. The start sheet offers "Base rules" and each
  variant; choosing one appends its text to the rules sheet. It never changes tool
  settings, so a variant cannot break a scorepad or timer.
- **Tool authoring kit.** `tests/tool-contract.test.ts` runs the contract in
  `docs/TOOL-AUTHORING.md` against every tool folder: metadata vocabulary, JSON state,
  tolerant `load`, `summary`, commands, `results`, preset keys and the example file.
  A new folder is covered automatically.
- **Installable hosted build.** The hosted build now carries a web app manifest, a
  lantern icon and a small service worker. The worker is network-first and falls back
  to its cache, so an update is picked up immediately and a lost connection still
  opens the app; the single-file copy deliberately ships without a worker.
- **Reveal screen-reader tutorial.** The dealt-roles screen has a folded guide for
  screen-reader and keyboard players: hold Space or Enter to reveal, release to hide,
  Escape to cancel, Next player to move on, and roles are text and untimed by default.
- **QR sharing.** The game menu can draw a QR of the template's share link, for a phone
  across the table. The encoder is vendored MIT code in its own chunk and only loads
  when a code is requested; the code is black on white so it scans in any theme. A
  template too large for one symbol says so and offers the link instead.
- **Community templates.** `src/data/community/*.gamebuddy` is compiled in at build
  time, tagged `community` in the gallery and checked by the same linter. Submission
  rules are in `docs/COMMUNITY.md`.
- **Switch access.** A settings option enlarges every target to 64 px, thickens the
  focus ring and removes hover movement, for one-switch and head-pointer use.
- **Modes are separate pills.** The shared `.modes` control no longer puts six choices
  inside one heavily rounded slab: each mode is its own pill, the active one takes the
  family accent, and they wrap.
- **Tool and player rows wrap and fold.** A session with many tools shows one quiet line
  (marks, active tool, count, chevron) that opens into wrapped chips; the player strip
  wraps too. Neither scrolls sideways, and neither clips its own focus ring.
- **Mark chunk.** The template marks now load in their own chunk after first paint
  instead of riding in the start-up payload; house marks still draw immediately and the
  gallery reserves their slot.
- **Pandaqi copy pass.** Tool blurbs, the About text and the style guide's copy examples
  are rewritten in the project voice; the user guide already spoke that way.
- **Icons live with their owners.** Each bundled template keeps its drawing beside the
  file (`catan.gamebuddy` and `catan.icon.svg`); each tool keeps its own mark in
  `src/tools/<id>/icon.ts` and imports it from its metadata. There is no central icon
  file left to update, and deleting a template or tool deletes its drawing with it.
- **Bring your own files, images and theme.** The templates page ends with an upload
  panel: pick or drop a `.gamebuddy`, its images and a `.gamebuddy-theme` together. An
  image named like the template's `icon:` — or like the template file — becomes its
  mark, stored on the device; the theme applies at once. No server is involved.
- **The shelf is shorter.** Home shows the everyday tools plus the last three opened,
  with one button for the full list; search still looks at every tool.
- **Version and attribution.** Settings ends with who made the framework, the version
  and links to pandaqi.com and the repository. The version is written once, in
  `package.json`; `bun run gen` copies it out and the stale-file check catches drift.
  Versions follow semantic versioning. The version is now 0.2.0.

### Known limitations

- Translation (M10) is not in this pass: string extraction, a language switcher and
  a Dutch build are still planned in `ROADMAP.md` §6.
- The service worker is network-first, not a full precache, so the very first offline
  visit needs the app to have been opened once online. Offline install verification
  needs a real hosted HTTPS origin; the offline single file remains the sure path.
- The file picker button is styled with `::file-selector-button` and the WebKit
  pseudo-element; browsers that support neither keep the native control, which is
  usable but does not match the rest of the sheet.

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

### Shell fixes (M6 pass)

- **Screens open at the top.** A hash route change and a tool tab swap both reset the
  document scroll, so settings, a tool or a session never opens halfway down where the
  last screen was left.
- **The gear toggles settings.** The header's settings button remembers the screen it
  was opened from; pressing it again closes settings and goes back there.
- **Seats only where they matter.** Every tool declares `meta.seats` (`multi`, `one`,
  `none`). A tool that is not player-bound starts with one seat and hides the player
  strip; a single-player tool starts folded behind a quiet one-line bar with dots and a
  count, and a multi-player tool opens it. Nothing is lost: the bar unfolds and the
  full player sheet is one tap away, however many seats a game has.
- **Bag seats.** Drawing in per-player mode follows the active seat — from the seat
  strip or the bag's own row — instead of silently pouring the next player's tiles
  into the first tray.

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
