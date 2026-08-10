---
status: todo
depends_on: [001]
---
# Color-Aware Clue Computation

## Description
Add `packages/shared/src/clues.ts`: a `ClueRun { length, colorIndex }` type and pure functions `computeLineClues`/`computePuzzleClues` that derive row/column clues from a puzzle's solution grid. Clues are never stored, only computed on demand.

## Acceptance Criteria
- [ ] A run breaks on any color change (including transitions through an empty cell), so same-color runs require a gap while different-color runs may be adjacent without one, and both still count as separate clue entries
- [ ] An empty line produces `[{ length: 0, colorIndex: null }]`
- [ ] For a single-color palette, `computeLineClues(...).map(r => r.length)` matches the plain `number[]` clue shape used by classic black/white nonograms
- [ ] `computePuzzleClues` correctly derives both row clues and column clues (transposed) for a small fixture puzzle

## Notes
Depends on the `Puzzle` type from item 001. See plan section 1 (`clues.ts`).
