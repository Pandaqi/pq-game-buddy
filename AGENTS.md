# AGENTS.md

How to work on **pq-game-buddy**: an offline game-night toolkit that builds into one
HTML file. Read this page, then follow the links. Everything else lives in `docs/`.

## Start here

| Need | Read |
|------|------|
| What we are building and why, milestone order | [ROADMAP.md](ROADMAP.md) |
| Non-negotiable invariants, layers, build pipeline | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| `.gamebuddy` template format (frozen v1) | [docs/TEMPLATE-FORMAT.md](docs/TEMPLATE-FORMAT.md) |
| `.gamebuddy-theme` keys and validation | [docs/THEME-FORMAT.md](docs/THEME-FORMAT.md) |
| Add or change a tool | [docs/TOOL-AUTHORING.md](docs/TOOL-AUTHORING.md) |
| Using the app, template errors, limitations | [docs/USER-GUIDE.md](docs/USER-GUIDE.md) |
| Contributing a community template | [docs/COMMUNITY.md](docs/COMMUNITY.md) |
| Visual language: tokens, type, marks, motion | [docs/STYLE.md](docs/STYLE.md) |
| Accessibility rules and manual checklist | [docs/ACCESSIBILITY.md](docs/ACCESSIBILITY.md) |
| Data sources, licences, attribution | [docs/LICENSES.md](docs/LICENSES.md) |
| Versioning, release steps, smoke list | [docs/RELEASING.md](docs/RELEASING.md) |
| What changed | [CHANGELOG.md](CHANGELOG.md) |

`ROADMAP.md` is the plan; the docs above are the contract. If code and docs disagree,
fix the doc in the same change.

## Commands

```bash
bun install
bun run dev          # dev server, HMR, prints the URL
bun run gen          # regenerate manifest/schemas/templates after adding a tool or template
bun run check        # stale manifest + tsc + svelte-check + tests + template lint + build
bun run build        # dist/ (hosted, code-split) + dist/pq-game-buddy.html (offline copy)
bun run build:site   # also dist/<tool>/index.html: one small page per tool
bun run build:single # dist/index.html only, JS and CSS embedded: one file to copy around
bun run size         # check dist/size.json against the budgets
```

`bun run check` is the gate. Never merge with it red, never raise a budget to make it
pass. Do not use `bun test --update-snapshots` style shortcuts; there are no snapshots
by design.

## Non-negotiables (short version)

1. **No network, ever.** No `fetch`, fonts, images, CDNs, analytics. Data is compiled in;
   user data arrives by drag-and-drop, file picker or paste. `#/selftest` asserts this.
2. **Zero runtime dependencies.** Svelte 5 is a compiler. No CSS framework, router or
   state library. A new dependency is a design decision, not an implementation detail.
3. **Svelte only in the view layer.** `.svelte` and `tool.svelte.ts` may use runes;
   parser, schema, storage, ticker, RNG, session and tool logic stay plain TypeScript.
4. **Core knows no tools, tools know no tools.** They talk through `ToolContext` and the
   session, so any tool folder can be deleted without breaking another.
5. **Budgets are gates.** First visit ≤ 150 KB gzipped (entry + shared chunk + CSS),
   core ≤ 45 KB, one chunk ≤ 24 KB, all deferred chunks ≤ 250 KB. A tool's logic,
   state, view and CSS are one chunk loaded on demand, so adding a tool does not grow
   the start-up at all. The single-file build has no ceiling: it is the whole app in
   one file. A budget moves only when a milestone adds a fixed amount of finished
   surface, once, with the arithmetic written down in `ROADMAP.md` §5.2.
6. **Every change is undoable and saved.** Tool settings go through an action that calls
   `ctx.undo.push()`; views only bind drafts. `load()` never throws on junk.
7. **Accessibility is not a later pass.** 48 px targets, labels, keyboard path, no
   colour-only meaning, every sound has a visual twin. Read `docs/ACCESSIBILITY.md`.

## Code conventions

- **Prefer files under 500 lines.** If one grows past that, split it (`logic.ts` for
  rules, `tool.svelte.ts` for state and actions, the component for the view). Existing
  long files shrink over time; do not add to them without a reason.
- **Prefer no more than 10 files or folders at the same level.** Group by meaning
  (`docs/`, `src/data/words/`), not by type. `src/tools/` is the one sanctioned
  exception: the manifest generator requires exactly one folder per tool.
- **One folder per tool** with `meta.ts`, `preset.ts`, `logic.ts`, `tool.svelte.ts`,
  `<Tool>.svelte`, `example.gamebuddy`. Adding the folder is enough; `bun run gen` finds it.
- **Never import a tool from the shell.** `src/core/manifest.generated.ts` carries
  only each tool's `meta.ts`; `src/core/tools.generated.ts` maps an id to
  `() => import('../tools/<id>/tool.svelte.ts')`, and the store awaits that import
  before it builds a session. A tool imports its own view and exports it as
  `component`, so one tool is one chunk; `App.svelte`'s secondary pages stay behind
  `lazyView()` from `core/ui/LazyView.svelte`. A static import of anything under
  `src/tools/` moves that screen back into the start-up payload, which is the one
  budget this project cannot afford to spend.
- **Names:** files kebab-case, types PascalCase, functions and variables camelCase,
  preset keys and template sections kebab-case. Tool ids match their folder name.
- **Tokens only.** A view never writes a hex colour, a radius or a shadow; it uses
  `core/styles/tokens.css`, the family accent and `core/ui/icons.ts`. See
  `docs/STYLE.md` for the scale, the mark grid and the restyle checklist.
- **Comments explain why, not what.** Keep the existing doc-comment style: one line of
  intent at the top of each file.
- **Tests live with their subject:** pure logic tests in `tests/`, fixtures in
  `tests/fixtures/`, and every bundled template is linted by `scripts/lint-templates.ts`.
- **Copy:** plain, warm, short. Sentence case for buttons. Say what happened, then what
  to do about it. No exclamation marks in error messages, no jargon.

## Working on the roadmap

- Build in milestone order; do not start a later tool because it looks fun.
- A milestone is done only when its definition of done is met; then compress its detail
  in `ROADMAP.md` and record the choices in §9 ("Decisions log").
- New ideas either replace something in the current milestone, move to the "after v1.0"
  section (M7), or go into §9 with the trade-off written down.
- Items that need a human (real devices, screen readers, hosting at pandaqi.com,
  first-use tests) are listed in `ROADMAP.md` §7 ("What needs you"). Never claim they
  are done, and never move one into a "shipped" list.

## Do not

- Do not commit secrets, tokens or personal data; there is nothing to authenticate.
- Do not add a build step for the user; the single HTML file stays double-clickable.
- Do not render user or template text with `innerHTML`; use `textContent` and Svelte.
- Do not use APIs above the Tier A browser floor (`docs/ARCHITECTURE.md`): no
  `structuredClone`, `$state.snapshot`, `:has()`, `color-mix()`, container queries.
- Do not push, deploy or publish without being asked.
