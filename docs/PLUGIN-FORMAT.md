# The `.gamebuddy-tool` format

> **Status: built (2026-11-18).** `src/core/tool-file.ts` parses, validates, stores
> and serialises the file; `src/tools/plugin/` draws its blocks; a drop installs a
> definition before the template that names it; Settings lists, exports and removes
> one; `#/toolfile/` shares one; and `[script]` gained the `do:` verb. A tool file
> may also carry `[script]` sections of JavaScript, inline or from a `.js` picked
> with it (grammar in §3, decided in §9.6). The gate is `tests/plugin.test.ts`, plus
> `bun run lint:templates` over every bundled example.
>
> **The four design questions are answered in §9.**
>
> **The question it answers:** can a `.gamebuddy` file add a *tool*? Today, no.
> `resolveTemplate` looks each `[tool <id>]` up in `src/core/schemas.generated.ts`,
> which is written from the tool folders at build time, and `session-store.moduleFor`
> needs `hasTool(id)` from `src/core/tools.generated.ts`, which is one `import()` per
> folder. An id with no folder gets `diag.unknown-tool` and an "unavailable" card.
> A template can configure the tools this build ships, and it can configure `custom`
> (fields, counters, checklist, table, formula, a sheet per player), but it cannot
> invent a tool.

## 1. What this format is

One plain-text file, one new tool. It reuses the `.gamebuddy` tokenizer exactly:
`[section]` headers, `key: value` (or `key = value`), `key: |` blocks, `#` whole-line
comments, case-insensitive kebab-case keys, line-numbered diagnostics, unknown keys
warn instead of failing. What is new is which sections it accepts.

**It contains no markup and no CSS.** A tool file says what the tool is called, which
settings a game may pass it, and which of the app's own blocks it draws, in what order.
The view is composed from components that already exist and already pass the
accessibility gate.

**Code is opt-in and narrow.** A `[script]` section holds JavaScript — written inline
or read from a `.js` picked beside the file — and it runs only from the entry points in
§3: a start, a reset, a button, or another tool's command. It cannot draw anything;
the blocks do that. §7 says what that trade buys and what it costs.

## 2. Skeleton

```ini
# check-tray.gamebuddy-tool — a d20 check tray for any tabletop game

[tool]
id: check-tray
name: Check tray
blurb: Roll a d20, add a modifier, count how many checks beat the target.
family: randomize
seats: multi
tags: d20, checks

[setting]
sides: number = 20
start-modifier: number = 0
target: number = 12

[block roll]
kind: roll
label: Roll
notation: 1d{sides}

[block modifier]
kind: counter
label: Modifier
start: {start-modifier}
step: 1

[block margin]
kind: readout
label: Margin
formula: roll + modifier - {target}

[block passes]
kind: counter
label: Passes
start: 0
step: 1
min: 0

[block tally]
kind: button
label: Count this check
do: counter passes +1

[block clock]
kind: button
label: Start the timer
do: tool timer start

[block note]
kind: note
text: |
  A margin of 0 or more is a pass. Every roll is undoable, so a miscount is one
  tap away from being fixed.
```

The game that uses it is an ordinary template, and nothing in that template changes:

```ini
[game]
name: Skill Check Night
players: 2-5
time: 60m
tags: rpg

[tool check-tray]
sides: 20
target: 15
start-modifier: 3
```

`start-modifier` is a settings key of the tool file, so it coerces, validates and
reports its line exactly like `duration:` on the timer does.

## 3. Grammar

- **Sections** are `[tool]`, `[setting]`, one `[block <id>]` per block and one
  `[script <id>]` per script. Names are case-insensitive; block and script ids are
  kebab-case and unique, because a formula, a `run:` line or a command names them.
- **Comments, quoting, duplicates, multi-line values** behave as in v1: `#` only on
  its own line, so `#ffcc00` stays a colour; the last of two duplicate keys wins and
  warns; two blocks with one id keep the first and warn.
- **Order is the file order.** Blocks draw top to bottom, so the file reads like the
  screen.

### `[tool]` keys

