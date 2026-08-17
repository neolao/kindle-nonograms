import {
  type ClueRun,
  type Puzzle,
  computePuzzleClues,
} from "@kindle-nonograms/shared";
import { escapeHtml } from "./htmlEscape.js";

// Cycled by palette index so different colors stay distinguishable even
// where the browser can't render color (Kindle's e-ink is often grayscale).
// See .vibe/decisions/003-clue-color-plus-pattern-cue.md.
const BORDER_STYLES = ["solid", "dashed", "dotted", "double"];

/**
 * Renders the full static HTML for one puzzle's page: color-coded (plus a
 * non-color border cue) clue headers, a solution-blind grid of addressable
 * cells, and the puzzle embedded as JSON for later client-side hydration.
 * See .vibe/decisions/002-puzzle-page-embeds-full-solution.md for why the
 * embedded payload includes the solution.
 */
export function renderPuzzlePage(puzzle: Puzzle): string {
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
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(puzzle.name)}</title>
<style>${renderStyle(puzzle, multiColor)}</style>
</head>
<body>
<h1>${escapeHtml(puzzle.name)}</h1>
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
<script type="application/json" id="puzzle-data">${embedJson(puzzle)}</script>
<script type="module" src="../../assets/main.js"></script>
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

function renderStackedClue(runs: ClueRun[], multiColor: boolean): string {
  if (isEmptyLine(runs)) {
    return "0";
  }

  return runs
    .map((run) => `<div>${renderRunLabel(run, multiColor)}</div>`)
    .join("");
}

function renderStyle(puzzle: Puzzle, multiColor: boolean): string {
  const colorClasses = multiColor
    ? puzzle.palette
        .map(
          (hex, index) =>
            `.run-c${index}{color:${hex};border:1px ${BORDER_STYLES[index % BORDER_STYLES.length]} ${hex};padding:0 0.15em;}`,
        )
        .join("")
    : "";

  return `
body{font-family:sans-serif;}
.grid-wrapper{overflow-x:auto;}
table{border-collapse:collapse;}
th,td{border:1px solid #000;min-width:1.6em;min-height:1.6em;text-align:center;padding:0.1em 0.2em;}
td{width:1.6em;height:1.6em;}
th.column-clue{vertical-align:bottom;font-weight:bold;}
tbody th{text-align:right;font-weight:bold;white-space:nowrap;}
tbody td:nth-child(5n+2){border-left-width:2px;}
tbody tr:nth-child(5n+1) td,tbody tr:nth-child(5n+1) th{border-top-width:2px;}
.run{display:inline-block;}
${colorClasses}`;
}

function embedJson(puzzle: Puzzle): string {
  // Escapes "<" so the payload can never be parsed as HTML markup (e.g. a
  // "</script>" inside a puzzle's id/name breaking out of this tag).
  return JSON.stringify(puzzle).replace(/</g, "\\u003c");
}
