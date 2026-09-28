import { describe, expect, it } from "vitest";
import {
  fromBooleanGridExport,
  fromPixelArtSerialization,
} from "./adapters.js";
import { PuzzleValidationError } from "./puzzle.js";

describe("fromBooleanGridExport", () => {
  it("maps true/false cells to color index 0/null and preserves dimensions", () => {
    const puzzle = fromBooleanGridExport("cat", {
      name: "Cat",
      width: 2,
      height: 2,
      cells: [
        [true, false],
        [false, true],
      ],
    });

    expect(puzzle).toEqual({
      id: "cat",
      name: "Cat",
      width: 2,
      height: 2,
      palette: ["#000000"],
      cells: [
        [0, null],
        [null, 0],
      ],
    });
  });

  it("falls back to the given id as the name when name is missing", () => {
    const puzzle = fromBooleanGridExport("unnamed-grid", {
      width: 1,
      height: 1,
      cells: [[true]],
    });

    expect(puzzle.name).toBe("unnamed-grid");
  });

  it("falls back to the given id as the name when name is blank", () => {
    const puzzle = fromBooleanGridExport("blank-name-grid", {
      name: "   ",
      width: 1,
      height: 1,
      cells: [[false]],
    });

    expect(puzzle.name).toBe("blank-name-grid");
  });

  it("throws when cells does not have `height` rows, same as createPuzzle", () => {
    expect(() =>
      fromBooleanGridExport("bad-rows", {
        name: "Bad",
        width: 2,
        height: 2,
        cells: [[true, false]],
      }),
    ).toThrow();
  });

  it("throws when a row does not have `width` columns, same as createPuzzle", () => {
    expect(() =>
      fromBooleanGridExport("bad-columns", {
        name: "Bad",
        width: 2,
        height: 1,
        cells: [[true, false, true]],
      }),
    ).toThrow();
  });

  it("throws when the given id is empty, same as createPuzzle", () => {
    expect(() =>
      fromBooleanGridExport("", {
        name: "Bad",
        width: 1,
        height: 1,
        cells: [[true]],
      }),
    ).toThrow();
  });

  it("round-trips a small fixture grid into the expected Puzzle", () => {
    const puzzle = fromBooleanGridExport("smiley", {
      name: "Smiley",
      width: 3,
      height: 1,
      cells: [[true, false, true]],
    });

    expect(puzzle).toEqual({
      id: "smiley",
      name: "Smiley",
      width: 3,
      height: 1,
      palette: ["#000000"],
      cells: [[0, null, 0]],
    });
  });
});

describe("fromPixelArtSerialization", () => {
  it("maps the reserved entry to empty cells, other colors to a palette in the file's own order, and 8-digit hex to 6-digit", () => {
    const puzzle = fromPixelArtSerialization("bird", {
      formatVersion: 1,
      gridWidth: 3,
      gridHeight: 2,
      palette: [
        { index: 0, color: "#00000000", reserved: true },
        { index: 5, color: "#ff0000ff", reserved: false },
        { index: 9, color: "#0000ffff", reserved: false },
      ],
      pixels: [0, 5, 9, 9, 0, 5],
    });

    expect(puzzle).toEqual({
      id: "bird",
      name: "bird",
      width: 3,
      height: 2,
      palette: ["#ff0000", "#0000ff"],
      cells: [
        [null, 0, 1],
        [1, null, 0],
      ],
    });
  });

  it("excludes the reserved entry from the palette even when no pixel uses it", () => {
    const puzzle = fromPixelArtSerialization("solid", {
      formatVersion: 1,
      gridWidth: 2,
      gridHeight: 1,
      palette: [
        { index: 0, color: "#00000000", reserved: true },
        { index: 3, color: "#123456ff", reserved: false },
      ],
      pixels: [3, 3],
    });

    expect(puzzle.palette).toEqual(["#123456"]);
    expect(puzzle.cells).toEqual([[0, 0]]);
  });

  it("maps pixels by the palette entries' own `index`, not their array position, since indices need not be contiguous", () => {
    const puzzle = fromPixelArtSerialization("sparse", {
      formatVersion: 1,
      gridWidth: 2,
      gridHeight: 1,
      palette: [
        { index: 0, color: "#00000000", reserved: true },
        { index: 7, color: "#abcdefff", reserved: false },
        { index: 2, color: "#111111ff", reserved: false },
      ],
      pixels: [7, 2],
    });

    expect(puzzle.palette).toEqual(["#abcdef", "#111111"]);
    expect(puzzle.cells).toEqual([[0, 1]]);
  });

  it("throws when a pixel references a palette index the file does not declare", () => {
    expect(() =>
      fromPixelArtSerialization("broken", {
        formatVersion: 1,
        gridWidth: 2,
        gridHeight: 1,
        palette: [
          { index: 0, color: "#00000000", reserved: true },
          { index: 1, color: "#ff0000ff", reserved: false },
        ],
        pixels: [1, 9],
      }),
    ).toThrow();
  });

  it("throws when `pixels` has fewer entries than `gridWidth * gridHeight`", () => {
    expect(() =>
      fromPixelArtSerialization("short", {
        formatVersion: 1,
        gridWidth: 2,
        gridHeight: 1,
        palette: [
          { index: 0, color: "#00000000", reserved: true },
          { index: 1, color: "#ff0000ff", reserved: false },
        ],
        pixels: [1],
      }),
    ).toThrow();
  });

  it("throws PuzzleValidationError when every palette entry is reserved, same emptyPalette rejection as createPuzzle", () => {
    expect(() =>
      fromPixelArtSerialization("all-transparent", {
        formatVersion: 1,
        gridWidth: 1,
        gridHeight: 1,
        palette: [{ index: 0, color: "#00000000", reserved: true }],
        pixels: [0],
      }),
    ).toThrow(PuzzleValidationError);
  });
});
