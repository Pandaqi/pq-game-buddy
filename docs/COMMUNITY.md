# Community templates

A community template is a `.gamebuddy` file that ships inside Game Buddy. It is
compiled in at build time, so opening one never touches the network, and a phone at
the table can load it after the first visit.

## Add one

1. Write the template with the in-app editor or Notepad. `docs/TEMPLATE-FORMAT.md`
   is the contract.
2. Put the file in `src/data/community/`, named after the game in kebab-case:
   `wingspan-asia.gamebuddy`.
3. Run `bun run gen` and `bun run check`. The linter reads this folder too; a file
   with an error or a warning does not ship.
4. Open a pull request with the file and one line in the description saying where the
   rules summary came from.

## Rules for a submission

A community template may ship its own mark: put `my-game.icon.svg` beside
`my-game.gamebuddy` in `src/data/community/`, and use `icon: my-game` (or any name) in
the template. The same 24 px grid and stroke weight as the bundled marks applies; the
file is compiled in, never fetched.

- **Your own words.** No copied rulebook text, art, logos or publisher images. A short
  original summary and a link to the official page is what the template format wants.
- **One game per file.** Variants go in `[variant <id>]` blocks, not five near-copies.
- **Tools that already exist.** A template composes tools; it does not add code.
- **Honest player count and length.** The gallery filters on both.
- **Licence.** Add `license:` in `[game]` when the summary comes from a source that
  asks for attribution; the linter and the play log show it.

Community files carry the `community` tag automatically, so the gallery can filter
them apart from the bundled set. They appear in the same list, start the same way and
export the same way; there is no separate runtime and no download step.
