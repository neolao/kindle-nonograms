---
status: done
---
# Puzzle Domain Type And Validator

## Description
Define the `Puzzle` domain type in `packages/shared/src/puzzle.ts` (id, name, width, height, palette of hex colors, and a row-major `cells` solution grid where each cell is `null` or a color index). Add a `createPuzzle` validating constructor, replacing the current placeholder `Puzzle` interface (which has clues but no cells) in `packages/shared/src/index.ts`.

## Acceptance Criteria
- [x] `createPuzzle` builds a valid `Puzzle` from well-formed input
- [x] `createPuzzle` throws when width/height are not positive integers
- [x] `createPuzzle` throws when `cells` shape doesn't match width×height, or a cell's color index is out of the palette's range
- [x] `createPuzzle` throws when `id` or `name` is empty

## Notes
A black/white puzzle is the special case `palette: ["#000000"]`. This item unblocks the color-aware clue computation, the reMarkable adapter, and the puzzle-source discovery step. See the approved plan at the time of writing: `/home/neolao/.claude/plans/l-id-e-est-de-naviguer-snuggly-milner.md`, section 1.
