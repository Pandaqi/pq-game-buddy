# pq-game-buddy

Offline tools for game night: timers, dice, a coin, a random picker, a scorepad,
lives, counters, turns, secret reveals, a rules sheet, a play log, and a
plain-text template format with 27 ready-to-play games.

One HTML file. No install, no account, no network, no build step for the player.

## Run it

```bash
bun install
bun run dev          # dev server with HMR (bun-plugin-svelte)
```

Then open the URL Bun prints (usually `http://localhost:3000`).

## Build

```bash
bun run build        # dist/app.js, dist/app.css, dist/index.html
                     # plus dist/pq-game-buddy.html: one self-contained file
bun run build:single # same build, single-file emphasis
bun run size         # check dist/size.json against the budgets
```

`dist/pq-game-buddy.html` can be downloaded, double-clicked and used offline.
Everything else in `dist/` is for hosting.

## Check

```bash
bun run check        # stale manifest, tsc, svelte-check, tests, template lint, build
bun test             # parser, formatting, every tool's logic and actions, RNG, storage, router, undo
bun run typecheck    # tsc --noEmit and svelte-check
bun run lint:templates
bun run gen          # regenerate manifest/schemas/templates after adding a tool
```

## What exists today (M0–M3)

- App shell, hash router, error boundary, settings, light/dark/system themes,
  table mode, reduced-motion override, storage adapter chain with honest banners.
- Session model: players with colours and initials, autosave, resume, save as
  template, session JSON export/import, undo per tool, finish-game flow.
- Template format v1 frozen and documented in `docs/TEMPLATE-FORMAT.md`, with a
  golden-file test, line-numbered diagnostics, drag and drop / picker / paste
  import, URL-fragment sharing, seat stepper and template gallery.
- In-app template editor with live validation, jump-to-error, preview and test
  drive; 27 bundled templates (Catan, Ticket to Ride, 7 Wonders, Wingspan, Sushi
  Go, Yahtzee, Phase 10, Monopoly, Risk, Decrypto, Dixit, Coup, Love Letter, The
  Mind, Hanabi, Skull, Azul, Splendor, Dominion, poker, Perudo, chess, Kitchen
  Rush, Pandemic, Gloomhaven, D&D 5e, Magic).
- Tools: **timer** (countdown, stopwatch, flip, chess with increment and delay,
  interval, sequence, multi-timer grid, wake lock), **dice** (notation, keep/drop,
  reroll, exploding, success counting, pools, macros, Fate, percentile), **coin**
  (fair or weighted, call-it, best-of series), **pick** (numbers, lists, teams,
  seats, card view), **score** (totals, rounds, categories with formulas,
  ledger, per-cell notes, targets, ties, CSV), **lives** (shared or per-player,
  extra tracks, conditions, elimination), **counters** (named counters, bank,
  transfers, denominations, log), **turns** (order, rounds, phases, turn clock,
  pass-the-phone), **reveal** (role dealing, hold-to-reveal, ballots, blind bids),
  **rules** (quick card, setup checklist, text, scoring, glossary, source).
- Play log with wins and streaks, CSV/JSON export, and a finish flow that never
  deletes a saved game without an explicit choice.
- Core services: one ticker, seeded + crypto RNG, snapshot undo, synthesized cue
  sheet, haptics, wake lock, clipboard/download, pass-the-phone cover.
- `#/selftest` boots every tool headlessly and asserts zero network requests.

`ROADMAP.md` is the source of truth for what comes next (M4 breadth, M5 release
polish). Finished milestone detail is removed from it as it ships.

## Layout

```
src/core/     services and the template engine (no tool knowledge)
src/core/ui/  shared Svelte primitives
src/tools/    one folder per tool
src/data/     bundled templates
scripts/      manifest codegen, build, linter, test preload
docs/         architecture, template format, tool authoring
vault/        the old hosted tools, kept as read-only reference
```

## Ground rules

- Zero runtime dependencies, zero network requests, no tracking.
- Svelte only in the view layer; parsers, storage and timing are plain TypeScript.
- Budgets are gates: the build fails over them.
- Templates and exports are plain text the user owns.

Game names are used descriptively. This project is not affiliated with or endorsed
by any publisher; bundled rules summaries are original prose with source links.
