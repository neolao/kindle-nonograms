---
status: todo
depends_on: [007, 009]
---
# Hydrate Puzzle Play Page

## Description
Add `packages/client/src/hydratePlayPage.ts`: the interactive entry point for a generated puzzle page. Reads the embedded puzzle JSON, restores saved progress onto the existing DOM (no grid rebuild), wires the Fill/Cross mode toggle (plus color swatches when `palette.length > 1`), handles taps via one delegated click listener, redraws only the tapped cell, saves progress after each tap, and shows a win banner via `isPuzzleSolved`.

## Acceptance Criteria
- [ ] Tapping a cell in Fill mode sets it to the active color; tapping the same cell again clears it back to empty
- [ ] Tapping a cell in Cross mode sets/clears a "marked" state the same way
- [ ] Only the tapped cell's DOM node is updated on a tap (not a full grid rebuild)
- [ ] Restoring existing progress on load paints the correct cells before any interaction
- [ ] Fully and correctly solving a small fixture puzzle shows the win banner; `saveProgress` is called with the expected shape after each tap

## Notes
Depends on the puzzle page's static markup (007) and `progressStorage` (009). Multi-color fill selection UI is not specified by the product — swatches shown only when needed. See plan section 4 (`hydratePlayPage.ts`).
