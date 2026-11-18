# Word data: sources and licences

Every word pack in this folder is a **hand-curated list of common everyday words**
written for Game Buddy. They ship as plain text in the build, so nothing is fetched.

| Pack | Words | Licence | Source |
|------|-------|---------|--------|
| `en.ts` | about 1,000 common English words | CC BY-SA 4.0 (this project) | Written for Game Buddy |
| `nl.ts` | about 300 common Dutch words | CC BY-SA 4.0 (this project) | Written for Game Buddy |
| `de.ts` | about 400 common German words | CC BY-SA 4.0 (this project) | Written for Game Buddy |
| `fr.ts` | about 500 common French words | CC BY-SA 4.0 (this project) | Written for Game Buddy |
| `es.ts` | about 700 common Spanish words | CC BY-SA 4.0 (this project) | Written for Game Buddy |
| `pt.ts` | about 200 common Portuguese words | CC BY-SA 4.0 (this project) | Written for Game Buddy |
| `it.ts` | about 200 common Italian words | CC BY-SA 4.0 (this project) | Written for Game Buddy |
| `id.ts` | about 200 common Indonesian words | CC BY-SA 4.0 (this project) | Written for Game Buddy |
| `tr.ts` | about 200 common Turkish words | CC BY-SA 4.0 (this project) | Written for Game Buddy |
| `vi.ts` | about 200 common Vietnamese syllables | CC BY-SA 4.0 (this project) | Written for Game Buddy |

## What these lists are not

They are **not** official Scrabble or tournament dictionaries. A word missing here
is not "invalid" in the real game; the app says so on the Words screen. If a
tournament-grade list is ever bundled, it must be added with its own licence file
and a source line in the About panel first.

## Adding a pack

1. Add `<code>.ts` exporting the words as one space-separated string.
2. Register it in `packs.ts` (`RAW` and `WORD_LANGS`).
3. Update this table with the word count, licence and source.
4. Run `bun run check`; the size report shows what the pack costs.

## Letter values

Scrabble letter values for English live in `src/tools/words/logic.ts`. Other
languages are scored by length, because their tile values differ between editions;
inventing values would be worse than saying we do not know them.
