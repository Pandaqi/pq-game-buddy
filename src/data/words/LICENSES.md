# Word data: sources and licences

Every word pack in this folder is a **hand-curated list of common everyday words**
written for Game Buddy. They ship as plain text in the build, so nothing is fetched.

Each pack is a chunk of its own, loaded when a player picks that language, so a pack
costs nothing until it is used and no pack is capped by another one's size.

| Pack | Words | Licence | Source |
|------|-------|---------|--------|
| `en.ts` | about 2,300 common English words | CC BY-SA 4.0 (this project) | Written for Game Buddy |
| `nl.ts` | about 2,500 common Dutch words | CC BY-SA 4.0 (this project) | Written for Game Buddy |
| `de.ts` | about 1,300 common German words | CC BY-SA 4.0 (this project) | Written for Game Buddy |
| `fr.ts` | about 3,400 common French words | CC BY-SA 4.0 (this project) | Written for Game Buddy |
| `es.ts` | about 2,000 common Spanish words | CC BY-SA 4.0 (this project) | Written for Game Buddy |
| `pt.ts` | about 1,000 common Portuguese words | CC BY-SA 4.0 (this project) | Written for Game Buddy |
| `it.ts` | about 1,300 common Italian words | CC BY-SA 4.0 (this project) | Written for Game Buddy |
| `id.ts` | about 800 common Indonesian words | CC BY-SA 4.0 (this project) | Written for Game Buddy |
| `tr.ts` | about 1,300 common Turkish words | CC BY-SA 4.0 (this project) | Written for Game Buddy |
| `vi.ts` | about 1,000 common Vietnamese syllables | CC BY-SA 4.0 (this project) | Written for Game Buddy |

## What these lists are not

They are **not** official Scrabble or tournament dictionaries. A word missing here
is not "invalid" in the real game; the app says so on the Words screen. If a
tournament-grade list is ever bundled, it must be added with its own licence file
and a source line in the About panel first.

## Adding a pack

1. Add `<code>.ts` exporting the words as one space-separated string. Japanese and
   Chinese write without spaces, so a CJK pack separates words with `、` or a newline;
   a single character there is a whole word.
2. Register it in `packs.ts` (`LOADERS`), in `WORD_LANGS`, and in the `WordLang` type.
3. Add the language to `src/core/langs.ts` if the app does not offer it yet.
4. Update this table with the word count, licence and source.
5. Run `bun run check`; the size report shows what the pack costs as its own chunk.

Duplicates are dropped when a pack is parsed, so appending a word twice is harmless
and the count the screen shows is the real one.

## Letter values

Scrabble letter values for English live in `src/tools/words/logic.ts`. Other
languages are scored by length, because their tile values differ between editions;
inventing values would be worse than saying we do not know them.
