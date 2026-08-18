import {
  type Locale,
  type PlayerCellMark,
  type Puzzle,
  type PuzzleProgress,
  type TranslationKey,
  createEmptyProgressGrid,
  createPuzzle,
  isPuzzleSolved,
  translate,
} from "@kindle-nonograms/shared";
import { contrastingTextColor } from "./contrastColor.js";
import { computeFitFontSizePx } from "./fitGrid.js";
import {
  applyLocale,
  buildLanguageSwitcher,
  readLocaleCookie,
  resolveLocale,
  writeLocaleCookie,
} from "./i18n.js";
import { loadProgress, saveProgress } from "./progressStorage.js";

type Mode = "fill" | "cross";

interface PlayState {
  mode: Mode;
  activeColor: number;
}

// A crossed cell always renders this fixed glyph regardless of active color,
// so "excluded" never visually collides with a filled cell's plain color
// fill. See .vibe/decisions/009-filled-cells-drop-the-disambiguation-glyph.md.
const CROSS_GLYPH = "✖";

// Grid-fit tuning: the whole grid (cells, clues, borders) is `em`-sized, so
// a single `font-size` change on the wrapper scales everything together.
const BASE_FONT_SIZE_PX = 16;
const MIN_GRID_SCALE = 0.5;
const MAX_GRID_SCALE = 2;
// Fixed breathing room (px) kept clear of the viewport edge, on top of
// computeFitFontSizePx's own proportional safety margin.
const VIEWPORT_GUTTER_PX = 8;

function readPuzzle(): Puzzle | undefined {
  const script = document.getElementById("puzzle-data");
  if (!(script instanceof HTMLScriptElement) || !script.textContent) {
    return undefined;
  }

  try {
    return createPuzzle(JSON.parse(script.textContent) as Puzzle);
  } catch {
    return undefined;
  }
}

function isValidProgress(puzzle: Puzzle, progress: PuzzleProgress): boolean {
  return (
    progress.cells.length === puzzle.height &&
    progress.cells.every((row) => row.length === puzzle.width)
  );
}

function readProgress(puzzle: Puzzle): PuzzleProgress {
  const stored = loadProgress(puzzle.id);
  if (stored && isValidProgress(puzzle, stored)) {
    return stored;
  }

  return { cells: createEmptyProgressGrid(puzzle.width, puzzle.height) };
}

function paintCell(
  cell: HTMLTableCellElement,
  mark: PlayerCellMark,
  puzzle: Puzzle,
): void {
  if (typeof mark === "number") {
    // A filled cell is a plain solid-color square, matching the classic
    // nonogram look — no glyph on top. See
    // .vibe/decisions/009-filled-cells-drop-the-disambiguation-glyph.md.
    cell.textContent = "";
    cell.style.backgroundColor = puzzle.palette[mark] ?? "";
    cell.style.color = "";
  } else if (mark === "marked") {
    // A crossed cell never gets a solid fill — that absence is the whole
    // cue distinguishing it from a filled cell (see
    // .vibe/decisions/003-clue-color-plus-pattern-cue.md on never relying
    // on color alone). Reset explicitly: a cell can transition from filled
    // to crossed, and a stale background/text color must not survive that.
    cell.textContent = CROSS_GLYPH;
    cell.style.backgroundColor = "";
    cell.style.color = "";
  } else {
    cell.textContent = "";
    cell.style.backgroundColor = "";
    cell.style.color = "";
  }
}

function paintExistingProgress(
  table: HTMLTableElement,
  puzzle: Puzzle,
  progress: PuzzleProgress,
): void {
  for (let y = 0; y < puzzle.height; y++) {
    for (let x = 0; x < puzzle.width; x++) {
      const mark = progress.cells[y][x];
      if (mark === null) {
        continue;
      }

      const cell = table.querySelector<HTMLTableCellElement>(
        `td[data-row="${y}"][data-col="${x}"]`,
      );
      if (cell) {
        paintCell(cell, mark, puzzle);
      }
    }
  }
}

