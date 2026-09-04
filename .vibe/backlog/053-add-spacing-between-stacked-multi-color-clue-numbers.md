---
status: todo
---
# Add Spacing Between Stacked Multi-Color Clue Numbers

## Description
Stacked multi-color column-clue numbers have zero vertical gap (`packages/site/src/renderPuzzlePage.ts:119-134`), so adjacent runs' colored/patterned borders touch directly — harder to read as two distinct clues (see capture `puzzle-demo-quad-desktop.png`).

## Acceptance Criteria
- [ ] Stacked clue-run `.run` divs have a small margin between them, so each run's border reads as a discrete shape.
- [ ] Single-run and inline (row) clues are unaffected.

## Notes
Audit finding F22 (`.ux/audit/2026-09-04.md`).
