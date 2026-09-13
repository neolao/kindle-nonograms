import type { Puzzle } from "./puzzle.js";

/**
 * Whether a puzzle uses more than one color, for the library page's color
 * filter. A puzzle's palette always has at least one entry (see
 * `createPuzzle`), so this is `false` only for a genuinely monochrome
 * puzzle, never for missing/empty palette data.
 */
export function isMultiColorPuzzle(puzzle: Puzzle): boolean {
  return puzzle.palette.length > 1;
}
