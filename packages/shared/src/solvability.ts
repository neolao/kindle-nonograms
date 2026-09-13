import { type ClueRun, type PuzzleClues, computePuzzleClues } from "./clues.js";
import type { Puzzle } from "./puzzle.js";

/**
 * Result of a solvability check. `ok: false` always carries a `reason`
 * describing why (never thrown — callers decide how to report it).
 */
export type SolvabilityResult = { ok: true } | { ok: false; reason: string };

/**
 * Result of a full solvability diagnosis (see {@link diagnoseSolvability}):
 * unlike {@link SolvabilityResult}, the failure case names *every* row and
 * column that couldn't be fully determined, not just the first one found —
 * built for a contributor actively fixing an ambiguous puzzle, who needs
 * the whole picture, not one problem at a time.
 */
export type SolvabilityDiagnosis =
  | { ok: true }
  | { ok: false; kind: "noFilledCells" }
  | {
      ok: false;
      kind: "ambiguous";
      /** 0-based row indices containing at least one cell that couldn't be
       * determined (or that a deduced value contradicted). */
      problemRows: number[];
      /** Same, for columns. */
      problemColumns: number[];
      /** Every individual cell that couldn't be determined (or that a
       * deduced value contradicted), row-major order — the exact set
       * `problemRows`/`problemColumns` only summarize as touched axes. */
      problemCells: { row: number; column: number }[];
    };

/** A single-cell change that would make an ambiguous puzzle solvable — see {@link suggestSolvabilityFix}. */
export interface SolvabilityFixSuggestion {
  row: number;
  column: number;
  /** The cell's suggested new value (`null` = clear it). */
  value: number | null;
}

// `suggestSolvabilityFix` only searches a small ambiguous area: every real
// puzzle that actually required guessing (found via a genuine incident —
// see .vibe/decisions/041-solvability-single-cell-fix-suggestion-bounded.md)
// had a much larger, spread-out ambiguity with no single-cell fix at all, so
// a bigger search would only ever cost time without ever finding anything.
const SUGGESTION_MAX_PROBLEM_CELLS = 6;
// A second, independent hard cap on top of the cell-count one above: keeps
// the worst case bounded regardless of how large the puzzle's own palette
// is, since each attempt re-runs a full solvability check.
const SUGGESTION_MAX_ATTEMPTS = 40;

/** A cell during solving: a forced value, or `undefined` while undetermined. */
type CellState = number | null | undefined;

/** The fixpoint's own working grid, plus every line the solver ever found infeasible along the way. */
interface FixpointOutcome {
  grid: CellState[][];
  infeasibleRows: Set<number>;
  infeasibleColumns: Set<number>;
}

/**
 * Runs the fixpoint line-solver to full convergence: repeatedly solves
 * every row and column against its clue, constrained by whatever cells
 * previous passes already forced, until nothing new is forced. Shared by
 * {@link checkSolvability} (stops describing at the first problem found,
 * for a build-time reject) and {@link diagnoseSolvability} (describes
 * every problem, for a live editor diagnostic) so the two can never
 * disagree about the same puzzle.
 *
 * A line the solver finds infeasible (no placement of its clue is
 * consistent with what's already known) contributes no forced cells but
 * never aborts the run — in practice this never happens for a real
 * puzzle, since every clue is derived from the very solution being
 * checked, but recording it instead of throwing keeps this function total
 * and safe to call live from the UI on arbitrary in-progress drafts.
 */
function runFixpoint(
  width: number,
  height: number,
  clues: PuzzleClues,
  solution: (number | null)[][],
): FixpointOutcome {
  const grid: CellState[][] = solution.map((row) => row.map(() => undefined));
  const infeasibleRows = new Set<number>();
  const infeasibleColumns = new Set<number>();

  let changed = true;
  while (changed) {
    changed = false;

    for (let y = 0; y < height; y++) {
      const line = grid[y];
      const forced = solveLine(width, clues.rows[y], line);
      if (forced === null) {
        infeasibleRows.add(y);
        continue;
      }
      changed = applyForced(line, forced) || changed;
    }

    for (let x = 0; x < width; x++) {
      const column = grid.map((row) => row[x]);
      const forced = solveLine(height, clues.columns[x], column);
      if (forced === null) {
        infeasibleColumns.add(x);
        continue;
      }
      if (applyForced(column, forced)) {
        changed = true;
        for (let y = 0; y < height; y++) {
          grid[y][x] = column[y];
        }
      }
    }
  }

  return { grid, infeasibleRows, infeasibleColumns };
}

/**
 * Checks whether a puzzle's solution is fully derivable by line-based
 * logical deduction alone — the standard "no guessing required" nonogram
 * fairness check (see .vibe/decisions/016-line-solver-fairness-check.md).
 * Reports only the first problem found (row-major cell order, infeasible
 * lines last) — enough to reject a bad submission at build time. See
 * {@link diagnoseSolvability} for a version that reports every problem.
 */
