import {
  type PlayerCellMark,
  type Puzzle,
  type PuzzleProgress,
  createEmptyProgressGrid,
  createPuzzle,
  isPuzzleSolved,
} from "@kindle-nonograms/shared";
import { loadProgress, saveProgress } from "./progressStorage.js";

type Mode = "fill" | "cross";

interface PlayState {
  mode: Mode;
  activeColor: number;
}

// Cycled by palette index, alongside the color itself, so a filled cell
// stays distinguishable even where the browser can't render color (Kindle's
// e-ink is often grayscale). Fixed cross glyph never collides with any of
// these. See .vibe/decisions/005-play-page-hydration-builds-its-own-controls.md.
const FILL_GLYPHS = ["●", "▲", "■", "◆"];
const CROSS_GLYPH = "✖";

function glyphForColor(index: number): string {
  return FILL_GLYPHS[index % FILL_GLYPHS.length];
}

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
    cell.textContent = glyphForColor(mark);
    cell.style.color = puzzle.palette[mark] ?? "";
  } else if (mark === "marked") {
    cell.textContent = CROSS_GLYPH;
    cell.style.color = "";
  } else {
    cell.textContent = "";
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

function buildBanner(): HTMLElement {
  const banner = document.createElement("p");
  banner.dataset.role = "win-banner";
  banner.hidden = true;
  banner.textContent = "Puzzle solved!";
  return banner;
}

function buildToolbar(puzzle: Puzzle, state: PlayState): HTMLElement {
  const toolbar = document.createElement("div");
  toolbar.className = "play-toolbar";

  const fillButton = document.createElement("button");
  fillButton.type = "button";
  fillButton.dataset.role = "mode-fill";
  fillButton.textContent = "Fill";

  const crossButton = document.createElement("button");
  crossButton.type = "button";
  crossButton.dataset.role = "mode-cross";
  crossButton.textContent = "Cross";

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
        button.textContent = active
          ? `${glyphForColor(index)} ✓`
          : glyphForColor(index);
      });
    };

    puzzle.palette.forEach((hex, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.role = "swatch";
      button.dataset.colorIndex = String(index);
      button.style.color = hex;
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
 * Hydrates a generated puzzle page: builds the Fill/Cross mode toggle (plus
 * color swatches for multi-color puzzles), restores any saved progress onto
 * the grid, and wires a single delegated click listener that toggles a
 * tapped cell's mark, redraws only that cell, persists progress, and shows
 * or hides a win banner based on whether the puzzle is currently solved.
 */
export function hydrate(): void {
  const puzzle = readPuzzle();
  if (!puzzle) {
    return;
  }

  const table = document.querySelector("table");
  if (!table) {
    return;
  }

  const progress = readProgress(puzzle);
  const state: PlayState = { mode: "fill", activeColor: 0 };

  const banner = buildBanner();
  const toolbar = buildToolbar(puzzle, state);
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
