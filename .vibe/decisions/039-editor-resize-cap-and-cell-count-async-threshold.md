---
date: 2026-09-13
status: accepted
---
# Editor grid resize: hard cap plus a cell-count async threshold

**Context:** The puzzle editor's width/height inputs had no upper bound; typing a very large value (e.g. 500x500) rebuilt the whole grid synchronously with zero busy indicator, freezing the page.

**Decision:** Cap width/height at `EDITOR_MAX_DIMENSION = 60` (a single shared constant, mirrored as the HTML `max` attribute and enforced as the sole authority by `handleResize`'s own range check, since the HTML attribute alone doesn't block a `change` event from firing with an out-of-range value). Below `RESIZE_ASYNC_THRESHOLD_CELLS = 625` total cells, a resize stays exactly as synchronous as before. At or above it, `handleResize` reuses the image-import flow's existing yield-then-disable pattern: disable the width/height inputs and show a plain "Resizing…" message before a `setTimeout(0)` yield, rebuild, then clear the message, re-enable, and restore focus to whichever input triggered it (disabling an element blurs it).

**Reason:** 60 comfortably exceeds the largest puzzle shipped today (45x45) while still ruling out a pathological value. The 625-cell threshold sits below that same 45x45 puzzle's 2025 cells, so drafting anything in the range of real shipped puzzles already gets the busy indicator, not only the largest allowed sizes — while ordinary small resizes (the common case) never show an unexplained flash. Reusing the import flow's exact busy-state ordering and its plain, non-translated "Resizing…" string (rather than a new translated key) keeps a second, near-identical busy-state implementation from drifting from the first.

**Rejected alternatives:** A single hard cap with no busy-state distinction (simpler, but a 60x60 rebuild could still visibly stall with zero feedback, which the whole point of the busy indicator is to avoid). Applying the yield-then-disable path to every resize regardless of size (rejected as it would flash "Resizing…" on trivial, already-instant resizes and silently change the timing of every existing synchronous test). A dedicated translated busy string (rejected for now since the import flow's own busy text is already a plain hardcoded string, not run through `translate()` — matching that precedent keeps the two flows consistent rather than introducing an inconsistency between them).
