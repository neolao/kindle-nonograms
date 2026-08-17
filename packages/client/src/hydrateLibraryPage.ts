import { type Puzzle, isPuzzleSolved } from "@kindle-nonograms/shared";
import { loadProgress } from "./progressStorage.js";

function readPuzzles(): Puzzle[] {
  const script = document.getElementById("puzzles-data");
  if (!(script instanceof HTMLScriptElement) || !script.textContent) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(script.textContent);
    return Array.isArray(parsed) ? (parsed as Puzzle[]) : [];
  } catch {
    return [];
  }
}

function isSolved(puzzle: Puzzle): boolean {
  const progress = loadProgress(puzzle.id);
  if (!progress) {
    return false;
  }

  try {
    return isPuzzleSolved(puzzle, progress);
  } catch {
    // Stored progress doesn't match this puzzle's shape (corrupted or
    // stale entry) — treat it as not solved rather than crashing hydration.
    return false;
  }
}

/**
 * Hydrates the generated library page: reads every puzzle's data embedded
 * in the page, checks each one's saved progress against its solution, and
 * reveals the already-reserved "solved" badge (see
 * .vibe/decisions/004-library-page-reserves-solved-badge-node.md) for every
 * puzzle solved correctly.
 */
export function hydrate(): void {
  const puzzles = readPuzzles();
  if (puzzles.length === 0) {
    return;
  }

  const solvedIds = new Set(
    puzzles.filter(isSolved).map((puzzle) => puzzle.id),
  );
  if (solvedIds.size === 0) {
    return;
  }

  const rows = document.querySelectorAll<HTMLElement>("[data-puzzle-id]");
  for (const row of Array.from(rows)) {
    const id = row.getAttribute("data-puzzle-id");
    if (id === null || !solvedIds.has(id)) {
      continue;
    }

    const badge = row.querySelector<HTMLElement>(".solved-badge");
    if (badge) {
      badge.hidden = false;
    }
  }
}

if (typeof document !== "undefined") {
  hydrate();
}
