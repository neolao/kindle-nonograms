---
status: todo
---
# Show An Error When Puzzle Data Fails To Load

## Description
If the embedded puzzle JSON is missing or invalid, the play page fails to hydrate silently (`packages/client/src/hydratePlayPage.ts:44-55,446-449`) — the grid still renders and looks tappable but does nothing, with no message. Low likelihood in practice (puzzles are validated at build time), but a total dead end for the player if it ever happens.

## Acceptance Criteria
- [ ] When `readPuzzle()` fails, a visible message ("This puzzle couldn't be loaded") appears in the page's chrome panel instead of a silently inert grid.
- [ ] The back-link to the library remains usable in this state.
- [ ] Existing successful-hydration behavior is unchanged.

## Notes
Audit finding F9 (`.ux/audit/2026-09-04.md`).