export function checkSolvability(puzzle: Puzzle): SolvabilityResult {
  const { width, height, cells: solution } = puzzle;

  if (solution.every((row) => row.every((cell) => cell === null))) {
    return { ok: false, reason: "Puzzle has no filled cells" };
  }

  const clues = computePuzzleClues(puzzle);
  const { grid, infeasibleRows, infeasibleColumns } = runFixpoint(
    width,
    height,
    clues,
    solution,
  );

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

  if (infeasibleRows.size > 0) {
    return {
      ok: false,
      reason: `Row ${Math.min(...infeasibleRows)} has no placement consistent with its clue`,
    };
  }

  if (infeasibleColumns.size > 0) {
    return {
      ok: false,
      reason: `Column ${Math.min(...infeasibleColumns)} has no placement consistent with its clue`,
    };
  }

  return { ok: true };
}

/**
 * Diagnoses a puzzle's solvability like {@link checkSolvability}, but on
 * failure names *every* problem row and column instead of stopping at the
 * first — built for the puzzle editor's on-demand "check solvability"
 * button, so a contributor mid-edit sees the whole scope of an ambiguous
 * area at once (see .vibe/decisions/040-editor-solvability-diagnosis-and-json-import.md).
 * A total function: never throws, even for a puzzle mid-edit that would
 * be rejected outright at build time.
 */
export function diagnoseSolvability(puzzle: Puzzle): SolvabilityDiagnosis {
  const { width, height, cells: solution } = puzzle;

  if (solution.every((row) => row.every((cell) => cell === null))) {
    return { ok: false, kind: "noFilledCells" };
  }

  const clues = computePuzzleClues(puzzle);
  const { grid, infeasibleRows, infeasibleColumns } = runFixpoint(
    width,
    height,
    clues,
    solution,
  );

  const problemRows = new Set(infeasibleRows);
  const problemColumns = new Set(infeasibleColumns);
  const problemCells: { row: number; column: number }[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (grid[y][x] === undefined || grid[y][x] !== solution[y][x]) {
        problemRows.add(y);
        problemColumns.add(x);
        problemCells.push({ row: y, column: x });
      }
    }
  }

  if (problemRows.size === 0 && problemColumns.size === 0) {
    return { ok: true };
  }

  return {
    ok: false,
    kind: "ambiguous",
    problemRows: [...problemRows].sort((a, b) => a - b),
    problemColumns: [...problemColumns].sort((a, b) => a - b),
    problemCells,
  };
}

/**
 * Looks for a single cell whose value alone, if changed, would make an
 * ambiguous puzzle solvable — a concrete, actionable fix for the puzzle
 * editor's "check solvability" button to suggest, on top of the plain
 * row/column list {@link diagnoseSolvability} already reports. Tries every
 * other value at every reported problem cell, re-checking full solvability
 * after each trial, and returns the first one that works.
 *
 * Deliberately narrow in scope: only attempted when the ambiguous area has
 * at most `SUGGESTION_MAX_PROBLEM_CELLS` cells, and abandoned after at most
 * `SUGGESTION_MAX_ATTEMPTS` trials regardless — both caps exist because a
 * spread-out ambiguity (the kind real removed puzzles actually had) has no
 * single-cell fix to find anyway, so searching one is only ever wasted
 * work; see .vibe/decisions/041-solvability-single-cell-fix-suggestion-bounded.md.
 * Returns `undefined` when the puzzle is already fair, has no filled cells,
 * the ambiguous area is too large, or no single-cell fix exists within the
 * attempt budget.
 */
export function suggestSolvabilityFix(
  puzzle: Puzzle,
): SolvabilityFixSuggestion | undefined {
  const diagnosis = diagnoseSolvability(puzzle);
  if (diagnosis.ok || diagnosis.kind !== "ambiguous") {
    return undefined;
  }
  if (diagnosis.problemCells.length > SUGGESTION_MAX_PROBLEM_CELLS) {
    return undefined;
  }

  const candidateValues: (number | null)[] = puzzle.palette.map(
    (_, index) => index,
  );
  candidateValues.unshift(null);

  let attempts = 0;
  for (const { row, column } of diagnosis.problemCells) {
    const original = puzzle.cells[row][column];

    for (const value of candidateValues) {
      if (value === original) {
        continue;
      }
      if (attempts >= SUGGESTION_MAX_ATTEMPTS) {
        return undefined;
      }
      attempts++;

      const trialCells = puzzle.cells.map((line) => line.slice());
      trialCells[row][column] = value;

      if (checkSolvability({ ...puzzle, cells: trialCells }).ok) {
        return { row, column, value };
      }
    }
  }

  return undefined;
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
