# ROADMAP

**PQ-GAME-BUDDY** is a small library of tools that help people while playing _board games_, _video games_, or game-like activities in general.

> Doc version 4 · 2026-11-17 · Owner: Tiamo / Pandaqi
>
> **Status: M0–M6 code shipped; M7 (stretch) and M8 (Pandaqi's own games) are planned.**
> `bun run check` passes end to end: stale-manifest check, `tsc`, `svelte-check`
> with 0 warnings, the full test suite, template lint (61 files · 0 errors · 0
> warnings) and a build inside budget (125 KB gzipped first visit, 265 KB single
> file). 21 tools are live and 40 game templates plus 21 tool examples ship. M6
> replaced the visual language twice: the second pass is the woodland lantern table
> in `docs/STYLE.md`, with self-hosted Dosis and Raleway, borderless fills, folds and
> bouncy one-shot motion. The release gates
> that need a human — hosting, the device matrix, screen-reader passes, the
> five-person first-use test, low-end profiling, the daylight visual audit and the
> screenshot set — are listed in §7 and are **not** done.

This document is the build plan: what the thing must contain, the template system that makes it extensible, the architecture that keeps it tiny, and the milestones that get us to v1.0 and beyond. Detailed reference material lives in `docs/` and is not repeated here.

| Read instead of §4–§5 | Path |
|----------------------|------|
| Template format, every rule and worked example | `docs/TEMPLATE-FORMAT.md` |
| Tool contract, lifecycle, folder layout | `docs/TOOL-AUTHORING.md` |
| Invariants, layers, storage, build | `docs/ARCHITECTURE.md` |
| Using the app as a player or host | `docs/USER-GUIDE.md` |
| Accessibility promises and manual checks | `docs/ACCESSIBILITY.md` |
| Data, template and content licensing | `docs/LICENSES.md` |
| Release steps and post-release smoke list | `docs/RELEASING.md` |
| What changed, in order | `CHANGELOG.md` |

## 0. Summary

**One HTML file. No install, no account, no internet, no build step for the user.** Open it and you have every small utility a game night needs: timers, dice, scorepads, secret role dealers, brackets, word tools, and a template format that turns "Catan" into a two-tap setup.

The trick to supporting "every tool anyone might want" is not to build a hundred shallow tools:

1. **Six primitives** that every tabletop moment reduces to (randomize, time, track, reveal, look up, run a flow).
2. **Twenty-one focused tools** built on those primitives, each with real behaviour and a schema.
3. **Composition**: a template loads several tools at once (timer + score + reveal + rules), so complex games come from combining simple parts.
4. **Extensibility**: a plain-text `.gamebuddy` format, an in-app custom-tool builder, and a plugin contract where a new tool is one folder.

### Milestones at a glance

| # | Milestone | State | What it is |
|---|-----------|-------|------------|
| M0–M2 | Core, shell, first tools | Shipped | Format v1, session model, timer/dice/coin/pick/score |
| M3 | Depth and the launch library | Shipped | lives, counters, turns, reveal, rules, log; 27 templates |
| M4 | Breadth: the long tail | Shipped | decks, bag, bracket, draft, buzzer, script, words, prompts, custom, splits, display mode |
| M5 | Polish, accessibility and release | Code shipped, human gates open | Docs, print, i18n statement, a11y/device/profiling checklist |
| M6 | Style: the lantern table | Shipped | Woodland tokens, Dosis/Raleway, borderless hierarchy, folds, motion |
| M7 | After v1.0 | Planned | PWA, theme files, voice, a writing pass, more languages |
| M8 | Pandaqi's own games | Planned | First-party templates for the pandaqi.com catalogue |

### How to read this document

- **M6.1**, **M6.2** are step IDs. Shipped step IDs are compressed into "shipped" lists rather than kept as specs; the code and `docs/` are the specification now.
- **S / M / L** are relative effort, not calendar promises.
- Every milestone ends with a **definition of done** (DoD). Do not start the next milestone until it is met.
- The implementer contract still holds: order is the plan, zero runtime dependencies, no network, schema first, a tool ships complete, budgets are gates, ambiguity means smaller, pillars win.

## 1. Product

### 1.1 What it is

A **game buddy**: the pile of little things you reach for before, during and after a game. Not the game itself. It replaces the scrap paper, the phone stopwatch, the "who has a d6?", the argument about whether "QI" is a word, and the person who always forgets the scoring rules.

Concretely: a static site you can also save as a single `.html` file and double-click. All state lives on the device. Templates are plain text you can write in Notepad and share in a group chat. **Shipping target:** once v1.0 is done, the built artifacts drop into the `tools` folder at <https://pandaqi.com> and become the public tools again, with the old four tools upgraded rather than duplicated.

### 1.2 Design pillars

1. **Offline or bust.** Zero network requests at runtime. No fonts, images, analytics or "check for updates". Works over `file://`.
2. **Two taps to useful.** Home → tool → doing the thing. No wizards, no onboarding walls, no accounts.
3. **Thumb-first, table-readable.** Big targets, high contrast, one clear action per screen. Designed for a phone lying flat on a table with four people leaning over it.
4. **Depth on demand.** Sane defaults; advanced settings folded behind a "more" affordance. Nobody should have to configure a die to roll it.
5. **Forgiving.** Autosave, undo everywhere, confirm only for destructive actions, resume after a refresh or a dropped phone.
6. **Tiny as a feature.** Hard byte budgets (§5). Every dependency is a decision, and the answer is usually "no".
7. **Playful, not childish.** A little sound, a little haptic, a little personality in the copy. Never confetti in the way of the score.
8. **Yours.** Templates and exported data are plain text. Nothing is locked in a cloud.

### 1.3 Non-goals

- **No virtual tabletop.** We do not render boards, pieces, maps or per-player hidden table state. The physical game (or the actual video game) stays the source of truth.
- **No online multiplayer or sync.** No servers, accounts, lobbies or cloud saves. Shared devices only.
- **No official rules.** Templates carry a short summary in our own words plus a source link. Never copied rulebook text, art or logos.
- **No game engine or AI opponent.** We assist the humans.
- **No tracking, analytics, ads or telemetry.** Ever.
- **No native app.** The single HTML file is the app.

### 1.4 Who it is for and where it runs

| Context | Typical use |
|---------|-------------|
| Board game night | Turn timer, scorepad, first-player pick, rules cheat sheet, setup checklist |
| Card games | Deck shuffler and dealer, life counters, scorepad, dummy-hand helper |
| Party and social deduction | Secret role dealer, anonymous votes, buzzers, narrator script, countdown |
| Word games | Validity check, anagram and rack solver, letter picker, Codenames board |
| Tabletop RPG | Dice pools, initiative order, HP and conditions, random tables |
| Video games (local) | Split timer, stock and life counter, reaction buzzer, bracket, display mode |
| Tournaments and leagues | Brackets, round robin, standings, draft order, session history |
| Escape rooms and timed events | Multi-phase timers, hint and script runner, countdown display |

Devices: Chrome/Edge 87+, Firefox 83+, Safari 14+, iOS 14+, Android 8+; current browsers unlock optional extras such as Wake Lock and display mode. Desktop, tablet, phone, landscape and portrait. A projector or second screen via display mode is a bonus, not a requirement.

### 1.5 Definition of success for v1.0

- A stranger can open one HTML file, pick a bundled template for a game they own, and start playing in under 30 seconds.
- A first-time user can tell what three home tiles do and complete one real action without instructions.
- A game designer can write a first `.gamebuddy` template in under 10 minutes using the docs.
- Every bundled template passes the linter and loads without console errors.
- The whole app (all tools, English data) stays inside the §5.11 budget.
- It works from `file://` on Chrome, Firefox, Edge and Safari, with clearly explained limitations.
- Nothing ever makes a network request.

## 2. Coverage model

### 2.1 The six primitives

| Primitive | Question it answers | Tools built on it |
|-----------|--------------------|-------------------|
| **Randomize** | "Pick, roll or shuffle something" | dice, coin, pick, decks, bag, prompts, words (letter draw) |
| **Time** | "How long, and who is running out" | timer, splits, buzzer, script (waits) |
| **Track** | "What is the number right now" | score, lives, counters, turns |
| **Reveal** | "Who may see this, and when" | reveal, ballot and bids, hidden mode in score, lives and counters |
| **Reference** | "What does the rule say, what are my options" | rules, words, prompts, setup checklists, score targets |
| **Flow** | "What happens next, in what order" | turns, script, bracket, draft |

A tool that does not clearly belong to one of these is probably two tools, or a view of an existing one.

### 2.2 Need to solution

The completeness test. Every row is covered today.

| Need during a game | Covered by |
|--------------------|------------|
| Who goes first, who picks sides | `pick` (seats, order), `coin` |
| Roll any die, including weird ones | `dice` (notation, pools, macros) |
| Shuffle, deal, draw and hide cards | `decks` |
| Draw tiles or tokens blind | `bag` |
| Track time per player or for the whole table | `timer` (multi, flip, chess) |
| Track points per round or per category | `score` |
| Track lives, HP, money, wood, victory tokens | `lives`, `counters` |
| Know whose turn it is and what phase | `turns` |
| Deal secret roles without leaking | `reveal` |
| Anonymous vote, secret bid | `reveal` (ballot, bids) |
| Resolve "is this a word?" or find words from letters | `words` |
| Generate prompts, ideas and constraints | `prompts` |
| Remember the setup steps | `rules` (checklist) |
| Teach a new player quickly | `rules` (quick card) plus `timer` |
| Run a tournament | `bracket` |
| Pick teams fairly | `pick` (teams) |
| Draft cards or players | `draft` |
| First-to-tap reaction contest | `buzzer` |
| Alert and ambience sounds | core cue sheet (speaker button on every screen) |
| Narrate a scripted round (Werewolf night) | `script` |
| Practice speedruns | `splits` |
| Track history, win rates and streaks | play log page |
| Show something huge to the table or a stream | display mode (§3.2) |
| A scoring sheet for a weird game | `custom`, or `score` formulas |
| Print the result | print styles and the game menu |
| Share the setup with a friend | `.gamebuddy` file or link |
| Pick up next game night where we stopped | sessions and autosave |

### 2.3 Escape hatches

1. **Custom tool builder** (`custom`): fields, counters, checklists, a table and safe formulas. Covers one-off score sheets and house rules.
2. **Script runner** (`script`): ordered steps that say, wait, reveal and control timers. Covers narrators, event decks, escape-room flows.
3. **Plugin tool**: a folder in `src/tools/` with metadata, a preset schema and a state entry. See `docs/TOOL-AUTHORING.md`.

Because templates compose tools, an "unsupported" game is almost always expressible as `timer + score + reveal + rules` with the right settings.

## 3. Tools that ship

Every tool already meets the per-tool requirements: instant default, one obvious action, no dead settings, serialize/restore, undo, preset schema, `example.gamebuddy`, export, keyboard path, labels, 48 px targets, no network, inside the per-tool budget, empty and error states.

### 3.1 Tool index

| Tool | id | One-liner | Preset keys |
|------|----|-----------|-------------|
| Timer | `timer` | Countdown, stopwatch, flip, chess, interval, sequence | `mode`, `duration`, `per-player`, `players`, `layout`, `warn-at`, `sound`, `haptic`, `increment`, `delay`, `interval`, `count`, `phases`, `start` |
| Dice | `dice` | Any notation, pools, macros, seeds | `roll`, `pool`, `advantage`, `success-at`, `seed`, `macros` |
| Coin | `coin` | Fair or weighted, call-it, best-of | `coins`, `fairness`, `mode`, `target` |
| Pick | `pick` | Numbers, lists, teams, seats | `source`, `values`, `count`, `replacement`, `teams`, `view`, `seed` |
| Score | `score` | Totals, rounds, categories, ledger, formulas | `mode`, `rounds`, `categories`, `formula`, `win`, `target`, `hint`, `hidden`, `start`, `step` |
| Lives | `lives` | HP, lives, tracks, conditions, elimination | `lives`, `max`, `step`, `mode`, `elimination`, `extras`, `conditions`, `hidden` |
| Counters | `counters` | Tokens, money, bank, denominations, tallies | `counters`, `shared`, `bank`, `denominations` |
| Turns | `turns` | Order, rounds, phases, turn clock, pass cover | `order`, `phases`, `timer`, `pass`, `auto-start` |
| Reveal | `reveal` | Roles, inspect, ballots, blind bids | `mode`, `roles`, `descriptions`, `auto-hide`, `ballot`, `options`, `min-bid`, `max-bid` |
| Rules | `rules` | Cheat sheet, setup checklist, glossary, scoring | `quick`, `glossary`, `scoring`, `links` |
| Decks | `decks` | Shuffle, cut, deal, draw, hidden hands | `deck`, `decks`, `players`, `deal`, `hidden`, `jokers` |
| Bag | `bag` | Blind draws from tiles with values | `set`, `counts`, `values`, `draw`, `tray` |
| Bracket | `bracket` | Single, double, round robin, groups, Swiss | `format`, `entrants`, `best-of`, `seeding`, `tiebreak` |
| Draft | `draft` | Linear and snake order, clock, auction | `order`, `snake`, `pool`, `seconds`, `auction`, `budget` |
| Buzzer | `buzzer` | First tap wins, false starts, reaction ms | `players`, `delay`, `false-start`, `rounds`, `keys` |
| Script | `script` | Say, wait, reveal, timer, event deck | `steps`, `events`, `event-deck`, `auto-advance` |
| Words | `words` | Validity, filters, anagram, rack, Codenames | `profile`, `mode`, `letters`, `pattern`, `length`, `count`, `blanks`, `seed`, `words` |
| Prompts | `prompts` | Prompt packs, designer mode, custom packs | `packs`, `draw`, `designer`, `locks`, `seed` |
| Custom | `custom` | Build a tracker: fields, counters, table | `fields`, `counters`, `checklist`, `table`, `formula`, `per-player` |
| Splits | `splits` | Speedrun splits against a PB | `game`, `category`, `splits`, `pb`, `keys` |

The play log is a core page plus `results()` on tools, not a twenty-second tool: the finish flow asks each tool for standings, lets the table pick the source when they disagree, and updates the same entry when a result is corrected.

### 3.2 Cross-cutting display modes

- **Table mode**: landscape-friendly, huge type, maximum contrast, enlarged controls, minimal chrome. One toggle in settings, remembered per device.
- **Display and overlay** (`#/display/<instance>`): read-only, controls hidden, very large output, dark or transparent background. The controlling tab broadcasts the active tool's state over `BroadcastChannel`; the display tab never writes. For projectors, second screens and OBS.
- **Print**: `@media print` styles for score sheets, brackets, rules and session summaries, plus "Print this game" in the game menu.

## 4. The `.gamebuddy` template system

The format is frozen at v1 and fully specified in `docs/TEMPLATE-FORMAT.md`. In one paragraph: UTF-8 text, `[game]` metadata, optional `[players]`, any number of `[tool <id> <instance>]` blocks with `key: value` settings, plus `[setup]`, `[rules]`, `[notes]` and `[script <instance>]` content sections. Schema-aware values, line-numbered diagnostics, unknown keys warn instead of failing, and a round-trip test runs on every bundled file.

Three properties matter for planning:

- **A template never modifies itself.** "Save as template" is explicit.
- **Composition is the coverage strategy.** Eleven different games are `timer + score + reveal + rules` with different settings.
- **Content is original.** Short rules summaries in our own words, a source link and a license field on every file; see `docs/LICENSES.md`.

### 4.1 The library

40 game templates ship, plus one `example.gamebuddy` per tool. The gallery groups them by context (party, strategy, card, word, RPG, video, tournament) and filters by players, time and tools used.

| Family | Games |
|--------|-------|
| Board and strategy | Catan, Ticket to Ride, 7 Wonders, Wingspan, Sushi Go, Azul, Splendor, Dominion, Monopoly, Risk, Pandemic, Gloomhaven |
| Card and deduction | Uno, Exploding Kittens, Love Letter, Coup, The Mind, Hanabi, Skull, Decrypto, Dixit, poker, Perudo, chess |
| Dice and push-your-luck | Yahtzee, Phase 10, Perudo |
| Word | Scrabble, Boggle, Bananagrams, Codenames, Just One |
| Party and social deduction | Werewolf, Trivia Night, Escape Room |
| Video game and tournament | Mario Kart night, Smash night, Speedrun practice |
| RPG and cooperative | D&D 5e, Gloomhaven, Kitchen Rush |
| Utility | Kitchen Rush timers, D&D session, house-rule sheets |

Every game template carries a `rules` block and a `[setup]` checklist where setup is non-trivial; utility templates may skip both. All content is our own summary; no copied rules text.

## 5. Architecture, budgets and gates

Full detail in `docs/ARCHITECTURE.md`. The parts that constrain planning:

### 5.1 Invariants

No network, ever. Zero runtime dependencies. Core knows no tools; tools never import each other. Svelte only in the view layer. Only the active tool is mounted, and only its code is fetched. One ticker, timestamps not counters. Budgets are gates. State is plain JSON.

### 5.2 Size budgets

| Budget | Limit | Current |
|--------|-------|---------|
| One chunk, gzipped | 24 KB | 21 KB (words: view, logic and five language packs) |
| All deferred chunks, gzipped | 250 KB | 168 KB |
| Core JS and CSS, gzipped | 45 KB | inside |
| First visit (entry + shared chunk + CSS), gzipped | 150 KB | 125 KB |
| Single file, gzipped | no ceiling: the whole app in one file | 265 KB |

**Why the first-visit budget is 150 KB.** The old 120 KB was written for eleven tools at a 12 KB ceiling and never held; M4 raised it to 200 KB to finish 21 tools. Then views and secondary pages became chunks (`loadView` + `core/ui/LazyView.svelte`) and the 61 template texts moved behind `templateText(id)`, which took the first visit from 196 KB to 119 KB. M5 then made whole tool modules chunks: `src/core/tools.generated.ts` holds one `import()` per tool and the session store awaits it before building a session, so the start-up carries only the shell, the core and each tool's `meta.ts` and `preset.ts`. That took the first visit to 62 KB, and a new tool now costs nothing at start-up at all. Each tool's view then moved back into its own chunk: once the module is itself a lazy import, a second chunk per tool only doubled the requests a session makes (a six-tool game fetched about a dozen), so a tool is one chunk today and that game fetches six. Styles still compile with CSS injected, so a tool's styles ride inside its own chunk and `app.css` is tokens, base, the shared screen primitives and both fonts (60 KB gzipped, 56 KB of it the fonts). The per-chunk ceiling is 24 KB because a chunk is now one screen: the words tool is 21 KB (its view, logic and five language packs) and the next largest chunk is the 61 template texts at 11 KB, so a tool that passes it is one to split rather than a budget to raise. A total ceiling of 250 KB on the deferred chunks keeps the catalogue from sprawling while the first visit stays flat; the deferred total is 168 KB. The core ceiling did not move; the single-file ceiling is gone by design, because that build is the entire app inlined so one file can be copied around. M6 spent about 3 KB of gzipped first-visit budget on its first pass (paper grain, keys, fields, a mark per tool and the family accents), then the second pass replaced that spend with the font layer: Dosis and Raleway are subset, base64-inlined and gzipped to 56 KB inside `app.css`, which is 96 percent of the current first visit. That is the largest single deliberate cost in the app and it is what makes the type warm instead of system-default; the 150 KB ceiling has 25 KB of headroom left. The core ceiling did not move; the single-file ceiling is gone by design, because that build is the entire app inlined so one file can be copied around. The style system is a fixed cost, so the next tool still costs nothing at start-up. These are ceilings, not targets.

### 5.3 Gates

`bun run check` runs: stale-manifest check (`bun run gen --check`), `tsc --noEmit`, `svelte-check` (0 warnings), the full `bun test` suite, `bun run lint:templates`, and `bun run build` (which enforces the budgets above: the first visit, the largest chunk and the deferred total). Deployment and the manual matrix are in `docs/RELEASING.md`.

## 6. Milestones


### M7 — After v1.0 (stretch)

Each item needs its own mini-plan and must keep the offline, no-account, no-network default. None block v1.0.

- **Dice lab** (custom symbol faces, saved sets) and **wheel / slot views** for `pick`.
- **Initiative view** for `turns` (per-player initiative values, next and round reset), so D&D combat stops needing a manual order.
- **Log filters and search**, playtime totals, win rates and "what should we play" by player count and time.
- **A writing pass against the Pandaqi voice**, before localization so the strings are final once. Sampled from <https://pandaqi.com>: direct address ("Try any game that catches your eye"), a concrete picture instead of a category ("Be a math detective and guess the missing numbers"), short sentences, one aside after a dash, first person for the author and "we" for the table, and an exclamation mark at most on a marketing line (never in an error). Work: rewrite `docs/USER-GUIDE.md`, the About panel, the template `notes` and the tool blurbs in that voice, keep the copy rules in `AGENTS.md`, and add three example strings to `docs/STYLE.md` so later copy has a target.
- **Theme files.** A `.gamebuddy-theme` text format: `key: value` lines over the tokens in `tokens.css` (paper, ink, families, fonts, radius, hide-chrome flags), imported from Settings, applied as custom properties on `:root`, validated with line-numbered diagnostics like templates, and never fetched. It works offline and hosted because it is a file the player owns. M6 left the seam: no view may hard-code a colour, radius or shadow.
- **Full string extraction** through `t()` and a first translated UI, once the text is stable. 
  - Make the UI available in English for now, plan a new milestone (M10) to support Dutch and one other language.
  - Add a clean language switcher in the header (click icon -> reveals all languages -> pick)
  - Lazy load all localized/language data instead of bundling into everything by default.
  - Allow filtered builds that only include one language (or some subset of languages chosen), for smaller file sizes (most people only use one language anyway).
  - EVEN BETTER (architecture improvement): keep localized data _with the tool_. Example: each tool has a folder called `locales` within its bundle with one data file per supported language inside. This would keep data close to where it's needed (instead of having one massive localization file) + allow even more fine-grained filtering and lazy loading.
- **PWA install** for the hosted build (service worker, hosted only; the single file stays the offline story).
- **Template improvements**: add the option for a `.gamebuddy` template to have an _icon_. Then plan a new milestone (M9) for giving all the popular game templates a matching icon. (You can do this, you've done it before: check their look/info, create some simple stylized SVG icon to represent that.)
- **Community template gallery**: a static JSON index plus pull-request contributions; no runtime network requirement for the core app.
- **QR sharing** with a tiny in-house encoder, for passing a template to a phone across the table.
- **Narrator voice** using Web Speech (offline voice availability varies; always paired with readable text).
- **House-rule variants** as first-class template sections (`[variant]`), selectable at load time.
- **Plugin authoring kit**: a documented example tool and a conformance test others can run.
- **Accessibility extras**: a "huge mode" beyond table mode, switch-access-friendly layouts, a screen-reader tutorial for the reveal flow.

### M8 — Pandaqi's own games (L, planned)

**Why:** the shipping target is the `tools` folder at pandaqi.com, which already hosts
nearly a hundred of Tiamo's own board games. A first-party template per game turns that
catalogue into two-tap setups and gives the app a reason to live on the same site.

**Plan**

1. **Audit the catalogue** (`pandaqi.com/categories/board-game/`, by series: Bidding
   Blocks, Mapped Out, Death by Digits, Fiddlefoo, The Luck Legends, Naivigation,
   Chiptales, Feed the Beast, …). For each game record player count, length, whether a
   device adds anything (scorepad, timer, secret deal, dice, word check) and which
   primitives it needs. A game a phone cannot help is skipped, not forced.
2. **Series first.** One template per series that composes the shared parts (timer +
   score + rules), with per-game overrides only where the scoring really differs. A
   series with one good template beats ten near-duplicates.
3. **Keep them separate.** Store them in `src/data/templates/pandaqi/` with
   `tags: pandaqi` plus the usual family tags, and give the gallery a "Pandaqi" filter.
   The generator scans both folders, and the linter and round-trip test cover both.
4. **Content rules unchanged.** Original summaries, a source link to the game's page, a
   license field on every file; no copied rules text, art or logos.
5. **Batches of ten**, each ending in `bun run check`, a template-lint pass, one real
   play test and a CHANGELOG line. Do not start the next batch until the last is clean.
6. **Not blocked on new tools.** If a game needs a primitive the app lacks, note it in
   M7 instead of half-building a tool inside a template.

**DoD:** every chosen game has a template that starts clean, passes lint and is reachable
from the gallery's Pandaqi filter; the skipped games and the reason are listed in the
template folder's README.

## 7. What needs you (not the agent)

These cannot be done from this environment and are **not** claimed as done anywhere:

1. **Publish.** Copy `dist/` into the pandaqi.com `tools` folder, add redirect stubs for the old tool URLs, verify HTTPS and a downloaded `file://` copy. Steps in `docs/RELEASING.md`.
2. **Device matrix.** Chrome, Firefox, Edge, Safari desktop, iOS Safari, Android Chrome, plus one browser at the Tier A floor; portrait and landscape; `file://` and hosted.
3. **Screen readers.** VoiceOver and NVDA on timer, score, reveal and turns; keyboard-only pass; contrast check in both themes.
4. **Five-person first-use test.** Find a timer, start it, score a round, load a template; fix every stumble found.
5. **Low-end profiling.** A 2018-era Android device with 4× CPU throttling: time to interactive, memory, long tasks.
6. **A real second screen.** Projector or TV for display mode, to confirm the broadcast and the type size from across a room.
7. **Content review.** Spot-check the licensing notes and the rules summaries before publishing under your name.
8. **Visual audit in daylight.** Table mode on a phone at 2 m in a bright room: one primary action per screen, nothing orphaned or grey, no scrollbar inside a scrollbar. Checklist in `docs/STYLE.md` §9.
9. **Screenshot set.** Capture home, a session, the gallery and the reveal cover in light, dark and table mode for the release page and the pandaqi.com tools index; replace the old screenshots and delete stale visual claims.
10. **A second person restyles a tool** from `docs/STYLE.md` alone and reports where it was ambiguous.

## 8. Risks and mitigations

| Risk | Why it hurts | Mitigation |
|------|--------------|------------|
| Scope creep across 21 tools | Each tool is a small product; half-built tools are worse than absent ones | Ship per family, cut whole families rather than half-building, enforce the §2.2 review question |
| Single-file size versus data | Word packs and templates can dwarf the code | Budgets measured every build, per-tool ceiling, tokens only, no fonts or images |
| `file://` storage differences | Safari may not persist anything | Adapter chain, explicit export, one-time banner, hosted build as the recommended path |
| Timer accuracy under tab suspension | Users will trust it with real games | Monotonic clock, wall-clock resume, visibility resync, Wake Lock, honest limitation text |
| Template format churn | Shared files break and authors lose trust | Freeze at v1, tolerant parsing, unknown keys warn, versioning, round-trip tests |
| Content licensing | Word lists, rules summaries and art are easy to get wrong | Curated public-domain packs, original prose, `LICENSES.md`, About panel, review before release |
| Accessibility debt | Retrofitting costs more and excludes players | Compiler warnings at zero, accessible primitives, audit before release |
| Audio quirks (especially iOS) | Alarms silently fail | Unlock on gesture, visible mute state, every cue has a visual twin |
| A restyle that fights the tools | Pretty can beat usable | M6 kept every behaviour and fixed tokens and contrast; every later style change re-runs the `docs/STYLE.md` checklist |
| Old URL breakage on pandaqi.com | Bookmarks and search traffic | Redirect stubs for every old path, live link check in the release checklist |
| Single implementer, long tail | Motivation and consistency | Milestones are shippable; content work batches; no deadline shortcuts on core |

## 9. Decisions log

Format name `.gamebuddy` (also accept `.txt`). System font stack, no bundled fonts. English data in the single file, other packs in the hosted build. Templates compiled into a generated TS module, never fetched. `.svelte.ts` entries hold the live `$state`. Timers store a wall-clock start plus a monotonic start and take the larger delta. Chess delay is Bronstein-style; increment applies at handover. Tests compile Svelte with injected CSS. No `color-mix()`, `:has()`, container queries or `structuredClone` (Tier A floor).

Score has four modes (simple, rounds, categories, ledger); ledger covers poker stacks and end-game cash. Per-cell notes are keyed `playerId|cell` and never change a total. Hidden information uses one shared `PassThePhone` modal; every cover offers an escape hatch. Reveal roles use press-and-hold plus auto-hide; ballots and bids walk players one at a time behind the same cover. A turn clock starts only when the next player dismisses the cover. `[rules]` and `[setup]` mount an implicit Rules tool. The play log is a core page plus `results()`, not a tool. `hint` is a score setting separate from `target`. Session players are attached before a tool is created; "Sync players to tools" re-reads them on request. Format v1 is frozen with a golden fixture. Formula names resolve to points earned in a category, not raw counts.

M4 choices: word packs are hand-curated original lists (licensed, small) rather than tournament dictionaries, because redistribution rights matter more than exhaustive coverage; the solver says "not in this list", never "not a word". Splits, brackets and draft order keep their arithmetic in `logic.ts` so they are testable without Svelte. Bracket state is only results; the whole tree is recomputed, so undo is a deletion and never drifts. Display mode is a broadcast of the active tool's state, not a second session, so the controller stays the only writer. `[script <instance>]` blocks are injected into a script tool by `toolsForSession`, so a template can narrate without a second `[tool script]` block. Templates with `quick:` text containing commas exposed a serializer/parser asymmetry; single-value text is no longer quoted, and quoting is unwrapped on read.

M5 choices: secondary pages are code-split (`LazyView`, one chunk each, resolved component cached) and views compile with CSS injected, so a screen's styles arrive with its chunk instead of in a stylesheet every first visit pays for; template texts are generated into their own chunk and parsed at `bun run gen` time rather than at start-up. Tool modules became chunks of their own too: the generated manifest carries only each tool's metadata, `core/tools.generated.ts` holds one `import()` per tool and the session store awaits it before building a session, so a chunk is a whole tool. Each tool's view was then folded into that chunk instead of being fetched separately, which halved the requests a session makes; the per-chunk ceiling is 24 KB (one screen), with a 250 KB ceiling on the deferred total. `--mode=site` writes one page per tool and `--mode=single` writes one embedded `index.html`, so the shared app, the static site and the copy-around file all come from one build. The core ceiling did not move; the single-file ceiling was removed as meaningless. Print is a stylesheet plus a menu action, not a separate export pipeline. Localization is scaffolding only, and the docs say so instead of implying translations exist.

M6 choices: one accent per tool family resolved from `data-family` and the `--fam-*` tokens, so a view never names a colour; seats stay stored hex (templates may name one) and are drawn as a filled dot with dark `--on-seat` initials, which clears 4.5:1 on every seat in both themes while keeping the name as the real cue; Dosis and Raleway are self-hosted, subset and base64-inlined rather than fetched, because the offline invariant outranks the bytes and the faces are what make the app feel warm — the 56 KB gzipped they add is the one deliberate large spend, with 25 KB of the first-visit ceiling left; borders are dropped for fills, space and warm coloured shadows, and the few edges that remain are table rules, the focus ring and inset state rings; secondary detail folds behind native `<details>` so a screen can breathe; four motion names, all one-shot, ending in a correct static state; confetti only for a finished game with a winner; the most repeated tool CSS is not copied into 21 views but lives once in `core/styles/components.css`; table mode hides shell chrome on a session screen by tagging the root with the route. The `.gamebuddy-theme` bonus and the Pandaqi voice pass moved to M7 because one adds a format and the other belongs before localization.

## 10. Global definition of done

Every tool and mode, at every milestone, must satisfy all of these before it is considered finished:

- [ ] Works offline over `file://` and when hosted.
- [ ] Makes zero network requests (verified by the self-test stub).
- [ ] Opens in a usable default state with no configuration.
- [ ] State serializes, restores and survives reload.
- [ ] Undo covers the last 50 state changes.
- [ ] Every control is keyboard reachable, labeled and focus-visible.
- [ ] Targets are at least 48 px; layout works at 320 px width and 200 percent zoom.
- [ ] Contrast meets AA in light and dark modes; no colour-only meaning.
- [ ] Uses tokens only: no colour, radius or shadow outside `core/styles/tokens.css`.
- [ ] Reduced motion and muted sound are respected; every audio cue has a visual twin.
- [ ] Has a preset schema and an `example.gamebuddy`; validates from it and serializes back to one.
- [ ] Has an export path (text, CSV or print).
- [ ] Has an empty state, an error state and a help blurb.
- [ ] Stays within its byte and time budgets.
- [ ] Has unit tests for its logic and a smoke test for its mount.
- [ ] Has no console errors or warnings in normal use.
- [ ] Documents any new data source and its license.
- [ ] Is listed in the tool index and the need table; at least one template uses it.

## 11. Keeping this roadmap honest

- **Update at gates, not continuously.** After each milestone, mark what shipped, what slipped, and why.
- **No silent scope creep.** A new idea either replaces something in the current milestone, moves to M7, or is explicitly added with the trade-off written down.
- **Cut by family, never by half-tool.** If time runs short, remove a whole family and keep the rest complete.
- **The document is not the product.** If a spec turns out wrong once there is real code and real players, change the spec and note it. The pillars and non-goals do not move.
- **Never mark a human gate as done.** §7 is the list; the status header repeats it.
