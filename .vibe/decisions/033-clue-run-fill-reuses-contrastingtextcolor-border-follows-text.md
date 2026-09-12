---
date: 2026-09-12
status: accepted
---
# Clue-run swatch fill reuses `contrastingTextColor`; its border follows the text color, not the palette hex

**Context:** Backlog item 064 turns each multi-color clue-run number from palette-colored text with a colored/patterned border on a white background into a filled swatch (palette color as background, like a filled grid cell), keeping the border-style cycle (solid/dashed/dotted/double) that lets colors stay distinguishable in grayscale.

**Decision:** The run's text color is computed with the existing `contrastingTextColor(hex)` helper (best of black/white against the hex *as background*), replacing `readableRunColor` (which answered a now-obsolete question: is the palette hex itself legible *as text* on white). The border keeps its per-index style and width unchanged, but its color now matches the same contrasting black/white text color instead of the palette hex.

**Reason:** Two independent plan-time expert consultations (frontend-design, UI/UX) both concluded that a border painted in the exact fill color optically disappears into it, silently erasing the grayscale non-color cue the project already committed to (`.vibe/decisions/003-clue-color-plus-pattern-cue.md`). `readableRunColor` becomes dead code once the background itself carries the palette hex, since `contrastingTextColor` already answers the relevant question and is reused elsewhere for the same purpose (filled grid cells, editor swatches).

**Rejected alternatives:** Keeping the border in the palette hex to match the fill — rejected, it erases the border-style shape against a same-hue background. Keeping `readableRunColor` for the text color — rejected, superseded by `contrastingTextColor` now that the palette hex is the background, not the foreground; see `.vibe/decisions/030-clue-number-contrast-fallback-not-blocked-by-hex-format-support.md`, now superseded by this one.
