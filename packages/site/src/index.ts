/**
 * Public entry point for `@kindle-nonograms/site`: the page-rendering
 * functions, re-exported so another package can build a real static page's
 * HTML rather than duplicating its markup — used by `packages/client`'s
 * hydration tests to build their DOM fixtures from the actual generated
 * output instead of a hand-retyped copy that can silently drift out of
 * sync (see `.ux/decisions/001-frozen-chrome-blocking-reconciliation.md`).
 */
export { renderLibraryPage } from "./renderLibraryPage.js";
export { renderPuzzlePage } from "./renderPuzzlePage.js";
export { renderEditorPage } from "./renderEditorPage.js";
