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
5. **Only the active tool is mounted.** Switching tabs unmounts the previous
   component, which cancels its clock subscription and listeners.
6. **One ticker.** No tool calls `setInterval` or `requestAnimationFrame`; they
   subscribe to `core/ticker.ts`. Time-based tools compute from timestamps
   (`startWall` + monotonic start), never from a decremented counter.
7. **Budgets are gates.** `bun run build` fails when the app or single-file
   budget is exceeded. Never raise a budget to fit code; cut code.
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
   `src/core/manifest.generated.ts`, `src/core/schemas.generated.ts` and
   `src/data/templates.generated.ts`. Adding a folder is enough; no imports to edit.
2. The store creates a tool with `module.create(ctx, values)`. The tool returns
   `data` (a `$state` object), `state()`, `load()`, `presetFromState()`,
   `summary()` and optional `commands`.
3. The session view mounts `module.component` with `{ ctx, instance }` inside a
   `<svelte:boundary>`, so a render error shows a recoverable panel.
4. Every mutation that should be undoable calls `ctx.undo.push(label, key)` first.
   `key` coalesces rapid taps inside 600 ms.
5. Autosave is debounced by 250 ms; each tool's state is pulled into
   `session.instances[].state` before writing.

## Storage

`pqgb:v1:settings`, `pqgb:v1:sessions` (index), `pqgb:v1:session:<id>`,
`pqgb:v1:recent`. The adapter chain is localStorage → sessionStorage → memory,
probed at boot; a banner tells the user when saving is not durable.

## Build

`bun run build` runs `Bun.build` with `bun-plugin-svelte` (browser target, so
Svelte compiles for the client), emits `dist/app.js`, `dist/app.css`,
`dist/index.html` and inlines everything into `dist/pq-game-buddy.html`. Sizes
are reported raw and gzipped; `dist/size.json` is read by `bun run size`.

## Known limits

- Timers cannot run with the screen off or a discarded tab. Timestamps make
  catch-up correct, not continuous.
- Safari may isolate storage on `file://`; the fallback banner says so.
- Audio needs a gesture: the first pointer event unlocks the audio context.
- `color-mix()` and `:has()` are avoided to stay inside the Tier A browser floor.
