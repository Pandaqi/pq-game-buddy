# Licensing and attribution

Game Buddy ships content written for this project plus small, curated data sets. This
page records what is ours, what is derived, and what a template author promises.

## Code

The application code is part of the pq-game-buddy project. Runtime dependencies: none.
Svelte 5 is a build-time compiler; its emitted runtime is bundled, and Svelte is MIT
licensed. Bun and `happy-dom` are development dependencies.

## Fonts

Two typefaces ship inside the app, subset to the characters the interface uses and
inlined as base64 `@font-face` in `src/core/styles/fonts.css`. Nothing is fetched at
runtime and no font file sits in `public/`.

- **Dosis** by Edgar Tolentino, Pablo Impallari and Igino Marini (Impallari Type),
  SIL Open Font License 1.1. Display face for headings, keys and numbers.
- **Raleway** by Matt McInerney, Pablo Impallari, Rodrigo Fuenzalida and Igino Marini
  (The League of Moveable Type), SIL Open Font License 1.1. Body face.

Both are used unmodified apart from subsetting and woff2 compression, which the OFL
allows. The full licence text is available from the upstream projects; the subsetting
tooling is development-only and is not part of the shipped app.

## Marks and uploaded images

The line drawings beside templates and inside tool folders are original work for this
project, under the same terms as the code. Images a player uploads belong to that
player: they are stored only on the device, never bundled, never uploaded, and the app
claims no licence over them. A community submission that ships `my-game.icon.svg` must
be the contributor's own drawing (or carry a compatible licence recorded in the pull
request).

## Game templates

Every file in `src/data/templates/` follows the same rules:

- The rules summary is **original prose**, written for this project. No rulebook text
  is copied, paraphrased line by line, or translated from a publisher's file.
- Game names are used **nominatively** ("a helper for Catan"). No logo, box art, card
  scan, board image, icon or trademark asset is included.
- Each file carries `source:` (official page or BoardGameGeek), `author:` and
  `license:`. The default is **CC BY-SA 4.0**.
- Templates are fan-made helpers. They do not replace owning the game, and they are
  not affiliated with or endorsed by any publisher.

If you are a rights holder and want a template changed or removed, that request wins
immediately; the file is content, not architecture.

## QR encoder

`src/core/qr/qrcodegen.ts` is Project Nayuki's QR Code generator (TypeScript),
MIT licensed. It is vendored rather than installed: it has no dependencies, it is
copied with its licence header, and the only change is an `export` at the end so the
app can import it. It loads on demand, in its own chunk, when a player asks for a QR
code; nothing else imports it.

## Word lists

`src/data/words/` holds five small packs (`en`, `nl`, `de`, `fr`, `es`) and
`packs.ts`, which maps a profile to a pack. Details are in
`src/data/words/LICENSES.md`; the short version:

- The lists are **hand-curated original selections** of common words, compiled for
  this project. They are not copies of Scrabble, Wordfeud or any tournament
  dictionary, and they are not complete dictionaries.
- They are deliberately small. The in-app checker therefore reports "not in this
  list", never "not a word"; the interface says so wherever it could be mistaken for
  an authority.
- Letter values follow the familiar published point tables (a common convention, not a
  copyrightable list) and are attributed as such in the About panel.
- Adding a pack means adding its origin and licence to `LICENSES.md` in the same
  change. A pack with unclear redistribution rights does not ship.

## Prompt packs

`src/data/prompts.ts` contains prompt and idea packs written for this project: party
prompts, charades and pictionary words, would-you-rather questions, story dice,
design constraints and random tables. They are original lists, CC BY-SA 4.0. No
third-party prompt deck is reproduced.

## Player-facing attribution

Settings ends with a small footer, not a licence dossier: who made the framework, the
version read from `package.json`, and links to pandaqi.com and the repository. The
licences above are recorded here and next to each data file, which is where a
contributor and a rights holder look. The app collects nothing and contacts no server,
and the About text says so.

## What the app never does

- No analytics, telemetry, crash reporting, ads or "anonymous usage statistics".
- No remote fonts, images, scripts or stylesheets.
- No account, email address or identifier of any kind.
- No uploaded user content: templates and sessions stay on the device unless the user
  exports them.
