import { describe, expect, it } from "vitest";
import { PuzzleValidationError } from "./puzzle.js";
import {
  isNativePuzzleShape,
  parsePuzzleSource,
} from "./puzzleSourceParsing.js";

describe("isNativePuzzleShape", () => {
  it("recognizes the native shape by its palette field", () => {
    expect(
      isNativePuzzleShape({
        id: "x",
        name: "X",
        width: 1,
        height: 1,
        palette: ["#000000"],
        cells: [[0]],
      }),
    ).toBe(true);
  });

  it("treats a value with no palette as the reMarkable export shape", () => {
    expect(isNativePuzzleShape({ width: 1, height: 1, cells: [[true]] })).toBe(
      false,
    );
  });

  it("treats a non-object value as not native, rather than throwing", () => {
    expect(isNativePuzzleShape(null)).toBe(false);
    expect(isNativePuzzleShape("not an object")).toBe(false);
    expect(isNativePuzzleShape(42)).toBe(false);
  });
});

describe("parsePuzzleSource", () => {
  it("parses a native-shape value into a Puzzle, using the given id over any id in the content", () => {
    const puzzle = parsePuzzleSource(
      {
        id: "ignored-content-id",
        name: "Cat",
        width: 2,
        height: 1,
        palette: ["#000000"],
        cells: [[0, null]],
      },
      "cat",
    );

    expect(puzzle).toEqual({
      id: "cat",
      name: "Cat",
      width: 2,
      height: 1,
      palette: ["#000000"],
      cells: [[0, null]],
    });
  });

  it("parses a reMarkable boolean-grid export into a single-color Puzzle", () => {
    const puzzle = parsePuzzleSource(
      { width: 2, height: 1, cells: [[true, false]] },
      "dog",
    );

    expect(puzzle).toEqual({
      id: "dog",
      name: "dog",
      width: 2,
      height: 1,
      palette: ["#000000"],
      cells: [[0, null]],
    });
  });

  it("throws PuzzleValidationError for a native-shape value that fails structural validation", () => {
    expect(() =>
      parsePuzzleSource(
        {
          id: "ignored",
          name: "Broken",
          width: 2,
          height: 1,
          palette: ["#000000"],
          cells: [[0]], // only 1 column, width says 2
        },
        "broken",
      ),
    ).toThrow(PuzzleValidationError);
  });

  it("throws rather than silently accepting a value that is neither shape (e.g. a bare array)", () => {
    expect(() => parsePuzzleSource([1, 2, 3], "garbage")).toThrow();
  });
});
