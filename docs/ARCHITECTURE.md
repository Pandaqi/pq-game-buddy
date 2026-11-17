# Architecture

Game Buddy is one static app that also builds into one self-contained HTML file.
These invariants keep it small, honest and easy to extend. Read this before
adding a tool or a dependency.

## Invariants

1. **No network, ever.** No `fetch`, no fonts, no images, no analytics, no
   "check for updates". Bundled data is compiled in; user data arrives by file
   picker, drag and drop or paste. `#/selftest` stubs `fetch` and `XMLHttpRequest`
   and reports any attempt.
2. **Zero runtime dependencies.** Svelte 5 is a build-time compiler; the runtime
   helpers it emits are part of the core budget. Parser, storage, ticker, RNG,
   audio, session and undo are plain TypeScript.
3. **Core knows no tools.** `src/core/` never imports from `src/tools/`. Tools
   never import each other. They talk through `ToolContext` and the session.
4. **Svelte only in the view layer.** `.svelte` files and `tool.svelte.ts` entries
   may use runes. Everything else (parser, schema, storage, ticker, RNG, undo,
   session) is framework-free and testable with `bun test` alone.
5. **Only the active tool is mounted, and only its code is downloaded.** The
   shell knows each tool's `meta.ts` and nothing else; `core/tools.generated.ts`
   turns an id into a dynamic `import()` and the store awaits it before it builds a
   session. A tool is one chunk: its module imports its own view, so that single
   fetch brings logic, view and CSS together. Switching tabs unmounts the previous
   component, which cancels its clock subscription and listeners. Secondary pages
   load on demand behind `core/ui/LazyView.svelte`; loaded modules and resolved
   components are cached, so a second visit is instant. A static import of anything
   under `src/tools/` from the shell breaks this. Everything compiles with
   `css: 'injected'`, so a screen's styles ride inside its own chunk; `app.css`
   holds only tokens and base styles.
6. **One ticker.** No tool calls `setInterval` or `requestAnimationFrame`; they
   subscribe to `core/ticker.ts`. Time-based tools compute from timestamps
   (`startWall` + monotonic start), never from a decremented counter.
7. **Budgets are gates.** `bun run build` fails when the first visit, any single
   chunk or all deferred chunks together exceed their budget. Never raise a budget
   to fit code; cut code. A budget may only be revised once per milestone, when the
   milestone itself adds a fixed amount of finished surface (M4 set the first visit
   at 150 KB once views, pages and template texts were code-split; M5 moved whole
   tool modules into chunks and set the per-chunk and deferred ceilings); the
   arithmetic lives in `ROADMAP.md` §5.2. The single-file build has no ceiling: it
   is the whole app inlined on purpose.
8. **State is plain JSON.** Tools expose `state()`, `load(state)` and
   `presetFromState()`. `load()` never throws, ignores unknown fields and fills
   defaults. Undo stores JSON snapshots; cloning uses `JSON.parse(JSON.stringify())`
   (no `structuredClone`, no `$state.snapshot`).

## Layers

| Layer | Path | Rules |
|-------|------|-------|
| Shell | `src/App.svelte`, `src/main.ts`, `src/ui/` | Router, home, session view, settings, import flow |
| Core services | `src/core/*.ts` | Storage, ticker, RNG, audio, haptics, wake lock, undo, router, session model, share, i18n |
| Template engine | `src/core/template/` | Tokenizer, diagnostics, preset schema, coercion, serialization |
| Runtime store | `src/core/session-store.svelte.ts` | Runes mirror of the session; creates tool instances and contexts |
| UI primitives | `src/core/ui/*.svelte` | Sheet, stepper, number pad, chips, empty state |
| Tools | `src/tools/<id>/` | `meta.ts`, `preset.ts`, `logic.ts`, `tool.svelte.ts`, `<Tool>.svelte`, `example.gamebuddy`, tests |

## Tool lifecycle

1. `scripts/gen-manifest.ts` scans `src/tools/*/meta.ts` and writes
   `src/core/manifest.generated.ts` (metadata only), `src/core/tools.generated.ts`
   (one `import()` per tool), `src/core/schemas.generated.ts` and
   `src/data/templates.generated.ts`. Adding a folder is enough; no imports to edit.
2. Starting a session awaits `loadTool(id)` for each tool it uses, so the code for
   a tool only arrives when a session needs it. The store then creates it with
   `module.create(ctx, values)`. The tool returns
   `data` (a `$state` object), `state()`, `load()`, `presetFromState()`,
   `summary()` and optional `commands`.
3. The session view mounts `module.component` with `{ ctx, instance }` inside a
   `<svelte:boundary>`, so a render error shows a recoverable panel. The view is
   part of the tool's chunk, so mounting it needs no further fetch.
4. Every mutation that should be undoable calls `ctx.undo.push(label, key)` first.
   `key` coalesces rapid taps inside 600 ms.
5. Autosave is debounced by 250 ms; each tool's state is pulled into
   `session.instances[].state` before writing.

## Storage

`pqgb:v1:settings`, `pqgb:v1:sessions` (index), `pqgb:v1:session:<id>`,
`pqgb:v1:recent`. The adapter chain is localStorage → sessionStorage → memory,
probed at boot; a banner tells the user when saving is not durable.

## Build

`scripts/build.ts` runs `Bun.build` with code splitting on and one of three modes:

| Mode | Emits |
|------|-------|
| `spa` (default) | `dist/index.html`, `dist/app.js`, the shared chunk it imports, `dist/app.css`, `dist/chunks/`, plus `dist/pq-game-buddy.html` |
| `site` | the same, plus `dist/<tool>/index.html` for every non-`dev` tool |
| `single` | one `dist/index.html` with JS and CSS embedded, and nothing else |

`scripts/svelte-compile.ts` is the single Svelte compile for the build, for
`bun test` (through `scripts/svelte-preload.ts`) and for the dev server, which
loads it from `[serve.static] plugins` in `bunfig.toml`: client output,
`css: 'injected'`, and `dev` taken from `NODE_ENV` (`bun run dev` sets
`development`; the build and the tests get production output). That is why a
screen's styles land in its chunk instead of in `app.css` in development and
production alike, and why a test mounts what ships.

Both the spa and site builds end with a second pass with splitting off, which
inlines every dynamic import into the offline copy, so it never fetches a chunk.
A site page is the same shell with `data-tool="<id>"` on `<body>`, `../app.js`,
and that tool's title and description; `src/main.ts` passes the id to `App`,
which starts the tool directly.

`Bun.build` reports every output, so the build script measures the first visit by
following static `import`/`from` references from `app.js` (the chunk manifest's
bare path strings do not count) and adds `app.css`. Every chunk outside that
closure is deferred: one screen's cost, and the catalogue's total, are the two
other budgets. Sizes are reported raw and gzipped; `dist/size.json` is read by
`bun run size`.

Template data is split the same way: `src/data/templates.generated.ts` holds only
the summaries the lists render, and all 61 texts live in
`template-text.generated.ts` behind `templateText(id)` (`src/data/templates.ts`).
Parsing happens at generation time in `bun run gen`, never at start-up.

## Known limits

- Timers cannot run with the screen off or a discarded tab. Timestamps make
  catch-up correct, not continuous.
- Safari may isolate storage on `file://`; the fallback banner says so.
- Audio needs a gesture: the first pointer event unlocks the audio context.
- `color-mix()` and `:has()` are avoided to stay inside the Tier A browser floor.
