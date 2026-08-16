import { describe, expect, it } from "vitest";
import { fromBooleanGridExport } from "./adapters.js";

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
