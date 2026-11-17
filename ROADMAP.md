# ROADMAP

**PQ-GAME-BUDDY** is a small library of tools that help people while playing _board games_, _video games_, or game-like activities in general.

This document used to be a wishlist. It is now the build plan: every tool the thing must contain, the template system that makes it endlessly extensible, the architecture that keeps it tiny, and the milestones that get us to v1.0.

> Doc version 2 · 2026-11-16 · Owner: Tiamo / Pandaqi
>
> **Implementation status (2026-11-17): M0 and M1 shipped.** `bun run check` passes
> end to end (stale-manifest check, `tsc`, `svelte-check` with 0 warnings, 105 tests,
> template lint, build inside budget at ~70 KB gzipped). Six tools are live: `timer`,
> `dice`, `coin`, `pick`, `score` and a dev-only `demo`; three demo templates lint and
> round-trip. **M2 is next and not started.** See the notes at the end of §8 for
> choices taken while building.

## 0. Summary

**One HTML file. No install, no account, no internet, no build step for the user.** Open it and you have every small utility a game night needs: timers, dice, scorepads, secret role dealers, brackets, word tools, and a template format that turns "Catan" into a two-tap setup.

The trick to supporting "every tool anyone might want" is not to build a hundred shallow tools. It is:

1. **Six primitives** that every tabletop moment reduces to (randomize, time, track, reveal, look up, run a flow).
2. **Twenty-one focused tools** built on those primitives.
3. **Composition**: a template can load several tools at once (timer + score + reveal + rules), so complex games are covered by combining simple parts.
4. **Extensibility**: a plain-text `.gamebuddy` template format, an in-app custom-tool builder, and a plugin contract where a new tool is one folder.

### Milestones at a glance

| # | Milestone | Size | What it ships | You can already play |
|---|-----------|------|---------------|----------------------|
| M0 | Foundations | S | Build pipeline, app shell, router, registry, storage, test harness | Nothing useful yet |
| M1 | Core primitives and the vertical slice | L | Players, clock, audio, timer, dice/coin/pick, undo, basic scorepad, template parser, sessions | A simple game night |
| M2 | Tracking, secrets and turns | L | Full scorepad, lives, counters, turn manager, secret reveal, session log, rules | Most board, card and party games |
| M3 | Templates 1.0 and the game library | L | Frozen format, editor, gallery, sharing, template library part 1 (27), linter | "Insert game, press play" |
| M4 | Breadth: the long tail | L | Decks, bag, dice lab, dictionary and solvers, brackets, drafts, buzzer, script runner, overlay, splits, custom builder | Anything, including word games, tournaments, RPGs and streams |
| M5 | Polish, accessibility and release | M | Accessibility audit, performance pass, docs, publish to pandaqi.com | Public v1.0 |
| M6 | After v1.0 | — | PWA, community gallery, QR sharing, text-to-speech, more languages | — |

### What ships when

- **After M1** the app is already genuinely useful: four flip timers for Kitchen Rush, dice, a coin, a random picker, and a scorepad.
- **After M3** it delivers the original promise: download a `.gamebuddy` file for a popular game, load it, and everything is configured.
- **After M4** there is no realistic game-night need left uncovered without dropping to the custom builder or a script.
- **After M5** it can be dropped into `pandaqi.com/tools/` and handed to strangers.

### How to read this document

- **M0.3**, **M1.4**, **M2.6**, etc. are step IDs. The sequencing table at the end of §6 keeps dependencies straight.
- **S / M / L** are relative effort, not calendar promises. S is a sitting, M is a few sittings, L is a solid chunk of work.
- "Preset:" lists the keys a tool accepts in a template. Every tool has a schema; §4 is the contract.
- Every milestone ends with a **definition of done** (DoD). Do not start the next milestone until it is met.

### Implementer contract

This plan is written to be executed by someone (or something) that has not seen the design discussions. These rules override personal preference:

1. **Order is the plan.** Build M0 to M5 in sequence. Do not start a later tool because it looks fun; the schemas and primitives it needs will not exist yet.
2. **Zero runtime package dependencies.** Svelte 5 is a build-time compiler; its emitted runtime is counted in the core budget. No other framework, icon pack, CSS library or polyfill. Svelte stays in the view layer: parser, storage, ticker, RNG and session remain plain TypeScript. Adding anything else is a design decision for §8, not an implementation detail.
3. **No network, ever.** If a feature seems to need a request, it is the wrong feature. Data ships in the build or is imported by the user.
4. **Schema first.** A tool is not started until its preset schema, state shape and export format are written down. That schema drives the UI, templates, save files and tests.
5. **Every tool ships complete.** Default state, mount and unmount, serialize and restore, undo, export, empty state, error state, keyboard path, screen-reader labels, tests and a template example. A half tool is not merged.
6. **Budgets are gates.** `bun run check` and `bun run size` pass before a step is called done. Never raise a budget to fit code; cut code.
7. **Ambiguity means smaller.** When two readings exist, implement the one with fewer settings, fewer files and fewer pixels, and record the choice in §8.
8. **Pillars win.** If a step contradicts §1.2 or §1.3, the step is wrong. Fix the plan here first, then code.

## 1. Product

### 1.1 What it is

A **game buddy**: the pile of little things you reach for before, during and after a game. Not the game itself. It replaces the scrap paper, the phone stopwatch, the "who has a d6?", the argument about whether "QI" is a word, and the person who always forgets the scoring rules.

Concretely: a static site you can also save as a single `.html` file and double-click. All state lives on the device. Templates are plain text you can write in Notepad and share in a group chat.

**Shipping target:** once v1.0 is done, the built artifacts drop into the `tools` folder at <https://pandaqi.com> and become the public tools again, with the old four tools upgraded rather than duplicated.

### 1.2 Design pillars

1. **Offline or bust.** Zero network requests at runtime. No fonts, images, analytics or "check for updates". Works over `file://`.
2. **Two taps to useful.** Home → tool → doing the thing. No wizards, no onboarding walls, no accounts, and no dialog between opening a tool and using it.
3. **Thumb-first, table-readable.** Big targets, high contrast, one clear action per screen. Designed for a phone lying flat on a table with four people leaning over it.
4. **Depth on demand.** Sane defaults; advanced settings folded behind a "more" affordance. Nobody should have to configure a die to roll it.
5. **Forgiving.** Autosave, undo everywhere, confirm only for destructive actions, resume after a refresh or a dropped phone.
6. **Tiny as a feature.** Hard byte budgets (§5.11). Every dependency is a decision, and the answer is usually "no".
7. **Playful, not childish.** A little sound, a little haptic, a little personality in the copy. Never confetti in the way of the score.
8. **Yours.** Templates and exported data are plain text. Nothing is locked in a cloud.

### 1.3 Non-goals

Explicitly out of scope, so the tool stays small and honest:

- **No virtual tabletop.** We do not render boards, pieces, maps or hidden per-player table state. The physical game (or the actual video game) stays the source of truth.
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
| Tabletop RPG | Dice pools, initiative tracker, HP and conditions, random tables, session notes |
| Video games (local) | Split timer, stock and life counter, reaction buzzer, tournament bracket, overlay display |
| Tournaments and leagues | Brackets, round robin, standings, draft order, session history |
| Escape rooms and timed events | Multi-phase timers, hint and script runner, countdown display |

Devices: Chrome/Edge 87+, Firefox 83+, Safari 14+, iOS 14+, Android 8+; current browsers unlock optional extras such as Wake Lock and display mode. Desktop, tablet, phone, landscape and portrait. A projector or second screen via display mode is a bonus, not a requirement.

### 1.5 Starting point: the four existing tools

The `vault/` folder contains the current hosted tools: CATEGORIZER, DICTIONARY, RANDOMNESS, TIMER. They define a quality bar and a content base, but they are **rewritten from scratch** on the new core. Nothing is copy-pasted; the data is migrated where it is still good.

| Old tool | Becomes | Concrete upgrades |
|----------|---------|-------------------|
| CATEGORIZER | `prompts` plus the glossary in `rules` | Searchable, favorites, lock and exclude per list, weighted draws, "draw 5", saved sets, categories usable as template metadata, localization-ready |
| DICTIONARY | `words` | Multiple languages and dictionary profiles, filters (length, pattern, starts, ends), anagram and rack solver, offline word packs, definitions where licensing allows, instant local lookup |
| RANDOMNESS | `dice`, `coin`, `pick`, later `decks` and `bag` | Full dice notation, custom dice, dice pools, crypto RNG, seeded and reproducible rolls, weighted picks, teams and seating, history and statistics |
| TIMER | `timer` | Multiple simultaneous timers, flip and ping-pong, chess clocks with increment and delay, interval and sequence modes, accurate background catch-up, synthesized alarms, wake lock |

Also kept from the old site: the visual identity (Pandaqi palette, chunky rounded controls, friendly type) and the tone of the copy.

### 1.6 Definition of success for v1.0

- A stranger can open one HTML file, pick a bundled template for a game they own, and start playing in under 30 seconds.
- A first-time user can tell what three home tiles do and complete one real action without instructions.
- A game designer can write a first `.gamebuddy` template in under 10 minutes using the docs.
- Every bundled template passes the linter and loads without console errors.
- The whole app (all tools, English data) is under 300 KB gzipped.
- It works from `file://` on Chrome, Firefox, Edge and Safari, with clearly explained limitations.
- Nothing ever makes a network request.

## 2. Coverage model

### 2.1 The six primitives

Nearly every "I wish I had a tool for that" moment in a game reduces to one of these:

| Primitive | Question it answers | Tools built on it |
|-----------|--------------------|-------------------|
| **Randomize** | "Pick, roll or shuffle something" | dice, coin, pick, decks, bag, prompts, words (letter draw) |
| **Time** | "How long, and who is running out" | timer, splits, buzzer (reaction timing), script (waits) |
| **Track** | "What is the number right now" | score, lives, counters, turns, log |
| **Reveal** | "Who may see this, and when" | reveal, ballot and bids, hidden mode in score, lives and counters |
| **Reference** | "What does the rule say, what are my options" | rules, words, prompts, setup checklists, score targets |
| **Flow** | "What happens next, in what order" | turns, script, bracket, draft |

A tool that does not clearly belong to one of these is probably two tools, or a view of an existing one.

### 2.2 Need to solution

Use this as the completeness test. If a real game-night need is missing from this table, the catalogue is incomplete.

| Need during a game | Covered by |
|--------------------|------------|
| Who goes first, who picks sides | `pick` (seats, order), `coin` |
| Roll any die, including weird ones | `dice` (notation, dice lab, pools) |
| Shuffle, deal, draw and hide cards | `decks` |
| Draw tiles or tokens blind | `bag` |
| Track time per player or for the whole table | `timer` (multi, flip, chess) |
| Give every player a tap-to-reset timer | `timer` grid plus a template |
| Track points per round or per category | `score` |
| Track lives, HP, money, wood, victory tokens | `lives`, `counters` |
| Know whose turn it is and what phase | `turns` |
| Deal secret roles without leaking | `reveal` |
| Anonymous vote, secret bid | `reveal` (ballot, bids) |
| Resolve "is this a word?" or find words from letters | `words` |
| Generate prompts, ideas and constraints | `prompts` |
| Remember the setup steps | `rules` (checklist) |
| Teach a new player quickly | `rules` (quick card, glossary) plus `timer` |
| Remember the scoring rules | `score` targets plus `rules` reference |
| Run a tournament | `bracket` plus `log` |
| Pick teams fairly | `pick` (teams) |
| Draft cards or players | `draft` |
| First-to-tap reaction contest | `buzzer` |
| Alert and ambience sounds | core cue sheet (speaker button on every screen) |
| Narrate a scripted round (Werewolf night) | `script` |
| Practice speedruns | `splits` |
| Track history, win rates and streaks | `log` |
| Show something huge to the table or a stream | display and overlay mode |
| A scoring sheet for a weird game | `custom`, or `score` formulas |
| Print the result | export and print |
| Share the setup with a friend | `.gamebuddy` file or link |
| Pick up next game night where we stopped | sessions and autosave |

### 2.3 Escape hatches

Three levels of "we didn't think of that", in increasing effort:

