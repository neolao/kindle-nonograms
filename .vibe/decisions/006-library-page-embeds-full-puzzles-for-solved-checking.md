---
date: 2026-08-17
status: accepted
---
# The library page now embeds every puzzle's full data, not just id/name/size

**Context:** Backlog item 011 requires the library page to mark a puzzle as solved by checking its saved progress with `isPuzzleSolved(puzzle, progress)`. That function needs the puzzle's full solution grid, but `renderLibraryPage` previously accepted only `PuzzleSummary` (`id`/`name`/`width`/`height`) and its own docstring stated "no solution data reaches this renderer at all" (established when building the library page, before this item existed).
**Decision:** `renderLibraryPage` now takes the full `Puzzle[]` (matching what `loadPuzzleSources` already returns) and embeds every puzzle's complete data as JSON in the page, the same way `renderPuzzlePage` already embeds one puzzle's full data (see decision 002). The *visible* list markup is unchanged and still shows only id/name/size — solutions reach the page only through the embedded JSON, for hydration to read.
**Reason:** There is no way to compute `isPuzzleSolved` client-side without the solution, and this project has no backend to compute or hide it behind. Decision 002 already accepted this exact trade-off for the puzzle page ("no real anti-cheat requirement, no server to enforce one") — the same reasoning applies here, just for several puzzles on one page instead of one puzzle per page. The alternative (fetching each puzzle's own page over the network to read its embedded data) was rejected below.
**Rejected alternatives:**
- Fetching each puzzle's already-generated page and parsing its embedded JSON out of the returned HTML, to avoid changing `renderLibraryPage` at all — rejected: turns a synchronous, offline-safe hydration into N network requests fetching and parsing full HTML documents just to reach a small JSON payload, adds async complexity and failure modes for no real benefit, since decision 002 already treats the solution as non-secret.
- A separate "solved" flag written to `localStorage` by the play page itself when a puzzle is completed, read as-is by the library page (no solution data needed there at all) — rejected: doesn't satisfy backlog item 011's acceptance criteria as written, which is phrased in terms of *stored progress* being fully correct, not of a separate marker; a progress entry saved by any other means (e.g. a future import feature) would go undetected.
