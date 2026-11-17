# User guide

Game Buddy is a set of small tools for game night. It works offline, keeps
everything on your device, and never asks for an account.

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
| Dice | Any notation (`4d6kh3`, `2d20`, `d%`), pools, saved macros |
| Coin | One flip, biased flips for wagering, best-of series |
| Pick | Random numbers, lists, teams, seats, card view |
| Score | Running totals, rounds, categories (with formulas), a money ledger |
| Lives | HP, lives, stocks; extra tracks; conditions; elimination |
| Counters | Wood, coins, tokens, a shared bank, chip denominations |
| Turns | Whose turn, round number, phases, optional turn clock |
| Reveal | Secret roles, inspecting one player, anonymous ballots, blind bids |
| Rules | The quick explanation, setup checklist, glossary, scoring reference |
| Decks | Shuffle, cut, deal, draw, hidden hands |
| Bag | Blind draws from tiles or tokens, with letter values |
| Bracket | Single and double elimination, round robin, groups, Swiss |
| Draft | Linear and snake draft order, pick clock, auction |
| Buzzer | Who tapped first, with reaction times |
| Script | Narrate a round: say, wait, reveal, start a timer |
| Words | Is this a word? Filters, anagrams, rack solver, Codenames board |
| Prompts | Random prompts, party ideas, designer mode |
| Custom | Build a tracker: fields, counters, checklist, table, formula |
| Splits | Speedrun splits against your best run |
| Log | Everything you have played, with winners and streaks |

Every game template also loads a **Rules** sheet in your own words plus a setup
checklist, so nobody has to open a PDF mid-turn.

## Playing a session

- The **players bar** at the top holds names, colours and initials. Tap it to edit,
  add or remove players. "Sync players to tools" pushes changes into tools that
  keep their own copy.
- **Undo** sits above the tool and says what it will undo. Fifty steps are kept.
- The **game menu** holds: copy summary, print this game, open display view, save as
  template, sync players, finish game.
- **Finish game** asks each tool for standings, lets you pick the source when two
  tools disagree, and writes the result to the log. Running it again corrects the
  same entry instead of adding a duplicate.

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

### Printing

**Print this game** prints the current tool's readable content: the score sheet, the
bracket, the rules sheet, the splits table. Interface chrome is hidden and tables get
ink borders. To keep a copy, print to PDF.

## Games and templates

40 games ship as plain-text templates: Catan, Ticket to Ride, 7 Wonders, Wingspan,
Sushi Go, Azul, Splendor, Dominion, Monopoly, Risk, Pandemic, Gloomhaven, Uno,
Exploding Kittens, Love Letter, Coup, The Mind, Hanabi, Skull, Decrypto, Dixit, poker,
Perudo, chess, Yahtzee, Phase 10, Scrabble, Boggle, Bananagrams, Codenames, Just One,
Werewolf, Trivia Night, Escape Room, Mario Kart night, Smash night, Speedrun practice,
D&D 5e, Kitchen Rush and house-rule sheets.

- **The gallery** filters by players, time and tools used.
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

## Settings

Theme (light, dark, system), table mode, sound volume, haptics, reduced motion,
locale, and a data section to export, import or reset everything. Table mode makes
type and targets bigger and hides chrome; it is meant for a phone propped up in the
middle of the table.

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
- English only for now. The app is built so other languages can be added, but no
  translation ships yet.

## If something goes wrong

1. **A tool looks broken**: switch to another tool and back. Each tool is mounted
   alone, so this rebuilds it. If it still fails, the error panel offers a reset for
   that tool.
2. **A template will not load**: open it in the editor. Errors carry line numbers and
   a suggestion; warnings never block loading. Unknown keys are preserved, so a newer
   file still opens.
3. **Everything looks wrong after an update**: Settings → Reload. Your sessions are
   stored separately from the app.
4. **You lost a game**: check the log first; autosave keeps the last session. If it is
   gone, restore the JSON export from Settings → Data.
