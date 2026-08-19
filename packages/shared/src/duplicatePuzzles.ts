import type { Puzzle } from "./puzzle.js";

/**
 * Finds a puzzle in `existing` whose solution content matches `puzzle` —
 * same dimensions and same cell-by-cell grid — regardless of id, name, or
 * palette. Catches the same puzzle submitted under a different name;
 * `loadPuzzleSources` already prevents id collisions implicitly via
 * distinct filenames, so id is deliberately not part of this comparison.
 */
export function findDuplicatePuzzle(
  puzzle: Puzzle,
  existing: Puzzle[],
): Puzzle | undefined {
  return existing.find((other) => hasSameSolution(puzzle, other));
}

function hasSameSolution(a: Puzzle, b: Puzzle): boolean {
  if (a.width !== b.width || a.height !== b.height) {
    return false;
  }

  for (let y = 0; y < a.height; y++) {
    for (let x = 0; x < a.width; x++) {
      if (a.cells[y][x] !== b.cells[y][x]) {
        return false;
      }
    }
  }

  return true;
}
