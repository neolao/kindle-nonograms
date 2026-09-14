// @vitest-environment jsdom
import type { Puzzle } from "@kindle-nonograms/shared";
import { renderLibraryPage } from "@kindle-nonograms/site";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { extractBodyHtml } from "./htmlFixture.js";
import { hydrate } from "./hydrateLibraryPage.js";
import { writeLibraryFiltersCookie } from "./libraryFiltersStorage.js";
import { recordPuzzleOpened } from "./openedStorage.js";
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

// Spans all three size buckets and both color types, for the filter tests
// below — kept distinct from cat/dog (both small & mono) which are reused
// unchanged by every other describe block in this file.
const smallMonoPuzzle: Puzzle = {
  id: "small-mono",
  name: "Small Mono",
  width: 2,
  height: 1,
  palette: ["#000000"],
  cells: [[0, null]],
};

const mediumMultiPuzzle: Puzzle = {
  id: "medium-multi",
  name: "Medium Multi",
  width: 15,
  height: 15,
  palette: ["#000000", "#ff0000"],
  cells: Array.from({ length: 15 }, () => Array(15).fill(null)),
};

const largeMonoPuzzle: Puzzle = {
  id: "large-mono",
  name: "Large Mono",
  width: 25,
  height: 25,
  palette: ["#000000"],
  cells: Array.from({ length: 25 }, () => Array(25).fill(null)),
};

// 16 wide x 8 tall, exactly one filled cell (row 3, column 5) with every
// other cell blank. Chosen so the old 8-cell-per-axis nearest-neighbor
// sampler (scale factor 2, sampling only rows/columns 0, 2, 4, 6...) would
// have skipped row 3 entirely — this fixture proves the fix that replaced
// it: every real cell must now render, so this one detail can never vanish.
const wideDetailPuzzle: Puzzle = {
  id: "wide-detail",
  name: "Wide Detail",
  width: 16,
  height: 8,
  palette: ["#000000"],
  cells: Array.from({ length: 8 }, (_, row) =>
    Array.from({ length: 16 }, (_, col) => (row === 3 && col === 5 ? 0 : null)),
  ),
};

// Three puzzles, in this fixed default order, for the "recently opened"
// sort tests below — none carries a stored "opened" timestamp until a test
// records one via `recordPuzzleOpened`.
const puzzleA: Puzzle = {
  id: "puzzle-a",
  name: "Puzzle A",
  width: 2,
  height: 1,
  palette: ["#000000"],
  cells: [[0, null]],
};

const puzzleB: Puzzle = {
  id: "puzzle-b",
  name: "Puzzle B",
  width: 2,
  height: 1,
  palette: ["#000000"],
  cells: [[0, null]],
};

const puzzleC: Puzzle = {
  id: "puzzle-c",
  name: "Puzzle C",
  width: 2,
  height: 1,
  palette: ["#000000"],
  cells: [[0, null]],
};

/**
 * Builds the fixture from the real `renderLibraryPage` output, not a
 * hand-retyped copy — so the filter/pagination/switcher markup this test
 * exercises can never silently drift from what the site generator actually
 * produces. See `.ux/decisions/001-frozen-chrome-blocking-reconciliation.md`.
 */
function buildFixture(puzzles: Puzzle[]): void {
  document.body.innerHTML = extractBodyHtml(renderLibraryPage(puzzles));
}

function buildEmptyFixture(): void {
  buildFixture([]);
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

function badgeFor(puzzleId: string): HTMLElement {
  const found = document.querySelector<HTMLElement>(
    `[data-puzzle-id="${puzzleId}"] .solved-badge`,
  );
  if (!found) {
    throw new Error(`fixture badge for ${puzzleId} not found`);
  }
  return found;
}

function linkFor(puzzleId: string): HTMLAnchorElement {
  const found = document.querySelector<HTMLAnchorElement>(
    `[data-puzzle-id="${puzzleId}"] a`,
  );
  if (!found) {
    throw new Error(`fixture link for ${puzzleId} not found`);
  }
  return found;
}

function thumbFor(puzzleId: string): HTMLElement {
  const found = document.querySelector<HTMLElement>(
    `[data-puzzle-id="${puzzleId}"] .thumb`,
  );
  if (!found) {
    throw new Error(`fixture thumbnail for ${puzzleId} not found`);
  }
  return found;
}

// Generates `count` distinct, valid, small monochrome puzzles ("p0".."pN-1")
// — enough to exercise pagination's >25-item path without the noise of
// varied sizes/colors (those are already covered by the filter fixtures
// above).
function buildPuzzles(count: number): Puzzle[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `p${index}`,
    name: `Puzzle ${index}`,
    width: 1,
    height: 1,
    palette: ["#000000"],
    cells: [[0]],
  }));
}

function paginationContainer(): HTMLElement {
  const found = document.querySelector<HTMLElement>(".library-pagination");
  if (!found) {
    throw new Error("fixture pagination container not found");
  }
  return found;
}

function paginationPrevButton(): HTMLButtonElement {
  const found = document.querySelector<HTMLButtonElement>(
    '[data-role="library-pagination-prev"]',
  );
  if (!found) {
    throw new Error("fixture pagination prev button not found");
  }
  return found;
}

function paginationNextButton(): HTMLButtonElement {
  const found = document.querySelector<HTMLButtonElement>(
    '[data-role="library-pagination-next"]',
  );
  if (!found) {
    throw new Error("fixture pagination next button not found");
  }
  return found;
}

