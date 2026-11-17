# pq-game-buddy

Offline tools for game night: timers, dice, a coin, a random picker, a scorepad,
and a plain-text template format that sets them up for a specific game.

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
bun test             # parser, timer maths, dice, RNG, storage, router, undo, component smoke
bun run typecheck    # tsc --noEmit and svelte-check
bun run lint:templates
bun run gen          # regenerate manifest/schemas/templates after adding a tool
```

## What exists today (M0 + M1)

- App shell, hash router, error boundary, settings, light/dark/system themes,
  table mode, reduced-motion override, storage adapter chain with honest banners.
- Session model: players with colours and initials, autosave, resume, save as
  template, undo per tool.
- Template parser with line-numbered warnings and errors, schema validation,
  drag and drop / file picker / paste import, seat stepper, three bundled demos.
- Tools: **timer** (countdown, stopwatch, flip, chess with increment and delay,
  interval, sequence, multi-timer grid), **dice** (notation, keep/drop, reroll,
  exploding, success counting, Fate, percentile), **coin** (fair or weighted,
  call-it, streaks), **pick** (numbers, lists, teams, seats), **score** (totals
  and rounds, leaderboard, copy sheet).
- Core services: one ticker, seeded + crypto RNG, snapshot undo, synthesized cue
  sheet, haptics, wake lock, clipboard/download.
- `#/selftest` boots every tool headlessly and asserts zero network requests.

`ROADMAP.md` is the source of truth for what comes next (M2 tracking and secrets,
M3 the template library, M4 breadth, M5 release polish).

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
