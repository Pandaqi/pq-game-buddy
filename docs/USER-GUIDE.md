# User guide

Game Buddy is a set of small tools for game night: the timer, the scorepad, the bag of
dice, the argument about who goes first. It works offline, keeps everything on your
device, and never asks for an account. Everything here is a helper for the game in
front of you, not a replacement for it.

- **Hosted**: open the site and use it.
- **Single file**: download `pq-game-buddy.html`, double-click it. Same app, no server.

## The first two minutes

1. **Home** shows three ways in: the game library, the tool shelf, and your recent
   sessions.
2. **Pick a game** (for example Catan) and choose the number of players. The
   session opens with the right tools already configured.
3. **Or pick a tool** (for example Timer) and press the big button. No setup needed.

Your game is saved automatically. Closing the tab and coming back offers to resume.

## The tools

| Tool | Use it for |
|------|------------|
| Timer | Countdown, stopwatch, per-player hourglasses, chess clocks, interval beeps, phase sequences |
| Dice | Any notation (`4d6kh3`, `2d20`, `d%`), pools, saved macros, custom word faces |
| Coin | One flip, biased flips for wagering, best-of series |
| Pick | Random numbers, lists, teams, seats; list, card, wheel and slot views |
| Score | Running totals, rounds, categories (with formulas), a money ledger |
| Lives | HP, lives, stocks; tap a score to type a whole throw; extra tracks; conditions; elimination |
| Counters | Wood, coins, tokens, a shared bank, or a straight points counter |
| Turns | Whose turn, round number, phases, optional turn clock, initiative order |
| Reveal | Secret roles, anonymous ballots, blind bids |
| Rules | The quick explanation, setup checklist, glossary, scoring reference |
| Decks | Shuffle, cut, deal, draw, hidden hands |
| Bag | Blind draws from tiles or tokens, with letter values |
| Bracket | Single and double elimination, round robin, groups, Swiss |
| Draft | Linear and snake draft order, pick clock, auction |
| Buzzer | Who tapped first, with reaction times |
| Script | Narrate a round: say, wait, reveal, start a timer, optional spoken voice |
| Words | Is this a word? Filters, anagrams, rack solver, Codenames board |
| Prompts | Random prompts, party ideas, designer mode |
| Custom | Build a tracker: fields, counters, checklist, table, formula |
| Splits | Speedrun splits against your best run |
| Log | Everything you have played: search, filters, win rates, time played |

Every game template also loads a **Rules** sheet in your own words plus a setup
checklist, so nobody has to open a PDF mid-turn. The tools shelf on Home shows the
everyday tools first; **Show all tools** opens the rest, and the search box always looks
through every tool.

## Playing a session

- The **players bar** at the top holds names, colours and initials. Tap it to edit,
  add or remove players. "Sync players to tools" pushes changes into tools that
  keep their own copy.
- **Undo** sits above the tool and says what it will undo. Fifty steps are kept.
- The **game menu** holds: copy summary, print this game, open display view, save as
  template, share as a link, show a QR code, sync players, finish game.
- **Share as a link** puts the template in the URL. **Show QR code** draws the same link
  as a code for the phone across the table; it needs the hosted version, and a template
  too large for one code says so.
- **Tool row.** With more than one tool, a quiet line shows the active tool, its mark and
  the count. Tap it to unfold the rest; the chips wrap instead of scrolling.
- **Finish game** asks each tool for standings, lets you pick the source when two
  tools disagree, and writes the result to the log. Running it again corrects the
  same entry instead of adding a duplicate.

### Switch access

Settings has a **Switch access** option: every target grows to 64 px, the focus ring
thickens and hover no longer moves things. It is meant for a single switch or a head
pointer, where focus is the only pointer there is.

### Secrets and pass-the-phone

Reveal, hidden hands in Decks, private trays in Bag and hidden scores in Score all
use the same cover: "Hand the phone to Alice", tap to continue, then press and hold
(or press Space) to see your secret. The cover never shows the previous player's
information, and every cover has a way out, so nobody gets stuck.

