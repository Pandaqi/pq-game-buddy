# Style: the lantern table

The visual contract for Game Buddy. Read this before touching CSS, adding a tool or
reviewing a screen. The behaviours are in the other docs; this page is only about how
the app looks and why.

**One principle above all: hierarchy.** Every screen has one thing a player must see
or tap, a few things that matter sometimes, and everything else. The loudest thing on
screen is always that first thing. A screen that is merely pretty but hides the score
is a failure.

The mood: a game found in a woodland cabin — warm cream paper, deep forest ink, a
lantern above the table, six bright family accents, Game Buddy for anything loud and
Raleway for anything read. Round, borderless, a little bouncy; generous air between
things, and the quiet details folded away behind a tap.

## 1. Tokens

Everything lives in `src/core/styles/tokens.css`. No view may contain a hex colour,
a radius or a shadow of its own; it asks for a token.

| Token | Light | Dark | Use |
|-------|-------|------|-----|
| `--paper` / `--bg` | `#fbf2dd` | `#1c1710` | The page behind everything |
| `--surface` | `#fffaf0` | `#262019` | Cards, sheets, keys |
| `--surface-2` | `#f5e7cc` | `#33291c` | Secondary blocks, quiet keys |
| `--field` | `#f7ead1` | `#2d2418` | Input cushions |
| `--ink` / `--text` | `#2f2517` | `#f7edd9` | Body text |
| `--text-dim` | `#6d5c43` | `#d2c1a4` | Secondary text, labels |
| `--text-faint` | `#786444` | `#a9967a` | Placeholders, captions |
| `--line` | `#e7d7ba` | `#3d3222` | Scrollbars, handles, table rules |
| `--forest` | `#1f5c40` | `#8fd3b2` | Screen titles and the brand |
| `--on-accent` | `#fffaf0` | `#1c1710` | Text on a family accent |
| `--on-seat` | `#241a10` | `#241a10` | Initials on a seat dot |

**Tool families.** A tool borrows one accent for its whole screen by putting
`data-family` on its container; the session view does this from `meta.family`.

| Family | Light accent | Wash | Tools |
|--------|--------------|------|-------|
| randomize | `#c0403a` berry | `#ffe2d9` | dice, coin, pick, decks, bag, prompts |
| time | `#9c6000` honey | `#ffedc2` | timer, splits, buzzer |
| track | `#0f6f60` teal | `#d5f1e8` | score, lives, counters, custom, demo |
| reveal | `#7d3f8c` plum | `#f5dff7` | reveal |
| reference | `#52711f` moss | `#e9f3ce` | rules, words |
| flow | `#2f63a8` sky | `#deeafc` | turns, bracket, draft, script |

Dark mode swaps each family for a lighter tint of the same hue and deepens the wash.
Never invent a seventh family for a new tool: pick the primitive it serves
(`docs/ARCHITECTURE.md` §primitives). Extra semantic tokens: `--danger`,
`--danger-soft`, `--warning`, `--warning-soft` (used by a timer that is nearly out),
and `--success`, each with a dark counterpart.

**Seats.** The nine player colours stay as stored hex (templates may name one), so seat
identity survives export. The dot is filled with the seat colour and the initials are
dark `--on-seat` ink, which clears 4.8:1 on every seat in both themes. Colour is never
the only cue: the initials are always there, and the active seat is a solid colour pill
with a surface-coloured dot. No ring, no outline.

## 2. Type

Two self-hosted faces, subset and inlined as base64 `@font-face` in
`src/core/styles/fonts.css`; the subset tooling is not shipped. There is no request
at runtime and no CDN:

```css
--font-display: 'Game Buddy', ui-rounded, system-ui, sans-serif;  /* headings, keys, numbers */
--font-body:    'Raleway', ui-sans-serif, system-ui, sans-serif;  /* reading text */
--font-num:     var(--font-display);
```

Game Buddy is one Bold face, subset to Latin-1 plus the punctuation the app uses
(29 KB woff2); its `@font-face` declares `font-weight: 100 900` so every heading weight
uses that drawing unchanged instead of being faux-bolded. Raleway is 34 KB. The two
inline to 84 KB of CSS (64 KB gzipped) in `app.css`. That spend is deliberate: it is
what makes the app feel warm instead of like a system dialog, and it was measured
against the first-visit budget. To restyle, change these two variables; nothing else
names a face. Replacing a face means re-subsetting and re-measuring the first visit.