| Key | Meaning |
|-----|---------|
| `id` | required; `[a-z][a-z0-9-]{1,23}`; must not match a built-in tool id |
| `name` | required; the title on the shelf and in the session header |
| `blurb` | one line for the home tile and the shelf |
| `family` | required; `randomize`, `time`, `track`, `reveal`, `reference` or `flow` — this is the accent the screen borrows |
| `seats` | `multi`, `one` or `none`; how much it reads the session's players |
| `icon` | optional; a bundled mark name, or the name of an image uploaded beside the file (the same pairing an `icon:` uses) |
| `tags` | comma list, for the shelf's search |

### `[setting]` lines

One line per key: `name: type = default`. The types are the nine that
`core/template/schema.ts` already coerces, so a value in a `[tool …]` block means
exactly what it means everywhere else — no second value language.

| Type | Written as | Notes |
|------|------------|-------|
| `number` | `health: number = 3` | `min`/`max` in brackets: `number(1..20)` |
| `duration` | `delay: duration = 30s` | `500ms`, `3m`, `1h30m`, `2:30`, bare seconds |
| `boolean` | `sounds: boolean = yes` | yes/no/on/off/true/false/1/0 |
| `enum` | `mode: enum(count, bank) = count` | values in brackets, one of them the default |
| `string` | `label: string = Wood` | one line |
| `text` | `intro: text =` then an indented block | multi-line, kept verbatim, like a preset's |
| `list` | `items: list = "one, two", three` | comma list, quotes for commas, `[]` empty |
| `pairs` | `values: pairs = Ada=18, Bo=12` | numbers become numbers |
| `color` | `tint: color = red` | palette name or `#c0392b` |

A block reads one with `{name}`, which substitutes the coerced value as text. A
placeholder that names nothing warns and substitutes nothing, so a typo shows up in
the editor rather than at the table.

### `[block <id>]` kinds

| `kind` | Draws | Keys |
|--------|-------|------|
| `counter` | one labelled number with − and + | `label`, `start`, `step`, `min`, `max`, `per-player` |
| `checklist` | ticking items | `label`, `items` |
| `table` | an editable grid with row and column totals | `label`, `rows`, `cols` |
| `field` | one input | `label`, `type` (`text`/`number`/`select`/`note`), `options`, `default` |
| `roll` | a dice or token roll with its result in large type | `label`, `notation`, `faces`, `count` |
| `pick` | choose from a list | `label`, `from`, `count` |
| `readout` | a computed number | `label`, `formula` |
| `button` | one action | `label`, `do`, `run`, `confirm` |
| `note` | static text | `label`, `text` |

A button needs a `do:` verb, a `run:` script, or both; with both, the `do:` happens
first and the script sees the result.

`per-player` repeats a counter as one row per player at the table. Rows are keyed by
the session player's own id and drawn from the live player list, so adding a player
adds a row at its start value, removing one drops its row, and renaming keeps the
value. The game menu's sync action prunes seats that have left, and the `plugin`
runtime counts as one synced tool like every other tool that has players.

### `formula:`

The evaluator the score and custom tools already use: numbers, `+ - * /`, brackets,
`min`, `max`, `sum`, `if`, `abs`, `round`, `floor`, `ceil`, and bare identifiers that
are block ids. No `eval`, no property access, no function calls that are not on that
list. A half-typed formula shows a dash and never breaks the screen.

### `do:` verbs

A closed set, each mapping to a call the shell already offers: `counter <id> +N`,
`counter <id> -N`, `counter <id> =N`, `toggle <id>`, `roll <id>`, `pick <id>`,
`shuffle <id>`, `reset`, `toast <text>`, `sound <bell|buzzer|tick|gong|drumroll|success>`,
and `tool <instance> <command> [arg]`. The last one is the composition seam: a tool
file can press a button on another mounted tool through
`ctx.session.instance(id)?.commands?.[command](arg)`, so "start the timer", "next
turn" and "deal a card" are a line each instead of a second implementation. A command that does not exist on that tool warns in the editor
and does nothing at the table. This is the same dispatch a `[script]` step uses, so a
night's flow can press a tool file's button in order too; see §9.3.

