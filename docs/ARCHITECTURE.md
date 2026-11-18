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
| Core services | `src/core/*.ts` | Storage, ticker, RNG, audio, haptics, wake lock, undo, router, session model, share, theme files, languages |
| Template engine | `src/core/template/` | Tokenizer, diagnostics, preset schema, coercion, serialization |
| Runtime store | `src/core/session-store.svelte.ts` | Runes mirror of the session; creates tool instances and contexts |
| UI primitives | `src/core/ui/*.svelte` | Sheet, stepper, number pad, chips, empty state, confetti |
| Style | `src/core/styles/`, `src/core/ui/icons.ts` | Tokens (the only colours), base layer, marks; contract in `docs/STYLE.md` |
| Tools | `src/tools/<id>/` | `meta.ts`, `preset.ts`, `logic.ts`, `tool.svelte.ts`, `<Tool>.svelte`, `example.gamebuddy`, tests |

## Style layer

There is one place with a colour, a radius or a shadow: `core/styles/tokens.css`.
`core/styles/base.css` sits on top of it with the lantern glows and paper grain, the
type scale, the borderless key and field, focus and print rules, and the one-shot
entrance keyframes. `core/styles/components.css` holds the primitives every screen
repeats (panels, stages, rows, fields, mode switches, tables, folds), and
`core/styles/fonts.css` holds the base64 Game Buddy and Raleway faces. `core/ui/icons.ts`
holds every mark on one grid and `core/ui/doodles.ts` the decorative woodland SVG. A tool inherits all of it; it sets `data-family` through its
`meta.family` and gets that family's accent, and it must not name a colour itself.
`docs/STYLE.md` is the contract and the restyle checklist. `core/theme.ts` parses a
player's `.gamebuddy-theme` into validated custom properties, so the tokens are the
only seam a theme needs; see `docs/THEME-FORMAT.md`.

## Languages

`core/i18n.ts` holds the language state and the lookup in plain TypeScript;
`core/i18n.svelte.ts` is a thin reactive wrapper (one `$state` revision that every read
touches), which is what a view, a tool or a component imports. That split is a rule, not
a convenience: the parser, the theme reader and the CLI scripts print words too, and logic
never takes a rune. `core/langs.ts` names the languages and `DEFAULT_LANGUAGE` says which
one boots when nobody has chosen. Ten are complete — English, Dutch, German, Spanish,
French, Portuguese, Italian, Indonesian, Turkish and Vietnamese — and each ships every
shell key and every tool key, because the gate in
`tests/i18n.test.ts` compares a language against the English set and fails on a gap.

No dictionary is compiled into the start-up. Every language, English included, is a chunk
loaded when it is picked and never fetched: `core/locales/<lang>.ts` for the shell and
`core/locales/tool-text-<lang>.generated.ts` for the tools, which `bun run gen` builds
from each `src/tools/<id>/locales/<lang>.ts`. A tool registers its own English words at
module scope (`registerToolStrings`), so its text still ships in its own chunk and there
is no English tool-text chunk at all. The registry
(`core/locales/registry.generated.ts`) is the only place that lists the loaders, and
`bun run build --langs=en` drops the rest with a bundle-time plugin, so the generated
files on disk never depend on the last build. `main.ts` awaits `startLanguage(...)` before
it mounts, so the first paint already has words; a stored language this build does not
carry falls back to the default and then to whatever the build has.

