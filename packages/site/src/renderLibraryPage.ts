import type { Puzzle } from "@kindle-nonograms/shared";
import { embedJson, escapeHtml, versionQuery } from "./htmlEscape.js";
import { sharedStyles } from "./sharedStyles.js";
import {
  BORDER_WIDTH,
  COLORS,
  MIN_TAP_TARGET_PX,
  SPACING_PX,
} from "./theme.js";

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
 */
export function renderLibraryPage(
  puzzles: Puzzle[],
  assetVersion?: string,
): string {
  const body =
    puzzles.length === 0
      ? '<p data-i18n="library.empty">No puzzles are available yet.</p>'
      : `<ul>${puzzles.map(renderLibraryItem).join("")}</ul>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Kindle Nonograms</title>
<style>${STYLE}</style>
</head>
<body>
<h1 data-i18n="library.title">Kindle Nonograms</h1>
${body}
<script type="application/json" id="puzzles-data">${embedJson(puzzles)}</script>
<script type="module" src="./assets/main.js${versionQuery(assetVersion)}"></script>
</body>
</html>`;
}

function renderLibraryItem(puzzle: Puzzle): string {
  const href = `puzzles/${encodeURIComponent(puzzle.id)}/`;
  const label = `${escapeHtml(puzzle.name)} — ${puzzle.width} × ${puzzle.height}`;

  return `<li data-puzzle-id="${escapeHtml(puzzle.id)}"><a href="${href}">${label}</a><span class="solved-badge" data-i18n="library.solvedBadge" hidden>Solved</span></li>`;
}

const STYLE = `
${sharedStyles()}
[hidden]{display:none;}
ul{list-style:none;padding:0;margin:${SPACING_PX.sm}px ${SPACING_PX.md}px;border:${BORDER_WIDTH.thin} solid ${COLORS.border};}
li{display:flex;align-items:center;border-bottom:${BORDER_WIDTH.thin} solid ${COLORS.border};border-left:${BORDER_WIDTH.thick} solid ${COLORS.accent};}
li:last-child{border-bottom:none;}
li a{flex:1;display:block;padding:${SPACING_PX.sm}px ${SPACING_PX.md}px;min-height:${MIN_TAP_TARGET_PX}px;}
li a:focus{outline:${BORDER_WIDTH.thick} solid ${COLORS.focusOutline};}
.solved-badge{margin-left:auto;padding:2px ${SPACING_PX.xs}px;border:${BORDER_WIDTH.thin} solid ${COLORS.border};font-size:0.85em;}
`;
