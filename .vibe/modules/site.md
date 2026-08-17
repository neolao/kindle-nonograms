# Module: site
**Role:** Static-site generator — loads and validates the puzzle content that the built site is generated from.
**Files:** `packages/site/src/discoverPuzzles.ts`, `packages/site/src/renderPuzzlePage.ts`, `packages/site/src/renderLibraryPage.ts`, `packages/site/src/htmlEscape.ts`
**Exports:** `loadPuzzleSources(dir): Promise<Puzzle[]>`, `renderPuzzlePage(puzzle): string`, `renderLibraryPage(summaries): string`, `PuzzleSummary` (type), `escapeHtml(text): string`
**Depends on:** `modules/shared.md`
