# Ubiquitous Language

## Puzzle
A nonogram board defined by its width and height, plus one clue list per row and one per column. It is the unit of content the player solves.
**Do not confuse with:** Grid, which is the mutable play state (cell-by-cell), not the puzzle definition.
_Sources: `packages/shared/src/index.ts`_

## Cell
A single position on the puzzle grid, holding one of three states: empty (undecided), filled (part of the solution), or marked (deliberately excluded by the player).
_Sources: `packages/shared/src/index.ts`_

## Clue
The sequence of numbers attached to a row or column of a puzzle, indicating the lengths of the consecutive filled runs the player must place in that line.
_Sources: `packages/client/src/main.ts`_
