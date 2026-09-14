import {
  LIBRARY_PAGE_SIZE,
  type Locale,
  type Puzzle,
  isPuzzleSolved,
  isSupportedLocale,
  translate,
} from "@kindle-nonograms/shared";
import {
  applyLocale,
  readLocaleCookie,
  resolveLocale,
  writeLocaleCookie,
} from "./i18n.js";
import type {
  ColorFilterValue,
  StatusFilterValue,
} from "./libraryFiltersStorage.js";
import {
  readLibraryFiltersCookie,
  writeLibraryFiltersCookie,
} from "./libraryFiltersStorage.js";
import { loadPuzzleOpenedAt } from "./openedStorage.js";
import { loadProgress } from "./progressStorage.js";

// The fixed pixel budget every revealed thumbnail's cells are scaled to fit
// inside, on the puzzle's longer axis — kept in sync with the fixed 36px
// `.thumb` box in renderLibraryPage.ts's stylesheet, with room to center a
// non-square result. Every real puzzle cell is rendered (see
// .vibe/decisions/038-thumbnail-drops-downsampling-renders-every-cell.md —
// no cell is ever merged or dropped to fit); only each cell's own on-screen
// size shrinks as the puzzle grows, computed as THUMBNAIL_BOX_PX divided by
// the puzzle's longer dimension. See
// .vibe/decisions/012-solved-thumbnail-built-client-side-only.md for why
// this is built here rather than embedded server-side.
const THUMBNAIL_BOX_PX = 32;

/**
 * A missing script element (no puzzles-data at all) or empty text content is
 * not a parse failure — it just means there's nothing embedded to read, so
 * it's treated the same as a genuinely empty library, silently. A syntax
 * error or an unexpected (non-array) shape, however, means the embedded data
 * is corrupted rather than empty — both are logged so a broken build doesn't
 * silently look identical to a library with zero puzzles (see backlog item
 * 056).
 */