function paginationStatusText(): string {
  const found = document.querySelector<HTMLElement>(
    '[data-role="library-pagination-status"]',
  );
  if (!found) {
    throw new Error("fixture pagination status not found");
  }
  return found.textContent ?? "";
}

function click(button: HTMLButtonElement): void {
  button.dispatchEvent(new Event("click", { bubbles: true }));
}

function monoFilterButton(): HTMLButtonElement {
  const found = document.querySelector<HTMLButtonElement>(
    '[data-role="library-filter-color-mono"]',
  );
  if (!found) {
    throw new Error("fixture mono color filter button not found");
  }
  return found;
}

function multiFilterButton(): HTMLButtonElement {
  const found = document.querySelector<HTMLButtonElement>(
    '[data-role="library-filter-color-multi"]',
  );
  if (!found) {
    throw new Error("fixture multi color filter button not found");
  }
  return found;
}

function isRowVisible(puzzleId: string): boolean {
  const row = document.querySelector<HTMLElement>(
    `[data-puzzle-id="${puzzleId}"]`,
  );
  if (!row) {
    throw new Error(`fixture row for ${puzzleId} not found`);
  }
  return !row.hidden;
}

function unsolvedFilterButton(): HTMLButtonElement {
  const found = document.querySelector<HTMLButtonElement>(
    '[data-role="library-filter-status-unsolved"]',
  );
  if (!found) {
    throw new Error("fixture unsolved status filter button not found");
  }
  return found;
}

function inProgressFilterButton(): HTMLButtonElement {
  const found = document.querySelector<HTMLButtonElement>(
    '[data-role="library-filter-status-in-progress"]',
  );
  if (!found) {
    throw new Error("fixture in-progress status filter button not found");
  }
  return found;
}

function solvedFilterButton(): HTMLButtonElement {
  const found = document.querySelector<HTMLButtonElement>(
    '[data-role="library-filter-status-solved"]',
  );
  if (!found) {
    throw new Error("fixture solved status filter button not found");
  }
  return found;
}

function sortRecentButton(): HTMLButtonElement {
  const found = document.querySelector<HTMLButtonElement>(
    '[data-role="library-sort-recent"]',
  );
  if (!found) {
    throw new Error("fixture recently-opened sort button not found");
  }
  return found;
}

/** Every puzzle row's id, in current DOM order (reflects a sort's reorder). */
function rowOrder(): (string | undefined)[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>("[data-puzzle-id]"),
  ).map((row) => row.dataset.puzzleId);
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  document.body.innerHTML = "";
  document.cookie = "kindle-nonograms-locale=; path=/; max-age=0";
  document.cookie = "kindle-nonograms-library-filters=; path=/; max-age=0";
  document.documentElement.lang = "";
  setNavigatorLanguage(originalNavigatorLanguage);
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

