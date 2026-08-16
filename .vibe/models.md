# Data models

## Puzzle
| Field | Type | Notes |
|---|---|---|
| id | string | non-empty |
| name | string | non-empty |
| width | number | positive integer |
| height | number | positive integer |
| palette | string[] | hex colors; a cell's value is an index into this array |
| cells | (number \| null)[][] | row-major solution grid; `null` = empty cell |
Defined in: `packages/shared/src/puzzle.ts`

## ClueRun
| Field | Type | Notes |
|---|---|---|
| length | number | length of the run |
| colorIndex | number \| null | index into the puzzle's palette; `null` for the zero-length run of an empty line |
Defined in: `packages/shared/src/clues.ts`

## PuzzleClues
| Field | Type | Notes |
|---|---|---|
| rows | ClueRun[][] | one clue-run list per row |
| columns | ClueRun[][] | one clue-run list per column |
Defined in: `packages/shared/src/clues.ts`

## PlayerCellMark
Type alias: `number | "marked" | null` — a cell's play state: filled with a palette color index, deliberately excluded ("marked"), or untouched (`null`).
Defined in: `packages/shared/src/progress.ts`

## PuzzleProgress
| Field | Type | Notes |
|---|---|---|
| cells | PlayerCellMark[][] | one mark per cell, same shape as the puzzle's solution grid |
Defined in: `packages/shared/src/progress.ts`

## BooleanGridExport
| Field | Type | Notes |
|---|---|---|
| name | string, optional | falls back to the given id when missing or blank |
| width | number | |
| height | number | |
| cells | boolean[][] | `true` maps to color index `0`, `false` maps to `null` |
Defined in: `packages/shared/src/adapters.ts`
