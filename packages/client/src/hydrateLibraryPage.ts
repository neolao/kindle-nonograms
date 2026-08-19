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
 * Inserts the FR/EN language switcher right after the page heading and
 * applies the resolved locale (saved cookie, else the browser's detected
 * language, else English) to every element on the page carrying a
 * `data-i18n` key. Runs before any other hydration so the switcher and
 * translated strings are present even on the empty library page. Returns
 * the resolved locale so later hydration steps (the filter controls) can
 * build their own initial translated text without re-resolving it.
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

/**
 * Re-evaluates the size and color filters together (AND, not OR) against
 * every puzzle row's `data-size-bucket`/`data-color-type` attributes (set
 * server-side by `renderLibraryPage.ts`), toggling `hidden` on each — rows
 * are never removed or reordered, so the solved-badge/thumbnail hydration
 * in `hydrate` keeps finding every row regardless of its current filter
 * state. Shows a "no puzzles match" message instead of leaving a silently
 * empty list when the combination excludes every row — indistinguishable
 * from a frozen page on Kindle's slow e-ink refresh otherwise.
 */
function applyFilters(
  sizeSelect: HTMLSelectElement,
  colorSelect: HTMLSelectElement,
  noResultsMessage: HTMLElement,
): void {
  const sizeValue = sizeSelect.value;
  const colorValue = colorSelect.value;
  let visibleCount = 0;

  const rows = document.querySelectorAll<HTMLElement>("[data-puzzle-id]");
  for (const row of Array.from(rows)) {
    const matches =
      (sizeValue === "all" || row.dataset.sizeBucket === sizeValue) &&
      (colorValue === "all" || row.dataset.colorType === colorValue);
    row.hidden = !matches;
    if (matches) {
      visibleCount++;
    }
  }

  noResultsMessage.hidden = visibleCount > 0;
}

/**
 * Inserts the library page's size and color filter controls right before
 * the puzzle list, and wires them so changing either one re-filters every
 * row (see `applyFilters`). Only called once the puzzle list is known to
 * be non-empty (see `hydrate`), so the empty library page never grows
 * filter controls with nothing to filter.
 */
function setUpFilters(locale: Locale): void {
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

  const container = document.createElement("div");
  container.className = "library-filters";
  container.append(sizeFilter.wrapper, colorFilter.wrapper);

  const noResultsMessage = document.createElement("p");
  noResultsMessage.className = "filter-no-results";
  noResultsMessage.dataset.i18n = "library.filterNoResults";
  noResultsMessage.textContent = translate(locale, "library.filterNoResults");
  noResultsMessage.hidden = true;

  list.parentNode?.insertBefore(container, list);
  list.parentNode?.insertBefore(noResultsMessage, list.nextSibling);

  const onChange = () =>
    applyFilters(sizeFilter.select, colorFilter.select, noResultsMessage);
  sizeFilter.select.addEventListener("change", onChange);
  colorFilter.select.addEventListener("change", onChange);
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

  setUpFilters(locale);

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
