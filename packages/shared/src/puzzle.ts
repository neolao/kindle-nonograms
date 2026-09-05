/**
 * A nonogram puzzle: its solution grid plus the palette of colors used.
 * Clues are never stored here — they are always derived from `cells`
 * (see clues.ts).
 */
export interface Puzzle {
  id: string;
  name: string;
  width: number;
  height: number;
  /** Hex colors; a cell's value is an index into this array. */
  palette: string[];
  /** Row-major solution grid. `null` = empty cell. */
  cells: (number | null)[][];
}

/**
 * Stable, locale-independent discriminant for why `createPuzzle` rejected
 * its input — lets a caller (e.g. the puzzle editor) pick its own
 * user-facing message per failure kind without parsing `Error#message`,
 * which stays a plain-English, developer-facing description (see
 * `.vibe/decisions/021-editor-errors-discriminated-by-reason.md`).
 */
export type PuzzleValidationReason =
  | "emptyId"
  | "emptyName"
  | "invalidDimensions"
  | "emptyPalette"
  | "rowCountMismatch"
  | "columnCountMismatch"
  | "colorIndexOutOfRange";

/** Thrown by `createPuzzle` for any structurally invalid input. */
export class PuzzleValidationError extends Error {
  readonly reason: PuzzleValidationReason;

  constructor(reason: PuzzleValidationReason, message: string) {
    super(message);
    this.name = "PuzzleValidationError";
    this.reason = reason;
  }
}

function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

/**
 * Validates and builds a Puzzle. Throws a descriptive `PuzzleValidationError`
 * if the input is inconsistent (wrong dimensions, out-of-range colors, empty
 * id/name).
 */
export function createPuzzle(input: Puzzle): Puzzle {
  const { id, name, width, height, palette, cells } = input;

  if (id.trim() === "") {
    throw new PuzzleValidationError("emptyId", "Puzzle id must not be empty");
  }

  if (name.trim() === "") {
    throw new PuzzleValidationError(
      "emptyName",
      "Puzzle name must not be empty",
    );
  }

  if (!isPositiveInteger(width) || !isPositiveInteger(height)) {
    throw new PuzzleValidationError(
      "invalidDimensions",
      "Puzzle width and height must be positive integers",
    );
  }

  if (palette.length === 0) {
    throw new PuzzleValidationError(
      "emptyPalette",
      "Puzzle palette must contain at least one color",
    );
  }

  if (cells.length !== height) {
    throw new PuzzleValidationError(
      "rowCountMismatch",
      `Puzzle cells must have exactly ${height} rows`,
    );
  }

  for (const row of cells) {
    if (row.length !== width) {
      throw new PuzzleValidationError(
        "columnCountMismatch",
        `Every puzzle row must have exactly ${width} columns`,
      );
    }

    for (const cell of row) {
      if (cell !== null && (cell < 0 || cell >= palette.length)) {
        throw new PuzzleValidationError(
          "colorIndexOutOfRange",
          `Cell color index ${cell} is out of palette range`,
        );
      }
    }
  }

  return { id, name, width, height, palette, cells };
}
