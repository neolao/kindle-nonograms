---
status: done
depends_on: [001]
---
# ReMarkable Export Adapter

## Description
Add `packages/shared/src/adapters.ts` with `fromBooleanGridExport`, converting the sibling project `remarkable-nonogram-generator`'s plain export shape (`{ name?, width, height, cells: boolean[][] }`) into this project's `Puzzle` (`true` → color index 0, `false` → `null`, `palette: ["#000000"]`). Lets a puzzle exported from that project be dropped into `data/puzzles/` as-is.

## Acceptance Criteria
- [ ] `fromBooleanGridExport` maps `true`/`false` cells to color index `0`/`null` and preserves dimensions
- [ ] The result is validated through `createPuzzle` (invalid input throws the same errors as item 001)
- [ ] A round-trip on a small fixture grid produces the expected `Puzzle`

## Notes
Depends on `createPuzzle` from item 001. See plan section 1 (`adapters.ts`).
