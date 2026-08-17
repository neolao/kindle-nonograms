import type { Puzzle } from "@kindle-nonograms/shared";
import { escapeHtml } from "./htmlEscape.js";

/**
 * Just enough of a Puzzle to list and link to it — no solution data ever
 * reaches this renderer.
 */
export type PuzzleSummary = Pick<Puzzle, "id" | "name" | "width" | "height">;

/**
 * Renders the site's home page: a list of every puzzle (name, size, a
 * relative link to its own page) with a hidden "solved" badge already
 * reserved in each row for later client-side hydration to reveal (see
 * .vibe/decisions/004-library-page-reserves-solved-badge-node.md), or a
 * plain empty-state message when there are no puzzles.
 */
export function renderLibraryPage(summaries: PuzzleSummary[]): string {
  const body =
    summaries.length === 0
      ? "<p>No puzzles are available yet.</p>"
      : `<ul>${summaries.map(renderLibraryItem).join("")}</ul>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Kindle Nonograms</title>
<style>${STYLE}</style>
</head>
<body>
<h1>Kindle Nonograms</h1>
${body}
<script type="module" src="./assets/main.js"></script>
</body>
</html>`;
}

function renderLibraryItem(summary: PuzzleSummary): string {
  const href = `puzzles/${encodeURIComponent(summary.id)}/`;
  const label = `${escapeHtml(summary.name)} — ${summary.width} × ${summary.height}`;

  return `<li data-puzzle-id="${escapeHtml(summary.id)}"><a href="${href}">${label}</a><span class="solved-badge" hidden>Solved</span></li>`;
}

const STYLE = `
body{font-family:sans-serif;}
[hidden]{display:none;}
li{list-style:none;display:flex;align-items:center;}
li a{flex:1;display:block;padding:0.5em;min-height:1.6em;}
`;
