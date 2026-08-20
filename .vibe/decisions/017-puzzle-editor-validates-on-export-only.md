---
date: 2026-08-20
status: accepted
---
# Puzzle editor validates only on Export, no destructive-action confirmation

**Context:** The new puzzle editor page (backlog item 029) lets a contributor freely resize the grid, add/remove palette colors, and paint cells before exporting a `Puzzle` JSON. Consulted UX guidance suggested validating fields live as the contributor types and confirming before removing a palette color that's currently used by cells (since removal clears those cells).

**Decision:** Validation runs only when Export is clicked, by handing the assembled state to `createPuzzle` and surfacing its thrown message inline — exactly as the backlog item's own acceptance criteria describe. Removing a palette color clears/reindexes affected cells immediately, with no confirmation step.

**Reason:** Matches the acceptance criteria as written, keeps the interaction model simple (one validation path, one source of truth for "is this puzzle valid"), and avoids introducing a confirmation-dialog pattern that doesn't exist anywhere else in the app (progress itself is never confirmed before being overwritten either). The live grid rebuild on every edit already makes a color removal's effect immediately visible, which covers most of the risk a confirmation step would guard against.

**Rejected alternatives:** Live per-field validation as the contributor types (rejected: duplicates `createPuzzle`'s validation path for no functional gain, and the acceptance criteria explicitly frame validation as an Export-time step). A confirmation prompt before removing a used palette color (rejected: no precedent elsewhere in the app, and `window.confirm` is awkward to drive in automated tests).
