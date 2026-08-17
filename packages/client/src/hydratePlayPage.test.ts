// @vitest-environment jsdom
import type { Puzzle, PuzzleProgress } from "@kindle-nonograms/shared";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { hydrate } from "./hydratePlayPage.js";
import { loadProgress, saveProgress } from "./progressStorage.js";

const soloPuzzle: Puzzle = {
  id: "solo",
  name: "Solo",
  width: 2,
  height: 1,
  palette: ["#000000"],
  cells: [[0, null]],
};

const duoPuzzle: Puzzle = {
  id: "duo",
  name: "Duo",
  width: 2,
  height: 1,
  palette: ["#ff0000", "#0000ff"],
  cells: [[0, 1]],
};

function buildFixture(puzzle: Puzzle): void {
  const rows = Array.from({ length: puzzle.height }, (_, y) => {
    const cells = Array.from(
      { length: puzzle.width },
      (_, x) => `<td data-row="${y}" data-col="${x}"></td>`,
    ).join("");
    return `<tr><th scope="row">clue</th>${cells}</tr>`;
  }).join("");

  document.body.innerHTML = `<h1>${puzzle.name}</h1><div class="grid-wrapper"><table><tbody>${rows}</tbody></table></div><script type="application/json" id="puzzle-data">${JSON.stringify(puzzle)}</script>`;
}

function cell(y: number, x: number): HTMLTableCellElement {
  const found = document.querySelector<HTMLTableCellElement>(
    `td[data-row="${y}"][data-col="${x}"]`,
  );
  if (!found) {
    throw new Error(`fixture cell ${y},${x} not found`);
  }
  return found;
}

function banner(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-role="win-banner"]');
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("hydrate", () => {
  it("fills a cell with the active color glyph on tap and clears it back to empty on a second tap", () => {
    buildFixture(soloPuzzle);
    hydrate();

    cell(0, 0).click();
    expect(cell(0, 0).textContent).toBe("●");
    expect(cell(0, 0).style.color).toBe("rgb(0, 0, 0)");

    cell(0, 0).click();
    expect(cell(0, 0).textContent).toBe("");
    expect(cell(0, 0).style.color).toBe("");
  });

  it("marks a cell as crossed in Cross mode and clears it back on a second tap", () => {
    buildFixture(soloPuzzle);
    hydrate();

    document
      .querySelector<HTMLButtonElement>('[data-role="mode-cross"]')
      ?.click();
    cell(0, 1).click();
    expect(cell(0, 1).textContent).toBe("✖");

    cell(0, 1).click();
    expect(cell(0, 1).textContent).toBe("");
  });

  it("updates only the tapped cell, leaving every other cell node and its content untouched", () => {
    saveProgress("duo", { cells: [[null, "marked"]] });
    buildFixture(duoPuzzle);
    hydrate();

    const untouched = cell(0, 1);
    expect(untouched.textContent).toBe("✖");

    cell(0, 0).click();

    expect(cell(0, 1)).toBe(untouched);
    expect(untouched.textContent).toBe("✖");
  });

  it("paints previously saved progress onto the grid before any tap happens", () => {
    saveProgress("solo", { cells: [[0, "marked"]] });
    buildFixture(soloPuzzle);

    hydrate();

    expect(cell(0, 0).textContent).toBe("●");
    expect(cell(0, 1).textContent).toBe("✖");
  });

  it("shows the win banner once the puzzle becomes fully and correctly solved, and saves the matching progress shape", () => {
    buildFixture(soloPuzzle);
    hydrate();

    expect(banner()?.hidden).toBe(true);

    cell(0, 0).click();

    expect(banner()?.hidden).toBe(false);
    expect(loadProgress("solo")).toEqual({
      cells: [[0, null]],
    } satisfies PuzzleProgress);
  });

  it("hides the win banner again once a tap makes the puzzle no longer solved", () => {
    buildFixture(soloPuzzle);
    hydrate();

    cell(0, 0).click();
    expect(banner()?.hidden).toBe(false);

    cell(0, 0).click();
    expect(banner()?.hidden).toBe(true);
  });

  it("shows the win banner immediately on load when the saved progress is already a full solve", () => {
    saveProgress("solo", { cells: [[0, null]] });
    buildFixture(soloPuzzle);

    hydrate();

    expect(banner()?.hidden).toBe(false);
  });

  it("paints a tapped cell with the color selected via its swatch, not a stale previous selection", () => {
    buildFixture(duoPuzzle);
    hydrate();

    document
      .querySelector<HTMLButtonElement>(
        '[data-role="swatch"][data-color-index="1"]',
      )
      ?.click();
    cell(0, 0).click();

    expect(cell(0, 0).style.color).toBe("rgb(0, 0, 255)");
  });

  it("does not render color swatches for a single-color puzzle", () => {
    buildFixture(soloPuzzle);
    hydrate();

    expect(document.querySelectorAll('[data-role="swatch"]')).toHaveLength(0);
  });

  it("does nothing and does not throw when the embedded puzzle JSON is missing", () => {
    document.body.innerHTML =
      '<table><tbody><tr><td data-row="0" data-col="0"></td></tr></tbody></table>';

    expect(() => hydrate()).not.toThrow();
    expect(banner()).toBeNull();
  });

  it("does nothing and does not throw when the embedded puzzle JSON is malformed", () => {
    document.body.innerHTML =
      '<table></table><script type="application/json" id="puzzle-data">not json{</script>';

    expect(() => hydrate()).not.toThrow();
    expect(banner()).toBeNull();
  });

  it("falls back to a blank grid instead of throwing when saved progress has the wrong shape for the puzzle", () => {
    saveProgress("solo", { cells: [[0, 0, 0]] });
    buildFixture(soloPuzzle);

    expect(() => hydrate()).not.toThrow();
    expect(cell(0, 0).textContent).toBe("");
  });

  it("ignores a tap on a non-cell element inside the table without throwing or saving progress", () => {
    buildFixture(soloPuzzle);
    hydrate();

    const header = document.querySelector("th");
    expect(() => header?.click()).not.toThrow();
    expect(loadProgress("solo")).toBeUndefined();
  });
});
