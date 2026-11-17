# ROADMAP

**PQ-GAME-BUDDY** is a small library of tools that help people while playing _board games_, _video games_, or game-like activities in general.

> Doc version 3 · 2026-11-17 · Owner: Tiamo / Pandaqi
>
> **Status: M0–M5 code shipped; M6 (style) is next and is deliberately unstarted.**
> `bun run check` passes end to end: stale-manifest check, `tsc`, `svelte-check`
> with 0 warnings, the full test suite, template lint (61 files · 0 errors · 0
> warnings) and a build inside budget (192 KB gzipped app, 193 KB single file).
> 21 tools are live and 40 game templates plus 21 tool examples ship. The release
> gates that need a human — hosting, the device matrix, screen-reader passes, the
> five-person first-use test, low-end profiling — are listed in §7 and are **not**
> done.

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
| M6 | **Style: the cozy table** | **Planned — do not start yet** | A full visual identity pass over every surface |
| M7 | After v1.0 | Planned | PWA, gallery, QR sharing, voice, more languages |

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
| All deferred chunks, gzipped | 250 KB | 167 KB |
| Core JS and CSS, gzipped | 45 KB | inside |
| First visit (entry + shared chunk + CSS), gzipped | 150 KB | 62 KB |
| Single file, gzipped | no ceiling: the whole app in one file | 205 KB |

**Why the first-visit budget is 150 KB.** The old 120 KB was written for eleven tools at a 12 KB ceiling and never held; M4 raised it to 200 KB to finish 21 tools. Then views and secondary pages became chunks (`loadView` + `core/ui/LazyView.svelte`) and the 61 template texts moved behind `templateText(id)`, which took the first visit from 196 KB to 119 KB. M5 then made whole tool modules chunks: `src/core/tools.generated.ts` holds one `import()` per tool and the session store awaits it before building a session, so the start-up carries only the shell, the core and each tool's `meta.ts` and `preset.ts`. That took the first visit to 62 KB, and a new tool now costs nothing at start-up at all. Each tool's view then moved back into its own chunk: once the module is itself a lazy import, a second chunk per tool only doubled the requests a session makes (a six-tool game fetched about a dozen), so a tool is one chunk today and that game fetches six. Styles still compile with CSS injected, so a tool's styles ride inside its own chunk and `app.css` is just tokens and base (1.2 KB). The per-chunk ceiling is 24 KB because a chunk is now one screen: the words tool is 21 KB (its view, logic and five language packs) and the next largest chunk is the 61 template texts at 11 KB, so a tool that passes it is one to split rather than a budget to raise. A total ceiling of 250 KB on the deferred chunks keeps the catalogue from sprawling while the first visit stays flat; the deferred total is 167 KB. The core ceiling did not move; the single-file ceiling is gone by design, because that build is the entire app inlined so one file can be copied around. These are ceilings, not targets.

### 5.3 Gates

`bun run check` runs: stale-manifest check (`bun run gen --check`), `tsc --noEmit`, `svelte-check` (0 warnings), the full `bun test` suite, `bun run lint:templates`, and `bun run build` (which enforces the budgets above: the first visit, the largest chunk and the deferred total). Deployment and the manual matrix are in `docs/RELEASING.md`.

## 6. Milestones



### M6 — Style: the cozy table (L, not started)

**Goal:** keep every behaviour, replace the visual language. Today the app is correct, legible and a bit institutional: uniform 1 px borders, neutral gray surfaces, one accent, everything in the same rounded rectangle. It should feel like a well-loved game box on a kitchen table — warm, playful, a little handmade — while staying calm enough that four people can read a score from across the room.

Reference points: 

* Developer's other projects (<https://pandaqi.com>, <https://peerful.pages.dev>, <https://thewaywardmelody.com>, <https://tiamopastoor.com>, <https://eltroubadour.com>, <https://thesagaoflife.com>, <https://rodepanda.com>)
  * Especially peerful and pandaqi are relevant here, as they are about playing games.
* The better board-game companion sites and playful video-game sites (chunky type, hand-drawn marks, colour used as identity, generous whitespace, one loud thing per screen, some small wacky/weird/characteristic/unique thing or pattern to make it stand apart from the crowd).