### `[script <id>]`

One JavaScript section per entry point. The body runs as a function that receives
`gb`, the small API below:

```ini
[block spend]
kind: button
label: Spend a coin
run: spend

[script spend]
body: |
  if (gb.counter('coins') > 0) {
    gb.add('coins', -1)
    gb.log('Spent a coin')
  }
```

Or keep the code in a file and pick it with the tool file when you install it
(Settings, or the same drop):

```ini
[script helpers]
file: helpers.js
when: none
```

| Key | Meaning |
|-----|---------|
| `body` | inline JavaScript, multi-line with `\|` |
| `file` | a `.js` name picked with the tool file (a `.js` in the same drop is offered to every tool file in it); its text becomes the body, and the exported file carries it inline |
| `when` | `start`, `reset` or `none` (the default) |

A button runs a script with `run: <id>`; every script is also a command, so a
template's `[script]` — or another tool — can reach it as `do: <instance> <id>`.

The entry points, exactly: `start` runs once when a fresh session mounts (a resumed
session loads its saved state instead, so a start never runs twice); `reset` runs
after the pad resets; a button press runs its `run:` script; a command call runs the
named script.

### The `gb` API

| Call | Does |
|------|------|
| `gb.setting(name)` | the value the template passed, after coercion |
| `gb.players()` | one row per seat, with its counter values |
| `gb.counter(id)`, `gb.add(id, n)`, `gb.set(id, n)` | a counter; `add` is what the ± buttons call |
| `gb.field(id)`, `gb.setField(id, value)` | one field |
| `gb.cell(id, row, col)`, `gb.setCell(id, row, col, value)` | a table cell, one-based |
| `gb.toggle(id)` | tick every item of a checklist, or clear them |
| `gb.roll(id)`, `gb.pick(id)` | roll or draw, and return the result |
| `gb.reset()` | the same reset the button does, reset scripts included |
| `gb.toast(text)`, `gb.log(text)`, `gb.sound(cue)` | the shell's own feedback |
| `gb.tool(instance, command, arg?)` | press another mounted tool |
| `gb.helpers` | an object the definition's scripts share for their own functions |

Everything goes through the action a button would call, so every change is undoable
and a counter's `min`/`max` still holds. A thrown error becomes a toast and a log
line naming the script; it never reaches the screen as a broken render or stops the
next tap. Nothing a script calls is asynchronous: a script is one synchronous pass,
and a timer or animation is still the shell's job.

### Limits

24 blocks, 16 KB of text, 20 settings, 8 scripts, 8 KB per script and 16 KB of script
together. These are not tidiness: they keep one tool file, its chunk and its saved
state inside the per-screen ceiling. The parser compiles each script with
`new Function` to catch a syntax error, but it never runs one.

## 4. How the app resolves it

The template format does not change, only the lookup does:

1. `resolveTemplate` asks for a schema by id. It gets the compiled map first, then the
   installed tool files. A miss is still `diag.unknown-tool` and still an
   "unavailable" card, so a file from a build that has no tool files keeps working.
2. `session-store.moduleFor` falls back to a plugin module before it gives up. Every
   installed tool shares **one** compiled chunk, `src/tools/plugin/`, whose `create`
   reads the definition; installing ten tools adds no chunk and no import. The shell
   still reaches it through `loadTool('plugin')`, so nothing in `src/core/` gains an
   import of anything under `src/tools/`.
3. A `.gamebuddy-tool` that arrives in the same drop as its `.gamebuddy` is installed
   **first**, so a game and the tool it needs travel together. The import toast reports
   it like a theme: "1 tool ready".

Definitions are text in localStorage under `pqgb:v1:tool-files`, keyed by id — the same
shape as the theme text, so Settings can list them, export one back out as a file, and
remove one. The tool shelf shows them with a small "yours" mark, and a session whose
definition has been removed shows the ordinary unavailable card, not a broken screen.

## 5. What it deliberately cannot do

