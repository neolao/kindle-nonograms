import { describe, expect, it } from "vitest";
import { isMultiColorPuzzle, puzzleSizeBucket } from "./libraryFilters.js";
import type { Puzzle } from "./puzzle.js";

function puzzleOfSize(width: number, height: number): Puzzle {
  return {
    id: "fixture",
    name: "Fixture",
    width,
    height,
    palette: ["#000000"],
    cells: Array.from({ length: height }, () => Array(width).fill(null)),
  };
}

function puzzleWithPalette(palette: string[]): Puzzle {
  return {
    id: "fixture",
    name: "Fixture",
    width: 1,
    height: 1,
    palette,
    cells: [[null]],
  };
}

describe("puzzleSizeBucket", () => {
  it("buckets a small puzzle (e.g. 4x4) as 'small'", () => {
    expect(puzzleSizeBucket(puzzleOfSize(4, 4))).toBe("small");
  });

  it("buckets a puzzle right at the small/medium boundary (100 cells) as 'small'", () => {
    expect(puzzleSizeBucket(puzzleOfSize(10, 10))).toBe("small");
  });

  it("buckets a puzzle just past the small boundary (101 cells) as 'medium'", () => {
    expect(puzzleSizeBucket(puzzleOfSize(101, 1))).toBe("medium");
  });

  it("buckets a puzzle right at the medium/large boundary (400 cells) as 'medium'", () => {
    expect(puzzleSizeBucket(puzzleOfSize(20, 20))).toBe("medium");
  });

  it("buckets a puzzle just past the medium boundary (401 cells) as 'large'", () => {
    expect(puzzleSizeBucket(puzzleOfSize(401, 1))).toBe("large");
  });

  it("buckets a very large puzzle (e.g. 45x45) as 'large'", () => {
    expect(puzzleSizeBucket(puzzleOfSize(45, 45))).toBe("large");
  });

  it("buckets the smallest possible puzzle (1x1) as 'small'", () => {
    expect(puzzleSizeBucket(puzzleOfSize(1, 1))).toBe("small");
  });
});

describe("isMultiColorPuzzle", () => {
  it("returns false for a monochrome puzzle (single palette color)", () => {
    expect(isMultiColorPuzzle(puzzleWithPalette(["#000000"]))).toBe(false);
  });

  it("returns true for a multi-color puzzle (two palette colors)", () => {
    expect(isMultiColorPuzzle(puzzleWithPalette(["#000000", "#ff0000"]))).toBe(
      true,
    );
  });

  it("returns true for a puzzle with many palette colors", () => {
    expect(
      isMultiColorPuzzle(
        puzzleWithPalette(["#000000", "#ff0000", "#00ff00", "#0000ff"]),
      ),
    ).toBe(true);
  });
});