NOTE: 

* These projects of mine also show millions of words in _my_ writing style. Investigate a representative part of it, then add a task to M7 (BEFORE localization) to update any texts to match more closely with this (using some bullet points results and examples to guide the work)
* The Pandaqi website (<https://pandaqi.com>) contains nearly one hundred board games of mine. Check them and find the ones that would benefit from a default `.gamebuddy` template too. (Possibly mark these templates as "pandaqi" or something or place them in a different folder to keep them separate from popular published board games templates.) Do NOT actually create these yet, merely add another milestone (M8) with a specific plan for doing so.

**Non-negotiables while restyling:** 

* No network assets (no webfonts, no images fetched at runtime)
* No new dependencies
* Contrast and target sizes never regress
* The byte budget is checked after every step
* No (slow) animation may sit between the player and the score.
* No objectively ugly/inaccessible stuff, like scrollbars within scrollbars (especially if using default scrollbar instead of nicely styled ones!), horizontal scrollbars, text/buttons/interactive elements that are far too tiny, etcetera.

1. **M6.1 Identity and tokens.** Define the palette as tokens: a warm paper base (`--paper`), two or three ink tones, one playful accent per tool family (randomize = coral, time = amber, track = teal, reveal = plum, reference = moss, flow = sky), and a "table" set of six to eight colourblind-safe player colours that also work on paper. Replace the current gray ramp with warm neutrals. Radius scale (6/12/20/999), border weight (1.5–2 px, dark ink rather than gray), and a single shadow recipe. Deliverable: `tokens.css` rewritten, every view using tokens only, both themes verified, contrast table recorded.
2. **M6.2 Typography.** Two families, both system or bundling-free: a friendly display face for tool titles, scores and big numbers (wide, slightly rounded, heavy weight) and a quiet humanist text face for body and tables. Use `ui-rounded` / `system-ui` stacks with explicit fallbacks so no font ships. Define a type scale in `rem` (12/14/16/20/26/34/48/72), tabular numerals for scores and timers, optical sizes for the huge readouts, and a rule that no number a player must read is under 20 px.
   * You may download an open source/commercially available font and include it in the app, if you find one or two that would fit amazingly well.
   * But make it easy for ME to change the heading/body/accent fonts later (because I intend to design my own custom fonts later on)
   * Deliverable: scale in tokens, all views migrated, no font files added.
3. **M6.3 Shape and texture.** Cards get hand-drawn energy without pictures: slightly irregular corner radii per surface class, a 2 px ink border with an offset "sticker" shadow, and one subtle paper-grain background generated purely in CSS (repeating gradients, no image bytes). Buttons become chunky keys with a pressed state that translates 2 px down. Inputs get a soft underline instead of a box. Deliverable: primitives in `core/ui/` restyled once, so all 21 tools inherit it.
4. **M6.4 Illustration system.** A tiny set of inline SVG marks drawn on a single 24 px grid: dice, clock, card, chip, token, bracket, words, sparkle, paw, flag, heart, key. One line weight, round caps, slightly wobbly paths so they read as drawn rather than iconographic. Every tool gets a mark; the home tiles use a mark plus one accent wash. No emoji as UI (they render differently per OS and read as filler). Deliverable: an icon module of inline paths, under 6 KB gzipped total.
5. **M6.5 Layout and rhythm.** A 4 px spacing scale, 12-column mobile grid, and a consistent "stage" for the primary readout: one huge number or name in the upper third, controls in thumb reach, secondary detail folded. Home becomes a playful shelf (2 columns on phone, 3–4 on tablet) with a one-line "what is this?" under each tile. Session header shrinks to a compact bar so the tool owns the screen. Deliverable: home, gallery, session, settings and every tool on the new rhythm.
6. **M6.6 Motion and feedback.** Three named motions only: `pop` (120 ms scale on a tap), `settle` (180 ms slide on a state change), `reveal` (240 ms fade and lift for a secret). Dice and coins keep their shuffle but shorten; the buzzer gets a hard flash, not a bounce. Confetti is allowed exactly once: a finished game with a winner, dismissible, skipped under reduced motion. Every motion has a static end state, and `prefers-reduced-motion` removes all of them. Deliverable: motion tokens plus a per-tool audit that nothing animates continuously.
7. **M6.7 Warm copy.** Voice: a friend who has played this game before, never a manual. Rewrite empty states ("Nothing drawn yet — tap the bag"), confirms ("Clear the whole sheet? The scores go, the players stay"), and errors ("That's not a duration. Try 3m or 180s."). Keep every string short enough for a 360 px screen. Add a tiny bit of personality to the cue sheet and the finish flow. No jokes that block comprehension; no exclamation marks in errors.
8. **M6.8 Dark, light and table/high-contrast mode.** Light = paper and ink; dark = a dim room, not inverted neon (deep warm charcoal, desaturated accents, no pure white text); table mode = maximum contrast, 1.25× type, thicker targets, chrome hidden. Player colours need a dark variant with the same hue identity. Test every combination, including the reveal cover (must stay opaque) and print (ink on white, accents as hairlines).
   * Bonus deliverable: an easy way for people to re-THEME / STYLE it themselves. Something that works both online and offline/local, maybe some `.gamebuddy-theme` format that is very easy to understand and write for regular people. (It can do anything: change fonts, change sizes, change colors, hide/show parts of the interface, etcetera---all to help people make this tool do exactly what they WANT it to do.)
9.  **M6.9 The audit pass.** Walk every screen with a checklist: one primary action, readable at 2 m, no orphaned gray, no mixed metaphors (a sticker card next to a flat table), 44 px minimum, contrast AA, focus visible on a warm background, 200 percent zoom, 320 px width, print. Measure the gzipped delta after each step and keep the total under +8 KB.
10. **M6.10 Handover.** A one-page style sheet in `docs/` (tokens, scale, radius, shadow, icon grid, motion names, do/don't examples), plus a screenshot set for the release page and the pandaqi.com tools index. Old screenshots replaced; no stale visual claims in the README.

KEEP IN MIND: Visual styling is all about HIERARCHY. Any tool has things that are most important, things that are only sometimes important, and things that are least important (generally speaking). The style should reflect that. It should make the tool easy to use because the thing people need to click/see/read/understand is exactly the thing easiest to see now/attracting their attention. That is the core principle that will automatically lead to pretty designs.

**DoD:** every surface uses tokens only; no view has a hard-coded colour, radius or shadow; contrast and target sizes pass in light, dark and table mode; the app still makes zero network requests and adds no font or image bytes; total gzipped growth stays under 8 KB; the style sheet exists and a second person could restyle a new tool from it without asking questions.

**Explicitly not in M6:** new tools, new template keys, new settings, illustrations that need lots of files, custom webfonts, sound design changes, marketing pages.

### M7 — After v1.0 (stretch)

Each item needs its own mini-plan and must keep the offline, no-account, no-network default. None block v1.0.

- **Dice lab** (custom symbol faces, saved sets) and **wheel / slot views** for `pick`.
- **Initiative view** for `turns` (per-player initiative values, next and round reset), so D&D combat stops needing a manual order.
- **Log filters and search**, playtime totals, win rates and "what should we play" by player count and time.
- **Full string extraction** through `t()` and a first translated UI, once the text is stable.
- **PWA install** for the hosted build (service worker, hosted only; the single file stays the offline story).
- **Community template gallery**: a static JSON index plus pull-request contributions; no runtime network requirement for the core app.
- **QR sharing** with a tiny in-house encoder, for passing a template to a phone across the table.
- **Narrator voice** using Web Speech (offline voice availability varies; always paired with readable text).
- **House-rule variants** as first-class template sections (`[variant]`), selectable at load time.
- **Plugin authoring kit**: a documented example tool and a conformance test others can run.
- **Accessibility extras**: a "huge mode" beyond table mode, switch-access-friendly layouts, a screen-reader tutorial for the reveal flow.

## 7. What needs you (not the agent)

These cannot be done from this environment and are **not** claimed as done anywhere:

1. **Publish.** Copy `dist/` into the pandaqi.com `tools` folder, add redirect stubs for the old tool URLs, verify HTTPS and a downloaded `file://` copy. Steps in `docs/RELEASING.md`.
2. **Device matrix.** Chrome, Firefox, Edge, Safari desktop, iOS Safari, Android Chrome, plus one browser at the Tier A floor; portrait and landscape; `file://` and hosted.
3. **Screen readers.** VoiceOver and NVDA on timer, score, reveal and turns; keyboard-only pass; contrast check in both themes.
4. **Five-person first-use test.** Find a timer, start it, score a round, load a template; fix every stumble found.
5. **Low-end profiling.** A 2018-era Android device with 4× CPU throttling: time to interactive, memory, long tasks.
6. **A real second screen.** Projector or TV for display mode, to confirm the broadcast and the type size from across a room.
7. **Content review.** Spot-check the licensing notes and the rules summaries before publishing under your name.

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
| A restyle that fights the tools | Pretty can beat usable | M6 keeps behaviour, tokens and contrast fixed, and audits each screen for one primary action |
| Old URL breakage on pandaqi.com | Bookmarks and search traffic | Redirect stubs for every old path, live link check in the release checklist |
| Single implementer, long tail | Motivation and consistency | Milestones are shippable; content work batches; no deadline shortcuts on core |

## 9. Decisions log

Format name `.gamebuddy` (also accept `.txt`). System font stack, no bundled fonts. English data in the single file, other packs in the hosted build. Templates compiled into a generated TS module, never fetched. `.svelte.ts` entries hold the live `$state`. Timers store a wall-clock start plus a monotonic start and take the larger delta. Chess delay is Bronstein-style; increment applies at handover. Tests compile Svelte with injected CSS. No `color-mix()`, `:has()`, container queries or `structuredClone` (Tier A floor).

Score has four modes (simple, rounds, categories, ledger); ledger covers poker stacks and end-game cash. Per-cell notes are keyed `playerId|cell` and never change a total. Hidden information uses one shared `PassThePhone` modal; every cover offers an escape hatch. Reveal roles use press-and-hold plus auto-hide; ballots and bids walk players one at a time behind the same cover. A turn clock starts only when the next player dismisses the cover. `[rules]` and `[setup]` mount an implicit Rules tool. The play log is a core page plus `results()`, not a tool. `hint` is a score setting separate from `target`. Session players are attached before a tool is created; "Sync players to tools" re-reads them on request. Format v1 is frozen with a golden fixture. Formula names resolve to points earned in a category, not raw counts.

M4 choices: word packs are hand-curated original lists (licensed, small) rather than tournament dictionaries, because redistribution rights matter more than exhaustive coverage; the solver says "not in this list", never "not a word". Splits, brackets and draft order keep their arithmetic in `logic.ts` so they are testable without Svelte. Bracket state is only results; the whole tree is recomputed, so undo is a deletion and never drifts. Display mode is a broadcast of the active tool's state, not a second session, so the controller stays the only writer. `[script <instance>]` blocks are injected into a script tool by `toolsForSession`, so a template can narrate without a second `[tool script]` block. Templates with `quick:` text containing commas exposed a serializer/parser asymmetry; single-value text is no longer quoted, and quoting is unwrapped on read.

M5 choices: secondary pages are code-split (`LazyView`, one chunk each, resolved component cached) and views compile with CSS injected, so a screen's styles arrive with its chunk instead of in a stylesheet every first visit pays for; template texts are generated into their own chunk and parsed at `bun run gen` time rather than at start-up. Tool modules became chunks of their own too: the generated manifest carries only each tool's metadata, `core/tools.generated.ts` holds one `import()` per tool and the session store awaits it before building a session, so a chunk is a whole tool. Each tool's view was then folded into that chunk instead of being fetched separately, which halved the requests a session makes; the per-chunk ceiling is 24 KB (one screen), with a 250 KB ceiling on the deferred total. `--mode=site` writes one page per tool and `--mode=single` writes one embedded `index.html`, so the shared app, the static site and the copy-around file all come from one build. The core ceiling did not move; the single-file ceiling was removed as meaningless. Print is a stylesheet plus a menu action, not a separate export pipeline. Localization is scaffolding only, and the docs say so instead of implying translations exist.

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
