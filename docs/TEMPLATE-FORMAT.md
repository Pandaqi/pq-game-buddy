# The `.gamebuddy` format — v1 (frozen)

> **Frozen at M3.** Every later tool ships a preset schema; the grammar below does
> not change in v1. A template written today must load in every future build.
> Unknown keys warn, never crash, so an older app still opens a newer file.

A template is plain UTF-8 text that configures one game and the tools it needs.
It is human-writable, diff-friendly and loadable by drag and drop, file picker or
paste. The same text is what “save as template” writes and what a share link
carries.

## Skeleton

```ini
# a comment line, ignored

[game]
name: Kitchen Rush
players: 2-4
time: 45m
tags: realtime, cooperative
source: https://boardgamegeek.com/boardgame/229792/kitchen-rush
author: pandaqi
license: CC-BY-SA-4.0
format: 1

[players]
Alice
Bob

[tool timer kitchen]
mode: flip
duration: 3m

[setup]
- Shuffle the order deck
- Give everyone an hourglass

[rules]
Serve orders before the shift ends. Flip your hourglass to act; when it empties
you wait. Track coins and waste in the counters tool.

[notes]
House rule: no phones at the table.

[script night]
1. say: Welcome to the kitchen
2. wait: 3s
3. timer: start
```

## Grammar

- **Sections** start with `[name]` on its own line. Names are case-insensitive.
  `[tool <id>]` or `[tool <id> <instance>]` configures one tool; the instance name
  defaults to the tool id and lets one template hold several timers. Instance
  names must be unique.
- **Comments** are full lines starting with `#`. There are no inline comments, so
  `#ffcc00` stays a colour.
- **Keys** accept `key: value` or `key = value`, split at the first separator, so
  `source: https://…` works. Keys are kebab-case and case-insensitive. An indented
  line under a `key: value` pair continues that value.
- **Multi-line values** use `key: |` followed by indented lines, kept verbatim.
  This is how a long rules text lives inside `[tool rules]`.
- **Duplicate keys** warn; the last value wins. **Duplicate instances** warn; the
  first one is kept.

### Sections

| Section | Parsed as |
|---------|-----------|
| `[game]` | `key: value` metadata (see below) |
| `[tool <id>]`, `[tool <id> <instance>]` | `key: value` settings for one tool |
| `[players]` | one player name per line; a leading `- ` is stripped |
| `[setup]` | one checklist item per line; a leading `- ` is stripped |
| `[rules]` | free text; `:` and `#` inside have no special meaning |
| `[notes]` | free text, stored with the session |
| `[script <instance>]` | numbered steps: `1. verb: argument` |
| `[variant <id>]` | optional house rules: `name:`, `players:`, `time:` and free text |

`[rules]` and `[setup]` are mounted automatically as a **Rules** tool when the
template does not already contain `[tool rules]`. That way the summary and
checklist are visible in the session, not just in the file.

### Variants

A `[variant <id>]` block is optional house rules. The start screen offers
"Base rules" plus every variant; choosing one appends its name and text to the rules
sheet. A variant never changes tool settings, so it cannot break a scorepad or a
timer. Only `name`, `players` and `time` are read as keys; every other line is text,
so a sentence starting "Note:" stays prose.

```ini
[variant quick]
name: Quick game
players: 2-3
time: 20m
Play to three points instead of five. Skip the setup round.
```

### `[game]` keys

| Key | Meaning |
|-----|---------|
| `name` | required; shown in the gallery, home and session header |
| `players` | a count (`2`) or range (`2-5`); drives filters and the seat stepper |
| `time` | free text such as `20m`, `10-60m`, `varies` |
| `tags` | comma list used by gallery filters (`party`, `strategy`, `rpg`, …) |
| `icon` | the name of a mark drawn beside the game in the gallery and on home: a bundled name such as `catan`, or the name of an image you upload with the template. An unknown name is ignored, not an error |
| `source` | link to the publisher or a rules page |
| `author` | who wrote the template |
| `license` | license for the template text, normally `CC-BY-SA-4.0` |
| `format` | format version; `1` today. A higher number warns |

A `[players]` list wins over the range: the listed names are used as-is, and the
range only filters the gallery.

### Script verbs

`say`, `wait`, `reveal`, `timer`, `note`. A step is `verb: argument`, optionally
prefixed with `1.`, `2.`, … Unknown verbs warn and are skipped. The script tool
ships in M4; the parser keeps the data now so templates do not need rewriting.

A script tool also accepts `voice: yes` to read `say` steps aloud with the device's
built-in voice. The text stays on screen either way, and a device without a voice
simply stays silent.

## Values

Values are coerced by the tool's preset schema, not guessed from look:

| Schema type | Template text |
|-------------|---------------|
| `number` | `3`, `-2`, `2.5` |
| `duration` | `500ms`, `90s`, `3m`, `1h30m`, `2:30`; a bare number means seconds |
| `boolean` | `yes`, `no`, `on`, `off`, `true`, `false`, `1`, `0` |
| `enum` | a listed value, case-insensitive (`countdown`, `per-player`) |
| `list` | comma list; quote items containing commas: `"one, two", three`; `[]` means empty |
| `pairs` | `name=value, name2=value2`; numeric values become numbers |
| `color` | a palette name (`red`, `teal`, …) or `#c0392b` |
| `string` | one line |
| `text` | one line, or a `\|` block for many |

## Tool schemas

Each tool declares its keys in `src/tools/<id>/preset.ts`. That file is the single
source for the settings UI, template validation, persistence and “save as
template”. The generated, Svelte-free copy lives in
`src/core/schemas.generated.ts` and is what the linter and tests read.

