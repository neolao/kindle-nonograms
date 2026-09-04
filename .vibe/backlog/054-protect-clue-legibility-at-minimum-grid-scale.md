---
status: todo
---
# Protect Clue Legibility At Minimum Grid Scale

## Description
The grid-fit floor (`MIN_GRID_SCALE`, 0.3× a 16px base, in `packages/client/src/fitGrid.ts:35-61` / `hydratePlayPage.ts:38` / `hydrateEditorPage.ts:36`) allows clue text as small as ~4.8px on the app's largest bundled puzzles (up to 45×45) at Kindle width — it technically fits the viewport but is practically unreadable.

## Acceptance Criteria
- [ ] On a large puzzle at a narrow (Kindle-width) viewport, clue/grid text never renders below a legible minimum size, even if that means the grid itself needs horizontal scroll or a lower effective content width.
- [ ] Smaller puzzles' existing fit-to-viewport behavior is unchanged.
- [ ] No puzzle's clues/cells get clipped by `.grid-wrapper`'s `overflow:hidden` fail-safe as a result of this change.

## Notes
Audit finding F23 (`.ux/audit/2026-09-04.md`). Needs a design decision on the exact mechanism (separate text-vs-grid-line scaling, or a scroll affordance) — consider `/ux:design` for this one given the trade-off involved.
