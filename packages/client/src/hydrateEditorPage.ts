import { type Puzzle, createPuzzle } from "@kindle-nonograms/shared";
import { contrastingTextColor } from "./contrastColor.js";
import { decodeImageFile } from "./decodeImageFile.js";
import { computeFitFontSizePx } from "./fitGrid.js";
import { buildImportedGrid } from "./imageQuantize.js";

type EditorMode = "paint" | "erase";

interface EditorState {
  width: number;
  height: number;
  palette: string[];
  cells: (number | null)[][];
  mode: EditorMode;
  activeColorIndex: number;
  name: string;
  filename: string;
  hasUnsavedChanges: boolean;
}

const DEFAULT_WIDTH = 5;
const DEFAULT_HEIGHT = 5;
const DEFAULT_PALETTE = ["#000000"];
const NEW_COLOR_DEFAULT = "#888888";
const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

// Kept in sync with `packages/site/src/renderEditorPage.ts`'s
// `#editor-import-palette-size` input's own `max`.
const MAX_IMPORT_PALETTE_SIZE = 16;

// Same grid-fit tuning as hydratePlayPage.ts's own reused constants — this
// tool isn't a Kindle page, but reusing fitGrid.ts keeps a resizable editor
// canvas from ever overflowing the viewport regardless of how large a
// puzzle a contributor is drafting.
const BASE_FONT_SIZE_PX = 16;
const MIN_GRID_SCALE = 0.3;
const MAX_GRID_SCALE = 2;
const VIEWPORT_GUTTER_PX = 8;

/** Builds a `width` x `height` grid of untouched (`null`) cells. */
export function createEmptyCells(
  width: number,
  height: number,
): (number | null)[][] {
  return Array.from({ length: height }, () => Array(width).fill(null));
}

/**
 * Resizes a solution grid to `width` x `height`, preserving every cell
 * still in bounds and filling newly added cells with `null` — never
 * resurrecting content a previous shrink already dropped.
 */
export function resizeCells(
  cells: (number | null)[][],
  width: number,
  height: number,
): (number | null)[][] {
  return Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => cells[y]?.[x] ?? null),
  );
}

/**
 * Returns a new grid with `(x, y)` set to `value`. Out-of-range coordinates
 * are a no-op, returning the exact same `cells` reference — defensive
 * against a stale click handler firing after a resize shrank the grid.
 */
export function paintCell(
  cells: (number | null)[][],
  x: number,
  y: number,
  value: number | null,
): (number | null)[][] {
  if (y < 0 || y >= cells.length || x < 0 || x >= (cells[y]?.length ?? 0)) {
    return cells;
  }

  return cells.map((row, rowIndex) =>
    rowIndex === y
      ? row.map((cell, colIndex) => (colIndex === x ? value : cell))
      : row,
  );
}

/** Appends a new palette color. */
export function addPaletteColor(palette: string[], hex: string): string[] {
  return [...palette, hex];
}

/**
 * Replaces the color at `index` with `hex`, only when `hex` is a
 * well-formed `#rgb`/`#rrggbb` value — an in-progress, not-yet-valid typed
 * value is ignored rather than corrupting the palette, returning the exact
 * same `palette` reference so callers can skip re-rendering.
 */
export function updatePaletteColor(
  palette: string[],
  index: number,
  hex: string,
): string[] {
  if (index < 0 || index >= palette.length || !HEX_COLOR_PATTERN.test(hex)) {
    return palette;
  }

  return palette.map((color, i) => (i === index ? hex : color));
}

export interface RemovePaletteColorResult {
  palette: string[];
  cells: (number | null)[][];
  activeColorIndex: number;
}

/**
 * Removes the color at `index`. Every cell using it is cleared back to
 * `null` (it can't refer to anything else), and every cell using a later
 * color shifts its index down by one to keep pointing at the same color in
 * the shortened palette. `activeColorIndex` is re-mapped the same way: reset
 * to 0 if it pointed at the removed color, shifted down if it pointed past
 * it. Refuses to drop the last remaining color (a puzzle's palette must
 * have at least one — see `createPuzzle`), returning every input unchanged.
 */
