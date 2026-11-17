# The `.gamebuddy-theme` format

> **M7 feature.** A theme is a small text file the player owns. It is read on this
> device, applied as CSS custom properties, and never fetched. The design tokens it
> writes to are the ones in `src/core/styles/tokens.css`, described in `docs/STYLE.md`.

A theme changes colour, shape and type only. It cannot add CSS rules, load a file or
reach the network: every value is validated against a fixed list of tokens first.

## Skeleton

```ini
# optional comment
name: Lantern night

paper: #fdf6e3
surface: #fffaf0
ink: #2b2118
forest: #1f5c40
fam-time: #9c6000
radius: 6px

# Only in dark mode
dark-paper: #14100c
dark-ink: #f4ecd8
dark-fam-time: #f6c05e

hide-chrome: sound, settings
```

## Grammar

- One `key: value` pair per line; `key = value` also works. Blank lines are skipped.
- `#` starts a whole-line comment. There are no inline comments, so `#fdf6e3` stays
  a colour.
- Keys are case-insensitive. A repeated key warns and the last one wins.
- An unknown key warns and is ignored; a value that does not validate is an error
  with its line number and is left out. Everything else still applies.

## Keys

| Key | Value | Writes |
|-----|-------|--------|
| `paper` | colour | `--paper` (the page, and `--bg` follows) |
| `surface`, `surface-2`, `field` | colour | cards, quiet blocks, input cushions |
| `ink` | colour | body text (`--text` follows) |
| `text-dim`, `text-faint` | colour | secondary and caption text |
| `line` | colour | table rules, scrollbars |
| `forest` | colour | screen titles and the brand |
| `glow`, `shade` | colour | the lantern light, the shadow tint |
| `danger`, `danger-soft`, `warning`, `success`, `focus` | colour | state colours |
| `on-accent`, `on-seat` | colour | text on an accent key, initials on a seat dot |
| `fam-<family>`, `-deep`, `-wash` | colour | `randomize`, `time`, `track`, `reveal`, `reference`, `flow` |
| `radius`, `radius-small`, `radius-large`, `radius-card` | `0`, `Npx` or `Nrem` | corner sizes |
| `font-display`, `font-body` | a font stack | headings and numbers, reading text |
| `dark-<any key above>` | as above | the same token, dark mode only |
| `name` | text | the theme's label in Settings |
| `hide-chrome` | `sound`, `mute` | hides those header buttons |

Colours accept `#rgb`, `#rrggbb`, `#rrggbbaa`, `rgb()`, `rgba()`, `hsl()`, `hsla()`,
`transparent` or a CSS colour name. Fonts are a stack of family names: there is no
`url()` and no download, so a font the device does not have simply falls back.

**Settings cannot be hidden.** A theme may hide the sound board and the mute button,
but not the gear: that page is the only way to remove a theme, so hiding its door would
lock the player out. Writing `hide-chrome: settings` warns and is ignored. Settings is
always reachable from the Home footer, the game menu, and its own back link.

A light value applies in both themes unless you also set `dark-…`. Values are applied
after the built-in tokens, so a theme always wins over light and dark defaults.

## Using a theme

Settings → **Theme file**: paste the text or choose the file, then **Use this theme**.
It is stored with the other settings on this device, applies immediately, and
**Remove theme** returns to the built-in lantern table. A theme is not part of a game,
a template or an export; it is device taste, like light and dark.

## Author checklist

1. Start from the token table in `docs/STYLE.md`; change as few tokens as you can.
2. Keep text on each surface at 4.5:1 and UI edges at 3:1 in both modes; check with a
   contrast tool rather than by eye.
3. Set `dark-` values for anything you change in light mode, or dark mode keeps the
   new colour and may lose its contrast.
4. Paste it into Settings and visit home, a session, the gallery and the play log.
5. Table mode, print and 320 px width should all still read.
