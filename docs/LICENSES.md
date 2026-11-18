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

- **Game Buddy** is the display face for headings, keys and numbers: one Bold drawing,
  derived from **DejaVu Sans Bold** (DejaVu fonts team) and therefore from **Bitstream
  Vera** (Copyright © 2003 Bitstream, Inc.). It carries the Bitstream Vera licence,
  which is permissive — use, copy, merge, publish, distribute, sell and modify are all
  allowed — on one condition: the copyright and permission notice travels with every
  copy of the fonts. The subset inlined here, and any build that ships it, is a copy,
  so the notice below is the one a release has to carry. The upstream text, including
  the Arev section for the glyphs DejaVu imported, is at
  <http://dejavu.sourceforge.net/wiki/index.php/License>.
- **Raleway** by Matt McInerney, Pablo Impallari, Rodrigo Fuenzalida and Igino Marini
  (The League of Moveable Type), SIL Open Font License 1.1. Body face.

> Fonts are (c) Bitstream (see below). DejaVu changes are in public domain. Glyphs
> imported from Arev fonts are (c) Tavmjung Bah. Bitstream Vera is a trademark of
> Bitstream, Inc. Permission is hereby granted, free of charge, to any person obtaining
> a copy of the fonts accompanying this license ("Fonts") and associated documentation
> files (the "Font Software"), to reproduce and distribute the Font Software, including
> without limitation the rights to use, copy, merge, publish, distribute, and/or sell
> copies of the Font Software, and to permit persons to whom the Font Software is
> furnished to do so, subject to the condition that the above copyright and trademark
> notices and this permission notice be included in all copies of one or more of the
> Font Software typefaces. The Font Software may be modified, altered, or added to, and
> in particular the designs of glyphs or characters in the Fonts may be modified and
> additional glyphs or characters may be added to the Fonts, only if the fonts are
> renamed to names not containing either the words "Bitstream" or the word "Vera".
> This licence and the font-related rights granted are perpetual and irrevocable. The
> full text, which governs, is the upstream one linked above.

Both faces are used unmodified apart from subsetting, woff2 compression and (for the
display face) its own name. The subsetting tooling is development-only and is not part
of the shipped app; replacing a face means re-subsetting and re-measuring the first
visit.

## Marks and uploaded images

The line drawings beside templates and inside tool folders are original work for this
project, under the same terms as the code. The app's own pictures are the badge
(`src/core/ui/brand-mark.ts`), the room behind the home hero
(`src/ui/home-art.css`) and the tab icon (`public/icon.webp`, `public/icon-192.png`),
painted for this project by its owner and shipped as WebP; they are covered by the same
terms. Images a player uploads belong to that
player: they are stored only on the device, never bundled, never uploaded, and the app
claims no licence over them. A community submission that ships `my-game.icon.svg` must
be the contributor's own drawing (or carry a compatible licence recorded in the pull
request).

## Game templates

Every file in `src/data/templates/` and `src/data/templates/pandaqi/` follows the same
rules:

- The rules summary is **original prose**, written for this project. No rulebook text
  is copied, paraphrased line by line, or translated from a publisher's file.
- Game names are used **nominatively** ("a helper for Catan"). No logo, box art, card
  scan, board image, icon or trademark asset is included.
- Each file carries `source:` (official page or BoardGameGeek), `author:` and
  `license:`. The default is **CC BY-SA 4.0**.
- Templates are fan-made helpers. They do not replace owning the game, and they are
  not affiliated with or endorsed by any publisher.
- The Pandaqi folder holds first-party templates for Tiamo's own games. They link
  pandaqi.com, and the same originality, attribution and licence rules apply: the
  summary is ours, no rulebook text or art is copied, and every file carries `source:`.

If you are a rights holder and want a template changed or removed, that request wins
immediately; the file is content, not architecture.

## QR encoder

`src/core/qr/qrcodegen.ts` is Project Nayuki's QR Code generator (TypeScript),
MIT licensed. It is vendored rather than installed: it has no dependencies, it is
copied with its licence header, and the only change is an `export` at the end so the
app can import it. It loads on demand, in its own chunk, when a player asks for a QR
code; nothing else imports it.

## Word lists

`src/data/words/` holds ten small packs (`en`, `nl`, `de`, `fr`, `es`, `pt`, `it`, `id`,
`tr`, `vi`) and `packs.ts`, which maps a profile to a pack. Details are in
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
