import {
  type Locale,
  type Puzzle,
  type TranslationKey,
  buildThumbnail,
  isPuzzleSolved,
  translate,
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
 * Inserts the FR/EN language switcher into the page footer (see
 * `renderLibraryPage.ts`'s `.page-footer`, alongside the contribution
 * links) and applies the resolved locale (saved cookie, else the browser's
 * detected language, else English) to every element on the page carrying a
 * `data-i18n` key. This is the only page that still gets a switcher control
 * — the puzzle page only applies a previously saved locale, see
 * `hydratePlayPage.ts` (see .vibe/backlog/done/
 * 026-language-switcher-and-contribution-footer.md). Runs before any other
 * hydration so the switcher and translated strings are present even on the
 * empty library page. Returns the resolved locale so later hydration steps
 * (the filter controls) can build their own initial translated text
 * without re-resolving it.
 */
function setUpLanguageSwitcher(): Locale {
  const locale = resolveLocale(readLocaleCookie(), navigator.language);

  const footer = document.querySelector(".page-footer");
  if (footer) {
    const switcher = buildLanguageSwitcher(locale, (newLocale) => {
      writeLocaleCookie(newLocale);
      applyLocale(newLocale);
    });
    footer.prepend(switcher);
  }

  applyLocale(locale);
  return locale;
}

type SizeFilterValue = "all" | "small" | "medium" | "large";
type ColorFilterValue = "all" | "mono" | "multi";

const SIZE_FILTER_OPTIONS: ReadonlyArray<{
  value: SizeFilterValue;
  key: TranslationKey;
}> = [
  { value: "all", key: "library.filterSizeAll" },
  { value: "small", key: "library.filterSizeSmall" },
  { value: "medium", key: "library.filterSizeMedium" },
  { value: "large", key: "library.filterSizeLarge" },
];

const COLOR_FILTER_OPTIONS: ReadonlyArray<{
  value: ColorFilterValue;
  key: TranslationKey;
}> = [
  { value: "all", key: "library.filterColorAll" },
  { value: "mono", key: "library.filterColorMono" },
  { value: "multi", key: "library.filterColorMulti" },
];

/**
 * Builds one labeled native `<select>` for the library filter bar — kept
 * native, like the language switcher, for reliable touch/keyboard behavior
 * on Kindle's old WebKit. The label and every `<option>` carry their own
 * `data-i18n` key, so the shared `applyLocale` walker (triggered by the
 * language switcher) retranslates them in place like any other element,
 * with no extra wiring needed here.
 */
function buildFilterSelect(
  id: string,
  labelKey: TranslationKey,
  dataRole: string,
  options: ReadonlyArray<{ value: string; key: TranslationKey }>,
  locale: Locale,
): { wrapper: HTMLElement; select: HTMLSelectElement } {
  const wrapper = document.createElement("div");

  const label = document.createElement("label");
  label.setAttribute("for", id);
  label.dataset.i18n = labelKey;
  label.textContent = translate(locale, labelKey);

  const select = document.createElement("select");
  select.id = id;
  select.dataset.role = dataRole;

  for (const option of options) {
    const optionEl = document.createElement("option");
    optionEl.value = option.value;
    optionEl.dataset.i18n = option.key;
    optionEl.textContent = translate(locale, option.key);
    select.append(optionEl);
  }

  wrapper.append(label, select);
  return { wrapper, select };
}

// Puzzle rows shown per page (see
// .vibe/backlog/done/027-pagination-for-the-puzzle-library.md). Pagination
// always operates on the already-filtered result set, never the unfiltered
// full list — see that item's Notes on interacting with the size/color
// filter above.
const PAGE_SIZE = 25;

/**
 * Builds the Previous/Next pagination controls, hidden by default until the
 * first `render()` call decides whether the current (filtered) result set
 * actually needs more than one page. The status text between the two
 * buttons is deliberately never itself marked `data-i18n`: it holds
 * page/total digits rebuilt on every render, and the generic `applyLocale`
 * walker replacing a `data-i18n` element's full text content would wipe
 * those digits on every language switch. Only the buttons' static labels,
 * and the status's screen-reader-only prefix, go through that mechanism —
 * same "icon/short label needs a full name announced" pattern already used
 * by the puzzle page's back-link.
 */
function buildPaginationControls(locale: Locale): {
  container: HTMLElement;
  prevButton: HTMLButtonElement;
  nextButton: HTMLButtonElement;
  status: HTMLElement;
  statusPosition: HTMLElement;
} {
  const container = document.createElement("div");
  container.className = "library-pagination";
  container.hidden = true;

  const prevButton = document.createElement("button");
  prevButton.type = "button";
  prevButton.dataset.role = "library-pagination-prev";
  prevButton.dataset.i18n = "library.paginationPrev";
  prevButton.textContent = translate(locale, "library.paginationPrev");

  const status = document.createElement("span");
  status.className = "pagination-status";
  status.dataset.role = "library-pagination-status";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");

  const statusLabel = document.createElement("span");
  statusLabel.className = "sr-only";
  statusLabel.dataset.i18n = "library.paginationStatusLabel";
  statusLabel.textContent = translate(locale, "library.paginationStatusLabel");

  // Holds only the "current / total" digits, rebuilt on every render — kept
  // as its own element (never marked `data-i18n`) so the generic
  // `applyLocale` walker, which replaces a `data-i18n` element's entire
  // text content, can never wipe these numbers on a language switch.
  const statusPosition = document.createElement("span");

  status.append(statusLabel, document.createTextNode(" "), statusPosition);

  const nextButton = document.createElement("button");
  nextButton.type = "button";
  nextButton.dataset.role = "library-pagination-next";
  nextButton.dataset.i18n = "library.paginationNext";
  nextButton.textContent = translate(locale, "library.paginationNext");

  container.append(prevButton, status, nextButton);
  return { container, prevButton, nextButton, status, statusPosition };
}

/**
 * Inserts the library page's size/color filter controls and pagination
 * controls, and wires them into one shared `render()` pass: a row is
 * visible only if it matches both filters AND falls inside the current
 * page's slice of the *filtered* result set. Rows are only ever toggled via
 * `hidden`, never removed or reordered, so the solved-badge/thumbnail
 * hydration in `hydrate` keeps finding every row regardless of its current
 * filter/page state. Only called once the puzzle list is known to be
 * non-empty (see `hydrate`), so the empty library page never grows these
 * controls with nothing to show.
 */
function setUpFiltersAndPagination(locale: Locale): void {
  const list = document.querySelector("ul");
  if (!list) {
    return;
  }

  const sizeFilter = buildFilterSelect(
    "library-filter-size",
    "library.filterSizeLabel",
    "library-filter-size-select",
    SIZE_FILTER_OPTIONS,
    locale,
  );
  const colorFilter = buildFilterSelect(
    "library-filter-color",
    "library.filterColorLabel",
    "library-filter-color-select",
    COLOR_FILTER_OPTIONS,
    locale,
  );

  const filtersContainer = document.createElement("div");
  filtersContainer.className = "library-filters";
  filtersContainer.append(sizeFilter.wrapper, colorFilter.wrapper);

  const noResultsMessage = document.createElement("p");
  noResultsMessage.className = "filter-no-results";
  noResultsMessage.dataset.i18n = "library.filterNoResults";
  noResultsMessage.textContent = translate(locale, "library.filterNoResults");
  noResultsMessage.hidden = true;

  list.parentNode?.insertBefore(filtersContainer, list);
  list.parentNode?.insertBefore(noResultsMessage, list.nextSibling);

  const pagination = buildPaginationControls(locale);
  list.parentNode?.insertBefore(
    pagination.container,
    noResultsMessage.nextSibling,
  );

  let currentPage = 1;
  let totalPages = 1;

  function render(): void {
    const sizeValue = sizeFilter.select.value;
    const colorValue = colorFilter.select.value;

    const allRows = Array.from(
      document.querySelectorAll<HTMLElement>("[data-puzzle-id]"),
    );
    const matched = allRows.filter(
      (row) =>
        (sizeValue === "all" || row.dataset.sizeBucket === sizeValue) &&
        (colorValue === "all" || row.dataset.colorType === colorValue),
    );

    totalPages = Math.max(1, Math.ceil(matched.length / PAGE_SIZE));
    if (currentPage > totalPages) {
      currentPage = totalPages;
    }

    const start = (currentPage - 1) * PAGE_SIZE;
    const pageRows = new Set(matched.slice(start, start + PAGE_SIZE));
    for (const row of allRows) {
      row.hidden = !pageRows.has(row);
    }

    noResultsMessage.hidden = matched.length > 0;

    const showControls = matched.length > PAGE_SIZE;
    pagination.container.hidden = !showControls;
    if (showControls) {
      pagination.statusPosition.textContent = `${currentPage} / ${totalPages}`;
      pagination.prevButton.disabled = currentPage <= 1;
      pagination.nextButton.disabled = currentPage >= totalPages;
    }
  }

  const onFilterChange = () => {
    currentPage = 1;
    render();
  };
  sizeFilter.select.addEventListener("change", onFilterChange);
  colorFilter.select.addEventListener("change", onFilterChange);

  pagination.prevButton.addEventListener("click", () => {
    if (currentPage <= 1) {
      return;
    }
    currentPage -= 1;
    render();
    scrollListIntoView(list);
  });
  pagination.nextButton.addEventListener("click", () => {
    if (currentPage >= totalPages) {
      return;
    }
    currentPage += 1;
    render();
    scrollListIntoView(list);
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

  const locale = setUpLanguageSwitcher();

  const puzzles = readPuzzles();
  if (puzzles.length === 0) {
    return;
  }

  setUpFiltersAndPagination(locale);

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
