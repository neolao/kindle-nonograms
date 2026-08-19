import { describe, expect, it } from "vitest";
import type { Puzzle } from "./puzzle.js";
import { checkSolvability } from "./solvability.js";

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
