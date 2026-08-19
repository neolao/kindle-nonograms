import type { Puzzle } from "./puzzle.js";

/** The size category a puzzle's library card is grouped under for filtering. */
export type SizeBucket = "small" | "medium" | "large";

// Boundaries are inclusive on the lower bucket (a puzzle with exactly this
// many cells still counts as the smaller bucket) — chosen so the library's
// existing puzzles (16 to 2025 cells) spread across all three buckets
// instead of clustering in one.
const SMALL_MAX_CELLS = 100;
const MEDIUM_MAX_CELLS = 400;

/**
 * Groups a puzzle into a size bucket by its total cell count
 * (width × height), for the library page's size filter.
 */
export function puzzleSizeBucket(puzzle: Puzzle): SizeBucket {
  const cellCount = puzzle.width * puzzle.height;
  if (cellCount <= SMALL_MAX_CELLS) {
    return "small";
  }
  if (cellCount <= MEDIUM_MAX_CELLS) {
    return "medium";
  }
  return "large";
}

/**
 * Whether a puzzle uses more than one color, for the library page's color
 * filter. A puzzle's palette always has at least one entry (see
 * `createPuzzle`), so this is `false` only for a genuinely monochrome
 * puzzle, never for missing/empty palette data.
 */
export function isMultiColorPuzzle(puzzle: Puzzle): boolean {
  return puzzle.palette.length > 1;
}
