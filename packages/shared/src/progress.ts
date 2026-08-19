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
 * Whether a single player mark is correct against its solution cell: an
 * exact color match when the solution requires one, or anything other than
 * a fill (untouched or "marked") when the solution is empty. Shared by
 * {@link isPuzzleSolved} and {@link correctWrongCells} so the two never
 * drift on what "wrong" means.
 */
function isCellCorrect(
  solutionCell: number | null,
  playerCell: PlayerCellMark,
): boolean {
  if (solutionCell !== null) {
    return playerCell === solutionCell;
  }

  return typeof playerCell !== "number";
}

function assertMatchesPuzzleShape(
  puzzle: Puzzle,
  progress: PuzzleProgress,
): void {
  if (progress.cells.length !== puzzle.height) {
    throw new Error(
      `Progress must have exactly ${puzzle.height} rows to match the puzzle`,
    );
  }

  for (const row of progress.cells) {
    if (row.length !== puzzle.width) {
      throw new Error(
        `Every progress row must have exactly ${puzzle.width} columns to match the puzzle`,
      );
    }
  }
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
  assertMatchesPuzzleShape(puzzle, progress);

  for (let y = 0; y < puzzle.height; y++) {
    const solutionRow = puzzle.cells[y];
    const progressRow = progress.cells[y];

    for (let x = 0; x < puzzle.width; x++) {
      if (!isCellCorrect(solutionRow[x], progressRow[x])) {
        return false;
      }
    }
  }

  return true;
}

/** The result of running {@link correctWrongCells} over a progress grid. */
export interface CorrectionResult {
  /** A new grid, same shape as the input, with every wrong cell cleared. */
  cells: PlayerCellMark[][];
  /** Whether any cell actually differs from the input grid. */
  changed: boolean;
}

/**
 * Clears every cell that doesn't match the puzzle's solution back to
 * untouched (`null`) — a filled cell with the wrong color, a filled cell
 * where the solution is empty, or a mark left where the solution actually
 * requires a fill. Every already-correct cell (including a correct mark or
 * an untouched cell the player hasn't attempted) is left exactly as-is:
 * this only removes mistakes, it never fills in an answer for the player.
 * Pure — returns a new grid rather than mutating `progress`.
 */
export function correctWrongCells(
  puzzle: Puzzle,
  progress: PuzzleProgress,
): CorrectionResult {
  assertMatchesPuzzleShape(puzzle, progress);

  let changed = false;
  const cells = progress.cells.map((progressRow, y) =>
    progressRow.map((playerCell, x) => {
      // An untouched cell is never a mistake to correct, even where the
      // solution requires a fill — Check only undoes an actual wrong mark,
      // it never completes a cell the player hasn't attempted.
      if (
        playerCell === null ||
        isCellCorrect(puzzle.cells[y][x], playerCell)
      ) {
        return playerCell;
      }
      changed = true;
      return null;
    }),
  );

  return { cells, changed };
}
