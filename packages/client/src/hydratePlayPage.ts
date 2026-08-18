import {
  type Locale,
  type PlayerCellMark,
  type Puzzle,
  type PuzzleProgress,
  createEmptyProgressGrid,
  createPuzzle,
  isPuzzleSolved,
  translate,
} from "@kindle-nonograms/shared";
import { contrastingTextColor } from "./contrastColor.js";
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

function buildBanner(locale: Locale): HTMLElement {
  const banner = document.createElement("p");
  banner.dataset.role = "win-banner";
  banner.dataset.i18n = "play.winBanner.solved";
  banner.hidden = true;
  banner.textContent = translate(locale, "play.winBanner.solved");
  return banner;
}

function buildToolbar(
  puzzle: Puzzle,
  state: PlayState,
  locale: Locale,
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

  toolbar.append(fillButton, crossButton);

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
  banner.hidden = !isPuzzleSolved(puzzle, progress);
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
    heading.parentNode?.insertBefore(switcher, heading.nextSibling);
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

  const banner = buildBanner(locale);
  const toolbar = buildToolbar(puzzle, state, locale);
  const anchor = table.closest(".grid-wrapper") ?? table;
  anchor.parentNode?.insertBefore(banner, anchor);
  anchor.parentNode?.insertBefore(toolbar, anchor);

  paintExistingProgress(table, puzzle, progress);
  banner.hidden = !isPuzzleSolved(puzzle, progress);

  table.addEventListener("click", (event) =>
    handleGridClick(event, table, puzzle, progress, state, banner),
  );
}

if (typeof document !== "undefined") {
  hydrate();
}