/**
 * Sets the banner's text to the solved or not-solved message and updates its
 * `data-i18n` key to match, so a later language change (which retranslates
 * every `[data-i18n]` element by its current key) picks the right string
 * instead of reverting to whichever message was shown first.
 */
function setBannerMessage(
  banner: HTMLElement,
  locale: Locale,
  solved: boolean,
): void {
  const key: TranslationKey = solved
    ? "play.winBanner.solved"
    : "play.winBanner.notSolved";
  banner.dataset.i18n = key;
  banner.textContent = translate(locale, key);
}

function buildBanner(locale: Locale): HTMLElement {
  const banner = document.createElement("p");
  banner.dataset.role = "win-banner";
  // Announces its content to assistive tech whenever it becomes visible or
  // its text changes, since Kindle's UI otherwise gives no non-visual cue
  // that a check result appeared.
  banner.setAttribute("aria-live", "polite");
  banner.hidden = true;
  setBannerMessage(banner, locale, true);
  return banner;
}

function buildToolbar(
  puzzle: Puzzle,
  state: PlayState,
  locale: Locale,
  onCheck: () => void,
): HTMLElement {
  const toolbar = document.createElement("div");
  toolbar.className = "play-toolbar";

  const fillButton = document.createElement("button");
  fillButton.type = "button";
  fillButton.dataset.role = "mode-fill";
  fillButton.dataset.i18n = "play.modeFill";
  fillButton.textContent = translate(locale, "play.modeFill");

  const crossButton = document.createElement("button");
  crossButton.type = "button";
  crossButton.dataset.role = "mode-cross";
  crossButton.dataset.i18n = "play.modeCross";
  crossButton.textContent = translate(locale, "play.modeCross");

  const refreshModeButtons = (): void => {
    fillButton.setAttribute("aria-pressed", String(state.mode === "fill"));
    crossButton.setAttribute("aria-pressed", String(state.mode === "cross"));
  };

  fillButton.addEventListener("click", () => {
    state.mode = "fill";
    refreshModeButtons();
  });
  crossButton.addEventListener("click", () => {
    state.mode = "cross";
    refreshModeButtons();
  });
  refreshModeButtons();

  const checkButton = document.createElement("button");
  checkButton.type = "button";
  checkButton.dataset.role = "check";
  checkButton.dataset.i18n = "play.check";
  checkButton.textContent = translate(locale, "play.check");
  checkButton.addEventListener("click", onCheck);

  toolbar.append(fillButton, crossButton, checkButton);

  if (puzzle.palette.length > 1) {
    const swatchButtons: HTMLButtonElement[] = [];

    const refreshSwatches = (): void => {
      swatchButtons.forEach((button, index) => {
        const active = index === state.activeColor;
        button.setAttribute("aria-pressed", String(active));
        button.style.borderWidth = active ? "3px" : "1px";
        // A swatch is a plain solid-color square, matching how a filled grid
        // cell now renders; only the checkmark (a fixed, non-color cue)
        // marks which one is active. See
        // .vibe/decisions/009-filled-cells-drop-the-disambiguation-glyph.md.
        button.textContent = active ? "✓" : "";
      });
    };

    puzzle.palette.forEach((hex, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.role = "swatch";
      button.dataset.colorIndex = String(index);
      button.style.backgroundColor = hex;
      button.style.color = contrastingTextColor(hex);
      button.addEventListener("click", () => {
        state.activeColor = index;
        refreshSwatches();
      });
      swatchButtons.push(button);
      toolbar.append(button);
    });

    refreshSwatches();
  }

  return toolbar;
}

/**
 * Scales `anchor` (the grid wrapper, or the table itself when there is no
 * wrapper) to fit the currently available viewport space, via a single
 * `font-size` change — everything inside is `em`-sized already. The
 * natural size is measured off `table` rather than `anchor` itself: a
 * `<table>` shrink-wraps to its actual content by default, but the
 * wrapper `<div>` around it stretches to fill its container's width
 * regardless of how small the puzzle is, which would otherwise make a
 * small puzzle's "natural" width read as the full page width and defeat
 * scaling it up. Resets font-size to the base first so the measurement
 * reflects the grid's true unscaled size: `scrollWidth`/`scrollHeight`
 * still report the full content size even once `.grid-wrapper{overflow:
 * hidden}` clips it visually, which is exactly what makes that fail-safe
 * measurable instead of a dead end.
 */