1. **Custom tool builder** (`custom`): fields, counters, checklists, a table and simple formulas. Covers one-off score sheets, house rules and obscure games without writing code.
2. **Script runner** (`script`): ordered steps that say, wait, reveal and control timers. Covers narrators, event decks, escape-room flows and any game whose structure is "do these things in order".
3. **Plugin tool**: a folder in `src/tools/` with metadata, a preset schema and a `mount()` function. Documented in 10 minutes and picked up automatically by the build. This is the answer when a genuinely new interaction is needed.

Because templates can combine tools, an "unsupported" game is almost always expressible as `timer + score + reveal + rules` with the right settings.

### 2.4 Why not a hundred tools

Breadth without depth produces a directory of dead ends. The 21 tools below each carry real behaviour, real edge cases and a schema. Composition, not count, is what makes coverage exhaustive. A new tool is added only when a whole class of needs cannot be met by composing existing ones. That is the review question for every proposal.

## 3. Tool catalogue

### 3.0 Requirements for every tool

Non-negotiable, checked at every milestone:

- **Instant default.** Opens in a usable state with zero configuration.
- **One obvious action.** Each screen has one visually dominant primary action; everything else is quiet or folded.
- **No dead settings.** Every setting has a default, a UI control and a save path; settings that matter for a preset also have a template key.
- **Session state.** Serializes to JSON, restores exactly, survives reload.
- **Undo.** At least the last 50 state-changing actions (snapshot-based where cheap).
- **Template support.** Declares a preset schema; can be configured from a `.gamebuddy` block; can serialize current settings back to a preset.
- **Example template.** Ships a minimal `example.gamebuddy` in its folder, used by fixtures and the gallery's "try it" path.
- **Export.** Plain-text or CSV summary of whatever the tool knows, copyable; print layouts are a cross-cutting M5 deliverable.
- **Keyboard.** Every control reachable by keyboard; no keyboard traps; visible focus.
- **Accessibility.** Labels, roles, contrast, 48 px targets, no color-only meaning, reduced motion respected, screen-reader announcements only where meaningful.
- **No network.** No fetches, no external assets, no fonts, no CDNs.
- **Budget.** At most 12 KB gzipped code per tool; at most 50 ms to interactive after mount on a mid-range phone, 150 ms on a low-end device.
- **No dead ends.** Empty states explain the next action; destructive actions confirm; errors say what to do.

### Tool index

| Tool | id | One-liner | Milestone |
|------|----|-----------|-----------|
| Timer | `timer` | Every kind of clock, many at once | M1 |
| Dice | `dice` | Any die, any notation, custom faces | M1 |
| Coin | `coin` | Flips with bias and call-it | M1 |
| Pick | `pick` | Numbers, lists, teams, seats, wheels | M1 |
| Score | `score` | Rounds, categories, targets, leaderboard | M1 (basic) / M2 (full) |
| Lives | `lives` | HP, lives, conditions, elimination | M2 |
| Counters | `counters` | Tokens, money, resources, tallies | M2 |
| Turns | `turns` | Order, rounds, phases, pass-the-phone | M2 |
| Reveal | `reveal` | Secret roles, deals, ballots, bids | M2 |
| Log | `log` | History, winners, stats, streaks | M2 |
| Decks | `decks` | Shuffle, deal, draw, flip, hide | M4 |
| Bag | `bag` | Blind draws from tiles or tokens | M4 |
| Bracket | `bracket` | Tournaments and standings | M4 |
| Draft | `draft` | Snake and linear drafts, auctions | M4 |
| Buzzer | `buzzer` | First tap wins, reaction timing | M4 |
| Script | `script` | Run a game flow step by step | M4 |
| Rules | `rules` | Cheat sheets, setup, glossary, scoring refs | M2 |
| Words | `words` | Dictionary, filters, solvers, Codenames | M4 |
| Prompts | `prompts` | Random ideas, prompts, random tables | M4 |
| Custom | `custom` | Build your own tracker | M4 |
| Splits | `splits` | Speedrun split timer | M4 |

Plus three cross-cutting display modes (§3.22): **Table mode**, **Display/overlay**, **Print**. A **global cue sheet** (bell, buzzer, tick, gong, drumroll, success) lives in the core shell rather than as a tool, since it has no session state.

---

### 3.1 Timer

**Purpose:** the clock for everything. The flagship interaction is the multi-timer grid: one big tap target per player, tap to flip your hourglass, exactly like Kitchen Rush.

**Spec:**

- **Modes:**
  - `countdown`: set duration, alarms at zero.
  - `up` / stopwatch: counts up, lap and split button, pause.
  - `flip` / ping-pong: tap restarts from the set duration, used as a per-player hourglass. Tap while running resets (or pauses, configurable); long-press opens a menu.
  - `chess`: two or more clocks, only the active one runs, tap to hand over. Supports **increment** (Fischer), **delay** (simple and US) and **Bronstein**; move counter; flag detection.
  - `interval`: fires every N seconds or minutes; count and optional maximum; useful for "an event every 90 seconds".
  - `sequence`: ordered phases with names and durations, auto-advance or manual; used for setup, rounds and scoring.
- **Multiple timers at once**: add, remove, duplicate; per-timer name, color, duration and sound. Grid or list layout. Start all, pause all, reset all.
- **Controls**: start and pause, reset, plus and minus 30 seconds, scrub-to-set by dragging horizontally on the digits (kept from the old tool), quick presets (30 s, 1 m, 2 m, 3 m, 5 m, 10 m, custom).
- **Warnings**: color shift, optional pulse, configurable warning threshold, quiet tick in the final 10 seconds (off by default), sound at zero (bell, buzzer, gong or silent), vibration pattern, optional spoken countdown via Web Speech (off by default).
- **Accuracy**: one monotonic clock source (`performance.now()`), one shared ticker, catch-up after tab suspension or device sleep, no drift from repeated `setInterval` decrements. Running timers survive reload by resuming from a wall-clock timestamp, not from a counter.
- **Wake lock**: keep the screen awake while anything runs, with a clear "screen must stay on" hint if the API is unavailable. Never claim background operation.
- **Preset:** `mode`, `duration`, `per-player`, `players` (clock count for chess and multi-clock modes), `layout`, `warn-at`, `sound`, `haptic` (none, short, long), `increment`, `delay`, `phases`, `start` (auto or manual).

**Edge cases:** zero or negative durations, more than 99 hours, device sleep mid-run, several alarms at once (queue them), a timer removed mid-run, duplicate names.

---

### 3.2 Dice

**Purpose:** roll anything, from a d6 to a pool of custom symbol dice, and show it clearly.

**Spec:**

- **Standard dice**: d2, d3, d4, d6, d8, d10, d12, d20, d100, dF (Fate), percentile `d%`.
- **Notation parser**: count, sides, modifier, keep and drop highest or lowest (`4d6kh3`, `2d20kl1`), reroll (`r1`), exploding (`!`), success counting (`8d10>7`), advantage and disadvantage (`2d20kh1`), mixed terms (`2d6+1d8+3`). Invalid input gets a plain-language error, not a crash.
- **Dice pools**: mixed dice, total or success mode, target number, botch and fumble detection (configurable), pool presets ("attack", "damage").
- **Dice lab** (ships in M4.1): define a die with arbitrary faces. A face can be a number, a word, an emoji or symbol, a color, or a weighted entry. Save named dice sets to the session and to templates.
- **Visuals**: rendered pips for a d6 (kept from the old tool), numeric faces otherwise, a short roll animation (skipped under reduced motion), and a per-die breakdown so you can see what was rolled.
- **Fairness**: `crypto.getRandomValues` by default; optional **seed** with a visible seed code so a roll can be replayed or shared. Uniform integer sampling without modulo bias.
- **History**: last N rolls with totals and timestamps; optional running average and histogram.
- **Preset:** `set` (standard dice ids), `roll` (notation), `pool`, `advantage`, `success-at`, `seed`, `macros` (named rolls).

**Edge cases:** zero dice, zero sides, enormous pools (cap and warn), overflow totals, custom face collisions, exploding chains that never stop (cap iterations).

---

### 3.3 Coin

**Purpose:** the fastest coin flip on the table, with just enough control for wagers and promise games. It keeps its own tile, despite overlapping Dice, because it is the fastest one-tap action in the app.

**Spec:**

- Fair flip, or biased (0 to 100 percent heads) with the bias shown, because some games use weighted coins on purpose.
- One to ten coins at once; per-coin result and total (heads and tails counts, an "all heads" indicator).
- **Call it**: pick heads or tails before flipping; track call-it wins, losses and streaks.
- Best-of-N or first-to-N mode with a running tally.
- Quick animation and haptic; history of the last 20 flips.
- **Preset:** `coins`, `fairness`, `mode` (single or best-of), `target`.

---

### 3.4 Pick

**Purpose:** every "choose something at random" need, from a number to a full table seating. One data model, several views.

**Spec:**

- **Number**: range, integer or decimal, uniform or bell-curve (2d6-style), unique draws without replacement, step.
- **List**: free entries or imported from template data (player names, prompts, categories); draw one or many; with or without replacement; weights; "remove winner" toggle; result history.
- **Teams**: split N players into K teams, balanced or random; name the teams; reroll; keep teams for the session.
- **Seats and turn order**: random seating arrangement, first player, snake order; drag to adjust manually afterwards.
- **Secret Santa**: assign givers to receivers with exclusions, no self-assignment and no reciprocal pairs (configurable); reveal privately one at a time.
- **What to play**: weighted pick from a list filtered by player count and time available.
- **Views** (wheel and slot machine ship in M4.1): plain list, wheel (spinning sectors, weighted), slot machine, face-down cards. Same data, different skin; the view is a setting, not a separate tool.
- **Preset:** `source` (list, number or players), `values`, `weights`, `count`, `replacement`, `teams`, `view`, `seed`.

**Edge cases:** empty list, one entry, duplicate entries, weights summing to zero, more teams than players, exclusions that make Secret Santa impossible (detect and explain).

---

### 3.5 Score

**Purpose:** replace scrap paper. The scorepad must cover a 13-category Yahtzee sheet, a running Catan total and a poker buy-in ledger without becoming a spreadsheet.

**Spec:**

- **Players**: from the session seat list; add mid-game with a note; colors and initials.
- **Modes:**
  - `simple`: one running total per player, plus and minus one, custom entries, optional step buttons.
  - `rounds`: a grid of players by rounds, per-round entry, automatic totals, optional round caps.
  - `categories`: players by scoring categories, each category worth a multiplier or formula; totals and breakdown.
  - `ledger`: running entries with labels (money, chips, points), positive or negative, running balance.
- **Formulas**: `+ - * /` and parentheses over categories and round cells; `min`, `max`, `sum`, `if`; lowest-wins or highest-wins; target score comparison ("you needed 60, you have 54").
- **Targets and references**: templates can set a typical target ("good score around 65"), rounds and per-category caps. Optional bundled reference data for popular games (average winning score), shown as a hint, never as a rule.
- **Leaderboard**: live ranking, ties shown as ties, final standings with tie-break notes.
- **Hidden mode**: totals hidden until "reveal", for games with secret scores. Hand-off screens prevent peeking.
- **Editing**: tap any cell to edit, long-press for a note, clear a cell, clear a row or column with confirm, undo stack.
- **Views**: compact numeric grid, big table mode, per-player card view for pass-the-phone.
- **Export**: plain-text summary, CSV, printable sheet, copy to clipboard.
- **Preset:** `mode`, `rounds`, `categories` (name=points), `formula`, `win` (highest or lowest), `target`, `hidden`, `start`, `reference`.

**Edge cases:** negative and decimal scores, ties, players joining mid-game, mis-entry corrections, very long games (100+ rounds), total overflow.

---

### 3.6 Lives

**Purpose:** the big number that must be readable across the table: HP, lives, stocks, poison, coins in a battle game.

**Spec:**

- Per-player life total with a huge readout and plus or minus 1, 5 or a custom step; direct entry by tap-and-type.
- Damage and heal log with undo; optional "last change" flash so the table sees what happened.
- Starting life per player and per-player overrides for asymmetric games.
- **Extra tracks** per player: poison, commander damage, energy, shields; a small list of named counters with icons.
- **Conditions**: toggleable status chips with labels and optional durations (linked to `timer`); eliminated or done state greys a player out but keeps the score visible.
- **Game over detection**: configurable threshold (life at or below zero, last player standing).
- **Hidden mode**: hide totals from the table, with a reveal.
- **Preset:** `start`, `step`, `tracks` (name, start, max), `conditions`, `game-over`, `hidden`.

