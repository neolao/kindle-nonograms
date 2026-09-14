import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { Puzzle } from "./puzzle.js";
import {
  checkSolvability,
  computePuzzleDifficulty,
  diagnoseSolvability,
  suggestSolvabilityFix,
} from "./solvability.js";

function fixture(overrides: Partial<Puzzle>): Puzzle {
  return {
    id: "fixture",
    name: "Fixture",
    width: 2,
    height: 2,
    palette: ["#000000"],
    cells: [
      [0, null],
      [null, 0],
    ],
    ...overrides,
  };
}

describe("checkSolvability", () => {
  it("passes a monochrome puzzle whose solution is fully derivable from its row and column clues", () => {
    // row0 = [0,0] (fully filled -> unambiguous), row1 = [0,null] only
    // becomes unambiguous once column0's own full-column clue forces it.
    const puzzle = fixture({
      cells: [
        [0, 0],
        [0, null],
      ],
    });

    expect(checkSolvability(puzzle)).toEqual({ ok: true });
  });

  it("passes a multi-color puzzle solvable by line-based deduction alone", () => {
    const puzzle = fixture({
      palette: ["#ff0000", "#0000ff"],
      cells: [
        [0, 1],
        [0, null],
      ],
    });

    expect(checkSolvability(puzzle)).toEqual({ ok: true });
  });

  it("fails with a reason when the solution requires guessing (ambiguous placement)", () => {
    // A diagonal: every row/column clue is a single length-1 run whose
    // position cannot be pinned down without already knowing the answer.
    const puzzle = fixture({
      width: 3,
      height: 3,
      cells: [
        [0, null, null],
        [null, 0, null],
        [null, null, 0],
      ],
    });

    const result = checkSolvability(puzzle);

    expect(result.ok).toBe(false);
    expect(typeof (result as { reason: string }).reason).toBe("string");
    expect((result as { reason: string }).reason.length).toBeGreaterThan(0);
  });

  it("fails with a reason when the grid has no filled cells at all", () => {
    const puzzle = fixture({
      cells: [
        [null, null],
        [null, null],
      ],
    });

    const result = checkSolvability(puzzle);

    expect(result.ok).toBe(false);
    expect(typeof (result as { reason: string }).reason).toBe("string");
    expect((result as { reason: string }).reason.length).toBeGreaterThan(0);
  });

  it("returns a structured result instead of throwing on an ambiguous puzzle", () => {
    const puzzle = fixture({
      width: 3,
      height: 3,
      cells: [
        [0, null, null],
        [null, 0, null],
        [null, null, 0],
      ],
    });

    expect(() => checkSolvability(puzzle)).not.toThrow();
  });
});

