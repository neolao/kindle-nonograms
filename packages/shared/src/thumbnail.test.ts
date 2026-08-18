import { describe, expect, it } from "vitest";
import type { Puzzle } from "./puzzle.js";
import { buildThumbnail } from "./thumbnail.js";

function puzzleWithCells(cells: (number | null)[][]): Puzzle {
  return {
    id: "fixture",
    name: "Fixture",
    width: cells[0].length,
    height: cells.length,
    palette: ["#000000"],
    cells,
  };
}

describe("buildThumbnail", () => {
  it("returns the solution unchanged when it is already within the size cap", () => {
    const puzzle = puzzleWithCells([
      [0, null, 0],
      [null, 0, null],
    ]);

    expect(buildThumbnail(puzzle, 8)).toEqual([
      [0, null, 0],
      [null, 0, null],
    ]);
  });

  it("downsamples a square solution larger than the cap by nearest-neighbor sampling", () => {
    // 8x8 solution, capped to 4x4: every output cell samples the source
    // cell at (row*2, col*2) — hand-picked so each sampled corner has a
    // distinct, independently-verifiable value.
    const row0 = [0, 9, 0, 9, 0, 9, 0, 9];
    const row2 = [1, 9, 1, 9, 1, 9, 1, 9];
    const row4 = [2, 9, 2, 9, 2, 9, 2, 9];
    const row6 = [3, 9, 3, 9, 3, 9, 3, 9];
    const filler: (number | null)[] = new Array(8).fill(null);
    const cells: (number | null)[][] = [
      row0,
      filler,
      row2,
      filler,
      row4,
      filler,
      row6,
      filler,
    ];
    const puzzle: Puzzle = {
      id: "big",
      name: "Big",
      width: 8,
      height: 8,
      palette: new Array(10).fill("#000000"),
      cells,
    };

    expect(buildThumbnail(puzzle, 4)).toEqual([
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [2, 2, 2, 2],
      [3, 3, 3, 3],
    ]);
  });

  it("scales both dimensions by the same factor, preserving a non-square solution's proportions", () => {
    // 12 wide x 4 tall, capped at 4 on the longer (width) axis: a single
    // scale of 3 applies to both axes, giving a 4x2 thumbnail — not a
    // distorted 4x4 square.
    const filler = 9;
    const cells: (number | null)[][] = [
      [
        0,
        filler,
        filler,
        1,
        filler,
        filler,
        2,
        filler,
        filler,
        3,
        filler,
        filler,
      ],
      new Array(12).fill(filler),
      new Array(12).fill(filler),
      [
        4,
        filler,
        filler,
        5,
        filler,
        filler,
        6,
        filler,
        filler,
        7,
        filler,
        filler,
      ],
    ];

    const puzzle: Puzzle = {
      id: "wide",
      name: "Wide",
      width: 12,
      height: 4,
      palette: new Array(8).fill("#000000"),
      cells,
    };

    expect(buildThumbnail(puzzle, 4)).toEqual([
      [0, 1, 2, 3],
      [4, 5, 6, 7],
    ]);
  });

  it("returns a 1x1 grid for the smallest possible puzzle without throwing", () => {
    const puzzle = puzzleWithCells([[0]]);

    expect(buildThumbnail(puzzle, 8)).toEqual([[0]]);
  });

  it("does not mutate the puzzle's own cells array", () => {
    const cells: (number | null)[][] = [
      [0, null],
      [null, 0],
    ];
    const puzzle = puzzleWithCells(cells);

    buildThumbnail(puzzle, 1);

    expect(puzzle.cells).toEqual([
      [0, null],
      [null, 0],
    ]);
  });
});