- **No markup and no CSS.** The blocks are ours, so a contributed tool cannot break the
  contrast table, the 48 px floor, the print rules or the focus ring, and cannot hide
  a control from a screen reader.
- **A script runs as the page, not as a guest.** It gets `gb`, but nothing stops it
  reaching `window`, `document`, `fetch` or `localStorage`: it is the author's code in
  this tab. A script cannot draw or style anything — only the blocks do that — and a
  throw is contained to a toast, but there is no sandbox. Install a tool file from
  someone you trust, and read its `[script]` sections first. Every other value is still
  validated against a fixed vocabulary before it is used.
- **No new files, no external assets.** `icon:` may name an image uploaded beside it,
  stored as a data URL and drawn through `<img>`, exactly as a template's mark is.
- **No reaching into other tools' state.** Only their documented `commands`.
- **No shadowing.** A tool file may not take a built-in id; that is an error, because
  a shared file must not be able to replace the scorepad people already trust.

## 6. Compatibility with the v1 freeze

Nothing in `[game]`, `[players]`, `[tool <id> <instance>]`, `[setup]`, `[rules]`,
`[notes]`, `[script]` or `[variant]` changes, and `format:` stays `1`. An older build
opens a template that needs a tool file and shows the same unavailable card it shows
today. That is the reason to make this a separate file instead of a new `[tool]`
section inside a template: the freeze stays true, and a template is still a template.

## 7. Why not uploaded code

The tempting version is "let the file carry a Svelte component". It does not survive
this project's invariants, and it is worth writing down why once.

| Option | What it needs | Verdict |
|--------|---------------|---------|
| A `.svelte` file compiled in the browser | `svelte/compiler` in the bundle (megabytes), `new Function`, and a build the single-file copy cannot do | No. It breaks the 150 KB first visit, the 24 KB chunk ceiling and the zero-dependency rule at once |
| A folder in `src/tools/<id>/` | `bun run gen` and the existing contract | Already works. This is where real Svelte and real logic belong; a tool file that outgrows the blocks graduates here |
| A `.js` beside the file, run at named entry points | `new Function`, a small API object, and a decision to run someone else's code | **Shipped** (§3). It draws nothing — the blocks still do — and it runs in the page, not a worker |

The version this page used to rule out was a worker returning a view tree, and that
is still out: a Worker has `fetch`, `importScripts` and `indexedDB`, the downloaded
`file://` build has no response headers, so no CSP would hold, and it would need a
message protocol before it could draw a button. The shipped version is smaller and
more honest about what it is: no worker, no markup, no CSS, no new view language, and
a script that can only press the same actions a button presses. The old record still
holds for every other input — an uploaded SVG is drawn through `<img>` so a script
inside it cannot run, a theme is a list of validated tokens so it cannot inject a
rule, and `#/selftest` stubs `fetch` so a mistake in our own code is visible. A tool
file's script is the one place you knowingly hand the page to a file, which is why it
is opt-in, why it is named in the file, and why it is called out in §5.

## 8. What it costs

- **One tool chunk.** `src/tools/plugin/` — view, logic, styles, its English words and
  the script API — is **7.5 KB gzipped**, well inside the 24 KB ceiling. It ships for
  every installed tool at once: ten tool files add one chunk, not ten.
- **One core module.** `src/core/tool-file.ts`: the parser, validation, storage, the
  schema builder and the serialiser. With the script grammar, the compile check and
  the text-plus-files storage it adds about **1.4 KB** to the start-up gzipped file,
  which is now 166.7 KB. Nothing new starts at boot beyond reading one localStorage key.
- **One shared evaluator.** `evaluateFormula` moved from `src/tools/custom/logic.ts`
  to `src/core/formula.ts` (and grew `sum`, `if`, `floor` and `ceil`), so score, custom
  and the plugin tool use one implementation instead of three copies. A pure function
  in core knows no tools, so this respects the layering rule.
