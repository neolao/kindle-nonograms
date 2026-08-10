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

function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

/**
 * Validates and builds a Puzzle. Throws a descriptive error if the input
 * is inconsistent (wrong dimensions, out-of-range colors, empty id/name).
 */
export function createPuzzle(input: Puzzle): Puzzle {
  const { id, name, width, height, palette, cells } = input;

  if (id.trim() === "") {
    throw new Error("Puzzle id must not be empty");
  }

  if (name.trim() === "") {
    throw new Error("Puzzle name must not be empty");
  }

  if (!isPositiveInteger(width) || !isPositiveInteger(height)) {
    throw new Error("Puzzle width and height must be positive integers");
  }

  if (palette.length === 0) {
    throw new Error("Puzzle palette must contain at least one color");
  }

  if (cells.length !== height) {
    throw new Error(`Puzzle cells must have exactly ${height} rows`);
  }

  for (const row of cells) {
    if (row.length !== width) {
      throw new Error(`Every puzzle row must have exactly ${width} columns`);
    }

    for (const cell of row) {
      if (cell !== null && (cell < 0 || cell >= palette.length)) {
        throw new Error(`Cell color index ${cell} is out of palette range`);
      }
    }
  }

  return { id, name, width, height, palette, cells };
}
