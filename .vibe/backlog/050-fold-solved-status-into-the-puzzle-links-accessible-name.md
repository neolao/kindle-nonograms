---
status: todo
---
# Fold Solved Status Into The Puzzle Link's Accessible Name

## Description
The "Solved" badge in the library is a sibling `<span>` next to the puzzle link, not part of the link's accessible name (`packages/site/src/renderLibraryPage.ts:142`) — tabbing link-to-link never reveals a puzzle's solved status to a screen reader user.

## Acceptance Criteria
- [ ] A solved puzzle's link accessible name includes its solved status (e.g. via `aria-label` on the `<a>`, updated wherever the badge is revealed).
- [ ] An unsolved puzzle's link accessible name is unaffected.
- [ ] The visible badge itself is unchanged.

## Notes
Audit finding F19 (`.ux/audit/2026-09-04.md`).
