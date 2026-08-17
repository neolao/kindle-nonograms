---
status: done
depends_on: [008, 009]
---
# Hydrate Library Page Solved Marks

## Description
Add `packages/client/src/hydrateLibraryPage.ts`: reads the puzzle ids embedded in the generated library page, checks each one's saved progress via `loadProgress` + `isPuzzleSolved`, and marks solved puzzles in the DOM.

## Acceptance Criteria
- [ ] A puzzle with a stored, fully-correct progress is visually marked solved on the library page
- [ ] A puzzle with no stored progress, or incomplete progress, is not marked solved
- [ ] Puzzles with no `localStorage` entry at all do not cause errors

## Notes
Depends on the library page's static markup (008) and `progressStorage` (009). See plan section 4 (`hydrateLibraryPage.ts`).