- **The deferred ceiling moved once, by 16 KB.** The previous 320 KB ceiling had
  0.4 KB of headroom; the runtime costs 7.5 KB plus about 0.3 KB in each of the four
  non-English tool-text chunks. Scripts and the twenty-nine diagnostic strings that
  had never been translated used the rest: the deferred total is **335.9 KB across 48
  chunks, 70 bytes inside the 336 KB ceiling**. The next change needs ROADMAP §5.2's
  arithmetic and a split of the language chunks, not a quiet raise. The first visit is 166.7 KB and the 24 KB per-chunk
  ceiling is untouched.
- **Gates.** `tests/plugin.test.ts` parses, round-trips and installs the bundled
  example, and covers inline and file-backed scripts, every entry point, a syntax
  error, a missing file and a script that throws; `tests/template.test.ts` installs every bundled definition before it
  round-trips; `bun run lint:templates` lints `example.gamebuddy-tool` beside the
  templates; the existing conformance and component tests cover the new folder
  automatically; `bun run gen --check` stays green; the editor checks a tool file with
  the same line-numbered diagnostics as a template.

## 9. Decided (2026-11-18)

The four open questions this section used to hold, the answer each got, and the gate
that would reopen it.

### 9.1 Sharing a game: two files, never an embedded definition

**Decided: a template never carries a tool file.** The game menu offers "Save
check-tray.gamebuddy-tool" beside "Save template" whenever the session uses an
installed tool, and a tool file that arrives in the same drop is installed before the
template in that batch resolves, so two files arrive together.

Why: `exportTemplate()` writes `format: 1` with `tools: [{ toolId, instanceId, values }]`
and nothing else, so embedding is either a `format: 2` section or a payload hidden in
`#` comments. A comment payload dies in any round trip through an older app (`parse →
serialize → parse` drops comments) and hides data where a reader expects prose; a
`format: 2` section makes a copy downloaded last year warn on a file it could otherwise
open, and this app really is distributed as a file. One definition also serves several
templates, so embedding duplicates it with no update path, against the promise that a
template never modifies itself.

The failure that leaves: someone sends only the `.gamebuddy`. Fix it in copy, not in
grammar — `diag.unknown-tool` names the file to ask for, and the start sheet shows it
before Start.

**Reopen if:** a single "save both" button becomes possible (needs a human check that
two `download()` calls land in Chrome, Firefox and Safari without a prompt), or real
sharing loses the pair often enough to justify `format: 2`.

### 9.2 Sharing a tool on its own: a link, but not through `#/import/`

**Decided: yes, and late.** A tool file gets `#/toolfile/<payload>` and a confirm sheet
("Add this tool — Check tray, 8 blocks", with diagnostics) before it installs, under
the same 12 KB refusal the template link uses. No QR: that path caps at 2,953 bytes and
almost no useful definition fits.

Why not `#/tool/`: that route is taken. The hash router already reads
`#/tool/<tab>` as "open the session on that tab", and a test pins it; a payload would
be a second meaning for one prefix. `#/toolfile/` is unambiguous and costs a word.

Why not reuse `#/import/`: `beginImport` tries `parseSessionFile` then `parseTemplate`,
so a tool file arrives as a template with no `[game] name` and a screenful of errors.
Why late: it is convenience over a file that already works, and every import entry point
(drop, picker, link) is surface to test. It is pure data, so it adds no trust problem a
template link does not already have.

**Reopen if:** the base format ships and people ask for it; not before the drop and
picker paths are proven.

### 9.3 Driving a tool from a script: one generic `do:` verb

**Decided: yes.** `[script]` gains `do: <instance> <command> [arg]`, which is the
dispatch `timer` and `reveal` already use — `callExternal` → `splitCommand` →
`ctx.session.instance(target)` → `commands[command]()` — so the runtime needs no new
code, only the verb in two lists (`core/template/parse.ts` and `tools/script/logic.ts`,
which may not import from core by the layering rule), one condition in the script tool,
one locale key in ten languages and a test.

That this is the existing dispatch is now written down in `docs/TEMPLATE-FORMAT.md`: a
`timer` or `reveal` step takes `<instance> <command>` (`3. timer: kitchen start`), not a
bare `start`. The doc said `timer: start` and was wrong — with one template able to hold
two timers, a bare command has no unambiguous target. Every bundled template already
wrote the long form (`timer: room start`, `reveal: roles`).

