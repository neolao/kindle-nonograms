import {
  type ClueRun,
  DEFAULT_LOCALE,
  PLAY_DEFAULT_ACTIVE_COLOR_INDEX,
  PLAY_DEFAULT_MODE,
  type Puzzle,
  computePuzzleClues,
  contrastingTextColor,
  readableRunColor,
  translate,
} from "@kindle-nonograms/shared";
import { renderEarlyLangScript } from "./earlyLangScript.js";
import { embedJson, escapeHtml, versionQuery } from "./htmlEscape.js";
import { sharedStyles } from "./sharedStyles.js";
import { BORDER_RADIUS_PX, BORDER_WIDTH, COLORS, SPACING_PX } from "./theme.js";

/**
 * The play page's default toolbar (Fill/Cross mode, color swatches for a
 * multi-color puzzle, Check) and win banner (hidden), baked into the static
 * HTML so the page already looks complete on first paint instead of popping
 * in once `hydratePlayPage.ts` builds it — see
 * `.ux/decisions/001-frozen-chrome-blocking-reconciliation.md`. Mirrors
 * exactly what that script's `buildToolbar`/`buildBanner` produce for a
 * fresh page; hydration now locates this same markup by its `data-role`
 * attributes and attaches behavior to it, rather than building it from
 * scratch. Each swatch also carries a numbered `aria-label` ("Color 2")
 * so a screen reader can tell which color it picks, plus a matching
 * `data-i18n-aria` key so a language switch retranslates it — see
 * `.vibe/decisions/029-swatch-aria-label-number-placeholder.md`.
 */
function renderDefaultToolbar(puzzle: Puzzle): string {
  const fillActive = PLAY_DEFAULT_MODE === "fill";
  const swatches =
    puzzle.palette.length > 1
      ? puzzle.palette
          .map((hex, index) => {
            const active = index === PLAY_DEFAULT_ACTIVE_COLOR_INDEX;
            const textColor = contrastingTextColor(hex);
            const borderWidth = active ? BORDER_WIDTH.thick : BORDER_WIDTH.thin;
            const ariaLabel = translate(
              DEFAULT_LOCALE,
              "play.swatchColorAriaLabel",
            ).replace("{number}", String(index + 1));
            return `<button type="button" data-role="swatch" data-color-index="${index}" aria-pressed="${active}" aria-label="${escapeHtml(ariaLabel)}" data-i18n-aria="play.swatchColorAriaLabel" style="background-color:${hex};color:${textColor};border-width:${borderWidth};">${active ? "✓" : ""}</button>`;
          })
          .join("")
      : "";

  return `<div class="play-toolbar"><div class="fill-color-group"><button type="button" data-role="mode-fill" data-i18n="play.modeFill" aria-pressed="${fillActive}">${translate(DEFAULT_LOCALE, "play.modeFill")}</button>${swatches}</div><button type="button" data-role="mode-cross" data-i18n="play.modeCross" aria-pressed="${!fillActive}">${translate(DEFAULT_LOCALE, "play.modeCross")}</button><button type="button" data-role="check" data-i18n="play.check">${translate(DEFAULT_LOCALE, "play.check")}</button></div>`;
}

function renderDefaultBanner(): string {
  return `<p data-role="win-banner" data-i18n="play.winBanner.solved" aria-live="polite" hidden>${translate(DEFAULT_LOCALE, "play.winBanner.solved")}</p>`;
}

/**
 * The "this puzzle couldn't be loaded" message (see backlog item 040),
 * baked hidden into the static page the same way the banner/storage warning
 * are — see `.ux/decisions/001-frozen-chrome-blocking-reconciliation.md`.
 * Revealed by `hydratePlayPage.ts` only in the rare case where the embedded
 * `#puzzle-data` script (present, since it's this page's own self-detection
 * marker) turns out to be unreadable/invalid — puzzles are validated at
 * build time, so this is a last-resort fail-safe rather than an expected
 * state.
 */
function renderDefaultLoadError(): string {
  return `<p data-role="load-error" data-i18n="play.loadError" role="status" aria-live="polite" hidden>${translate(DEFAULT_LOCALE, "play.loadError")}</p>`;
}