function applyGridFit(anchor: HTMLElement, table: HTMLElement): void {
  anchor.style.fontSize = `${BASE_FONT_SIZE_PX}px`;

  const naturalWidth = table.scrollWidth;
  const naturalHeight = table.scrollHeight;
  const availableWidth =
    document.documentElement.clientWidth - VIEWPORT_GUTTER_PX;
  const availableHeight =
    document.documentElement.clientHeight -
    anchor.getBoundingClientRect().top -
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

  anchor.style.fontSize = `${fontSizePx}px`;
  // A block element with `overflow:hidden` but no bounded size still grows
  // to fit its content — it clips nothing on its own. A puzzle large enough
  // that even minScale doesn't bring it under the available space (e.g. a
  // 45x45 grid on a small screen) would otherwise keep growing the page
  // itself, defeating the whole point: `overflow:hidden` on its own isn't
  // the fail-safe, this cap is what actually makes it one. Floored at 0 —
  // an unusable/negative measurement (e.g. jsdom's zero layout, or the
  // header chrome alone taller than the viewport) must never turn into an
  // invalid negative max-width/max-height.
  anchor.style.maxWidth = `${Math.max(availableWidth, 0)}px`;
  anchor.style.maxHeight = `${Math.max(availableHeight, 0)}px`;
}

function toggleMark(current: PlayerCellMark, state: PlayState): PlayerCellMark {
  if (state.mode === "cross") {
    return current === "marked" ? null : "marked";
  }

  return current === state.activeColor ? null : state.activeColor;
}

function handleGridClick(
  event: MouseEvent,
  table: HTMLTableElement,
  puzzle: Puzzle,
  progress: PuzzleProgress,
  state: PlayState,
  banner: HTMLElement,
  locale: Locale,
  anchor: HTMLElement,
): void {
  if (!(event.target instanceof HTMLElement)) {
    return;
  }

  const cell = event.target.closest<HTMLTableCellElement>(
    "td[data-row][data-col]",
  );
  if (!cell || !table.contains(cell)) {
    return;
  }

  const y = Number(cell.getAttribute("data-row"));
  const x = Number(cell.getAttribute("data-col"));
  if (Number.isNaN(y) || Number.isNaN(x)) {
    return;
  }

  progress.cells[y][x] = toggleMark(progress.cells[y][x], state);
  paintCell(cell, progress.cells[y][x], puzzle);
  saveProgress(puzzle.id, progress);

  const solved = isPuzzleSolved(puzzle, progress);
  // Only reset the message when the automatic banner is about to show
  // (always the solved one) — this resyncs it away from a "not solved"
  // message a manual Check click may have left in place. When not solved,
  // the banner just stays/goes hidden and its text is irrelevant.
  if (solved) {
    setBannerMessage(banner, locale, true);
  }

  const wasBannerHidden = banner.hidden;
  banner.hidden = !solved;
  // Re-fit only on a hidden->visible transition: that's the one that can
  // shrink the space left for the grid and reintroduce a scrollbar. Going
  // the other way just leaves a little slack, which is harmless — and
  // re-fitting on every tap regardless would mean measuring/reflowing the
  // grid on every cell click, which is wasteful and risks a visible jump.
  if (!banner.hidden && wasBannerHidden) {
    applyGridFit(anchor, table);
  }
}

/**
 * Inserts the FR/EN language switcher right after the page heading and
 * applies the resolved locale (saved cookie, else the browser's detected
 * language, else English) to every element on the page carrying a
 * `data-i18n` key. Runs before the rest of hydration so the switcher is
 * present even if the puzzle data itself turns out to be missing/corrupted.
 * Returns the resolved locale so the caller can build the toolbar/banner
 * already in the right language, with no translation flash.
 */
