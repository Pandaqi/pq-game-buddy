# Pandaqi templates

First-party templates for Tiamo's own games at
[pandaqi.com](https://pandaqi.com/boardgames/). They use the same format as every other
template, carry `tags: pandaqi`, and the gallery has a Pandaqi filter for them.

The catalogue is organised in collections, so this folder mostly holds **one template
per covered collection** rather than one per sub-game. A collection template carries the
setup and the parts its games share, plus a short rules summary and a link to the page
where each sub-game's own rulebook lives. A standalone game gets its own template when
the app has a real job to do: a scorepad, a timer, a blind bid or an elimination track.

**Twenty templates cover eleven collections and nine standalone games: 47 of the 100
entries in the board-game category.** The other 53 are listed below with a specific
reason; none is silently omitted.

## The set

| Template | Covers | Tools |
|----------|--------|-------|
| Bidding Blocks | Bidding Blocks | score (rounds, target 100), rules |
| Mapped Out | Mapped Out | score, turns, rules |
| Death by Digits | Death by Digits | rules |
| Fiddlefoo | Fiddlefoo | score (rounds, lowest), turns, rules |
| The Luck Legends | Champions of Chance, A Little White Die, Lucky Lions, Tossing Tiger Rolling Dragon, Folly & Fortune, Chaos Contract, Deceptidice | rules |
| Naivigation | Swerving Spaceships, Frightening Flights, Crashing Cars, Singing Sails, Troublesome Trains, Amerigo's Dakenpad, Boot op Stoom | counters (damage), rules |
| Chiptales | Six of Sparrows, Pietenpoker, Noble Flood | score (rounds), rules |
| Feed the Beast | Feed the Beast and its beasts | rules |
| Maybe Games | Maybe Movies, Maybe Missions, Maybe Minister | turns, reveal (ballot), score, rules |
| Throneless Games | Throneless Games, Smallseat, Queenseat, Kingseat, Kaizerseat | rules |
| Keebble Games | Keebble Games, Keebble, Keebble: Domino, Keebble: Knickknack | words (check), score, rules |
| Captain Flip | Captain Flip | score (simple), rules |
| Magnetmen | Magnetmen | score (simple), rules |
| Waterfall | Waterfall | score (simple), rules |
| Firecrackers | Firecrackers | score (simple), rules |
| Hasty Accusations | Hasty Accusations | lives (one each), turns (phases), rules |
| The Game of Dilemmas | The Game of Dilemmas | score (5 rounds), rules |
| Slippery Slopes | Slippery Slopes | timer (2 min), counters (5 points), rules |
| Mammoth Messages | Mammoth Messages | timer (60 s), counters (1 point), rules |
| I Bid You Not | I Bid You Not | bid (blind), score (ledger), rules |

Every template starts clean, passes the template linter and the round-trip test, and is
reachable from the gallery's Pandaqi filter. Each one also ships its own mark beside it
(`<id>.icon.svg`) on the same 24 px grid as the bundled set.

## Catalogue audit

Checked on 17 November 2026 against
[the board-game category](https://pandaqi.com/categories/board-game/), which reports
**100 projects** across 12 pages. Every project is named below. The twenty templates
cover 47 entries; the other 53 are marked "no template" with the reason.

### Covered

| Group | Entries in the board-game category | Template |
|-------|------------------------------------|----------|
| Bidding Blocks | Bidding Blocks | `bidding-blocks` |
| Mapped Out | Mapped Out | `mapped-out` |
| Death by Digits | Death by Digits | `death-by-digits` |
| Fiddlefoo | Fiddlefoo | `fiddlefoo` |
| The Luck Legends | The Luck Legends; Champions of Chance; A Little White Die; Lucky Lions; Tossing Tiger, Rolling Dragon; Folly & Fortune; Chaos Contract; Deceptidice (8) | `luck-legends` |
| Naivigation | Naivigation; Swerving Spaceships; Frightening Flights; Crashing Cars; Singing Sails; Troublesome Trains; Amerigo's Dakenpad; Boot op Stoom (8) | `naivigation` |
| Chiptales | Chiptales; Six of Sparrows; Pietenpoker; Noble Flood (4) | `chiptales` |
| Feed the Beast | Feed the Beast | `feed-the-beast` |
| Maybe Games | Maybe Games; Maybe Movies; Maybe Missions; Maybe Minister (4) | `maybe-games` |
| Throneless Games | Throneless Games; Smallseat; Queenseat; Kingseat; Kaizerseat (5) | `throneless-games` |
| Keebble Games | Keebble Games; Keebble; Keebble: Domino; Keebble: Knickknack (4) | `keebble-games` |
| Captain Flip | Captain Flip | `captain-flip` |
| Magnetmen | Magnetmen | `magnetmen` |
| Waterfall | Waterfall | `waterfall` |
| Firecrackers | Firecrackers | `firecrackers` |
| Hasty Accusations | Hasty Accusations | `hasty-accusations` |
| The Game of Dilemmas | The Game of Dilemmas | `the-game-of-dilemmas` |
| Slippery Slopes | Slippery Slopes | `slippery-slopes` |
| Mammoth Messages | Mammoth Messages | `mammoth-messages` |
| I Bid You Not | I Bid You Not | `i-bid-you-not` |

### Not covered: collections without a shared core (27 entries)

A collection template is only honest when the sub-games share a real core. These five
share a theme, a shelf or a physical format, not rules that one file can configure.

| Collection | Entries | Why no template |
|------------|---------|-----------------|
| Easter Eggventures | Easter Eggventures; Bunny Bidding; Chicken Colorout; Egghunt Esports; Quizhide Queaster; Reggverse Riddles (6) | Six different formats: one card game plus hunts, colouring, a quiz and riddles. They share an Easter theme, not setup or scoring. A single template would cover only Bunny Bidding and mislead about the other five. |
| The Domino Diaries | The Domino Diaries; Dinoland; Domino Dynasty; Highrise Homino; Theme Parque; Zoo Parque (6) | Five different domino placement puzzles with their own boards and goals. The placement is the game, the app cannot see it, and there is no shared score model. |
| Swiftsmash Saga | Swiftsmash Saga; Booksmack; Cookie Smasher; Point-a-Pile; Racesmack; Smackshapes (6) | A real-time physical reaction race. A phone cannot see who slapped first, and putting a screen in the middle defeats the point. The buzzer tool would replace the game, not assist it. |
| The Outnumbered Series | The Outnumbered Series; Nine Lives; Nine Lives: Math Meows; Nine Lives: Tricksy Kittens; Sixpack (5) | Four separate number games with their own decks and scoring. They share a number theme, not a core, so one template would have to say "read the rulebook" four times. |
| Waitless Games | Waitless Games; Creature Quellector; Finger Food; Foldigami (4) | Designed for a queue with no table, no screen and as little material as possible. A phone companion adds exactly the setup the series exists to remove. |

### Not covered: games that already run on pandaqi.com (5 entries)

These are hybrid games whose digital half is the pandaqi.com site. A second companion
would duplicate the app that makes the game work.

| Game | Why no template |
|------|-----------------|
| Wondering Witches | The High Witch runs on pandaqi.com: it holds the secret recipe, tests potions and reports results. The site is the game's app, not a scorepad beside it. |
| Starry Skylines | The site presents the three options each round, tracks the city and handles the scoring. A template would be a second screen for a game that already needs one. |
| Wie is de Trol? | The site runs the assignments, the round tests and the money; the rulebook says the game cannot continue without it. |
| Timely Transports | Every player uses the site's timers and board tools on their own phone while moving pieces on the physical board. The digital half already exists. |
| Epic Medics | The virus board and secret infections are physical, and the random events run on the site. The app can see neither the board nor the events, so a scorepad has nothing to score. |

Keebble: Knickknack is the same kind of hybrid, but it sits inside the covered Keebble
collection; that template names it and says it needs one phone with internet.

### Not covered: the table is the game (11 entries)

These games have no score to keep, no timer to run, or a final total that is simply the
sum of what is drawn on the paper. The app cannot see the board, the hidden hands or the
performance, so any digital version would be a decorative duplicate.

| Game | Why no template |
|------|-----------------|
| Pyrrameds | The first player to empty their hand wins; there is no score. The pyramid, the hidden hands and the patient paths are entirely on the table. |
| The Mist | Each player draws a path through a paper grid and sums the squares visited. The route is the score, and the app cannot see it. |
| Librarians | A cooperative sorting puzzle. The library layout is the whole game, there is no score or timer, and the app cannot see whether a card fits. |
| The Game of Happiness | A cooperative conversation about what makes people happy. There is no score, timer or secret deal; a scorepad would turn the conversation into a competition. |
| Sleighwell | A cooperative tile board with one shared star total. The board is the game, so a counter duplicates a pen and cannot check whether a house's wishes were met. |
| Mountain Miners | End scoring is majority and minority across gemstone types, counted from piles on the table. A generic scorepad would need the set's gem list and still could not see the piles. |
| Pumpkin Patrol | Scoring depends on which person cards each player collected and which decorations they hold. The app cannot see the homes, so it could only add a total the table already knows. |
| Hold my Bear | The whole game is the public card match on the table. There is no score, timer or hidden information to track. |
| Meadowmight | Scoring counts enclosed meadows and Sheeple on the board. The app cannot see a fence or a claim, so a final sum is all it could offer. |
| Split the Foody | Scoring only counts card types for which you hold a majority. The app cannot see the table's piles, so a scorepad would be a manual total with no check. |
| Kangaruse | A paper-grid jumping game; the score is the sum of the squares visited. The route is the game and the app cannot see it. |

### Not covered: no verified rulebook (7 entries)

The rule page is either gone or stops before setup. The project's standard is a checked
summary, never an inferred one, so a template here would have to invent rules. That is
the reason, not a lack of interest.

| Game | Why no template |
|------|-----------------|
| That's Amorphe | The drawing-and-guessing rule page returns 404. The game is the drawing, and the missing rules make a checked summary impossible. |
| That's Amorphe: Pictures | Same series, same 404 and the same drawing-based play. |
| Pirate Drawingbeard | The drawing rule page returns 404. The sketch is the game, and there is no verified setup or score to configure. |
| Pirate Riddlebeard | The riddle rule page returns 404. The riddles and answers are the game, with nothing for the app to track. |
| One Pizza the Puzzle | The rule page returns 404. The game page gives the objective and actions but not a full score model; a scorepad to 10 would duplicate the drawn board without checking it. |
| Unstable Universe | The rule page returns 404. The cut-and-fold paper is the game; without the rules there is nothing verified to configure. |
| Paper Thieves | The rule page returns 404. The catalogue blurb is not enough to check setup, scoring or the role of the paper, so no summary is shipped. |

### Not covered: older projects and one expansion (3 entries)

| Game | Why no template |
|------|-----------------|
| Swerving Shots | The author marks it as an older, lower-quality project and its rule page returns 404. It is the one game that would benefit from a damage tracker, but the starting damage and loss condition are not published; guessing them would be worse than no template. Revisit if the rulebook returns. |
| The Animal Bandit | Also an older project with a withdrawn rule page. The hidden smuggling piles are the game, there is no score, and the app cannot see the piles; a template would be a blurry rules paraphrase. |
| Waterfall: Raging Rapids | An expansion to Waterfall, whose base template already exists. It adds tiles and actions rather than a second score model; a variant can be added when its rulebook is read. |

## What the rules check covered

Each summary and every score or counter setting was read against the published rulebook
on 17 November 2026. Paths below are under `pandaqi.com`.

| Template | Rule pages read | What the file now says |
|----------|-----------------|------------------------|
| Bidding Blocks | `/bidding-blocks/rules/` | One card at a time with a bid after each; an exact bid is 100 points, one off is 50, divided by the cards held; recommended target 100 |
| Mapped Out | `/mapped-out/rules/` | 8 facedown movement cards and 5 tiles; play a tile, resolve its place action, draw; score the most-visited fish type; highest |
| Death by Digits | `/death-by-digits/rules/` | 3 Murder cards and shared Evidence; first correct accusation wins, a wrong one eliminates; no scorepad |
| Fiddlefoo | `/fiddlefoo/rules/` | Notes left in hand are negative points and the least negative total wins; the sheet counts notes and treats the lowest as best |
| The Luck Legends | the seven `/the-luck-legends/roll/<game>/rules/` pages | Seven different endings; the file lists each game's win condition and carries no shared scorepad |
| Naivigation | `/naivigation/rules/` and `/naivigation/visit/swerving-spaceships/rules/` | 5 collectibles to win, an empty health deck to lose; damage tally; five major games share the core, two specials are spin-offs |
| Chiptales | the three `/chiptales/bet/<game>/rules/` pages | Six of Sparrows to 500, Noble Flood contracts, Pietenpoker won cards; highest total |
| Feed the Beast | `/feed-the-beast/rules/` | 10 Tier 1 food each; end a turn with none to win; no scorepad |
| Maybe Games | the three `/maybe-games/vote/<game>/rules/` pages | Secret simultaneous votes; Movies and Missions end when votes run out, Minister at 25 points |
| Throneless Games | `/throneless-games/conquer/kingseat/rules/` and the collection page | Shared simultaneous vote, seat swaps and secret Loyalty; most votes for a Prince wins, ties go clockwise from the Kingseat; the other three games keep the core and add their own Princes |
| Keebble Games | `/keebble-games/spell/keebble/rules/` and the collection page | Vowels 1, consonants 3, unique letters 5; call two letters; hand limit 7; endgame at 10 edge letters; highest score; Domino and Knickknack need their own material |
| Captain Flip | `/captain-flip/rules/` | Flip a tile and use the faceup or facedown action; score facedown tiles; empty the map; highest total |
| Magnetmen | `/magnetmen/rules/` | Cross out one square and fill an inventory; more copies repel more neighbours; highest total when nobody can move |
| Waterfall | `/waterfall/rules/` | Play cards to fall, execute tiles, bank matching gemstones; ends at 20 tiles or an empty deck; highest total |
| Firecrackers | `/firecrackers/rules/` | Reveal or stop; a colour total of 10 explodes; shop runs out; highest deck value |
| Hasty Accusations | `/hasty-accusations/rules/` | Secret suspect each; loupe review kills suspects and eliminates their player; last player wins; one-life tracker and turn phases |
| The Game of Dilemmas | `/the-game-of-dilemmas/rules/` | Five rounds; smallest yes/no difference wins; yes tokens score; highest total |
| Slippery Slopes | `/slippery-slopes/rules/` | Four sliders, a secret word, 1-2 minutes; 5 points per correct guess; 10 rounds; shared or team score |
| Mammoth Messages | `/mammoth-messages/rules/` | Two words from a choice tile; up to five cave drawings; 60 seconds; 10 minus revealed drawings; 10 rounds; shared total |
| I Bid You Not | `/i-bid-you-not/rules/` | Open offer card; add a higher card or call an auction; secret simultaneous bids, sorted high to low and inverted when every bid sits inside the offer's range; the first to accept takes the offer, a skip costs a random scored card plus a card added to the offer, the last player must accept; empty hands end it and the price total wins |

The Naivigation template describes only the shared core. The other four major vehicle
rulebooks and the two specials' rulebooks were not read, so the file does not describe
their unique rules. The Throneless template describes the shared core and Kingseat's
verified round; it explicitly leaves each game's unique Princes and twists to that
game's rulebook. The Keebble template describes base Keebble in full and only the
material needs of Domino and Knickknack.

The blind-bid pad records whole numbers from 0 to 100, which covers the base deck and
Double Devices; the negative numbers in Odd Inventions have to be noted by hand, and the
template's notes say so.

Where a collection page and its game pages disagree on player count, the file follows
the game pages: Maybe Games is 3–6 here (the collection says 2–6, all three games say
3–6), The Luck Legends is 2–8 because Deceptidice takes 2–8 (the collection says
2–6), Chiptales is 2–9, Naivigation is 2–10 for the five major games, and Throneless
Games is 4–10 because all four sub-games say 4–10 (the collection says 2–8). Keebble
is 2–6 with a 20–60 minute range: Keebble is 20, Domino 40 and Knickknack 60.

## Adding one

1. Put `<game>.gamebuddy` and `<game>.icon.svg` here. The generator, the linter and the
   round-trip test pick the folder up automatically.
2. Use `tags:` starting with `pandaqi`, then the usual family tags (`card`, `board`,
   `dice`, `party`, …). The linter fails a file in this folder without that tag, because
   the gallery's Pandaqi chip filters on it.
3. Keep the rules summary in our own words, link the game's page with `source:`, and
   never copy rulebook text, art or logos. `docs/LICENSES.md` applies unchanged.
4. Add only a tracker the published rules support, and check its score model and win
   condition against the rulebook you read.
5. Run `bun run gen`, `bun run lint:templates` and `bun run check`, then add the game to
   the audit table above.
6. If a rule page is missing, record that as the reason. Do not fill the gap by
   inference; move the game to the "no verified rulebook" table instead.

A real play test with the physical game, and a look at each mark beside its title in
both themes, are human checks; they are listed in `ROADMAP.md` §7 and are not claimed
here.
