import {
  EDITOR_CANVAS_LABEL_ID,
  EDITOR_DEFAULT_HEIGHT,
  EDITOR_DEFAULT_MODE,
  EDITOR_DEFAULT_PALETTE,
  EDITOR_DEFAULT_WIDTH,
  EDITOR_MAX_DIMENSION,
  type Locale,
  type Puzzle,
  PuzzleValidationError,
  contrastingTextColor,
  createPuzzle,
  diagnoseSolvability,
  isSupportedLocale,
  parsePuzzleSource,
  suggestSolvabilityFix,
  translate,
} from "@kindle-nonograms/shared";
import { ImageDecodeError, decodeImageFile } from "./decodeImageFile.js";
import { computeFitFontSizePx } from "./fitGrid.js";
import {
  applyLocale,
  readLocaleCookie,
  resolveLocale,
  writeLocaleCookie,
} from "./i18n.js";
import { buildImportedGrid } from "./imageQuantize.js";
import { withTimeout } from "./withTimeout.js";

type EditorMode = "paint" | "erase";

interface GridCoordinate {
  x: number;
  y: number;
}

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
  locale: Locale;
  // The canvas's roving-tabindex cell (the grid's single Tab stop) — kept
  // across a full `renderGrid()` rebuild (resize, palette edit, import),
  // clamped to the new bounds, rather than always resetting to the
  // top-left cell. See .vibe/decisions/
  // 034-editor-canvas-roving-tabindex-with-clamped-focus-preservation.md.
  focusedCell: GridCoordinate;
}

const NEW_COLOR_DEFAULT = "#888888";
const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

// Kept in sync with `packages/site/src/renderEditorPage.ts`'s
// `#editor-import-palette-size` input's own `max`.
const MAX_IMPORT_PALETTE_SIZE = 16;

// If the browser's <img> element never fires onload/onerror (a stalled or
// pathological file), the decode is raced against this timeout so the
// import controls can never stay disabled forever — see backlog item 044.
const IMAGE_IMPORT_TIMEOUT_MS = 15000;

// A resize whose new width x height is at or above this cell count reuses
// the image-import flow's own yield-then-disable pattern (below it, a
// resize stays exactly as instant as it always has — no busy flash on
// ordinary sizes). Set below the 45x45 (2025-cell) largest puzzle shipped
// in data/puzzles/ today, so drafting anything in that range already gets
// the busy indicator rather than only the largest allowed (60x60) sizes.
// See backlog item 060.
const RESIZE_ASYNC_THRESHOLD_CELLS = 625;

// Same grid-fit tuning as hydratePlayPage.ts's own reused constants (see
// its doc comment for the full legibility-floor reasoning) — this tool
// isn't a Kindle page, but reusing fitGrid.ts keeps a resizable editor
// canvas from ever overflowing the viewport regardless of how large a
// puzzle a contributor is drafting.
const BASE_FONT_SIZE_PX = 16;
const MIN_LEGIBLE_FONT_SIZE_PX = 10;
const MIN_GRID_SCALE = MIN_LEGIBLE_FONT_SIZE_PX / BASE_FONT_SIZE_PX;
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

/** Clamps `value` into `[0, size - 1]`, or `0` when `size` is `0` or less. */
function clampCoordinate(value: number, size: number): number {
  if (size <= 0) {
    return 0;
  }
  return Math.min(Math.max(value, 0), size - 1);
}

const ARROW_KEY_DELTAS: Record<string, GridCoordinate> = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
};

/**
 * Computes the roving-tabindex cell an arrow key press moves to from
 * `(x, y)`, clamped at the grid's edges (no wraparound) — matches the
 * standard grid/spreadsheet keyboard pattern. Returns `undefined` for any
 * key this canvas doesn't handle (Tab, Enter, a letter, ...), so a caller
 * can leave every other key alone rather than guessing a default direction.
 */
