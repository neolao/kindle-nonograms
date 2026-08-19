import type { Puzzle } from "@kindle-nonograms/shared";
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

// Purely decorative — see .vibe/decisions/013-three-accent-cabinet-reskin.md.
const DOT_ROW = `<div class="dot-row" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div>`;

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
 * fit-to-viewport measurement that padding could throw off.
 */
export function renderLibraryPage(
  puzzles: Puzzle[],
  assetVersion?: string,
): string {
  const body =
    puzzles.length === 0
      ? '<p data-i18n="library.empty">No puzzles are available yet.</p>'
      : `<p class="section-label" data-i18n="library.sectionLabel">Choose a puzzle</p><ul>${puzzles.map(renderLibraryItem).join("")}</ul>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Kindle Nonograms</title>
<style>${STYLE}</style>
</head>
<body>
<div class="panel">
${DOT_ROW}
<h1 data-i18n="library.title">Kindle Nonograms</h1>
${body}
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

function renderLibraryItem(puzzle: Puzzle): string {
  const href = `puzzles/${encodeURIComponent(puzzle.id)}/`;
  const label = `${escapeHtml(puzzle.name)} — ${puzzle.width} × ${puzzle.height}`;

  return `<li data-puzzle-id="${escapeHtml(puzzle.id)}">${THUMBNAIL_PLACEHOLDER}<a href="${href}">${label}</a><span class="solved-badge" data-i18n="library.solvedBadge" hidden>Solved</span></li>`;
}

const STYLE = `
${sharedStyles()}
[hidden]{display:none;}
ul{list-style:none;padding:0;margin:${SPACING_PX.sm}px ${SPACING_PX.md}px ${SPACING_PX.md}px;display:flex;flex-direction:column;gap:${SPACING_PX.sm}px;}
li{display:flex;align-items:center;border:${BORDER_WIDTH.thin} solid ${COLORS.border};border-top-width:6px;border-top-color:${COLORS.line};border-radius:${BORDER_RADIUS_PX}px;box-shadow:4px 4px 0 ${COLORS.panelEdge};overflow:hidden;}
li:nth-child(4n+1){border-top-color:${COLORS.amber};}
li:nth-child(4n+2){border-top-color:${COLORS.magenta};}
li:nth-child(4n+3){border-top-color:${COLORS.teal};}
li:nth-child(4n){border-top-color:${COLORS.text};}
li a{flex:1;display:flex;align-items:center;min-width:0;padding:${SPACING_PX.sm}px ${SPACING_PX.md}px;min-height:${MIN_TAP_TARGET_PX}px;font-family:${LABEL_FONT_STACK};overflow:hidden;white-space:nowrap;text-overflow:ellipsis;}
li a:focus{outline:${BORDER_WIDTH.thick} solid ${COLORS.focusOutline};}
.solved-badge{margin:0 ${SPACING_PX.md}px 0 auto;padding:2px ${SPACING_PX.sm}px;border:${BORDER_WIDTH.medium} solid ${COLORS.teal};border-radius:${BORDER_RADIUS_PX}px;color:${COLORS.teal};font-size:0.8em;text-transform:uppercase;letter-spacing:0.05em;transform:rotate(-5deg);}
.thumb{flex:0 0 auto;width:36px;height:36px;margin:${SPACING_PX.sm}px 0 ${SPACING_PX.sm}px ${SPACING_PX.sm}px;border:${BORDER_WIDTH.thin} solid ${COLORS.border};border-radius:${BORDER_RADIUS_PX}px;background:${COLORS.panel};display:flex;flex-direction:column;align-items:center;justify-content:center;}
.thumb-lock{color:${COLORS.muted};font-weight:bold;}
.thumb-row{display:flex;}
.thumb-cell{width:4px;height:4px;}
`;