| Tool | Keys |
|------|------|
| `timer` | `mode`, `duration`, `per-player`, `players`, `layout`, `warn-at`, `sound`, `haptic`, `increment`, `delay`, `interval`, `count`, `phases`, `start` |
| `dice` | `roll`, `pool`, `advantage`, `success-at`, `seed`, `macros`, `faces`, `lab-count`, `sets` |
| `coin` | `coins`, `fairness`, `mode`, `target` |
| `pick` | `source`, `values`, `count`, `replacement`, `teams`, `view` (`list`/`cards`/`wheel`/`slot`), `seed` |
| `score` | `mode` (`simple`/`rounds`/`categories`/`ledger`), `rounds`, `categories`, `formula`, `win`, `target`, `hidden`, `start`, `step` |
| `lives` | `lives`, `max`, `step`, `mode`, `elimination`, `extras`, `conditions`, `hidden` |
| `counters` | `mode` (`bank`/`count`), `counters`, `bank`, `denominations`, `step`, `down`, `hidden` |
| `turns` | `order`, `phases`, `timer`, `pass`, `auto-start`, `mode`, `initiative` |
| `reveal` | `mode`, `roles`, `descriptions`, `auto-hide`, `ballot`, `options`, `min-bid`, `max-bid` |
| `rules` | `quick`, `rules`, `setup`, `glossary`, `scoring`, `source` |

Two tools have a little extra shape. `turns` takes `mode: initiative` with
`initiative: Ada=18, Bo=12`; the highest value acts first and a new round clears the
values. `dice` takes `faces: Hit, Miss, Crit` for a custom die and saved sets as
`sets: combat=Hit|Miss|Crit`; `lab-count` sets how many custom dice roll at once.

`counters` has two modes. The default, `mode: bank`, is a shared pool: `+` moves `step`
from the bank into a counter and `−` moves the same `step` back out, so nothing appears
or disappears. `mode: count` has no pool at all: `+` adds `step` straight to the counter
and `−` takes `down` away, never below zero. `down: 0` means "the same as `step`", so a
plain counter only needs `step`, and `down` only matters while counting. Use `count` for
a running score or a tally, and `bank` when the table is moving chips between piles.

Score formula language: names come from category names, lowercased with spaces
turned into hyphens. A name evaluates to the points earned in that category
(count × points). Operators `+ - * /`, brackets, comparisons, and `min`, `max`,
`sum`, `if`, `abs`, `round`, `floor`, `ceil` work. No `eval`, no property access.

## Diagnostics

Every problem carries a line number and a severity.

- **Errors** block nothing but mark the template red: missing `[game] name`, a bad
  value for a known key. “Start anyway with defaults” is always available.
- **Warnings** are tolerated: unknown sections, unknown `[game]` keys, duplicate
  keys/instances, unknown tool keys (with a “did you mean” hint), unknown tools
  (shown as unavailable), a higher format version, text before the first section.
- **Unknown tools** do not lose data: the session shows an unavailable card and
  keeps the rest running.

## Sharing and size

- A template downloads as `<slug>.gamebuddy`.
- A share link is `#/import/<base64url>` on the same page. Nothing is uploaded.
- Links are convenient but long: the editor refuses beyond ~12 KB of payload and
  tells you to share the file instead. Files are always the primary path.
- A session exports as JSON (`{ version: 1, session }`) and imports through the
  same drag-and-drop, picker or paste flow.

## Icons and images

A bundled template keeps its drawing **next to itself**: `src/data/templates/catan.gamebuddy`
and `src/data/templates/catan.icon.svg`. The `icon:` line names it; the file is what
the app draws. There is no central icon catalogue to update, and deleting a template
takes its mark with it. Community templates may do the same in `src/data/community/`,
and first-party templates for Tiamo's own games do it in
`src/data/templates/pandaqi/` (the gallery's Pandaqi filter).

For a template you bring yourself, upload the images with the `.gamebuddy` file (the
upload panel on the templates page, or drag and drop). Names decide the pairing:

- `icon: catan` finds `catan.svg`, `catan.png`, `catan.jpg`, `catan.jpeg` or `catan.webp`.
- With no `icon:` line, the template file's own name is used: `my-game.gamebuddy` finds
  `my-game.png`. `My Game.Icon.svg` works too; case, spaces and punctuation are ignored.
- Images stay on the device as data URLs, under 350 KB each and 1.5 MB in total. SVG is
  drawn through `<img>`, so a script inside one cannot run.
- A `.gamebuddy-theme` uploaded in the same batch is applied immediately.
- A session `.json` (from **Export session JSON**) is not a template: it resumes that
  game. Other templates in the same batch are kept in Recently imported.

The drawing should read at 20 px: a single object, thick strokes, no text. Bundled
marks use a 24 px grid, 1.8 stroke width, round caps and joins.

## Author checklist

1. Name the game, set `players`, `time`, `tags`, `icon`, `source`, `author`, `license`.
   If the icon is custom, put the image beside the template file.
2. Add only the tools the game needs; configure each with real values.
3. Write a short original rules summary in `[rules]`; never paste rulebook text.
4. Add a setup checklist in `[setup]` that a first-time player can follow.
5. Lint with `bun run lint:templates` and test-drive it from the editor.
6. Add a `[variant <id>]` for any house rule people actually play with; keep it text
   only so the tools stay untouched.
6. Check the scorepad model against the real scoring, and the win condition.
7. Keep the file readable: one blank line between sections, comments for anything
   surprising.

## Round trip

`parse → serialize → parse` must produce identical settings for every bundled
template and every `src/tools/*/example.gamebuddy`.
`tests/template.test.ts` (round trip) and `tests/format.test.ts` (frozen golden
file) enforce this.