export function nextCellCoordinate(
  x: number,
  y: number,
  key: string,
  width: number,
  height: number,
): GridCoordinate | undefined {
  const delta = ARROW_KEY_DELTAS[key];
  if (!delta) {
    return undefined;
  }
  return {
    x: clampCoordinate(x + delta.x, width),
    y: clampCoordinate(y + delta.y, height),
  };
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

/**
 * A width/height input's HTML `max="${EDITOR_MAX_DIMENSION}"` attribute
 * (see `renderEditorPage.ts`) is a hint only — a browser doesn't stop a
 * value above it from being typed, pasted, or reaching a `change` event —
 * so this range check is the sole authority, exactly like
 * `parseImportPaletteSize`'s own 1..`MAX_IMPORT_PALETTE_SIZE` check below.
 */
function parseGridDimension(value: string): number | undefined {
  const parsed = Number(value);
  return Number.isInteger(parsed) &&
    parsed >= 1 &&
    parsed <= EDITOR_MAX_DIMENSION
    ? parsed
    : undefined;
}

function render(elements: EditorElements, state: EditorState): void {
  renderPalette(elements, state);
  renderToolbar(elements, state);
  renderGrid(elements, state);
}

/**
 * Attaches one palette row's behavior — active-color selection, color edit,
 * remove — to `row`'s existing swatch/color-input/remove children, whether
 * `row` was just created by `renderPalette` (a rebuild after resize/import)
 * or is the default row `renderEditorPage.ts` already baked into the static
 * page (see `attachInitialPalette` and
 * .ux/decisions/001-frozen-chrome-blocking-reconciliation.md). Never builds
 * or removes DOM itself, so it's safe to call on markup this function
 * didn't create.
 */
function wirePaletteRow(
  row: HTMLElement,
  index: number,
  elements: EditorElements,
  state: EditorState,
): void {
  const swatch = row.querySelector<HTMLButtonElement>('[data-role="swatch"]');
  const colorInput = row.querySelector<HTMLInputElement>(
    '[data-role="palette-color-input"]',
  );
  const remove = row.querySelector<HTMLButtonElement>(
    '[data-role="palette-remove"]',
  );
  if (!swatch || !colorInput || !remove) {
    return;
  }

  swatch.addEventListener("click", () => {
    state.activeColorIndex = index;
    state.mode = "paint";
    render(elements, state);
  });

  colorInput.addEventListener("change", () => {
    const updated = updatePaletteColor(state.palette, index, colorInput.value);
    if (updated !== state.palette) {
      state.palette = updated;
      state.hasUnsavedChanges = true;
      render(elements, state);
    }
  });

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
}

/** Attaches the "add color" button's behavior — see {@link wirePaletteRow}. */
function wireAddColorButton(
  button: HTMLButtonElement,
  elements: EditorElements,
  state: EditorState,
): void {
  button.addEventListener("click", () => {
    state.palette = addPaletteColor(state.palette, NEW_COLOR_DEFAULT);
    state.hasUnsavedChanges = true;
    render(elements, state);
  });
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
    // Not tagged `data-i18n` (that mechanism retranslates `textContent`,
    // which here holds the "✓" glyph, not this label) but tagged
    // `data-i18n-aria` so `applyLocale()` still retranslates the
    // `aria-label` itself on a later language switch — see
    // `.vibe/decisions/023-generic-aria-label-retranslation-attribute.md`.
    swatch.dataset.i18nAria = "editor.selectColorAriaLabel";
    swatch.setAttribute(
      "aria-label",
      translate(state.locale, "editor.selectColorAriaLabel").replace(
        "{number}",
        String(index + 1),
      ),
    );
    const active = index === state.activeColorIndex;
    swatch.setAttribute("aria-pressed", String(active));
    swatch.style.backgroundColor = hex;
    swatch.style.color = contrastingTextColor(hex);
    swatch.textContent = active ? "✓" : "";

    const colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.dataset.role = "palette-color-input";
    colorInput.dataset.colorIndex = String(index);
    colorInput.value = hex;
    colorInput.dataset.i18nAria = "editor.editColorAriaLabel";
    colorInput.setAttribute(
      "aria-label",
      translate(state.locale, "editor.editColorAriaLabel").replace(
        "{number}",
        String(index + 1),
      ),
    );

    const remove = document.createElement("button");
    remove.type = "button";
    remove.dataset.role = "palette-remove";
    remove.dataset.colorIndex = String(index);
    remove.dataset.i18nAria = "editor.removeColorAriaLabel";
    remove.setAttribute(
      "aria-label",
      translate(state.locale, "editor.removeColorAriaLabel").replace(
        "{number}",
        String(index + 1),
      ),
    );
    remove.textContent = "×";
    remove.disabled = state.palette.length <= 1;

    row.append(swatch, colorInput, remove);
    elements.palette.append(row);
    wirePaletteRow(row, index, elements, state);
  });

  const addColor = document.createElement("button");
  addColor.type = "button";
  addColor.dataset.role = "editor-add-color";
  addColor.textContent = "+";
  addColor.dataset.i18nAria = "editor.addColor";
  addColor.setAttribute(
    "aria-label",
    translate(state.locale, "editor.addColor"),
  );
  elements.palette.append(addColor);
  wireAddColorButton(addColor, elements, state);
}

/**
 * Attaches the Erase mode button's behavior to `eraseButton`, whether it
 * was just created by `renderToolbar` (a rebuild) or is the default button
 * `renderEditorPage.ts` already baked into the static page (see
 * `attachInitialToolbar`). Syncs its `aria-pressed` state immediately,
 * matching `state.mode`. There is no separate Paint button: a palette
 * color swatch tap (`wirePaletteRow`) is the only way back into paint
 * mode, see backlog item 065.
 */
function wireToolbarButtons(
  eraseButton: HTMLButtonElement,
  state: EditorState,
): void {
  const refresh = (): void => {
    eraseButton.setAttribute("aria-pressed", String(state.mode === "erase"));
  };

  eraseButton.addEventListener("click", () => {
    state.mode = "erase";
    refresh();
  });
  refresh();
}

function renderToolbar(elements: EditorElements, state: EditorState): void {
  elements.toolbar.textContent = "";

  const eraseButton = document.createElement("button");
  eraseButton.type = "button";
  eraseButton.dataset.role = "mode-erase";
  eraseButton.dataset.i18n = "editor.modeErase";
  eraseButton.textContent = translate(state.locale, "editor.modeErase");

  elements.toolbar.append(eraseButton);
  wireToolbarButtons(eraseButton, state);
}

/**
 * A cell's state-describing aria-label: "Row R, column C, Color N"
 * (matching the palette swatch numbering convention — the palette has no
 * real color names, see
 * .vibe/decisions/029-swatch-aria-label-number-placeholder.md) or
 * "Row R, column C, Empty" — the position prefix matches the grid's own
 * 1-based row/column number headers and the solvability check's own
 * "row R, column C" wording, so all three can never disagree (see
 * .vibe/decisions/042-editor-grid-row-column-numbering.md).
 */
