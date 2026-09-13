---
date: 2026-09-13
status: accepted
---
# Partial-progress library thumbnails generalize `buildThumbnail` instead of duplicating it

**Context:** Backlog item 071 adds a third library thumbnail state — a puzzle with saved-but-incomplete progress — alongside the existing "never opened" (`?` placeholder) and "solved" (full thumbnail) states. `buildThumbnail` (`packages/shared/src/thumbnail.ts`) already downsamples `Puzzle.cells` (`number | null` per cell) for the solved case; player progress cells are `PlayerCellMark` (`number | "marked" | null`), a different type with an extra `"marked"` state — per this batch's product decision, marked cells render as blank/neutral in the thumbnail, same as untouched cells.

**Decision:** `buildThumbnail` is widened to sample a plain `(number | null)[][]` grid rather than a `Puzzle` specifically. The partial-thumbnail call site converts a player's `PuzzleProgress.cells` to that shape first (mapping `"marked"` and `null` both to `null`), then calls the same downsampler used for the solved case. No second downsampling implementation is added.

**Reason:** The two thumbnails differ only in which grid they read, not in the downsampling logic itself — duplicating nearest-neighbor sampling for a second, nearly identical function would drift out of sync over time (e.g. a future change to sampling bias would need updating twice). Converting the progress grid to the same shape `buildThumbnail` already accepts keeps a single, tested implementation and keeps the marked-cells-stay-neutral product rule expressed once, at the conversion step, rather than duplicated inside a second sampler.

**Rejected alternatives:** A separate `buildProgressThumbnail` duplicating the sampling loop for `PlayerCellMark` — rejected per the reasoning above. Passing `PlayerCellMark[][]` directly into a `buildThumbnail` that accepts either shape via a union — rejected as flagged during expert consultation: a signature silently accepting two different cell-value shapes invites a correctness bug (treating `"marked"` as a color index) rather than forcing the caller to make the marked→blank conversion explicit.
