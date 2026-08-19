import { type ClueRun, computePuzzleClues } from "./clues.js";
import type { Puzzle } from "./puzzle.js";

/**
 * Result of a solvability check. `ok: false` always carries a `reason`
 * describing why (never thrown — callers decide how to report it).
 */
export type SolvabilityResult = { ok: true } | { ok: false; reason: string };

/** A cell during solving: a forced value, or `undefined` while undetermined. */
type CellState = number | null | undefined;

/**
 * Checks whether a puzzle's solution is fully derivable by line-based
 * logical deduction alone — the standard "no guessing required" nonogram
 * fairness check (see .vibe/decisions/016-line-solver-fairness-check.md).
 *
 * Repeatedly solves every row and column against its clue, constrained by
 * whatever cells previous passes already forced, until nothing new is
 * forced. The puzzle is fair only if this fixpoint determines every cell
 * and it matches the stored solution.
 */
export function checkSolvability(puzzle: Puzzle): SolvabilityResult {
  const { width, height, cells: solution } = puzzle;

  if (solution.every((row) => row.every((cell) => cell === null))) {
    return { ok: false, reason: "Puzzle has no filled cells" };
  }

  const clues = computePuzzleClues(puzzle);
  const grid: CellState[][] = solution.map((row) => row.map(() => undefined));

  let changed = true;
  while (changed) {
    changed = false;

    for (let y = 0; y < height; y++) {
      const line = grid[y];
      const forced = solveLine(width, clues.rows[y], line);
      if (forced === null) {
        return {
          ok: false,
          reason: `Row ${y} has no placement consistent with its clue`,
        };
      }
      changed = applyForced(line, forced) || changed;
    }

    for (let x = 0; x < width; x++) {
      const column = grid.map((row) => row[x]);
      const forced = solveLine(height, clues.columns[x], column);
      if (forced === null) {
        return {
          ok: false,
          reason: `Column ${x} has no placement consistent with its clue`,
        };
      }
      if (applyForced(column, forced)) {
        changed = true;
        for (let y = 0; y < height; y++) {
          grid[y][x] = column[y];
        }
      }
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (grid[y][x] === undefined) {
        return {
          ok: false,
          reason: `Cell at row ${y}, column ${x} cannot be determined by logical deduction alone`,
        };
      }
      if (grid[y][x] !== solution[y][x]) {
        return {
          ok: false,
          reason: `Deduced value at row ${y}, column ${x} does not match the puzzle's stored solution`,
        };
      }
    }
  }

  return { ok: true };
}

/** Applies newly-forced values from `forced` onto `line`; returns whether anything changed. */
function applyForced(line: CellState[], forced: CellState[]): boolean {
  let changed = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === undefined && forced[i] !== undefined) {
      line[i] = forced[i];
      changed = true;
    }
  }
  return changed;
}

/**
 * Solves a single line of `length` cells against its `clue`, constrained by
 * cells already known in `known` (`undefined` = not yet known). For every
 * still-undetermined cell, tries every value a cell could ever hold
 * (background, or one of the clue's colors) against the line-feasibility
 * oracle below; a cell is forced only when exactly one value keeps the line
 * feasible. Returns `null` if `known` itself is already inconsistent with
 * the clue (an internally inconsistent puzzle).
 */
function solveLine(
  length: number,
  clue: ClueRun[],
  known: CellState[],
): CellState[] | null {
  if (!isLineFeasible(length, clue, known)) {
    return null;
  }

  const forced = known.slice();

  if (clue.length === 1 && clue[0].length === 0) {
    for (let i = 0; i < length; i++) {
      if (forced[i] === undefined) {
        forced[i] = null;
      }
    }
    return forced;
  }

  const candidateColors = [...new Set(clue.map((run) => run.colorIndex))];
  const candidates: (number | null)[] = [null, ...candidateColors];

  for (let p = 0; p < length; p++) {
    if (forced[p] !== undefined) {
      continue;
    }

    const feasibleValues = candidates.filter((value) => {
      const trial = known.slice();
      trial[p] = value;
      return isLineFeasible(length, clue, trial);
    });

    if (feasibleValues.length === 1) {
      forced[p] = feasibleValues[0];
    }
  }

  return forced;
}

/**
 * Whether at least one full placement of `clue`'s runs into a line of
 * `length` cells is consistent with `known`. A dynamic-programming
 * feasibility check (no placement enumeration), so it stays fast even for
 * long lines with many runs: `dp[i][j]` is true iff cells `[0, i)` can be
 * covered exactly by `runs[0..j)`, consistent with `known`, with any cells
 * not covered by a run left as background.
 */
function isLineFeasible(
  length: number,
  runs: ClueRun[],
  known: CellState[],
): boolean {
  if (runs.length === 1 && runs[0].length === 0) {
    return known.every((value) => value === undefined || value === null);
  }

  const numRuns = runs.length;
  const dp: boolean[][] = Array.from({ length: length + 1 }, () =>
    new Array(numRuns + 1).fill(false),
  );
  dp[0][0] = true;

  const allowsBackground = (pos: number) =>
    known[pos] === undefined || known[pos] === null;
  const allowsColor = (pos: number, color: number | null) =>
    known[pos] === undefined || known[pos] === color;
  const rangeAllowsColor = (
    start: number,
    end: number,
    color: number | null,
  ) => {
    for (let p = start; p < end; p++) {
      if (!allowsColor(p, color)) {
        return false;
      }
    }
    return true;
  };

  for (let i = 1; i <= length; i++) {
    if (dp[i - 1][0] && allowsBackground(i - 1)) {
      dp[i][0] = true;
    }

    for (let j = 1; j <= numRuns; j++) {
      if (dp[i - 1][j] && allowsBackground(i - 1)) {
        dp[i][j] = true;
        continue;
      }

      const run = runs[j - 1];
      if (i < run.length) {
        continue;
      }

      const start = i - run.length;
      if (!rangeAllowsColor(start, i, run.colorIndex)) {
        continue;
      }

      if (j === 1) {
        if (dp[start][0]) {
          dp[i][j] = true;
        }
      } else {
        const gap = requiredGap(runs[j - 2], run);
        if (gap === 1) {
          if (
            start >= 1 &&
            allowsBackground(start - 1) &&
            dp[start - 1][j - 1]
          ) {
            dp[i][j] = true;
          }
        } else if (dp[start][j - 1]) {
          dp[i][j] = true;
        }
      }
    }
  }

  return dp[length][numRuns];
}

/**
 * The mandatory gap between two consecutive runs: 1 cell when they share a
 * color (otherwise they'd merge into a single, longer run when derived from
 * actual cells), 0 when their colors differ (a bare color change already
 * breaks the run — see `computeLineClues`).
 */
function requiredGap(a: ClueRun, b: ClueRun): number {
  return a.colorIndex === b.colorIndex ? 1 : 0;
}
