# Module: site
**Role:** Static-site generator — loads and validates the puzzle content that the built site is generated from.
**Files:** `packages/site/src/discoverPuzzles.ts`, `packages/site/src/renderPuzzlePage.ts`, `packages/site/src/renderLibraryPage.ts`, `packages/site/src/htmlEscape.ts`
**Exports:** `loadPuzzleSources(dir): Promise<Puzzle[]>`, `renderPuzzlePage(puzzle): string`, `renderLibraryPage(puzzles: Puzzle[]): string` — visible markup shows only id/name/size per puzzle, but every puzzle's full data (including its solution) is also embedded as JSON so client hydration can check saved progress for a correct solve, `escapeHtml(text): string`, `embedJson(value): string` — serializes a value for safe embedding in a `<script type="application/json">` tag, escaping `<` so an embedded `</script>` can't break out
**Depends on:** `modules/shared.md`
