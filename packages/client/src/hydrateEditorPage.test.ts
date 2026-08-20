// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import {
  addPaletteColor,
  buildPuzzleCandidate,
  createEmptyCells,
  hydrate,
  paintCell,
  removePaletteColor,
  resizeCells,
  triggerDownload,
  updatePaletteColor,
} from "./hydrateEditorPage.js";

// Mirrors what renderEditorPage.ts actually produces, so this fixture stays
// representative of real server-rendered markup (same convention as
// hydrateLibraryPage.test.ts's own fixture builder).
function buildFixture(): void {
  document.body.innerHTML = `
<div class="chrome-panel" data-role="editor-page">
<div class="page-header">
<a class="back-link" href="../"><span aria-hidden="true">←</span><span class="sr-only" data-i18n="play.backToLibrary">Back to puzzle list</span></a>
<h1 data-i18n="editor.title">Puzzle Editor</h1>
<div class="page-header-controls"></div>
</div>
</div>
<div class="panel editor-panel">
<div class="editor-size-controls">
<label for="editor-width">Width</label>
<input type="number" id="editor-width" min="1" data-role="editor-width" />
<label for="editor-height">Height</label>
<input type="number" id="editor-height" min="1" data-role="editor-height" />
</div>
</div>
<div class="panel editor-panel">
<div class="editor-palette" data-role="editor-palette"></div>
</div>
<div class="panel editor-panel">
<div class="editor-toolbar" data-role="editor-toolbar"></div>
<div class="grid-center">
<div class="grid-wrapper" data-role="editor-grid-wrapper"></div>
</div>
</div>
<div class="panel editor-panel">
<div class="editor-meta">
<label for="editor-name">Puzzle name</label>
<input type="text" id="editor-name" data-role="editor-name" />
<label for="editor-filename">Filename (id)</label>
<input type="text" id="editor-filename" data-role="editor-filename" />
<button type="button" data-role="editor-export">Export</button>
<p class="editor-error" data-role="editor-error" aria-live="polite"></p>
</div>
</div>`;
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
function swatches(): HTMLButtonElement[] {
  return Array.from(document.querySelectorAll('[data-role="swatch"]'));
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

  it("ignores a resize to an invalid (non-positive) dimension", () => {
    buildFixture();
    hydrate();

    fireChange(widthInput(), "0");

    expect(widthInput().value).toBe("5");
    expect(document.querySelectorAll("table td")).toHaveLength(25);
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

  it("shows the validation error inline and downloads nothing when the name is empty", () => {
    buildFixture();
    hydrate();
    const { createObjectURL } = stubDownload();

    fireChange(filenameInput(), "small-heart");
    fireClick(exportButton());

    expect(createObjectURL).not.toHaveBeenCalled();
    expect(errorRegion().textContent).toMatch(/name must not be empty/i);
  });
});
