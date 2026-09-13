// @vitest-environment jsdom
import { renderEditorPage } from "@kindle-nonograms/site";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mocked so image import tests control decoding without a real <canvas> —
// jsdom doesn't implement real pixel decoding (see decodeImageFile.ts's own
// doc comment on this exact boundary). `ImageDecodeError` is kept real (not
// stubbed) so tests can construct the same error shape hydrateEditorPage.ts
// actually receives in the browser.
vi.mock("./decodeImageFile.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./decodeImageFile.js")>();
  return { ...actual, decodeImageFile: vi.fn() };
});

import { ImageDecodeError, decodeImageFile } from "./decodeImageFile.js";
import { extractBodyHtml } from "./htmlFixture.js";
import {
  addPaletteColor,
  buildPuzzleCandidate,
  createEmptyCells,
  hydrate,
  nextCellCoordinate,
  paintCell,
  removePaletteColor,
  resizeCells,
  triggerDownload,
  updatePaletteColor,
} from "./hydrateEditorPage.js";

/**
 * Builds the fixture from the real `renderEditorPage` output, not a
 * hand-retyped copy — so the palette/toolbar/canvas default markup this
 * test exercises can never silently drift from what the site generator
 * actually produces. See
 * `.ux/decisions/001-frozen-chrome-blocking-reconciliation.md`.
 */
function buildFixture(): void {
  document.body.innerHTML = extractBodyHtml(renderEditorPage());
}

