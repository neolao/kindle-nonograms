---
status: in_progress
---
# Library Filter for Size and Color

## Description
The library page currently lists every puzzle with no way to narrow the list. Add filter controls that let the player restrict the visible puzzles by grid size and by whether the puzzle is monochrome or multi-color.

## Acceptance Criteria
- [ ] Library page shows a filter control for puzzle size (e.g. small/medium/large buckets, or explicit width×height groups).
- [ ] Library page shows a filter control for color type: monochrome only, multi-color only, or all.
- [ ] Selecting any combination of filters shows only the puzzles matching all active filters; clearing filters restores the full list.
- [ ] Filtering happens client-side (no server round-trip — this is a static site) and doesn't break the existing solved-badge/thumbnail hydration in `hydrateLibraryPage.ts`.

## Notes
The server package was removed in favor of a fully static site (`005-remove-express-server-package.md`), so filtering must run entirely in the client, likely as part of or alongside `hydrateLibraryPage.ts`. Each puzzle's `width`/`height` are already embedded per card (`renderLibraryItem` in `packages/site/src/renderLibraryPage.ts`), and whether a puzzle is multi-color can be derived from `puzzle.palette.length > 1`. Per CLAUDE.md's Kindle browser constraints, keep the filter UI simple and static — no animations, no frequent re-renders, and controls sized for e-ink tap targets. Related to backlog item 020 (palette-driven card stripe), which also derives meaning from `puzzle.palette` — no hard dependency between the two, but worth implementing with awareness of each other.
