import {
  DEFAULT_LOCALE,
  LIBRARY_PAGE_SIZE,
  type Puzzle,
  computePuzzleDifficulty,
  isMultiColorPuzzle,
  renderDifficultyBadge,
  translate,
} from "@kindle-nonograms/shared";
import { renderEarlyLangScript } from "./earlyLangScript.js";
import { embedJson, escapeHtml, versionQuery } from "./htmlEscape.js";
import { renderLanguageSwitcher } from "./renderLanguageSwitcher.js";
import { sharedStyles } from "./sharedStyles.js";
import {
  BORDER_RADIUS_PX,
  BORDER_WIDTH,
  COLORS,
  LABEL_FONT_STACK,
  MIN_TAP_TARGET_PX,
  SPACING_PX,
} from "./theme.js";

/**
 * Renders the library's color filter — two unpressed toggle buttons,
 * "all" being the state where neither is pressed — wrapped in an ARIA
 * group whose accessible name ("Color") matches a small visible label kept
 * ahead of the buttons (WCAG 2.5.3 Label in Name): on its own, "Mono"/
 * "Multi" reads as an unexplained fragment to a sighted player and to a
 * screen-reader user enumerating controls outside sequential group order
 * (e.g. a rotor), so each button's own accessible name also composes that
 * same context in ("Color: Mono") via a dedicated `aria-label`, rather
 * than relying on the group's name alone (see backlog item 072,
 * `.vibe/decisions/045-secondary-filters-relocated-below-list.md`). Plain
 * tappable buttons, not a `<select>`, per backlog item 067 — a dropdown is
 * hard to operate in Kindle's browser.
 */
function renderColorFilterButtons(): string {
  const groupLabel = translate(DEFAULT_LOCALE, "library.filterColorLabel");
  const monoLabel = translate(DEFAULT_LOCALE, "library.filterColorMono");
  const multiLabel = translate(DEFAULT_LOCALE, "library.filterColorMulti");
  const monoAriaLabel = translate(
    DEFAULT_LOCALE,
    "library.filterColorMonoAriaLabel",
  );
  const multiAriaLabel = translate(
    DEFAULT_LOCALE,
    "library.filterColorMultiAriaLabel",
  );
  return `<div role="group" data-i18n-aria="library.filterColorLabel" aria-label="${escapeHtml(groupLabel)}"><span class="filter-group-label" data-i18n="library.filterColorLabel">${groupLabel}</span><button type="button" data-role="library-filter-color-mono" data-i18n="library.filterColorMono" data-i18n-aria="library.filterColorMonoAriaLabel" aria-label="${escapeHtml(monoAriaLabel)}" aria-pressed="false">${monoLabel}</button><button type="button" data-role="library-filter-color-multi" data-i18n="library.filterColorMulti" data-i18n-aria="library.filterColorMultiAriaLabel" aria-label="${escapeHtml(multiAriaLabel)}" aria-pressed="false">${multiLabel}</button></div>`;
}

// A separate `<div>` from the sort button's — the existing
// `.library-filters` flex-row gap already keeps the two visually apart,
// so a player doesn't mistake this for a third status option.
function renderSortButton(): string {
  const label = translate(DEFAULT_LOCALE, "library.sortRecentLabel");
  return `<div><button type="button" data-role="library-sort-recent" data-i18n="library.sortRecentLabel" aria-pressed="false">${label}</button></div>`;
}

/**
 * Renders the puzzle solve-status filter — three unpressed toggle buttons
 * (Unsolved / In progress / Solved), "all" being the state where none is
 * pressed, exactly like the color filter's own two-button interaction (see
 * `renderColorFilterButtons`). Whether a puzzle is solved or has partial
 * progress can only be known client-side (it reads the player's saved
 * progress), so every row starts untagged here and
 * `hydrateLibraryPage.ts` tags it before the first filter pass runs — see
 * `.vibe/decisions/044-status-filter-computed-client-side.md`.
 */
function renderStatusFilterButtons(): string {
  const groupLabel = translate(DEFAULT_LOCALE, "library.filterStatusLabel");
  const unsolvedLabel = translate(
    DEFAULT_LOCALE,
    "library.filterStatusUnsolved",
  );
  const inProgressLabel = translate(
    DEFAULT_LOCALE,
    "library.filterStatusInProgress",
  );
  const solvedLabel = translate(DEFAULT_LOCALE, "library.filterStatusSolved");
  return `<div role="group" data-i18n-aria="library.filterStatusLabel" aria-label="${escapeHtml(groupLabel)}"><button type="button" data-role="library-filter-status-unsolved" data-i18n="library.filterStatusUnsolved" aria-pressed="false">${unsolvedLabel}</button><button type="button" data-role="library-filter-status-in-progress" data-i18n="library.filterStatusInProgress" aria-pressed="false">${inProgressLabel}</button><button type="button" data-role="library-filter-status-solved" data-i18n="library.filterStatusSolved" aria-pressed="false">${solvedLabel}</button></div>`;
}

