import { describe, expect, it } from "vitest";
import { isMultiColorPuzzle } from "./libraryFilters.js";
import type { Puzzle } from "./puzzle.js";

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
