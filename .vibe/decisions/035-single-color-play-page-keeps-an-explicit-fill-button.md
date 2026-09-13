---
date: 2026-09-13
status: accepted
---
# Single-color play pages keep an explicit Fill button; multi-color pages drop it

**Context:** Backlog item 070 removes the play page's dedicated "Fill" mode button, since tapping a palette color swatch already re-enters fill mode for multi-color puzzles. A single-color puzzle renders no swatches at all (`attachToolbar` only builds the swatch row when `puzzle.palette.length > 1`), so it has no equivalent affordance to fall back on after switching to Cross mode.

**Decision:** The "Fill" button is removed only when the puzzle has swatches to take over its job (`palette.length > 1`). For a single-color puzzle, the toolbar keeps rendering an explicit "Fill" button alongside "Cross", unchanged from today.

**Reason:** Without it, a single-color player who taps "Cross" would have no way back into fill mode — a dead end the acceptance criteria explicitly rule out. Conditioning the button's presence on palette size mirrors the existing conditional swatch rendering, so the toolbar's shape stays driven by the same `palette.length > 1` check throughout.

**Rejected alternatives:** Adding a synthetic single always-present "swatch" for mono-color puzzles just to carry the mode-switch behavior — rejected as an artificial control standing in for a real color choice that doesn't exist, more confusing than keeping the existing named "Fill" button for this one case.
