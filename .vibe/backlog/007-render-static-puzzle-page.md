---
status: todo
depends_on: [002, 004]
---
# Render Static Puzzle Page

## Description
Add `packages/site/src/renderPuzzlePage.ts`: a pure `renderPuzzlePage(puzzle): string` producing the full HTML for one puzzle's page — color-coded clue headers (via `computePuzzleClues`), a `<table>` grid whose cells are visually empty (the solution is never shown as cell content), the puzzle data embedded as JSON for client hydration, and relative references to the shared client bundle/CSS.

## Acceptance Criteria
- [ ] Rendered HTML contains the correct row/column clue numbers for a fixture puzzle
- [ ] No solution color/value is present as visible cell text or attribute content (only inside the embedded JSON payload)
- [ ] The embedded `<script type="application/json">` payload round-trips to the original puzzle data
- [ ] Asset references use relative paths (no leading `/`)

## Notes
Depends on color-aware clues (002) and the progress domain model (004, for embedding what hydration needs). See plan section 2 (`renderPuzzlePage.ts`) and section 2's note on relative paths for GitHub Pages project sites.