describe("diagnoseSolvability", () => {
  it("passes a puzzle solvable by line-based deduction alone", () => {
    // Same fixture as checkSolvability's own "passes a monochrome puzzle"
    // test: row1's lone cell only becomes unambiguous once column0's own
    // full-column clue forces it.
    const puzzle = fixture({
      cells: [
        [0, 0],
        [0, null],
      ],
    });

    expect(diagnoseSolvability(puzzle)).toEqual({ ok: true });
  });

  it("reports every ambiguous row and column, not just the first, on a fully ambiguous puzzle", () => {
    // The classic permutation-matrix nonogram: every row/column clue is a
    // single length-1 run, and swapping which row holds which column's fill
    // (any permutation matrix) satisfies every clue equally well — no cell
    // can ever be pinned down, so all 3 rows and all 3 columns are
    // genuinely, symmetrically ambiguous (independently reasoned, not by
    // re-running the solver: e.g. cell (0,0) could be null with the
    // alternate valid completion [[null,0,0??]]... concretely, swapping
    // rows 0 and 1 of the true solution yields a second, equally valid
    // full grid consistent with every one of the 6 clues, so no cell is
    // uniquely forced).
    const puzzle = fixture({
      width: 3,
      height: 3,
      cells: [
        [0, null, null],
        [null, 0, null],
        [null, null, 0],
      ],
    });

    const result = diagnoseSolvability(puzzle);

    expect(result).toEqual({
      ok: false,
      kind: "ambiguous",
      problemRows: [0, 1, 2],
      problemColumns: [0, 1, 2],
      problemCells: [
        { row: 0, column: 0 },
        { row: 0, column: 1 },
        { row: 0, column: 2 },
        { row: 1, column: 0 },
        { row: 1, column: 1 },
        { row: 1, column: 2 },
        { row: 2, column: 0 },
        { row: 2, column: 1 },
        { row: 2, column: 2 },
      ],
    });
  });

  it("confines the reported problem rows/columns to a genuinely ambiguous sub-area, excluding the rest of a larger, fully-determined grid", () => {
    // A 2x2 permutation ambiguity (rows/columns 0-1) embedded in a 5x5
    // grid whose remaining rows/columns (2-4) are entirely blank. A
    // completely blank line's clue is the special "no fill anywhere"
    // marker, forced trivially and unconditionally on the first pass,
    // with zero slack to ever accommodate a stray fill from elsewhere —
    // so this padding can't leak ambiguity into the rest of the grid, and
    // the reported problem area must stay exactly rows/columns 0-1.
    const puzzle = fixture({
      width: 5,
      height: 5,
      cells: [
        [0, null, null, null, null],
        [null, 0, null, null, null],
        [null, null, null, null, null],
        [null, null, null, null, null],
        [null, null, null, null, null],
      ],
    });

    const result = diagnoseSolvability(puzzle);

    expect(result).toEqual({
      ok: false,
      kind: "ambiguous",
      problemRows: [0, 1],
      problemColumns: [0, 1],
      problemCells: [
        { row: 0, column: 0 },
        { row: 0, column: 1 },
        { row: 1, column: 0 },
        { row: 1, column: 1 },
      ],
    });
  });

  it("reports the degenerate 'no filled cells' case distinctly, without running the line solver", () => {
    const puzzle = fixture({
      cells: [
        [null, null],
        [null, null],
      ],
    });

    expect(diagnoseSolvability(puzzle)).toEqual({
      ok: false,
      kind: "noFilledCells",
    });
  });
});

describe("suggestSolvabilityFix", () => {
  it("finds a single-cell change that makes a small ambiguous puzzle solvable", () => {
    // The classic 2x2 permutation ambiguity. Independently verified by
    // hand: changing (0,0) from filled to empty gives [[null,null],[null,0]]
    // — row0/col0 both become the special "nothing filled" clue, forcing
    // (0,1) and (1,0) empty too, which in turn pins row1's/col1's lone run
    // to (1,1). Every cell ends up determined, so this is a genuine fix,
    // and it's the first candidate the function tries (cell (0,0), before
    // (0,1)/(1,0)/(1,1), with `null` tried before any color).
    const puzzle = fixture({
      cells: [
        [0, null],
        [null, 0],
      ],
    });

    expect(suggestSolvabilityFix(puzzle)).toEqual({
      row: 0,
      column: 0,
      value: null,
    });
  });

  it("suggests nothing for a puzzle that's already solvable", () => {
    const puzzle = fixture({
      cells: [
        [0, 0],
        [0, null],
      ],
    });

    expect(suggestSolvabilityFix(puzzle)).toBeUndefined();
  });

  it("suggests nothing when the ambiguous area is too large to search", () => {
    // The 3x3 full-permutation diagonal: 9 ambiguous cells, over the
    // small-area search cap, and (per the real puzzles that motivated this
    // cap) not fixable by any single cell anyway.
    const puzzle = fixture({
      width: 3,
      height: 3,
      cells: [
        [0, null, null],
        [null, 0, null],
        [null, null, 0],
      ],
    });

    expect(suggestSolvabilityFix(puzzle)).toBeUndefined();
  });

  it("suggests nothing for a puzzle with no filled cells", () => {
    const puzzle = fixture({
      cells: [
        [null, null],
        [null, null],
      ],
    });

    expect(suggestSolvabilityFix(puzzle)).toBeUndefined();
  });
});