describe("embedded puzzles data parse failure", () => {
  it("logs a console warning when the embedded puzzles JSON fails to parse", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    document.body.innerHTML =
      '<ul><li data-puzzle-id="cat"><span class="solved-badge" hidden>Solved</span></li></ul><script type="application/json" id="puzzles-data">not json[</script>';

    hydrate();

    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it("logs a console warning when the embedded puzzles JSON parses to something other than an array", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    document.body.innerHTML =
      '<ul><li data-puzzle-id="cat"><span class="solved-badge" hidden>Solved</span></li></ul><script type="application/json" id="puzzles-data">{"not":"an array"}</script>';

    hydrate();

    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it("does not log a console warning for a genuinely empty library (an actual [])", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    buildEmptyFixture();

    hydrate();

    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("does not log a console warning when the embedded puzzles script element is entirely missing", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    document.body.innerHTML =
      '<ul><li data-puzzle-id="cat"><span class="solved-badge" hidden>Solved</span></li></ul>';

    expect(() => hydrate()).not.toThrow();

    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe("solved-link accessible name", () => {
  it("includes the solved status alongside the visible label in a solved puzzle's link aria-label", () => {
    saveProgress("cat", { cells: [[0, null]] });
    buildFixture([catPuzzle, dogPuzzle]);

    hydrate();

    expect(linkFor("cat").getAttribute("aria-label")).toBe(
      "Cat — 2 × 1, Solved",
    );
  });

  it("leaves an unsolved puzzle's link with no aria-label at all", () => {
    saveProgress("cat", { cells: [[0, null]] });
    buildFixture([catPuzzle, dogPuzzle]);

    hydrate();

    expect(linkFor("dog").hasAttribute("aria-label")).toBe(false);
  });

  it("retranslates a solved puzzle's link aria-label on a later language switch", () => {
    saveProgress("cat", { cells: [[0, null]] });
    buildFixture([catPuzzle, dogPuzzle]);

    hydrate();
    switcherSelect().value = "fr";
    switcherSelect().dispatchEvent(new Event("change"));

    expect(linkFor("cat").getAttribute("aria-label")).toBe(
      "Cat — 2 × 1, Résolu",
    );
  });

  it("does not throw when a solved puzzle's row is missing its link element", () => {
    saveProgress("cat", { cells: [[0, null]] });
    document.body.innerHTML = `<ul><li data-puzzle-id="cat"><span class="solved-badge" hidden>Solved</span></li></ul><script type="application/json" id="puzzles-data">${JSON.stringify([catPuzzle])}</script>`;

    expect(() => hydrate()).not.toThrow();
    expect(badgeFor("cat").hidden).toBe(false);
  });
});

describe("solved-puzzle thumbnail", () => {
  it("reveals a small rendering of the real solution for a puzzle with fully-correct progress", () => {
    saveProgress("cat", { cells: [[0, null]] });
    buildFixture([catPuzzle, dogPuzzle]);

    hydrate();

    const cells = thumbFor("cat").querySelectorAll(".thumb-cell");
    expect(cells).toHaveLength(2);
    expect(thumbFor("cat").querySelector(".thumb-lock")).toBeNull();
  });

  it("leaves the neutral placeholder in place for a puzzle that is not solved", () => {
    buildFixture([catPuzzle, dogPuzzle]);

    hydrate();

    expect(thumbFor("dog").querySelector(".thumb-cell")).toBeNull();
    expect(thumbFor("dog").querySelector(".thumb-lock")?.textContent).toBe("?");
  });

  it("falls back to the placeholder instead of a broken thumbnail when stored progress is corrupted", () => {
    saveProgress("cat", { cells: [[0, null, 0]] });
    buildFixture([catPuzzle, dogPuzzle]);

    expect(() => hydrate()).not.toThrow();
    expect(thumbFor("cat").querySelector(".thumb-cell")).toBeNull();
    expect(thumbFor("cat").querySelector(".thumb-lock")?.textContent).toBe("?");
  });

  it("renders every real cell of a puzzle larger than the old sampling cap, never dropping a filled cell a coarser sampling would have skipped", () => {
    saveProgress("wide-detail", { cells: wideDetailPuzzle.cells });
    buildFixture([wideDetailPuzzle, dogPuzzle]);

    hydrate();

    const cells = thumbFor("wide-detail").querySelectorAll(".thumb-cell");
    expect(cells).toHaveLength(16 * 8);
    // Row 3, column 5 (index 3*16+5 = 53) is the puzzle's one filled cell.
    expect((cells[53] as HTMLElement).style.backgroundColor).toBe(
      "rgb(0, 0, 0)",
    );
    // Its immediate neighbor stays blank — nothing is merged or smeared.
    expect((cells[52] as HTMLElement).style.backgroundColor).toBe("");
  });

  it("sizes every cell as an equal square, scaled down uniformly from the puzzle's longer dimension", () => {
    saveProgress("wide-detail", { cells: wideDetailPuzzle.cells });
    buildFixture([wideDetailPuzzle, dogPuzzle]);

    hydrate();

    // wide-detail is 16 wide × 8 tall — the longer dimension (16) divides
    // the enlarged thumbnail's pixel budget evenly.
    const cells = thumbFor("wide-detail").querySelectorAll(".thumb-cell");
    for (const cell of cells) {
      expect((cell as HTMLElement).style.width).toBe("3px");
      expect((cell as HTMLElement).style.height).toBe("3px");
    }
  });

  it("keeps scaling correctly for a puzzle whose longer dimension doesn't divide the pixel budget evenly", () => {
    saveProgress("large-mono", { cells: largeMonoPuzzle.cells });
    buildFixture([largeMonoPuzzle, dogPuzzle]);

    hydrate();

    // large-mono is 25×25 — the enlarged pixel budget (48) divided by 25 is
    // a fractional-but-exact value, still applied uniformly to every cell.
    const cells = thumbFor("large-mono").querySelectorAll(".thumb-cell");
    for (const cell of cells) {
      expect((cell as HTMLElement).style.width).toBe("1.92px");
      expect((cell as HTMLElement).style.height).toBe("1.92px");
    }
  });

  it("does not truncate a puzzle much larger than the old cap — all cells render, not just the first few per axis", () => {
    saveProgress("large-mono", { cells: largeMonoPuzzle.cells });
    buildFixture([largeMonoPuzzle, dogPuzzle]);

    hydrate();

    expect(thumbFor("large-mono").querySelectorAll(".thumb-cell")).toHaveLength(
      25 * 25,
    );
  });
});

describe("partial-progress thumbnail", () => {
  it("reveals a preview built from the player's own filled cells for a puzzle with partial (unsolved) progress", () => {
    // catPuzzle's solution is [[0, null]] (cell 0 filled, cell 1 empty).
    // Progress here paints the wrong cell (1) and leaves the right one (0)
    // untouched — unsolved, but not untouched either.
    saveProgress("cat", { cells: [[null, 0]] });
    buildFixture([catPuzzle, dogPuzzle]);

    hydrate();

    const cells = thumbFor("cat").querySelectorAll(".thumb-cell");
    expect(cells).toHaveLength(2);
    expect(thumbFor("cat").querySelector(".thumb-lock")).toBeNull();
    // The preview reflects exactly what the player painted, not the
    // solution — cell 0 (which the solution actually requires) stays
    // blank since the player never touched it.
    expect((cells[0] as HTMLElement).style.backgroundColor).toBe("");
    expect((cells[1] as HTMLElement).style.backgroundColor).toBe(
      "rgb(0, 0, 0)",
    );
  });

  it("renders a marked (excluded) cell as blank, the same as an untouched cell, not as filled", () => {
    saveProgress("cat", { cells: [["marked", 0]] });
    buildFixture([catPuzzle, dogPuzzle]);

    hydrate();

    const cells = thumbFor("cat").querySelectorAll(".thumb-cell");
    expect((cells[0] as HTMLElement).style.backgroundColor).toBe("");
    expect((cells[1] as HTMLElement).style.backgroundColor).toBe(
      "rgb(0, 0, 0)",
    );
  });

  it("keeps the neutral '?' placeholder when the only saved progress is marks, with nothing actually painted", () => {
    saveProgress("cat", { cells: [["marked", null]] });
    buildFixture([catPuzzle, dogPuzzle]);

    hydrate();

    expect(thumbFor("cat").querySelector(".thumb-cell")).toBeNull();
    expect(thumbFor("cat").querySelector(".thumb-lock")?.textContent).toBe("?");
  });

  it("keeps the neutral '?' placeholder when there is no saved progress at all", () => {
    buildFixture([catPuzzle, dogPuzzle]);

    hydrate();

    expect(thumbFor("dog").querySelector(".thumb-cell")).toBeNull();
    expect(thumbFor("dog").querySelector(".thumb-lock")?.textContent).toBe("?");
  });

  it("prefers the full solved thumbnail over the partial one once the puzzle becomes fully correct", () => {
    saveProgress("cat", { cells: [[0, null]] });
    buildFixture([catPuzzle, dogPuzzle]);

    hydrate();

    expect(thumbFor("cat").querySelector(".solved-badge")).toBeNull();
    const badge = document
      .querySelector('[data-puzzle-id="cat"]')
      ?.querySelector(".solved-badge") as HTMLElement;
    expect(badge.hidden).toBe(false);
  });

  it("falls back to the placeholder instead of a broken thumbnail when partial progress is corrupted", () => {
    saveProgress("cat", { cells: [[0, null, 0]] });
    buildFixture([catPuzzle, dogPuzzle]);

    expect(() => hydrate()).not.toThrow();
    expect(thumbFor("cat").querySelector(".thumb-cell")).toBeNull();
    expect(thumbFor("cat").querySelector(".thumb-lock")?.textContent).toBe("?");
  });
});

describe("language switcher", () => {
  it("inserts the language switcher into the page footer, not right after the heading", () => {
    buildFixture([catPuzzle, dogPuzzle]);

    hydrate();

    const footer = document.querySelector(".page-footer");
    expect(
      footer?.querySelector('[data-role="language-switcher-select"]'),
    ).not.toBeNull();
    const h1 = document.querySelector("h1");
    expect(
      h1?.nextElementSibling?.querySelector(
        '[data-role="language-switcher-select"]',
      ),
    ).toBeNull();
  });

  it("keeps the create-puzzle and contribute links present in the footer alongside the switcher", () => {
    buildFixture([catPuzzle, dogPuzzle]);

    hydrate();

    const footer = document.querySelector(".page-footer");
    expect(
      footer?.querySelectorAll('[data-role="language-switcher-select"]'),
    ).toHaveLength(1);
    expect(footer?.querySelector('a[href="editor/"]')).not.toBeNull();
    expect(
      footer?.querySelector(
        'a[href="https://github.com/neolao/kindle-nonograms/blob/main/CONTRIBUTING.md"]',
      ),
    ).not.toBeNull();
  });

  it("defaults to the language detected from the browser when there is no saved cookie", () => {
    setNavigatorLanguage("fr-FR");
    buildFixture([catPuzzle, dogPuzzle]);

    hydrate();

    expect(switcherSelect().value).toBe("fr");
    expect(document.querySelector("h1")?.textContent).toBe("Kindle Nonograms");
  });

  it("falls back to English when the browser language is not supported", () => {
    setNavigatorLanguage("de-DE");
    buildFixture([catPuzzle, dogPuzzle]);

    hydrate();

    expect(switcherSelect().value).toBe("en");
  });

  it("prefers a saved cookie over the browser-detected language", () => {
    document.cookie = "kindle-nonograms-locale=fr; path=/";
    setNavigatorLanguage("en-US");
    buildFixture([catPuzzle, dogPuzzle]);

    hydrate();

    expect(switcherSelect().value).toBe("fr");
  });

  it("retranslates the page immediately, with no reload, when the language is changed", () => {
    buildFixture([catPuzzle, dogPuzzle]);

    hydrate();
    switcherSelect().value = "fr";
    switcherSelect().dispatchEvent(new Event("change"));

    expect(document.documentElement.lang).toBe("fr");
    expect(badgeFor("cat").textContent).toBe("Résolu");
  });

  it("saves the chosen language in a cookie, read back as the priority source on the next load", () => {
    buildFixture([catPuzzle, dogPuzzle]);

    hydrate();
    switcherSelect().value = "fr";
    switcherSelect().dispatchEvent(new Event("change"));

    expect(document.cookie).toContain("kindle-nonograms-locale=fr");
  });

  it("also inserts and applies the switcher on the empty library page", () => {
    setNavigatorLanguage("fr-FR");
    buildEmptyFixture();

    hydrate();

    expect(switcherSelect().value).toBe("fr");
    expect(
      document.querySelector("[data-i18n='library.empty']")?.textContent,
    ).toBe("Aucun puzzle disponible pour le moment.");
  });
});

describe("library filters", () => {
  beforeEach(() => {
    buildFixture([smallMonoPuzzle, mediumMultiPuzzle, largeMonoPuzzle]);
    hydrate();
  });

  it("shows every puzzle by default, with neither color filter button pressed ('all')", () => {
    expect(monoFilterButton().getAttribute("aria-pressed")).toBe("false");
    expect(multiFilterButton().getAttribute("aria-pressed")).toBe("false");
    expect(isRowVisible("small-mono")).toBe(true);
    expect(isRowVisible("medium-multi")).toBe(true);
    expect(isRowVisible("large-mono")).toBe(true);
  });

  it("hides puzzles that don't match the selected color filter, and presses only that button", () => {
    click(monoFilterButton());

    expect(monoFilterButton().getAttribute("aria-pressed")).toBe("true");
    expect(multiFilterButton().getAttribute("aria-pressed")).toBe("false");
    expect(isRowVisible("small-mono")).toBe(true);
    expect(isRowVisible("medium-multi")).toBe(false);
    expect(isRowVisible("large-mono")).toBe(true);
  });

  it("switches directly from one color filter to the other, keeping only one button pressed", () => {
    click(monoFilterButton());
    click(multiFilterButton());

    expect(monoFilterButton().getAttribute("aria-pressed")).toBe("false");
    expect(multiFilterButton().getAttribute("aria-pressed")).toBe("true");
    expect(isRowVisible("small-mono")).toBe(false);
    expect(isRowVisible("medium-multi")).toBe(true);
    expect(isRowVisible("large-mono")).toBe(false);
  });

  it("shows a 'no puzzles match' message when the color filter matches nothing", () => {
    buildFixture([smallMonoPuzzle, largeMonoPuzzle]);
    hydrate();

    click(multiFilterButton());

    expect(isRowVisible("small-mono")).toBe(false);
    expect(isRowVisible("large-mono")).toBe(false);
    const message = document.querySelector<HTMLElement>(
      "[data-i18n='library.filterNoResults']",
    );
    expect(message?.hidden).toBe(false);
  });

  it("hides the 'no puzzles match' message again once a matching puzzle reappears", () => {
    buildFixture([smallMonoPuzzle, largeMonoPuzzle]);
    hydrate();

    click(multiFilterButton());
    click(multiFilterButton());

    expect(isRowVisible("small-mono")).toBe(true);
    const message = document.querySelector<HTMLElement>(
      "[data-i18n='library.filterNoResults']",
    );
    expect(message?.hidden).toBe(true);
  });

  it("restores every puzzle, and un-presses the button, when the active color filter is tapped again", () => {
    click(monoFilterButton());
    click(monoFilterButton());

    expect(monoFilterButton().getAttribute("aria-pressed")).toBe("false");
    expect(isRowVisible("small-mono")).toBe(true);
    expect(isRowVisible("medium-multi")).toBe(true);
    expect(isRowVisible("large-mono")).toBe(true);
  });

  it("keeps the puzzle still solved-checkable after being hidden by a filter", () => {
    saveProgress("small-mono", { cells: [[0, null]] });
    click(multiFilterButton());

    // Hydration's own solved-badge reveal already ran once during the
    // shared beforeEach's `hydrate()` call, before progress was saved here
    // — this asserts hiding a row via a filter doesn't detach it from the
    // DOM, so a later hydration pass could still find and reveal it.
    const row = document.querySelector<HTMLElement>(
      '[data-puzzle-id="small-mono"]',
    );
    expect(row).not.toBeNull();
    expect(row?.querySelector(".solved-badge")).not.toBeNull();
  });

  it("keeps the active filter selection and re-translates the button labels when the language is changed", () => {
    click(monoFilterButton());
    switcherSelect().value = "fr";
    switcherSelect().dispatchEvent(new Event("change"));

    expect(monoFilterButton().getAttribute("aria-pressed")).toBe("true");
    expect(isRowVisible("small-mono")).toBe(true);
    expect(isRowVisible("medium-multi")).toBe(false);
    expect(monoFilterButton().textContent).toBe("Mono");
  });

  it("retranslates each color filter button's own composed accessible name when the language is changed", () => {
    switcherSelect().value = "fr";
    switcherSelect().dispatchEvent(new Event("change"));

    expect(monoFilterButton().getAttribute("aria-label")).toBe(
      "Couleur : Mono",
    );
    expect(multiFilterButton().getAttribute("aria-label")).toBe(
      "Couleur : Multi",
    );
  });
});

describe("library status filter", () => {
  beforeEach(() => {
    saveProgress("small-mono", { cells: [[0, null]] }); // solved
    saveProgress("medium-multi", {
      cells: Array.from({ length: 15 }, (_, row) =>
        Array.from({ length: 15 }, (_, col) =>
          row === 0 && col === 0 ? 0 : null,
        ),
      ),
    }); // partial (some paint, not solved)
    // large-mono: no saved progress at all — unsolved.
    buildFixture([smallMonoPuzzle, mediumMultiPuzzle, largeMonoPuzzle]);
    hydrate();
  });

  it("shows every puzzle by default, with no status filter button pressed ('all')", () => {
    expect(unsolvedFilterButton().getAttribute("aria-pressed")).toBe("false");
    expect(inProgressFilterButton().getAttribute("aria-pressed")).toBe("false");
    expect(solvedFilterButton().getAttribute("aria-pressed")).toBe("false");
    expect(isRowVisible("small-mono")).toBe(true);
    expect(isRowVisible("medium-multi")).toBe(true);
    expect(isRowVisible("large-mono")).toBe(true);
  });

  it("keeps only solved puzzles visible, and presses only the solved button", () => {
    click(solvedFilterButton());

    expect(solvedFilterButton().getAttribute("aria-pressed")).toBe("true");
    expect(unsolvedFilterButton().getAttribute("aria-pressed")).toBe("false");
    expect(isRowVisible("small-mono")).toBe(true);
    expect(isRowVisible("medium-multi")).toBe(false);
    expect(isRowVisible("large-mono")).toBe(false);
  });

  it("keeps only puzzles with partial saved progress visible when 'In progress' is selected", () => {
    click(inProgressFilterButton());

    expect(isRowVisible("small-mono")).toBe(false);
    expect(isRowVisible("medium-multi")).toBe(true);
    expect(isRowVisible("large-mono")).toBe(false);
  });

  it("keeps only puzzles with no saved progress at all visible when 'Unsolved' is selected", () => {
    click(unsolvedFilterButton());

    expect(isRowVisible("small-mono")).toBe(false);
    expect(isRowVisible("medium-multi")).toBe(false);
    expect(isRowVisible("large-mono")).toBe(true);
  });

  it("restores every puzzle, and un-presses the button, when the active status filter is tapped again", () => {
    click(solvedFilterButton());
    click(solvedFilterButton());

    expect(solvedFilterButton().getAttribute("aria-pressed")).toBe("false");
    expect(isRowVisible("small-mono")).toBe(true);
    expect(isRowVisible("medium-multi")).toBe(true);
    expect(isRowVisible("large-mono")).toBe(true);
  });

  it("switches directly from one status filter to another, keeping only one button pressed", () => {
    click(solvedFilterButton());
    click(unsolvedFilterButton());

    expect(solvedFilterButton().getAttribute("aria-pressed")).toBe("false");
    expect(unsolvedFilterButton().getAttribute("aria-pressed")).toBe("true");
    expect(isRowVisible("small-mono")).toBe(false);
    expect(isRowVisible("large-mono")).toBe(true);
  });

  it("combines the status filter with the existing color filter (AND, not OR)", () => {
    click(solvedFilterButton());
    click(monoFilterButton());

    // Only small-mono is both solved AND mono — proves the two filters
    // narrow the result set together rather than either alone being enough.
    expect(isRowVisible("small-mono")).toBe(true);
    expect(isRowVisible("medium-multi")).toBe(false);
    expect(isRowVisible("large-mono")).toBe(false);
  });

  it("shows the 'no puzzles match' message when the status and color filters combine to match nothing", () => {
    // small-mono is solved but mono; medium-multi is multi but not solved;
    // large-mono is mono and unsolved — solved+multi together match none.
    click(solvedFilterButton());
    click(multiFilterButton());

    expect(isRowVisible("small-mono")).toBe(false);
    expect(isRowVisible("medium-multi")).toBe(false);
    expect(isRowVisible("large-mono")).toBe(false);
    const message = document.querySelector<HTMLElement>(
      "[data-i18n='library.filterNoResults']",
    );
    expect(message?.hidden).toBe(false);
  });

  it("treats a puzzle with corrupted-shape stored progress as unsolved for the status filter instead of throwing", () => {
    saveProgress("large-mono", {
      cells: [[0, null, 0]],
    });
    buildFixture([smallMonoPuzzle, mediumMultiPuzzle, largeMonoPuzzle]);

    expect(() => hydrate()).not.toThrow();

    click(unsolvedFilterButton());
    expect(isRowVisible("large-mono")).toBe(true);
  });
});

describe("library sort by recently opened", () => {
  it("keeps the default order and an unpressed sort button when no puzzle has ever been opened", () => {
    buildFixture([puzzleA, puzzleB, puzzleC]);

    hydrate();

    expect(sortRecentButton().getAttribute("aria-pressed")).toBe("false");
    expect(rowOrder()).toEqual(["puzzle-a", "puzzle-b", "puzzle-c"]);
  });

  it("orders opened puzzles most-recent-first, keeping never-opened ones after, in their default order, once the sort is toggled on", () => {
    recordPuzzleOpened("puzzle-a", 1_000);
    recordPuzzleOpened("puzzle-c", 2_000);
    // puzzle-b was never opened.
    buildFixture([puzzleA, puzzleB, puzzleC]);
    hydrate();

    click(sortRecentButton());

    expect(sortRecentButton().getAttribute("aria-pressed")).toBe("true");
    expect(rowOrder()).toEqual(["puzzle-c", "puzzle-a", "puzzle-b"]);
  });

  it("restores the default order and un-presses the button when the sort is toggled off again", () => {
    recordPuzzleOpened("puzzle-c", 1_000);
    buildFixture([puzzleA, puzzleB, puzzleC]);
    hydrate();
    click(sortRecentButton());

    click(sortRecentButton());

    expect(sortRecentButton().getAttribute("aria-pressed")).toBe("false");
    expect(rowOrder()).toEqual(["puzzle-a", "puzzle-b", "puzzle-c"]);
  });

  it("keeps a puzzle solved-checkable and still in the DOM after being reordered by the sort", () => {
    saveProgress("puzzle-b", { cells: [[0, null]] });
    recordPuzzleOpened("puzzle-b", 1_000);
    buildFixture([puzzleA, puzzleB, puzzleC]);
    hydrate();

    click(sortRecentButton());

    const row = document.querySelector<HTMLElement>(
      '[data-puzzle-id="puzzle-b"]',
    );
    expect(row).not.toBeNull();
    expect(row?.querySelector(".solved-badge")).not.toBeNull();
  });

  it("combines with the color filter — a sorted puzzle excluded by the color filter stays hidden", () => {
    recordPuzzleOpened("medium-multi", 1_000);
    buildFixture([smallMonoPuzzle, mediumMultiPuzzle, largeMonoPuzzle]);
    hydrate();

    click(sortRecentButton());
    click(monoFilterButton());

    expect(isRowVisible("medium-multi")).toBe(false);
    expect(isRowVisible("small-mono")).toBe(true);
    expect(isRowVisible("large-mono")).toBe(true);
  });
});

describe("library filters cookie persistence", () => {
  it("restores a saved color/status/sort selection from a cookie, before the first paint", () => {
    writeLibraryFiltersCookie({
      color: "mono",
      status: "all",
      sortByRecent: true,
    });
    recordPuzzleOpened("large-mono", 1000);
    recordPuzzleOpened("small-mono", 2000);
    buildFixture([smallMonoPuzzle, mediumMultiPuzzle, largeMonoPuzzle]);

    hydrate();

    expect(monoFilterButton().getAttribute("aria-pressed")).toBe("true");
    expect(sortRecentButton().getAttribute("aria-pressed")).toBe("true");
    expect(isRowVisible("small-mono")).toBe(true);
    expect(isRowVisible("medium-multi")).toBe(false);
    expect(isRowVisible("large-mono")).toBe(true);
    // Recency sort applied immediately too: small-mono (opened later) before
    // large-mono (opened earlier) in the current DOM order.
    expect(rowOrder().indexOf("small-mono")).toBeLessThan(
      rowOrder().indexOf("large-mono"),
    );
  });

  it("falls back to today's defaults (nothing filtered, default order) when no filters cookie is present", () => {
    buildFixture([smallMonoPuzzle, mediumMultiPuzzle, largeMonoPuzzle]);

    hydrate();

    expect(monoFilterButton().getAttribute("aria-pressed")).toBe("false");
    expect(multiFilterButton().getAttribute("aria-pressed")).toBe("false");
    expect(unsolvedFilterButton().getAttribute("aria-pressed")).toBe("false");
    expect(sortRecentButton().getAttribute("aria-pressed")).toBe("false");
    expect(isRowVisible("small-mono")).toBe(true);
    expect(isRowVisible("medium-multi")).toBe(true);
    expect(isRowVisible("large-mono")).toBe(true);
  });

  it("falls back to today's defaults when the filters cookie is corrupted, instead of throwing", () => {
    document.cookie =
      "kindle-nonograms-library-filters=not-a-valid-querystring%00; path=/";
    buildFixture([smallMonoPuzzle, mediumMultiPuzzle, largeMonoPuzzle]);

    expect(() => hydrate()).not.toThrow();
    expect(monoFilterButton().getAttribute("aria-pressed")).toBe("false");
    expect(isRowVisible("small-mono")).toBe(true);
    expect(isRowVisible("medium-multi")).toBe(true);
    expect(isRowVisible("large-mono")).toBe(true);
  });

  it("saves the color filter selection to a cookie when it is changed", () => {
    buildFixture([smallMonoPuzzle, mediumMultiPuzzle, largeMonoPuzzle]);
    hydrate();

    click(multiFilterButton());

    expect(document.cookie).toContain("kindle-nonograms-library-filters=");
    buildFixture([smallMonoPuzzle, mediumMultiPuzzle, largeMonoPuzzle]);
    hydrate();
    expect(multiFilterButton().getAttribute("aria-pressed")).toBe("true");
  });

  it("saves the status filter selection to a cookie when it is changed", () => {
    buildFixture([smallMonoPuzzle, mediumMultiPuzzle, largeMonoPuzzle]);
    hydrate();

    click(solvedFilterButton());

    buildFixture([smallMonoPuzzle, mediumMultiPuzzle, largeMonoPuzzle]);
    hydrate();
    expect(solvedFilterButton().getAttribute("aria-pressed")).toBe("true");
  });

  it("saves the sort toggle to a cookie when it is changed", () => {
    buildFixture([smallMonoPuzzle, mediumMultiPuzzle, largeMonoPuzzle]);
    hydrate();

    click(sortRecentButton());

    buildFixture([smallMonoPuzzle, mediumMultiPuzzle, largeMonoPuzzle]);
    hydrate();
    expect(sortRecentButton().getAttribute("aria-pressed")).toBe("true");
  });

  it("updates the saved cookie back to 'all' when an active filter is cleared by tapping it again", () => {
    buildFixture([smallMonoPuzzle, mediumMultiPuzzle, largeMonoPuzzle]);
    hydrate();
    click(monoFilterButton());
    click(monoFilterButton());

    buildFixture([smallMonoPuzzle, mediumMultiPuzzle, largeMonoPuzzle]);
    hydrate();
    expect(monoFilterButton().getAttribute("aria-pressed")).toBe("false");
    expect(isRowVisible("medium-multi")).toBe(true);
  });
});

describe("library filter/sort per-control isolation", () => {
  it("keeps the status filter, sort, and pagination working when a color filter button is missing from the DOM", () => {
    buildFixture([smallMonoPuzzle, mediumMultiPuzzle, largeMonoPuzzle]);
    monoFilterButton().remove();

    expect(() => hydrate()).not.toThrow();
    click(solvedFilterButton());
    expect(solvedFilterButton().getAttribute("aria-pressed")).toBe("true");
    click(solvedFilterButton());
    click(sortRecentButton());
    expect(sortRecentButton().getAttribute("aria-pressed")).toBe("true");
  });

  it("keeps the color filter, sort, and pagination working when a status filter button is missing from the DOM", () => {
    buildFixture([smallMonoPuzzle, mediumMultiPuzzle, largeMonoPuzzle]);
    solvedFilterButton().remove();

    expect(() => hydrate()).not.toThrow();
    click(monoFilterButton());
    expect(monoFilterButton().getAttribute("aria-pressed")).toBe("true");
    expect(isRowVisible("medium-multi")).toBe(false);
    click(monoFilterButton());
    click(sortRecentButton());
    expect(sortRecentButton().getAttribute("aria-pressed")).toBe("true");
  });

  it("keeps the color filter, status filter, and pagination working when the sort button is missing from the DOM", () => {
    buildFixture([smallMonoPuzzle, mediumMultiPuzzle, largeMonoPuzzle]);
    sortRecentButton().remove();

    expect(() => hydrate()).not.toThrow();
    click(monoFilterButton());
    expect(monoFilterButton().getAttribute("aria-pressed")).toBe("true");
    click(monoFilterButton());
    click(unsolvedFilterButton());
    expect(unsolvedFilterButton().getAttribute("aria-pressed")).toBe("true");
  });

  it("still no-ops entirely when a core pagination element is missing, same as before", () => {
    buildFixture([smallMonoPuzzle, mediumMultiPuzzle, largeMonoPuzzle]);
    paginationNextButton().remove();

    expect(() => hydrate()).not.toThrow();
    expect(monoFilterButton().getAttribute("aria-pressed")).toBe("false");
    click(monoFilterButton());
    // No wiring at all when a core element is missing — the click is inert.
    expect(monoFilterButton().getAttribute("aria-pressed")).toBe("false");
  });
});

describe("library filters on the empty library page", () => {
  it("does not build filter controls when there are no puzzles to filter", () => {
    buildEmptyFixture();

    hydrate();

    expect(document.querySelector(".library-filters")).toBeNull();
  });
});

describe("library pagination", () => {
  it("hides the pagination controls and shows every puzzle when the total is 25 or fewer", () => {
    buildFixture(buildPuzzles(25));

    hydrate();

    expect(paginationContainer().hidden).toBe(true);
    for (let index = 0; index < 25; index++) {
      expect(isRowVisible(`p${index}`)).toBe(true);
    }
  });

  it("shows only the first 25 puzzles and enables only the relevant nav button", () => {
    buildFixture(buildPuzzles(30));

    hydrate();

    expect(paginationContainer().hidden).toBe(false);
    for (let index = 0; index < 25; index++) {
      expect(isRowVisible(`p${index}`)).toBe(true);
    }
    for (let index = 25; index < 30; index++) {
      expect(isRowVisible(`p${index}`)).toBe(false);
    }
    expect(paginationPrevButton().disabled).toBe(true);
    expect(paginationNextButton().disabled).toBe(false);
    expect(paginationStatusText()).toContain("1");
    expect(paginationStatusText()).toContain("2");
  });

  it("reveals the next page and hides the previous one when Next is clicked", () => {
    buildFixture(buildPuzzles(30));
    hydrate();

    click(paginationNextButton());

    for (let index = 0; index < 25; index++) {
      expect(isRowVisible(`p${index}`)).toBe(false);
    }
    for (let index = 25; index < 30; index++) {
      expect(isRowVisible(`p${index}`)).toBe(true);
    }
    expect(paginationPrevButton().disabled).toBe(false);
    expect(paginationNextButton().disabled).toBe(true);
  });

  it("returns to the first page when Previous is clicked from the second page", () => {
    buildFixture(buildPuzzles(30));
    hydrate();
    click(paginationNextButton());

    click(paginationPrevButton());

    expect(isRowVisible("p0")).toBe(true);
    expect(isRowVisible("p25")).toBe(false);
    expect(paginationPrevButton().disabled).toBe(true);
  });

  it("does nothing when Next is clicked while already on the last page", () => {
    buildFixture(buildPuzzles(30));
    hydrate();
    click(paginationNextButton());

    expect(() => click(paginationNextButton())).not.toThrow();
    expect(isRowVisible("p25")).toBe(true);
    expect(paginationNextButton().disabled).toBe(true);
  });

  it("does nothing when Previous is clicked while already on the first page", () => {
    buildFixture(buildPuzzles(30));
    hydrate();

    expect(() => click(paginationPrevButton())).not.toThrow();
    expect(isRowVisible("p0")).toBe(true);
    expect(paginationPrevButton().disabled).toBe(true);
  });

  it("resets to the first page and hides pagination once a filter narrows the result set below the page size", () => {
    const puzzles = [
      ...buildPuzzles(30),
      mediumMultiPuzzle, // the only multi-color puzzle in the mix
    ];
    buildFixture(puzzles);
    hydrate();
    click(paginationNextButton());

    click(multiFilterButton());

    expect(paginationContainer().hidden).toBe(true);
    expect(isRowVisible("medium-multi")).toBe(true);
    expect(isRowVisible("p0")).toBe(false);
  });

  it("shows pagination again once a filter narrowing below the page size is cleared", () => {
    buildFixture(buildPuzzles(30));
    hydrate();
    click(multiFilterButton());
    expect(paginationContainer().hidden).toBe(true);

    click(multiFilterButton());

    expect(paginationContainer().hidden).toBe(false);
    expect(isRowVisible("p0")).toBe(true);
    expect(paginationPrevButton().disabled).toBe(true);
  });

  it("keeps the current page position and its digits when the language is changed", () => {
    buildFixture(buildPuzzles(30));
    hydrate();
    click(paginationNextButton());

    switcherSelect().value = "fr";
    switcherSelect().dispatchEvent(new Event("change"));

    expect(isRowVisible("p25")).toBe(true);
    expect(isRowVisible("p0")).toBe(false);
    expect(paginationStatusText()).toContain("2");
    expect(paginationPrevButton().textContent).toBe("Précédent");
    expect(paginationNextButton().textContent).toBe("Suivant");
  });

  it("keeps a puzzle solved-checkable after paging to the row it's on", () => {
    saveProgress("p25", { cells: [[0]] });
    buildFixture(buildPuzzles(30));
    hydrate();

    click(paginationNextButton());

    expect(badgeFor("p25").hidden).toBe(false);
  });
});
