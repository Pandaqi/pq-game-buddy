# Adding a tool

A tool is one self-contained folder in `src/tools/<id>/`. Dropping the folder in
is enough: `bun run gen` picks it up and it appears on the home screen.

## Files

```
src/tools/<id>/
├─ meta.ts            # id, title, blurb, seats, icon, tags      (no Svelte)
├─ icon.ts            # this tool's mark, imported by meta.ts
├─ preset.ts          # preset schema                                (no Svelte)
├─ logic.ts           # pure functions + state/action types          (no Svelte)
├─ tool.svelte.ts     # create(ctx, values) → ToolInstance + actions
├─ <Tool>.svelte      # the view, imported by tool.svelte.ts
├─ example.gamebuddy  # minimal template used by tests and docs
└─ locales/           # en.ts, nl.ts, … (optional until M10 reaches the tool)
```

`meta.ts` must default-export an object whose `id` matches the folder name. Its
`seats` field says how much the tool cares about the session's players: `multi`
seats everyone, `one` works for a single player, `none` never reads them. The shell
starts a `multi` tool with two seats, everything else with one, and only unfolds
the seat strip for `multi` by default (the player can always open it).

`tool.svelte.ts` default-exports `{ ...meta, preset, component, create }`, where
`component` is the view imported statically from `./<Tool>.svelte`. The shell never
imports this file: `src/core/tools.generated.ts` holds one `import()` per tool, so
the tool's code, view and styles are fetched together, only when a session uses it.
Never import a tool from the shell: that pulls a screen back into the start-up
payload, which is the budget with the least room.

## Words

Player-facing text goes through `t()` from `core/i18n.svelte`. A tool keeps its own
strings in `locales/<lang>.ts` (a flat object of short keys) and registers the English
one at module scope with `registerToolStrings('<id>', en)`, so the words travel in the
tool's chunk. English is not special: it is a chunk like any other, so a build that
leaves it out ships no English words at all. Logic that prints without a view — a parser,
the theme reader, a CLI script — imports `translate()` from plain `core/i18n.ts` instead;
the rune lives only in the reactive `i18n.svelte.ts` wrapper. Write keys as `<name>`
inside the file; the runtime namespaces them to `<toolId>.<name>`. `title` and `blurb`
belong there too: the home screen looks them up with the manifest as the fallback.
`bun run gen` gathers every tool's `<lang>.ts` other than English into one chunk per
language, and `tests/i18n.test.ts` fails when a language misses a key.

Styles stay in the view's own `<style>` block. Views compile with `css: 'injected'`,
so those rules travel inside the view's chunk and no global stylesheet has to know
that the tool exists. Shared look and feel belongs in `core/styles/`, or in
`core/ui/` primitives, not copied into a tool.

## Contract

```ts
create(ctx: ToolContext, values: PresetValues): ToolInstance<TState> & Actions
component: Component<{ ctx: ToolContext; instance: ToolInstance<TState> }>
```

`create` runs synchronously once the module has been imported, so settings are
available before the view mounts; both live in the same chunk, and a render error
is caught by the session view's boundary without touching saved state.

- `data` — a `$state` object the view binds to.
- `state()` — plain JSON clone (`JSON.parse(JSON.stringify(data))`).
- `load(state)` — tolerant: unknown junk must not throw, missing fields default.
- `presetFromState()` — settings back into template keys.
- `summary()` — plain-text export.
- `results()` — optional final standings for the finish-game flow, best first
  (`{ name, score? }[]`). Return `[]` when the tool has no score.
- `commands` — optional named actions for scripts and the overlay.

Route every settings change through an action that pushes undo. A view that
writes `data.someSetting = x` directly looks fine and silently escapes undo;
this is checked whenever a tool is reviewed. Svelte only binds drafts; the action
validates, pushes and assigns. When one sheet saves several actions at once,
wrap them in `ctx.undo.batch('label', () => { … })` so one undo restores the
whole sheet.

Persist nothing yourself: the session store saves on its own.

## Checklist before calling it done

- [ ] Opens in a usable state with no configuration.
- [ ] One visually dominant action per screen; everything else quiet.
- [ ] Every setting has a default, a control, a save path and a template key.
- [ ] Undo: `ctx.undo.push(label, coalesceKey)` before each state change.
- [ ] Keyboard reachable, visible focus, labels on controls, 48 px targets.
- [ ] No colour-only meaning; numbers always written out.
- [ ] Reduced motion respected; every sound has a visual twin.
- [ ] Empty state, error state, help blurb.
- [ ] `example.gamebuddy` parses and round-trips.
- [ ] `bun test` covers the logic, the actions (including undo steps) and mounts
      the component via `module.component`.
- [ ] Styles live in the view's `<style>` block (they ship with its chunk), not in
      a global stylesheet and not copied from another tool.
- [ ] Settings, modes and editor changes go through actions, never direct writes.
- [ ] Hidden information uses `core/ui/PassThePhone.svelte`; a secret is covered
      by default and never survives a change of holder. Give the cover an
      `oncancel` (and `onnext` where useful) so the modal is never a trap.
- [ ] `results()` returns standings when the tool can decide a winner.
- [ ] No `setInterval`/`requestAnimationFrame`; use `ctx.clock`.
- [ ] No `fetch`, no external assets, no new dependency.
- [ ] Under 24 KB gzipped as one chunk (your logic, state, view, styles and data).
- [ ] No visible English left in the markup: every string is a key in
      `locales/en.ts`, with a `locales/<lang>.ts` beside it for each language the
      build ships.
- [ ] `bun run gen && bun run check` passes, including `tests/tool-contract.test.ts`,
      which runs this contract against every folder in `src/tools/`.

## Conformance test

`tests/tool-contract.test.ts` is the authoring kit's referee: it loads every tool
from the manifest, builds it with a fake context and default settings, and checks
the metadata vocabulary, the JSON state round trip, tolerant `load`, `summary`,
commands, `results` shape, preset keys and the example template. Add a folder and
the test covers it automatically. Keep the file when you fork the framework; run
it in CI and a tool that quietly breaks the contract cannot ship.

## Rules of thumb

- If a tool does not clearly belong to randomize / time / track / reveal /
  reference / flow, it is probably two tools or a view of an existing one.
- Prefer composition. A template can load `timer + score + reveal + rules`, which
  covers more ground than a bespoke tool.
- When two readings of a spec exist, implement the one with fewer settings, fewer
  files and fewer pixels.