### Display mode

In the game menu choose **Open display view**. A second tab opens with only the big
readout: no controls, very large type, dark background. Put it on a projector, a TV
or in OBS. The controller tab is the only one that changes anything; the display
follows it.

### Narrator voice

The script tool can read its `say` steps aloud with the voice your device already has
in **Settings → Narrator voice** (a checkbox on the script screen). Nothing is
downloaded and no voice is fetched: if the device has none, the steps simply stay on
screen. The words are always written out too, so a quiet table or a screen reader
loses nothing.

### Printing

**Print this game** prints the current tool's readable content: the score sheet, the
bracket, the rules sheet, the splits table. Interface chrome is hidden and tables get
ink borders. To keep a copy, print to PDF.

## Games and templates

60 games ship as plain-text templates: Catan, Ticket to Ride, 7 Wonders, Wingspan,
Sushi Go, Azul, Splendor, Dominion, Monopoly, Risk, Pandemic, Gloomhaven, Uno,
Exploding Kittens, Love Letter, Coup, The Mind, Hanabi, Skull, Decrypto, Dixit, poker,
Perudo, chess, Yahtzee, Phase 10, Scrabble, Boggle, Bananagrams, Codenames, Just One,
Werewolf, Trivia Night, Escape Room, Mario Kart night, Smash night, Speedrun practice,
D&D 5e, Kitchen Rush and house-rule sheets.

Twenty of them are first-party templates for Tiamo's own games: Bidding Blocks, Mapped
Out, Death by Digits, Fiddlefoo, The Luck Legends, Naivigation, Chiptales, Feed the
Beast, Maybe Games, Throneless Games, Keebble Games, Captain Flip, Magnetmen, Waterfall,
Firecrackers, Hasty Accusations, The Game of Dilemmas, Slippery Slopes, Mammoth
Messages and I Bid You Not. A collection gets one template: setup, a short summary, a
link to each sub-game's rulebook, and only the tracker its rules actually use.

- **The gallery** filters by players, length and tag. The **Pandaqi** chip narrows the
  list to those first-party games. **What should we play?** picks a game from whatever
  the filters currently show, so it never offers a four-hour game to a table with
  twenty minutes.
- **A template can carry an icon.** Bundled templates keep their drawing in a file next
  to themselves, so the gallery can show it without downloading anything. For your own
  template, upload an image named like its `icon:` value (or like the template file);
  that drawing then sits beside its name in your imports.
- **Bring your own, at the bottom of the templates page.** Choose a `.gamebuddy` file,
  a saved game's `.json` (from **Export session JSON**), its images and a
  `.gamebuddy-theme` together. A session resumes where it left off, the theme is
  applied straight away and the images stay on this device; nothing is uploaded to a
  server. You can also drop the same files anywhere on the page.
- **Some templates carry house-rule variants.** When one does, the start sheet offers
  "Base rules" plus each variant (a quicker game, a friendlier scoring rule). Picking
  one adds its text to the rules sheet; it never changes the tools themselves.
- **Load your own**: drag a `.gamebuddy` file onto the window, pick it with the file
  button, or paste its text. A link form (`#t=...`) also works for small templates.
- **Write one**: the built-in editor validates as you type and shows line numbers.
  `docs/TEMPLATE-FORMAT.md` is the reference; ten minutes is enough for a first file.
- **Save as template** turns the game you just played into a reusable file.

## Keyboard

| Key | Where | Does |
|-----|-------|------|
| `Space` | Splits | Start, split, stop |
| `R` | Splits | Reset the attempt |
| `A S D F J K L ;` | Buzzer | One lane per player |
| `Space` | Reveal cover | Hold to show a secret |
| `Escape` | Any sheet, cover or dialog | Close it |
| `Tab` / `Shift+Tab` | Everywhere | Move focus; focus is always visible |

Every control is reachable by keyboard. Nothing depends on hover.

## Installing it

