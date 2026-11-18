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
| `dist/fonts/` | The two `.woff2` faces the stylesheet asks for, relative to `app.css`; only the single file embeds them instead |
| `dist/chunks/` | Lazy tool modules (view included), pages and template texts, fetched on demand |
| `dist/<tool>/index.html` | Only from `bun run build:site`: one page per tool |
| `dist/template/<id>/index.html` | Only from `bun run build:site`: one page per bundled or community template |
| `dist/templates.json` | From every build: the catalogue (id, name, players, time, url) that <https://pandaqi.com> checks its `gamebuddy:` links against |
| `dist/index.html` from `bun run build:single` | Everything embedded, nothing else in `dist/`: the copy-around file |
| `dist/pq-game-buddy.html` | One self-contained file, works from `file://` |
| `dist/size.json` | Size report read by `bun run size` |
| `dist/manifest.webmanifest`, `dist/icon.webp`, `dist/icon-192.png`, `dist/sw.js` | Hosted install: manifest, badge icon (256 px WebP plus a PNG fallback) and service worker. The single file and the dev shell ship without them: both set the tab icon at runtime from the badge inlined in the bundle |
| `dist/og.jpg` | The 1200 × 630 social card every hosted page names in its Open Graph tags. Served from the app root, so the URL is `<app>/og.jpg`; the tags themselves are absolute and use `PQGB_ORIGIN` |
| `dist/sitemap.xml` | Written by every hosted build: the front page, plus every tool and template page in `site` mode. A crawler only reads a `robots.txt` at the domain root, so announce this file in pandaqi.com's own: add `Sitemap: https://pandaqi.com/game-buddy/sitemap.xml` there when the app goes live |

Never ship source maps, `node_modules`, the `vault/` reference folder, or anything from
`tests/`.

The service worker is network-first with a cache fallback, and its cache name lives in
`public/sw.js`. Change caching rules, not just files: bump `CACHE` there when the
strategy changes. The build injects the manifest link and the `pq-pwa` marker into
hosted pages only, so the dev shell and the single file never register a worker.

## 2. Version and changelog

1. Decide the version (semver). The template format has its own version (`format: 1`)
   and only changes with a compatibility note. Patch for a fix that adds no surface,
   minor for anything new a player can use (a tool, a template, a language, a screen, a
   setting), major for a break in the template format, a saved session or a route.
2. Add a `CHANGELOG.md` entry: what changed for players, what changed for template
   authors, and any known limitation that is new.
3. Bump `version` in `package.json`, in the same commit as the work. It is the only place
   the number is written: `bun run gen` copies it into `src/core/version.generated.ts`
   (commit that too), and `bun run check` rejects a stale copy.
4. Push to `main`. `.github/workflows/release.yml` is the only workflow: the `gate` job
   runs `bun run check` on every push that changes something other than prose, and the
   `release` job turns the number into a release by asking one question: has the GitHub
   Release `v<version>` been published already?

   Runs cost Actions minutes, so the workflow is deliberately quiet: no pull-request
   trigger, and a push whose changed files are all `**.md` or under `docs/` starts no run.
   A version bump still runs, because `package.json` is not ignored. A commit that is
   only prose therefore changes nothing a player downloads, which is the point.
   - **No** — it takes the gate's build as the hosted build, builds the other two
     shapes, tags the commit `v<version>` and opens a Release with
     `pq-game-buddy-<version>.html` (the single
     file, everything embedded), `pq-game-buddy-<version>-hosted.zip` (the default
     build: page, scripts, styles, lazy chunks, fonts) and
     `pq-game-buddy-<version>-site.zip` (the same plus a page per tool and per template,
     `sitemap.xml` and `templates.json`).
   - **Yes** — it stops, so a change that leaves the number alone publishes nothing and
     two changes that share a version ship as one release.

   The tag is created only after every artifact exists, so a red gate or a failed build
   leaves no tag: fix it and push again, no version juggling. A run that was missed or
   needs retrying can be started by hand from the Actions tab (the workflow has
   `workflow_dispatch`). The workflow publishes a GitHub Release, not a deployment —
   pandaqi.com is still §4 below.

   Two repository settings are a one-time prerequisite and neither lives in the YAML
   file. Settings → Actions → General has to allow actions: with "Disable actions"
   selected, a push starts no run at all and the Actions tab says only "This workflow has
   no runs yet". And Workflow permissions has to be "Read and write permissions", or the
   release cannot push its tag. A push that produces no run is a settings question before
   it is a workflow-file question.

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
3. Check the live site over HTTPS: home, one tool, one template, one download. HTTPS is
   required for install; service workers do not run from `file://`, which is why the
   single file does not use one.
4. Install the hosted build, open it once online, then go offline and reopen it: home
   and the last-used tool must still load. Reload while online and confirm the version
   in Settings changed, proving the worker is network-first.
5. Check that the About panel credits every data source and shows the right version.
6. Confirm the download link serves `pq-game-buddy.html` with a sensible filename.
7. Open `/game-buddy/sitemap.xml` and one template page. Every `<loc>` must be a URL that
   answers, and the page's `canonical` must be the deployed origin rather than a localhost.
   Submit the sitemap in Search Console once; after that a new template only needs the file
   to be rebuilt and deployed, and Google re-reads the sitemap on its own schedule.

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