describe("computePuzzleDifficulty", () => {
  it("returns a score from 1 to 10 for an ordinary solvable puzzle", () => {
    // Same fixture as checkSolvability's own "passes a monochrome puzzle"
    // test — a small, easily-derived puzzle.
    const puzzle = fixture({
      cells: [
        [0, 0],
        [0, null],
      ],
    });

    const score = computePuzzleDifficulty(puzzle);

    expect(score).toBeGreaterThanOrEqual(1);
    expect(score).toBeLessThanOrEqual(10);
  });

  it("scores a puzzle that needs many more rounds of cross-referencing higher than one that barely needs any", () => {
    // The easy fixture above converges in 2 fixpoint rounds (as few as a
    // solvable puzzle can ever take — even a grid fully forced on the first
    // pass still needs a second, confirming round). The harder fixture
    // below was found by brute-force search specifically for a puzzle that
    // is genuinely solvable by pure line deduction (no guessing) but only
    // converges after 10 rounds of alternating row/column passes — verified
    // independently against this same solver, not derived from the
    // scoring formula under test.
    const easy = fixture({
      cells: [
        [0, 0],
        [0, null],
      ],
    });
    const harder = fixture({
      width: 6,
      height: 6,
      cells: [
        [null, null, null, null, 0, null],
        [null, 0, 0, 0, 0, null],
        [0, 0, null, null, null, 0],
        [null, 0, 0, null, null, 0],
        [0, null, null, 0, null, 0],
        [0, null, null, null, null, null],
      ],
    });

    expect(checkSolvability(harder)).toEqual({ ok: true });
    expect(computePuzzleDifficulty(harder)).toBeGreaterThan(
      computePuzzleDifficulty(easy) as number,
    );
  });

  it("returns undefined for a puzzle that requires guessing", () => {
    // The classic permutation-matrix nonogram: no cell can ever be pinned
    // down by line deduction alone (see checkSolvability's own identical
    // fixture).
    const puzzle = fixture({
      width: 3,
      height: 3,
      cells: [
        [0, null, null],
        [null, 0, null],
        [null, null, 0],
      ],
    });

    expect(computePuzzleDifficulty(puzzle)).toBeUndefined();
  });

  it("returns undefined for a puzzle with no filled cells", () => {
    const puzzle = fixture({
      cells: [
        [null, null],
        [null, null],
      ],
    });

    expect(computePuzzleDifficulty(puzzle)).toBeUndefined();
  });

  it("never scores below 1 for a trivially easy puzzle", () => {
    const puzzle = fixture({
      cells: [
        [0, 0],
        [0, null],
      ],
    });

    expect(computePuzzleDifficulty(puzzle)).toBeGreaterThanOrEqual(1);
  });

  it("never scores above 10, even for the most demanding puzzle shipped today", () => {
    // No small hand-built grid needs anywhere near enough fixpoint rounds
    // to exercise the scale's calibrated ceiling, so this reuses this
    // project's own real, already-shipped "Moon" puzzle (45x45) —
    // independently confirmed (outside this formula) to need 34 rounds to
    // converge, comfortably past the ceiling — rather than only ever
    // testing values safely inside the scale.
    const raw = JSON.parse(
      readFileSync(
        join(
          import.meta.dirname,
          "../../../data/puzzles/772cc4e7-88d1-4c5f-b585-b43ad05553f5.json",
        ),
        "utf-8",
      ),
    ) as Puzzle;

    expect(checkSolvability(raw)).toEqual({ ok: true });
    const score = computePuzzleDifficulty(raw);
    expect(score).toBeDefined();
    expect(score as number).toBeLessThanOrEqual(10);
  });
});