function cellAriaLabel(
  locale: Locale,
  value: number | null,
  row: number,
  column: number,
): string {
  const template =
    value === null
      ? translate(locale, "editor.cellEmptyAriaLabel")
      : translate(locale, "editor.cellColorAriaLabel").replace(
          "{number}",
          String(value + 1),
        );
  return template
    .replace("{row}", String(row + 1))
    .replace("{column}", String(column + 1));
}

/**
 * Paints a single cell (background color) and keeps its accessible state in
 * sync: the aria-label text itself (for right now) plus `data-i18n-aria` /
 * `data-color-index` (so a later language switch retranslates it via the
 * existing generic `applyLocale()` sweep, exactly like the palette swatches)
 * — recomputed on every paint/erase, not only at initial render, so it can
 * never go stale relative to the visible fill. See .vibe/decisions/
 * 034-editor-canvas-roving-tabindex-with-clamped-focus-preservation.md.
 */
function paintGridCell(
  td: HTMLTableCellElement,
  value: number | null,
  state: EditorState,
): void {
  const row = Number(td.dataset.row);
  const column = Number(td.dataset.col);
  td.style.backgroundColor = value === null ? "" : (state.palette[value] ?? "");
  td.setAttribute(
    "aria-label",
    cellAriaLabel(state.locale, value, row, column),
  );
  if (value === null) {
    td.dataset.i18nAria = "editor.cellEmptyAriaLabel";
    delete td.dataset.colorIndex;
  } else {
    td.dataset.i18nAria = "editor.cellColorAriaLabel";
    td.dataset.colorIndex = String(value);
  }
}

/**
 * Moves the canvas's roving tabindex to `(x, y)`: exactly one cell stays a
 * Tab stop at a time (the rest `-1`), matching the grid/spreadsheet
 * keyboard pattern. See .vibe/decisions/
 * 034-editor-canvas-roving-tabindex-with-clamped-focus-preservation.md.
 */
function setRovingTabIndex(
  gridWrapper: HTMLElement,
  x: number,
  y: number,
): void {
  const cells = gridWrapper.querySelectorAll<HTMLTableCellElement>(
    "td[data-row][data-col]",
  );
  for (const td of Array.from(cells)) {
    td.tabIndex =
      td.dataset.row === String(y) && td.dataset.col === String(x) ? 0 : -1;
  }
}

/**
 * Builds the `<thead>` row of 1-based column-number headers, plus an
 * empty, inert corner cell at its start (aligned with the row-number
 * column {@link buildGridRowHeader} adds to every body row). `aria-hidden`
 * on the corner cell keeps assistive-tech table-browsing commands from
 * landing on a meaningless blank stop — mirrors `renderEditorPage.ts`'s own
 * static markup exactly, see
 * .vibe/decisions/042-editor-grid-row-column-numbering.md.
 */
function buildGridColumnHeaders(width: number): HTMLTableSectionElement {
  const thead = document.createElement("thead");
  const tr = document.createElement("tr");
  tr.setAttribute("role", "row");

  const corner = document.createElement("th");
  corner.setAttribute("scope", "col");
  corner.setAttribute("role", "columnheader");
  corner.setAttribute("aria-hidden", "true");
  tr.append(corner);

  for (let x = 0; x < width; x++) {
    const th = document.createElement("th");
    th.setAttribute("scope", "col");
    th.setAttribute("role", "columnheader");
    const span = document.createElement("span");
    span.textContent = String(x + 1);
    th.append(span);
    tr.append(th);
  }

  thead.append(tr);
  return thead;
}

/** Builds a body row's leading 1-based row-number header cell. */
function buildGridRowHeader(y: number): HTMLTableCellElement {
  const th = document.createElement("th");
  th.setAttribute("scope", "row");
  th.setAttribute("role", "rowheader");
  const span = document.createElement("span");
  span.textContent = String(y + 1);
  th.append(span);
  return th;
}

/**
 * Rebuilds the canvas `<table>` from `state` as a keyboard-operable ARIA
 * grid (`role="grid"/"row"/"gridcell"` over the real `<table>`/`<tr>`/`<td>`
 * structure, one roving-tabindex cell). The roving-tabindex cell survives
 * the rebuild: its coordinates are clamped to the new width/height, and if
 * focus was actually inside the *old* grid at the moment of rebuild, focus
 * is restored to the clamped cell in the new one, after it is attached to
 * the document — otherwise focus is left wherever it already was (on
 * whatever control triggered the rebuild), never stolen into the grid. See
 * .vibe/decisions/034-editor-canvas-roving-tabindex-with-clamped-focus-preservation.md.
 */
function renderGrid(elements: EditorElements, state: EditorState): void {
  const hadFocusInGrid =
    document.activeElement instanceof HTMLElement &&
    elements.gridWrapper.contains(document.activeElement);

  const focusX = clampCoordinate(state.focusedCell.x, state.width);
  const focusY = clampCoordinate(state.focusedCell.y, state.height);
  state.focusedCell = { x: focusX, y: focusY };

  const table = document.createElement("table");
  table.setAttribute("role", "grid");
  table.setAttribute("aria-labelledby", EDITOR_CANVAS_LABEL_ID);
  table.append(buildGridColumnHeaders(state.width));
  const tbody = document.createElement("tbody");

  for (let y = 0; y < state.height; y++) {
    const tr = document.createElement("tr");
    tr.setAttribute("role", "row");
    tr.append(buildGridRowHeader(y));
    for (let x = 0; x < state.width; x++) {
      const td = document.createElement("td");
      td.setAttribute("role", "gridcell");
      td.dataset.row = String(y);
      td.dataset.col = String(x);
      td.tabIndex = x === focusX && y === focusY ? 0 : -1;
      paintGridCell(td, state.cells[y]?.[x] ?? null, state);
      tr.append(td);
    }
    tbody.append(tr);
  }

  table.append(tbody);
  elements.gridWrapper.textContent = "";
  elements.gridWrapper.append(table);
  applyGridFit(elements.gridWrapper, table);

  if (hadFocusInGrid) {
    elements.gridWrapper
      .querySelector<HTMLTableCellElement>(
        `td[data-row="${focusY}"][data-col="${focusX}"]`,
      )
      ?.focus();
  }
}

