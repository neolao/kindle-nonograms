import { describe, expect, it } from "vitest";
import { createPuzzle } from "./puzzle.js";

function validInput() {
  return {
    id: "cat",
    name: "Cat",
    width: 2,
    height: 2,
    palette: ["#000000"],
    cells: [
      [0, null],
      [null, 0],
    ],
  };
}

describe("createPuzzle", () => {
  it("builds a puzzle from valid input", () => {
    const puzzle = createPuzzle(validInput());

    expect(puzzle).toEqual(validInput());
  });

  it("throws when width is not a positive integer", () => {
    expect(() => createPuzzle({ ...validInput(), width: 0 })).toThrow();
    expect(() => createPuzzle({ ...validInput(), width: 1.5 })).toThrow();
  });

  it("throws when height is not a positive integer", () => {
    expect(() => createPuzzle({ ...validInput(), height: -1 })).toThrow();
  });

  it("throws when cells does not have `height` rows", () => {
    expect(() =>
      createPuzzle({ ...validInput(), cells: [[0, null]] }),
    ).toThrow();
  });

  it("throws when a row does not have `width` columns", () => {
    expect(() =>
      createPuzzle({
        ...validInput(),
        cells: [
          [0, null, null],
          [null, 0],
        ],
      }),
    ).toThrow();
  });

  it("throws when palette is empty", () => {
    expect(() => createPuzzle({ ...validInput(), palette: [] })).toThrow();
  });

  it("throws when a cell references a color index out of palette range", () => {
    expect(() =>
      createPuzzle({
        ...validInput(),
        cells: [
          [1, null],
          [null, 0],
        ],
      }),
    ).toThrow();
  });

  it("throws when id is empty", () => {
    expect(() => createPuzzle({ ...validInput(), id: "" })).toThrow();
  });

  it("throws when name is empty", () => {
    expect(() => createPuzzle({ ...validInput(), name: "" })).toThrow();
  });

  it("accepts a multi-color palette with valid color indexes", () => {
    const puzzle = createPuzzle({
      id: "flag",
      name: "Flag",
      width: 2,
      height: 1,
      palette: ["#ff0000", "#0000ff"],
      cells: [[0, 1]],
    });

    expect(puzzle.cells).toEqual([[0, 1]]);
  });
});