function readPuzzles(): Puzzle[] {
  const script = document.getElementById("puzzles-data");
  if (!(script instanceof HTMLScriptElement) || !script.textContent) {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(script.textContent);
  } catch (error) {
    console.warn(
      "Failed to parse the embedded puzzles data — treating the library as empty.",
      error,
    );
    return [];
  }

  if (!Array.isArray(parsed)) {
    console.warn(
      "Embedded puzzles data is not an array — treating the library as empty.",
    );
    return [];
  }

  return parsed as Puzzle[];
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
 * A not-yet-solved puzzle's saved progress, converted to a plain solution-
 * shaped grid for `buildThumbnail` — every actually-painted cell keeps its
 * color, `"marked"` and untouched cells both become `null` (a mark is a
 * deliberate exclusion, not a color, so it stays neutral in the preview
 * exactly like an untouched cell — backlog item 071). Returns `undefined`
 * when there's no saved progress, when it doesn't match this puzzle's
 * shape (corrupted or stale entry, same defensive spirit as `isSolved`),
 * or when nothing has actually been painted yet (every cell `null`/
 * `"marked"`) — that last case keeps the neutral "?" placeholder instead of
 * revealing a preview indistinguishable from "never opened".
 */
function partialProgressCells(puzzle: Puzzle): (number | null)[][] | undefined {
  const progress = loadProgress(puzzle.id);
  if (!progress) {
    return undefined;
  }

  const { cells } = progress;
  if (
    cells.length !== puzzle.height ||
    cells.some((row) => row.length !== puzzle.width)
  ) {
    return undefined;
  }

  const solutionShapedCells = cells.map((row) =>
    row.map((mark) => (typeof mark === "number" ? mark : null)),
  );
  const hasAnyPaintedCell = solutionShapedCells.some((row) =>
    row.some((cell) => cell !== null),
  );

  return hasAnyPaintedCell ? solutionShapedCells : undefined;
}

/**
 * Builds a small preview: one `.thumb-row` per row of `cells`, one
 * `.thumb-cell` per column, filled with `palette`'s matching color (matching
 * how a filled cell renders during play) or left blank for an empty cell.
 * Every real cell is rendered — none merged or dropped, see
 * .vibe/decisions/038-thumbnail-drops-downsampling-renders-every-cell.md —
 * so each cell's own square size is computed here and set inline, scaled
 * down from `THUMBNAIL_BOX_PX` by the puzzle's longer dimension; it can no
 * longer be a single fixed value in the stylesheet since it now varies per
 * puzzle. Shared by the solved preview (`cells` = the puzzle's own
 * solution) and the partial-progress preview (`cells` = the player's own
 * painted cells, see `partialProgressCells`).
 */
function buildThumbnailPreview(
  cells: (number | null)[][],
  palette: string[],
): HTMLElement {
  const height = cells.length;
  const width = cells[0]?.length ?? 0;
  const cellPx = THUMBNAIL_BOX_PX / Math.max(width, height, 1);

  const wrapper = document.createElement("span");
  wrapper.className = "thumb-grid";

  for (const gridRow of cells) {
    const rowEl = document.createElement("span");
    rowEl.className = "thumb-row";

    for (const colorIndex of gridRow) {
      const cellEl = document.createElement("span");
      cellEl.className = "thumb-cell";
      cellEl.style.width = `${cellPx}px`;
      cellEl.style.height = `${cellPx}px`;
      if (colorIndex !== null) {
        cellEl.style.backgroundColor = palette[colorIndex] ?? "";
      }
      rowEl.appendChild(cellEl);
    }

    wrapper.appendChild(rowEl);
  }

  return wrapper;
}

/**
 * Replaces a puzzle's neutral "?" placeholder with a real preview built
 * from `cells` (the solution for a solved puzzle, or the player's own
 * partial progress — never pre-rendered server-side, see
 * .vibe/decisions/012-solved-thumbnail-built-client-side-only.md). A
 * missing `.thumb` node (unexpected markup) is a silent no-op, same
 * defensive spirit as the solved-badge reveal below.
 */
function revealThumbnail(
  row: HTMLElement,
  cells: (number | null)[][],
  palette: string[],
): void {
  const thumb = row.querySelector<HTMLElement>(".thumb");
  if (!thumb) {
    return;
  }

  thumb.textContent = "";
  thumb.appendChild(buildThumbnailPreview(cells, palette));
}

/**
 * Folds the solved status into the puzzle link's own accessible name: sets
 * `aria-label` to the link's own visible text (name + dimensions) followed
 * by the translated "solved" word, and tags it `data-i18n-aria` so a later
 * language switch keeps both halves in sync via `applyLocale()`'s generic
 * `{label}`/`{status}` substitution — see
 * .vibe/decisions/031-solved-link-aria-label-composes-badge-translation.md.
 * A missing link (unexpected row markup) is a silent no-op, same defensive
 * spirit as `revealThumbnail` above. Never called for an unsolved puzzle,
 * so that link's accessible name is left exactly as rendered.
 */
function markLinkAsSolved(row: HTMLElement, locale: Locale): void {
  const link = row.querySelector<HTMLAnchorElement>("a");
  if (!link) {
    return;
  }

  const key = "library.solvedPuzzleLinkAriaLabel";
  link.dataset.i18nAria = key;
  link.setAttribute(
    "aria-label",
    translate(locale, key)
      .replace("{label}", link.textContent ?? "")
      .replace("{status}", translate(locale, "library.solvedBadge")),
  );
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
 * are present even on the empty library page. Returns the resolved locale
 * so later hydration steps (the solved-badge reveal's own aria-label) can
 * compose their own translated text in the same language without
 * re-resolving it from the cookie/browser a second time.
 */
function setUpLanguageSwitcher(): Locale {
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
  return locale;
}

/**
 * Wires a set of mutually-exclusive toggle buttons: tapping one presses it
 * and un-presses every other button in the set; tapping the already-active
 * button returns the whole group to `"all"` (none pressed) — the one state
 * a `<select>`'s N options can represent that plain toggle buttons can't
 * without this rule. Shared by the color filter (2 buttons) and the status
 * filter (3 buttons) so both groups keep exactly the same interaction
 * instead of two near-duplicate implementations (see backlog item 072).
 */
function wireExclusiveToggle<T extends string>(
  entries: readonly { value: T; button: HTMLButtonElement }[],
  onChange: (value: T | "all") => void,
): { setActive: (value: T | "all") => void } {
  let active: T | "all" = "all";

  function refresh(): void {
    for (const entry of entries) {
      entry.button.setAttribute("aria-pressed", String(entry.value === active));
    }
  }

  for (const entry of entries) {
    entry.button.addEventListener("click", () => {
      active = active === entry.value ? "all" : entry.value;
      refresh();
      onChange(active);
    });
  }

  return {
    setActive(value: T | "all"): void {
      active = value;
      refresh();
    },
  };
}

/**
 * Locates the library page's already-baked color and status filter toggle
 * buttons, "no results" message, and pagination controls (see
 * `renderLibraryPage.ts`'s `renderFiltersAndPagination` and
 * .ux/decisions/001-frozen-chrome-blocking-reconciliation.md), and wires
 * them into one shared `render()` pass: a row is visible only if it
 * matches every filter AND falls inside the current page's slice of the
 * *filtered* result set. Rows are only ever toggled via `hidden`, never
 * removed or reordered, so the solved-badge/thumbnail hydration in
 * `hydrate` keeps finding every row regardless of its current filter/page
 * state. `render()` still runs once at setup even though the static
 * defaults (page 1, both filters at "all") already match its result — a
 * safe, invisible no-op that also initializes this closure's own
 * `currentPage`/`totalPages` state. A missing control (unexpected page
 * shape) leaves this a no-op, same defensive spirit as `findElements` in
 * `hydrateEditorPage.ts`.
 *
 * `solvedById`/`partialByPuzzle` (already computed by `hydrate` for the
 * solved-badge/thumbnail reveal) are reused here, before the first
 * `render()`, to tag each row's resolved status — status can only be known
 * client-side (it reads the player's saved progress), unlike color, which
 * is baked server-side (see
 * `.vibe/decisions/044-status-filter-computed-client-side.md`).
 */
function setUpFiltersAndPagination(
  solvedById: Map<string, Puzzle>,
  partialByPuzzle: Map<string, { puzzle: Puzzle; cells: (number | null)[][] }>,
): void {
  const monoButton = document.querySelector<HTMLButtonElement>(
    '[data-role="library-filter-color-mono"]',
  );
  const multiButton = document.querySelector<HTMLButtonElement>(
    '[data-role="library-filter-color-multi"]',
  );
  const unsolvedButton = document.querySelector<HTMLButtonElement>(
    '[data-role="library-filter-status-unsolved"]',
  );
  const inProgressButton = document.querySelector<HTMLButtonElement>(
    '[data-role="library-filter-status-in-progress"]',
  );
  const solvedButton = document.querySelector<HTMLButtonElement>(
    '[data-role="library-filter-status-solved"]',
  );
  const sortButton = document.querySelector<HTMLButtonElement>(
    '[data-role="library-sort-recent"]',
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
    !monoButton ||
    !multiButton ||
    !unsolvedButton ||
    !inProgressButton ||
    !solvedButton ||
    !sortButton ||
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
  let colorValue: ColorFilterValue = "all";
  let statusValue: StatusFilterValue = "all";
  let sortByRecent = false;

  // A saved preference from a previous visit wins over the static
  // "nothing filtered" default — restored below, before the first
  // `render()`, so the very first paint already reflects it (see backlog
  // item 072). No cookie (first visit, or one that fails to parse) leaves
  // today's defaults untouched.
  const savedFilters = readLibraryFiltersCookie();
  if (savedFilters) {
    colorValue = savedFilters.color;
    statusValue = savedFilters.status;
    sortByRecent = savedFilters.sortByRecent;
  }

  const list = document.querySelector("ul");
  // Captured once, before any reordering, so toggling the sort back off can
  // restore the page's original (server-baked) row order exactly.
  const defaultRowOrder = Array.from(
    document.querySelectorAll<HTMLElement>("[data-puzzle-id]"),
  );

  // "unsolved" is never written explicitly — `render()` below treats a row
  // with neither attribute as unsolved, the same implicit-default spirit
  // as the solved badge (absent unless revealed).
  for (const row of defaultRowOrder) {
    const puzzleId = row.dataset.puzzleId;
    if (!puzzleId) {
      continue;
    }
    if (solvedById.has(puzzleId)) {
      row.dataset.status = "solved";
    } else if (partialByPuzzle.has(puzzleId)) {
      row.dataset.status = "in-progress";
    }
  }

  /**
   * Recently-opened first, each puzzle's own stored `openedAt` timestamp
   * descending; puzzles never opened keep appearing after every opened one,
   * in `defaultRowOrder`'s relative order among themselves — a stable
   * partition, not a comparator that coerces "never opened" to some
   * sentinel number (which would also reorder that group).
   */
  function computeRecencyOrder(): HTMLElement[] {
    const withTimestamp: { row: HTMLElement; openedAt: number }[] = [];
    const withoutTimestamp: HTMLElement[] = [];
    for (const row of defaultRowOrder) {
      const puzzleId = row.dataset.puzzleId;
      const openedAt = puzzleId ? loadPuzzleOpenedAt(puzzleId) : undefined;
      if (openedAt === undefined) {
        withoutTimestamp.push(row);
      } else {
        withTimestamp.push({ row, openedAt });
      }
    }
    withTimestamp.sort((a, b) => b.openedAt - a.openedAt);
    return [...withTimestamp.map((entry) => entry.row), ...withoutTimestamp];
  }

  // Moves every row (`appendChild` on an already-attached node relocates
  // it, never clones/recreates it) into `order` — safe to call with the
  // full row set regardless of which are currently filtered out, since a
  // `hidden` row's position among the others has no visible effect.
  function reorderRows(order: HTMLElement[]): void {
    if (!list) {
      return;
    }
    for (const row of order) {
      list.appendChild(row);
    }
  }

  function render(): void {
    const allRows = Array.from(
      document.querySelectorAll<HTMLElement>("[data-puzzle-id]"),
    );
    const matched = allRows.filter(
      (row) =>
        (colorValue === "all" || row.dataset.colorType === colorValue) &&
        (statusValue === "all" ||
          (row.dataset.status ?? "unsolved") === statusValue),
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

  // Persists the current selection on every change (including a change
  // back to "all") so the saved cookie never lags behind what's on screen
  // — see `.vibe/decisions` on backlog item 072.
  function persistFilters(): void {
    writeLibraryFiltersCookie({
      color: colorValue,
      status: statusValue,
      sortByRecent,
    });
  }

  const colorToggle = wireExclusiveToggle<Exclude<ColorFilterValue, "all">>(
    [
      { value: "mono", button: monoButton },
      { value: "multi", button: multiButton },
    ],
    (value) => {
      colorValue = value;
      currentPage = 1;
      persistFilters();
      render();
    },
  );
  colorToggle.setActive(colorValue);

  const statusToggle = wireExclusiveToggle<Exclude<StatusFilterValue, "all">>(
    [
      { value: "unsolved", button: unsolvedButton },
      { value: "in-progress", button: inProgressButton },
      { value: "solved", button: solvedButton },
    ],
    (value) => {
      statusValue = value;
      currentPage = 1;
      persistFilters();
      render();
    },
  );
  statusToggle.setActive(statusValue);

  sortButton.setAttribute("aria-pressed", String(sortByRecent));
  if (sortByRecent) {
    reorderRows(computeRecencyOrder());
  }
  sortButton.addEventListener("click", () => {
    sortByRecent = !sortByRecent;
    sortButton.setAttribute("aria-pressed", String(sortByRecent));
    reorderRows(sortByRecent ? computeRecencyOrder() : defaultRowOrder);
    currentPage = 1;
    persistFilters();
    render();
  });

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
 * reads every puzzle's data embedded in the page, sets up the color
 * filter control, checks each puzzle's saved progress against its
 * solution, and reveals the already-reserved "solved" badge (see
 * .vibe/decisions/004-library-page-reserves-solved-badge-node.md) for
 * every puzzle solved correctly — at the same time folding that solved
 * status into the puzzle link's own accessible name (see
 * .vibe/decisions/031-solved-link-aria-label-composes-badge-translation.md),
 * since the visible badge is a sibling `<span>`, not part of the link's
 * accessible name on its own. A puzzle that isn't solved but does have
 * some actual painted progress gets its own partial-progress preview
 * instead (backlog item 071) — never the solved badge, never the
 * accessible-name change, both reserved for a genuine solve.
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

  const locale = setUpLanguageSwitcher();

  const puzzles = readPuzzles();
  if (puzzles.length === 0) {
    return;
  }

  const solvedById = new Map(
    puzzles.filter(isSolved).map((puzzle) => [puzzle.id, puzzle] as const),
  );
  // Only puzzles left unsolved are worth checking for partial progress —
  // a solved puzzle already gets the real, full thumbnail above.
  const partialByPuzzle = new Map(
    puzzles
      .filter((puzzle) => !solvedById.has(puzzle.id))
      .flatMap((puzzle) => {
        const cells = partialProgressCells(puzzle);
        return cells ? [[puzzle.id, { puzzle, cells }] as const] : [];
      }),
  );

  // Computed above (not inside `setUpFiltersAndPagination`) so this same
  // pass also feeds the status filter's per-row tagging before its first
  // render — see that function's own doc comment.
  setUpFiltersAndPagination(solvedById, partialByPuzzle);

  if (solvedById.size === 0 && partialByPuzzle.size === 0) {
    return;
  }

  const rows = document.querySelectorAll<HTMLElement>("[data-puzzle-id]");
  for (const row of Array.from(rows)) {
    const id = row.getAttribute("data-puzzle-id");
    const solvedPuzzle = id === null ? undefined : solvedById.get(id);
    if (solvedPuzzle) {
      const badge = row.querySelector<HTMLElement>(".solved-badge");
      if (badge) {
        badge.hidden = false;
      }

      markLinkAsSolved(row, locale);
      revealThumbnail(row, solvedPuzzle.cells, solvedPuzzle.palette);
      continue;
    }

    const partial = id === null ? undefined : partialByPuzzle.get(id);
    if (partial) {
      revealThumbnail(row, partial.cells, partial.puzzle.palette);
    }
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