export function removePaletteColor(
  palette: string[],
  cells: (number | null)[][],
  index: number,
  activeColorIndex: number,
): RemovePaletteColorResult {
  if (palette.length <= 1 || index < 0 || index >= palette.length) {
    return { palette, cells, activeColorIndex };
  }

  const newPalette = palette.filter((_, i) => i !== index);
  const newCells = cells.map((row) =>
    row.map((value) => {
      if (value === index) return null;
      if (value !== null && value > index) return value - 1;
      return value;
    }),
  );
  const newActiveColorIndex =
    activeColorIndex === index
      ? 0
      : activeColorIndex > index
        ? activeColorIndex - 1
        : activeColorIndex;

  return {
    palette: newPalette,
    cells: newCells,
    activeColorIndex: newActiveColorIndex,
  };
}

export interface BuildPuzzleCandidateInput {
  id: string;
  name: string;
  width: number;
  height: number;
  palette: string[];
  cells: (number | null)[][];
}

/**
 * Trims the id/name (so a stray leading/trailing space typed into the
 * filename or name field never ships in the exported file) and hands the
 * result to `createPuzzle`, which throws a descriptive error for anything
 * structurally invalid — the single validation path the Export action
 * relies on (see .vibe/decisions/017-puzzle-editor-validates-on-export-only.md).
 */
export function buildPuzzleCandidate(input: BuildPuzzleCandidateInput): Puzzle {
  return createPuzzle({
    id: input.id.trim(),
    name: input.name.trim(),
    width: input.width,
    height: input.height,
    palette: input.palette,
    cells: input.cells,
  });
}

/**
 * Triggers a browser download of `content` as `filename`, via a throwaway
 * Blob URL and a synthetic anchor click — the only way to save a file from
 * a page with no server to hand it to (see .vibe/backlog/done/
 * 005-remove-express-server-package.md's no-runtime-server model).
 */
