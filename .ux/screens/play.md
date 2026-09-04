---
slug: play
title: Puzzle (play) page
flow: 001
status: designed
source: packages/site/src/renderPuzzlePage.ts, packages/client/src/hydratePlayPage.ts
---

# Puzzle (play) page

## Purpose

The Player fills in a puzzle's grid using its color-coded clues, checks their work, and sees a clear confirmation once it's solved.

## Layout

`.chrome-panel` → `.page-header` (back link + title) → play toolbar (Fill/Cross mode buttons, color swatches for multi-color puzzles, Check button) → win banner (hidden by default) → `.grid-wrapper` with the clue/cell table (already static today). This flow adds the toolbar and win banner to the static markup — the grid itself already exists as real HTML.

## States

| State | Trigger | What the user sees | Primary action |
|---|---|---|---|
| Default — never played | Fresh puzzle, no saved progress | Toolbar in its default shape (Fill mode active, swatch 0 active if multi-color), win banner hidden, empty grid — all baked, matching exactly what hydration builds today | Tap cells to fill/mark |
| Default — already solved | Saved `localStorage` progress shows the puzzle solved | Grid pre-filled with the solved solution, win banner already visible with its "solved" text — corrected by the pre-paint check in flow 001, never a hidden-then-shown flash | Nothing required; can still review the grid |
| In progress | Saved progress exists but isn't yet solved | Grid pre-filled with the saved marks, toolbar/banner in their normal default (banner hidden) | Continue filling |
| Incompatible saved progress | Saved progress no longer matches the puzzle's dimensions (existing, separate finding F11 — unaffected by this flow) | Falls back to the empty-grid default, banner hidden — visually identical to "never played" | Continue as new |
| Error — puzzle data missing/invalid | Embedded puzzle JSON fails to parse (existing, separate finding F9 — unaffected by this flow) | Static toolbar/grid remain visible per their frozen default but never become interactive | n/a |

## Interactions

| Element | Action | Result | Feedback (<100 ms) |
|---|---|---|---|
| Fill / Cross buttons | Tap | Switches paint mode, `aria-pressed` flips | Immediate (existing, unchanged) |
| Color swatch | Tap | Sets the active fill color | Immediate (existing, unchanged) |
| Check | Tap | Validates the grid, clears wrong cells, reveals the win banner if solved | Immediate (existing, unchanged) |
| Grid cell | Tap | Paints/marks the cell per current mode/color | Immediate (existing, unchanged) |
| (New) First paint | — | Toolbar and banner are already in their correct default/corrected shape — no post-load construction is visible | N/A — this flow's whole point |

## Content

No new user-facing strings — this flow relocates existing markup/text (`play.modeFill`, `play.modeCross`, `play.check`, the win message) from JS-constructed to statically baked. Wording itself is unchanged (separate findings F3/F7 cover wording/locale issues on this page).

## Accessibility

- **Keyboard order:** back-link → Fill → Cross → swatches (if any) → Check → grid (grid's own keyboard gap is the separately scoped-out finding, unaffected by this flow). Order is now fixed by `renderPuzzlePage.ts`'s template rather than `buildToolbar()`'s `.append()` order.
- **Focus after each action:** unchanged.
- **Announcements (live regions / screen reader):** the win banner's `aria-live="polite"` region now exists at first paint (hidden) instead of being created by JS; when the pre-paint check reveals it for an already-solved puzzle, `hidden` is cleared and the text is already correct — no separate "set text, then reveal" ordering issue (see the existing separate finding F30 about that ordering, which this flow does not change for the *newly solved during this visit* case, only for the *already solved before this visit* case).
- **Contrast & targets:** unchanged.
- **Motion:** none — removes the toolbar/banner pop-in that is this screen's share of finding F1.
