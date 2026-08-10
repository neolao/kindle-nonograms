# Data models

## Puzzle
| Field | Type | Notes |
|---|---|---|
| id | string | |
| width | number | |
| height | number | |
| rowClues | number[][] | one clue list per row |
| colClues | number[][] | one clue list per column |
Defined in: `packages/shared/src/index.ts`

## CellState
Type alias: `"empty" | "filled" | "marked"`
Defined in: `packages/shared/src/index.ts`
