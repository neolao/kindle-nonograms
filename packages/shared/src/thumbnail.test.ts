import { describe, expect, it } from "vitest";
import { buildThumbnail } from "./thumbnail.js";

describe("buildThumbnail", () => {
  it("returns the grid unchanged when it is already within the size cap", () => {
    const cells: (number | null)[][] = [
      [0, null, 0],
      [null, 0, null],
    ];

    expect(buildThumbnail(cells, 8)).toEqual([
      [0, null, 0],
      [null, 0, null],
    ]);
  });

  it("downsamples a square grid larger than the cap by nearest-neighbor sampling", () => {
    // 8x8 grid, capped to 4x4: every output cell samples the source cell
    // at (row*2, col*2) — hand-picked so each sampled corner has a
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

    expect(buildThumbnail(cells, 4)).toEqual([
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [2, 2, 2, 2],
      [3, 3, 3, 3],
    ]);
  });

  it("scales both dimensions by the same factor, preserving a non-square grid's proportions", () => {
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

    expect(buildThumbnail(cells, 4)).toEqual([
      [0, 1, 2, 3],
      [4, 5, 6, 7],
    ]);
  });

  it("returns a 1x1 grid for the smallest possible grid without throwing", () => {
    expect(buildThumbnail([[0]], 8)).toEqual([[0]]);
  });

  it("does not mutate the given cells array", () => {
    const cells: (number | null)[][] = [
      [0, null],
      [null, 0],
    ];

    buildThumbnail(cells, 1);

    expect(cells).toEqual([
      [0, null],
      [null, 0],
    ]);
  });
});
