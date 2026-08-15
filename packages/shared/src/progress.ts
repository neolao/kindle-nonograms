import type { Puzzle } from "./puzzle.js";

/**
 * A single cell's play state: filled with a color (index into the puzzle's
 * palette), deliberately excluded by the player ("marked"), or untouched
 * (`null`).
 */
export type PlayerCellMark = number | "marked" | null;

/**
 * A player's progress on one puzzle: one mark per cell, same shape as the
 * puzzle's solution grid.
 */
export interface PuzzleProgress {
  cells: PlayerCellMark[][];
}

function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

/**
 * Builds an empty progress grid of the given dimensions, every cell `null`.
 */
export function createEmptyProgressGrid(
  width: number,
  height: number,
): PlayerCellMark[][] {
  if (!isPositiveInteger(width) || !isPositiveInteger(height)) {
    throw new Error("Grid dimensions must be positive integers");
  }

  return Array.from({ length: height }, () =>
    Array<PlayerCellMark>(width).fill(null),
  );
}

/**
 * A puzzle is solved when every solution-filled cell was marked with its
 * exact color and no solution-empty cell was incorrectly filled. Marks
 * ("marked") never satisfy a solution-filled cell and never count as an
 * incorrect fill of a solution-empty cell — they never affect the result.
 */
export function isPuzzleSolved(
  puzzle: Puzzle,
  progress: PuzzleProgress,
): boolean {
  if (progress.cells.length !== puzzle.height) {
    throw new Error(
      `Progress must have exactly ${puzzle.height} rows to match the puzzle`,
    );
  }

  for (let y = 0; y < puzzle.height; y++) {
    const solutionRow = puzzle.cells[y];
    const progressRow = progress.cells[y];

    if (progressRow.length !== puzzle.width) {
      throw new Error(
        `Every progress row must have exactly ${puzzle.width} columns to match the puzzle`,
      );
    }

    for (let x = 0; x < puzzle.width; x++) {
      const solutionCell = solutionRow[x];
      const playerCell = progressRow[x];

      if (solutionCell !== null) {
        if (playerCell !== solutionCell) {
          return false;
        }
      } else if (typeof playerCell === "number") {
        return false;
      }
    }
  }

  return true;
}