/**
 * Scales the grid wrapper to fit the available width only — unlike
 * hydratePlayPage.ts's `applyGridFit` (fixed no-scroll Kindle chrome, fit by
 * width *and* height), the editor is a normally-scrolling desktop page, so a
 * short browser window must never shrink the canvas just because height is
 * scarce; the page simply grows taller and scrolls instead. Still reuses
 * `computeFitFontSizePx` so an editor grid drafted much larger than any
 * shipped puzzle never overflows the page horizontally.
 */
function applyGridFit(wrapper: HTMLElement, table: HTMLElement): void {
  wrapper.style.fontSize = `${BASE_FONT_SIZE_PX}px`;

  const naturalWidth = table.scrollWidth;
  const naturalHeight = table.scrollHeight;
  const availableWidth =
    document.documentElement.clientWidth - VIEWPORT_GUTTER_PX;

  const fontSizePx = computeFitFontSizePx({
    naturalWidth,
    naturalHeight,
    availableWidth,
    baseFontSizePx: BASE_FONT_SIZE_PX,
    minScale: MIN_GRID_SCALE,
    maxScale: MAX_GRID_SCALE,
  });

  wrapper.style.fontSize = `${fontSizePx}px`;
  wrapper.style.maxWidth = `${Math.max(availableWidth, 0)}px`;
}

/**
 * Resolves the `<td data-row data-col>` a delegated grid event actually
 * targeted — `event.target` can be the `<td>` itself or, in principle, a
 * descendant, so this always walks up via `closest()` rather than assuming.
 * Returns `undefined` for any event outside a real grid cell.
 */
function findCellFromEventTarget(
  target: EventTarget | null,
): HTMLTableCellElement | undefined {
  if (!(target instanceof HTMLElement)) {
    return undefined;
  }
  return (
    target.closest<HTMLTableCellElement>("td[data-row][data-col]") ?? undefined
  );
}

/**
 * Paints or erases `td` (per `state.mode`) and keeps `state.cells` and
 * `state.hasUnsavedChanges` in sync — the one shared code path a click, an
 * Enter press and a Space press on a grid cell all funnel through, so
 * keyboard parity with the mouse can never drift. Updates the existing
 * `<td>` in place; never triggers a full `renderGrid()` rebuild, so
 * painting can never disturb the roving-tabindex cell or focus.
 */
function paintCellElement(td: HTMLTableCellElement, state: EditorState): void {
  const x = Number(td.dataset.col);
  const y = Number(td.dataset.row);
  const value = state.mode === "erase" ? null : state.activeColorIndex;
  state.cells = paintCell(state.cells, x, y, value);
  paintGridCell(td, value, state);
  state.hasUnsavedChanges = true;
}

/**
 * Attaches this hydration's behavior to the palette/toolbar/canvas
 * `renderEditorPage.ts` already bakes into the static page in their fixed
 * default shape (one black color, Paint mode, a 5×5 grid) — see
 * .ux/decisions/001-frozen-chrome-blocking-reconciliation.md. Each locates
 * and wires its own already-existing markup instead of calling `render()`,
 * which would wipe and rebuild it from scratch: on a page a keyboard user
 * has already started tabbing through (the editor's contributor persona
 * uses a normal desktop browser, mouse *and* keyboard — see
 * `.ux/product.md`), that rebuild would silently drop their focus to
 * `<body>`. Kept as three separate functions, called independently by
 * `hydrate()`, so a failure attaching one (e.g. the palette) can never
 * prevent the others (toolbar, canvas fit) from attaching. `render()`
 * remains the rebuild path for actual state changes afterward (resize,
 * palette edit, paint, import), which are unaffected by this flow.
 */
function attachInitialPalette(
  elements: EditorElements,
  state: EditorState,
): void {
  const rows = Array.from(
    elements.palette.querySelectorAll<HTMLElement>(".editor-palette-row"),
  );
  rows.forEach((row, index) => wirePaletteRow(row, index, elements, state));

  const addColor = elements.palette.querySelector<HTMLButtonElement>(
    '[data-role="editor-add-color"]',
  );
  if (addColor) {
    wireAddColorButton(addColor, elements, state);
  }
}

/** See {@link attachInitialPalette}. */
function attachInitialToolbar(
  elements: EditorElements,
  state: EditorState,
): void {
  const eraseButton = elements.toolbar.querySelector<HTMLButtonElement>(
    '[data-role="mode-erase"]',
  );
  if (eraseButton) {
    wireToolbarButtons(eraseButton, state);
  }
}

