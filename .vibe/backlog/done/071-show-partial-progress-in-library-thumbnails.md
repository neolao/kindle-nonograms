---
status: done
---
# Show Partial Progress In Library Thumbnails

## Description
The library page currently shows a puzzle's downsampled thumbnail only once it's fully solved (`.vibe/decisions/012-solved-thumbnail-built-client-side-only.md`); every other puzzle shows a neutral "?" placeholder, whether the player has never opened it or has partially filled it in. For a puzzle with in-progress (not yet complete) saved progress, the library should instead build a thumbnail from the player's own filled cells — leaving untouched cells blank/neutral — so returning to the library shows a progressively-revealed preview of what's been painted so far, without spoiling the unfilled parts of the picture.

## Acceptance Criteria
- [ ] A puzzle with partial saved progress (some cells filled, not yet solved) shows a thumbnail built from the player's filled cells; cells the player hasn't touched render as empty/neutral, not the solution color.
- [ ] A puzzle with no saved progress at all still shows today's neutral "?" placeholder, unchanged.
- [ ] A fully solved puzzle still shows the full revealed thumbnail exactly as today, unchanged.
- [ ] The partial thumbnail is built entirely client-side from the player's own `localStorage` progress, never from solution data sent or computed server-side — same guarantee as decision 012.

## Notes
Affects `packages/shared/src/thumbnail.ts` (needs a progress-based variant, or a generalized version of `buildThumbnail` that samples an arbitrary cell grid rather than always `puzzle.cells`) and `packages/client/src/hydrateLibraryPage.ts` (`isSolved`/`revealThumbnail` need a third branch for "partial"). Nearest-neighbor downsampling means a filled cell can be skipped if it isn't the sampled source cell for its output position — worth deciding whether the partial thumbnail should bias sampling toward filled cells, or whether plain nearest-neighbor (consistent with the existing solved thumbnail) is acceptable. Performance is not a concern: progress is already loaded and compared against the solution for every puzzle row to compute the existing "solved" badge, so building a small downsampled preview from the same data is negligible added cost.