function widthInput(): HTMLInputElement {
  return document.querySelector(
    '[data-role="editor-width"]',
  ) as HTMLInputElement;
}
function heightInput(): HTMLInputElement {
  return document.querySelector(
    '[data-role="editor-height"]',
  ) as HTMLInputElement;
}
function nameInput(): HTMLInputElement {
  return document.querySelector(
    '[data-role="editor-name"]',
  ) as HTMLInputElement;
}
function filenameInput(): HTMLInputElement {
  return document.querySelector(
    '[data-role="editor-filename"]',
  ) as HTMLInputElement;
}
function exportButton(): HTMLButtonElement {
  return document.querySelector(
    '[data-role="editor-export"]',
  ) as HTMLButtonElement;
}
function errorRegion(): HTMLElement {
  return document.querySelector('[data-role="editor-error"]') as HTMLElement;
}
function confirmationRegion(): HTMLElement {
  return document.querySelector(
    '[data-role="editor-confirmation"]',
  ) as HTMLElement;
}
function importErrorRegion(): HTMLElement {
  return document.querySelector(
    '[data-role="editor-import-error"]',
  ) as HTMLElement;
}
function swatches(): HTMLButtonElement[] {
  return Array.from(document.querySelectorAll('[data-role="swatch"]'));
}
function colorInputs(): HTMLInputElement[] {
  return Array.from(
    document.querySelectorAll('[data-role="palette-color-input"]'),
  );
}
function removeButtons(): HTMLButtonElement[] {
  return Array.from(document.querySelectorAll('[data-role="palette-remove"]'));
}
function cell(x: number, y: number): HTMLTableCellElement {
  return document.querySelector(
    `td[data-row="${y}"][data-col="${x}"]`,
  ) as HTMLTableCellElement;
}
function fireChange(el: HTMLInputElement, value: string): void {
  el.value = value;
  el.dispatchEvent(new Event("change", { bubbles: true }));
}
function fireClick(el: Element): void {
  el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
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

afterEach(() => {
  document.cookie = "kindle-nonograms-locale=; path=/; max-age=0";
  document.documentElement.lang = "";
  setNavigatorLanguage(originalNavigatorLanguage);
});

function importFileInput(): HTMLInputElement {
  return document.querySelector(
    '[data-role="editor-import-file"]',
  ) as HTMLInputElement;
}
function importPaletteSizeInput(): HTMLInputElement {
  return document.querySelector(
    '[data-role="editor-import-palette-size"]',
  ) as HTMLInputElement;
}
function importBackgroundInput(): HTMLInputElement {
  return document.querySelector(
    '[data-role="editor-import-background"]',
  ) as HTMLInputElement;
}
function importButton(): HTMLButtonElement {
  return document.querySelector(
    '[data-role="editor-import-button"]',
  ) as HTMLButtonElement;
}

/** jsdom's `<input type="file">.files` is normally read-only. */
function setImportFile(file: File | undefined): void {
  Object.defineProperty(importFileInput(), "files", {
    value: file ? [file] : [],
    configurable: true,
  });
}

function pngFile(name = "test.png"): File {
  return new File(["fake-image-bytes"], name, { type: "image/png" });
}

/** Waits for the microtask/macrotask queue to drain — `handleImport`'s own
 * click listener isn't awaited by the caller (a DOM event handler can't be
 * awaited by `fireClick`), and it deliberately yields once via `setTimeout`
 * before doing any work, so a test must yield too before asserting on its
 * result. */
function flushAsync(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

// jsdom implements neither `URL.createObjectURL`/`revokeObjectURL` nor real
// anchor-click navigation — stubbed per test so a real export doesn't emit a
// "Not implemented: navigation" console error or crash.
function stubDownload(): {
  createObjectURL: ReturnType<typeof vi.fn>;
  clickSpy: ReturnType<typeof vi.spyOn>;
} {
  const createObjectURL = vi.fn(() => "blob:mock-url");
  (
    URL as unknown as { createObjectURL: typeof URL.createObjectURL }
  ).createObjectURL = createObjectURL;
  (
    URL as unknown as { revokeObjectURL: typeof URL.revokeObjectURL }
  ).revokeObjectURL = vi.fn();
  const clickSpy = vi
    .spyOn(HTMLAnchorElement.prototype, "click")
    .mockImplementation(() => {});
  return { createObjectURL, clickSpy };
}

describe("pure grid helpers", () => {
  it("creates an empty width x height grid of null cells", () => {
    expect(createEmptyCells(3, 2)).toEqual([
      [null, null, null],
      [null, null, null],
    ]);
  });

  it("resizeCells preserves overlapping cells when growing", () => {
    const cells = [
      [0, 1],
      [1, 0],
    ];
    expect(resizeCells(cells, 3, 3)).toEqual([
      [0, 1, null],
      [1, 0, null],
      [null, null, null],
    ]);
  });

  it("resizeCells drops cells outside the new, smaller bounds", () => {
    const cells = [
      [0, 1, 0],
      [1, 0, 1],
      [0, 1, 0],
    ];
    expect(resizeCells(cells, 2, 2)).toEqual([
      [0, 1],
      [1, 0],
    ]);
  });

  it("resizeCells returns cells that regrow with null, not resurrected content", () => {
    const cells = [[0, 1]];
    const shrunk = resizeCells(cells, 1, 1);
    const regrown = resizeCells(shrunk, 2, 1);
    expect(regrown).toEqual([[0, null]]);
  });

  it("paintCell replaces exactly the targeted cell, immutably", () => {
    const cells = [
      [null, null],
      [null, null],
    ];
    const painted = paintCell(cells, 1, 0, 2);
    expect(painted).toEqual([
      [null, 2],
      [null, null],
    ]);
    expect(cells[0][1]).toBeNull(); // original untouched
  });

  it("paintCell is a no-op for out-of-range coordinates", () => {
    const cells = [[null]];
    expect(paintCell(cells, 5, 5, 0)).toBe(cells);
  });
});

describe("nextCellCoordinate", () => {
  it("moves one step per arrow key on a mid-grid cell", () => {
    expect(nextCellCoordinate(2, 2, "ArrowUp", 5, 5)).toEqual({ x: 2, y: 1 });
    expect(nextCellCoordinate(2, 2, "ArrowDown", 5, 5)).toEqual({ x: 2, y: 3 });
    expect(nextCellCoordinate(2, 2, "ArrowLeft", 5, 5)).toEqual({ x: 1, y: 2 });
    expect(nextCellCoordinate(2, 2, "ArrowRight", 5, 5)).toEqual({
      x: 3,
      y: 2,
    });
  });

  it("clamps at the top-left edge instead of wrapping around", () => {
    expect(nextCellCoordinate(0, 0, "ArrowUp", 5, 5)).toEqual({ x: 0, y: 0 });
    expect(nextCellCoordinate(0, 0, "ArrowLeft", 5, 5)).toEqual({
      x: 0,
      y: 0,
    });
  });

  it("clamps at the bottom-right edge instead of wrapping around", () => {
    expect(nextCellCoordinate(4, 4, "ArrowDown", 5, 5)).toEqual({
      x: 4,
      y: 4,
    });
    expect(nextCellCoordinate(4, 4, "ArrowRight", 5, 5)).toEqual({
      x: 4,
      y: 4,
    });
  });

  it("returns undefined for a key the grid doesn't handle", () => {
    expect(nextCellCoordinate(2, 2, "Tab", 5, 5)).toBeUndefined();
    expect(nextCellCoordinate(2, 2, "a", 5, 5)).toBeUndefined();
  });

  it("clamps into a zero-size grid without throwing", () => {
    expect(nextCellCoordinate(0, 0, "ArrowRight", 0, 0)).toEqual({
      x: 0,
      y: 0,
    });
  });
});

describe("pure palette helpers", () => {
  it("addPaletteColor appends the new color", () => {
    expect(addPaletteColor(["#000000"], "#ff0000")).toEqual([
      "#000000",
      "#ff0000",
    ]);
  });

  it("updatePaletteColor replaces a valid hex at the given index", () => {
    expect(updatePaletteColor(["#000000", "#ffffff"], 1, "#ff0000")).toEqual([
      "#000000",
      "#ff0000",
    ]);
  });

  it("updatePaletteColor ignores a malformed hex value", () => {
    const palette = ["#000000"];
    expect(updatePaletteColor(palette, 0, "not-a-color")).toBe(palette);
  });

  it("removePaletteColor clears cells using the removed color and shifts higher indices down", () => {
    const palette = ["#000000", "#ff0000", "#00ff00"];
    const cells = [[0, 1, 2]];
    const result = removePaletteColor(palette, cells, 1, 2);

    expect(result.palette).toEqual(["#000000", "#00ff00"]);
    expect(result.cells).toEqual([[0, null, 1]]);
    expect(result.activeColorIndex).toBe(1); // was 2, shifted down by one
  });

  it("removePaletteColor resets the active color when it was the one removed", () => {
    const palette = ["#000000", "#ff0000"];
    const result = removePaletteColor(palette, [[0, 1]], 1, 1);
    expect(result.activeColorIndex).toBe(0);
  });

  it("removePaletteColor refuses to drop the last remaining color", () => {
    const palette = ["#000000"];
    const cells = [[0]];
    const result = removePaletteColor(palette, cells, 0, 0);
    expect(result.palette).toBe(palette);
    expect(result.cells).toBe(cells);
    expect(result.activeColorIndex).toBe(0);
  });
});

describe("buildPuzzleCandidate", () => {
  it("trims name and filename before validating and building the puzzle", () => {
    const puzzle = buildPuzzleCandidate({
      id: "  small-heart  ",
      name: "  Small Heart  ",
      width: 2,
      height: 1,
      palette: ["#000000"],
      cells: [[0, null]],
    });
    expect(puzzle.id).toBe("small-heart");
    expect(puzzle.name).toBe("Small Heart");
  });

  it("propagates createPuzzle's validation error for an empty name", () => {
    expect(() =>
      buildPuzzleCandidate({
        id: "cat",
        name: "   ",
        width: 1,
        height: 1,
        palette: ["#000000"],
        cells: [[0]],
      }),
    ).toThrow(/name must not be empty/i);
  });
});

describe("triggerDownload", () => {
  it("creates an object URL for the given content and clicks a download link", () => {
    const { createObjectURL, clickSpy } = stubDownload();
    const content = '{"id":"cat"}';

    triggerDownload("cat.json", content);

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = createObjectURL.mock.calls[0][0] as Blob;
    // jsdom's Blob has no read methods (no `.text()`/`.arrayBuffer()`) to
    // assert its content directly — `.size` matching the source string's
    // byte length is the closest available proof the right payload was
    // wrapped, short of a real browser.
    expect(blob.type).toBe("application/json");
    expect(blob.size).toBe(content.length);
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });
});

describe("hydrate", () => {
  it("does nothing on a page without the editor marker", () => {
    document.body.innerHTML =
      '<h1 data-i18n="library.title">Kindle Nonograms</h1><script type="application/json" id="puzzles-data">[]</script>';
    expect(() => hydrate()).not.toThrow();
    expect(document.querySelector('[data-role="swatch"]')).toBeNull();
  });

  it("populates default width/height, a single default swatch, and a matching grid", () => {
    buildFixture();
    hydrate();

    expect(widthInput().value).toBe("5");
    expect(heightInput().value).toBe("5");
    expect(swatches()).toHaveLength(1);
    expect(swatches()[0]?.getAttribute("aria-pressed")).toBe("true");
    expect(document.querySelectorAll("table td")).toHaveLength(25);
  });

  it("attaches to the default swatch already baked in the static page, rather than replacing it — preserving a contributor's focus", () => {
    buildFixture();
    const bakedSwatch = swatches()[0];
    bakedSwatch?.focus();

    hydrate();

    // Same DOM node reference as before hydration: a keyboard user already
    // focused on it (the contributor persona uses mouse *and* keyboard, see
    // .ux/product.md) never has their focus silently dropped to <body>.
    expect(document.activeElement).toBe(bakedSwatch);
    expect(swatches()[0]).toBe(bakedSwatch);
  });

  it("still attaches the toolbar and fits the canvas even if wiring the palette throws", async () => {
    buildFixture();
    const swatch = document.querySelector('[data-role="swatch"]');
    // Simulate a broken palette row (e.g. a future markup mismatch) without
    // touching the toolbar/canvas, which must keep attaching regardless.
    swatch?.remove();
    const brokenPalette = document.querySelector(
      '[data-role="editor-palette"]',
    );
    if (brokenPalette) {
      Object.defineProperty(brokenPalette, "querySelectorAll", {
        value: () => {
          throw new Error("simulated palette failure");
        },
      });
    }

    expect(() => hydrate()).not.toThrow();

    const eraseButton = document.querySelector(
      '[data-role="mode-erase"]',
    ) as Element;
    fireClick(eraseButton);
    expect(eraseButton.getAttribute("aria-pressed")).toBe("true");
  });

  it("paints a clicked cell with the active color in paint mode", () => {
    buildFixture();
    hydrate();

    fireClick(cell(0, 0));

    expect(cell(0, 0).style.backgroundColor).not.toBe("");
  });

  it("erases a painted cell when erase mode is active", () => {
    buildFixture();
    hydrate();

    fireClick(cell(0, 0));
    expect(cell(0, 0).style.backgroundColor).not.toBe("");

    fireClick(document.querySelector('[data-role="mode-erase"]') as Element);
    fireClick(cell(0, 0));

    expect(cell(0, 0).style.backgroundColor).toBe("");
  });

  it("keeps paint and erase mode mutually exclusive via aria-pressed", () => {
    buildFixture();
    hydrate();

    const paint = document.querySelector('[data-role="mode-paint"]') as Element;
    const erase = document.querySelector('[data-role="mode-erase"]') as Element;

    expect(paint.getAttribute("aria-pressed")).toBe("true");
    expect(erase.getAttribute("aria-pressed")).toBe("false");

    fireClick(erase);
    expect(paint.getAttribute("aria-pressed")).toBe("false");
    expect(erase.getAttribute("aria-pressed")).toBe("true");
  });

  it("resizing preserves painted cells still in bounds and drops the rest, live", () => {
    buildFixture();
    hydrate();

    fireClick(cell(0, 0));
    const paintedColor = cell(0, 0).style.backgroundColor;

    fireChange(widthInput(), "2");
    fireChange(heightInput(), "2");

    expect(document.querySelectorAll("table td")).toHaveLength(4);
    expect(cell(0, 0).style.backgroundColor).toBe(paintedColor);

    fireChange(widthInput(), "5");
    fireChange(heightInput(), "5");

    expect(document.querySelectorAll("table td")).toHaveLength(25);
    expect(cell(0, 0).style.backgroundColor).toBe(paintedColor);
    expect(cell(4, 4).style.backgroundColor).toBe("");
  });

  it("shows a translated error and reverts the field when width is zero", () => {
    buildFixture();
    hydrate();

    fireChange(widthInput(), "0");

    expect(errorRegion().textContent).toBe(
      "⚠ Width and height must be whole numbers greater than 0.",
    );
    expect(widthInput().value).toBe("5");
    expect(document.querySelectorAll("table td")).toHaveLength(25);
  });

  it("shows the same translated error and reverts the field when height is negative", () => {
    buildFixture();
    hydrate();

    fireChange(heightInput(), "-3");

    expect(errorRegion().textContent).toBe(
      "⚠ Width and height must be whole numbers greater than 0.",
    );
    expect(heightInput().value).toBe("5");
    expect(document.querySelectorAll("table td")).toHaveLength(25);
  });

  it("shows the same translated error and reverts the field when width is non-numeric", () => {
    buildFixture();
    hydrate();

    fireChange(widthInput(), "abc");

    expect(errorRegion().textContent).toBe(
      "⚠ Width and height must be whole numbers greater than 0.",
    );
    expect(widthInput().value).toBe("5");
    expect(document.querySelectorAll("table td")).toHaveLength(25);
  });

  it("clears the resize error once a valid width is entered", () => {
    buildFixture();
    hydrate();

    fireChange(widthInput(), "0");
    expect(errorRegion().textContent).not.toBe("");

    fireChange(widthInput(), "7");

    expect(errorRegion().textContent).toBe("");
    expect(widthInput().value).toBe("7");
    expect(document.querySelectorAll("table td")).toHaveLength(35);
  });

  it("exactly one swatch is pressed/checked at a time, and clicking another moves it", () => {
    buildFixture();
    hydrate();

    fireClick(
      document.querySelector('[data-role="editor-add-color"]') as Element,
    );
    const rows = swatches();
    expect(rows).toHaveLength(2);

    fireClick(rows[1]);
    const afterClick = swatches();
    const pressed = afterClick.filter(
      (button) => button.getAttribute("aria-pressed") === "true",
    );
    expect(pressed).toHaveLength(1);
    expect(pressed[0]).toBe(afterClick[1]);
    expect(pressed[0]?.textContent).toBe("✓");
  });

  it("removing a used palette color clears its cells and re-indexes higher colors", () => {
    buildFixture();
    hydrate();

    // Add a second color and paint a cell with it.
    fireClick(
      document.querySelector('[data-role="editor-add-color"]') as Element,
    );
    fireClick(swatches()[1]);
    fireClick(cell(1, 1));
    const secondColor = cell(1, 1).style.backgroundColor;
    expect(secondColor).not.toBe("");

    // Paint another cell with the first color for contrast.
    fireClick(swatches()[0]);
    fireClick(cell(0, 0));

    // Remove the first color — cells painted with it must clear, and the
    // second color's cells must repaint at its new (shifted) index.
    fireClick(
      document.querySelector(
        '[data-role="palette-remove"][data-color-index="0"]',
      ) as Element,
    );

    expect(swatches()).toHaveLength(1);
    expect(cell(0, 0).style.backgroundColor).toBe("");
    expect(cell(1, 1).style.backgroundColor).toBe(secondColor);
  });

  it("disables removing the last remaining palette color", () => {
    buildFixture();
    hydrate();

    const remove = document.querySelector(
      '[data-role="palette-remove"]',
    ) as HTMLButtonElement;
    expect(remove.disabled).toBe(true);
  });

  it("gives each palette color's swatch, color input and remove button a distinct, position-numbered aria-label", () => {
    buildFixture();
    hydrate();

    fireClick(
      document.querySelector('[data-role="editor-add-color"]') as Element,
    );
    fireClick(
      document.querySelector('[data-role="editor-add-color"]') as Element,
    );

    expect(swatches().map((el) => el.getAttribute("aria-label"))).toEqual([
      "Select color 1",
      "Select color 2",
      "Select color 3",
    ]);
    expect(colorInputs().map((el) => el.getAttribute("aria-label"))).toEqual([
      "Edit color 1",
      "Edit color 2",
      "Edit color 3",
    ]);
    expect(removeButtons().map((el) => el.getAttribute("aria-label"))).toEqual([
      "Remove color 1",
      "Remove color 2",
      "Remove color 3",
    ]);
  });

  it("renumbers the remaining swatches' aria-labels contiguously after removing a middle palette color", () => {
    buildFixture();
    hydrate();
    fireClick(
      document.querySelector('[data-role="editor-add-color"]') as Element,
    );
    fireClick(
      document.querySelector('[data-role="editor-add-color"]') as Element,
    );

    fireClick(
      document.querySelector(
        '[data-role="palette-remove"][data-color-index="1"]',
      ) as Element,
    );

    expect(swatches().map((el) => el.getAttribute("aria-label"))).toEqual([
      "Select color 1",
      "Select color 2",
    ]);
  });

  it("exports a valid puzzle and triggers a download named after the filename", () => {
    buildFixture();
    hydrate();
    const { createObjectURL } = stubDownload();

    fireClick(cell(0, 0));
    fireChange(nameInput(), "Small Heart");
    fireChange(filenameInput(), "small-heart");
    fireClick(exportButton());

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(errorRegion().textContent).toBe("");
  });

  it("shows a confirmation naming the exported file after a successful export", () => {
    buildFixture();
    hydrate();
    stubDownload();

    fireChange(nameInput(), "Small Heart");
    fireChange(filenameInput(), "small-heart");
    fireClick(exportButton());

    expect(confirmationRegion().textContent).toBe(
      "✓ Exported small-heart.json — download started.",
    );
    expect(errorRegion().textContent).toBe("");
  });

  it("shows a fixed, translated error and downloads nothing when the name is empty", () => {
    buildFixture();
    hydrate();
    const { createObjectURL } = stubDownload();

    fireChange(filenameInput(), "small-heart");
    fireClick(exportButton());

    expect(createObjectURL).not.toHaveBeenCalled();
    expect(errorRegion().textContent).toBe("⚠ Puzzle name is required.");
    expect(confirmationRegion().textContent).toBe("");
  });

  it("shows a fixed, translated error and downloads nothing when the filename is empty", () => {
    buildFixture();
    hydrate();
    const { createObjectURL } = stubDownload();

    fireChange(nameInput(), "Small Heart");
    fireClick(exportButton());

    expect(createObjectURL).not.toHaveBeenCalled();
    expect(errorRegion().textContent).toBe("⚠ Filename is required.");
    expect(confirmationRegion().textContent).toBe("");
  });

  it("clears a leftover confirmation once a later export attempt fails", () => {
    buildFixture();
    hydrate();
    stubDownload();

    fireChange(nameInput(), "Small Heart");
    fireChange(filenameInput(), "small-heart");
    fireClick(exportButton());
    expect(confirmationRegion().textContent).not.toBe("");

    fireChange(filenameInput(), "");
    fireClick(exportButton());

    expect(confirmationRegion().textContent).toBe("");
    expect(errorRegion().textContent).toBe("⚠ Filename is required.");
  });

  it("clears a leftover error once a later export attempt succeeds", () => {
    buildFixture();
    hydrate();
    stubDownload();

    fireChange(filenameInput(), "small-heart");
    fireClick(exportButton());
    expect(errorRegion().textContent).not.toBe("");

    fireChange(nameInput(), "Small Heart");
    fireClick(exportButton());

    expect(errorRegion().textContent).toBe("");
    expect(confirmationRegion().textContent).toBe(
      "✓ Exported small-heart.json — download started.",
    );
  });

  it("floors a wide canvas's font-size at the legible minimum instead of shrinking further to still fit a narrow screen", () => {
    buildFixture();

    // Mirrors a contributor drafting a wide puzzle on a narrow device: a
    // canvas-still-open scrollWidth of 913px on a 350px-wide screen.
    // Shrinking to actually fit 342px of available width would need a scale
    // of roughly 0.37 — below the 10px/16px (~0.625) legibility floor — so
    // the canvas must now stop shrinking at the floor and rely on the
    // wrapper's own scrolling instead (see
    // .vibe/decisions/032-grid-legibility-floor-scrolls-instead-of-clipping.md).
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

    const wrapper = document.querySelector<HTMLElement>(
      '[data-role="editor-grid-wrapper"]',
    );
    // 10px is the concrete minimum legible font-size the floor is derived
    // from — a still-too-low floor (e.g. the old 0.3 ratio, ~4.8px) would
    // instead let the raw fit-to-width ratio through unclamped here.
    expect(wrapper?.style.fontSize).toBe("10px");
  });
});

function fireKeydown(el: Element, key: string): KeyboardEvent {
  const event = new KeyboardEvent("keydown", { key, bubbles: true });
  el.dispatchEvent(event);
  return event;
}

describe("keyboard grid operation", () => {
  it("makes exactly one cell a tab stop, the rest excluded from tab order", () => {
    buildFixture();
    hydrate();

    expect(cell(0, 0).tabIndex).toBe(0);
    expect(cell(1, 0).tabIndex).toBe(-1);
    expect(cell(4, 4).tabIndex).toBe(-1);
  });

  it("gives every cell a state-describing aria-label, starting as empty", () => {
    buildFixture();
    hydrate();

    expect(cell(0, 0).getAttribute("aria-label")).toBe("Empty");
    expect(cell(0, 0).getAttribute("data-i18n-aria")).toBe(
      "editor.cellEmptyAriaLabel",
    );
  });

  it("updates a cell's aria-label to its color after painting it", () => {
    buildFixture();
    hydrate();

    fireClick(cell(0, 0));

    expect(cell(0, 0).getAttribute("aria-label")).toBe("Color 1");
    expect(cell(0, 0).getAttribute("data-i18n-aria")).toBe(
      "editor.cellColorAriaLabel",
    );
  });

  it("reverts a cell's aria-label to empty after erasing it", () => {
    buildFixture();
    hydrate();

    fireClick(cell(0, 0));
    fireClick(document.querySelector('[data-role="mode-erase"]') as Element);
    fireClick(cell(0, 0));

    expect(cell(0, 0).getAttribute("aria-label")).toBe("Empty");
    expect(cell(0, 0).getAttribute("data-i18n-aria")).toBe(
      "editor.cellEmptyAriaLabel",
    );
  });

  it("moves focus and the roving tab stop with the arrow keys", () => {
    buildFixture();
    hydrate();
    cell(0, 0).focus();

    fireKeydown(cell(0, 0), "ArrowRight");

    expect(document.activeElement).toBe(cell(1, 0));
    expect(cell(1, 0).tabIndex).toBe(0);
    expect(cell(0, 0).tabIndex).toBe(-1);
  });

  it("clamps arrow navigation at the grid edge instead of leaving the grid", () => {
    buildFixture();
    hydrate();
    cell(0, 0).focus();

    const event = fireKeydown(cell(0, 0), "ArrowUp");

    expect(document.activeElement).toBe(cell(0, 0));
    expect(event.defaultPrevented).toBe(true);
  });

  it("keeps the roving tab stop in sync when a cell is focused by click", () => {
    buildFixture();
    hydrate();

    cell(2, 1).focus();

    expect(cell(2, 1).tabIndex).toBe(0);
    expect(cell(0, 0).tabIndex).toBe(-1);
  });

  it("paints the focused cell on Enter, the same as a click", () => {
    buildFixture();
    hydrate();
    cell(0, 0).focus();

    fireKeydown(cell(0, 0), "Enter");

    expect(cell(0, 0).style.backgroundColor).not.toBe("");
    expect(cell(0, 0).getAttribute("aria-label")).toBe("Color 1");
  });

  it("paints the focused cell on Space, the same as a click", () => {
    buildFixture();
    hydrate();
    cell(0, 0).focus();

    const event = fireKeydown(cell(0, 0), " ");

    expect(cell(0, 0).style.backgroundColor).not.toBe("");
    expect(event.defaultPrevented).toBe(true);
  });

  it("erases the focused cell on Enter when erase mode is active", () => {
    buildFixture();
    hydrate();
    fireClick(cell(0, 0));
    fireClick(document.querySelector('[data-role="mode-erase"]') as Element);
    cell(0, 0).focus();

    fireKeydown(cell(0, 0), "Enter");

    expect(cell(0, 0).style.backgroundColor).toBe("");
  });

  it("ignores a key it doesn't handle, painting nothing and keeping focus put", () => {
    buildFixture();
    hydrate();
    cell(0, 0).focus();

    fireKeydown(cell(0, 0), "a");

    expect(cell(0, 0).style.backgroundColor).toBe("");
    expect(document.activeElement).toBe(cell(0, 0));
  });

  it("restores focus to the same (clamped) cell after a resize shrinks the grid", () => {
    buildFixture();
    hydrate();
    cell(4, 4).focus();

    fireChange(widthInput(), "2");
    fireChange(heightInput(), "2");

    expect(document.activeElement).toBe(cell(1, 1));
    expect(cell(1, 1).tabIndex).toBe(0);
  });

  it("does not steal focus into the grid when a resize is triggered from outside it", () => {
    buildFixture();
    hydrate();
    // Focus never enters the grid in this scenario — the width input drives
    // the resize, matching how a contributor actually triggers one.
    widthInput().focus();

    fireChange(widthInput(), "2");

    expect(document.activeElement).toBe(widthInput());
  });

  it("re-translates a painted cell's aria-label on a language switch", () => {
    buildFixture();
    hydrate();
    fireClick(cell(0, 0));

    const select = document.querySelector<HTMLSelectElement>(
      '[data-role="language-switcher-select"]',
    );
    if (select) {
      select.value = "fr";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }

    expect(cell(0, 0).getAttribute("aria-label")).toBe("Couleur 1");
  });

  it("gives the canvas grid/row/cell roles labelled by the Canvas heading", () => {
    buildFixture();
    hydrate();

    const table = document.querySelector("table");
    const labelId = table?.getAttribute("aria-labelledby");
    expect(table?.getAttribute("role")).toBe("grid");
    expect(labelId).toBeTruthy();
    expect(document.getElementById(labelId ?? "")?.textContent).toBe(
      "Canvas",
    );
    expect(document.querySelector("tr")?.getAttribute("role")).toBe("row");
    expect(cell(0, 0).getAttribute("role")).toBe("gridcell");
  });
});

describe("image import", () => {
  afterEach(() => {
    vi.mocked(decodeImageFile).mockReset();
    vi.unstubAllGlobals();
  });

  it("shows an inline error and never decodes when no file is chosen", async () => {
    buildFixture();
    hydrate();

    fireClick(importButton());
    await flushAsync();

    expect(decodeImageFile).not.toHaveBeenCalled();
    expect(importErrorRegion().textContent).toMatch(/choose an image file/i);
    // The shared bottom region is Export-only feedback now — Import never
    // writes into it.
    expect(errorRegion().textContent).toBe("");
  });

  it("shows an inline error and never decodes when the palette size is out of range", async () => {
    buildFixture();
    hydrate();
    setImportFile(pngFile());
    fireChange(importPaletteSizeInput(), "17");

    fireClick(importButton());
    await flushAsync();

    expect(decodeImageFile).not.toHaveBeenCalled();
    expect(importErrorRegion().textContent).toMatch(/palette size/i);
  });

  it("imports directly with no confirmation when the grid is still empty", async () => {
    buildFixture();
    hydrate();
    setImportFile(pngFile());
    const confirmSpy = vi.fn(() => false);
    vi.stubGlobal("confirm", confirmSpy);
    vi.mocked(decodeImageFile).mockResolvedValueOnce({
      width: 1,
      height: 1,
      data: new Uint8ClampedArray([10, 20, 30, 255]),
    });

    fireClick(importButton());
    await flushAsync();

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(swatches()).toHaveLength(1);
    expect(importErrorRegion().textContent).toBe("");
  });

  it("asks for confirmation before overwriting an already-painted grid, and applies nothing when declined", async () => {
    buildFixture();
    hydrate();
    fireClick(cell(0, 0)); // paint something first
    setImportFile(pngFile());
    const confirmSpy = vi.fn(() => false);
    vi.stubGlobal("confirm", confirmSpy);

    fireClick(importButton());
    await flushAsync();

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(decodeImageFile).not.toHaveBeenCalled();
    expect(cell(0, 0).style.backgroundColor).not.toBe("");
  });

  it("replaces the palette/cells and switches to paint mode once confirmed", async () => {
    buildFixture();
    hydrate();
    fireClick(cell(0, 0));
    fireClick(document.querySelector('[data-role="mode-erase"]') as Element);
    setImportFile(pngFile());
    vi.stubGlobal(
      "confirm",
      vi.fn(() => true),
    );
    vi.mocked(decodeImageFile).mockResolvedValueOnce({
      width: 1,
      height: 1,
      data: new Uint8ClampedArray([200, 0, 0, 255]),
    });

    fireClick(importButton());
    await flushAsync();

    expect(swatches()).toHaveLength(1);
    expect(swatches()[0]?.style.backgroundColor).toBe("rgb(200, 0, 0)");
    expect(
      (
        document.querySelector('[data-role="mode-paint"]') as Element
      ).getAttribute("aria-pressed"),
    ).toBe("true");
    expect(importErrorRegion().textContent).toBe("");
  });

  it("uses the width/height fields' value at click time, not at file-pick time", async () => {
    buildFixture();
    hydrate();
    setImportFile(pngFile());
    fireChange(widthInput(), "3");
    fireChange(heightInput(), "2");
    vi.stubGlobal(
      "confirm",
      vi.fn(() => true),
    );
    vi.mocked(decodeImageFile).mockResolvedValueOnce({
      width: 1,
      height: 1,
      data: new Uint8ClampedArray([0, 0, 0, 255]),
    });

    fireClick(importButton());
    await flushAsync();

    expect(document.querySelectorAll("table td")).toHaveLength(6);
  });

  it("surfaces a fixed, translated error for an unreadable file and leaves the previous grid untouched", async () => {
    buildFixture();
    hydrate();
    fireClick(cell(0, 0));
    const paintedColor = cell(0, 0).style.backgroundColor;
    setImportFile(pngFile());
    vi.mocked(decodeImageFile).mockRejectedValueOnce(
      new ImageDecodeError("unreadable", "Could not read this image file."),
    );
    vi.stubGlobal(
      "confirm",
      vi.fn(() => true),
    );

    fireClick(importButton());
    await flushAsync();

    expect(importErrorRegion().textContent).toBe(
      "⚠ Couldn't read this image file. Try a different one.",
    );
    expect(cell(0, 0).style.backgroundColor).toBe(paintedColor);
    expect(errorRegion().textContent).toBe("");
  });

  it("leaves an import error visible in its own region after an unrelated successful export, since the two panels no longer share one node", async () => {
    buildFixture();
    hydrate();
    stubDownload();
    fireClick(importButton()); // no file chosen -> import error
    await flushAsync();
    expect(importErrorRegion().textContent).not.toBe("");

    fireChange(nameInput(), "Small Heart");
    fireChange(filenameInput(), "small-heart");
    fireClick(exportButton());

    expect(errorRegion().textContent).toBe("");
    expect(importErrorRegion().textContent).not.toBe("");
  });

  it("surfaces a fixed, translated error when the browser can't decode images", async () => {
    buildFixture();
    hydrate();
    setImportFile(pngFile());
    vi.mocked(decodeImageFile).mockRejectedValueOnce(
      new ImageDecodeError(
        "unsupported",
        "This browser can't decode images for import.",
      ),
    );

    fireClick(importButton());
    await flushAsync();

    expect(importErrorRegion().textContent).toBe(
      "⚠ This browser can't import images.",
    );
  });

  it("normalizes an unexpected/raw browser exception to the generic fallback message, never showing its own text", async () => {
    buildFixture();
    hydrate();
    setImportFile(pngFile());
    vi.mocked(decodeImageFile).mockRejectedValueOnce(
      new ImageDecodeError(
        "unknown",
        "Failed to execute 'getImageData' on 'CanvasRenderingContext2D': The source width is 0.",
      ),
    );

    fireClick(importButton());
    await flushAsync();

    expect(importErrorRegion().textContent).toBe(
      "⚠ Something went wrong. Please try again.",
    );
    expect(importErrorRegion().textContent).not.toMatch(
      /getImageData|source width/,
    );
  });

  it("re-enables the import controls after a failed import", async () => {
    buildFixture();
    hydrate();
    setImportFile(pngFile());
    vi.mocked(decodeImageFile).mockRejectedValueOnce(
      new ImageDecodeError("unknown", "broken"),
    );

    fireClick(importButton());
    await flushAsync();

    expect(importFileInput().disabled).toBe(false);
    expect(importPaletteSizeInput().disabled).toBe(false);
    expect(importButton().disabled).toBe(false);
  });

  describe("decode timeout", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("shows a clear timeout message and re-enables the controls when decoding never finishes", async () => {
      buildFixture();
      hydrate();
      fireClick(cell(0, 0));
      const paintedColor = cell(0, 0).style.backgroundColor;
      setImportFile(pngFile());
      vi.mocked(decodeImageFile).mockReturnValueOnce(new Promise(() => {}));
      vi.stubGlobal(
        "confirm",
        vi.fn(() => true),
      );

      fireClick(importButton());
      await vi.advanceTimersByTimeAsync(0); // handleImport's own pre-decode yield
      await vi.advanceTimersByTimeAsync(15000);

      expect(importErrorRegion().textContent).toBe(
        "⚠ This image took too long to load.",
      );
      expect(importFileInput().disabled).toBe(false);
      expect(importPaletteSizeInput().disabled).toBe(false);
      expect(importButton().disabled).toBe(false);
      expect(cell(0, 0).style.backgroundColor).toBe(paintedColor);
    });

    it("completes a normal import that finishes just under the timeout, never showing the timeout message", async () => {
      buildFixture();
      hydrate();
      setImportFile(pngFile());
      let resolveDecode: (value: {
        width: number;
        height: number;
        data: Uint8ClampedArray;
      }) => void = () => {};
      vi.mocked(decodeImageFile).mockReturnValueOnce(
        new Promise((resolve) => {
          resolveDecode = resolve;
        }),
      );

      fireClick(importButton());
      await vi.advanceTimersByTimeAsync(0);
      await vi.advanceTimersByTimeAsync(14900);
      resolveDecode({
        width: 1,
        height: 1,
        data: new Uint8ClampedArray([10, 20, 30, 255]),
      });
      await vi.advanceTimersByTimeAsync(0);

      expect(importErrorRegion().textContent).toBe("");
      expect(swatches()).toHaveLength(1);

      // The now-irrelevant timer must not fire afterward and overwrite success.
      await vi.advanceTimersByTimeAsync(200);
      expect(importErrorRegion().textContent).toBe("");
    });
  });
});

describe("language switcher", () => {
  it("defaults to the language detected from the browser when there is no saved cookie", () => {
    setNavigatorLanguage("fr-FR");
    buildFixture();

    hydrate();

    expect(switcherSelect().value).toBe("fr");
    expect(document.querySelector("h1")?.textContent).toBe("Éditeur de puzzle");
  });

  it("falls back to English when the browser language is not supported", () => {
    setNavigatorLanguage("de-DE");
    buildFixture();

    hydrate();

    expect(switcherSelect().value).toBe("en");
  });

  it("prefers a saved cookie over the browser-detected language", () => {
    document.cookie = "kindle-nonograms-locale=fr; path=/";
    setNavigatorLanguage("en-US");
    buildFixture();

    hydrate();

    expect(switcherSelect().value).toBe("fr");
  });

  it("retranslates the toolbar's data-i18n text and the palette's aria-labels immediately, with no reload, when the language is changed", () => {
    buildFixture();
    hydrate();

    switcherSelect().value = "fr";
    switcherSelect().dispatchEvent(new Event("change"));

    expect(document.documentElement.lang).toBe("fr");
    expect(
      document.querySelector('[data-role="mode-paint"]')?.textContent,
    ).toBe("Peindre");
    expect(swatches()[0]?.getAttribute("aria-label")).toBe(
      "Choisir la couleur 1",
    );
  });

  it("saves the chosen language in a cookie, read back as the priority source on the next load", () => {
    buildFixture();
    hydrate();

    switcherSelect().value = "fr";
    switcherSelect().dispatchEvent(new Event("change"));

    expect(document.cookie).toContain("kindle-nonograms-locale=fr");
  });

  it("keeps using the switched language for the toolbar/palette after a later edit rebuilds them, instead of reverting to English", () => {
    buildFixture();
    hydrate();
    switcherSelect().value = "fr";
    switcherSelect().dispatchEvent(new Event("change"));

    fireClick(
      document.querySelector('[data-role="editor-add-color"]') as Element,
    );

    const toolbarPaint = document.querySelector('[data-role="mode-paint"]');
    expect(toolbarPaint?.textContent).toBe("Peindre");
    expect(swatches()[0]?.getAttribute("aria-label")).toBe(
      "Choisir la couleur 1",
    );
  });

  it("preserves focus on the currently focused control across a language switch", () => {
    buildFixture();
    hydrate();
    const colorInput = document.querySelector(
      '[data-role="palette-color-input"]',
    ) as HTMLInputElement;
    colorInput.focus();

    switcherSelect().value = "fr";
    switcherSelect().dispatchEvent(new Event("change"));

    expect(document.activeElement).toBe(colorInput);
  });

  it("shows fixed, translated export/import error messages in the switched language", () => {
    buildFixture();
    hydrate();
    switcherSelect().value = "fr";
    switcherSelect().dispatchEvent(new Event("change"));

    fireChange(filenameInput(), "small-heart");
    fireClick(exportButton());

    expect(errorRegion().textContent).toBe("⚠ Le nom du puzzle est requis.");
  });

  it("shows the export confirmation message in the switched language", () => {
    buildFixture();
    hydrate();
    stubDownload();
    switcherSelect().value = "fr";
    switcherSelect().dispatchEvent(new Event("change"));

    fireChange(nameInput(), "Small Heart");
    fireChange(filenameInput(), "small-heart");
    fireClick(exportButton());

    expect(confirmationRegion().textContent).toBe(
      "✓ Exporté small-heart.json — téléchargement lancé.",
    );
  });
});