The hosted build can be installed like an app: use the browser's **Install** or
**Add to Home Screen** action. After one online visit it opens without a connection,
because a small service worker keeps a copy of what you used. Updates are fetched
when you are online, so there is no stale version to clear.

The downloaded single file needs no install and no worker: it is the whole app in one
`.html` file and works by double-clicking it, offline, forever.

## Settings

Theme (light, dark, system), a theme file, table mode, huge mode, sound volume, haptics,
reduced motion, locale, and a data section to export, import or reset everything. Table
mode makes type and targets bigger and hides chrome; it is meant for a phone propped up
in the middle of the table. Huge mode goes one step further for a large screen or low
vision. Settings is always reachable — from the header, the Home footer and the game
menu — and a theme cannot hide that. At the very end it says who made the framework,
which version you are running, and links to pandaqi.com and the GitHub repository.

### Theme files

A `.gamebuddy-theme` is a short list of `key: value` lines: paper, ink, the six family
accents, radii, fonts and a few flags. Paste it in **Settings → Theme file** or choose
the file, then **Use this theme**. It applies at once, stays on this device, and can
set `dark-` values for dark mode. **Remove theme** brings back the default lantern
table. `docs/THEME-FORMAT.md` lists every key and how values are checked.

### Initiative

In the turns tool, open **Settings** and pick **Initiative**. Each player gets a value
with − and + keys; the highest acts first, **Next turn** follows that ranking, and
**New round** clears the values for the next round of combat. A template can carry
starting values with `mode: initiative` and `initiative: Ada=18, Bo=12`.

### Custom dice faces

The dice tool has a **Faces** mode: type the words or symbols on the die (`Hit`,
`Miss`, `Crit`), choose how many dice to throw, and roll. **Save set** keeps a face
list by name so a strange die is one tap away next time. Faces are plain text, so
they read correctly with a screen reader and print in black and white.

## Where your data lives

On this device only: in `localStorage` where the browser allows it, otherwise in
session storage or memory. Nothing is uploaded and there is no sync.

- If the app shows a "progress can't be saved" banner (some browsers do this for
  local files), export your session to a file and open it later.
- **Settings → Data** exports a JSON backup of everything. That is also how you move
  to another device.
- The log is per device. It is a privacy feature and a limitation; export is the
  bridge.

## Honest limitations

- Timers cannot run with the screen off or the tab discarded. The app shows correct
  time when you come back, but it cannot keep the phone awake forever.
- Sound needs one tap before it can play, because browsers require a gesture.
- A phone in your pocket pauses everything; use table mode with the screen on.
- Safari can restrict storage for files opened from disk. The app tells you when
  that happens.
- Word lists are curated starter lists, not tournament dictionaries. The checker
  says "not in this list", never "not a word".
- Five languages so far: English, Dutch, German, Spanish and French. The globe in the
  header lists whatever a build carries, and the choice is saved with your settings on
  this device. Each one covers every screen — home, a game, the gallery, settings, the
  editor, the play log, all twenty-one tools, the copied summaries, and the template and
  theme error messages. No language is ever fetched: a language the build does not carry
  is not offered, and a language is a loaded file rather than a fallback, so English is
  only there when the build includes it. `bun run build --langs=nl` ships one language
  and is smaller for it.

## If something goes wrong

1. **A tool looks broken**: switch to another tool and back. Each tool is mounted
   alone, so this rebuilds it. If it still fails, the error panel offers a reset for
   that tool.
2. **A template will not load**: open it in the editor. Errors carry line numbers and
   a suggestion; warnings never block loading. Unknown keys are preserved, so a newer
   file still opens.
3. **A screen reader on the reveal screen**: the dealt-roles panel has a folded guide;
   hold Space or Enter to reveal, let go to hide, Escape to cancel.
4. **Everything looks wrong after an update**: Settings → Reload. Your sessions are
   stored separately from the app.
4. **You lost a game**: check the log first; autosave keeps the last session. If it is
   gone, restore the JSON export from Settings → Data.
