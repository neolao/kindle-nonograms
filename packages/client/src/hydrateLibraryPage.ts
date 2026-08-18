import { type Puzzle, isPuzzleSolved } from "@kindle-nonograms/shared";
import {
  applyLocale,
  buildLanguageSwitcher,
  readLocaleCookie,
  resolveLocale,
  writeLocaleCookie,
} from "./i18n.js";
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
 * Inserts the FR/EN language switcher right after the page heading and
 * applies the resolved locale (saved cookie, else the browser's detected
 * language, else English) to every element on the page carrying a
 * `data-i18n` key. Runs before any other hydration so the switcher and
 * translated strings are present even on the empty library page.
 */
function setUpLanguageSwitcher(): void {
  const heading = document.querySelector("h1");
  if (!heading) {
    return;
  }

  const locale = resolveLocale(readLocaleCookie(), navigator.language);
  const switcher = buildLanguageSwitcher(locale, (newLocale) => {
    writeLocaleCookie(newLocale);
    applyLocale(newLocale);
  });

  heading.parentNode?.insertBefore(switcher, heading.nextSibling);
  applyLocale(locale);
}

/**
 * Hydrates the generated library page: inserts the language switcher,
 * reads every puzzle's data embedded in the page, checks each one's saved
 * progress against its solution, and reveals the already-reserved "solved"
 * badge (see .vibe/decisions/004-library-page-reserves-solved-badge-node.md)
 * for every puzzle solved correctly.
 */
export function hydrate(): void {
  // The embedded `#puzzles-data` script is this page type's own
  // self-detection marker (see main.ts's doc comment) — checked first, so
  // this hydration script stays a no-op on a page of a different shape
  // (e.g. the puzzle page, which has an `<h1>` of its own too, but no
  // `puzzles-data` script — it has a singular `puzzle-data` one instead).
  if (!document.getElementById("puzzles-data")) {
    return;
  }

  setUpLanguageSwitcher();

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
