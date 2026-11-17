# The `.gamebuddy` format (v1 draft)

A template is plain UTF-8 text that configures one game and the tools it needs.
It is human-writable, diff-friendly and loadable by drag and drop.

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
**Goal:** serve orders before the shift ends.
```

## Rules

- **Sections** start with `[name]` on its own line. Names are case-insensitive.
  `[tool <id>]` or `[tool <id> <instance>]` configures one tool; the instance name
  defaults to the tool id and lets one template hold several timers.
- **Comments** are full lines starting with `#`. There are no inline comments, so
  `#ffcc00` stays a colour.
- **Keys** accept `key: value` or `key = value`, split at the first separator, so
  `source: https://…` and `counters: served=0` both work. Keys are kebab-case and
  case-insensitive. Indented lines continue the previous value.
- **Multi-line values** use `key: |` followed by indented lines, kept verbatim.
- **Sections parse by kind:**

  | Section | Parsed as |
  |---------|-----------|
  | `[game]`, `[tool …]` | `key: value` lines |
  | `[players]`, `[setup]` | one item per line; a leading `- ` is stripped |
  | `[rules]`, `[notes]` | free text; `:` has no special meaning |
  | `[script <instance>]` | numbered steps: `1. verb: argument` |

- **Values** are coerced by the tool's schema, not by look: durations
  (`500ms`, `90s`, `3m`, `1h30m`), booleans (`yes/no/on/off/true/false/1/0`),
  numbers, ranges (`2-4`), comma lists, `name=value` pairs, palette names or hex
  colours (`red`, `#c0392b`).
- **`players:`** in `[game]` is a `min-max` range for filtering and the seat
  stepper. A `[players]` list wins and is used as-is.
- **Problems never crash the app.** Missing `[game] name` is an error; unknown
  sections, unknown keys, duplicate keys and bad values are warnings with a line
  number, and the tool still opens with defaults.
- **Unknown tools** become "unavailable" cards so a newer template does not lose
  data silently.

## Tool keys

Each tool declares a preset schema in `src/tools/<id>/preset.ts`. That schema is
the single source for the settings UI, template validation, persistence and
"save as template". `src/core/schemas.generated.ts` is the Svelte-free view used
by the linter and tests.

Current tools: `timer`, `dice`, `coin`, `pick`, `score`.

## Round trip

`parse → serialize → parse` must produce identical settings for every bundled
template and every `src/tools/*/example.gamebuddy`. `tests/template.test.ts`
enforces this.
