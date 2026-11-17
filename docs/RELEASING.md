# Releasing

The release is two artifacts from one source, one automated gate, and a short list of
things only a human can check.

## 1. Build

```bash
bun install
bun run gen          # regenerate manifest, schemas and the template index
bun run check        # manifest, tsc, svelte-check, tests, template lint, build
```

`bun run check` must pass with no warnings before anything else happens. It fails on a
stale manifest, a type error, an accessibility warning, a failing test, a template lint
error, or a size regression.

Artifacts:

| Path | Use |
|------|-----|
| `dist/index.html`, `dist/app.js`, `dist/app.css` | Hosted build, cacheable |
| `dist/chunks/` | Lazy tool modules (view included), pages and template texts, fetched on demand |
| `dist/<tool>/index.html` | Only from `bun run build:site`: one page per tool |
| `dist/index.html` from `bun run build:single` | Everything embedded, nothing else in `dist/`: the copy-around file |
| `dist/pq-game-buddy.html` | One self-contained file, works from `file://` |
| `dist/size.json` | Size report read by `bun run size` |

Never ship source maps, `node_modules`, the `vault/` reference folder, or anything from
`tests/`.

## 2. Version and changelog

1. Decide the version (semver). The template format has its own version (`format: 1`)
   and only changes with a compatibility note.
2. Add a `CHANGELOG.md` entry: what changed for players, what changed for template
   authors, and any known limitation that is new.
3. Bump `package.json`. The About panel reads the version, so check it after building.

## 3. Verify a downloaded copy

Open `dist/pq-game-buddy.html` directly from disk (double-click, `file://`):

- the home screen renders and the tool shelf works,
- a timer starts and catches up after switching tabs,
- a template opens, the score pad accepts a number, undo works,
- the log records a finished game,
- `#/selftest` reports no console errors and no network attempt.

Repeat in a private window to prove nothing depends on old storage.

## 4. Publish

These steps are the owner's, not an agent's:

1. Copy `dist/` into the `tools` folder at <https://pandaqi.com>.
2. Add or keep redirect stubs for the old tool URLs: `/tools/timer/`,
   `/tools/dictionary/`, `/tools/randomness/`, `/tools/categorizer/` each point at the
   matching `#/tool/<id>` route. Keep the old paths alive; do not rely on search
   engines noticing a new URL.
3. Check the live site over HTTPS: home, one tool, one template, one download.
4. Check that the About panel credits every data source and shows the right version.
5. Confirm the download link serves `pq-game-buddy.html` with a sensible filename.

## 5. Human gates

None of these can be automated, and none may be reported as done until they are
actually done. `ROADMAP.md` §7 keeps the same list.

- **Device matrix**: Chrome, Firefox, Edge, Safari desktop, iOS Safari, Android Chrome,
  plus one browser at the Tier A floor (Chrome 87 or Safari 14). Portrait and
  landscape, hosted and `file://`.
- **Screen readers**: VoiceOver and NVDA on timer, score, reveal and turns. Checklist in
  `docs/ACCESSIBILITY.md`.
- **Contrast**: both themes plus table mode, measured rather than eyeballed.
- **Keyboard-only** pass: one task per tool.
- **Five-person first-use test**: find a timer, start it, score a round, load a
  template. Fix every stumble, then re-run with two new people.
- **Low-end profiling**: 2018-era Android, 4× CPU throttling, time to interactive,
  memory, long tasks.
- **Second screen**: display mode on a projector or TV, readable at 2 m.
- **Visual audit**: table mode on a phone in daylight at 2 m, plus 320 px width and
  200 percent zoom in light and dark. Checklist in `docs/STYLE.md` §9.
- **Screenshots**: home, a session, the gallery and the reveal cover in light, dark and
  table mode for the release page and the pandaqi.com tools index. Replace the old set;
  delete any claim the pictures no longer support.

## 6. After release

Run this after any content or code change, not only at launch:

1. Open the hosted build and the downloaded file; both must load.
2. Load three templates from different families (board, party, video game).
3. Start a timer, finish a game, confirm the log entry.
4. Open display mode in a second tab and confirm it follows.
5. Print one score sheet.
6. Switch light, dark and table mode on a phone; nothing clips, nothing scrolls the
   page sideways, the score is still the loudest thing on screen.
7. `#/selftest`: no console errors, no network attempt.
7. Check the About panel and the changelog are current.

## 7. When something is broken

- **A bundled template fails to load**: it is a release blocker. Fix the template or
  remove it; never ship a file that the linter or the round-trip test rejects.
- **A user's template fails**: triage rule is "broken template beats new tool". Ask for
  the file, reproduce in the editor, and turn the case into a test.
- **A size regression**: cut code. The budget revision path exists (see `ROADMAP.md`
  §5.2) and is used once per milestone at most, with the arithmetic written down.
- **A security report**: there is no server and no account. The realistic issues are
  storage handling, URL-fragment parsing and template parsing. Reproduce offline, add a
  test, then ship.

## 8. Rollback

Keep the previous `dist/` and the previous single file. Rolling back is copying the old
folder back; user data is separate (storage keys are versioned, and sessions are
independent of the build). Never ship a migration that deletes sessions.