/**
 * Renders the secondary controls row — the status filter and the sort
 * button — placed after the puzzle list rather than above it, to keep the
 * color filter alone at the compact top of the page (see
 * `.vibe/decisions/045-secondary-filters-relocated-below-list.md`).
 * `data-role` lets `hydrateLibraryPage.ts` and tests locate this row
 * without depending on its position in the document.
 */
function renderSecondaryFilters(): string {
  return `<div class="library-filters" data-role="library-secondary-filters">${renderStatusFilterButtons()}${renderSortButton()}</div>`;
}

function renderFiltersAndPagination(puzzleCount: number): {
  filters: string;
  secondaryFilters: string;
  noResults: string;
  pagination: string;
} {
  const filters = `<div class="library-filters">${renderColorFilterButtons()}</div>`;
  const secondaryFilters = renderSecondaryFilters();

  const noResults = `<p class="filter-no-results" data-role="library-filter-no-results" data-i18n="library.filterNoResults" role="status" aria-live="polite" hidden>${translate(DEFAULT_LOCALE, "library.filterNoResults")}</p>`;

  const totalPages = Math.max(1, Math.ceil(puzzleCount / LIBRARY_PAGE_SIZE));
  const showPagination = puzzleCount > LIBRARY_PAGE_SIZE;
  const pagination = `<div class="library-pagination" data-role="library-pagination"${showPagination ? "" : " hidden"}><button type="button" data-role="library-pagination-prev" data-i18n="library.paginationPrev" disabled>${translate(DEFAULT_LOCALE, "library.paginationPrev")}</button><span class="pagination-status" data-role="library-pagination-status" role="status" aria-live="polite"><span class="sr-only" data-i18n="library.paginationStatusLabel">${translate(DEFAULT_LOCALE, "library.paginationStatusLabel")}</span> <span data-role="library-pagination-position">1 / ${totalPages}</span></span><button type="button" data-role="library-pagination-next" data-i18n="library.paginationNext"${totalPages <= 1 ? " disabled" : ""}>${translate(DEFAULT_LOCALE, "library.paginationNext")}</button></div>`;

  return { filters, secondaryFilters, noResults, pagination };
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
 * carries its `isMultiColorPuzzle` result as a `data-color-type` attribute
 * for the color filter control (also baked here now, see
 * `renderFiltersAndPagination`) to read directly rather than re-deriving
 * it from the embedded puzzle JSON. The
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
    const { filters, secondaryFilters, noResults, pagination } =
      renderFiltersAndPagination(puzzles.length);
    const items = puzzles.map(renderLibraryItem).join("");
    body = `${filters}<p class="section-label" data-i18n="library.sectionLabel">Choose a puzzle</p><ul>${items}</ul>${secondaryFilters}${noResults}${pagination}`;
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
${renderEarlyLangScript()}
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
<a href="${CONTRIBUTING_URL}" target="_blank" rel="noopener noreferrer"><span data-i18n="library.contributeLink">Contribute a puzzle on GitHub</span><span aria-hidden="true"> ↗</span><span class="sr-only" data-i18n="library.opensInNewTab">${translate(DEFAULT_LOCALE, "library.opensInNewTab")}</span></a>
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
  const label = escapeHtml(puzzle.name);
  const colorType = isMultiColorPuzzle(puzzle) ? "multi" : "mono";
  // The default filter always matches every puzzle ("all"), so the first
  // page of that default result set is simply this list's own first
  // `LIBRARY_PAGE_SIZE` items — baked here so pagination is already correct
  // on first paint (see `renderFiltersAndPagination`). Re-filtering or
  // paging afterward keeps toggling this same attribute, exactly as before.
  const hidden = index >= LIBRARY_PAGE_SIZE ? " hidden" : "";
  const difficulty = computePuzzleDifficulty(puzzle);
  // No badge at all for a puzzle whose difficulty can't be computed (no
  // filled cells, or one that would require guessing) — never a
  // misleading "0/10" for content that simply has no meaningful rating.
  // The grid-size text shares that same guard: it only ever appears
  // alongside the stars, on their shared meta row, never on a line of its
  // own (see .vibe/decisions/050-grid-size-moves-out-of-the-title.md). It's
  // the sole copy of the puzzle's size now (the link's own text is just its
  // name), so it's real, accessible text, not `aria-hidden`.
  const metaRow =
    difficulty === undefined
      ? ""
      : `<span class="puzzle-meta-row"><span class="puzzle-size">${puzzle.width} × ${puzzle.height}</span>${renderDifficultyBadge(difficulty)}</span>`;

  return `<li class="stripe-${index}" data-puzzle-id="${escapeHtml(puzzle.id)}" data-color-type="${colorType}"${hidden}>${THUMBNAIL_PLACEHOLDER}<div class="puzzle-card-body"><a href="${href}">${label}</a><span class="solved-badge" data-i18n="library.solvedBadge" hidden>Solved</span>${metaRow}</div></li>`;
}

