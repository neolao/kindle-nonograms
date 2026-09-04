import {
  LIBRARY_PAGE_SIZE,
  type Puzzle,
  buildThumbnail,
  isPuzzleSolved,
  isSupportedLocale,
} from "@kindle-nonograms/shared";
import {
  applyLocale,
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
 * Locates the FR/EN language switcher `renderLibraryPage.ts` already bakes
 * into the page footer (English selected by default — the locale itself
 * isn't known at build time) and attaches its change behavior, then applies
 * the resolved locale (saved cookie, else the browser's detected language,
 * else English) to every element on the page carrying a `data-i18n` key —
 * see .ux/decisions/001-frozen-chrome-blocking-reconciliation.md. This is
 * the only page that has a switcher control — the puzzle page only applies
 * a previously saved locale, see `hydratePlayPage.ts` (see
 * .vibe/backlog/done/026-language-switcher-and-contribution-footer.md).
 * Runs before any other hydration so the switcher and translated strings
 * are present even on the empty library page.
 */
function setUpLanguageSwitcher(): void {
  const locale = resolveLocale(readLocaleCookie(), navigator.language);

  const select = document.querySelector<HTMLSelectElement>(
    '[data-role="language-switcher-select"]',
  );
  if (select) {
    select.value = locale;
    select.addEventListener("change", () => {
      if (isSupportedLocale(select.value)) {
        writeLocaleCookie(select.value);
        applyLocale(select.value);
      }
    });
  }

  applyLocale(locale);
}

/**
 * Locates the library page's already-baked size/color filter selects,
 * "no results" message, and pagination controls (see
 * `renderLibraryPage.ts`'s `renderFiltersAndPagination` and
 * .ux/decisions/001-frozen-chrome-blocking-reconciliation.md), and wires
 * them into one shared `render()` pass: a row is visible only if it matches
 * both filters AND falls inside the current page's slice of the *filtered*
 * result set. Rows are only ever toggled via `hidden`, never removed or
 * reordered, so the solved-badge/thumbnail hydration in `hydrate` keeps
 * finding every row regardless of its current filter/page state. `render()`
 * still runs once at setup even though the static defaults (page 1, both
 * filters at "all") already match its result — a safe, invisible no-op
 * that also initializes this closure's own `currentPage`/`totalPages`
 * state. A missing control (unexpected page shape) leaves this a no-op,
 * same defensive spirit as `findElements` in `hydrateEditorPage.ts`.
 */
function setUpFiltersAndPagination(): void {
  const sizeSelect = document.querySelector<HTMLSelectElement>(
    '[data-role="library-filter-size-select"]',
  );
  const colorSelect = document.querySelector<HTMLSelectElement>(
    '[data-role="library-filter-color-select"]',
  );
  const noResultsMessage = document.querySelector<HTMLElement>(
    '[data-role="library-filter-no-results"]',
  );
  const paginationContainer = document.querySelector<HTMLElement>(
    '[data-role="library-pagination"]',
  );
  const prevButton = document.querySelector<HTMLButtonElement>(
    '[data-role="library-pagination-prev"]',
  );
  const nextButton = document.querySelector<HTMLButtonElement>(
    '[data-role="library-pagination-next"]',
  );
  const statusPosition = document.querySelector<HTMLElement>(
    '[data-role="library-pagination-position"]',
  );
  if (
    !sizeSelect ||
    !colorSelect ||
    !noResultsMessage ||
    !paginationContainer ||
    !prevButton ||
    !nextButton ||
    !statusPosition
  ) {
    return;
  }

  let currentPage = 1;
  let totalPages = 1;

  function render(): void {
    const sizeValue = sizeSelect?.value;
    const colorValue = colorSelect?.value;

    const allRows = Array.from(
      document.querySelectorAll<HTMLElement>("[data-puzzle-id]"),
    );
    const matched = allRows.filter(
      (row) =>
        (sizeValue === "all" || row.dataset.sizeBucket === sizeValue) &&
        (colorValue === "all" || row.dataset.colorType === colorValue),
    );

    totalPages = Math.max(1, Math.ceil(matched.length / LIBRARY_PAGE_SIZE));
    if (currentPage > totalPages) {
      currentPage = totalPages;
    }

    const start = (currentPage - 1) * LIBRARY_PAGE_SIZE;
    const pageRows = new Set(matched.slice(start, start + LIBRARY_PAGE_SIZE));
    for (const row of allRows) {
      row.hidden = !pageRows.has(row);
    }

    noResultsMessage.hidden = matched.length > 0;

    const showControls = matched.length > LIBRARY_PAGE_SIZE;
    paginationContainer.hidden = !showControls;
    if (showControls) {
      statusPosition.textContent = `${currentPage} / ${totalPages}`;
      prevButton.disabled = currentPage <= 1;
      nextButton.disabled = currentPage >= totalPages;
    }
  }

  const onFilterChange = () => {
    currentPage = 1;
    render();
  };
  sizeSelect.addEventListener("change", onFilterChange);
  colorSelect.addEventListener("change", onFilterChange);

  const list = document.querySelector("ul");

  prevButton.addEventListener("click", () => {
    if (currentPage <= 1) {
      return;
    }
    currentPage -= 1;
    render();
    if (list) {
      scrollListIntoView(list);
    }
  });
  nextButton.addEventListener("click", () => {
    if (currentPage >= totalPages) {
      return;
    }
    currentPage += 1;
    render();
    if (list) {
      scrollListIntoView(list);
    }
  });

  render();
}

/**
 * Scrolls the puzzle list back into view after a page change — without it,
 * a player who just tapped Next (a control below a 25-row list) stays
 * parked next to what looks like stale content until they scroll up
 * themselves, easy to miss on Kindle's slow e-ink refresh. Guarded because
 * `scrollIntoView` isn't implemented in every test/runtime environment;
 * failing silently there is strictly better than crashing hydration over a
 * cosmetic convenience.
 */
function scrollListIntoView(list: Element): void {
  try {
    list.scrollIntoView({ block: "start" });
  } catch {
    // Not supported in this environment — no-op.
  }
}

/**
 * Hydrates the generated library page: inserts the language switcher,
 * reads every puzzle's data embedded in the page, sets up the size/color
 * filter controls, checks each puzzle's saved progress against its
 * solution, and reveals the already-reserved "solved" badge (see
 * .vibe/decisions/004-library-page-reserves-solved-badge-node.md) for
 * every puzzle solved correctly.
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

  setUpFiltersAndPagination();

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
