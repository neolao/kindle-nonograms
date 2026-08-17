// @vitest-environment jsdom
import type { Puzzle } from "@kindle-nonograms/shared";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { hydrate } from "./hydrateLibraryPage.js";
import { saveProgress } from "./progressStorage.js";

const catPuzzle: Puzzle = {
  id: "cat",
  name: "Cat",
  width: 2,
  height: 1,
  palette: ["#000000"],
  cells: [[0, null]],
};

const dogPuzzle: Puzzle = {
  id: "dog",
  name: "Dog",
  width: 2,
  height: 1,
  palette: ["#000000"],
  cells: [[null, 0]],
};

function buildFixture(puzzles: Puzzle[]): void {
  const items = puzzles
    .map(
      (puzzle) =>
        `<li data-puzzle-id="${puzzle.id}"><a href="puzzles/${puzzle.id}/">${puzzle.name}</a><span class="solved-badge" hidden>Solved</span></li>`,
    )
    .join("");

  document.body.innerHTML = `<h1>Kindle Nonograms</h1><ul>${items}</ul><script type="application/json" id="puzzles-data">${JSON.stringify(puzzles)}</script>`;
}

function badgeFor(puzzleId: string): HTMLElement {
  const found = document.querySelector<HTMLElement>(
    `[data-puzzle-id="${puzzleId}"] .solved-badge`,
  );
  if (!found) {
    throw new Error(`fixture badge for ${puzzleId} not found`);
  }
  return found;
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("hydrate", () => {
  it("reveals the solved badge for a puzzle with stored, fully-correct progress", () => {
    saveProgress("cat", { cells: [[0, null]] });
    buildFixture([catPuzzle, dogPuzzle]);

    hydrate();

    expect(badgeFor("cat").hidden).toBe(false);
    expect(badgeFor("dog").hidden).toBe(true);
  });

  it("does not reveal the badge for a puzzle with incomplete stored progress", () => {
    saveProgress("cat", { cells: [[null, null]] });
    buildFixture([catPuzzle, dogPuzzle]);

    hydrate();

    expect(badgeFor("cat").hidden).toBe(true);
  });

  it("does not reveal the badge for a puzzle with incorrect stored progress", () => {
    saveProgress("dog", { cells: [[0, null]] });
    buildFixture([catPuzzle, dogPuzzle]);

    hydrate();

    expect(badgeFor("dog").hidden).toBe(true);
  });

  it("does not throw and leaves every badge hidden when no puzzle has any stored progress", () => {
    buildFixture([catPuzzle, dogPuzzle]);

    expect(() => hydrate()).not.toThrow();
    expect(badgeFor("cat").hidden).toBe(true);
    expect(badgeFor("dog").hidden).toBe(true);
  });

  it("treats corrupted-shape stored progress as not solved instead of throwing", () => {
    saveProgress("cat", { cells: [[0, null, 0]] });
    buildFixture([catPuzzle, dogPuzzle]);

    expect(() => hydrate()).not.toThrow();
    expect(badgeFor("cat").hidden).toBe(true);
  });

  it("does nothing and does not throw when the embedded puzzles JSON is missing", () => {
    document.body.innerHTML =
      '<ul><li data-puzzle-id="cat"><span class="solved-badge" hidden>Solved</span></li></ul>';

    expect(() => hydrate()).not.toThrow();
    expect(badgeFor("cat").hidden).toBe(true);
  });

  it("does nothing and does not throw when the embedded puzzles JSON is malformed", () => {
    document.body.innerHTML =
      '<ul><li data-puzzle-id="cat"><span class="solved-badge" hidden>Solved</span></li></ul><script type="application/json" id="puzzles-data">not json[</script>';

    expect(() => hydrate()).not.toThrow();
    expect(badgeFor("cat").hidden).toBe(true);
  });
});
