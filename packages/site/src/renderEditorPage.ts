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
 * Renders the static shell for the puzzle editor: a contributor-facing tool
 * (run in a normal desktop browser, not on Kindle) that lets someone build a
 * `Puzzle` by hand and export it as a ready-to-submit JSON file — see
 * .vibe/backlog/done/029-web-based-puzzle-editor.md. Unlike the play page,
 * there is no puzzle to render yet, so this only lays out the chrome and a
 * set of empty containers (`data-role="editor-*"`) that `hydrateEditorPage.ts`
 * fills in: the size controls, the palette editor, the paint/erase toolbar,
 * the grid wrapper (built into a real `<table>` only once hydration runs),
 * and the name/filename/export controls plus a reserved, always-present
 * error region.
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
<input type="number" id="editor-width" min="1" data-role="editor-width" />
<label for="editor-height" data-i18n="editor.heightLabel">Height</label>
<input type="number" id="editor-height" min="1" data-role="editor-height" />
</div>
</div>
<div class="panel editor-panel">
<p class="section-label" data-i18n="editor.paletteLabel">Palette</p>
<div class="editor-palette" data-role="editor-palette"></div>
</div>
<div class="panel editor-panel">
<p class="section-label" data-i18n="editor.canvasLabel">Canvas</p>
<div class="editor-toolbar" data-role="editor-toolbar"></div>
<div class="grid-center">
<div class="grid-wrapper" data-role="editor-grid-wrapper"></div>
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
.editor-size-controls,.editor-meta{display:flex;flex-wrap:wrap;align-items:center;gap:${SPACING_PX.sm}px;}
.editor-size-controls input[type="number"]{width:4.5em;min-height:${MIN_TAP_TARGET_PX}px;border:${BORDER_WIDTH.thin} solid ${COLORS.border};border-radius:${BORDER_RADIUS_PX}px;padding:0 ${SPACING_PX.sm}px;}
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
