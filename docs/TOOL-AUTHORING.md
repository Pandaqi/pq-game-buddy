# Adding a tool

A tool is one self-contained folder in `src/tools/<id>/`. Dropping the folder in
is enough: `bun run gen` picks it up and it appears on the home screen.

## Files

```
src/tools/<id>/
├─ meta.ts            # id, title, blurb, inline SVG icon, tags   (no Svelte)
├─ preset.ts          # preset schema                                (no Svelte)
├─ logic.ts           # pure functions + state/action types          (no Svelte)
├─ tool.svelte.ts     # create(ctx, values) → ToolInstance + actions
├─ <Tool>.svelte      # the view
└─ example.gamebuddy  # minimal template used by tests and docs
```

`meta.ts` must default-export an object whose `id` matches the folder name.

## Contract

```ts
create(ctx: ToolContext, values: PresetValues): ToolInstance<TState> & Actions
```

- `data` — a `$state` object the view binds to.
- `state()` — plain JSON clone (`JSON.parse(JSON.stringify(data))`).
- `load(state)` — tolerant: unknown junk must not throw, missing fields default.
- `presetFromState()` — settings back into template keys.
- `summary()` — plain-text export.
- `commands` — optional named actions for scripts and the overlay.

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
- [ ] `bun test` covers the logic and mounts the component.
- [ ] No `setInterval`/`requestAnimationFrame`; use `ctx.clock`.
- [ ] No `fetch`, no external assets, no new dependency.
- [ ] Under 12 KB gzipped.
- [ ] `bun run gen && bun run check` passes.

## Rules of thumb

- If a tool does not clearly belong to randomize / time / track / reveal /
  reference / flow, it is probably two tools or a view of an existing one.
- Prefer composition. A template can load `timer + score + reveal + rules`, which
  covers more ground than a bespoke tool.
- When two readings of a spec exist, implement the one with fewer settings, fewer
  files and fewer pixels.
