import type { Puzzle } from "./puzzle.js";

/**
 * One contiguous run of filled cells in a row or column: its length and the
 * color it is filled with. A run always breaks on a color change, even
 * without an empty cell between the two colors.
 */
export interface ClueRun {
  length: number;
  colorIndex: number | null;
}

export interface PuzzleClues {
  rows: ClueRun[][];
  columns: ClueRun[][];
}

/**
 * Derives the clue runs for a single row or column of solution cells.
 * An empty line produces a single `{ length: 0, colorIndex: null }` run.
 */
export function computeLineClues(line: (number | null)[]): ClueRun[] {
  const runs: ClueRun[] = [];
  let runLength = 0;
  let runColor: number | null = null;

  for (const cell of line) {
    const breaksRun = cell === null || (runLength > 0 && cell !== runColor);

    if (breaksRun && runLength > 0) {
      runs.push({ length: runLength, colorIndex: runColor });
      runLength = 0;
      runColor = null;
    }

    if (cell !== null) {
      runLength += 1;
      runColor = cell;
    }
  }

  if (runLength > 0) {
    runs.push({ length: runLength, colorIndex: runColor });
  }

  return runs.length > 0 ? runs : [{ length: 0, colorIndex: null }];
}

/**
 * Derives both row and column clues for a puzzle's solution grid.
 */
export function computePuzzleClues(puzzle: Puzzle): PuzzleClues {
  const rows = puzzle.cells.map((row) => computeLineClues(row));

  const columns: ClueRun[][] = [];
  for (let x = 0; x < puzzle.width; x++) {
    const column = puzzle.cells.map((row) => row[x]);
    columns.push(computeLineClues(column));
  }

  return { rows, columns };
}
