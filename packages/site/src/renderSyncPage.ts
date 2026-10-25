import {
  DEFAULT_LOCALE,
  type TranslationKey,
  translate,
} from "@kindle-nonograms/shared";
import { renderEarlyLangScript } from "./earlyLangScript.js";
import { versionQuery } from "./htmlEscape.js";
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

/** Baked English text for a `data-i18n` element, so the page is complete before hydration. */
function text(key: TranslationKey): string {
  return translate(DEFAULT_LOCALE, key);
}

/**
 * Renders the optional-sync settings page. Everything the player sees is
 * already in the static markup — fields, buttons, status lines — in the
 * "not configured" default; `hydrateSyncPage.ts` only fills the stored
 * values in and attaches behavior, it builds no control (see
 * `.ux/decisions/001-frozen-chrome-blocking-reconciliation.md`). Spec:
 * `.ux/flows/002-optional-sync-setup.md`, `.ux/screens/sync-settings.md`.
 *
 * `[data-role="sync-page"]` is this page's own unique self-detection marker
 * (see main.ts's doc comment); like the editor page it embeds no
 * `#puzzle-data`/`#puzzles-data` script and no `<table>`. The status line is
 * an `aria-live` region that always carries text, so a result is never
 * conveyed by color alone.
 */
export function renderSyncPage(assetVersion?: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
${renderEarlyLangScript()}
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Sync</title>
<link rel="icon" type="image/svg+xml" href="../favicon.svg" />
<style>${STYLE}</style>
</head>
<body>
<div class="chrome-panel" data-role="sync-page">
<div class="page-header">
<a class="back-link" href="../"><span aria-hidden="true">←</span><span class="sr-only" data-i18n="play.backToLibrary">${text("play.backToLibrary")}</span></a>
<h1 data-i18n="sync.title">${text("sync.title")}</h1>
<div class="page-header-controls"></div>
</div>
</div>
<div class="panel sync-panel">
<p class="sync-note" data-i18n="sync.optionalNote">${text("sync.optionalNote")}</p>
<div class="sync-field">
<label for="sync-url" data-i18n="sync.urlLabel">${text("sync.urlLabel")}</label>
<input type="url" id="sync-url" data-role="sync-url" required autocomplete="off" autocapitalize="off" spellcheck="false" aria-describedby="sync-url-hint" />
<p class="sync-hint" id="sync-url-hint" data-i18n="sync.urlHint">${text("sync.urlHint")}</p>
</div>
<div class="sync-field">
<label for="sync-key" data-i18n="sync.keyLabel">${text("sync.keyLabel")}</label>
<div class="sync-key-row">
<input type="password" id="sync-key" data-role="sync-key" required autocomplete="off" autocapitalize="off" spellcheck="false" />
<button type="button" data-role="sync-key-toggle" data-i18n="sync.showKey" aria-pressed="false">${text("sync.showKey")}</button>
</div>
</div>
<div class="sync-actions">
<button type="button" class="btn-primary" data-role="sync-save" data-i18n="sync.saveButton">${text("sync.saveButton")}</button>
<button type="button" data-role="sync-forget" data-i18n="sync.forgetButton">${text("sync.forgetButton")}</button>
</div>
<p class="sync-status" data-role="sync-status" aria-live="polite" data-i18n="sync.status.notConfigured">${text("sync.status.notConfigured")}</p>
<p class="sync-last" data-role="sync-last" data-i18n="sync.neverSynced">${text("sync.neverSynced")}</p>
</div>
<footer class="page-footer">
${renderLanguageSwitcher()}
</footer>
<script type="module" src="../assets/main.js${versionQuery(assetVersion)}"></script>
</body>
</html>`;
}

const STYLE = `
${sharedStyles()}
.sync-panel{margin:${SPACING_PX.sm}px ${SPACING_PX.md}px;padding:${SPACING_PX.sm}px ${SPACING_PX.md}px;}
.sync-note{max-width:65ch;margin-left:0;margin-right:0;}
.sync-field{margin:${SPACING_PX.md}px 0;}
.sync-field label{display:block;font-family:${LABEL_FONT_STACK};margin:0 0 ${SPACING_PX.xs}px;}
.sync-field input{box-sizing:border-box;width:100%;max-width:30em;min-height:${MIN_TAP_TARGET_PX}px;border:${BORDER_WIDTH.thin} solid ${COLORS.border};border-radius:${BORDER_RADIUS_PX}px;padding:0 ${SPACING_PX.sm}px;}
.sync-key-row{display:flex;flex-wrap:wrap;align-items:center;gap:${SPACING_PX.sm}px;}
.sync-key-row input{flex:1;min-width:10em;}
.sync-hint{margin:${SPACING_PX.xs}px 0 0;color:${COLORS.muted};font-size:0.85em;}
.sync-actions{display:flex;flex-wrap:wrap;gap:${SPACING_PX.md}px;margin:${SPACING_PX.md}px 0;}
.sync-status{margin-left:0;margin-right:0;padding:${SPACING_PX.sm}px ${SPACING_PX.md}px;border:${BORDER_WIDTH.medium} solid ${COLORS.border};border-radius:${BORDER_RADIUS_PX}px;font-family:${LABEL_FONT_STACK};font-weight:bold;}
.sync-status[data-state="ok"]{border-color:${COLORS.teal};background:${COLORS.tealSoft};color:${COLORS.teal};}
.sync-status[data-state="error"]{border-color:${COLORS.amber};background:${COLORS.amberSoft};color:${COLORS.amber};}
.sync-last{margin-left:0;margin-right:0;color:${COLORS.muted};font-size:0.9em;}
`;