---

### 3.7 Counters

**Purpose:** every resource that is not score or life. Wood, sheep, coins, victory tokens, hit counters, "days left", crowd meters.

**Spec:**

- Named counters, shared or per player, with start values, min and max, step size and optional icons.
- Tap to add, long-press for a menu (subtract one, add five, set value, hide).
- **Bank** concept for shared pools (the pile in the middle) plus transfers between bank and players, because most resource games are zero-sum.
- **Denominations**: display big values as chips (1, 5, 10, 50) for poker-style stacks; totals always shown numerically too.
- **Tallies**: quick click-to-count mode for "how many times did X happen" (deaths, attempts, boss tries).
- **History** and undo; export totals.
- **Preset:** `counters` (`name=start` pairs; min, max and step stay in the UI), `shared`, `denominations`, `tallies`.

---

### 3.8 Turns

**Purpose:** answer "whose turn is it?" and "what phase are we in?", especially when the phone is the shared object being passed around.

**Spec:**

- Ordered seat list from the session, current player highlighted with a large name and color.
- Next, previous, skip, extra turn and reverse order; configurable order type (clockwise, snake, priority).
- Round counter that increments when the order wraps; manual correction.
- **Phases**: ordered list (for example "Draw, Play, Discard"); next phase, auto-advance with round, custom labels.
- **Turn timer** (optional): attaches a `timer` instance and starts it on turn change; warns and optionally auto-advances.
- **Pass-the-phone overlay**: a full-screen "Hand the phone to Alice" card that must be tapped to continue, so the next player does not see the previous player's state.
- **Log**: compact history of turns and phases with timestamps.
- **Initiative view** (optional): order players by a per-player initiative value, next and round reset; used by the D&D template.
- **Preset:** `order`, `phases`, `rounds`, `timer`, `auto-advance`, `start`.

---

### 3.9 Reveal

**Purpose:** all hidden information on a shared device: roles, secret objectives, private cards, ballots, blind bids.

**Spec:**

- **Deal roles**: a role list with counts (`werewolf=2, seer=1, villager=3`), an optional description per role, and a random private assignment.
- **Scaling roles**: mark one role `fill` (`villager=fill`) to take every remaining seat. Fixed roles must fit the player count or the template errors with the minimum; a zero-count `fill` role is dropped.
- **Pass-and-reveal flow**: "Alice, take the phone" then hold to reveal (or tap), role shown with a countdown, auto-hide, "pass to Bob". A short confirmation prevents accidental skips.
- **Anti-peek**: hold-to-view, an opaque cover until pressed, screen dims between players, no back navigation into a previous player's card.
- **Inspect**: reveal one other player's role to the current holder (seer, appraiser, traitor check): pick the inspector (or reuse the last player who revealed), pick a target, opaque cover, auto-hide, and a log entry. Never shows the inspector's own role.
- **Reveal all**: for games where roles are public after a phase.
- **Ballot**: question and options; each player votes privately; anonymous tally; ties; abstentions; results revealed only at the end.
- **Bids**: each player enters a secret number; simultaneous reveal; highest or lowest wins; tie handling; optional budget tracking across rounds.
- **Assign from list**: deal secret objectives or missions, one each, no duplicates.
- **Preset:** `roles` (name=count pairs, one may be `fill`), `descriptions`, `hold`, `auto-hide`, `mode` (roles, ballot or bids), `options`, `reveal`, `inspect`.

**Edge cases:** more players than fixed roles (the `fill` role absorbs), fewer players than fixed roles (clear error with the minimum), uneven counts, a player joining after dealing (allow re-deal), an empty inspect target list, device rotation during reveal, accidental double-tap.

---

### 3.10 Log

**Purpose:** the memory of the group. What we played, who won, how long it took, and the stats that come out of it.

**Spec:**

- **Record a play**: game name (from template or free text), date, players, winners, final scores, duration, notes, optional rating.
- **One-tap finish**: any tool can end the session and prefill the log from current state (scores, timer elapsed, template name).
- **History**: reverse-chronological list, filters by game, player or date, search.
- **Stats** (leaderboards and filters deepen in M4.4): plays per game, total playtime, win counts and win rate per player, current streaks, most-played game, "last played X days ago", per-game best scores.
- **Leaderboard**: across a chosen period (all time, year, tonight), per game or overall, with a minimum-plays filter so one lucky win does not top the chart.
- **"What should we play?"**: filter history by player count and available time; weighted toward games not played recently.
- **Data**: export and import JSON, CSV of plays, clear a range with confirm.
- **Preset:** `game`, `players`, `auto-record` (on finish).

Note: the log is per device and browser. That is a feature (privacy) and a limitation (no group sync); the UI must say so, with export as the bridge.

---

### 3.11 Decks

**Purpose:** shuffle, deal, draw and hide cards, for games where the physical deck is missing, mixed, or you want a clean deal, and for prototyping card games.

**Spec:**

- **Standard deck**: 52 cards plus jokers, multiple decks, optional removal of specific cards.
- **Presets**: standard, Euchre (24 or 32), Skat, Rummy, UNO-style (colors by numbers, plus actions), tarot (major and minor), domino set, and custom decks from a template (ranks by suits by copies).
- **Operations**: shuffle (Fisher-Yates, crypto), cut, draw one or N, deal N to each player, play to hand, play to table, discard pile, reveal or hide, peek, return to deck, reshuffle discard.
- **Views**: deck stack with count, hand fan, table grid, card back until flipped.
- **Hidden card mode**: pass-the-phone reveal for private hands; "show all" for open-information games.
- **Tracking**: remaining count, discards count, "cards seen" list (helps with memory games and probability).
- **Preset:** `deck` (preset or definition), `decks`, `players`, `deal`, `hidden`, `jokers`.

**Edge cases:** empty deck on draw (offer reshuffle), dealing more than available (warn), duplicate cards in custom decks, multiple hands, undo of a deal.

---

### 3.12 Bag

**Purpose:** blind draws from a pool where the physical bag is impractical: Scrabble tiles, Bananagrams, cube towers, hidden tokens.

**Spec:**

- Named token sets with counts and values (`A=9`, `blank=2`, `red=13`), or a generic "tokens" count.
- Draw N without replacement, peek, return selected, return all, count remaining by type.
- Optional per-token value for scoring after the draw (Scrabble letter values).
- Hidden mode: drawn tokens go to the current player's private tray.
- Distribution editor: quick counts, import from template.
- **Preset:** `set`, `counts`, `values`, `draw`, `tray` (shared or per-player).

**Edge cases:** drawing more than remain, zero-count types, returning a token that was not drawn, tray overflow.

---

### 3.13 Bracket

**Purpose:** run a tournament for game night, a party or an esports afternoon without a spreadsheet.

**Spec:**

- Formats: single elimination, double elimination, round robin, groups plus playoffs, simple Swiss (fixed rounds).
- 4 to 32 entrants; manual seeding or random; byes handled automatically; best-of-N per match.
- Match cards: report winner, score and notes; auto-advance; undo a result.
- Standings: wins and losses, points, head-to-head and score-difference tiebreakers (configurable order).
- Schedule generation with rounds and tables; a "next match" callout for the host.
- Print and share view; export results.
- **Preset:** `format`, `entrants`, `best-of`, `seeding`, `tiebreak`.

**Edge cases:** odd entrant counts, late additions, forfeits, draws in round robin, double-elimination grand-final reset.

---

### 3.14 Draft

**Purpose:** pick order and picks, with a clock, for drafting games, fantasy leagues and team building.

**Spec:**

- Order: linear or snake; custom order; randomize; keep for future sessions.
- Per-pick timer linked to `timer`; auto-advance on expiry (with a warning) or manual only.
- Pick log: who picked what, remaining pool, undo pick.
- **Auction mode**: budget per player, nomination order, current bid, sold price, remaining budget, max bid calculation.
- **Preset:** `order`, `snake`, `seconds`, `pool`, `auction`, `budget`.

---

### 3.15 Buzzer

**Purpose:** settle who tapped first, with actual fairness and no argument. Works for quiz nights, party games and reaction contests.

**Spec:**

- One to eight giant buttons (one per player), full screen, distinct colors and names.
- First tap locks the round and highlights the winner; other taps are ignored.
- **Random start**: a random delay (1 to 5 seconds) before the buzzers arm, to prevent pre-tapping; false-start detection.
- Reaction time in milliseconds, optional scoring across rounds.
- Keyboard mapping for one-keyboard play (A, S, D, F, J, K, L, semicolon).
- Sound on arm and on buzz; haptic.
- **Preset:** `players`, `delay`, `false-start`, `rounds`, `keys`.

---

### 3.16 Script

**Purpose:** the narrator and flow engine. Runs an ordered list of things to say, wait for, reveal and time, for social deduction nights, escape rooms, event decks and teach-a-game sequences.

**Spec:**

