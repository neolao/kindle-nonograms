// @vitest-environment jsdom
import type { Puzzle, PuzzleProgress } from "@kindle-nonograms/shared";
import { renderPuzzlePage } from "@kindle-nonograms/site";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { extractBodyHtml } from "./htmlFixture.js";
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

/**
 * Builds the fixture from the real `renderPuzzlePage` output, not a
 * hand-retyped copy — so the toolbar/banner markup this test exercises can
 * never silently drift from what the site generator actually produces. See
 * `.ux/decisions/001-frozen-chrome-blocking-reconciliation.md`.
 */
function buildFixture(puzzle: Puzzle): void {
  document.body.innerHTML = extractBodyHtml(renderPuzzlePage(puzzle));
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

function checkButton(): HTMLButtonElement | null {
  return document.querySelector<HTMLButtonElement>('[data-role="check"]');
}

function storageWarning(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-role="storage-warning"]');
}

function storageWarningDismissButton(): HTMLButtonElement | null {
  return document.querySelector<HTMLButtonElement>(
    '[data-role="storage-warning-dismiss"]',
  );
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
  vi.restoreAllMocks();
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

  it("groups the fill button and its color swatches in a shared visual container", () => {
    buildFixture(duoPuzzle);
    hydrate();

    const swatch = document.querySelector<HTMLButtonElement>(
      '[data-role="swatch"][data-color-index="0"]',
    );
    const group = fillButton()?.closest(".fill-color-group");

    expect(group).not.toBeNull();
    expect(swatch?.closest(".fill-color-group")).toBe(group);
  });

  it("does not group the cross or check buttons with the fill/swatch container", () => {
    buildFixture(duoPuzzle);
    hydrate();

    expect(crossButton()?.closest(".fill-color-group")).toBeNull();
    expect(checkButton()?.closest(".fill-color-group")).toBeNull();
  });

  it("still wraps the fill button in its own container for a single-color puzzle with no swatches", () => {
    buildFixture(soloPuzzle);
    hydrate();

    expect(fillButton()?.closest(".fill-color-group")).not.toBeNull();
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

describe("check button", () => {
  it("reveals the banner with an explicit not-solved message when Check is clicked on an unsolved grid", () => {
    buildFixture(soloPuzzle);
    hydrate();

    expect(banner()?.hidden).toBe(true);
    checkButton()?.click();

    expect(banner()?.hidden).toBe(false);
    expect(banner()?.textContent).toBe("Not solved yet");
  });

  it("reveals the banner with the same solved message as the automatic banner when Check is clicked on an already-solved grid", () => {
    saveProgress("solo", { cells: [[0, null]] });
    buildFixture(soloPuzzle);
    hydrate();

    checkButton()?.click();

    expect(banner()?.hidden).toBe(false);
    expect(banner()?.textContent).toBe("Puzzle solved!");
  });

  it("resyncs the banner to the solved message once a tap completes the puzzle after Check showed a not-solved message", () => {
    buildFixture(soloPuzzle);
    hydrate();

    checkButton()?.click();
    expect(banner()?.textContent).toBe("Not solved yet");

    cell(0, 0).click();

    expect(banner()?.hidden).toBe(false);
    expect(banner()?.textContent).toBe("Puzzle solved!");
  });

  it("marks the banner as a live region so its message is announced to assistive tech", () => {
    buildFixture(soloPuzzle);
    hydrate();

    expect(banner()?.getAttribute("aria-live")).toBe("polite");
  });

  it("clears a cell filled with the wrong color and shows a corrected message when the puzzle is still unsolved", () => {
    buildFixture(duoPuzzle);
    hydrate();

    // Solution is [[0, 1]]; fill column 0 with the wrong color (1).
    document
      .querySelector<HTMLButtonElement>(
        '[data-role="swatch"][data-color-index="1"]',
      )
      ?.click();
    cell(0, 0).click();
    expect(cell(0, 0).style.backgroundColor).toBe("rgb(0, 0, 255)");

    checkButton()?.click();

    expect(cell(0, 0).textContent).toBe("");
    expect(cell(0, 0).style.backgroundColor).toBe("");
    expect(banner()?.hidden).toBe(false);
    expect(banner()?.textContent).toBe(
      "Some wrong cells were cleared — keep going!",
    );
  });

  it("clears a cell incorrectly filled where the solution is empty", () => {
    buildFixture(soloPuzzle);
    hydrate();

    // Solution is [[0, null]]; incorrectly fill column 1.
    cell(0, 1).click();
    expect(cell(0, 1).style.backgroundColor).toBe("rgb(0, 0, 0)");

    checkButton()?.click();

    expect(cell(0, 1).style.backgroundColor).toBe("");
    expect(banner()?.textContent).toBe(
      "Some wrong cells were cleared — keep going!",
    );
  });

  it("clears a mark left on a cell the solution requires filled", () => {
    buildFixture(soloPuzzle);
    hydrate();

    document
      .querySelector<HTMLButtonElement>('[data-role="mode-cross"]')
      ?.click();
    cell(0, 0).click();
    expect(cell(0, 0).textContent).toBe("✖");

    checkButton()?.click();

    expect(cell(0, 0).textContent).toBe("");
  });

  it("shows the solved message, not the corrected one, when clearing the only mistake completes the puzzle", () => {
    buildFixture(soloPuzzle);
    hydrate();

    // Solution is [[0, null]]: fill both cells, only the second is wrong.
    cell(0, 0).click();
    cell(0, 1).click();
    expect(banner()?.hidden).toBe(true);

    checkButton()?.click();

    expect(cell(0, 1).style.backgroundColor).toBe("");
    expect(banner()?.textContent).toBe("Puzzle solved!");
  });

  it("persists the corrected progress, surviving a reload", () => {
    buildFixture(soloPuzzle);
    hydrate();

    cell(0, 1).click();
    checkButton()?.click();

    expect(loadProgress("solo")).toEqual({
      cells: [[null, null]],
    } satisfies PuzzleProgress);
  });

  it("leaves the not-solved message unchanged when Check finds nothing wrong to correct", () => {
    buildFixture(soloPuzzle);
    hydrate();

    checkButton()?.click();
    expect(banner()?.textContent).toBe("Not solved yet");

    checkButton()?.click();
    expect(banner()?.textContent).toBe("Not solved yet");
  });

  it("labels the Check button in the resolved locale from the start", () => {
    setNavigatorLanguage("fr-FR");
    buildFixture(soloPuzzle);

    hydrate();

    expect(checkButton()?.textContent).toBe("Vérifier");
  });
});

describe("locale application", () => {
  it("never renders a language switcher on the puzzle page — it only lives in the library page's footer", () => {
    buildFixture(soloPuzzle);

    hydrate();

    expect(
      document.querySelector('[data-role="language-switcher-select"]'),
    ).toBeNull();
  });

  it("finds the toolbar and win banner already baked inside the chrome panel, rather than inserting new ones", () => {
    buildFixture(soloPuzzle);

    hydrate();

    const chromePanel = document.querySelector(".chrome-panel");
    expect(chromePanel?.querySelector('[data-role="check"]')).not.toBeNull();
    expect(
      chromePanel?.querySelector('[data-role="win-banner"]'),
    ).not.toBeNull();
    // Not duplicated as a stray sibling outside the panel.
    expect(document.querySelectorAll('[data-role="check"]')).toHaveLength(1);
  });

  it("keeps the grid fully interactive when the page has no baked win banner to find — only the win-confirmation feature degrades", () => {
    // A page shape decision 001 says should no longer occur in production
    // (renderPuzzlePage.ts always bakes one), but hydration must degrade
    // gracefully, not lock out the whole page, if it somehow does.
    document.body.innerHTML = `<h1>${soloPuzzle.name}</h1><table><tbody><tr><td data-row="0" data-col="0"></td><td data-row="0" data-col="1"></td></tr></tbody></table><script type="application/json" id="puzzle-data">${JSON.stringify(soloPuzzle)}</script>`;

    expect(() => hydrate()).not.toThrow();
    expect(document.querySelector('[data-role="check"]')).toBeNull();

    expect(() => cell(0, 0).click()).not.toThrow();
    expect(cell(0, 0).style.backgroundColor).toBe("rgb(0, 0, 0)");
  });

  it("retranslates the static back-link to the resolved locale on initial load, not just after switching", () => {
    setNavigatorLanguage("fr-FR");
    document.body.innerHTML = `<h1>${soloPuzzle.name}</h1><div class="page-header"><a class="back-link" data-i18n="play.backToLibrary" href="../../">Back to puzzle list</a></div><div class="grid-wrapper"><table><tbody><tr><th scope="row">clue</th><td data-row="0" data-col="0"></td><td data-row="0" data-col="1"></td></tr></tbody></table></div><script type="application/json" id="puzzle-data">${JSON.stringify(soloPuzzle)}</script>`;

    hydrate();

    const backLink = document.querySelector(".back-link");
    expect(backLink?.textContent).toBe("Retour à la liste des puzzles");
  });

  it("applies a previously saved locale cookie to the toolbar/banner text, with no switcher present to have set it", () => {
    document.cookie = "kindle-nonograms-locale=fr; path=/";
    setNavigatorLanguage("en-US");
    buildFixture(soloPuzzle);

    hydrate();

    expect(fillButton()?.textContent).toBe("Remplir");
    expect(crossButton()?.textContent).toBe("Croix");
  });

  it("labels the Fill/Cross toggle buttons and the win banner in the resolved locale from the start", () => {
    setNavigatorLanguage("fr-FR");
    buildFixture(soloPuzzle);

    hydrate();

    expect(fillButton()?.textContent).toBe("Remplir");
    expect(crossButton()?.textContent).toBe("Croix");
    expect(banner()?.textContent).toBe("Puzzle résolu !");
  });

  it("still applies the resolved locale when the embedded puzzle JSON is malformed, without throwing or inserting a switcher", () => {
    setNavigatorLanguage("fr-FR");
    // The `#puzzle-data` script itself must stay present — it's this page's
    // own self-detection marker (a bare `<table>` no longer is: the editor
    // page's canvas renders one too, see
    // .ux/decisions/001-frozen-chrome-blocking-reconciliation.md) — only its
    // content is broken here.
    document.body.innerHTML =
      '<h1>Puzzle</h1><div class="page-header"><a class="back-link" data-i18n="play.backToLibrary" href="../../">Back to puzzle list</a></div><table><tbody><tr><td data-row="0" data-col="0"></td></tr></tbody></table><script type="application/json" id="puzzle-data">not valid json</script>';

    expect(() => hydrate()).not.toThrow();

    expect(document.querySelector(".back-link")?.textContent).toBe(
      "Retour à la liste des puzzles",
    );
    expect(
      document.querySelector('[data-role="language-switcher-select"]'),
    ).toBeNull();
    expect(banner()).toBeNull();
  });

  it("stays a no-op on a page with a <table> but no #puzzle-data script, so it never double-hydrates the editor page's own static canvas grid", () => {
    document.body.innerHTML =
      '<div data-role="editor-page"><table><tbody><tr><td data-row="0" data-col="0"></td></tr></tbody></table></div>';

    expect(() => hydrate()).not.toThrow();

    expect(fillButton()).toBeNull();
    expect(crossButton()).toBeNull();
    expect(checkButton()).toBeNull();
    expect(banner()).toBeNull();
  });

  it("sets a numeric px font-size on the grid wrapper after hydrating, to fit the available viewport", () => {
    buildFixture(soloPuzzle);
    hydrate();

    const wrapper = document.querySelector<HTMLElement>(".grid-wrapper");
    expect(wrapper?.style.fontSize).toMatch(/^\d+px$/);
  });

  it("caps the grid wrapper's own box to the available space, so overflow:hidden actually has something to clip", () => {
    buildFixture(soloPuzzle);
    hydrate();

    const wrapper = document.querySelector<HTMLElement>(".grid-wrapper");
    // Without an explicit bound, a block element with overflow:hidden still
    // grows to fit its content and clips nothing — this is what makes the
    // "fail-safe by clipping" promise real instead of a no-op.
    expect(wrapper?.style.maxWidth).toMatch(/^\d+px$/);
    expect(wrapper?.style.maxHeight).toMatch(/^\d+px$/);
  });

  it("recomputes the grid wrapper's font-size after a window resize", () => {
    buildFixture(soloPuzzle);
    hydrate();

    const wrapper = document.querySelector<HTMLElement>(".grid-wrapper");
    const table = document.querySelector("table");
    if (!wrapper || !table) {
      throw new Error("fixture grid wrapper/table not found");
    }

    // Natural size is measured off the table, not the wrapper div — a div
    // stretches to fill its container's width regardless of content, so
    // mocking the wrapper here wouldn't exercise the real measurement path.
    Object.defineProperty(table, "scrollWidth", {
      value: 200,
      configurable: true,
    });
    Object.defineProperty(table, "scrollHeight", {
      value: 200,
      configurable: true,
    });
    Object.defineProperty(document.documentElement, "clientWidth", {
      value: 100,
      configurable: true,
    });
    Object.defineProperty(document.documentElement, "clientHeight", {
      value: 100,
      configurable: true,
    });

    window.dispatchEvent(new Event("resize"));

    expect(wrapper.style.fontSize).toMatch(/^\d+px$/);
    expect(Number.parseInt(wrapper.style.fontSize, 10)).toBeLessThan(16);
  });

  it("shrinks a wide puzzle enough to actually fit a narrow screen, not just down to the old legibility floor", () => {
    buildFixture(soloPuzzle);

    // Mirrors a real wide (25-column) puzzle measured on a narrow real
    // device: a puzzle-still-open scrollWidth of 913px on a 350px-wide
    // screen. At the previous floor (half size), the grid would still
    // render at 913 * 0.5 = 456.5px — wider than the 342px the wrapper is
    // capped to — and get visibly clipped despite `overflow:hidden`.
    const table = document.querySelector("table");
    if (!table) {
      throw new Error("fixture table not found");
    }
    Object.defineProperty(table, "scrollWidth", {
      value: 913,
      configurable: true,
    });
    Object.defineProperty(table, "scrollHeight", {
      value: 913,
      configurable: true,
    });
    Object.defineProperty(document.documentElement, "clientWidth", {
      value: 350,
      configurable: true,
    });
    Object.defineProperty(document.documentElement, "clientHeight", {
      value: 1000,
      configurable: true,
    });

    hydrate();

    const wrapper = document.querySelector<HTMLElement>(".grid-wrapper");
    const fontSizePx = Number.parseInt(wrapper?.style.fontSize ?? "", 10);
    const maxWidthPx = Number.parseInt(wrapper?.style.maxWidth ?? "", 10);
    const renderedTableWidth = 913 * (fontSizePx / 16);

    expect(renderedTableWidth).toBeLessThanOrEqual(maxWidthPx);
  });

  it("keeps a valid grid-wrapper font-size after revealing the win banner via Check, without throwing", () => {
    buildFixture(soloPuzzle);
    hydrate();

    expect(() => checkButton()?.click()).not.toThrow();

    const wrapper = document.querySelector<HTMLElement>(".grid-wrapper");
    expect(wrapper?.style.fontSize).toMatch(/^\d+px$/);
  });

  it("still fits the grid to a numeric font-size when there is no grid-wrapper element", () => {
    document.body.innerHTML = `<h1>Solo</h1><p data-role="win-banner" hidden></p><table><tbody><tr><td data-row="0" data-col="0"></td><td data-row="0" data-col="1"></td></tr></tbody></table><script type="application/json" id="puzzle-data">${JSON.stringify(soloPuzzle)}</script>`;

    hydrate();

    const table = document.querySelector<HTMLElement>("table");
    expect(table?.style.fontSize).toMatch(/^\d+px$/);
  });
});

describe("storage warning", () => {
  it("stays hidden when saving progress succeeds", () => {
    buildFixture(soloPuzzle);
    hydrate();

    cell(0, 0).click();

    expect(storageWarning()?.hidden).toBe(true);
  });

  it("reveals the storage warning with its message when a tap fails to save", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    buildFixture(soloPuzzle);
    hydrate();

    cell(0, 0).click();

    expect(storageWarning()?.hidden).toBe(false);
    expect(storageWarning()?.textContent).toContain(
      "Progress can't be saved on this device.",
    );
  });

  it("reveals the storage warning when a Check click's save fails", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    buildFixture(soloPuzzle);
    hydrate();

    cell(0, 0).click();
    checkButton()?.click();

    expect(storageWarning()?.hidden).toBe(false);
  });

  it("does not re-show the storage warning after it was dismissed, even if another save then fails", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    buildFixture(duoPuzzle);
    hydrate();

    cell(0, 0).click();
    expect(storageWarning()?.hidden).toBe(false);

    storageWarningDismissButton()?.click();
    expect(storageWarning()?.hidden).toBe(true);

    cell(0, 1).click();
    expect(storageWarning()?.hidden).toBe(true);
  });

  it("does not show the warning again for a second failed save even while still visible", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    buildFixture(duoPuzzle);
    hydrate();

    cell(0, 0).click();
    cell(0, 1).click();

    expect(storageWarning()?.hidden).toBe(false);
    expect(
      document.querySelectorAll('[data-role="storage-warning"]').length,
    ).toBe(1);
  });

  it("does not throw when the storage-warning element is missing from the page", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    document.body.innerHTML = `<h1>Solo</h1><p data-role="win-banner" hidden></p><table><tbody><tr><td data-row="0" data-col="0"></td><td data-row="0" data-col="1"></td></tr></tbody></table><script type="application/json" id="puzzle-data">${JSON.stringify(soloPuzzle)}</script>`;

    hydrate();

    expect(() => cell(0, 0).click()).not.toThrow();
  });
});
