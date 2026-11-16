# ROADMAP

**PQ-GAME-BUDDY** is a small library of tools that can help people when playing _board games_ or _video games_ (or game-like activities in general).

## What to include?

First, check the `vault`. It contains the content pages + css + typescript code for 4 tools I currently host at <https://pandaqi.com/tools/>. They are:

* CATEGORIZER: an overview of different genres/themes/terminology for games + a "get inspired" system that randomizes them for you.
* DICTIONARY: a small dictionary with only "common" words, to be used in word games, party games, etcetera.
* RANDOMNESS: lots of ways to execute random checks: throw a dice, flip a coin, draw a random name
* TIMER: a simple way to start a timer.

These tools should _at least_ be supported in this system, but that doesn't mean copying them---still write them from scratch to match the new system, because we want to _improve_ them massively.

Example:

* DICTIONARY: Should support many more languages than just English
* RANDOMNESS: more types of randomness, more control, calculating probabilities, etcetera.
* TIMER: Allow running multiple timers at once (say in a realtime game like Kitchen Rush, where players need to constantly tap timers to "flip" them and keep going in time), different types of timers (count up, count down, flip/ping-pong, chess-like timer with increments, etcetera)


Then, I also had these ideas for tools myself.

* SCORE TRACKER: A great and easy way to track score during a game or to help out when tallying at the end. (Register per player, easy operations, easy final comparisons and leaderboard, etcetera.)
  * MAYBE even include (lazy load?) the scoring rules (and average scoring target) for lots of common/popular games?


But this is of course not all there is to it. Such a "game buddy" could support waaaay more types of tools and use cases.

So, @TODO, investigate and find all those other use cases, and clearly write them down (with detailed specifications).


## How to do it?

Like all my libraries, it should just be an `index.html` with a `js` file (maaaaybe a `.css` file for styles, but that can be folded into TypeScript > js bundle).

So I can host it online (and people can use it as they see fit), or you can just double-click to open it locally/offline in your browser. So, ALL functionality should work offline (and with `file://` protocol if needed)

Additionally, we should create a "syntax" for quickly defining configs and tools. These should just be plain text files, though we can invent some extension like `.gamebuddy`

Example:

* You create a "template" file (`game-name.gamebuddy` or something).
* You load that into the system, and it automatically recognizes it's for the TIMERS tool, then sets the right settings + prepares timers at the right lengths and stuff.
* Then, while playing, every player just gets this big block that they can _tap_ to reset/pause their timer. (So you can play with multiple players on a single phone/device.)
* (The next time you play, just load this config again, and you can immediately start. No repetitive fiddling with settings.)

Example:

* You've downloaded a `.gamebuddy` "template" file for a popular game you're going to play.
* You insert it into the system and it immediately sets the score tracker + timer to what's needed for that game.
* Immediately play!

NOTE: This means that, once this new library is done, I should be able to just place that `index.html` and JS file into the `tools` folder at <https://pandaqi.com> to host the tools for anyone to use again.

## File-Folder Structure

Just a TypeScript library (built by bun). There's a `core` folder with the lightweight glue of the app and bootstrapping and stuff. All other tools are their own nice self-contained folder (`timer`, `random`, etc) next to `core`.

While building, it should be able to automatically pick up all the tools present in the folder and fold them into the system / make them selectable in the UI.