import {
  type Puzzle,
  buildThumbnail,
  isPuzzleSolved,
} from "@kindle-nonograms/shared";
import {
  applyLocale,
  buildLanguageSwitcher,
  readLocaleCookie,
  resolveLocale,
  writeLocaleCookie,
} from "./i18n.js";
import { loadProgress } from "./progressStorage.js";

// Neither dimension of the revealed thumbnail exceeds this. Kept in sync
// with the fixed 36px `.thumb` box and 4px `.thumb-cell` size in
// renderLibraryPage.ts's stylesheet (8 * 4px fits inside 36px with room to
// center) — see .vibe/decisions/012-solved-thumbnail-built-client-side-only.md
// for why this is built here rather than embedded server-side.
const THUMBNAIL_MAX_DIMENSION = 8;

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
 * Builds the small solved-puzzle preview: one `.thumb-row` per row of
 * `buildThumbnail`'s downsampled grid, one `.thumb-cell` per column, filled
 * with the puzzle's own palette color (matching how a filled cell renders
 * during play) or left blank for an empty cell. Cell sizing itself lives in
 * the stylesheet, not inline, so only color varies per cell.
 */
function buildThumbnailPreview(puzzle: Puzzle): HTMLElement {
  const grid = buildThumbnail(puzzle, THUMBNAIL_MAX_DIMENSION);
  const wrapper = document.createElement("span");
  wrapper.className = "thumb-grid";

  for (const gridRow of grid) {
    const rowEl = document.createElement("span");
    rowEl.className = "thumb-row";

    for (const colorIndex of gridRow) {
      const cellEl = document.createElement("span");
      cellEl.className = "thumb-cell";
      if (colorIndex !== null) {
        cellEl.style.backgroundColor = puzzle.palette[colorIndex] ?? "";
      }
      rowEl.appendChild(cellEl);
    }

    wrapper.appendChild(rowEl);
  }

  return wrapper;
}

/**
 * Replaces a solved puzzle's neutral "?" placeholder with its real preview,
 * built fresh from the puzzle's own solution — never pre-rendered
 * server-side (see .vibe/decisions/012-solved-thumbnail-built-client-side-only.md).
 * A missing `.thumb` node (unexpected markup) is a silent no-op, same
 * defensive spirit as the solved-badge reveal below.
 */
function revealThumbnail(row: HTMLElement, puzzle: Puzzle): void {
  const thumb = row.querySelector<HTMLElement>(".thumb");
  if (!thumb) {
    return;
  }

  thumb.textContent = "";
  thumb.appendChild(buildThumbnailPreview(puzzle));
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

  const solvedById = new Map(
    puzzles.filter(isSolved).map((puzzle) => [puzzle.id, puzzle] as const),
  );
  if (solvedById.size === 0) {
    return;
  }

  const rows = document.querySelectorAll<HTMLElement>("[data-puzzle-id]");
  for (const row of Array.from(rows)) {
    const id = row.getAttribute("data-puzzle-id");
    const puzzle = id === null ? undefined : solvedById.get(id);
    if (!puzzle) {
      continue;
    }

    const badge = row.querySelector<HTMLElement>(".solved-badge");
    if (badge) {
      badge.hidden = false;
    }

    revealThumbnail(row, puzzle);
  }
}

if (typeof document !== "undefined") {
  hydrate();
}
