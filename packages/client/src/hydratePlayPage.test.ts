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

function fillButton(): HTMLButtonElement | null {
  return document.querySelector<HTMLButtonElement>('[data-role="mode-fill"]');
}

function crossButton(): HTMLButtonElement | null {
  return document.querySelector<HTMLButtonElement>('[data-role="mode-cross"]');
}

function switcherSelect(): HTMLSelectElement {
  const found = document.querySelector<HTMLSelectElement>(
    '[data-role="language-switcher-select"]',
  );
  if (!found) {
    throw new Error("fixture language switcher select not found");
  }
  return found;
}

const originalNavigatorLanguage = window.navigator.language;

function setNavigatorLanguage(language: string): void {
  Object.defineProperty(window.navigator, "language", {
    value: language,
    configurable: true,
  });
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  document.body.innerHTML = "";
  document.cookie = "kindle-nonograms-locale=; path=/; max-age=0";
  document.documentElement.lang = "";
  setNavigatorLanguage(originalNavigatorLanguage);
});

describe("hydrate", () => {
  it("fills a cell with a plain solid background matching the active color and no glyph on top, then clears it on a second tap", () => {
    buildFixture(soloPuzzle);
    hydrate();

    cell(0, 0).click();
    expect(cell(0, 0).textContent).toBe("");
    expect(cell(0, 0).style.backgroundColor).toBe("rgb(0, 0, 0)");
    expect(cell(0, 0).style.color).toBe("");

    cell(0, 0).click();
    expect(cell(0, 0).textContent).toBe("");
    expect(cell(0, 0).style.backgroundColor).toBe("");
    expect(cell(0, 0).style.color).toBe("");
  });

  it("clears a filled cell's solid background when it is switched to crossed instead", () => {
    buildFixture(soloPuzzle);
    hydrate();

    cell(0, 0).click();
    expect(cell(0, 0).style.backgroundColor).toBe("rgb(0, 0, 0)");

    document
      .querySelector<HTMLButtonElement>('[data-role="mode-cross"]')
      ?.click();
    cell(0, 0).click();

    expect(cell(0, 0).textContent).toBe("✖");
    expect(cell(0, 0).style.backgroundColor).toBe("");
    expect(cell(0, 0).style.color).toBe("");
  });

  it("leaves no stale glyph, text color, or background when a cell cycles through fill, cross, clear, and refill with a different color", () => {
    buildFixture(duoPuzzle);
    hydrate();

    cell(0, 0).click();
    expect(cell(0, 0).style.backgroundColor).toBe("rgb(255, 0, 0)");

    document
      .querySelector<HTMLButtonElement>('[data-role="mode-cross"]')
      ?.click();
    cell(0, 0).click();
    expect(cell(0, 0).textContent).toBe("✖");
    expect(cell(0, 0).style.backgroundColor).toBe("");
    expect(cell(0, 0).style.color).toBe("");

    cell(0, 0).click();
    expect(cell(0, 0).textContent).toBe("");
    expect(cell(0, 0).style.backgroundColor).toBe("");

    document
      .querySelector<HTMLButtonElement>('[data-role="mode-fill"]')
      ?.click();
    document
      .querySelector<HTMLButtonElement>(
        '[data-role="swatch"][data-color-index="1"]',
      )
      ?.click();
    cell(0, 0).click();
    expect(cell(0, 0).textContent).toBe("");
    expect(cell(0, 0).style.backgroundColor).toBe("rgb(0, 0, 255)");
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

    expect(cell(0, 0).textContent).toBe("");
    expect(cell(0, 0).style.backgroundColor).toBe("rgb(0, 0, 0)");
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

    expect(cell(0, 0).textContent).toBe("");
    expect(cell(0, 0).style.backgroundColor).toBe("rgb(0, 0, 255)");
    expect(cell(0, 0).style.color).toBe("");
  });

  it("does not render color swatches for a single-color puzzle", () => {
    buildFixture(soloPuzzle);
    hydrate();

    expect(document.querySelectorAll('[data-role="swatch"]')).toHaveLength(0);
  });

  it("renders each color swatch as a plain solid-color square, with only a checkmark marking the active one", () => {
    buildFixture(duoPuzzle);
    hydrate();

    const redSwatch = document.querySelector<HTMLButtonElement>(
      '[data-role="swatch"][data-color-index="0"]',
    );
    const blueSwatch = document.querySelector<HTMLButtonElement>(
      '[data-role="swatch"][data-color-index="1"]',
    );

    expect(redSwatch?.style.backgroundColor).toBe("rgb(255, 0, 0)");
    expect(blueSwatch?.style.backgroundColor).toBe("rgb(0, 0, 255)");

    // activeColor defaults to 0 (red): only that swatch carries the checkmark.
    expect(redSwatch?.textContent).toBe("✓");
    expect(blueSwatch?.textContent).toBe("");
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

describe("language switcher", () => {
  it("inserts the language switcher immediately after the page heading", () => {
    buildFixture(soloPuzzle);

    hydrate();

    const h1 = document.querySelector("h1");
    expect(
      h1?.nextElementSibling?.querySelector(
        '[data-role="language-switcher-select"]',
      ),
    ).not.toBeNull();
  });

  it("defaults to the language detected from the browser when there is no saved cookie", () => {
    setNavigatorLanguage("fr-FR");
    buildFixture(soloPuzzle);

    hydrate();

    expect(switcherSelect().value).toBe("fr");
  });

  it("prefers a saved cookie over the browser-detected language", () => {
    document.cookie = "kindle-nonograms-locale=fr; path=/";
    setNavigatorLanguage("en-US");
    buildFixture(soloPuzzle);

    hydrate();

    expect(switcherSelect().value).toBe("fr");
  });

  it("labels the Fill/Cross toggle buttons and the win banner in the resolved locale from the start", () => {
    setNavigatorLanguage("fr-FR");
    buildFixture(soloPuzzle);

    hydrate();

    expect(fillButton()?.textContent).toBe("Remplir");
    expect(crossButton()?.textContent).toBe("Croix");
    expect(banner()?.textContent).toBe("Puzzle résolu !");
  });

  it("retranslates the Fill/Cross toggle buttons and the win banner immediately, with no reload, when the language changes", () => {
    buildFixture(soloPuzzle);

    hydrate();
    expect(fillButton()?.textContent).toBe("Fill");

    switcherSelect().value = "fr";
    switcherSelect().dispatchEvent(new Event("change"));

    expect(fillButton()?.textContent).toBe("Remplir");
    expect(crossButton()?.textContent).toBe("Croix");
    expect(banner()?.textContent).toBe("Puzzle résolu !");
    expect(document.documentElement.lang).toBe("fr");
  });

  it("saves the chosen language in a cookie, read back as the priority source on the next load", () => {
    buildFixture(soloPuzzle);

    hydrate();
    switcherSelect().value = "fr";
    switcherSelect().dispatchEvent(new Event("change"));

    expect(document.cookie).toContain("kindle-nonograms-locale=fr");
  });

  it("still inserts the switcher when the embedded puzzle JSON is missing, without throwing", () => {
    document.body.innerHTML =
      '<h1>Puzzle</h1><table><tbody><tr><td data-row="0" data-col="0"></td></tr></tbody></table>';

    expect(() => hydrate()).not.toThrow();
    expect(
      document.querySelector('[data-role="language-switcher-select"]'),
    ).not.toBeNull();
    expect(banner()).toBeNull();
  });
});