export function triggerDownload(filename: string, content: string): void {
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function parsePositiveInt(value: string): number | undefined {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function render(elements: EditorElements, state: EditorState): void {
  renderPalette(elements, state);
  renderToolbar(elements, state);
  renderGrid(elements, state);
}

function renderPalette(elements: EditorElements, state: EditorState): void {
  elements.palette.textContent = "";

  state.palette.forEach((hex, index) => {
    const row = document.createElement("div");
    row.className = "editor-palette-row";

    const swatch = document.createElement("button");
    swatch.type = "button";
    swatch.dataset.role = "swatch";
    swatch.dataset.colorIndex = String(index);
    swatch.setAttribute("aria-label", "Select color");
    const active = index === state.activeColorIndex;
    swatch.setAttribute("aria-pressed", String(active));
    swatch.style.backgroundColor = hex;
    swatch.style.color = contrastingTextColor(hex);
    swatch.textContent = active ? "✓" : "";
    swatch.addEventListener("click", () => {
      state.activeColorIndex = index;
      state.mode = "paint";
      render(elements, state);
    });

    const colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.dataset.role = "palette-color-input";
    colorInput.dataset.colorIndex = String(index);
    colorInput.value = hex;
    colorInput.setAttribute("aria-label", "Edit color");
    colorInput.addEventListener("change", () => {
      const updated = updatePaletteColor(
        state.palette,
        index,
        colorInput.value,
      );
      if (updated !== state.palette) {
        state.palette = updated;
        state.hasUnsavedChanges = true;
        render(elements, state);
      }
    });

    const remove = document.createElement("button");
    remove.type = "button";
    remove.dataset.role = "palette-remove";
    remove.dataset.colorIndex = String(index);
    remove.setAttribute("aria-label", "Remove color");
    remove.textContent = "×";
    remove.disabled = state.palette.length <= 1;
    remove.addEventListener("click", () => {
      const result = removePaletteColor(
        state.palette,
        state.cells,
        index,
        state.activeColorIndex,
      );
      if (result.palette !== state.palette) {
        state.palette = result.palette;
        state.cells = result.cells;
        state.activeColorIndex = result.activeColorIndex;
        state.hasUnsavedChanges = true;
        render(elements, state);
      }
    });

    row.append(swatch, colorInput, remove);
    elements.palette.append(row);
  });

  const addColor = document.createElement("button");
  addColor.type = "button";
  addColor.dataset.role = "editor-add-color";
  addColor.textContent = "+";
  addColor.setAttribute("aria-label", "Add color");
  addColor.addEventListener("click", () => {
    state.palette = addPaletteColor(state.palette, NEW_COLOR_DEFAULT);
    state.hasUnsavedChanges = true;
    render(elements, state);
  });
  elements.palette.append(addColor);
}

function renderToolbar(elements: EditorElements, state: EditorState): void {
  elements.toolbar.textContent = "";

  const paintButton = document.createElement("button");
  paintButton.type = "button";
  paintButton.dataset.role = "mode-paint";
  paintButton.textContent = "Paint";

  const eraseButton = document.createElement("button");
  eraseButton.type = "button";
  eraseButton.dataset.role = "mode-erase";
  eraseButton.textContent = "Erase";

  const refresh = (): void => {
    paintButton.setAttribute("aria-pressed", String(state.mode === "paint"));
    eraseButton.setAttribute("aria-pressed", String(state.mode === "erase"));
  };

  paintButton.addEventListener("click", () => {
    state.mode = "paint";
    refresh();
  });
  eraseButton.addEventListener("click", () => {
    state.mode = "erase";
    refresh();
  });
  refresh();

  elements.toolbar.append(paintButton, eraseButton);
}

function paintGridCell(
  td: HTMLTableCellElement,
  value: number | null,
  state: EditorState,
): void {
  td.style.backgroundColor = value === null ? "" : (state.palette[value] ?? "");
}

function renderGrid(elements: EditorElements, state: EditorState): void {
  const table = document.createElement("table");
  const tbody = document.createElement("tbody");

  for (let y = 0; y < state.height; y++) {
    const tr = document.createElement("tr");
    for (let x = 0; x < state.width; x++) {
      const td = document.createElement("td");
      td.dataset.row = String(y);
      td.dataset.col = String(x);
      paintGridCell(td, state.cells[y]?.[x] ?? null, state);
      tr.append(td);
    }
    tbody.append(tr);
  }

  table.append(tbody);
  elements.gridWrapper.textContent = "";
  elements.gridWrapper.append(table);
  applyGridFit(elements.gridWrapper, table);
}

/**
 * Scales the grid wrapper to fit the viewport, exactly mirroring
 * hydratePlayPage.ts's `applyGridFit` (see its doc comment for the full
 * reasoning) — reused here so an editor grid drafted much larger than any
 * shipped puzzle never overflows the page.
 */
function applyGridFit(wrapper: HTMLElement, table: HTMLElement): void {
  wrapper.style.fontSize = `${BASE_FONT_SIZE_PX}px`;

  const naturalWidth = table.scrollWidth;
  const naturalHeight = table.scrollHeight;
  const availableWidth =
    document.documentElement.clientWidth - VIEWPORT_GUTTER_PX;
  const availableHeight =
    document.documentElement.clientHeight -
    wrapper.getBoundingClientRect().top -
    VIEWPORT_GUTTER_PX;

  const fontSizePx = computeFitFontSizePx({
    naturalWidth,
    naturalHeight,
    availableWidth,
    availableHeight,
    baseFontSizePx: BASE_FONT_SIZE_PX,
    minScale: MIN_GRID_SCALE,
    maxScale: MAX_GRID_SCALE,
  });

  wrapper.style.fontSize = `${fontSizePx}px`;
  wrapper.style.maxWidth = `${Math.max(availableWidth, 0)}px`;
  wrapper.style.maxHeight = `${Math.max(availableHeight, 0)}px`;
}

interface EditorElements {
  root: HTMLElement;
  width: HTMLInputElement;
  height: HTMLInputElement;
  palette: HTMLElement;
  toolbar: HTMLElement;
  gridWrapper: HTMLElement;
  name: HTMLInputElement;
  filename: HTMLInputElement;
  exportButton: HTMLButtonElement;
  error: HTMLElement;
  importFile: HTMLInputElement;
  importPaletteSize: HTMLInputElement;
  importBackground: HTMLInputElement;
  importButton: HTMLButtonElement;
}

function findElements(): EditorElements | undefined {
  const root = document.querySelector<HTMLElement>('[data-role="editor-page"]');
  const width = document.querySelector<HTMLInputElement>(
    '[data-role="editor-width"]',
  );
  const height = document.querySelector<HTMLInputElement>(
    '[data-role="editor-height"]',
  );
  const palette = document.querySelector<HTMLElement>(
    '[data-role="editor-palette"]',
  );
  const toolbar = document.querySelector<HTMLElement>(
    '[data-role="editor-toolbar"]',
  );
  const gridWrapper = document.querySelector<HTMLElement>(
    '[data-role="editor-grid-wrapper"]',
  );
  const name = document.querySelector<HTMLInputElement>(
    '[data-role="editor-name"]',
  );
  const filename = document.querySelector<HTMLInputElement>(
    '[data-role="editor-filename"]',
  );
  const exportButton = document.querySelector<HTMLButtonElement>(
    '[data-role="editor-export"]',
  );
  const error = document.querySelector<HTMLElement>(
    '[data-role="editor-error"]',
  );
  const importFile = document.querySelector<HTMLInputElement>(
    '[data-role="editor-import-file"]',
  );
  const importPaletteSize = document.querySelector<HTMLInputElement>(
    '[data-role="editor-import-palette-size"]',
  );
  const importBackground = document.querySelector<HTMLInputElement>(
    '[data-role="editor-import-background"]',
  );
  const importButton = document.querySelector<HTMLButtonElement>(
    '[data-role="editor-import-button"]',
  );

  if (
    !root ||
    !width ||
    !height ||
    !palette ||
    !toolbar ||
    !gridWrapper ||
    !name ||
    !filename ||
    !exportButton ||
    !error ||
    !importFile ||
    !importPaletteSize ||
    !importBackground ||
    !importButton
  ) {
    return undefined;
  }

  return {
    root,
    width,
    height,
    palette,
    toolbar,
    gridWrapper,
    name,
    filename,
    exportButton,
    error,
    importFile,
    importPaletteSize,
    importBackground,
    importButton,
  };
}

function handleResize(
  elements: EditorElements,
  state: EditorState,
  input: HTMLInputElement,
  apply: (value: number) => void,
  previous: number,
): void {
  const parsed = parsePositiveInt(input.value);
  if (parsed === undefined) {
    input.value = String(previous);
    return;
  }

  apply(parsed);
  state.cells = resizeCells(state.cells, state.width, state.height);
  state.hasUnsavedChanges = true;
  render(elements, state);
}

function parseImportPaletteSize(value: string): number | undefined {
  const parsed = Number(value);
  return Number.isInteger(parsed) &&
    parsed >= 1 &&
    parsed <= MAX_IMPORT_PALETTE_SIZE
    ? parsed
    : undefined;
}

function hasPaintedContent(cells: (number | null)[][]): boolean {
  return cells.some((row) => row.some((value) => value !== null));
}

/**
 * Decodes the picked file, downsamples/quantizes it to the grid's *current*
 * width/height (read now, at click time — not whenever the file was picked,
 * since the size fields stay live-editable in between), and replaces the
 * editor's palette/cells with the result, switching into normal paint mode
 * so the contributor can refine it by hand. Outright overwrites — no
 * merge — so a confirmation is required first whenever the grid already has
 * painted content to lose; an empty grid needs no confirmation, matching
 * every other editor action's "changes apply immediately" model since
 * there's nothing at risk yet. Disables the import controls for the
 * duration of the (synchronous, potentially slow) decode+quantize work,
 * yielding one frame first so that disabled state actually paints before
 * the main thread blocks on it.
 */
async function handleImport(
  elements: EditorElements,
  state: EditorState,
): Promise<void> {
  elements.error.textContent = "";

  const file = elements.importFile.files?.[0];
  if (!file) {
    elements.error.textContent = "⚠ Choose an image file first.";
    return;
  }

  const paletteSize = parseImportPaletteSize(elements.importPaletteSize.value);
  if (paletteSize === undefined) {
    elements.error.textContent = `⚠ Palette size must be a whole number from 1 to ${MAX_IMPORT_PALETTE_SIZE}.`;
    return;
  }

  if (
    hasPaintedContent(state.cells) &&
    !confirm(
      "Importing this image will replace the current grid and palette. Continue?",
    )
  ) {
    return;
  }

  elements.importFile.disabled = true;
  elements.importPaletteSize.disabled = true;
  elements.importButton.disabled = true;
  elements.error.textContent = "Importing…";

  await new Promise((resolve) => setTimeout(resolve, 0));

  try {
    const image = await decodeImageFile(file);
    const imported = buildImportedGrid(image, {
      targetWidth: state.width,
      targetHeight: state.height,
      paletteSize,
      backgroundColor: elements.importBackground.value,
    });

    state.palette = imported.palette;
    state.cells = imported.cells;
    state.activeColorIndex = 0;
    state.mode = "paint";
    state.hasUnsavedChanges = true;
    elements.error.textContent = "";
    render(elements, state);
  } catch (error) {
    elements.error.textContent =
      error instanceof Error ? `⚠ ${error.message}` : "⚠ Image import failed.";
  } finally {
    elements.importFile.disabled = false;
    elements.importPaletteSize.disabled = false;
    elements.importButton.disabled = false;
  }
}

function handleExport(elements: EditorElements, state: EditorState): void {
  elements.error.textContent = "";

  try {
    const puzzle = buildPuzzleCandidate({
      id: state.filename,
      name: state.name,
      width: state.width,
      height: state.height,
      palette: state.palette,
      cells: state.cells,
    });
    triggerDownload(`${puzzle.id}.json`, JSON.stringify(puzzle, null, 2));
    state.hasUnsavedChanges = false;
  } catch (error) {
    elements.error.textContent =
      error instanceof Error ? `⚠ ${error.message}` : "⚠ Export failed";
  }
}

/**
 * Hydrates the puzzle editor page: builds the width/height controls,
 * palette editor, paint/erase toolbar and grid canvas into the static
 * shell's reserved containers (see `renderEditorPage.ts`), and wires the
 * Export action to `createPuzzle`'s validation plus a browser download.
 */
export function hydrate(): void {
  // `[data-role="editor-page"]` is this page's own unique self-detection
  // marker (see main.ts's doc comment) — checked first so this script stays
  // a no-op on every other page shape.
  const elements = findElements();
  if (!elements) {
    return;
  }

  const state: EditorState = {
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    palette: [...DEFAULT_PALETTE],
    cells: createEmptyCells(DEFAULT_WIDTH, DEFAULT_HEIGHT),
    mode: "paint",
    activeColorIndex: 0,
    name: "",
    filename: "",
    hasUnsavedChanges: false,
  };

  elements.width.value = String(state.width);
  elements.height.value = String(state.height);

  elements.width.addEventListener("change", () =>
    handleResize(
      elements,
      state,
      elements.width,
      (value) => {
        state.width = value;
      },
      state.width,
    ),
  );
  elements.height.addEventListener("change", () =>
    handleResize(
      elements,
      state,
      elements.height,
      (value) => {
        state.height = value;
      },
      state.height,
    ),
  );

  elements.name.addEventListener("change", () => {
    state.name = elements.name.value;
    state.hasUnsavedChanges = true;
  });
  elements.filename.addEventListener("change", () => {
    state.filename = elements.filename.value;
    state.hasUnsavedChanges = true;
  });

  elements.exportButton.addEventListener("click", () =>
    handleExport(elements, state),
  );

  elements.importButton.addEventListener("click", () => {
    void handleImport(elements, state);
  });

  // Single delegated listener on the wrapper, which `renderGrid` never
  // replaces itself (only the `<table>` inside it) — so it keeps working
  // across every grid rebuild instead of being lost with the old table.
  elements.gridWrapper.addEventListener("click", (event) => {
    if (!(event.target instanceof HTMLElement)) {
      return;
    }
    const td = event.target.closest<HTMLTableCellElement>(
      "td[data-row][data-col]",
    );
    if (!td) {
      return;
    }
    const x = Number(td.dataset.col);
    const y = Number(td.dataset.row);
    const value = state.mode === "erase" ? null : state.activeColorIndex;
    state.cells = paintCell(state.cells, x, y, value);
    paintGridCell(td, value, state);
    state.hasUnsavedChanges = true;
  });

  window.addEventListener("beforeunload", (event) => {
    if (state.hasUnsavedChanges) {
      event.preventDefault();
      event.returnValue = "";
    }
  });
  window.addEventListener("resize", () => {
    const table = elements.gridWrapper.querySelector("table");
    if (table) {
      applyGridFit(elements.gridWrapper, table);
    }
  });

  render(elements, state);
}

if (typeof document !== "undefined") {
  hydrate();
}
