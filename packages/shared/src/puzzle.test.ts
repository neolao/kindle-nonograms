import { describe, expect, it } from "vitest";
import {
  PuzzleValidationError,
  type PuzzleValidationReason,
  createPuzzle,
} from "./puzzle.js";

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

/** Runs `fn` and returns whatever it throws, instead of throwing itself —
 * lets a test inspect the thrown error's own fields (`reason`, `message`)
 * rather than only asserting that *something* was thrown. */
function captureError(fn: () => unknown): unknown {
  try {
    fn();
    return undefined;
  } catch (error) {
    return error;
  }
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

  it.each([
    [{ id: "" }, "emptyId"],
    [{ name: "" }, "emptyName"],
    [{ width: 0 }, "invalidDimensions"],
    [{ height: -1 }, "invalidDimensions"],
    [{ palette: [] }, "emptyPalette"],
    [{ cells: [[0, null]] }, "rowCountMismatch"],
    [
      {
        cells: [
          [0, null, null],
          [null, 0],
        ],
      },
      "columnCountMismatch",
    ],
    [
      {
        cells: [
          [1, null],
          [null, 0],
        ],
      },
      "colorIndexOutOfRange",
    ],
  ] as [Partial<ReturnType<typeof validInput>>, PuzzleValidationReason][])(
    "tags a %o failure with reason %s",
    (overrides, reason) => {
      const error = captureError(() =>
        createPuzzle({ ...validInput(), ...overrides }),
      );

      expect(error).toBeInstanceOf(PuzzleValidationError);
      expect((error as PuzzleValidationError).reason).toBe(reason);
    },
  );

  it("keeps the exact developer-facing message discoverPuzzles.ts's build-time diagnostics depend on", () => {
    const error = captureError(() =>
      createPuzzle({ ...validInput(), palette: [] }),
    );

    expect((error as Error).message).toBe(
      "Puzzle palette must contain at least one color",
    );
  });

  it("names the empty id error after the field's actual label, Filename (id), not Puzzle id", () => {
    const error = captureError(() => createPuzzle({ ...validInput(), id: "" }));

    expect((error as Error).message).toBe("Filename (id) must not be empty");
  });
});
