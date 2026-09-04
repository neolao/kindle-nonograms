import {
  DEFAULT_LOCALE,
  EDITOR_DEFAULT_HEIGHT,
  EDITOR_DEFAULT_PALETTE,
  EDITOR_DEFAULT_WIDTH,
  contrastingTextColor,
  translate,
} from "@kindle-nonograms/shared";
import { versionQuery } from "./htmlEscape.js";
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
 * The editor's default palette/toolbar/canvas, baked into the static HTML
 * so it already looks complete on first paint instead of popping in once
 * `hydrateEditorPage.ts` builds it — see
 * `.ux/decisions/001-frozen-chrome-blocking-reconciliation.md`. Mirrors
 * exactly what that script's own `render()` produces for a fresh page (no
 * persistence exists for this page, so this default never changes); that
 * script still rebuilds this same markup once at startup, which is a safe,
 * invisible no-op since both sides start from these same
 * `EDITOR_DEFAULT_*` values.
 */
function renderDefaultPalette(): string {
  const hex = EDITOR_DEFAULT_PALETTE[0] ?? "#000000";
  const textColor = contrastingTextColor(hex);
  return `<div class="editor-palette-row"><button type="button" data-role="swatch" data-color-index="0" aria-label="${translate(DEFAULT_LOCALE, "editor.selectColorAriaLabel")}" aria-pressed="true" style="background-color:${hex};color:${textColor};">✓</button><input type="color" data-role="palette-color-input" data-color-index="0" value="${hex}" aria-label="${translate(DEFAULT_LOCALE, "editor.editColorAriaLabel")}" /><button type="button" data-role="palette-remove" data-color-index="0" aria-label="${translate(DEFAULT_LOCALE, "editor.removeColorAriaLabel")}" disabled>×</button></div><button type="button" data-role="editor-add-color" aria-label="${translate(DEFAULT_LOCALE, "editor.addColor")}">+</button>`;
}

function renderDefaultToolbar(): string {
  return `<button type="button" data-role="mode-paint" data-i18n="editor.modePaint" aria-pressed="true">${translate(DEFAULT_LOCALE, "editor.modePaint")}</button><button type="button" data-role="mode-erase" data-i18n="editor.modeErase" aria-pressed="false">${translate(DEFAULT_LOCALE, "editor.modeErase")}</button>`;
}

function renderDefaultGrid(): string {
  const rows = Array.from({ length: EDITOR_DEFAULT_HEIGHT }, (_, y) => {
    const cells = Array.from(
      { length: EDITOR_DEFAULT_WIDTH },
      (_, x) => `<td data-row="${y}" data-col="${x}"></td>`,
    ).join("");
    return `<tr>${cells}</tr>`;
  }).join("");
  return `<table><tbody>${rows}</tbody></table>`;
}

/**
 * Renders the static shell for the puzzle editor: a contributor-facing tool
 * (run in a normal desktop browser, not on Kindle) that lets someone build a
 * `Puzzle` by hand and export it as a ready-to-submit JSON file — see
 * .vibe/backlog/done/029-web-based-puzzle-editor.md. The size controls, the
 * name/filename/export controls and the reserved error region are plain
 * static markup; the palette editor, paint/erase toolbar and grid canvas
 * (`data-role="editor-*"`) are also real markup now, already showing the
 * page's fixed default (5×5, one black color, Paint mode — see
 * `renderDefaultPalette`/`renderDefaultToolbar`/`renderDefaultGrid` above)
 * instead of empty containers for `hydrateEditorPage.ts` to fill in on
 * first load — see
 * `.ux/decisions/001-frozen-chrome-blocking-reconciliation.md`. That script
 * still owns rebuilding all three once the contributor actually changes
 * anything (resize, palette edit, paint, import).
 *
 * Deliberately never renders a `<table>` or either other page's own embedded
 * `#puzzle-data`/`#puzzles-data` script — `main.ts` imports every hydration
 * script unconditionally, and each self-detects its own page shape by a
 * marker unique to it (see main.ts's doc comment); a marker two page shapes
 * could both satisfy has caused a real double-hydration bug in this project
 * before. `[data-role="editor-page"]` is this page's own unique marker.
 */