const STYLE = `
${sharedStyles()}
[hidden]{display:none;}
ul{list-style:none;padding:0;margin:${SPACING_PX.sm}px ${SPACING_PX.md}px ${SPACING_PX.md}px;display:flex;flex-direction:column;gap:${SPACING_PX.sm}px;}
li{display:flex;align-items:stretch;border:${BORDER_WIDTH.thin} solid ${COLORS.border};border-top-width:${STRIPE_HEIGHT_PX}px;border-top-color:transparent;border-radius:${BORDER_RADIUS_PX}px;box-shadow:4px 4px 0 ${COLORS.panelEdge};overflow:hidden;background-repeat:no-repeat;background-position:top;background-size:100% ${STRIPE_HEIGHT_PX}px;}
.puzzle-card-body{flex:1;min-width:0;display:flex;flex-wrap:wrap;align-items:center;}
li a{flex:1;display:flex;align-items:center;min-width:0;padding:${SPACING_PX.sm}px ${SPACING_PX.md}px;min-height:${MIN_TAP_TARGET_PX}px;font-family:${LABEL_FONT_STACK};color:${COLORS.text};text-decoration:none;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;}
li a:focus{outline:${BORDER_WIDTH.thick} solid ${COLORS.focusOutline};}
.solved-badge{margin:0 ${SPACING_PX.md}px 0 auto;padding:2px ${SPACING_PX.sm}px;border:${BORDER_WIDTH.medium} solid ${COLORS.teal};border-radius:${BORDER_RADIUS_PX}px;color:${COLORS.teal};font-size:0.8em;text-transform:uppercase;letter-spacing:0.05em;transform:rotate(-5deg);}
.puzzle-meta-row{flex-basis:100%;display:flex;align-items:center;gap:${SPACING_PX.xs}px;margin-left:auto;padding:0 ${SPACING_PX.md}px ${SPACING_PX.sm}px;}
.puzzle-size{color:${COLORS.muted};font-size:0.8em;font-family:${LABEL_FONT_STACK};}
.thumb{flex:0 0 auto;width:52px;margin:${SPACING_PX.sm}px 0 ${SPACING_PX.sm}px ${SPACING_PX.sm}px;border:${BORDER_WIDTH.thin} solid ${COLORS.border};border-radius:${BORDER_RADIUS_PX}px;background:${COLORS.panel};display:flex;flex-direction:column;align-items:center;justify-content:center;}
.thumb-lock{color:${COLORS.muted};font-weight:bold;font-size:22px;}
.thumb-row{display:flex;}
.thumb-cell{flex-shrink:0;}
.library-filters{display:flex;flex-wrap:wrap;gap:${SPACING_PX.md}px;margin:0 ${SPACING_PX.md}px ${SPACING_PX.sm}px;}
.library-filters > div{display:flex;flex-wrap:wrap;align-items:center;gap:${SPACING_PX.sm}px;}
.filter-group-label{color:${COLORS.muted};font-size:0.85em;}
.filter-no-results{margin:${SPACING_PX.md}px;color:${COLORS.muted};}
.library-pagination:not([hidden]){display:flex;align-items:center;justify-content:center;gap:${SPACING_PX.md}px;margin:${SPACING_PX.lg}px ${SPACING_PX.md}px;}
.pagination-status{font-family:${LABEL_FONT_STACK};color:${COLORS.text};}
.page-footer-links{display:flex;flex-wrap:wrap;align-items:center;gap:${SPACING_PX.md}px;margin-left:auto;}
.page-footer-links a{display:inline-flex;align-items:center;min-height:${MIN_TAP_TARGET_PX}px;color:${COLORS.text};text-decoration:none;}
.page-footer-links a:focus{outline:${BORDER_WIDTH.thick} solid ${COLORS.focusOutline};}
`;
