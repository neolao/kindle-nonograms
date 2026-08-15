import { describe, expect, it } from "vitest";
import { createEmptyProgressGrid, isPuzzleSolved } from "./progress.js";
import type { Puzzle } from "./puzzle.js";

function fixturePuzzle(): Puzzle {
  return {
    id: "flag",
    name: "Flag",
    width: 2,
    height: 2,
    palette: ["#ff0000", "#0000ff"],
    cells: [
      [0, null],
      [null, 1],
    ],
  };
}

describe("createEmptyProgressGrid", () => {
  it("returns a grid with the requested height and width, every cell null", () => {
    const grid = createEmptyProgressGrid(3, 2);

    expect(grid).toHaveLength(2);
    expect(grid[0]).toHaveLength(3);
    expect(grid.flat().every((cell) => cell === null)).toBe(true);
  });

  it("returns a single-cell grid for a 1x1 puzzle", () => {
    expect(createEmptyProgressGrid(1, 1)).toEqual([[null]]);
  });

  it("throws when width or height is not a positive integer", () => {
    expect(() => createEmptyProgressGrid(0, 2)).toThrow();
    expect(() => createEmptyProgressGrid(2, -1)).toThrow();
  });
});

describe("isPuzzleSolved", () => {
  it("returns true when every cell exactly matches the solution", () => {
    const progress = {
      cells: [
        [0, null],
        [null, 1],
      ],
    };

    expect(isPuzzleSolved(fixturePuzzle(), progress)).toBe(true);
  });

  it("returns false when a solution-filled cell is left empty", () => {
    const progress = {
      cells: [
        [null, null],
        [null, 1],
      ],
    };

    expect(isPuzzleSolved(fixturePuzzle(), progress)).toBe(false);
  });

  it("returns false when a solution-filled cell has the wrong color", () => {
    const progress = {
      cells: [
        [1, null],
        [null, 1],
      ],
    };

    expect(isPuzzleSolved(fixturePuzzle(), progress)).toBe(false);
  });

  it("returns false when a solution-empty cell was incorrectly filled", () => {
    const progress = {
      cells: [
        [0, 0],
        [null, 1],
      ],
    };

    expect(isPuzzleSolved(fixturePuzzle(), progress)).toBe(false);
  });

  it("ignores marks: a marked solution-empty cell still solves, a marked solution-filled cell still does not", () => {
    const solvedWithMark = {
      cells: [
        [0, "marked"],
        [null, 1],
      ] as const,
    };
    expect(isPuzzleSolved(fixturePuzzle(), solvedWithMark)).toBe(true);

    const markedInsteadOfFilled = {
      cells: [
        ["marked", null],
        [null, 1],
      ] as const,
    };
    expect(isPuzzleSolved(fixturePuzzle(), markedInsteadOfFilled)).toBe(false);
  });

  it("throws when the progress grid dimensions don't match the puzzle", () => {
    const progress = { cells: [[0, null]] };

    expect(() => isPuzzleSolved(fixturePuzzle(), progress)).toThrow();
  });
});
