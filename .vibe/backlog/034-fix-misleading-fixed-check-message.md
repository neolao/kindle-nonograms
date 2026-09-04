---
status: todo
---
# Fix Misleading "Fixed" Check Message

## Description
The check-result message (`packages/shared/src/i18n.ts:82,134-135`, key `play.winBanner.corrected`) says wrong cells were "fixed"/"corrigées", but `correctWrongCells` only clears them back to blank — it never fills in the correct answer. This misleads the player about what just happened on every check of a partially-wrong grid.

## Acceptance Criteria
- [ ] The English string for `play.winBanner.corrected` says the cells were cleared, not fixed/corrected.
- [ ] The French string is reworded to match (e.g. "Certaines cases incorrectes ont été effacées, continuez !").
- [ ] No other translation key or user-facing behavior changes.

## Notes
Audit finding F3 (`.ux/audit/2026-09-04.md`). Pure content/wording fix, no logic change.