export function renderEditorPage(assetVersion?: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Puzzle Editor</title>
<link rel="icon" type="image/svg+xml" href="../favicon.svg" />
<style>${STYLE}</style>
</head>
<body>
<div class="chrome-panel" data-role="editor-page">
<div class="page-header">
<a class="back-link" href="../"><span aria-hidden="true">←</span><span class="sr-only" data-i18n="play.backToLibrary">Back to puzzle list</span></a>
<h1 data-i18n="editor.title">Puzzle Editor</h1>
<div class="page-header-controls"></div>
</div>
</div>
<div class="panel editor-panel">
<p class="section-label" data-i18n="editor.sizeLabel">Grid size</p>
<div class="editor-size-controls">
<label for="editor-width" data-i18n="editor.widthLabel">Width</label>
<input type="number" id="editor-width" min="1" value="${EDITOR_DEFAULT_WIDTH}" data-role="editor-width" />
<label for="editor-height" data-i18n="editor.heightLabel">Height</label>
<input type="number" id="editor-height" min="1" value="${EDITOR_DEFAULT_HEIGHT}" data-role="editor-height" />
</div>
</div>
<div class="panel editor-panel">
<p class="section-label" data-i18n="editor.importLabel">Import image</p>
<div class="editor-import-controls">
<label for="editor-import-file" data-i18n="editor.importFileLabel">Image file</label>
<input type="file" accept="image/png,image/jpeg" id="editor-import-file" data-role="editor-import-file" />
<label for="editor-import-palette-size" data-i18n="editor.importPaletteSizeLabel">Palette size</label>
<input type="number" id="editor-import-palette-size" min="1" max="16" value="4" data-role="editor-import-palette-size" />
<label for="editor-import-background" data-i18n="editor.importBackgroundLabel">Background color</label>
<input type="color" id="editor-import-background" value="#ffffff" data-role="editor-import-background" />
<button type="button" data-role="editor-import-button" data-i18n="editor.importButton">Import</button>
</div>
<p class="editor-import-hint" data-i18n="editor.importHint">The image is fitted to the grid size above and reduced to the palette size above; pixels close to the background color become blank.</p>
</div>
<div class="panel editor-panel">
<p class="section-label" data-i18n="editor.paletteLabel">Palette</p>
<div class="editor-palette" data-role="editor-palette">${renderDefaultPalette()}</div>
</div>
<div class="panel editor-panel">
<p class="section-label" data-i18n="editor.canvasLabel">Canvas</p>
<div class="editor-toolbar" data-role="editor-toolbar">${renderDefaultToolbar()}</div>
<div class="grid-center">
<div class="grid-wrapper" data-role="editor-grid-wrapper">${renderDefaultGrid()}</div>
</div>
</div>
<div class="panel editor-panel">
<p class="section-label" data-i18n="editor.metaLabel">Name and export</p>
<div class="editor-meta">
<label for="editor-name" data-i18n="editor.nameLabel">Puzzle name</label>
<input type="text" id="editor-name" data-role="editor-name" />
<label for="editor-filename" data-i18n="editor.filenameLabel">Filename (id)</label>
<input type="text" id="editor-filename" data-role="editor-filename" />
<button type="button" data-role="editor-export" data-i18n="editor.export">Export</button>
<p class="editor-error" data-role="editor-error" aria-live="polite"></p>
</div>
</div>
<script type="module" src="../assets/main.js${versionQuery(assetVersion)}"></script>
</body>
</html>`;
}

const STYLE = `
${sharedStyles()}
.editor-panel{margin:${SPACING_PX.sm}px ${SPACING_PX.md}px;padding:${SPACING_PX.sm}px ${SPACING_PX.md}px;}
.editor-size-controls,.editor-meta,.editor-import-controls{display:flex;flex-wrap:wrap;align-items:center;gap:${SPACING_PX.sm}px;}
.editor-size-controls input[type="number"],.editor-import-controls input[type="number"]{width:4.5em;min-height:${MIN_TAP_TARGET_PX}px;border:${BORDER_WIDTH.thin} solid ${COLORS.border};border-radius:${BORDER_RADIUS_PX}px;padding:0 ${SPACING_PX.sm}px;}
.editor-import-controls input[type="file"]{min-height:${MIN_TAP_TARGET_PX}px;}
.editor-import-controls input[type="color"]{min-height:${MIN_TAP_TARGET_PX}px;min-width:${MIN_TAP_TARGET_PX}px;border:${BORDER_WIDTH.thin} solid ${COLORS.border};border-radius:${BORDER_RADIUS_PX}px;padding:0;}
.editor-import-hint{margin:${SPACING_PX.xs}px 0 0;color:${COLORS.muted};font-size:0.85em;}
.editor-meta input[type="text"]{flex:1;min-width:10em;min-height:${MIN_TAP_TARGET_PX}px;border:${BORDER_WIDTH.thin} solid ${COLORS.border};border-radius:${BORDER_RADIUS_PX}px;padding:0 ${SPACING_PX.sm}px;}
.editor-palette{display:flex;flex-wrap:wrap;align-items:center;gap:${SPACING_PX.xs}px;padding:${SPACING_PX.xs}px;border:${BORDER_WIDTH.thin} solid ${COLORS.panelEdge};border-radius:${BORDER_RADIUS_PX}px;background:${COLORS.paper};max-height:11em;overflow-y:auto;}
.editor-palette-row{display:flex;align-items:center;gap:${SPACING_PX.xs}px;}
.editor-toolbar{display:flex;flex-wrap:wrap;align-items:center;gap:${SPACING_PX.md}px;margin:0 0 ${SPACING_PX.sm}px;}
.editor-error{min-height:1.2em;color:${COLORS.amber};font-family:${LABEL_FONT_STACK};font-size:0.9em;}
.grid-center{text-align:center;margin:${SPACING_PX.sm}px 0 0;}
.grid-wrapper{display:inline-block;vertical-align:top;text-align:left;overflow:hidden;box-sizing:border-box;border:${BORDER_WIDTH.medium} solid ${COLORS.border};border-radius:${BORDER_RADIUS_PX}px;background:${COLORS.panel};}
.grid-wrapper table{border-collapse:collapse;}
.grid-wrapper td{border:${BORDER_WIDTH.thin} solid ${COLORS.border};width:2em;height:2em;min-width:2em;min-height:2em;padding:0;cursor:pointer;}
.grid-wrapper tbody td:nth-child(5n+1){border-left-width:${BORDER_WIDTH.medium};}
.grid-wrapper tbody tr:nth-child(5n+1) td{border-top-width:${BORDER_WIDTH.medium};}
`;
