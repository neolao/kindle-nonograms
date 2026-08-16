# Ubiquitous Language

## Puzzle
A nonogram board: its id, name, dimensions, color palette, and solution grid (which cell holds which palette color, if any). It is the unit of content the player solves. Clues are never stored on it — they are always derived on demand from the solution grid.
**Do not confuse with:** PuzzleProgress, which is the player's mutable play state (cell-by-cell), not the puzzle definition.
_Sources: `packages/shared/src/puzzle.ts`_

## Cell
A single position on a puzzle's solution grid or on a player's progress grid. In the solution, its value is a palette color index or empty (`null`). In the player's progress, its play state is one of three: filled with a color, deliberately excluded ("marked"), or untouched (`null`).
**Do not confuse with:** PuzzleProgress, the grid of cell play states as a whole.
_Sources: `packages/shared/src/puzzle.ts`, `packages/shared/src/progress.ts`_

## PuzzleProgress
A player's progress on one puzzle: one play mark per cell, matching the puzzle's solution grid in shape. A puzzle is solved when every solution-filled cell was marked with its exact color and no solution-empty cell was incorrectly filled; marks never affect this result either way.
**Do not confuse with:** Puzzle, the immutable definition the progress is checked against.
_Sources: `packages/shared/src/progress.ts`_

## Clue
The sequence of runs attached to a row or column of a puzzle, each run carrying both a length and the palette color it must be filled with. A run always breaks on a color change, even without an empty cell between the two colors; two runs of the same color still require an empty gap to count as separate. Clues are never stored — they are always derived on demand from a puzzle's solution grid.
**Do not confuse with:** Puzzle, which owns the solution grid clues are derived from.
_Sources: `packages/shared/src/clues.ts`, `packages/client/src/main.ts`_

## Boolean grid export
The plain puzzle format produced by the sibling `remarkable-nonogram-generator` project: dimensions plus a boolean solution grid, with no palette and no id. It is converted into this project's Puzzle before use, with `true` cells becoming the single palette color and `false` cells becoming empty.
**Do not confuse with:** Puzzle, the format it is converted into.
_Sources: `packages/shared/src/adapters.ts`_
