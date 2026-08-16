# Module: shared
**Role:** Domain types and pure helpers shared across the project.
**Files:** `packages/shared/src/index.ts`, `packages/shared/src/puzzle.ts`, `packages/shared/src/clues.ts`, `packages/shared/src/progress.ts`, `packages/shared/src/adapters.ts`
**Exports:** `Puzzle` (interface), `createPuzzle(input): Puzzle`, `ClueRun` (interface), `PuzzleClues` (interface), `computeLineClues(line): ClueRun[]`, `computePuzzleClues(puzzle): PuzzleClues`, `PlayerCellMark` (type), `PuzzleProgress` (interface), `createEmptyProgressGrid(width, height): PlayerCellMark[][]`, `isPuzzleSolved(puzzle, progress): boolean`, `BooleanGridExport` (interface), `fromBooleanGridExport(id, input): Puzzle`
**Depends on:** (none)
