import {
  type Locale,
  PLAY_DEFAULT_ACTIVE_COLOR_INDEX,
  PLAY_DEFAULT_MODE,
  type PlayerCellMark,
  type Puzzle,
  type PuzzleProgress,
  type TranslationKey,
  correctWrongCells,
  createEmptyProgressGrid,
  createPuzzle,
  isPuzzleSolved,
  translate,
} from "@kindle-nonograms/shared";
import { computeFitFontSizePx } from "./fitGrid.js";
import { applyLocale, readLocaleCookie, resolveLocale } from "./i18n.js";
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
// A wide puzzle (e.g. 25 columns) measured on a narrow real Kindle screen
// can need a scale below the previous 0.5 floor to actually fit — that
// floor existed to protect legibility, but a puzzle clipped by
// `.grid-wrapper`'s overflow:hidden fail-safe (missing cells/clues
// entirely) is strictly worse than a puzzle rendered smaller than ideal.
const MIN_GRID_SCALE = 0.3;
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
 * Sets the banner's text to the message for `key` and updates its
 * `data-i18n` key to match, so a later language change (which retranslates
 * every `[data-i18n]` element by its current key) picks the right string
 * instead of reverting to whichever message was shown first.
 */
function setBannerMessage(
  banner: HTMLElement,
  locale: Locale,
  key: TranslationKey,
): void {
  banner.dataset.i18n = key;
  banner.textContent = translate(locale, key);
}

/**
 * Locates the win banner `renderPuzzlePage.ts` already bakes into the
 * static page (hidden, in its default "solved" wording) — see
 * `.ux/decisions/001-frozen-chrome-blocking-reconciliation.md`. Returns
 * `undefined` on a page shape that doesn't have one (e.g. an isolated test
 * fixture), same defensive spirit as `findElements` in
 * `hydrateEditorPage.ts`.
 */
function findBanner(): HTMLElement | undefined {
  return (
    document.querySelector<HTMLElement>('[data-role="win-banner"]') ?? undefined
  );
}

/**
 * Locates the one-time "progress can't be saved" warning
 * `renderPuzzlePage.ts` already bakes into the static page, hidden — see
 * `renderDefaultStorageWarning` there. Returns `undefined` on a page shape
 * that doesn't have one, same defensive spirit as `findBanner`.
 */
function findStorageWarning(): HTMLElement | undefined {
  return (
    document.querySelector<HTMLElement>('[data-role="storage-warning"]') ??
    undefined
  );
}

/**
 * Locates the toolbar `renderPuzzlePage.ts` already bakes into the static
 * page (Fill/Cross buttons, one color swatch button per palette color for a
 * multi-color puzzle, Check) and attaches this hydration's behavior to it —
 * see `.ux/decisions/001-frozen-chrome-blocking-reconciliation.md`. Returns
 * `undefined` when the expected controls aren't found, same defensive
 * spirit as `findElements` in `hydrateEditorPage.ts`.
 */
