---
status: todo
---
# Notify Player When Saved Progress Can't Be Restored

## Description
When saved progress no longer matches a puzzle's current dimensions, `hydratePlayPage.ts:57-71` silently discards it for an empty grid — the player's prior work vanishes with no notice that anything happened.

## Acceptance Criteria
- [ ] When incompatible saved progress is discarded, the player sees a small, one-time note ("Your saved progress for this puzzle could not be restored").
- [ ] The puzzle still loads normally (empty grid) after showing the note — no crash, no dead end.
- [ ] Compatible saved progress continues to restore silently, exactly as today.

## Notes
Audit finding F11 (`.ux/audit/2026-09-04.md`).
