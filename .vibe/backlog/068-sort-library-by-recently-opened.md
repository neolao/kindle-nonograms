---
status: todo
---
# Sort Library By Recently Opened

## Description
The library page always lists puzzles in their fixed default order. Add a way to sort them by recency instead, so the player can quickly find the nonograms they opened most recently.

## Acceptance Criteria
- [ ] Opening a puzzle's play page records that puzzle as opened now (a timestamp), persisted in the browser so it survives a reload.
- [ ] Library page offers a control to sort the visible puzzles by most-recently-opened first.
- [ ] Puzzles that have never been opened keep appearing after all opened ones, in their existing default order.
- [ ] The recency sort combines correctly with the existing color filter (and, once removed, without the size filter) — sorting only reorders within the already-filtered set.

## Notes
Needs a new "last opened" timestamp, which doesn't exist today — `PuzzleProgress` (`packages/shared/src/progress.ts`) only stores `cells`. Likely a separate `localStorage` entry per puzzle (e.g. `kindle-nonograms:opened:<puzzleId>`) written from `hydratePlayPage.ts`, read back in `hydrateLibraryPage.ts` alongside the existing `progressStorage` reads. Per item 067's finding that dropdowns work poorly on Kindle's browser, prefer a button/toggle over a `<select>` for the sort control — exact UI left to implementation. Touches the same `.library-filters` area as items 066 and 067; worth checking for overlap if built close together.
