# Accessibility

Game Buddy targets **WCAG 2.2 AA**. Accessibility is a build requirement here, not a
later pass: the Svelte compiler is the first check, the primitives are built to the
rules below, and the manual matrix at the end is the release gate.

## What the code guarantees

- **Zero accessibility warnings.** `svelte-check` runs with `--threshold warning` in
  `bun run check`; a new warning fails the build. Nothing is suppressed.
- **Targets.** 48 × 48 px minimum (56 in table mode), with spacing that avoids
  mis-taps. Primary actions sit in the lower third of a 360 px phone screen.
- **Focus.** Every control is keyboard reachable, in a logical order, with a visible
  focus ring that survives dark, light and table themes. Sheets, covers and dialogs
  return focus to the control that opened them.
- **Escape always works.** Dialogs and pass-the-phone covers close on `Escape` and
  have an explicit cancel path; no keyboard trap exists, including on the reveal
  cover.
- **Labels.** Icon-only buttons carry `aria-label`; inputs have real labels; tables
  use `th` with row and column scopes.
- **Live regions.** Score, turn and life changes announce politely. Timers announce
  only at meaningful thresholds (one minute, thirty seconds, zero), never every
  second, and never interrupt another announcement.
- **No colour-only meaning.** Player colours always pair with a name or initials.
  Deltas in Splits carry a plus or minus sign and the word "ahead" or "behind". Dice
  results are always numeric text.
- **Sound has a twin.** Every cue (bell, buzzer, gong, tick) has a visual state; muted
  sound never removes information.
- **Motion is optional.** Every animation has a static end state. `prefers-reduced-
  motion` removes motion, and Settings offers an override for people whose OS setting
  is wrong for them.
- **Zoom and width.** Layout works at 320 px and at 200 percent zoom or 200 percent
  text size, with no horizontal scrolling and no clipped numbers.
- **Contrast.** Text at least 4.5:1, large text and UI edges at least 3:1, verified in
  light, dark and table mode. Disabled controls keep 3:1 and say why they are
  unavailable. The measured table lives in `docs/STYLE.md`; change a token and update
  it in the same commit.
- **Seats are rings.** Player colour is an outline around the player's initials, never
  white text on a fill, so the brightest seat still carries readable letters and no
  identity depends on colour alone.
- **Type floor.** Labels may be 12–14 px; every number or name a player must read is at
  least 20 px, and the primary readout is 34 px or larger in both themes.
- **No flashing.** Nothing flashes above 3 Hz. The buzzer uses a hard colour change,
  not a strobe.
- **Honest limits.** Wake Lock, vibration and audio are feature-detected; when they
  are missing the app says so instead of silently doing nothing.

## Tool-specific notes

- **Reveal.** Press and hold (pointer or `Space`) to show a secret; releasing hides it.
  An auto-hide timer backs this up. The cover states whose turn it is in text, and the
  role name is text, never an image.
- **Timer.** Digits are text with `aria-live` only at thresholds; the visual ring is
  decoration. Controls are buttons with names ("Start timer", "Add thirty seconds").
- **Score.** The sheet is a real table with scoped headers. Editing a cell is a form
  field with the player, round and category in its label, so a screen reader says what
  is being edited.
- **Buzzer.** Keyboard lanes are printed on screen, and each lane is a labelled button,
  so a keyboard-only player competes on equal terms.
- **Splits.** Comparison text includes the sign and the magnitude; gold splits are
  marked with a word, not only a colour.
- **Display mode.** The display tab is `aria-hidden` decoration for sighted viewers;
  it is never the only place information exists.

## Manual checks before release

These need a person. They are listed in `docs/RELEASING.md` as release gates and in
`ROADMAP.md` §7 as work that is not done by the agent.

1. **VoiceOver (Safari/iOS)** and **NVDA (Firefox or Chrome)**: start a timer, enter a
   score, deal roles in Reveal, advance a turn. Confirm each control is announced with
   a useful name and that no announcement repeats on every tick.
2. **Keyboard only**: complete one task per tool with `Tab`, `Enter`, `Space` and
   arrows. No focus traps, no invisible focus.
3. **Contrast**: measure the app's text, buttons, table borders and player colours in
   light, dark and table mode; record the ratios.
4. **Zoom and text size**: 200 percent zoom and 200 percent text at 320 px width.
5. **Reduced motion**: OS setting on; confirm nothing moves except a static state
   change, and that the reveal cover still works.
6. **Colour vision**: simulate deuteranopia and protanopia; confirm player identity and
   ahead/behind states still read.
7. **Screen reader with sound off**: confirm the timer's thresholds are announced and
   visible.
8. **Real device in the sun**: table mode readable at arm's length in daylight.

## Reporting a problem

Accessibility bugs outrank new features. Record what you used (browser, screen reader,
input method), the screen, and what happened; a broken keyboard path or an unreadable
number is a release blocker, not a polish item.