function attachToolbar(
  puzzle: Puzzle,
  state: PlayState,
  onCheck: () => void,
): void {
  const fillButton = document.querySelector<HTMLButtonElement>(
    '[data-role="mode-fill"]',
  );
  const crossButton = document.querySelector<HTMLButtonElement>(
    '[data-role="mode-cross"]',
  );
  const checkButton = document.querySelector<HTMLButtonElement>(
    '[data-role="check"]',
  );
  if (!fillButton || !crossButton || !checkButton) {
    return;
  }

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

  checkButton.addEventListener("click", onCheck);

  if (puzzle.palette.length > 1) {
    const swatchButtons = Array.from(
      document.querySelectorAll<HTMLButtonElement>('[data-role="swatch"]'),
    );

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

    swatchButtons.forEach((button, index) => {
      button.addEventListener("click", () => {
        state.activeColor = index;
        refreshSwatches();
      });
    });
  }
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
  banner: HTMLElement | undefined,
  locale: Locale,
  anchor: HTMLElement,
  reportSaveResult: (success: boolean) => void,
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
  reportSaveResult(saveProgress(puzzle.id, progress));

  // A missing banner (unexpected page shape) only disables the
  // win-confirmation feature — cell painting above must keep working
  // regardless. See .ux/decisions/001-frozen-chrome-blocking-reconciliation.md.
  if (!banner) {
    return;
  }

  const solved = isPuzzleSolved(puzzle, progress);
  // Only reset the message when the automatic banner is about to show
  // (always the solved one) — this resyncs it away from a "not solved"
  // message a manual Check click may have left in place. When not solved,
  // the banner just stays/goes hidden and its text is irrelevant.
  if (solved) {
    setBannerMessage(banner, locale, "play.winBanner.solved");
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
 * Runs on a Check click: clears every cell that doesn't match the puzzle's
 * solution back to untouched (never fills in a cell the player hasn't
 * attempted — see {@link correctWrongCells}), repaints only the cells that
 * actually changed, persists the result, then shows whichever banner
 * message applies — solved, "some mistakes were fixed" when cells were
 * corrected but the puzzle isn't finished yet, or the plain not-solved
 * message when nothing was wrong to begin with.
 */
function handleCheck(
  table: HTMLTableElement,
  puzzle: Puzzle,
  progress: PuzzleProgress,
  banner: HTMLElement | undefined,
  locale: Locale,
  anchor: HTMLElement,
  reportSaveResult: (success: boolean) => void,
): void {
  const correction = correctWrongCells(puzzle, progress);

  if (correction.changed) {
    for (let y = 0; y < puzzle.height; y++) {
      for (let x = 0; x < puzzle.width; x++) {
        const correctedMark = correction.cells[y][x];
        if (progress.cells[y][x] === correctedMark) {
          continue;
        }

        progress.cells[y][x] = correctedMark;
        const cell = table.querySelector<HTMLTableCellElement>(
          `td[data-row="${y}"][data-col="${x}"]`,
        );
        if (cell) {
          paintCell(cell, correctedMark, puzzle);
        }
      }
    }
    reportSaveResult(saveProgress(puzzle.id, progress));
  }

  // A missing banner (unexpected page shape) only disables the
  // win-confirmation feature — the correction above must still apply and
  // persist. See .ux/decisions/001-frozen-chrome-blocking-reconciliation.md.
  if (!banner) {
    return;
  }

  const solved = isPuzzleSolved(puzzle, progress);
  const key: TranslationKey = solved
    ? "play.winBanner.solved"
    : correction.changed
      ? "play.winBanner.corrected"
      : "play.winBanner.notSolved";
  setBannerMessage(banner, locale, key);

  const wasBannerHidden = banner.hidden;
  banner.hidden = false;
  if (wasBannerHidden) {
    applyGridFit(anchor, table);
  }
}

/**
 * Resolves the effective locale (saved cookie, else the browser's detected
 * language, else English) and applies it to every element on the page
 * carrying a `data-i18n` key — including the toolbar/banner's default text,
 * already present in the static markup by the time this runs (see
 * .ux/decisions/001-frozen-chrome-blocking-reconciliation.md), so no extra
 * step is needed to translate them. The puzzle page no longer has a
 * language switcher of its own — only the library page does — but it still
 * has to honor a choice made there (see .vibe/backlog/done/
 * 026-language-switcher-and-contribution-footer.md). Runs before the rest
 * of hydration so static markup (the back-link) is translated even if the
 * puzzle data itself turns out to be missing/corrupted. Returns the
 * resolved locale for the dynamic messages set later (e.g. the check
 * result), which still need it explicitly.
 */
function applyStoredLocale(): Locale {
  const locale = resolveLocale(readLocaleCookie(), navigator.language);
  applyLocale(locale);
  return locale;
}

/**
 * Hydrates a generated puzzle page: applies the previously resolved locale
 * (no switcher control on this page — see `applyStoredLocale`), attaches
 * behavior to the already-baked Fill/Cross mode toggle (plus color swatches
 * for multi-color puzzles) and win banner, restores any saved progress onto
 * the grid, and wires a single delegated click listener that toggles a
 * tapped cell's mark, redraws only that cell, persists progress, and shows
 * or hides the win banner based on whether the puzzle is currently solved.
 */
export function hydrate(): void {
  // The embedded `#puzzle-data` script is this page type's own unique
  // self-detection marker (see main.ts's doc comment) — checked first,
  // before anything else, so this hydration script stays a no-op on pages
  // of a different shape. A bare `<table>` stopped being unique to this
  // page once the editor page's canvas also started rendering one
  // statically (see `.ux/decisions/001-frozen-chrome-blocking-reconciliation.md`),
  // so it can no longer serve as the marker here.
  if (!document.getElementById("puzzle-data")) {
    return;
  }

  const table = document.querySelector("table");
  if (!table) {
    return;
  }

  const locale = applyStoredLocale();

  const puzzle = readPuzzle();
  if (!puzzle) {
    return;
  }

  // The toolbar and win banner are already real markup, in their default
  // shape, baked by `renderPuzzlePage.ts` — see
  // .ux/decisions/001-frozen-chrome-blocking-reconciliation.md. This only
  // locates them and attaches behavior; `applyStoredLocale` above already
  // retranslated their default text as part of its full-page `[data-i18n]`
  // pass, since they exist in the DOM from the very first paint. A missing
  // banner (unexpected page shape) must only disable the win-confirmation
  // feature, not the rest of hydration — same per-control isolation as
  // `attachToolbar`'s own missing-button guard.
  const banner = findBanner();
  const storageWarning = findStorageWarning();

  const progress = readProgress(puzzle);
  const state: PlayState = {
    mode: PLAY_DEFAULT_MODE,
    activeColor: PLAY_DEFAULT_ACTIVE_COLOR_INDEX,
  };
  const anchor: HTMLElement =
    table.closest<HTMLElement>(".grid-wrapper") ?? table;

  // Tracks whether the storage warning has already been shown once this
  // page view (see .vibe/decisions/020-save-failure-warning-scoped-to-page-view.md)
  // — set synchronously on first failure, before anything else, so two
  // failed saves in the same tick (a tap immediately followed by Check)
  // can't both slip through and show/re-fit twice.
  let storageWarningShown = false;

  function reportSaveResult(success: boolean): void {
    if (success || storageWarningShown || !storageWarning) {
      return;
    }
    storageWarningShown = true;
    storageWarning.hidden = false;
    applyGridFit(anchor, table);
  }

  // Each control's setup is isolated in its own try/catch so a throw while
  // wiring one (e.g. the toolbar) can never dead-end the others (progress
  // restore, the win banner, the grid's own click listener) — see the
  // "Exit & failure paths" this flow requires in
  // .ux/flows/001-frozen-chrome-before-hydration.md.
  try {
    attachToolbar(puzzle, state, () =>
      handleCheck(
        table,
        puzzle,
        progress,
        banner,
        locale,
        anchor,
        reportSaveResult,
      ),
    );
  } catch {
    // Degrades silently, same spirit as the rest of this client (see
    // progressStorage.ts) — a broken toolbar must not prevent the grid
    // itself from becoming interactive below.
  }

  try {
    paintExistingProgress(table, puzzle, progress);
    if (banner) {
      banner.hidden = !isPuzzleSolved(puzzle, progress);
    }
  } catch {
    // Degrades silently — the grid's own click listener (below) must still
    // attach even if restoring saved progress fails.
  }

  try {
    const dismissButton = storageWarning?.querySelector<HTMLButtonElement>(
      '[data-role="storage-warning-dismiss"]',
    );
    dismissButton?.addEventListener("click", () => {
      // Dismissing only hides it early — it must not clear
      // `storageWarningShown`, so a later failed save doesn't bring it back.
      storageWarning.hidden = true;
    });
  } catch {
    // Degrades silently — a broken dismiss control must not prevent the
    // grid itself from becoming interactive below.
  }

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
      reportSaveResult,
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