function setUpLanguageSwitcher(): Locale {
  const locale = resolveLocale(readLocaleCookie(), navigator.language);

  const heading = document.querySelector("h1");
  if (heading) {
    const switcher = buildLanguageSwitcher(locale, (newLocale) => {
      writeLocaleCookie(newLocale);
      applyLocale(newLocale);
    });
    // Joins the back-link's own header row when the static markup provides
    // one, rather than always inserting a fresh row right after the
    // heading: an extra row above the grid would shrink the space
    // `applyGridFit` has to work with on small screens. Falls back to the
    // old insertion point when no such row exists (e.g. isolated tests).
    const headerRow = document.querySelector(".page-header");
    if (headerRow) {
      headerRow.append(switcher);
    } else {
      heading.parentNode?.insertBefore(switcher, heading.nextSibling);
    }

    // Retranslates any static `[data-i18n]` markup already on the page (the
    // back-link) to the resolved locale. The toolbar/banner built below by
    // `hydrate()` don't exist yet at this point, so this can't double-apply
    // to them — they get their initial text straight from `translate()`
    // instead. Same call as `hydrateLibraryPage.ts` makes for its heading.
    applyLocale(locale);
  }

  return locale;
}

/**
 * Hydrates a generated puzzle page: inserts the language switcher, builds
 * the Fill/Cross mode toggle (plus color swatches for multi-color puzzles),
 * restores any saved progress onto the grid, and wires a single delegated
 * click listener that toggles a tapped cell's mark, redraws only that cell,
 * persists progress, and shows or hides a win banner based on whether the
 * puzzle is currently solved.
 */
export function hydrate(): void {
  // A `<table>` is this page type's own self-detection marker (see
  // main.ts's doc comment) — checked first, before anything else
  // including the switcher, so this hydration script stays a no-op on
  // pages of a different shape (e.g. the library page, which has no
  // table but does have an `<h1>` of its own).
  const table = document.querySelector("table");
  if (!table) {
    return;
  }

  const locale = setUpLanguageSwitcher();

  const puzzle = readPuzzle();
  if (!puzzle) {
    return;
  }

  const progress = readProgress(puzzle);
  const state: PlayState = { mode: "fill", activeColor: 0 };
  const anchor: HTMLElement =
    table.closest<HTMLElement>(".grid-wrapper") ?? table;

  const banner = buildBanner(locale);
  const toolbar = buildToolbar(puzzle, state, locale, () => {
    setBannerMessage(banner, locale, isPuzzleSolved(puzzle, progress));
    const wasBannerHidden = banner.hidden;
    banner.hidden = false;
    if (wasBannerHidden) {
      applyGridFit(anchor, table);
    }
  });
  // Prefers the static chrome panel (see
  // .vibe/decisions/014-puzzle-page-chrome-panel-wrapper.md) so the toolbar
  // and banner land inside its bordered/shadowed box alongside the heading
  // and back-link, instead of as bare siblings of the grid. Falls back to
  // the old insertion point when no such panel exists (e.g. isolated tests).
  const chromePanel = document.querySelector<HTMLElement>(".chrome-panel");
  if (chromePanel) {
    chromePanel.append(banner, toolbar);
  } else {
    anchor.parentNode?.insertBefore(banner, anchor);
    anchor.parentNode?.insertBefore(toolbar, anchor);
  }

  paintExistingProgress(table, puzzle, progress);
  banner.hidden = !isPuzzleSolved(puzzle, progress);

  table.addEventListener("click", (event) =>
    handleGridClick(
      event,
      table,
      puzzle,
      progress,
      state,
      banner,
      locale,
      anchor,
    ),
  );

  // Fit once now that the switcher/toolbar/banner are all in place (so the
  // available space is measured accurately), then keep it fitted across
  // viewport changes.
  applyGridFit(anchor, table);
  window.addEventListener("resize", () => applyGridFit(anchor, table));
}

if (typeof document !== "undefined") {
  hydrate();
}