/**
 * The one-time "saved progress couldn't be restored" note (see backlog item
 * 042), baked hidden into the static page the same way `load-error` is —
 * see `.vibe/decisions/026-restore-warning-follows-load-error-pattern.md`.
 * Revealed by `hydratePlayPage.ts` only when saved progress for this puzzle
 * exists but no longer matches its current dimensions (e.g. the puzzle was
 * resized since the player last played it) and is discarded for an empty
 * grid. Deliberately plain, undecorated, and non-dismissible, unlike
 * `renderDefaultStorageWarning` below: it reports a fact already true the
 * instant the page loads, not a live outcome of a user action, and it can
 * never reappear once revealed this page view, so a dismiss control would
 * have nothing left to dismiss.
 */
function renderDefaultRestoreWarning(): string {
  return `<p data-role="restore-warning" data-i18n="play.restoreWarning" role="status" aria-live="polite" hidden>${translate(DEFAULT_LOCALE, "play.restoreWarning")}</p>`;
}

/**
 * The one-time "progress can't be saved" warning (see backlog item 033),
 * baked hidden into the static page the same way the toolbar/banner are —
 * see `.ux/decisions/001-frozen-chrome-blocking-reconciliation.md`. The
 * dismiss control follows the app's established icon-button convention (an
 * `aria-hidden` glyph paired with a `.sr-only` translated label) rather than
 * relying on `aria-label` alone — see `modules/client.md`'s observed
 * patterns. Uses "×" rather than the play page's own "✖" cross-mode glyph,
 * so this control is never visually confused with a crossed grid cell.
 */
function renderDefaultStorageWarning(): string {
  return `<div data-role="storage-warning" role="status" aria-live="polite" hidden><span data-i18n="play.storageWarning">${translate(DEFAULT_LOCALE, "play.storageWarning")}</span><button type="button" data-role="storage-warning-dismiss"><span aria-hidden="true">×</span><span class="sr-only" data-i18n="play.dismissWarning">${translate(DEFAULT_LOCALE, "play.dismissWarning")}</span></button></div>`;
}

// Cycled by palette index so different colors stay distinguishable even
// where the browser can't render color (Kindle's e-ink is often grayscale).
// See .vibe/decisions/003-clue-color-plus-pattern-cue.md. The border always
// uses the raw palette hex, unlike the run's text color (see
// `readableRunColor` in `renderStyle`) — the border is the color-identity
// cue and stays untouched by the text's contrast fallback (backlog item 048
// / .vibe/decisions/030-clue-number-contrast-fallback-not-blocked-by-hex-format-support.md).
const BORDER_STYLES = ["solid", "dashed", "dotted", "double"];

/**
 * Renders the full static HTML for one puzzle's page: color-coded (plus a
 * non-color border cue) clue headers, a solution-blind grid of addressable
 * cells, the play toolbar and win banner already in their default shape
 * (see `renderDefaultToolbar`/`renderDefaultBanner` above), and the puzzle
 * embedded as JSON for later client-side hydration. See
 * .vibe/decisions/002-puzzle-page-embeds-full-solution.md for why the
 * embedded payload includes the solution, and
 * .ux/decisions/001-frozen-chrome-blocking-reconciliation.md for why the
 * toolbar/banner are real markup now rather than built by
 * `hydratePlayPage.ts` from scratch. `assetVersion`, when given, is
 * appended as a `?v=` query string on the client bundle script so a
 * returning browser doesn't keep serving a stale cached bundle after a
 * rebuild (see .vibe/decisions/007-static-site-build-orchestrator-design.md).
 */