In a tool file, `do:` is a local action and another tool is reached with the `tool`
prefix (`do: tool timer start`); in a `[script]` step every target is another tool, so
no prefix.

**Reopen if:** a script step ever needs a value *back* from the tool (a roll result in
the next `say`), which would make this a data flow rather than a call.

### 9.4 `custom`: stays, with a different job from a tool file

**Decided: keep both.** `custom` is the one-screen quick tracker that needs no second
file; a tool file is for a tool with its own identity, icon, template-passed settings or
buttons that drive other tools.

Why not fold: no bundled game template uses `[tool custom]`, so the library is not the
constraint — saved sessions are. A session stores `toolId: 'custom'`, and deleting the
folder turns every one into a permanent unavailable card. Folding would also mean a
translation layer from `custom`'s preset keys to blocks, kept alive to run old data
through a new engine, and it must reproduce per-cell notes, `history`, `down: 0`
meaning "the same as `step`" and per-player sheets exactly, or it silently rewrites
someone's scorepad.

**Reopen if:** plugin blocks can express every `custom` preset (a test that translates
the bundled example), and every saved session referencing `custom` loads through the
plugin engine with its state intact. Not before.

### 9.5 Order

Base format, storage and the `plugin` chunk → two-file sharing and the
named-requirement diagnostic → `do:` in `[script]` → link sharing → the `custom` gate.
None of the later steps belongs in the first slice.

**Built as one pass on 2026-11-18.** All of it is in `src/`: the parser and store
(`core/tool-file.ts`), the shared runtime (`src/tools/plugin/`), the drop path and the
`#/toolfile/` sheet (`App.svelte`), the Settings list, the game menu's save button, the
shelf's "Yours" tiles and `do:` in both verb lists. The `custom` gate in §9.4 stays
closed, as decided: `custom` is still shipped and unchanged.

### 9.6 Code in a tool file: scripts, opt-in

**Decided (second 2026-11-18 pass): yes, because a block list cannot express an
algorithm.** A `[script <id>]` carries JavaScript, inline or from a `.js` picked with
the tool file. It runs only at the entry points in §3 (start, reset, a button's
`run:`, a command), gets `gb` and nothing else, and every call goes through the action
a button already uses, so it is undoable and bounded. The parser compiles each body to
report a syntax error at install; the runtime catches a throw into a toast plus a log
line.

Why `new Function` and not a Worker: a Worker would need a message protocol, a JSON
view tree (which ends the "our blocks, our accessibility" rule) and still has
`fetch`, `importScripts` and `indexedDB`, with no CSP to lean on in the `file://`
build. This version moves numbers and presses commands; it cannot draw. Why code at
all: "if a counter hits zero, reset the phase and start the clock" is one line of JS
and a new tool folder otherwise, and the alternative on the table was people copying
the folder and rebuilding.

What it costs, stated plainly: a tool file from a group chat can now run code with the
page's powers. That is why nothing runs by itself except a declared `start`/`reset`,
why the drop and picker ask for the `.js` files explicitly, why §5 says to read a file
before installing it, and why the declarative blocks stay the default for everything
that can be said declaratively.

**Reopen if:** the app ever ships a real sandbox (an origin-isolated frame would be
the only honest one), or tool files become a signed marketplace, which would let trust
be checked instead of described.

## 10. Author checklist

1. Name it, give it a `family` and a `seats`, and write one blurb line.
2. Add settings only for what a game would actually change; every setting needs a
   default that works with no `[tool]` block at all.
3. Keep the screen to one dominant action. If there are two, it is two tools or a
   template with two blocks.
4. Check the file with **Settings → Tool files** and the editor; warnings are not
   errors, but every warning is a typo.
5. Test it in both themes, at 320 px, in table mode and with the keyboard only.
6. If it needs a real algorithm, try a `[script]` first: keep it short, go through
   `gb`, and read §5's trust note before sharing the file. If it needs a view the
   blocks cannot draw, stop: that is a folder in `src/tools/`, not a tool file.
