---
status: done
---
# Fill Clue Numbers With Their Color

## Description
In a multi-color puzzle, each clue-run number currently gets its palette color only as text color plus a colored/patterned border (`packages/site/src/renderPuzzlePage.ts`, `.run-c${index}` rule) — the number itself sits on a white/panel background. The user wants the number's own background filled with its palette color instead of just outlined by it, closer to how a filled grid cell renders.

## Acceptance Criteria
- [x] In a multi-color puzzle, each clue-run number's background is filled with its palette color, not just framed by a colored/patterned border.
- [x] The number's text stays legible against its new colored background for every palette color, including pale ones (contrast-safe text color, not the raw palette hex used as text).
- [x] The non-color border-style cue from `.vibe/decisions/003-clue-color-plus-pattern-cue.md` (solid/dashed/dotted/double, cycling by palette index) is preserved alongside the new fill, so distinguishing colors still doesn't rely on hue alone.
- [x] Single-color puzzle clues are unaffected — they still render as plain, unadorned numbers.

## Notes
Likely touches the `.run-c${index}` CSS rule and `readableRunColor`/`contrastingTextColor` in `packages/site/src/renderPuzzlePage.ts`. Keep spacing between stacked runs (backlog item 053, done) intact when adding a background fill.
