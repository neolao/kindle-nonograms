---
status: todo
depends_on: [001]
---
# Player Progress Domain Model

## Description
Add `packages/shared/src/progress.ts`: `PlayerCellMark` (`number | "marked" | null`), `PuzzleProgress`, `createEmptyProgressGrid`, and `isPuzzleSolved`. This supersedes the current `CellState`/`createEmptyGrid` placeholders in `packages/shared/src/index.ts`, which must be removed (dead code otherwise).

## Acceptance Criteria
- [ ] `createEmptyProgressGrid(width, height)` returns a grid of the right shape, every cell `null`
- [ ] `isPuzzleSolved` returns true only when every solution-filled cell matches its exact color AND no solution-empty cell was incorrectly filled by the player
- [ ] Marks (`"marked"`) never affect the solved result either way
- [ ] The old `CellState` type and `createEmptyGrid` function are removed from `packages/shared/src/index.ts`, and their existing tests are migrated/adapted rather than left dangling

## Notes
Depends on the `Puzzle` type from item 001. See plan section 1 (`progress.ts`).