export function renderPuzzlePage(
  puzzle: Puzzle,
  assetVersion?: string,
): string {
  const clues = computePuzzleClues(puzzle);
  const multiColor = puzzle.palette.length > 1;

  const columnHeaders = clues.columns
    .map((runs) => renderColumnClueCell(runs, puzzle, multiColor))
    .join("\n");

  const rows = puzzle.cells
    .map((_row, y) => renderRow(y, clues.rows[y] ?? [], puzzle, multiColor))
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
${renderEarlyLangScript()}
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(puzzle.name)}</title>
<link rel="icon" type="image/svg+xml" href="../../favicon.svg" />
<style>${renderStyle(puzzle, multiColor)}</style>
</head>
<body>
<div class="chrome-panel">
<div class="page-header">
<a class="back-link" href="../../"><span aria-hidden="true">←</span><span class="sr-only" data-i18n="play.backToLibrary">Back to puzzle list</span></a>
<h1>${escapeHtml(puzzle.name)}</h1>
<div class="page-header-controls"></div>
</div>
${renderDefaultLoadError()}
${renderDefaultRestoreWarning()}
${renderDefaultStorageWarning()}
${renderDefaultBanner()}
${renderDefaultToolbar(puzzle)}
</div>
<div class="grid-center">
<div class="grid-wrapper">
<table>
<thead>
<tr>
<th></th>
${columnHeaders}
</tr>
</thead>
<tbody>
${rows}
</tbody>
</table>
</div>
</div>
<script type="application/json" id="puzzle-data">${embedJson(puzzle)}</script>
<script type="module" src="../../assets/main.js${versionQuery(assetVersion)}"></script>
</body>
</html>`;
}

function renderRow(
  y: number,
  runs: ClueRun[],
  puzzle: Puzzle,
  multiColor: boolean,
): string {
  const cells = puzzle.cells[y]
    .map((_cell, x) => `<td data-row="${y}" data-col="${x}"></td>`)
    .join("");

  return `<tr><th scope="row">${renderInlineClue(runs, multiColor)}</th>${cells}</tr>`;
}

function renderColumnClueCell(
  runs: ClueRun[],
  puzzle: Puzzle,
  multiColor: boolean,
): string {
  return `<th class="column-clue" scope="col">${renderStackedClue(runs, multiColor)}</th>`;
}

function isEmptyLine(runs: ClueRun[]): boolean {
  return runs.length === 1 && runs[0].length === 0;
}

function renderRunLabel(run: ClueRun, multiColor: boolean): string {
  if (!multiColor) {
    return String(run.length);
  }

  return `<span class="run run-c${run.colorIndex}">${run.length}</span>`;
}

function renderInlineClue(runs: ClueRun[], multiColor: boolean): string {
  if (isEmptyLine(runs)) {
    return "0";
  }

  return runs.map((run) => renderRunLabel(run, multiColor)).join(" ");
}

/**
 * Stacked multi-color column clues with more than one run get a `run-row`
 * marker on each wrapping div, spaced apart by the `.run-row+.run-row` CSS
 * rule below (see `renderStyle`) so two adjacent runs' colored/patterned
 * borders no longer touch directly — see backlog item 053. Scoped to
 * `multiColor` (a single-color run has no border to separate in the first
 * place) and skipped entirely for a lone run (nothing to space it from,
 * and the adjacent-sibling selector would never match a single div anyway).
 */
function renderStackedClue(runs: ClueRun[], multiColor: boolean): string {
  if (isEmptyLine(runs)) {
    return "0";
  }

  const rowClass = multiColor && runs.length > 1 ? ' class="run-row"' : "";
  return runs
    .map((run) => `<div${rowClass}>${renderRunLabel(run, multiColor)}</div>`)
    .join("");
}

function renderStyle(puzzle: Puzzle, multiColor: boolean): string {
  const colorClasses = multiColor
    ? puzzle.palette
        .map(
          (hex, index) =>
            `.run-c${index}{color:${readableRunColor(hex)};border:${BORDER_WIDTH.thin} ${BORDER_STYLES[index % BORDER_STYLES.length]} ${hex};padding:0 0.15em;}`,
        )
        .join("")
    : "";

  return `
${sharedStyles()}
.chrome-panel{background:${COLORS.panel};border:${BORDER_WIDTH.medium} solid ${COLORS.border};border-radius:${BORDER_RADIUS_PX}px;box-shadow:6px 6px 0 ${COLORS.panelEdge};}
.grid-center{text-align:center;margin:${SPACING_PX.sm}px 0 0;}
.grid-wrapper{display:inline-block;vertical-align:top;text-align:left;overflow:auto;box-sizing:border-box;border:${BORDER_WIDTH.medium} solid ${COLORS.border};border-radius:${BORDER_RADIUS_PX}px;background:${COLORS.panel};}
table{border-collapse:collapse;}
th,td{border:${BORDER_WIDTH.thin} solid ${COLORS.border};min-width:1.6em;min-height:1.6em;text-align:center;padding:0.1em 0.2em;}
td{width:1.6em;height:1.6em;}
th.column-clue{vertical-align:bottom;font-weight:bold;}
tbody th{text-align:right;font-weight:bold;white-space:nowrap;}
tbody td:nth-child(5n+2){border-left-width:${BORDER_WIDTH.medium};}
tbody tr:nth-child(5n+1) td,tbody tr:nth-child(5n+1) th{border-top-width:${BORDER_WIDTH.medium};}
.run{display:inline-block;}
.run-row+.run-row{margin-top:0.2em;}
${colorClasses}`;
}
