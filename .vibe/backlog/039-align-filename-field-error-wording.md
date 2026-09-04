---
status: todo
---
# Align Filename Field Error Wording

## Description
The editor's field is labeled "Filename (id)" (`packages/shared/src/i18n.ts:116`), but its validation error calls the same thing "Puzzle id" (`packages/shared/src/puzzle.ts:29`) — unlike the sibling "Puzzle name" error, which matches its own label exactly. A contributor hitting this error may not connect it to the right field.

## Acceptance Criteria
- [ ] The validation error for an empty filename/id names the field as it's labeled: "Filename (id) must not be empty." (and the matching French string).
- [ ] No other validation message wording changes.

## Notes
Audit finding F8 (`.ux/audit/2026-09-04.md`). Pure wording fix.
