import {
  DEFAULT_LOCALE,
  LIBRARY_PAGE_SIZE,
  NATIVE_LOCALE_NAMES,
  type Puzzle,
  SUPPORTED_LOCALES,
  type TranslationKey,
  isMultiColorPuzzle,
  puzzleSizeBucket,
  translate,
} from "@kindle-nonograms/shared";
import { embedJson, escapeHtml, versionQuery } from "./htmlEscape.js";
import { sharedStyles } from "./sharedStyles.js";
import {
  BORDER_RADIUS_PX,
  BORDER_WIDTH,
  COLORS,
  LABEL_FONT_STACK,
  MIN_TAP_TARGET_PX,
  SPACING_PX,
} from "./theme.js";

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
 * Renders the library's default chrome — size/color filters (both at
 * "all"), the "no results" message (hidden — the default filters always
 * match at least one puzzle whenever the library itself isn't empty), and
 * Previous/Next pagination (hidden unless there are more puzzles than fit
 * on one page, its total-page count computed here from the fixed puzzle
 * count) — baked into the static HTML so the page already looks complete
 * on first paint instead of popping in once `hydrateLibraryPage.ts` builds
 * it. See `.ux/decisions/001-frozen-chrome-blocking-reconciliation.md`;
 * mirrors exactly what that script's own `setUpFiltersAndPagination`
 * produced before this change. `hydrateLibraryPage.ts` now locates this
 * same markup by its `data-role` attributes and attaches behavior to it.
 */
function renderFilterSelect(
  id: string,
  labelKey: TranslationKey,
  dataRole: string,
  options: ReadonlyArray<{ value: string; key: TranslationKey }>,
): string {
  const optionsHtml = options
    .map(
      (option) =>
        `<option value="${option.value}" data-i18n="${option.key}"${option.value === "all" ? " selected" : ""}>${translate(DEFAULT_LOCALE, option.key)}</option>`,
    )
    .join("");
  return `<div><label for="${id}" data-i18n="${labelKey}">${translate(DEFAULT_LOCALE, labelKey)}</label><select id="${id}" data-role="${dataRole}">${optionsHtml}</select></div>`;
}

function renderFiltersAndPagination(puzzleCount: number): {
  filters: string;
  noResults: string;
  pagination: string;
} {
  const filters = `<div class="library-filters">${renderFilterSelect("library-filter-size", "library.filterSizeLabel", "library-filter-size-select", SIZE_FILTER_OPTIONS)}${renderFilterSelect("library-filter-color", "library.filterColorLabel", "library-filter-color-select", COLOR_FILTER_OPTIONS)}</div>`;

  const noResults = `<p class="filter-no-results" data-role="library-filter-no-results" data-i18n="library.filterNoResults" hidden>${translate(DEFAULT_LOCALE, "library.filterNoResults")}</p>`;

  const totalPages = Math.max(1, Math.ceil(puzzleCount / LIBRARY_PAGE_SIZE));
  const showPagination = puzzleCount > LIBRARY_PAGE_SIZE;
  const pagination = `<div class="library-pagination" data-role="library-pagination"${showPagination ? "" : " hidden"}><button type="button" data-role="library-pagination-prev" data-i18n="library.paginationPrev" disabled>${translate(DEFAULT_LOCALE, "library.paginationPrev")}</button><span class="pagination-status" data-role="library-pagination-status" role="status" aria-live="polite"><span class="sr-only" data-i18n="library.paginationStatusLabel">${translate(DEFAULT_LOCALE, "library.paginationStatusLabel")}</span> <span data-role="library-pagination-position">1 / ${totalPages}</span></span><button type="button" data-role="library-pagination-next" data-i18n="library.paginationNext"${totalPages <= 1 ? " disabled" : ""}>${translate(DEFAULT_LOCALE, "library.paginationNext")}</button></div>`;

  return { filters, noResults, pagination };
}

/**
 * Renders the footer's FR/EN language switcher, English selected by
 * default (the locale itself isn't known at build time) — the client's
 * `applyStoredLocale`-equivalent corrects the selected option, along with
 * every other `[data-i18n]` element, before the page is perceived as
 * painted (see `.ux/decisions/001-frozen-chrome-blocking-reconciliation.md`).
 * A native `<select>`, kept native rather than a custom control for
 * reliable touch/keyboard behavior on Kindle's old WebKit.
 */
function renderLanguageSwitcher(): string {
  const options = SUPPORTED_LOCALES.map(
    (locale) =>
      `<option value="${locale}"${locale === DEFAULT_LOCALE ? " selected" : ""}>${NATIVE_LOCALE_NAMES[locale]}</option>`,
  ).join("");
  return `<div class="language-switcher"><label for="language-switcher-select" data-i18n="i18n.languageSwitcherLabel">${translate(DEFAULT_LOCALE, "i18n.languageSwitcherLabel")}</label><select id="language-switcher-select" data-role="language-switcher-select">${options}</select></div>`;
}

// Purely decorative — see .vibe/decisions/013-three-accent-cabinet-reskin.md.
const DOT_ROW = `<div class="dot-row" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div>`;

// The project's own CONTRIBUTING.md, viewed on GitHub — the footer's
// "explains how to contribute a puzzle" link (see .vibe/backlog/done/
// 026-language-switcher-and-contribution-footer.md).
const CONTRIBUTING_URL =
  "https://github.com/neolao/kindle-nonograms/blob/main/CONTRIBUTING.md";

// Height (px) of the top stripe band, matching the `li` rule's own
// border-top-width below — kept in one place so the two can't drift apart.
const STRIPE_HEIGHT_PX = 6;

// Strict `#rgb`/`#rrggbb`/`#rrggbbaa` check. A palette entry that doesn't
// match falls back to black instead of being interpolated into the shared
// <style> block as-is — unlike the puzzle page (one curated puzzle per
// page), the library page folds every listed puzzle's palette into one
// stylesheet, so an unvalidated value here is a CSS-injection surface (see
// .vibe/decisions/015-library-card-stripe-reflects-palette.md).
const HEX_COLOR_PATTERN =
  /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

function sanitizeHex(hex: string): string {
  return HEX_COLOR_PATTERN.test(hex) ? hex : COLORS.border;
}

/**
 * Builds the `background-image` value for one puzzle card's top stripe: a
 * literal solid black for a monochrome puzzle (the palette's own single
 * color is deliberately ignored — see .vibe/decisions/
 * 015-library-card-stripe-reflects-palette.md), or the puzzle's own colors
 * as equal-width hard-stop segments, in palette order, for a multi-color
 * one. Always a `linear-gradient` (never `background-color`) so the shared
 * `background-size`/`background-position` rule on `li` can still confine it
 * to the top band instead of painting the whole card.
 */
function stripeGradient(palette: string[]): string {
  if (palette.length <= 1) {
    return `linear-gradient(${COLORS.border}, ${COLORS.border})`;
  }

  const step = 100 / palette.length;
  const stops = palette.flatMap((hex, index) => {
    const color = sanitizeHex(hex);
    const start = (index * step).toFixed(2).replace(/\.?0+$/, "");
    const end = ((index + 1) * step).toFixed(2).replace(/\.?0+$/, "");
    return [`${color} ${start}%`, `${color} ${end}%`];
  });

  return `linear-gradient(to right, ${stops.join(", ")})`;
}

/**
 * Renders the site's home page: a list of every puzzle (name, size, a
 * relative link to its own page) with a hidden "solved" badge already
 * reserved in each row for later client-side hydration to reveal (see
 * .vibe/decisions/004-library-page-reserves-solved-badge-node.md), or a
 * plain empty-state message when there are no puzzles. The *visible*
 * markup only ever shows id/name/size — every puzzle's full data
 * (including its solution) is also embedded as JSON so hydration can check
 * saved progress for a correct solve without a backend to do it for it
 * (see .vibe/decisions/006-library-page-embeds-full-puzzles-for-solved-checking.md).
 * The whole page sits inside one bordered/shadowed `.panel`, safe to wrap
 * everything here (unlike the puzzle page) since this page has no
 * fit-to-viewport measurement that padding could throw off. Each row also
 * carries its `puzzleSizeBucket`/`isMultiColorPuzzle` result as
 * `data-size-bucket`/`data-color-type` attributes for the size/color filter
 * controls (also baked here now, see `renderFiltersAndPagination`) to read
 * directly rather than re-deriving them from the embedded puzzle JSON. The
 * footer's language switcher, the filters, the "no results" message, the
 * pagination controls, and every row beyond the first page are all real
 * markup already in their default shape — see
 * .ux/decisions/001-frozen-chrome-blocking-reconciliation.md — with
 * `hydrateLibraryPage.ts` only locating them and attaching behavior.
 */
export function renderLibraryPage(
  puzzles: Puzzle[],
  assetVersion?: string,
): string {
  let body: string;
  if (puzzles.length === 0) {
    body = '<p data-i18n="library.empty">No puzzles are available yet.</p>';
  } else {
    const { filters, noResults, pagination } = renderFiltersAndPagination(
      puzzles.length,
    );
    const items = puzzles.map(renderLibraryItem).join("");
    body = `${filters}<p class="section-label" data-i18n="library.sectionLabel">Choose a puzzle</p><ul>${items}</ul>${noResults}${pagination}`;
  }
  const stripeStyles = puzzles
    .map(
      (puzzle, index) =>
        `.stripe-${index}{background-image:${stripeGradient(puzzle.palette)};}`,
    )
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Kindle Nonograms</title>
<link rel="icon" type="image/svg+xml" href="./favicon.svg" />
<style>${STYLE}${stripeStyles}</style>
</head>
<body>
<div class="panel">
${DOT_ROW}
<h1 data-i18n="library.title">Kindle Nonograms</h1>
${body}
<footer class="page-footer">
${renderLanguageSwitcher()}
<div class="page-footer-links">
<a href="editor/" data-i18n="library.createPuzzleLink">Create a puzzle</a>
<a href="${CONTRIBUTING_URL}" target="_blank" rel="noopener noreferrer"><span data-i18n="library.contributeLink">Contribute a puzzle on GitHub</span><span aria-hidden="true"> ↗</span></a>
</div>
</footer>
</div>
<script type="application/json" id="puzzles-data">${embedJson(puzzles)}</script>
<script type="module" src="./assets/main.js${versionQuery(assetVersion)}"></script>
</body>
</html>`;
}

// A neutral "?" placeholder, never derived from the puzzle's own solution:
// a nonogram's whole payoff is revealing its picture by solving it, so the
// real preview thumbnail must never exist in this static, server-rendered
// markup — hydration builds and inserts it only once a puzzle is confirmed
// solved (see .vibe/decisions/012-solved-thumbnail-built-client-side-only.md).
const THUMBNAIL_PLACEHOLDER = `<span class="thumb" aria-hidden="true"><span class="thumb-lock">?</span></span>`;

function renderLibraryItem(puzzle: Puzzle, index: number): string {
  const href = `puzzles/${encodeURIComponent(puzzle.id)}/`;
  const label = `${escapeHtml(puzzle.name)} — ${puzzle.width} × ${puzzle.height}`;
  const sizeBucket = puzzleSizeBucket(puzzle);
  const colorType = isMultiColorPuzzle(puzzle) ? "multi" : "mono";
  // The default filters always match every puzzle ("all"/"all"), so the
  // first page of that default result set is simply this list's own first
  // `LIBRARY_PAGE_SIZE` items — baked here so pagination is already correct
  // on first paint (see `renderFiltersAndPagination`). Re-filtering or
  // paging afterward keeps toggling this same attribute, exactly as before.
  const hidden = index >= LIBRARY_PAGE_SIZE ? " hidden" : "";

  return `<li class="stripe-${index}" data-puzzle-id="${escapeHtml(puzzle.id)}" data-size-bucket="${sizeBucket}" data-color-type="${colorType}"${hidden}>${THUMBNAIL_PLACEHOLDER}<a href="${href}">${label}</a><span class="solved-badge" data-i18n="library.solvedBadge" hidden>Solved</span></li>`;
}

const STYLE = `
${sharedStyles()}
[hidden]{display:none;}
ul{list-style:none;padding:0;margin:${SPACING_PX.sm}px ${SPACING_PX.md}px ${SPACING_PX.md}px;display:flex;flex-direction:column;gap:${SPACING_PX.sm}px;}
li{display:flex;align-items:center;border:${BORDER_WIDTH.thin} solid ${COLORS.border};border-top-width:${STRIPE_HEIGHT_PX}px;border-top-color:transparent;border-radius:${BORDER_RADIUS_PX}px;box-shadow:4px 4px 0 ${COLORS.panelEdge};overflow:hidden;background-repeat:no-repeat;background-position:top;background-size:100% ${STRIPE_HEIGHT_PX}px;}
li a{flex:1;display:flex;align-items:center;min-width:0;padding:${SPACING_PX.sm}px ${SPACING_PX.md}px;min-height:${MIN_TAP_TARGET_PX}px;font-family:${LABEL_FONT_STACK};color:${COLORS.text};text-decoration:none;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;}
li a:focus{outline:${BORDER_WIDTH.thick} solid ${COLORS.focusOutline};}
.solved-badge{margin:0 ${SPACING_PX.md}px 0 auto;padding:2px ${SPACING_PX.sm}px;border:${BORDER_WIDTH.medium} solid ${COLORS.teal};border-radius:${BORDER_RADIUS_PX}px;color:${COLORS.teal};font-size:0.8em;text-transform:uppercase;letter-spacing:0.05em;transform:rotate(-5deg);}
.thumb{flex:0 0 auto;width:36px;height:36px;margin:${SPACING_PX.sm}px 0 ${SPACING_PX.sm}px ${SPACING_PX.sm}px;border:${BORDER_WIDTH.thin} solid ${COLORS.border};border-radius:${BORDER_RADIUS_PX}px;background:${COLORS.panel};display:flex;flex-direction:column;align-items:center;justify-content:center;}
.thumb-lock{color:${COLORS.muted};font-weight:bold;}
.thumb-row{display:flex;}
.thumb-cell{width:4px;height:4px;}
.library-filters{display:flex;flex-wrap:wrap;gap:${SPACING_PX.md}px;margin:0 ${SPACING_PX.md}px ${SPACING_PX.sm}px;}
.library-filters > div{display:flex;align-items:center;gap:${SPACING_PX.sm}px;}
.library-filters select{font-family:${LABEL_FONT_STACK};min-height:${MIN_TAP_TARGET_PX}px;padding:0 ${SPACING_PX.sm}px;border:${BORDER_WIDTH.thin} solid ${COLORS.border};}
.library-filters select:focus{outline:${BORDER_WIDTH.thick} solid ${COLORS.focusOutline};}
.filter-no-results{margin:${SPACING_PX.md}px;color:${COLORS.muted};}
.library-pagination:not([hidden]){display:flex;align-items:center;justify-content:center;gap:${SPACING_PX.md}px;margin:${SPACING_PX.sm}px ${SPACING_PX.md}px;}
.library-pagination button:disabled{color:${COLORS.muted};border-color:${COLORS.muted};box-shadow:none;}
.pagination-status{font-family:${LABEL_FONT_STACK};color:${COLORS.text};}
.page-footer{display:flex;flex-wrap:wrap;align-items:center;gap:${SPACING_PX.md}px;border-top:${BORDER_WIDTH.thin} solid ${COLORS.line};margin:${SPACING_PX.md}px ${SPACING_PX.md}px 0;padding:${SPACING_PX.sm}px 0 ${SPACING_PX.md}px;}
.page-footer .language-switcher{margin:0;}
.page-footer-links{display:flex;flex-wrap:wrap;align-items:center;gap:${SPACING_PX.md}px;margin-left:auto;}
.page-footer-links a{display:inline-flex;align-items:center;min-height:${MIN_TAP_TARGET_PX}px;color:${COLORS.text};text-decoration:none;}
.page-footer-links a:focus{outline:${BORDER_WIDTH.thick} solid ${COLORS.focusOutline};}
`;
