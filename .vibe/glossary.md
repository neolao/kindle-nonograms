# Ubiquitous Language

## Puzzle
A nonogram board defined by its width and height, plus one clue list per row and one per column. It is the unit of content the player solves.
**Do not confuse with:** Grid, which is the mutable play state (cell-by-cell), not the puzzle definition.
_Sources: `packages/shared/src/index.ts`_

## Cell
A single position on the puzzle grid, holding one of three states: empty (undecided), filled (part of the solution), or marked (deliberately excluded by the player).
_Sources: `packages/shared/src/index.ts`_

## Clue
The sequence of runs attached to a row or column of a puzzle, each run carrying both a length and the palette color it must be filled with. A run always breaks on a color change, even without an empty cell between the two colors; two runs of the same color still require an empty gap to count as separate. Clues are never stored — they are always derived on demand from a puzzle's solution grid.
**Do not confuse with:** Puzzle, which owns the solution grid clues are derived from.
_Sources: `packages/shared/src/clues.ts`, `packages/client/src/main.ts`_