That subset is Latin-1 plus the app's punctuation, so a language whose letters sit
outside it — Turkish `ı ş ğ`, Vietnamese `ạ ế ơ ư đ` — draws those few letters with the
first fallback in the same stack rather than with the bundled face. The words are still
complete (no image, no missing box), it is the type that mixes, and a future subset should
cover Latin Extended-A and Latin Extended Additional before those languages are called
typographically finished.

Scale in `rem`: **13 / 15 / 17 / 22 / 30 / 40 / 52 / 72** (`--text-xs` …
`--text-4xl`). Headings and every number a player reads use `--font-display` with
`font-variant-numeric: tabular-nums`. **No number a player must read is under 20 px**;
scores, clocks and results are 40 px or larger, and a lone result is 72 px or more
(`clamp(4.5rem, 26vw, 8rem)` for a die). Screen titles are `--text-2xl` in `--forest`;
section labels are uppercase Raleway at `--text-xs` with 0.12em tracking.

## 3. Space, shape and shadow

- **Space:** a 4 px scale — `--space-1` 4 px through `--space-7` 64 px. Table mode
  multiplies it. Use more than feels necessary: screens are stacked with
  `--space-5`/`--space-6`, cards have `--space-4`/`--space-5` inside.
- **Radius:** `10` (`--radius-sm`), `16` (`--radius`), `26` (`--radius-lg`), `28`
  (`--radius-card`), `999` (`--radius-pill`) for keys and chips, `50%` for dots.
- **Borders are the exception.** A card is a fill, a radius and a soft shadow; a key is
  a fill; a field is a cushion. Only three things keep an edge: a table's row rules
  (`--line-soft`), the focus ring, and a deliberate state ring drawn with `inset
  box-shadow` (an active clock, an invalid editor). Never a box inside a box: if a
  block needs a card, drop the wrapper's fill first.
