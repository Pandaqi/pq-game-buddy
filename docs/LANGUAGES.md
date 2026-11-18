# Adding a language

The app ships ten languages and is prepared for three more — Japanese, Chinese (Simplified)
and Korean. This page is the whole job, in the order the gates complain about it. Read
`docs/ARCHITECTURE.md` §"Languages" for how the pieces fit; this is the checklist.

A language is **two chunks** — `src/core/locales/<id>.ts` for the shell and the generated
`src/core/locales/tool-text-<id>.generated.ts` for the tools — plus, if the Words tool is
to work in it, a word pack that is a chunk of its own. It costs nothing to the first visit
and about 22 KB to the deferred total; it appears in the language sheet the moment its
dictionary file exists, so a half-finished language must never be committed.

## Steps

1. **Shell dictionary.** Copy `src/core/locales/en.ts` to `<id>.ts` and translate every
   value. Keep the keys exactly as they are: `tests/i18n.test.ts` compares the key sets and
   fails on a missing or extra one. Keep `{count}`-style placeholders and their names.
2. **Tool dictionaries.** Every folder in `src/tools/<tool>/locales/` needs `<id>.ts`.
   Copy each `en.ts`; the keys are the tool's own, namespaced at runtime as `<tool>.<key>`.
3. **Regenerate.** `bun run gen` writes `tool-text-<id>.generated.ts` and adds the language
   to `registry.generated.ts`. This is also what makes the build and the picker see it.
4. **Word pack.** `src/data/words/<id>.ts` exports one default string of words; register the
   id in `WordLang`, `WORD_LANGS` and `LOADERS` in `src/data/words/packs.ts`, and add a row
   to `src/data/words/LICENSES.md` with its count, licence and source. Latin-script packs
   separate words with spaces. Japanese and Chinese write without spaces, so a CJK pack
   separates words with the ideographic comma (`、`) or a newline; a single character is a
   valid word there, and the parser knows it.
5. **Name.** `src/core/langs.ts` already carries the entry for the prepared three
   (`ja`, `zh`, `ko`). A new language outside them needs one line there too: the label in
   the language's own script, its English name as the quiet second line.
6. **Run the gate.** `bun run check`. It will also compare the localized tool folders with
   the explicit `LOCALES` list in `tests/i18n.test.ts` — add a tool there only if it grew a
   `locales/` folder, which is the step that says its strings moved out of its view.

## Japanese, Chinese and Korean

The fonts are already there: `src/core/styles/fonts/cjk-{ja,zh,ko}.woff2`, named by
`docs/STYLE.md` §2, and `fonts.css` already sets the right face, the looser line height and
the character-level wrapping by `:lang()`. A translation needs nothing font-shaped unless it
uses characters outside the bundled sets — then add them to `scripts/fonts-cjk.ts` and run
`bun run fonts:cjk`. Check first: the Japanese face has kana and the 2,136 jōyō kanji, the
Chinese face the 3,500 common simplified characters, the Korean face every hangul syllable.

What to watch in the copy itself:

- **No spaces between words** in Japanese and Chinese, so a sentence can wrap anywhere.
  That is why the body line height is 1.75 in those languages: square glyphs need the air.
- **Fullwidth punctuation**: `。、！？` and the corner brackets `「」` for Japanese,
  `。，！？` and `“”` or `「」` for Chinese. Nothing in the UI draws a box of its own; the
  bundled faces carry these marks.
- **No case.** Anything the interface uppercases with `text-transform` stays as written, so
  a kicker or a button label does not need a second translation for its capitals.
- **Korean spaces its words** like Latin does, and mixes hangul with Latin acronyms; keep
  those Latin runs, they are read as Latin.
- **Numbers and units** read left to right in all three; `{count}` placeholders stay inside
  the sentence where the counter belongs, which is not always where English puts it.
- **Keep the tone**: the English copy is plain, warm and short. A translation that turns it
  formal or chatty is a different app.

## What a reviewer should check

- Switch to the language, walk the home screen, one tool and the About panel: no missing
  key should ever reach a screen (the fallback shows the key itself, which is loud on
  purpose).
- A session with a long team name and a long template title still fits: CJK text is denser
  than Latin, but a heading at the same size is wider.
- The Words tool loads that language's pack and shows a plausible count.
- Print and the single-file build still work; the fonts travel with them.
