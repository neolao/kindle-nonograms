import { describe, expect, it } from "vitest";
import { PuzzleValidationError } from "./puzzle.js";
import {
  isNativePuzzleShape,
  isPixelArtSerializationShape,
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

  it("parses a pixel-art-serializer export into a Puzzle, using the given id as the name (the format carries no name field)", () => {
    const puzzle = parsePuzzleSource(
      {
        formatVersion: 1,
        gridWidth: 2,
        gridHeight: 1,
        palette: [
          { index: 0, color: "#00000000", reserved: true },
          { index: 1, color: "#ff0000ff", reserved: false },
        ],
        pixels: [0, 1],
      },
      "parrot",
    );

    expect(puzzle).toEqual({
      id: "parrot",
      name: "parrot",
      width: 2,
      height: 1,
      palette: ["#ff0000"],
      cells: [[null, 0]],
    });
  });

  it("does not misroute a pixel-art-serializer export into the native parser just because both shapes have a `palette` array", () => {
    // A native Puzzle's `palette` is `string[]`; this format's `palette` is
    // an array of `{index, color, reserved}` objects and has no `cells` at
    // all — routing this to the native parser would fail on a missing
    // `cells` field instead of producing the correct pixel-art conversion.
    const puzzle = parsePuzzleSource(
      {
        formatVersion: 1,
        gridWidth: 1,
        gridHeight: 1,
        palette: [{ index: 4, color: "#123456ff", reserved: false }],
        pixels: [4],
      },
      "solid-pixel",
    );

    expect(puzzle.width).toBe(1);
    expect(puzzle.height).toBe(1);
    expect(puzzle.palette).toEqual(["#123456"]);
  });
});

describe("isPixelArtSerializationShape", () => {
  it("recognizes the shape by its `pixels` field alongside `gridWidth`/`gridHeight`", () => {
    expect(
      isPixelArtSerializationShape({
        formatVersion: 1,
        gridWidth: 1,
        gridHeight: 1,
        palette: [{ index: 0, color: "#00000000", reserved: true }],
        pixels: [0],
      }),
    ).toBe(true);
  });

  it("rejects the native shape (has `cells`, no `pixels`)", () => {
    expect(
      isPixelArtSerializationShape({
        id: "x",
        name: "X",
        width: 1,
        height: 1,
        palette: ["#000000"],
        cells: [[0]],
      }),
    ).toBe(false);
  });

  it("rejects the reMarkable boolean-grid export (no `palette`, no `pixels`)", () => {
    expect(
      isPixelArtSerializationShape({ width: 1, height: 1, cells: [[true]] }),
    ).toBe(false);
  });

  it("treats a non-object value as not this shape, rather than throwing", () => {
    expect(isPixelArtSerializationShape(null)).toBe(false);
    expect(isPixelArtSerializationShape("not an object")).toBe(false);
    expect(isPixelArtSerializationShape(42)).toBe(false);
  });
});