- **Shadows:** `--shadow-card` (soft, coloured, floating), `--shadow-lift` (sheets and
  toasts), `--shadow-soft` (quiet keys), `--shadow-key` (a coloured key's deep edge).
  Shadows replace outlines; they are warm brown, never grey.
- **A key is a button:** pill-shaped, filled, no outline, and hover lifts it 2–3 px
  while `filter: brightness(1.04)` keeps its own colour. Press pushes it back down.
  Never swap a coloured key's background on hover.
- **A field is a cushion:** pill (`--radius-pill`) or 16 px for a textarea, `--field`
  fill, 48 px tall, no underline, no box. A **file picker** is the same cushion: the
  native button is restyled once in `base.css` through `::file-selector-button` (and
  the WebKit alias), so a view never styles its own and every picker in the app
  matches.
- **A fold is a details element:** secondary settings, history and options live behind
  `core/ui/Fold.svelte`. Summary is Game Buddy at `--text-lg`, the chevron is the accent,
  and the open state animates the chevron with `--ease-bounce`.
- **A list of modes is a row of separate pills**, not one rounded slab: each is a
  `--surface-2` pill, the active one takes the family accent. Six options wrap onto a
  second line; a strip never scrolls sideways.
- **Chrome rows fold.** The player strip and the tool row are one quiet line (marks,
  a count, a chevron) that opens into chips. A session with six tools does not push
  the score off screen or grow a scrollbar.

## 4. Marks and doodles

A mark belongs to its owner: one 24 px grid, one 1.8 px stroke, round caps and joins.
Dots may be filled; nothing else is. `src/core/ui/icons.ts` holds only the shell's four
marks (`sound`, `notes`, `muted`, `gear`); `sound` is the speaker, `notes` is the sound
board, so never give two header controls the same icon.

Each tool keeps its own drawing in `src/tools/<id>/icon.ts`, imported by its `meta.ts`.
Deleting the tool deletes the mark, and no central table has to be edited. A bundled
template keeps `<id>.icon.svg` beside its `.gamebuddy` and names it with `icon:` in
`[game]` (Catan's hex and road, Werewolf's fang, Uno's tilted card, Monopoly's top hat).
An imported template may pair an image instead, named like `icon:` or like the template
file; that image renders through `<img>` and never inlines.

The template marks are their own chunk (`core/ui/marks.svelte.ts`): a list paints the
name and the reserved slot immediately, and the 79 drawings arrive after the first
paint from `template-icons.generated.ts`. Nothing in the start-up payload imports them.
First-party Pandaqi templates keep their drawings in `src/data/templates/pandaqi/`, one
for each covered collection, under the same grid and stroke rules.

**Layout:** on a gallery card and on home, the mark and the name are one flex row,
centred on each other (`align-items: center`), so the title sits *beside* the mark and
never wraps underneath it. A tool screen is the other case: the mark is large, above
the title, because it is the screen's identity.

`src/core/ui/doodles.ts` holds the decorative woodland set — leaf, mushroom, star and
firefly — as inline SVG drawn from tokens, so no request and no bytes in `public/`.
Decorative SVG is `aria-hidden`.

**The app's own art** is four bitmaps and nothing else. `src/core/ui/brand-mark.ts`
carries the badge at 128 px as a data URL (header and resume card),
`src/ui/home-art.css` the room behind the home hero at 900 px as a data URL, and
`public/icon.webp` with `public/icon-192.png` the 256 px tab and installed-app icon —
the only pictures with a real URL, because a browser asks for a favicon by URL. The two
in the bundle are base64 so the single file still works from `file://`, and they are the
reason the first visit carries bytes of picture at all: see `ROADMAP.md` §5.2.

Rules: no emoji as UI; no new raster images — the brand art above is the one exception
and it ships once. A new tool adds `icon.ts`
next to its `meta.ts`; a new bundled template adds its `.icon.svg` next to the file. Both
use the same 24 px grid, 1.8 px stroke and `currentColor` only, so they work on every
surface and in both themes. A player's uploaded image is the one exception, and it is
their file, not the app's.

## 5. Motion

Playful, short, and always ending in a correct static state:

| Token | Time | Use |
|-------|------|-----|
| `--motion-pop` | 120 ms | A tap: the key presses down |
| `--motion-settle` | 200 ms | A state change: a sheet arrives |
| `--motion-reveal` | 280 ms | A secret: the cover lifts |
| `--motion-bounce` | 340 ms | One-shot entrance: a screen, a shelf tile, a result |

`--ease-bounce` overshoots slightly; `--ease-out` settles. Entrances use `bloom`
(fade + 10 px rise) or `pop-in` (scale with overshoot), run once, and shelf tiles
stagger by `--i` in 18 ms steps. Switching tool tabs remounts the tool and blooms it.
The fold chevron turns with the bounce. Nothing animates continuously; nothing sits
between the player and the score. `prefers-reduced-motion` and the in-app override
remove all of it. Confetti exists exactly once — a finished game with a winner — and
does not render under reduced motion. Dice and the coin change instantly.

## 6. Layout and hierarchy

- Home opens with a **hero**: Tiamo's painting of the room, full-bleed behind the
  words at 55 percent opacity, blurred in the file itself and faded out over most of
  its height — the mask holds to about a third and then walks to nothing at the last
  pixel, so it melts into the paper instead of stopping on a line; a
  paper cloud (a `--paper` radial, never a straight-edged gradient) sits between the
  art and the copy, so the title keeps its contrast in both themes and dark mode dims
  the room instead of lighting it. Then a pill that says "No account. No internet. No
  install." and "Game night, sorted." at `clamp(3rem, 12vw, 5.5rem)` in `--forest`. A
  resume card follows when there is a saved game.
- **Full-bleed means the page's own box.** The page has no column of its own: each
  block carries the 60 rem column and the gutter, and the hero's art simply spans
  `left: 0; right: 0`. Nothing measures against `100vw` — that counts a classic
  scrollbar, so the hero would overflow by its width and the page would scroll
  sideways with a strip of page missing on one side.
- The **shelf**: two tools per row on a phone, three on a tablet, four on a wide
  screen. Each tile is a wash-to-surface gradient, a 54 px mark, the Game Buddy name and
  one line of Raleway blurb. Tiles are the loudest repeated element on the page.
- A session is a **strip** (quiet game name, a one-line seat bar, tool tabs as pills)
  and then the tool owns the screen. The seat bar's dots and its player count fold the
  chips away, and tools that do not use players (`meta.seats`) do not show it at all;
  only a tool that seats everyone opens it by default. No panel around the tool: the blocks inside it are the
  only cards.
- The **stage**: the primary readout sits in the upper third at 40–72 px, controls sit
  within thumb reach, and everything secondary is behind a fold, a sheet or the "⋯"
  menu. When a control is not needed for the next tap, fold it.
- Sections stack with air, not rules. Wide tables may scroll inside their own wrapper,
  never the page. Layout works at 320 px and at 200 percent zoom with no horizontal
  page scroll.

## 7. Modes and print

- **Light** is cream paper under a lantern. **Dark** is a dim room: warm charcoal,
  pastel accents, warm off-white text, never pure white on pure black.
- **Table mode** is a phone lying flat: 1.25× type, thicker targets, `--text-dim`
  raised to full ink, and the shell header hidden on a session screen. The session menu
  still reaches every page.
- **Huge mode** is one step past table mode, for a large screen or low vision. It only
  raises the type and space scale and strengthens dim text; it never hides a control.
  With both on, huge wins because its token block comes last.
- **Print** is ink on white: no grain, no shadows, no chrome, hairlines instead of
  accent fills, `11pt` body. Score sheets, brackets and rules must stay legible in
  black and white.

## 8. Contrast (measured)

Measured with WCAG relative luminance; text at 4.5:1, large text and UI edges at 3:1.

| Pair | Light | Dark |
|------|-------|------|
| ink on surface | 14.4 | 13.9 |
| ink on paper | 13.5 | 15.3 |
| dim on surface | 6.2 | 9.1 |
| dim on surface-2 | 5.3 | 8.1 |
| faint on surface | 5.5 | 5.6 |
| forest on paper (titles) | 7.1 | 10.3 |
| on-accent on each family accent | 4.9 – 6.8 | 7.8 – 10.2 |
| family accent as text on surface | 4.9 – 6.8 | 7.8 – 10.2 |
| danger on surface | 6.4 | 7.8 |
| focus ring on paper | 7.1 | 10.0 |
| initials (`--on-seat`) on each seat dot | 4.8 – 7.2 | 4.8 – 7.2 |

The tightest values are deliberate: honey (`time`) and the faint captions. If you
change a token, re-measure it and update this table in the same change.

## 9. Restyling a tool (checklist)

1. Root element: `class="<tool>"`; no `data-family` needed — the session sets it.
2. Use the shared primitives from `src/core/styles/components.css` — `.panel`,
   `.block`, `.stage`, `.row`, `.field`, `.modes`, `.wide`, `.primary`, `.ghost`,
   `.check`, `.dim`, `.small`, `.hint`, `.history`, tables, `.fold`. Do not redefine
   them in a tool.
3. Primary action: one accent key, at the bottom on a phone; secondary actions are
   quiet fills or fold away.
4. Readout: `--font-display`, tabular numerals, at least `--text-xl`; put it first and
   make it the biggest thing on the screen.
5. Empty state: `core/ui/EmptyState.svelte` with a warm sentence and one action.
6. Motion: no new keyframes. Use the press, the entrance and the fold you inherit.
7. Check light, dark and table mode, 320 px, 200 percent zoom, and print.
8. Run `bun run check`; the build prints the gzipped size.

## 10. Do / don't

| Do | Don't |
|----|-------|
| One loud readout, huge Game Buddy, family accent | Three equal-weight cards |
| Fills, space and warm shadows | Borders, outlines, boxes inside boxes |
| Air between sections | Divider lines between everything |
| Fold what is not needed for the next tap | Show every setting at once |
| One accent per screen, used for the action and the mark | Rainbow of accents in one tool |
| Bouncy one-shot entrances | Bouncing, spinning or looping anything |
| Empty states that say what to do next | "No data" |
| Marks and doodles drawn on one grid | Emoji, icon fonts, raster art |

## 11. Theme files

A `.gamebuddy-theme` file lets a player restyle colours, fonts, radii and the header
chrome without writing CSS (`docs/THEME-FORMAT.md`). It writes the tokens above as
custom properties on `:root`, is validated against a fixed key list, and can set
`dark-` values for dark mode. Nothing in a view knows it exists: keep using tokens,
never a raw colour, and a theme keeps working.

The doodles in `doodles.ts` are still placeholders for Tiamo's own drawings; the
badge, the hero room and the tab icon are his, and land as bitmaps rather than SVG.

## 12. Copy

The voice is Pandaqi: warm, direct, concrete, short. Address the player as "you" and
the table as "we". One aside after a dash is plenty; an exclamation mark belongs in a
marketing line, never in an error. Say what happened, then what to do next.

| Instead of | Write |
|------------|-------|
| "Random number generator with configurable parameters" | "Settle it: numbers, lists, teams, seats or who goes first." |
| "Error: invalid template syntax on line 4" | "Line 4 is not a setting this build knows. Fix the name, or delete the line." |
| "No data available" | "Nothing here yet. Add a player and the score pad wakes up." |

Keep the rules in `AGENTS.md` (§Code conventions) and this table in step: they are
the target for every later string, before localization freezes the words.