Dictionaries are plain `Record<string, string>` objects. The lookup reads the active
language only — there is no English safety net underneath, because `tests/i18n.test.ts`
fails when a shipped language misses a key or a literal `t('…')` call resolves nowhere.
`fallback` is for text that arrives with data (a tool's manifest title) and nothing else.
A key is `<area>.<name>` for the core and `<toolId>.<name>` for a tool; the template and
theme diagnostics use `diag.*` through `translate()` from the plain module. A tool's
`summaryOf` and `stepLabel` do the same, so the copy button and the play log follow the
language rather than staying English.

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

## Icons and imported images

A mark belongs to its owner. Bundled templates keep `<id>.icon.svg` in
`src/data/templates/` beside the `.gamebuddy`; tools keep `icon.ts` in their own folder
and import it from `meta.ts`. `bun run gen` reads the template SVGs into
`template-icons.generated.ts`, which only the lazy mark chunk imports. `core/ui/icons.ts`
holds just the shell's four chrome marks.

Images the player uploads with a template live in localStorage as data URLs
(`pqgb:v1:template-assets`), keyed by a normalised base name. The resolver
(`core/ui/marks.svelte.ts`) checks those first, by `icon:` then by template name, and
falls back to the built-in drawing. They are always rendered through `<img>`, never
inlined.

## Storage

`pqgb:v1:settings`, `pqgb:v1:sessions` (index), `pqgb:v1:session:<id>`,
`pqgb:v1:recent`, `pqgb:v1:imports`, `pqgb:v1:template-assets`,
`pqgb:v1:recent-tools`. The adapter chain is localStorage → sessionStorage → memory,
probed at boot; a banner tells the user when saving is not durable.

## Build

`scripts/build.ts` runs `Bun.build` with code splitting on and one of three modes:

| Mode | Emits |
|------|-------|
| `spa` (default) | `dist/index.html`, `dist/app.js`, the shared chunk it imports, `dist/app.css`, `dist/chunks/`, plus `dist/pq-game-buddy.html` and `dist/templates.json` |
| `site` | the same, plus `dist/<tool>/index.html` for every non-`dev` tool, and `dist/template/<id>/index.html` for every bundled and community template |
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
A site page is the same shell with `data-tool="<id>"` and `data-root="../"` on
`<body>`, `../app.js`, and that tool's title and description; `src/main.ts` passes the id to `App`,
which starts the tool directly. A template page is the same shell at
`dist/template/<id>/index.html` with `data-template="<id>"` and `../../app.js`, built
from the generated catalogue so the list can never drift from what ships; `App` loads
that template's text and opens the seat-and-variant chooser. The ids are the ones the
gallery uses, and `#/template/<id>` stays a permanent alias for links written before
these pages existed. Each generated page declares its own `<link rel="canonical">` and
Open Graph tags under `https://pandaqi.com/game-buddy/` (set `PQGB_ORIGIN` to build the
same site elsewhere), and `dist/templates.json` publishes that catalogue as a contract:
the website checks its `gamebuddy:` links against it (SC-9, `bun run gamebuddy` in the
studio's audit folder) instead of trusting a hand-written id.

`Bun.build` reports every output, so the build script measures the first visit by
following static `import`/`from` references from `app.js` (the chunk manifest's
bare path strings do not count) and adds `app.css`. Every chunk outside that
closure is deferred: one screen's cost, and the catalogue's total, are the two
other budgets. Sizes are reported raw and gzipped; `dist/size.json` is read by
`bun run size`.

Template data is split the same way: `src/data/templates.generated.ts` holds only
the summaries the lists render, and all 79 texts live in four
`src/data/template-text/part-<n>.generated.ts` shelves behind `templateText(id)`
(`src/data/templates.ts`). A template lands on a shelf by a stable hash of its id
(`src/data/template-group.ts`, shared with the generator), so the chunk that ships a
rulebook is a quarter of the library rather than all of it.
Bundled, first-party Pandaqi and community files are compiled into the same two
modules; only the summaries are read before a game is chosen.
Parsing happens at generation time in `bun run gen`, never at start-up.

## Known limits

- Timers cannot run with the screen off or a discarded tab. Timestamps make
  catch-up correct, not continuous.
- Safari may isolate storage on `file://`; the fallback banner says so.
- Audio needs a gesture: the first pointer event unlocks the audio context.
- `color-mix()` and `:has()` are avoided to stay inside the Tier A browser floor.
