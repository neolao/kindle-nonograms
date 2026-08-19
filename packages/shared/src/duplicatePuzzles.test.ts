import { describe, expect, it } from "vitest";
import { findDuplicatePuzzle } from "./duplicatePuzzles.js";
import type { Puzzle } from "./puzzle.js";

function puzzle(overrides: Partial<Puzzle>): Puzzle {
  return {
    id: "a",
    name: "A",
    width: 2,
    height: 2,
    palette: ["#000000"],
    cells: [
      [0, null],
      [null, 0],
    ],
    ...overrides,
  };
}

describe("findDuplicatePuzzle", () => {
  it("returns the matching puzzle when a submission has the same dimensions and cell content", () => {
    const existing = puzzle({ id: "existing", name: "Existing" });
    const submission = puzzle({ id: "submission", name: "Different name" });

    expect(findDuplicatePuzzle(submission, [existing])).toBe(existing);
  });

  it("returns the duplicate even when the palettes differ, since only dimensions and cells count", () => {
    const existing = puzzle({ id: "existing", palette: ["#ffffff"] });
    const submission = puzzle({ id: "submission", palette: ["#000000"] });

    expect(findDuplicatePuzzle(submission, [existing])).toBe(existing);
  });

  it("returns undefined when no puzzle in the list has matching cell content", () => {
    const existing = puzzle({
      id: "existing",
      cells: [
        [0, 0],
        [0, 0],
      ],
    });
    const submission = puzzle({ id: "submission" });

    expect(findDuplicatePuzzle(submission, [existing])).toBeUndefined();
  });

  it("returns undefined when dimensions differ even if the smaller grid's cells overlap", () => {
    const existing = puzzle({
      id: "existing",
      width: 3,
      height: 2,
      cells: [
        [0, null, null],
        [null, 0, null],
      ],
    });
    const submission = puzzle({ id: "submission" });

    expect(findDuplicatePuzzle(submission, [existing])).toBeUndefined();
  });

  it("returns undefined for an empty existing list", () => {
    const submission = puzzle({ id: "submission" });

    expect(findDuplicatePuzzle(submission, [])).toBeUndefined();
  });

  it("finds a matching puzzle anywhere in the list, not just the first entry", () => {
    const unrelated = puzzle({
      id: "unrelated",
      cells: [
        [0, 0],
        [0, 0],
      ],
    });
    const existing = puzzle({ id: "existing" });
    const submission = puzzle({ id: "submission" });

    expect(findDuplicatePuzzle(submission, [unrelated, existing])).toBe(
      existing,
    );
  });
});
