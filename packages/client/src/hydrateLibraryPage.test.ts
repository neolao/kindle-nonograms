// @vitest-environment jsdom
import {
  type Puzzle,
  isMultiColorPuzzle,
  puzzleSizeBucket,
} from "@kindle-nonograms/shared";
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

// Mirrors what renderLibraryPage.ts actually tags each row with, so the
// fixture stays representative of real server-rendered markup.
function buildFixture(puzzles: Puzzle[]): void {
  const items = puzzles
    .map(
      (puzzle) =>
        `<li data-puzzle-id="${puzzle.id}" data-size-bucket="${puzzleSizeBucket(puzzle)}" data-color-type="${isMultiColorPuzzle(puzzle) ? "multi" : "mono"}"><span class="thumb" aria-hidden="true"><span class="thumb-lock">?</span></span><a href="puzzles/${puzzle.id}/">${puzzle.name}</a><span class="solved-badge" data-i18n="library.solvedBadge" hidden>Solved</span></li>`,
    )
    .join("");

  document.body.innerHTML = `<h1 data-i18n="library.title">Kindle Nonograms</h1><ul>${items}</ul>${FOOTER_FIXTURE}<script type="application/json" id="puzzles-data">${JSON.stringify(puzzles)}</script>`;
}

function buildEmptyFixture(): void {
  document.body.innerHTML = `<h1 data-i18n="library.title">Kindle Nonograms</h1><p data-i18n="library.empty">No puzzles are available yet.</p>${FOOTER_FIXTURE}<script type="application/json" id="puzzles-data">[]</script>`;
}

// Mirrors what renderLibraryPage.ts actually renders for the footer, so the
// fixture stays representative of real server-rendered markup.
const FOOTER_FIXTURE = `<footer class="page-footer"><div class="page-footer-links"><a href="editor/" data-i18n="library.createPuzzleLink">Create a puzzle</a><a href="https://github.com/neolao/kindle-nonograms/blob/main/CONTRIBUTING.md" target="_blank" rel="noopener noreferrer"><span data-i18n="library.contributeLink">Contribute a puzzle on GitHub</span><span aria-hidden="true"> ↗</span></a></div></footer>`;

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

function sizeFilterSelect(): HTMLSelectElement {
  const found = document.querySelector<HTMLSelectElement>(
    '[data-role="library-filter-size-select"]',
  );
  if (!found) {
    throw new Error("fixture size filter select not found");
  }
  return found;
}

function colorFilterSelect(): HTMLSelectElement {
  const found = document.querySelector<HTMLSelectElement>(
    '[data-role="library-filter-color-select"]',
  );
  if (!found) {
    throw new Error("fixture color filter select not found");
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

function selectValue(select: HTMLSelectElement, value: string): void {
  select.value = value;
  select.dispatchEvent(new Event("change"));
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

  it("shows every puzzle by default, with both filters set to 'all'", () => {
    expect(sizeFilterSelect().value).toBe("all");
    expect(colorFilterSelect().value).toBe("all");
    expect(isRowVisible("small-mono")).toBe(true);
    expect(isRowVisible("medium-multi")).toBe(true);
    expect(isRowVisible("large-mono")).toBe(true);
  });

  it("hides puzzles that don't match the selected size filter", () => {
    selectValue(sizeFilterSelect(), "small");

    expect(isRowVisible("small-mono")).toBe(true);
    expect(isRowVisible("medium-multi")).toBe(false);
    expect(isRowVisible("large-mono")).toBe(false);
  });

  it("hides puzzles that don't match the selected color filter", () => {
    selectValue(colorFilterSelect(), "mono");

    expect(isRowVisible("small-mono")).toBe(true);
    expect(isRowVisible("medium-multi")).toBe(false);
    expect(isRowVisible("large-mono")).toBe(true);
  });

  it("combines the size and color filters with AND logic, not OR", () => {
    selectValue(sizeFilterSelect(), "medium");
    selectValue(colorFilterSelect(), "multi");

    expect(isRowVisible("small-mono")).toBe(false);
    expect(isRowVisible("medium-multi")).toBe(true);
    expect(isRowVisible("large-mono")).toBe(false);
  });

  it("shows a 'no puzzles match' message when the filter combination matches nothing", () => {
    selectValue(sizeFilterSelect(), "small");
    selectValue(colorFilterSelect(), "multi");

    expect(isRowVisible("small-mono")).toBe(false);
    expect(isRowVisible("medium-multi")).toBe(false);
    expect(isRowVisible("large-mono")).toBe(false);
    const message = document.querySelector<HTMLElement>(
      "[data-i18n='library.filterNoResults']",
    );
    expect(message?.hidden).toBe(false);
  });

  it("hides the 'no puzzles match' message again once a matching puzzle reappears", () => {
    selectValue(sizeFilterSelect(), "small");
    selectValue(colorFilterSelect(), "multi");
    selectValue(colorFilterSelect(), "all");

    expect(isRowVisible("small-mono")).toBe(true);
    const message = document.querySelector<HTMLElement>(
      "[data-i18n='library.filterNoResults']",
    );
    expect(message?.hidden).toBe(true);
  });

  it("restores every puzzle when both filters are reset back to 'all'", () => {
    selectValue(sizeFilterSelect(), "small");
    selectValue(colorFilterSelect(), "mono");
    selectValue(sizeFilterSelect(), "all");
    selectValue(colorFilterSelect(), "all");

    expect(isRowVisible("small-mono")).toBe(true);
    expect(isRowVisible("medium-multi")).toBe(true);
    expect(isRowVisible("large-mono")).toBe(true);
  });

  it("keeps the puzzle still solved-checkable after being hidden by a filter", () => {
    saveProgress("small-mono", { cells: [[0, null]] });
    selectValue(sizeFilterSelect(), "medium");

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

  it("keeps the active filter selection and re-translates option labels when the language is changed", () => {
    selectValue(sizeFilterSelect(), "small");
    switcherSelect().value = "fr";
    switcherSelect().dispatchEvent(new Event("change"));

    expect(sizeFilterSelect().value).toBe("small");
    expect(isRowVisible("small-mono")).toBe(true);
    expect(isRowVisible("medium-multi")).toBe(false);
    expect(
      sizeFilterSelect().querySelector('option[value="small"]')?.textContent,
    ).toBe("Petit");
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
      mediumMultiPuzzle, // the only non-small, non-mono puzzle in the mix
    ];
    buildFixture(puzzles);
    hydrate();
    click(paginationNextButton());

    selectValue(sizeFilterSelect(), "medium");

    expect(paginationContainer().hidden).toBe(true);
    expect(isRowVisible("medium-multi")).toBe(true);
    expect(isRowVisible("p0")).toBe(false);
  });

  it("shows pagination again once a filter narrowing below the page size is cleared", () => {
    buildFixture(buildPuzzles(30));
    hydrate();
    selectValue(sizeFilterSelect(), "large");
    expect(paginationContainer().hidden).toBe(true);

    selectValue(sizeFilterSelect(), "all");

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