/** See {@link attachInitialPalette}. */
function attachInitialGridFit(elements: EditorElements): void {
  const table = elements.gridWrapper.querySelector("table");
  if (table) {
    applyGridFit(elements.gridWrapper, table);
  }
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
  confirmation: HTMLElement;
  importFile: HTMLInputElement;
  importPaletteSize: HTMLInputElement;
  importBackground: HTMLInputElement;
  importButton: HTMLButtonElement;
  importError: HTMLElement;
  importJsonFile: HTMLInputElement;
  importJsonButton: HTMLButtonElement;
  importJsonError: HTMLElement;
  importJsonConfirmation: HTMLElement;
  checkSolvabilityButton: HTMLButtonElement;
  solvabilityError: HTMLElement;
  solvabilityConfirmation: HTMLElement;
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
  const confirmation = document.querySelector<HTMLElement>(
    '[data-role="editor-confirmation"]',
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
  const importError = document.querySelector<HTMLElement>(
    '[data-role="editor-import-error"]',
  );
  const importJsonFile = document.querySelector<HTMLInputElement>(
    '[data-role="editor-import-json-file"]',
  );
  const importJsonButton = document.querySelector<HTMLButtonElement>(
    '[data-role="editor-import-json-button"]',
  );
  const importJsonError = document.querySelector<HTMLElement>(
    '[data-role="editor-import-json-error"]',
  );
  const importJsonConfirmation = document.querySelector<HTMLElement>(
    '[data-role="editor-import-json-confirmation"]',
  );
  const checkSolvabilityButton = document.querySelector<HTMLButtonElement>(
    '[data-role="editor-check-solvability"]',
  );
  const solvabilityError = document.querySelector<HTMLElement>(
    '[data-role="editor-solvability-error"]',
  );
  const solvabilityConfirmation = document.querySelector<HTMLElement>(
    '[data-role="editor-solvability-confirmation"]',
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
    !confirmation ||
    !importFile ||
    !importPaletteSize ||
    !importBackground ||
    !importButton ||
    !importError ||
    !importJsonFile ||
    !importJsonButton ||
    !importJsonError ||
    !importJsonConfirmation ||
    !checkSolvabilityButton ||
    !solvabilityError ||
    !solvabilityConfirmation
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
    confirmation,
    importFile,
    importPaletteSize,
    importBackground,
    importButton,
    importError,
    importJsonFile,
    importJsonButton,
    importJsonError,
    importJsonConfirmation,
    checkSolvabilityButton,
    solvabilityError,
    solvabilityConfirmation,
  };
}

/**
 * Validates and applies a width/height `change`, shared by both the width
 * and height inputs (hence one error message covering either field, matching
 * the acceptance criteria's own field-agnostic wording rather than plumbing
 * which of the two triggered it). Clears the error region on every call, so
 * a stale message from a previous invalid entry never survives a later valid
 * one — same clear-first convention as `handleImport`/`handleExport` — then,
 * on an invalid value (including one above `EDITOR_MAX_DIMENSION`), reports
 * into it *before* reverting the field, instead of silently reverting with no
 * explanation like every other editor field already avoids (see backlog item
 * 043).
 *
 * A resulting grid at or above `RESIZE_ASYNC_THRESHOLD_CELLS` reuses
 * `handleImport`'s own yield-then-disable pattern: the size inputs are
 * disabled and a busy message shown *before* the single `setTimeout(0)`
 * yield, so that state is guaranteed to paint before the main thread blocks
 * on rebuilding a big `<table>` — see backlog item 060. A smaller resize
 * (the common case) stays exactly as instant as before: no yield, no busy
 * flash. Focus is explicitly restored to `input` once the busy window ends,
 * since disabling an element blurs it and re-enabling doesn't restore focus
 * on its own.
 */
async function handleResize(
  elements: EditorElements,
  state: EditorState,
  input: HTMLInputElement,
  apply: (value: number) => void,
  previous: number,
): Promise<void> {
  elements.error.textContent = "";

  const parsed = parseGridDimension(input.value);
  if (parsed === undefined) {
    elements.error.textContent = `⚠ ${translate(state.locale, "editor.error.invalidGridSize").replace("{max}", String(EDITOR_MAX_DIMENSION))}`;
    input.value = String(previous);
    return;
  }

  apply(parsed);

  const isLargeRebuild =
    state.width * state.height >= RESIZE_ASYNC_THRESHOLD_CELLS;

  if (isLargeRebuild) {
    const hadFocus = document.activeElement === input;
    elements.width.disabled = true;
    elements.height.disabled = true;
    elements.error.textContent = "Resizing…";

    await new Promise((resolve) => setTimeout(resolve, 0));

    state.cells = resizeCells(state.cells, state.width, state.height);
    state.hasUnsavedChanges = true;
    render(elements, state);

    elements.width.disabled = false;
    elements.height.disabled = false;
    elements.error.textContent = "";
    if (hadFocus) {
      input.focus();
    }
    return;
  }

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
 * Maps a `decodeImageFile` rejection to a fixed, contributor-facing
 * translated message — never the error's own `message`, which for the
 * `"unknown"` reason can be literal, untranslatable browser text (e.g. a
 * `DOMException`'s wording). See
 * `.vibe/decisions/021-editor-errors-discriminated-by-reason.md`.
 */
function describeImportError(error: unknown, locale: Locale): string {
  if (error instanceof ImageDecodeError) {
    switch (error.reason) {
      case "unsupported":
        return translate(locale, "editor.error.imageUnsupported");
      case "unreadable":
        return translate(locale, "editor.error.imageUnreadable");
      case "timeout":
        return translate(locale, "editor.error.imageTimeout");
      default:
        return translate(locale, "editor.error.unexpected");
    }
  }
  return translate(locale, "editor.error.unexpected");
}

/**
 * Maps a `createPuzzle` rejection to a fixed, contributor-facing translated
 * message — never the error's own `message`, which is a plain-English,
 * developer-facing description reused verbatim by `discoverPuzzles.ts`'s
 * build-time diagnostics. Only the two failures the editor's own fields can
 * actually trigger (an empty name or filename) get a specific message;
 * every other `PuzzleValidationError` reason (an internal invariant the
 * editor's own state management already prevents from happening) falls
 * back to the same generic message as a wholly unexpected error. See
 * `.vibe/decisions/021-editor-errors-discriminated-by-reason.md`.
 */
function describeExportError(error: unknown, locale: Locale): string {
  if (error instanceof PuzzleValidationError) {
    switch (error.reason) {
      case "emptyId":
        return translate(locale, "editor.error.emptyFilename");
      case "emptyName":
        return translate(locale, "editor.error.emptyName");
      default:
        return translate(locale, "editor.error.unexpected");
    }
  }
  return translate(locale, "editor.error.unexpected");
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
  elements.importError.textContent = "";

  const file = elements.importFile.files?.[0];
  if (!file) {
    elements.importError.textContent = "⚠ Choose an image file first.";
    return;
  }

  const paletteSize = parseImportPaletteSize(elements.importPaletteSize.value);
  if (paletteSize === undefined) {
    elements.importError.textContent = `⚠ Palette size must be a whole number from 1 to ${MAX_IMPORT_PALETTE_SIZE}.`;
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
  elements.importError.textContent = "Importing…";

  await new Promise((resolve) => setTimeout(resolve, 0));

  try {
    const image = await withTimeout(
      decodeImageFile(file),
      IMAGE_IMPORT_TIMEOUT_MS,
      () => new ImageDecodeError("timeout", "Image import timed out."),
    );
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
    elements.importError.textContent = "";
    render(elements, state);
  } catch (error) {
    elements.importError.textContent = `⚠ ${describeImportError(error, state.locale)}`;
  } finally {
    elements.importFile.disabled = false;
    elements.importPaletteSize.disabled = false;
    elements.importButton.disabled = false;
  }
}

/**
 * Reads a `File`'s content as text via `FileReader` rather than the newer
 * `File#text()` — jsdom (this project's test environment) implements
 * `FileReader` but not `File#text()`, and `FileReader` has the longer
 * cross-browser track record besides.
 */
function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () =>
      reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

/**
 * Replaces the editor's grid, palette, name, and filename with an imported
 * puzzle file's own — auto-detecting the native format or a reMarkable
 * export via `shared`'s `parsePuzzleSource`, exactly like the build-time
 * puzzle loader. The imported id always comes from the picked file's own
 * name, never any `id` the file's content happens to declare (same rule as
 * the build loader — see .vibe/decisions/001-puzzle-id-from-filename.md).
 *
 * Only structural validity is checked here, deliberately not solvability:
 * the primary use case is reopening an already-broken puzzle file
 * specifically to repair it with the "check solvability" button below,
 * which would be impossible if import itself refused an unfair puzzle
 * (see .vibe/decisions/040-editor-solvability-diagnosis-and-json-import.md).
 * A rejected file (unreadable, invalid JSON, structurally invalid, or over
 * `EDITOR_MAX_DIMENSION`) leaves every field exactly as it was — the four
 * fields are only ever replaced together, after full validation succeeds.
 *
 * Outright overwrites — no merge — so a confirmation is required first
 * whenever the grid already has painted content to lose, matching
 * `handleImport`'s own model. A resulting grid at or above
 * `RESIZE_ASYNC_THRESHOLD_CELLS` reuses the same yield-then-disable busy
 * pattern as a large resize/image-import, so a large imported puzzle can't
 * freeze the page with no feedback.
 */
async function handleImportJson(
  elements: EditorElements,
  state: EditorState,
): Promise<void> {
  elements.importJsonError.textContent = "";
  elements.importJsonConfirmation.textContent = "";

  const file = elements.importJsonFile.files?.[0];
  if (!file) {
    elements.importJsonError.textContent = `⚠ ${translate(state.locale, "editor.error.importJsonNoFile")}`;
    return;
  }

  if (
    hasPaintedContent(state.cells) &&
    !confirm(
      "Importing this puzzle will replace the current grid, palette, name, and filename. Continue?",
    )
  ) {
    return;
  }

  let puzzle: Puzzle;
  try {
    const text = await readFileAsText(file);
    const parsed: unknown = JSON.parse(text);
    puzzle = parsePuzzleSource(parsed, file.name.replace(/\.json$/i, ""));
  } catch {
    elements.importJsonError.textContent = `⚠ ${translate(state.locale, "editor.error.importJsonInvalid")}`;
    return;
  }

  if (
    puzzle.width > EDITOR_MAX_DIMENSION ||
    puzzle.height > EDITOR_MAX_DIMENSION
  ) {
    elements.importJsonError.textContent = `⚠ ${translate(
      state.locale,
      "editor.error.importJsonTooLarge",
    ).replaceAll("{max}", String(EDITOR_MAX_DIMENSION))}`;
    return;
  }

  const applyImportedPuzzle = () => {
    state.width = puzzle.width;
    state.height = puzzle.height;
    state.palette = puzzle.palette;
    state.cells = puzzle.cells;
    state.name = puzzle.name;
    state.filename = puzzle.id;
    state.activeColorIndex = 0;
    state.mode = "paint";
    state.hasUnsavedChanges = true;
    elements.name.value = puzzle.name;
    elements.filename.value = puzzle.id;
    elements.width.value = String(puzzle.width);
    elements.height.value = String(puzzle.height);
  };

  const isLargeRebuild =
    puzzle.width * puzzle.height >= RESIZE_ASYNC_THRESHOLD_CELLS;

  if (isLargeRebuild) {
    elements.importJsonFile.disabled = true;
    elements.importJsonButton.disabled = true;
    elements.importJsonError.textContent = "Importing…";

    await new Promise((resolve) => setTimeout(resolve, 0));

    applyImportedPuzzle();
    render(elements, state);

    elements.importJsonFile.disabled = false;
    elements.importJsonButton.disabled = false;
    elements.importJsonError.textContent = "";
  } else {
    applyImportedPuzzle();
    render(elements, state);
  }

  elements.importJsonConfirmation.textContent = `✓ ${translate(
    state.locale,
    "editor.importJsonConfirmation",
  ).replace("{filename}", `${puzzle.id}.json`)}`;
}

/**
 * Runs `shared`'s `diagnoseSolvability` against the currently-drafted
 * puzzle and reports the result in plain language — unlike the build-time
 * `checkSolvability` gate, this names *every* problem row and column
 * (1-based, for a human) instead of only the first one, so a contributor
 * mid-edit sees the whole scope of an ambiguous area at once (see
 * .vibe/decisions/040-editor-solvability-diagnosis-and-json-import.md).
 * Independent of Export's own validation — a puzzle with no name/filename
 * yet can still be checked. A grid at or above
 * `RESIZE_ASYNC_THRESHOLD_CELLS` reuses the same yield-then-disable busy
 * pattern as a large resize/import, since the full line-solver run can be
 * slow enough on a large grid to otherwise freeze the page with no
 * feedback.
 */
async function handleCheckSolvability(
  elements: EditorElements,
  state: EditorState,
): Promise<void> {
  elements.solvabilityError.textContent = "";
  elements.solvabilityConfirmation.textContent = "";

  const puzzle: Puzzle = {
    id: state.filename,
    name: state.name,
    width: state.width,
    height: state.height,
    palette: state.palette,
    cells: state.cells,
  };

  const isLargeCheck =
    state.width * state.height >= RESIZE_ASYNC_THRESHOLD_CELLS;

  if (isLargeCheck) {
    elements.checkSolvabilityButton.disabled = true;
    elements.solvabilityError.textContent = "Checking…";
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  const result = diagnoseSolvability(puzzle);

  if (isLargeCheck) {
    elements.checkSolvabilityButton.disabled = false;
    elements.solvabilityError.textContent = "";
  }

  if (result.ok) {
    elements.solvabilityConfirmation.textContent = `✓ ${translate(state.locale, "editor.solvabilityOk")}`;
    return;
  }

  if (result.kind === "noFilledCells") {
    elements.solvabilityError.textContent = `⚠ ${translate(state.locale, "editor.error.solvabilityNoFilledCells")}`;
    return;
  }

  const rows = result.problemRows.map((row) => row + 1).join(", ");
  const columns = result.problemColumns.map((column) => column + 1).join(", ");
  let message = translate(state.locale, "editor.error.solvabilityProblem")
    .replace("{rows}", rows)
    .replace("{columns}", columns);

  const suggestion = suggestSolvabilityFix(puzzle);
  if (suggestion) {
    const valueLabel =
      suggestion.value === null
        ? translate(state.locale, "editor.valueEmptyLabel")
        : translate(state.locale, "editor.valueColorLabel").replace(
            "{number}",
            String(suggestion.value + 1),
          );
    message += ` ${translate(state.locale, "editor.solvabilitySuggestion")
      .replace("{row}", String(suggestion.row + 1))
      .replace("{column}", String(suggestion.column + 1))
      .replace("{value}", valueLabel)}`;
  }

  elements.solvabilityError.textContent = `⚠ ${message}`;
}

function handleExport(elements: EditorElements, state: EditorState): void {
  elements.error.textContent = "";
  elements.confirmation.textContent = "";

  try {
    const puzzle = buildPuzzleCandidate({
      id: state.filename,
      name: state.name,
      width: state.width,
      height: state.height,
      palette: state.palette,
      cells: state.cells,
    });
    const filename = `${puzzle.id}.json`;
    triggerDownload(filename, JSON.stringify(puzzle, null, 2));
    state.hasUnsavedChanges = false;
    elements.confirmation.textContent = `✓ ${translate(state.locale, "editor.exportConfirmation").replace("{filename}", filename)}`;
  } catch (error) {
    elements.error.textContent = `⚠ ${describeExportError(error, state.locale)}`;
  }
}

/**
 * Locates the FR/EN language switcher `renderEditorPage.ts` bakes into the
 * page footer (English selected by default — the locale itself isn't known
 * at build time) and attaches its change behavior, then applies the
 * resolved locale (saved cookie, else the browser's detected language,
 * else English) to every element on the page carrying a `data-i18n` or
 * `data-i18n-aria` key — same footer placement and mechanism as the library
 * page's own switcher (see `hydrateLibraryPage.ts`'s
 * `setUpLanguageSwitcher` and
 * `.vibe/decisions/022-editor-language-switcher-in-footer.md`). Also keeps
 * `state.locale` in sync so a later re-render triggered by an actual edit
 * (resize, palette change, import) keeps using the chosen language instead
 * of silently reverting to English — see `renderPalette`/`renderToolbar`.
 * Never rebuilds the palette/toolbar/canvas DOM itself (only text/aria-label
 * swaps via `applyLocale`), so a language switch mid-edit can't drop the
 * contributor's current focus.
 */
function setUpLanguageSwitcher(state: EditorState): void {
  const select = document.querySelector<HTMLSelectElement>(
    '[data-role="language-switcher-select"]',
  );
  if (select) {
    select.value = state.locale;
    select.addEventListener("change", () => {
      if (isSupportedLocale(select.value)) {
        writeLocaleCookie(select.value);
        state.locale = select.value;
        applyLocale(select.value);
      }
    });
  }

  applyLocale(state.locale);
}

/**
 * Hydrates the puzzle editor page: applies the resolved locale and wires
 * the footer's language switcher (see `setUpLanguageSwitcher`), builds the
 * width/height controls, palette editor, paint/erase toolbar and grid
 * canvas into the static shell's reserved containers (see
 * `renderEditorPage.ts`), and wires the Export action to `createPuzzle`'s
 * validation plus a browser download.
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
    width: EDITOR_DEFAULT_WIDTH,
    height: EDITOR_DEFAULT_HEIGHT,
    palette: [...EDITOR_DEFAULT_PALETTE],
    cells: createEmptyCells(EDITOR_DEFAULT_WIDTH, EDITOR_DEFAULT_HEIGHT),
    mode: EDITOR_DEFAULT_MODE,
    activeColorIndex: 0,
    name: "",
    filename: "",
    hasUnsavedChanges: false,
    locale: resolveLocale(readLocaleCookie(), navigator.language),
    focusedCell: { x: 0, y: 0 },
  };

  setUpLanguageSwitcher(state);

  elements.width.value = String(state.width);
  elements.height.value = String(state.height);

  elements.width.addEventListener("change", () => {
    void handleResize(
      elements,
      state,
      elements.width,
      (value) => {
        state.width = value;
      },
      state.width,
    );
  });
  elements.height.addEventListener("change", () => {
    void handleResize(
      elements,
      state,
      elements.height,
      (value) => {
        state.height = value;
      },
      state.height,
    );
  });

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

  elements.importJsonButton.addEventListener("click", () => {
    void handleImportJson(elements, state);
  });

  elements.checkSolvabilityButton.addEventListener("click", () => {
    void handleCheckSolvability(elements, state);
  });

  // Single delegated listener on the wrapper, which `renderGrid` never
  // replaces itself (only the `<table>` inside it) — so it keeps working
  // across every grid rebuild instead of being lost with the old table.
  elements.gridWrapper.addEventListener("click", (event) => {
    const td = findCellFromEventTarget(event.target);
    if (!td) {
      return;
    }
    paintCellElement(td, state);
  });

  // One delegated `focusin` listener is the single source of truth for
  // which cell is "current" — covering Tab-in, a mouse click (clicking a
  // focusable `<td>` focuses it natively) and an arrow-key-driven `.focus()`
  // call alike, so a mouse click and a keyboard move can never disagree
  // about the roving-tabindex cell. See .vibe/decisions/
  // 034-editor-canvas-roving-tabindex-with-clamped-focus-preservation.md.
  elements.gridWrapper.addEventListener("focusin", (event) => {
    const td = findCellFromEventTarget(event.target);
    if (!td) {
      return;
    }
    const x = Number(td.dataset.col);
    const y = Number(td.dataset.row);
    state.focusedCell = { x, y };
    setRovingTabIndex(elements.gridWrapper, x, y);
  });

  // Arrow keys move the roving-tabindex cell (clamped at the grid's edges);
  // Enter/Space paint/erase the focused cell through the exact same code
  // path as a click, updating the existing <td> in place rather than
  // triggering a full renderGrid() rebuild, so keyboard-painting can never
  // destroy its own focus. See .vibe/decisions/
  // 034-editor-canvas-roving-tabindex-with-clamped-focus-preservation.md.
  elements.gridWrapper.addEventListener("keydown", (event) => {
    const td = findCellFromEventTarget(event.target);
    if (!td) {
      return;
    }
    const x = Number(td.dataset.col);
    const y = Number(td.dataset.row);

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      paintCellElement(td, state);
      return;
    }

    const next = nextCellCoordinate(x, y, event.key, state.width, state.height);
    if (!next) {
      return;
    }
    event.preventDefault();
    elements.gridWrapper
      .querySelector<HTMLTableCellElement>(
        `td[data-row="${next.y}"][data-col="${next.x}"]`,
      )
      ?.focus();
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

  // Attaches to the already-baked default palette/toolbar/canvas instead of
  // calling render() (see attachInitialPalette's doc comment) — each in its
  // own try/catch so a failure in one can't dead-end the others.
  try {
    attachInitialPalette(elements, state);
  } catch {
    // Degrades silently, same spirit as the rest of this client.
  }
  try {
    attachInitialToolbar(elements, state);
  } catch {
    // Degrades silently.
  }
  try {
    attachInitialGridFit(elements);
  } catch {
    // Degrades silently.
  }
}

if (typeof document !== "undefined") {
  try {
    hydrate();
  } catch {
    // Isolates this page module's hydration from the other two page
    // modules main.ts also imports for their own self-invoking hydration —
    // an uncaught error here must never stop them from getting their turn.
    // See backlog item 041.
  }
}