- Steps with a big readable narration, an optional host note (small print) and a progress indicator.
- Step verbs: `say` (markdown text), `wait` (duration with skip), `reveal` (run a reveal instance's flow inline and wait for it; `reveal: <instance> inspect` opens inspect mode), `timer` (start, pause, reset or flip an instance), `note` (host-only).
- Next, back, pause and restart; timers run independently so the script can wait on people, not just on clocks.
- **Event deck** mode: draw a random step or card from a pool and apply it (build the deck from template data).
- Editing: template-defined scripts, plus a simple in-app editor for house rules.
- **Preset:** `event-deck`, `auto-advance`; the steps come from `[script <instance>]`.

**Edge cases:** a step referencing a missing timer or instance (warn and skip), a script with zero steps, restarting mid-way, jumping back after a reveal (hidden information warning).

---

### 3.17 Rules

**Purpose:** the cheat sheet, so nobody opens a 28-page PDF mid-turn.

**Spec:**

- **Quick card**: the 60-second explanation (goal, turn structure, end condition), always the first thing shown.
- **Setup checklist**: ordered, checkable items; progress persists in the session; optional setup timer.
- **Reference sections**: short markdown headings for turn structure, scoring, edge cases and variants, all written in our own words.
- **Scoring reference**: categories, points and targets, shared with `score` so the pad and the reference cannot disagree.
- **Glossary**: reusable term definitions (from the categorizer content) with search and anchors.
- **Links**: source or official rules link (opened externally, clearly marked as needing internet).
- Print view; in-page search; collapsible sections.
- **Preset:** `quick`, `glossary`, `scoring`, `links`; the body comes from `[setup]` and `[rules]`.

---

### 3.18 Words

**Purpose:** settle word validity and help find words, entirely offline, in more than one language.

**Spec:**

- **Languages and profiles**: English (common words plus a tournament-style list where licensing allows), Dutch, German, French, Spanish. Each profile is a separate data pack with an origin and license note.
- **Validity check**: exact lookup, trims and normalizes case and accents (configurable), plural and verb-form hints where the pack supports them, and "close matches" for typos.
- **Filters**: length, starts with, ends with, contains, letter pattern (`C_T`, wildcards), allowed letters, excluded letters.
- **Anagram solver**: all words from a set of letters, sorted by length or value.
- **Rack solver**: best words from a Scrabble-like rack with blanks, with scores.
- **Letter picker**: random letter or letters, weighted by language frequency or uniform; alphabet grid for Boggle-style games.
- **Codenames board**: generate a 5x5 word grid plus a spymaster key (red, blue, neutral, assassin), regenerate words only, keep the key hidden from guessers.
- **Word info**: length, letter values, optional short definition where a permissively licensed source is bundled.
- **Preset:** `profile`, `mode`, `letters`, `pattern`, `grid`, `seed`.

**Data and licensing (critical):** only ship word lists with clear redistribution rights (public-domain lists, SCOWL or ENABLE with its license, WordNet for definitions with attribution). Record the source and license in `src/data/words/LICENSES.md` and surface it in the app's About panel.

**Performance:** lookup via a Set; anagram index keyed by sorted letters; prefix search via a compact trie or sorted array plus binary search. Pack data gzip-compressed and decoded lazily (§5.7). Target under 50 ms for any query on a phone.

---

### 3.19 Prompts

**Purpose:** the "get inspired" engine, upgraded from CATEGORIZER: random ideas, party prompts, story dice and random tables.

**Spec:**

- **Packs**: game genres, themes, mechanics and difficulty (migrated from the categorizer), charades and pictionary words, truth-or-dare, would-you-rather, story dice (character, setting, problem), design constraints, TTRPG random tables.
- **Draw controls**: draw N from one or more lists; lock or exclude entries; favorites; "no repeats until the list is exhausted"; weights.
- **Results**: readable cards with short definitions and links to the glossary entry; copy and export; re-roll a single card.
- **Designer mode**: combine one genre, N mechanics, one theme and a difficulty to kickstart a game idea (the original CATEGORIZER draw, improved).
- **Custom packs**: import a plain-text pack (one entry per line, optional `term: definition`), stored locally and usable in templates.
- **Template use**: packs are addressable as list sources, for example `source: themes`, so a game can deal prompts.
- **Preset:** `packs`, `draw`, `locks`, `weights`, `seed`.

---

### 3.20 Custom

**Purpose:** the last resort that prevents "unsupported game". Build a small tracker without code.

**Spec:**

- Fields: text, number, checkbox, select (options), note.
- Counters: name, start, step, min and max.
- Checklist: setup or per-round items.
- Table: configurable rows and columns with numeric cells and totals; optional per-row and per-column sum.
- Formula cells: `+ - * /`, parentheses, and references to other fields (`a1`, `total`).
- Layout: shared or per-player; one card per player or one big sheet.
- Save the configuration as a template (`[tool custom]` with a generated block) and export the current values.
- **Preset:** `fields`, `counters`, `checklist`, `table`, `formula`, `per-player`.

---

### 3.21 Splits

**Purpose:** speedrun practice and race timing for video games (or any lap-based activity).

**Spec:**

- Splits list with names and target times; start, stop and reset; split on a key or tap.
- Live comparison against the personal best (delta, colors plus explicit plus or minus text), gold splits, sum-of-best.
- Attempt counter; reset attempts versus reset everything; pause.
- Save categories per game; export and import splits as text.
- Big timer view plus optional display mode for streaming.
- **Preset:** `game`, `category`, `splits`, `pb`, `keys`.

---

### 3.22 Cross-cutting display modes

These are not tools; they are ways any tool can present itself. They live in the core so every tool gets them for free.

- **Table mode**: landscape-friendly, huge type, maximum contrast, enlarged controls, minimal chrome. One toggle in settings, remembered per device. Intended for a phone propped up in the middle of the table.
- **Display and overlay** (`#/display/<tool>/<instance>`): read-only, controls hidden, very large output, dark or transparent background, optional auto-hide chrome. Updated from the controlling tab via `BroadcastChannel`, falling back to `storage` events and a 1-second poll. For projectors, second screens and OBS.
- **Print**: `@media print` styles for score sheets, brackets, rules and session summaries; a Print action in every export menu.



## 4. The `.gamebuddy` template system

### 4.1 What a template is

A plain UTF-8 text file that describes one game and how to configure the tools for it. It is human-writable, diff-friendly and loadable by drag-and-drop. It contains:

- game metadata (name, players, time, tags, source),
- the player list (optional; otherwise seats are generated),
- any number of tool blocks with settings,
- optional rules, setup and script content.

Loading it creates a **session**: players, configured tools and content. Playing does not modify the template; "save as template" is explicit.

### 4.2 A complete example

```ini
# kitchen-rush.gamebuddy — 2-4 players, about 45 minutes, realtime co-op

[game]
name: Kitchen Rush
players: 2-4
time: 45m
tags: realtime, cooperative, party
source: https://boardgamegeek.com/boardgame/229792/kitchen-rush
author: pandaqi
license: CC-BY-SA-4.0
format: 1

[players]
Alice
Bob
Charlie

# One big tap target per player: tap to flip your hourglass.
[tool timer kitchen]
mode: flip
duration: 3m
per-player: yes
layout: grid
warn-at: 20s
sound: bell
haptic: short

# Shared tallies: dishes served and hearts remaining.
[tool counters goals]
shared: yes
counters: served=0, hearts=3

[tool rules]
quick: Serve orders before the shift ends.

[setup]
- Shuffle the order deck
- Place 10 plates on the counter
- Give every player a 3-minute hourglass
- Agree on a target of 12 dishes

[rules]
**Goal:** serve as many orders as you can before the shift ends.

Each player has a 3-minute hourglass. When it runs out, flip it and lose a heart.
If you lose three hearts, the shift is over.

### Variant
For an easier game, start with 12 plates instead of 10.
```

### 4.3 Format rules

- **Encoding**: UTF-8. Line endings LF or CRLF. Extension `.gamebuddy` (also accept `.txt` and any text file dropped in).
- **Comments**: full-line only, starting with `#` after optional whitespace. No inline comments, so colors like `#ffcc00` stay safe.
- **Sections**: `[name]` on its own line. Names are case-insensitive and normalized to lowercase. Tool sections are `[tool <id>]` or `[tool <id> <instance>]`; the instance name defaults to the tool id and lets one template hold several timers. The same default applies to `[script]`.
- **Section parsing**: the section name decides how its lines are read.

  | Section | Parsed as |
  |---------|-----------|
  | `[game]`, `[tool ...]` | `key: value` lines |
  | `[players]`, `[setup]` | one item per line; a leading `- ` is stripped |
  | `[rules]`, `[notes]` | free markdown; `:` has no special meaning |
  | `[script <instance>]` | numbered steps |

  `[rules]` and `[setup]` attach to the rules instance automatically, and `[script <instance>]` creates or configures a script instance; none of them need a matching `[tool ...]` block. `[notes]` is shown in the session info sheet, not as a tool.
- **Players and seats**: `[players]` lists one name per line; colors come from the palette in order. `players:` in `[game]` is a `min-max` range used for filtering and for the seat stepper. Without a list, the template card asks for a seat count in that range (default: the minimum) before the session starts. A list always wins; a count outside the stated range warns but is allowed.
- **Keys**: `key: value` or `key = value` (both accepted, normalized). Split each line at the **first** `:` or `=`, so `source: https://...` and `counters: served=0` both survive. Keys are kebab-case and case-insensitive. Indented continuation lines (two or more spaces) continue the previous value.
- **Values**:
  - strings (unquoted by default; quote when a value starts or ends with a space, or is a list member containing a comma),
  - integers and decimals with `.`,
  - booleans `yes/no/on/off/true/false/1/0`,
  - durations: `500ms`, `90s`, `3m`, `1h30m` (compound allowed),
  - ranges: `2-4`,
  - lists: comma-separated, split only for keys whose schema is a list; quote a member that contains a comma,
  - colors: palette names (`red`, `orange`, `yellow`, `green`, `teal`, `blue`, `purple`, `pink`, `gray`) or `#rgb` and `#rrggbb`,
  - dice: `2d6+1`, `4dF`, `d%`,
  - structured pairs: `name=value` (`werewolf=2`, `served=0`), used for role counts, counter starts and weights; richer per-entry options (min, max, step, descriptions) stay in the UI,
  - multi-line text: `key: |` followed by indented lines, preserved verbatim.
- **Schema-aware values**: the key's schema, not the text, decides whether a value is a list. Script arguments, `say` text and `[rules]` content are always strings, so commas and colons need no quoting there.
- **Unknown sections and keys**: warning, not an error. Preserved and ignored, so newer templates degrade gracefully in older builds.
- **Duplicates**: last value wins, with a warning listing both line numbers.
- **Required**: `[game] name`. Everything else has a default.
- **Free-text sections**: `[rules]` and `[notes]` accept a small markdown subset: headings, bold, italics, lists, links, inline code and blockquotes; no raw HTML. `[script <instance>]` accepts `N. verb: argument` steps; the verb set is in §3.16.

### 4.4 Tool preset schemas

Every tool exports a declarative schema, and that one schema drives four things: the settings UI, the template validator, settings persistence, and "save as template".

```ts
// src/tools/timer/preset.ts (illustrative)
export const preset = {
  mode:         { type: 'enum', values: ['countdown', 'up', 'flip', 'chess', 'interval', 'sequence'], default: 'countdown' },
  duration:     { type: 'duration', default: '5m' },
  'per-player': { type: 'boolean', default: false },
  players:      { type: 'number', default: 2 },
  layout:       { type: 'enum', values: ['single', 'grid', 'list'], default: 'single' },
  'warn-at':    { type: 'duration', default: '30s' },
  sound:        { type: 'enum', values: ['none', 'bell', 'buzzer', 'gong'], default: 'bell' },
  increment:    { type: 'duration', default: '0s' },
  phases:       { type: 'list', default: [] },
} as const;
```

Rules:

- Unknown keys produce a warning with the nearest valid key ("did you mean `warn-at`?").
- Invalid values produce an error with a line number and an example. Example message:
  `kitchen-rush.gamebuddy:12 — duration: "3 minutos" is not a duration. Try 3m or 180s.`
- Missing keys use defaults.
- A tool that cannot load its preset still opens with defaults, and the session shows a dismissible "some settings were ignored" note.

### 4.5 More examples

**Chess clock**

```ini
[game]
name: Blitz Chess
players: 2
time: 10m
tags: competitive, two-player

[tool timer clock]
mode: chess
duration: 5m
increment: 3s
players: 2
sound: bell

[tool rules]
quick: Checkmate wins. You lose if your clock hits zero.
```

**Werewolf night (reveal plus script)**

```ini
[game]
name: Werewolf
players: 5-10
time: 10m
tags: social-deduction, party
source: https://boardgamegeek.com/boardgame/147949/one-night-ultimate-werewolf
author: pandaqi
license: CC-BY-SA-4.0
format: 1

[tool reveal roles]
mode: roles
roles: werewolf=2, seer=1, robber=1, troublemaker=1, villager=fill
hold: yes
auto-hide: 8s
inspect: yes

[tool rules]
quick: Find the werewolves before the village is destroyed.

[script night]
1. say: Everyone will now see their role. Keep it secret.
2. reveal: roles
3. say: Everyone, close your eyes.
4. wait: 3s
5. say: Werewolves, open your eyes and look at each other.
6. wait: 5s
7. say: Werewolves, close your eyes.
8. say: Seer, take the phone and inspect one player's role.
9. reveal: roles inspect
10. say: Seer, close your eyes. Everyone, open your eyes.
11. wait: 5s
12. say: Discuss and vote for a werewolf.
13. wait: 2m
```

Script steps are `N. verb: argument` with verbs `say`, `wait`, `reveal`, `timer` and `note`, including `reveal: roles inspect`. Unknown verbs warn and are skipped.

**Catan scoring**

```ini
[game]
name: Catan
players: 3-4
time: 90m
tags: strategy, trading
source: https://boardgamegeek.com/boardgame/13/catan
author: pandaqi
license: CC-BY-SA-4.0

[tool score]
mode: categories
win: highest
target: 10
# Each category is count x points; enter 1 for a one-time bonus.
categories: settlements=1, cities=2, longest-road=2, largest-army=2, vp-cards=1

[setup]
- Lay out the board and put the robber on the desert
- Give every player two settlements and two roads
- Shuffle the development deck
- Choose the first player and place in snake order

[tool rules]
quick: First to 10 victory points wins.
```

### 4.6 Loading, sharing and authoring

**Import paths, in order of importance:**

1. Drag and drop a file onto the window.
2. File picker (works on `file://`; never `fetch` local files).
3. Paste template text into an import box.
4. Open a `#t=<compressed>` link (gzip plus base64url via `CompressionStream`, plain base64 fallback). Warn above roughly 4 KB; prefer files.
5. Recent imports list, stored locally.
6. The bundled library (compiled into the app, §5.7).

**Authoring paths:**

- Start from a bundled template, then "Duplicate and edit".
- New template: metadata form, tool blocks, live validation, preview state.
- Edit raw text in the built-in editor (monospace, line numbers, error markers).
- Write it in any text editor and drag it in, for people who prefer that.
- "Save current game as template": serialize the live session's players and tools into a `.gamebuddy` file.

**Validation UX:** a Check button lists errors and warnings with line numbers, jump-to-line, and one-click fixes for common issues (unknown key, invalid duration, missing game name). Warnings never block import; only fatal errors do, and even then offer "import anyway with defaults".

### 4.7 The template library

Ship 40 hand-written templates in total, each with a source link, author, license and "not an official product" note. The Ships column is exact: 27 templates use only M1–M2 tools and ship in M3; the remaining 13 ship with their M4 family. The gallery groups them by context (party, strategy, card, word, RPG, video, tournament) and filters by players, time and tools used, reusing the categorizer's taxonomy as metadata.

| Game | Players | Time | Tools wired | Ships |
|------|---------|------|-------------|-------|
| Catan | 3-4 | 90 m | score, rules | M3 |
| Ticket to Ride | 2-5 | 60 m | score, turns, rules | M3 |
| 7 Wonders | 3-7 | 45 m | score, rules | M3 |
| Wingspan | 1-5 | 70 m | score, rules | M3 |
| Sushi Go! | 2-5 | 20 m | score, rules | M3 |
| Yahtzee | 2-6 | 30 m | score, dice, rules | M3 |
| Phase 10 | 2-6 | 45 m | score, rules | M3 |
| Monopoly | 2-6 | 120 m | counters, turns, rules | M3 |
| Risk | 2-6 | 120 m | counters, turns, dice | M3 |
| Scrabble | 2-4 | 60 m | score, words, bag, timer | M4 |
| Boggle | 2-8 | 15 m | timer, words, score | M4 |
| Bananagrams | 2-8 | 15 m | bag, timer, words | M4 |
| Codenames | 4-8 | 20 m | words, timer, score | M4 |
| Decrypto | 3-8 | 30 m | timer, score, reveal | M3 |
| Just One | 3-7 | 20 m | score, words | M4 |
| Dixit | 3-6 | 30 m | score, reveal | M3 |
| Werewolf / Mafia | 5-10 | 10 m | reveal, script, timer | M4 |
| Coup | 2-6 | 15 m | lives, reveal, rules | M3 |
| Love Letter | 2-4 | 20 m | score, reveal | M3 |
| The Mind | 2-4 | 20 m | lives, rules | M3 |
| Hanabi | 2-5 | 25 m | score, timer, rules | M3 |
| Skull | 3-6 | 20 m | reveal, score | M3 |
| Azul | 2-4 | 40 m | score, rules | M3 |
| Splendor | 2-4 | 30 m | score, counters, rules | M3 |
| Dominion | 2-4 | 30 m | score, turns, rules | M3 |
| Poker night | 2-9 | 180 m | counters, turns, reveal, timer | M3 |
| Perudo / Liar's Dice | 2-6 | 30 m | dice, lives, reveal | M3 |
| Chess / Blitz | 2 | 10-60 m | timer, rules | M3 |
| Kitchen Rush | 2-4 | 45 m | timer, counters, rules | M3 |
| Pandemic | 2-4 | 45 m | counters, timer, rules | M3 |
| Gloomhaven | 1-4 | 90 m | lives, counters, turns, rules | M3 |
| D&D 5e combat | 3-7 | varies | turns, lives, dice, rules | M3 |
| Magic: the Gathering | 2-4 | 30 m | lives, counters, timer | M3 |
| Uno | 2-10 | 30 m | decks, score, rules | M4 |
| Exploding Kittens | 2-5 | 15 m | decks, lives, rules | M4 |
| Mario Kart night | 2-8 | 60 m | score, bracket | M4 |
| Smash night | 2-8 | 60 m | bracket, lives, timer | M4 |
| Speedrun practice | 1 | varies | splits, log | M4 |
| Escape room | 2-6 | 60 m | timer, script, rules | M4 |
| Trivia night | 2-20 | 60 m | score, timer, buzzer, prompts | M4 |

Every game template includes a `rules` block and a `[setup]` checklist where setup is non-trivial; utility templates (speedrun practice) may skip both. D&D ships in M3 with a manual turn order; its initiative view lands in M4.5. All content is our own summary; no copied rules text.

### 4.8 Versioning and compatibility

- Each file declares `format: 1` (optional; default 1).
- App versions follow semver. The app supports all format versions up to its own.
- A newer format on an older app imports with warnings for unknown keys, never a hard crash.
- Unknown tool ids stay in the session as "unavailable" cards that explain the version mismatch, so a shared template does not silently lose data.
- Never rename a preset key without accepting the old one for at least one major version, with a deprecation warning.
- A round-trip test (`parse`, `serialize`, `parse`) runs on every bundled template in CI.

### 4.9 Legal and attribution

- Game names are used nominatively ("a helper for Catan"), with a clear "not affiliated with or endorsed by the publisher" line.
- No logos, box art, card scans or copied rule text.
- Rules summaries are original prose; the source link points to the official page or BoardGameGeek.
- Word lists, definitions and prompt packs carry their license in `src/data/*/LICENSES.md` and in the About panel.
- Templates default to CC BY-SA 4.0 unless they state otherwise; the field is `license:`.
- Templates are fan-made helpers, not replacements for owning the game.

## 5. Architecture

### 5.1 Stack decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Language | TypeScript, strict | Safety without runtime cost |
| Runtime | Baseline 2020, ES2020 | Svelte's floor is Chrome 87 / Firefox 83 / Safari 14; no transpilation or polyfills |
| Framework | Svelte 5 (compiler, runes mode); no SvelteKit | ~6 KB emitted runtime, no VDOM, scoped styles; SSR is not needed |
| Build | Bun (`bun build` + `bun-plugin-svelte` + `bun test`) | One toolchain; HMR; single-file output |
| Styles | Scoped Svelte `<style>` plus custom-property tokens | Per-tool CSS without global collisions; no Sass |
| State | Svelte runes for views; plain objects for session, undo and saves | Reactive screens, serialisable state |
| Persistence | `localStorage` with fallbacks | Offline-first, no server |
| Data | Build-time packed text and JSON, gzip plus base64 | Single-file friendly, lazy decode |
| Tests | `bun test` plus `happy-dom` (dev-only); mount components | Fast; no browser runner for logic |
| Dependencies | 0 runtime, at most 6 dev | Size and longevity; Svelte compiles at build time |

Svelte is compiler-first: `svelte` is a dev dependency, and the runtime helpers it emits (~6 KB gzipped) are bundled and counted in the 45 KB core budget. No SvelteKit, router library, CSS framework or state library. Parser, storage, ticker, RNG, audio, haptics and the session model remain plain TypeScript with no Svelte imports; components consume them through `ToolContext`. The view layer is the only place `.svelte` files exist.

### 5.2 Folder structure

```
pq-game-buddy/
├─ index.html                 # dev shell + template for the single-file build
├─ package.json
├─ tsconfig.json
├─ svelte.config.js           # runes mode; no SvelteKit
├─ bunfig.toml                # dev-server Svelte plugin; test preload
├─ scripts/
│  ├─ gen-manifest.ts         # scans src/tools/*, emits manifest.generated.ts
│  ├─ pack-data.ts            # compresses data packs into TS modules
│  ├─ lint-templates.ts       # validates every bundled .gamebuddy
│  ├─ svelte-preload.ts       # registers the Svelte plugin for bun test
│  └─ build.ts                # dist/ + single-file HTML + size report
├─ src/
│  ├─ main.ts                 # mount App.svelte
│  ├─ App.svelte              # shell, home, settings
│  ├─ app.d.ts                # *.svelte module declaration for tsc
│  ├─ core/
│  │  ├─ dom.ts               # focus, portal, announce (no h())
│  │  ├─ router.ts            # hash router, deep links
│  │  ├─ registry.ts          # tool types + lookup
│  │  ├─ manifest.generated.ts
│  │  ├─ session.ts           # plain session model + serialization
│  │  ├─ session-store.svelte.ts # runes wrapper for views
│  │  ├─ storage.ts           # adapter chain + migrations
│  │  ├─ ticker.ts            # one rAF loop + one coarse interval
│  │  ├─ rng.ts               # crypto + seeded PRNG
│  │  ├─ audio.ts             # WebAudio synth cues
│  │  ├─ haptics.ts
│  │  ├─ wake.ts
│  │  ├─ undo.ts
│  │  ├─ share.ts             # files, URLs, clipboard, print
│  │  ├─ i18n.ts              # t(), plurals, Intl, pseudo-locale
│  │  ├─ template/
│  │  │  ├─ parse.ts          # tokenizer + line parser
│  │  │  ├─ schema.ts         # preset types + validation
│  │  │  ├─ markdown.ts       # tiny safe subset renderer
│  │  │  └─ serialize.ts      # state to template text
│  │  ├─ ui/                  # Svelte primitives: button, sheet, toast, numberpad,
│  │  │                       # bigtap, players, toolbar, empty-state, confirm
│  │  └─ styles/              # tokens.css, base.css, app.css
│  ├─ tools/
│  │  ├─ timer/{meta.ts, tool.svelte.ts, Timer.svelte, preset.ts, logic.ts, example.gamebuddy, tool.test.ts}
│  │  ├─ dice/...
│  │  └─ ...
│  └─ data/
│     ├─ templates/*.gamebuddy
│     ├─ templates.generated.ts
│     ├─ words/{en,nl,de,fr,es}.txt + LICENSES.md
│     ├─ words.generated.ts
│     ├─ prompts/*.txt
│     └─ glossary.ts           # categorizer content, typed
├─ tests/
│  ├─ template.test.ts
│  ├─ preset.test.ts
│  ├─ component.test.ts
│  └─ helpers/fake-clock.ts
├─ docs/
│  ├─ ARCHITECTURE.md
│  ├─ TEMPLATE-FORMAT.md
│  ├─ TOOL-AUTHORING.md
│  └─ CONTRIBUTING.md
├─ dist/                      # build output, git-ignored
└─ vault/                     # the old site, read-only reference
```

Rules:

- `core/` knows nothing about specific tools; `tools/` never import each other. They talk through the session and core services.
- Every tool folder also contains `example.gamebuddy`, so fixtures, docs and the gallery share one canonical example.
- A tool folder is self-contained: metadata, `tool.svelte.ts` entry, Svelte component, framework-agnostic logic, scoped styles, tests. Removing the folder removes the tool.
- `meta.ts` and `preset.ts` never import `.svelte` files, so `gen-manifest.ts` runs in Bun without the Svelte plugin.
- `core/template/`, `storage.ts`, `ticker.ts`, `rng.ts` and `session.ts` are plain TypeScript; only `session-store.svelte.ts` mirrors the session for views.
- `manifest.generated.ts` and `templates.generated.ts` are committed so typecheck works without a prior build, and `bun run gen --check` fails if they are stale.

### 5.3 Tool contract

```ts
// src/core/registry.ts
import type { Component } from 'svelte';

export interface ToolMeta {
  id: string;                 // 'timer'
  title: string;              // 'Timer'
  blurb: string;              // one line for the home grid
  icon: string;               // inline SVG string
  tags: string[];             // search + gallery filters
}

export interface ToolModule<TState extends object = Record<string, unknown>> extends ToolMeta {
  preset: PresetSchema;
  component: Component<{ ctx: ToolContext; instance: ToolInstance<TState> }>;
  create(ctx: ToolContext, values?: PresetValues): ToolInstance<TState>;
}

export type AnyToolModule = ToolModule<any>; // registry storage; tools keep their own TState

export interface ToolInstance<TState extends object = Record<string, unknown>> {
  readonly data: TState;                  // live view state; a $state proxy in the Svelte build
  state(): TState;                        // plain snapshot for save and undo
  load(state: unknown): void;             // tolerant; ignores unknown fields
  presetFromState(): PresetValues;        // "save as template"
  commands?: Record<string, (arg?: string) => void>;  // script, overlay, keys
  summary(): string;                      // plain-text export
}

export interface ToolContext {
  session: SessionApi;    // players, other tool instances, finish game
  clock: Clock;           // now(), subscribe via ticker, timestamps
  rng: Rng;               // crypto + seed
  audio: AudioApi;
  haptics: HapticsApi;
  toast: (msg: string, kind?: 'info' | 'error') => void;
  t: Translate;
}
```

Notes:

- The shell mounts `component` with Svelte's `mount()` and unmounts it with `unmount()`. `ToolInstance` holds state and commands, so serialization, undo and tests stay framework-agnostic.
- The registry stores `AnyToolModule`; each tool keeps its concrete `TState` internally, so views get typed `data` while the shell stays generic.
- `data` is the single live state object. A tool's `tool.svelte.ts` creates it with `$state` and exposes it through `ToolInstance`; components bind to it, and `load()` mutates it in place so undo and template switches update the view. `state()` returns a plain JSON clone; never use `$state.snapshot` (Safari 15.4).
- Components never create module-level reactive state; the session model is the source of truth, and each tool's live copy lives in `ToolInstance.data`.
- `load()` must accept older states silently (missing fields become defaults) and must never throw on unknown data.
- Long-running work (data decode, solvers) runs in idle time or on demand; no work at module top level.

### 5.4 Core services

- **Router**: hash-based (`#/`, `#/tool/timer`, `#/play/<sessionId>`, `#/display/...`, `#/selftest`) so it works over `file://`. Deep links restore the session; unknown routes show a friendly 404 with a way home.
- **Session**: `{ id, templateId?, templateText?, gameName, players[], instances[], notes, createdAt, updatedAt }`. Autosave debounced 250 ms; resume prompt on launch; multiple saved sessions; delete with confirm. The model is plain data and serialises directly; `session-store.svelte.ts` is a thin runes mirror for views, never the source of truth.
- **Ticker**: one `requestAnimationFrame` loop for smooth things (timers, animations) and one 250 ms interval for coarse updates. Tools subscribe; no tool starts its own interval storm. On `visibilitychange` and window focus, all time-based tools resync from monotonic timestamps.
- **RNG**: `crypto.getRandomValues` for uniform integers without modulo bias; seeded PCG32 for reproducible rolls and shareable puzzles. One interface for both.
- **Undo**: snapshot stack per instance, cap of 50 entries or 256 KB, coalesced for rapid taps; a shared undo bar that says what will be undone.
- **Share and export**: file download (Blob), clipboard copy, print, URL encoding (gzip plus base64url), JSON export and import.
- **Storage**: `localStorage`, then `sessionStorage`, then an in-memory adapter, chosen at boot with a feature probe. Versioned keys (`pqgb:v1:...`) and a migration function. Quota errors surface an actionable message ("export your session and clear old ones").
- **i18n**: every string via `t('key')`; English dictionary only for now; pseudo-locale build for layout testing; `Intl` for numbers and dates; logical CSS properties for future RTL.
- **Theme**: light, dark and system via CSS custom properties; palette from the Pandaqi look; player colors from a fixed, colorblind-safe set with initials as a fallback.
- **Cue sheet**: a core overlay with the synthesized cues from the former soundboard (bell, buzzer, tick, gong, drumroll, success), available from every screen. No tool state, no template schema; it is a utility, not a tool.

### 5.5 Discovery and codegen

`scripts/gen-manifest.ts` scans `src/tools/*/meta.ts`, imports the exported metadata and preset schema, and writes `manifest.generated.ts` plus a static schema file used by the linter. `meta.ts` and `preset.ts` stay Svelte-free, so this scan runs in Bun without the Svelte plugin. The dev watcher reruns it when folders change, so dropping in a new tool folder is enough. `bun run gen --check` verifies the output is current in CI.

### 5.6 Rendering and CSS

- One Svelte component per tool, mounted by the shell. Runes drive text and attributes; timers write `textContent` through refs and never re-render the tree per frame.
- CSS lives in each component's scoped `<style>` and is layered on tokens (`--space-2`, `--text-lg`, `--color-accent`); use `:global` only for tokens and resets.
- No CSS frameworks and no utility-class soup. Shared primitives are Svelte components in `core/ui`.
- Tool components never call `setInterval` or `requestAnimationFrame`; subscribe to `ctx.clock` (the shared ticker) and clean up when the component unmounts.
- The shell wraps the active tool in `<svelte:boundary>` so a render error shows a reset action, not a white screen.
- Layout is mobile-first; the largest supported view is a projector, not a desktop dashboard.
- Animations are short, interruptible and disabled under `prefers-reduced-motion` (plus an in-app override).

### 5.7 Data pipeline

- Source data lives as plain text and JSON in `src/data/`.
- `scripts/pack-data.ts` compresses packs with gzip (via `CompressionStream` or Bun) and emits base64 TS modules plus an index of names, sizes and licenses.
- At runtime, packs decode lazily on first use with `DecompressionStream('gzip')`; a plain-base64 fallback exists for older browsers.
- Bundled templates are small and compiled directly as strings; they are never fetched.
- Full single-file builds include English word data; additional language packs are included in the "all data" build and fetched on demand in the hosted build (still optional, never required for the core tools).

### 5.8 Persistence model

| Key | Contents |
|-----|----------|
| `pqgb:v1:settings` | theme, table mode, sound volume, haptics, reduced motion override, locale |
| `pqgb:v1:sessions` | index of sessions (id, game, updatedAt) |
| `pqgb:v1:session:<id>` | full session state |
| `pqgb:v1:log` | plays, results, stats input |
| `pqgb:v1:templates` | user-created and imported templates |
| `pqgb:v1:recent` | recent tools and templates |

Autosave on every mutation (debounced). Explicit "Save a copy" for snapshots. Export and import JSON for backups and moving between devices. Everything is deletable from Settings ("Reset all data" with a typed confirmation).

### 5.9 Offline and `file://` constraints

Known browser realities, handled explicitly:

- `fetch()` of sibling files fails on `file://`; therefore all bundled assets are inlined and imports use the file picker or drag-and-drop.
- Safari may block or isolate `localStorage` on `file://`. The storage adapter falls back, and the app shows a one-time banner: "Progress can't be saved when opened as a file in this browser. Export instead, or host the file."
- Timers cannot run reliably with the screen off or the tab discarded. Use Wake Lock where available and say so plainly rather than pretending.
- Audio requires a user gesture first; prime the audio context on the first tap and respect mute.
- No service worker is required for offline use; the single HTML file is the offline story. A PWA is optional and hosted-only (M6).
- No network calls exist to fail. The self-test stubs `fetch` to assert this.

**Compatibility baseline (be honest, not hopeful):**

| Tier | Browsers | Experience |
|------|----------|------------|
| A. Baseline (required) | Chrome/Edge 87+, Firefox 83+, Safari 14+, Android 8+, iOS 14+ (2020; Svelte 5 floor) | The full app; optional APIs are feature-detected and explained when missing |
| B. Extras | Current Chrome, Safari 16.4+, Firefox 113+ | Wake Lock, BroadcastChannel, CompressionStream, Web Speech |
| C. Unsupported | Anything below tier A | Static banner: "This browser is too old; use a current browser." Never a half-broken UI |

The limit is the browser, not the device: 2015-era hardware runs the app fine with a current browser. Output target is **ES2020**; no `structuredClone`, `Array.prototype.at`, `:has()`, container queries as a dependency, or subgrid. Do not use `$state.snapshot` in Tier A code; it requires Safari 15.4. Keep saves as plain JSON and clone with `JSON.parse(JSON.stringify(...))` at the boundary. If a future Svelte release lowers its floor, lower the target and widen tier A; do not add a transpiler dependency for it. No `backdrop-filter` or large `filter: blur()` (the reveal cover is an opaque layer). Every optional API degrades with a visible explanation, never a silent failure.

### 5.10 Accessibility requirements

Target WCAG 2.2 AA:

- Fix every Svelte compiler accessibility warning; never suppress one. The compiler is the first pass, not the audit.
- 48x48 px minimum targets (56 in table mode), with spacing that avoids mis-taps.
- Primary actions sit in the lower third of the screen, within one-handed thumb reach on a 360 px phone.
- Contrast at least 4.5:1 for text and 3:1 for large text and UI edges; verify player colors and dark mode.
- Full keyboard operation, visible focus, logical order, Escape closes overlays, no traps.
- `aria-live="polite"` for score and turn changes; timers announce only at meaningful thresholds (1 minute, 30 seconds, 0), never every second.
- No color-only information: player colors always paired with initials or names; dice results always numeric.
- Sound cues always have a visual equivalent.
- Respect `prefers-reduced-motion` and `prefers-color-scheme`; allow overrides in Settings.
- Support 200 percent zoom and 320 px width without horizontal scrolling.
- Screen-reader-friendly score table semantics (`table`, headers, row and column scopes) and labeled controls everywhere.
- No flashing above 3 Hz, ever.
- Focus returns to the control that opened a sheet; re-renders and state changes never drop focus.
- Disabled controls keep 3:1 contrast and explain why they are unavailable.
- No hover-only affordances; everything works with touch and keyboard alone.
- Type scales with the browser's font setting; use rem for text.
- Announce at most one update per user action, and never interrupt a running timer.
- Test at 200 percent text size, not only 200 percent zoom.

### 5.11 Performance, size and legacy devices

**Budgets** (measured at every build; `bun run size` fails on regressions). They measure shipped bytes, not source or framework choice; the Svelte runtime is simply part of core:

| Budget | Limit |
|--------|-------|
| Core JS and CSS, gzipped | 45 KB (includes the ~6 KB Svelte runtime) |
| Per tool, gzipped | 12 KB (component, logic and scoped CSS; median target 6 KB) |
| Full single-file with English data | 300 KB gz target, 350 KB hard fail |
| Time to interactive, mid-range phone, `file://` | 1 s (3 s on a 2018-era low-end device) |
| Home screen paint | 100 ms |
| Any solver or dictionary query | 50 ms |
| Idle memory | 80 MB |
| Network requests at runtime | 0 |

**Engineering rules (non-negotiable):**

- Only the active tool is mounted. Switching unmounts it, cancels its timers and releases listeners.
- Count the emitted Svelte runtime in the core budget; never raise the 45 KB ceiling to absorb it.
- One rAF ticker drives all timing; timers compute from timestamps, never decrement a counter.
- Batch DOM writes per frame. Never read layout in a loop. Use `textContent` for user data, never `innerHTML`.
- Animate only `transform` and `opacity`, under 200 ms. No animated blur, shadow or filter.
- Passive listeners for touch, wheel and scroll; delegate events at the tool root.
- Cap histories at 50 entries; render at most 200 table rows at once and virtualize beyond that (`content-visibility` is an enhancement, never a dependency).
- Inline SVG only; no raster images, icon fonts or web fonts. System font stack.
- Decode data packs asynchronously on first use, cache the result, and never block first paint.
- Minify production builds, ship no source maps, and report raw plus gzipped sizes.
- Log a development warning when a tool mount exceeds 50 ms.

### 5.12 Testing and CI

- **Unit tests** (`bun test`): template parser (valid, invalid, weird), unit parsing, preset validation, RNG determinism, dice notation, scoring formulas, timer arithmetic with a fake clock, deck and bag draw invariants, solver correctness on fixed word lists.
- **Round-trip tests**: every bundled template, every tool's `example.gamebuddy`, and the worked examples in §4.2 and §4.5 parse, validate, load into a headless session, serialize and reparse identically.
- **Component smoke tests**: each tool's Svelte component mounts with default state and with a template state under `happy-dom`, with the Svelte plugin preloaded for `bun test`; no exceptions, expected root nodes. Parser, storage, ticker and timer tests stay framework-free.
- **Plugin preload**: any test that imports a `.svelte` file or `tool.svelte.ts` runs through `scripts/svelte-preload.ts`; pure `logic.ts` tests do not.
- **Self-test route** (`#/selftest`): boots every tool with defaults, runs a tiny interaction, collects console errors; usable manually on a real device and in CI.
- **No-network assertion**: stub `fetch` and `XMLHttpRequest` to throw; any call fails the self-test.
- **Template lint**: unknown keys, missing names, duplicate instances, invalid durations, illegal role counts, impossible brackets.
- **Manual matrix** before release: Chrome, Firefox, Edge and Safari desktop, iOS Safari, Android Chrome, including one browser at the Tier A floor, `file://` and hosted, portrait and landscape, reduced motion on and off, 200 percent zoom, VoiceOver and NVDA spot-checks on timer and score.
- **Typecheck scope**: `tsc --noEmit` checks plain `.ts` with `*.svelte` declared in `src/app.d.ts`; `svelte-check` checks `.svelte` files and `.svelte.ts` entries with real prop types.
- **One command**: `bun run check` equals `tsc --noEmit`, `svelte-check`, unit tests, component tests, template lint, size check and stale-manifest check.

### 5.13 Build artifacts and deployment

Two artifacts from one source:

1. **`dist/`**: `index.html`, `app.js`, and `app.css` or CSS inlined into the HTML, built by Bun with `bun-plugin-svelte`. Cacheable, hostable, used on pandaqi.com.
2. **`dist/pq-game-buddy.html`**: one self-contained file, everything inlined. This is the "double-click, works offline" artifact and the one to attach in a group chat.

Deployment (M5): copy `dist/` into the pandaqi.com `tools` folder, keep old paths working with tiny redirect HTML files (`/tools/timer/` goes to `/tools/#/tool/timer`), and verify hosted and `file://` builds separately. Never ship source maps or dev-only assets.

## 6. Milestones

Each milestone is shippable. Do not open the next one before its definition of done is met.

### M0 — Foundations (S)

**Goal:** a skeleton that will not need to be rewritten at M4. Correctness and budget come before features.

1. **M0.1 Repo and toolchain.** `package.json` (`type: module`; scripts `dev`, `build`, `build:single`, `typecheck`, `test`, `lint:templates`, `size`, `check`), `tsconfig.json` (strict, DOM, ES2020, `module: ESNext`, `moduleResolution: bundler`), `svelte.config.js` (`compilerOptions.runes: true`; no SvelteKit), `bunfig.toml` (dev-server plugin and test preload), `.gitignore`, `.editorconfig`. `typecheck` runs `tsc --noEmit` and `svelte-check`; `src/app.d.ts` declares `*.svelte` so `tsc` can follow component imports, while `svelte-check` supplies precise prop types. Dev dependencies: `svelte`, `bun-plugin-svelte`, `svelte-check`, `typescript`, `@types/bun`, `happy-dom` (6 total, 0 runtime). Pin Bun 1.4+ in `engines` (the Svelte plugin needs ≥1.3).
2. **M0.2 Folder skeleton.** Create the tree from §5.2 with placeholder modules so imports resolve, including `App.svelte`, `svelte.config.js` and one `Demo.svelte`. Add `docs/ARCHITECTURE.md` stating the invariants (core knows no tools, no network, budgets, Svelte only in the view layer).
3. **M0.3 Svelte mount and CSS base.** `App.svelte` and `main.ts` (`mount()`), a tiny `core/dom.ts` (`focus`, `portal`, `announce`), token stylesheet (color, space, radius, type), base resets, focus ring, reduced-motion query, table-mode variables.
4. **M0.4 Shell and router.** Svelte shell with header, settings, home grid, continue session, templates and search; hash router with 404; skip link; `<svelte:boundary>` error boundary that shows the error and a reset action instead of a white screen.
5. **M0.5 Registry and manifest.** `ToolMeta`, `ToolModule`, `ToolInstance` with the `component` and `data` fields; `gen-manifest.ts`; dev watcher; a dummy `demo` tool with `tool.svelte.ts` and `Demo.svelte` proving auto-discovery by appearing in the UI when its folder exists.
6. **M0.6 Storage and session.** Adapter chain, feature probe, versioned keys, settings and sessions, debounced autosave, resume prompt, storage-unavailable banner.
7. **M0.7 Settings and theme.** Light, dark and system; table mode; reduced-motion override; sound volume and mute; haptics; reset all data with typed confirmation.
8. **M0.8 Build scripts.** `build.ts` calls `Bun.build` with `bun-plugin-svelte`, emits `dist/` and the single-file HTML, prints a per-file size table and exits non-zero over budget. Extract and inline CSS. No source maps in production builds.
9. **M0.9 Test harness.** `bun test` configured, `happy-dom` (dev-only) and `scripts/svelte-preload.ts` registered so tests can import `.svelte` files, first tests for router, storage, RNG and ticker, plus a component smoke test that mounts `Demo.svelte`. `bun run check` starts with `tsc --noEmit`, `svelte-check`, tests, size and stale-manifest checks; template lint joins it in M3.
10. **M0.10 Docs skeleton.** README run instructions; `TEMPLATE-FORMAT.md` stub; tool-authoring checklist stub.

**DoD:** `bun run build` produces both artifacts; both open over `file://` and show the shell plus the demo tool; adding a folder makes a tool appear without editing imports; `bun run check` passes; core is at most 45 KB gzipped (including the ~6 KB Svelte runtime); the self-test sees zero network requests; no console errors.

### M1 — Core primitives and the vertical slice (L)

**Goal:** a genuinely playable app. After this, someone can run a simple game night. This milestone proves the architecture on the hardest interactions (timers, sharing, templates) before breadth.

1. **M1.1 Players and seats.** Player list with name, color, initial and active state; add, remove, rename, reorder; persisted; exposed to every tool through `ToolContext`. This is the most-used primitive in the app; get it right.
2. **M1.2 Ticker and clock.** One rAF loop, one coarse interval, `now()`, monotonic timestamps, visibility and focus resync. Fake-clock test helper.
3. **M1.3 Timer engine.** The modes from §3.1 (`countdown`, `up`, `flip`, `chess` with increment, delay and Bronstein, `interval`, `sequence`), drift-free arithmetic, pause and resume, alarm queue, serialize and restore from wall-clock time. Unit tests for every mode and for sleep catch-up.
4. **M1.4 Audio, haptics and wake lock.** WebAudio synth cues (bell, buzzer, tick, gong, drumroll, success), unlock on first gesture, volume and mute, vibration patterns, Wake Lock service with a graceful fallback, and the global cue sheet accessible from every screen.
5. **M1.5 UI kit.** BigTap, Stepper, NumberPad, Sheet, Toast, Confirm, Toolbar, EmptyState, PlayerChip, PlayerPicker. Keyboard and screen-reader behavior built in, not bolted on.
6. **M1.6 Timer tool UI.** Single timer (digits, scrub-to-set, plus and minus 30 seconds, presets); multi-timer grid (tap to flip or pause, long-press menu, add and remove, start, pause and reset all); chess layout; sequence view. Layout must survive four players on a 360 px phone.
7. **M1.7 Randomness MVP.** RNG service (crypto plus seed); dice with notation parser and pip visuals; coin; pick (numbers, lists, teams, seats, first player). Shared result animation and history.
8. **M1.8 Undo service.** Snapshot stack per instance, shared undo bar, coalescing, restore correctness after reload.
9. **M1.9 Basic scorepad.** Simple totals, plus and minus steps, leaderboard, edit and clear. Enough to finish a game; the full version lands in M2.
10. **M1.10 Template parser MVP.** `[game]`, `[players]`, `[tool <id>]`, keys, units, lists and comments; defaults; warnings versus errors with line numbers; `parse()` and `validate()`. No rules rendering yet. At least 20 unit tests, including malformed files.
11. **M1.11 Session bootstrap and start-from-template.** Import by drag and drop, file picker or paste; create a session with players and tool instances, including a seat stepper when the template has no `[players]` list; tab bar for multiple tools; "save as template" from the current session (state to text).
12. **M1.12 Demo content.** `kitchen-rush-timers.gamebuddy`, `yahtzee-lite.gamebuddy` and `chess-blitz.gamebuddy`, using only M1 tools; a "Try a template" card on home.

**DoD:** the Kitchen Rush timer template (four flip timers) survives a reload, a phone rotation and a tab switch with correct remaining time; dice, coin and pick produce reproducible results with a seed; a session created from a template persists and resumes; every control is keyboard-operable; a first-time user can start a timer without instructions; core plus tools stay at or below 120 KB gzipped; each M1 tool ships an example template; the three demos pass the linter and round-trip tests.

### M2 — Tracking, secrets and turns (L)

**Goal:** cover most of board, card and party game night with real tools, not placeholders.

1. **M2.1 Scorepad v2.** The modes from §3.5 (simple, rounds, categories, ledger), formulas, targets, ties, hidden mode, per-cell notes, CSV and summary export. Unit tests for formulas and tie ranking.
2. **M2.2 Score presets and references.** Category schemas for templates; optional bundled "typical winning score" hints; three demo templates prove the model before the full library lands in M3.
3. **M2.3 Lives tool.** Big totals, extra tracks, conditions, elimination, game-over detection, hidden mode.
4. **M2.4 Counters tool.** Named counters, shared bank, transfers, denominations, tallies, history.
5. **M2.5 Hidden-information UX.** Shared pass-the-phone component, anti-peek patterns, "who is holding the device" state, an opaque cover between players, a one-player inspect flow, and no back navigation into another player's secret.
6. **M2.6 Turns tool.** Order, rounds, phases, turn timer integration, pass-the-phone overlay, log.
7. **M2.7 Reveal tool.** Role dealing with counts and descriptions, hold-to-reveal, auto-hide, ballots, blind bids, reveal-all.
8. **M2.8 Session log and finish flow.** Record a play from any tool; history list; basic stats (plays, wins, streaks); JSON and CSV export. "Finish game" collects results, offers log and save, then returns home with a clean state; never auto-delete without an explicit choice.
9. **M2.9 Rules tool.** Quick card, setup checklist, markdown sections, scoring reference shared with the scorepad, glossary search and source links. Print lands in M5.

**DoD:** a full Catan game, a poker night, an MTG duel and a D&D combat can each be run end-to-end with templates; hidden information never appears twice or to the wrong player; every state survives reload and undo; the log records correct winners from score and lives; all tests green and budgets held.

### M3 — Templates 1.0 and the game library (L)

**Goal:** fulfill the original promise: download a file for a popular game, load it, play. Freeze the format here, because every later tool must ship a preset schema.

1. **M3.1 Freeze format v1.** Complete the grammar from §4.3 (multi-line values, quoted strings, multiple named tool instances, `[setup]`, `[rules]`, `[script]`, `[notes]`), write `docs/TEMPLATE-FORMAT.md` with a reference table, and add golden-file tests.
2. **M3.2 Preset schemas for every shipped tool.** Declare schemas, defaults, validation messages, `presetFromState` and "unknown key" suggestions. Add a registry-wide test that every tool has a schema and can round-trip a minimal preset.
3. **M3.3 In-app template editor.** Raw text editing with line numbers, live validation, jump-to-error, preview of the resulting session and a "Test drive" button. No rich text; plain text is the point.
4. **M3.4 Import, export and share.** Drag and drop, picker, paste, recent imports, `.gamebuddy` download, copy to clipboard, URL fragment sharing with a size warning, session JSON export and import.
5. **M3.5 Template gallery.** Search and filters (players, time, tags, tools), favorites, recently used, "surprise me", and a detail sheet showing what the template configures before loading, with a seat stepper when no `[players]` list exists.
6. **M3.6 Template linter and fixtures.** `lint-templates.ts` with the checks from §5.12; a fixture test that loads every bundled template and every tool's `example.gamebuddy` headlessly; CI fails on warnings that matter.
7. **M3.7 Author the launch library (part 1).** The 27 templates marked M3 in §4.7, each with source, author, license, disclaimer, rules summary and setup checklist. Verification per template: does the scorepad model match the real game, are player counts and win conditions right.
8. **M3.8 Save current game as template.** Serialize players and every tool instance (including custom settings) into clean, commented template text; strip session data; suggest a filename.
9. **M3.9 Authoring docs and contribution guide.** Ten-minute tutorial, annotated examples (timer-only, score-only, reveal plus script), naming conventions, attribution rules and a reviewer checklist.
10. **M3.10 Template import smoke test.** Import five representative templates over `file://` in Chrome and Safari; fix storage and import edge cases. The full device matrix is M5.4.

**DoD:** all templates bundled at this milestone lint, round-trip and load with zero console errors; a first-time user can go home, template, play in at most 3 taps; a new author can follow the docs and produce a valid template without asking questions; format v1 is documented as frozen; budgets still met.

### M4 — Breadth: the long tail (L, ship per family)

**Goal:** nothing realistic is left uncovered. Each family is independently shippable, so cut or defer whole families rather than half-building tools. Each family also authors the §4.7 templates marked M4.

1. **M4.1 Family A: randomness depth.** Dice lab (custom faces, saved sets), decks (standard, UNO, tarot, custom; deal and hidden hands), bag (tiles with values), the wheel and slot views for pick, weighted lists and teams. DoD: a bag draw and an Uno round play end to end with templates; seeded 10,000-draw distribution checks with fixed expected buckets; deck and bag state restores exactly.
2. **M4.2 Family B: words and content.** Word packs for English, Dutch, German, French and Spanish with license notes; validity lookup; filters; anagram and rack solvers; letter picker; Codenames board; migration of the categorizer into prompt packs; custom pack import; random tables. DoD: lookup under 50 ms; anagram and rack solver correct on a fixed test set; a full Scrabble turn (bag, words, score) plays end to end; each pack licensed and documented; the full build's size budget still met with English included.
3. **M4.3 Family C: table and party.** Buzzer, script runner, display and overlay mode, and table-mode polish for every tool. DoD: a Werewolf night runs entirely from a template (reveal, script, timer); overlay updates a second tab within 1 s; buzzer and alerts have visual equivalents.
4. **M4.4 Family D: competition.** Bracket (single, double, round robin, groups, Swiss), draft and auction, log v2 (stats, streaks, leaderboard filters), splits timer. DoD: an 8-player double-elimination tournament and a snake draft run start to finish; standings recompute correctly after an undone result; splits compare against a stored PB.
5. **M4.5 Family E: custom and RPG.** Custom tool builder, initiative view for turns, condition chips, dice macros, note fields. DoD: a Gloomhaven scenario and a D&D combat (with the initiative view) run end to end; a custom layout survives save, export and reload; formula cells recalculate without drift.
6. **M4.6 Cross-family gate.** All 21 tools (each with its `example.gamebuddy` fixture) and all 40 templates from §4.7 are live and lint, each tool reachable in at most two taps from home, each with a preset schema, empty state, help blurb, export and undo. Run the self-test on a low-end phone; no tool exceeds its 12 KB gzipped code budget; the full single-file build stays under 300 KB with English data.

**DoD:** the catalogue table in §3 is fully implemented (21 tools) and every tool ships its example fixture, with the 40-game library covering the common combinations; the "Need to solution" table in §2.2 has no dead entries; a complete game night (word game, party game, tournament, speedrun practice) runs offline with no console errors.

### M5 — Polish, accessibility and release (M)

**Goal:** turn a feature-complete app into something a stranger can trust.

1. **M5.1 Accessibility audit.** Keyboard map, screen-reader pass (VoiceOver and NVDA) on timer, score, reveal and turns; contrast audit in both themes; 200 percent zoom; 320 px width; reduced-motion pass; fix everything found and add the checks to the release checklist.
2. **M5.2 Performance and low-end pass.** Profile on a 2018-era low-end Android device in a Tier A browser with 4x CPU throttling; measure time to interactive, memory and long tasks; lazy-decode data; eliminate layout thrash in the ticker; confirm budgets with the size script and record the numbers in the review notes.
3. **M5.3 Localization scaffolding.** `t()` everywhere (no literal UI strings), plural helper, `Intl` formatting, pseudo-locale for layout testing, logical CSS properties for RTL. English content only; no translated copy shipped yet.
4. **M5.4 Browser and `file://` matrix.** Test the hosted build and the single-file build in Chrome, Firefox, Edge and Safari desktop, iOS Safari and Android Chrome, plus one browser at the Tier A floor (Chrome 87 or Safari 14); write the known-limitations section (Safari storage, wake lock, audio unlock, tab suspension) and verify the fallback banners.
5. **M5.5 Copy, print and delight pass.** Microcopy review for clarity and personality; empty states; onboarding for the first 60 seconds; table-mode typography; sound and haptic balance; print layouts for every exportable surface; canvas image export for score sheets and brackets; confirm nothing nags, nothing flashes and nothing blocks the score. Run a five-person first-use test (find a timer, start it, score a round, load a template) and fix every stumble.
6. **M5.6 Documentation set.** README, user guide, template format reference, tool authoring guide, accessibility notes, license and attribution page, changelog, versioning policy, and a "what to do when a template fails" page.
7. **M5.7 Release and publish.** Tag v1.0, build both artifacts, copy `dist/` into the pandaqi.com `tools` folder, add redirect stubs for the old tool URLs, verify the live site over HTTPS and a downloaded copy over `file://`, and check that the About panel credits every data source.
8. **M5.8 Post-launch checklist.** A feedback link (contact page, no tracking), an issue template for broken templates, a triage rule (broken template beats new tool), and a short post-release smoke list to run after any content change.

**DoD:** the accessibility checklist passes with no known blockers; both artifacts work on the full device matrix with documented limitations; every user-facing string goes through `t()`; the docs can take a stranger from zero to authoring a template; the live site contains no broken links to old tools; v1.0 is tagged and archived.

### M6 — After v1.0 (stretch)

Each item needs its own mini-plan and must keep the offline, no-account, no-network default. None of these block v1.0.

- **PWA install** for the hosted build (service worker, hosted only; the single file remains the offline story).
- **Community template gallery**: a static JSON index plus pull-request contributions; no runtime network requirement for the core app.
- **QR sharing** with a tiny in-house encoder, for passing a template to a phone across the table.
- **Narrator voice** using Web Speech (offline voice availability varies; always paired with readable text).
- **More language packs** and translated UI, once the i18n scaffolding has proven itself.
- **House-rule variants** as first-class template sections (`[variant]`), selectable at load time.
- **Themes** beyond light and dark, without hurting contrast or the size budget.
- **Plugin authoring kit**: a documented example tool and a conformance test others can run.
- **Remote play without a server**: exchange session codes manually (copy and paste) for games played apart.
- **Accessibility extras**: a "huge mode" beyond table mode, switch-access-friendly layouts, and a screen-reader tutorial for the reveal flow.

### Sequencing and gates

| Milestone | Depends on | Gate before starting |
|-----------|------------|----------------------|
| M0 | — | Repo access and Bun available |
| M1 | M0 | Both build artifacts open over `file://`; budgets enforced in CI |
| M2 | M1 | Timer and scorepad survive reload and rotation; undo works |
| M3 | M2 | Every shipped tool has a preset schema and a passing round-trip test |
| M4 | M3 | Format v1 frozen and documented; linter and fixtures in CI |
| M5 | M4 | All 21 tools in the index; the need table has no dead entries |
| M6 | M5 | v1.0 stable with no open release blockers |

Ship a preview after M1 (internal), a second after M3 (usable by friends), and the public build at M5. Do not skip the M3 freeze: every later tool inherits the schema and the format.

## 7. Risks and mitigations

| Risk | Why it hurts | Mitigation |
|------|--------------|------------|
| Scope creep across 21 tools | Each tool is a small product; half-built tools are worse than absent ones | Ship per family, cut whole families rather than half-building, and enforce the §2.4 review question |
| Single-file size versus data | Word packs and templates can dwarf the code | Hard budgets, gzip plus base64, lazy decode, English included by default, "all data" as a separate build |
| `file://` storage differences | Safari may not persist anything | Adapter chain, explicit export, one-time banner, hosted build as the recommended path for saving |
| Timer accuracy under tab suspension | Users will trust it with real games | Monotonic clock, wall-clock resume, visibility resync, Wake Lock, and honest limitation text |
| Template format churn | Shared files break and authors lose trust | Freeze at M3, tolerant parsing, unknown keys warn, format versioning, round-trip tests |
| Content licensing | Word lists, rules summaries and art are easy to get wrong | Public-domain or permissive data only, original prose, `LICENSES.md`, About panel, legal review before release |
| Accessibility debt | Retrofitting cost is high and excludes players | Primitives built accessible in M0 and M1, automated checks in CI, full audit at M5 |
| Audio quirks (especially iOS) | Alarms silently fail | Unlock on gesture, visible mute state, every cue has a visual equivalent, never the only signal |
| Too many settings | Contradicts "fun and easy" | Defaults first, presets above knobs, progressive disclosure, no required configuration |
| Browser API gaps | Wake Lock, BroadcastChannel and compression vary | Feature-detect, degrade to polling or plain encodings, test the matrix at M5 |
| Old URL breakage on pandaqi.com | Bookmarks and search traffic | Redirect stubs for every old tool path, stable hashes, live link check in the release checklist |
| Single implementer, long tail | Motivation and consistency | Milestones are shippable; content work (templates, prompts) can be batched; no deadline-driven shortcuts on the core |

## 8. Open decisions

Settle these during M0 and M1; each has a recommended default so work never blocks.

| Decision | Recommended default | Notes |
|----------|---------------------|-------|
| Format name and extension | `.gamebuddy` | Also accept `.txt`; MIME type irrelevant on `file://` |
| Definitions in `words` or validity only | Validity first, definitions only where WordNet-style licensing allows | Definitions add size and license complexity |
| System font stack or bundled font | System stack | Zero bytes, no licensing, instant render; the old site's fonts are not required |
| Languages in the full build | English only | Other packs ship separately or load on demand when hosted |
| Bundled templates in the single file | Yes, the curated launch set | User templates are imported, never baked in |
| Hard cap of 21 tools for v1.0 | Yes | New ideas go to M6 unless they replace an existing tool |
| URL sharing enabled by default | Yes, with a size warning | Files remain the primary path |
| User-selectable themes | No for v1.0 | Light, dark and system only |
| Analytics | Never | Not even "anonymous"; it contradicts the offline promise |

**Decisions taken while building M0–M1** (smaller option chosen where the spec was open):

- Bundled templates are compiled into a generated TS module as strings, not fetched or imported as assets; `scripts/gen-manifest.ts` also writes the schema map the linter uses.
- `.svelte.ts` tool entries hold the live `$state`; components read it through `$derived(instance.data)` so a tool switch never captures stale state.
- Timers store `startWall` (persistence, sleep catch-up) plus a monotonic start; elapsed time is `max(wallDelta, monoDelta)` so a reload or device sleep cannot drift.
- Chess delay is a per-run grace period (Bronstein-style); increment is applied at handover.
- Tests compile Svelte themselves with `css: 'injected'` in `scripts/svelte-preload.ts`; `bun-plugin-svelte`'s virtual CSS modules do not survive the test runner's module graph. Dev server and build still use the plugin.
- No `color-mix()`, `:has()`, container queries or `structuredClone`, per the Tier A floor.

## 9. Global definition of done

Every tool and mode, at every milestone, must satisfy all of these before it is considered finished:

- [ ] Works offline over `file://` and when hosted.
- [ ] Makes zero network requests (verified by the self-test stub).
- [ ] Opens in a usable default state with no configuration.
- [ ] State serializes, restores and survives reload.
- [ ] Undo covers the last 50 state changes.
- [ ] Every control is keyboard reachable, labeled and focus-visible.
- [ ] Targets are at least 48 px; layout works at 320 px width and 200 percent zoom.
- [ ] Contrast meets AA in light and dark modes; no color-only meaning.
- [ ] Reduced motion and muted sound are respected; every audio cue has a visual twin.
- [ ] Has a preset schema and an `example.gamebuddy`; validates from it and serializes back to one.
- [ ] Has an export path (text, CSV or print).
- [ ] Has an empty state, an error state and a help blurb.
- [ ] Stays within its byte and time budgets.
- [ ] Has unit tests for its logic and a smoke test for its mount.
- [ ] Has no console errors or warnings in normal use.
- [ ] Documents any new data source and its license.
- [ ] Is listed in the tool index and the need table (§2.2); by M4, at least one template uses it.

## 10. Keeping this roadmap honest

- **Update at gates, not continuously.** After each milestone, mark what shipped, what slipped, and why. A roadmap that is always rewritten is a diary, not a plan.
- **No silent scope creep.** A new idea either replaces something in the current milestone, moves to M6, or is explicitly added with the trade-off written down here.
- **Cut by family, never by half-tool.** If time runs short, remove a whole family (decks plus bag, or bracket plus draft) and keep the rest complete.
- **The document is not the product.** If a spec here turns out wrong once there is real code and real players, change the spec and note it. The pillars in §1.2 and the non-goals in §1.3 are the parts that should not move.
- **Re-read the need table before calling anything done.** §2.2 is the completeness test, and it is cheaper to notice a gap there than after release.
