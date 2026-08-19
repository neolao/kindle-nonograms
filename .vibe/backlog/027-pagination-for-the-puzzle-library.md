---
status: todo
---
# Pagination for the Puzzle Library

## Description
The library page renders every puzzle in a single list with no limit. As the library grows, add pagination so at most 25 puzzles show at once, with controls to move between pages.

## Acceptance Criteria
- [ ] Library page shows at most 25 puzzles at a time, with controls to navigate to the next/previous page.
- [ ] When the total number of puzzles is 25 or fewer, no pagination controls are shown — the existing single-list behavior is preserved.
- [ ] Navigating between pages happens client-side (no server round-trip — this is a static site) and doesn't break the existing solved-badge/thumbnail hydration in `hydrateLibraryPage.ts`.
- [ ] Page state (current page) resets to page 1 whenever the visible set of puzzles changes for a reason other than navigating pages (e.g. a filter is applied, if item 021 is implemented).

## Notes
The server package was removed in favor of a fully static site (`005-remove-express-server-package.md`), so pagination must run entirely client-side, following the same pattern already planned for [[021-library-filter-for-size-and-color]]: all puzzles are still rendered into the page at build time by `renderLibraryPage`/`renderLibraryItem` in `packages/site/src/renderLibraryPage.ts`, and pagination shows/hides `<li>` entries in `hydrateLibraryPage.ts` rather than the site generating separate HTML pages per page number. No hard dependency on item 021, but the two interact — if both land, pagination should apply to the filtered result set, not the unfiltered full list; worth implementing with awareness of each other. Per CLAUDE.md's Kindle browser constraints, keep pagination controls simple and static — no animations, e-ink-friendly tap targets.
