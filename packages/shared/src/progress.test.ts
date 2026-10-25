import { describe, expect, it } from "vitest";
import {
  correctWrongCells,
  createEmptyProgressGrid,
  isProgressShape,
  isPuzzleSolved,
  isValidPuzzleId,
} from "./progress.js";
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

describe("correctWrongCells", () => {
  it("clears a solution-filled cell that was filled with the wrong color, leaving the rest untouched", () => {
    const progress = {
      cells: [
        [1, null],
        [null, 1],
      ],
    };

    const result = correctWrongCells(fixturePuzzle(), progress);

    expect(result.changed).toBe(true);
    expect(result.cells).toEqual([
      [null, null],
      [null, 1],
    ]);
  });

  it("clears a solution-empty cell that was incorrectly filled", () => {
    const progress = {
      cells: [
        [0, 0],
        [null, 1],
      ],
    };

    const result = correctWrongCells(fixturePuzzle(), progress);

    expect(result.changed).toBe(true);
    expect(result.cells).toEqual([
      [0, null],
      [null, 1],
    ]);
  });

  it("clears a mark left on a cell the solution actually requires filled", () => {
    const progress = {
      cells: [
        ["marked", null],
        [null, 1],
      ] as const,
    };

    const result = correctWrongCells(fixturePuzzle(), progress);

    expect(result.changed).toBe(true);
    expect(result.cells).toEqual([
      [null, null],
      [null, 1],
    ]);
  });

  it("leaves a correct mark on a solution-empty cell untouched", () => {
    const progress = {
      cells: [
        [0, "marked"],
        [null, 1],
      ] as const,
    };

    const result = correctWrongCells(fixturePuzzle(), progress);

    expect(result.changed).toBe(false);
    expect(result.cells).toEqual([
      [0, "marked"],
      [null, 1],
    ]);
  });

  it("reports no change and returns an equivalent grid when every cell is already correct", () => {
    const progress = {
      cells: [
        [0, null],
        [null, 1],
      ],
    };

    const result = correctWrongCells(fixturePuzzle(), progress);

    expect(result.changed).toBe(false);
    expect(result.cells).toEqual([
      [0, null],
      [null, 1],
    ]);
  });

  it("leaves an untouched cell null and reports no change, even where the solution requires a fill", () => {
    // A cell the player hasn't attempted is not a mistake to correct — only
    // an actual wrong mark (a fill or a cross) counts as one.
    const progress = {
      cells: [
        [null, null],
        [null, 1],
      ],
    };

    const result = correctWrongCells(fixturePuzzle(), progress);

    expect(result.changed).toBe(false);
    expect(result.cells).toEqual([
      [null, null],
      [null, 1],
    ]);
  });

  it("does not mutate the input progress object", () => {
    const progress = {
      cells: [
        [1, null],
        [null, 1],
      ],
    };

    correctWrongCells(fixturePuzzle(), progress);

    expect(progress.cells).toEqual([
      [1, null],
      [null, 1],
    ]);
  });

  it("throws when the progress grid dimensions don't match the puzzle", () => {
    const progress = { cells: [[0, null]] };

    expect(() => correctWrongCells(fixturePuzzle(), progress)).toThrow();
  });
});

describe("isProgressShape", () => {
  it("accepts a rectangular grid of colors, marks and untouched cells", () => {
    expect(
      isProgressShape([
        [0, "marked", null],
        [12, null, "marked"],
      ]),
    ).toBe(true);
  });

  it("accepts the largest allowed grid of 100 x 100", () => {
    expect(isProgressShape(createEmptyProgressGrid(100, 100))).toBe(true);
  });

  it("rejects a grid wider or taller than 100", () => {
    expect(isProgressShape(createEmptyProgressGrid(101, 1))).toBe(false);
    expect(isProgressShape(createEmptyProgressGrid(1, 101))).toBe(false);
  });

  it("rejects non-arrays and empty grids", () => {
    expect(isProgressShape(null)).toBe(false);
    expect(isProgressShape("grid")).toBe(false);
    expect(isProgressShape([])).toBe(false);
    expect(isProgressShape([[]])).toBe(false);
  });

  it("rejects a ragged grid", () => {
    expect(isProgressShape([[null, null], [null]])).toBe(false);
  });

  it("rejects a row that is not an array", () => {
    expect(isProgressShape(["ab"])).toBe(false);
    expect(isProgressShape([[null, null], "ab"])).toBe(false);
  });

  it.each([
    -1,
    1.5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    "x",
    true,
    {},
    undefined,
  ])("rejects the invalid cell %s", (cell) => {
    expect(isProgressShape([[cell]])).toBe(false);
  });
});

describe("isValidPuzzleId", () => {
  it.each([
    "flag",
    "my_puzzle-2",
    "12f34657-8f86-4d59-a30b-ea11099dbe95",
    "a".repeat(100),
  ])("accepts %s", (id) => {
    expect(isValidPuzzleId(id)).toBe(true);
  });

  it.each([
    "",
    "a".repeat(101),
    "../x",
    "a/b",
    "A",
    "a b",
    "a.json",
    "é",
    42,
    null,
  ])("rejects %s", (id) => {
    expect(isValidPuzzleId(id)).toBe(false);
  });
});
