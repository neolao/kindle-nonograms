import { describe, expect, it } from "vitest";
import { computeLineClues, computePuzzleClues } from "./clues.js";
import type { Puzzle } from "./puzzle.js";

describe("computeLineClues", () => {
  it("returns a single zero-length run for an empty line", () => {
    expect(computeLineClues([null, null, null])).toEqual([
      { length: 0, colorIndex: null },
    ]);
  });

  it("matches the classic number[] clue shape for a single-color palette", () => {
    const line = [0, 0, null, 0, null, null, 0, 0, 0];

    expect(computeLineClues(line).map((run) => run.length)).toEqual([2, 1, 3]);
  });

  it("breaks same-color runs only when separated by an empty gap", () => {
    const line = [0, 0, null, 0];

    expect(computeLineClues(line)).toEqual([
      { length: 2, colorIndex: 0 },
      { length: 1, colorIndex: 0 },
    ]);
  });

  it("breaks the run on a direct color change even without an empty gap", () => {
    const line = [0, 0, 1, 1, 1];

    expect(computeLineClues(line)).toEqual([
      { length: 2, colorIndex: 0 },
      { length: 3, colorIndex: 1 },
    ]);
  });

  it("returns one run for a fully-filled single-color line", () => {
    expect(computeLineClues([0, 0, 0])).toEqual([{ length: 3, colorIndex: 0 }]);
  });
});

describe("computePuzzleClues", () => {
  it("derives correct row and column clues for a small fixture puzzle", () => {
    const puzzle: Puzzle = {
      id: "fixture",
      name: "Fixture",
      width: 3,
      height: 2,
      palette: ["#ff0000", "#0000ff"],
      cells: [
        [0, null, 1],
        [0, 0, 1],
      ],
    };

    const clues = computePuzzleClues(puzzle);

    expect(clues.rows).toEqual([
      [
        { length: 1, colorIndex: 0 },
        { length: 1, colorIndex: 1 },
      ],
      [
        { length: 2, colorIndex: 0 },
        { length: 1, colorIndex: 1 },
      ],
    ]);

    expect(clues.columns).toEqual([
      [{ length: 2, colorIndex: 0 }],
      [{ length: 1, colorIndex: 0 }],
      [{ length: 2, colorIndex: 1 }],
    ]);
  });
});
