---
status: done
---
# Align Filename Field Error Wording

## Description
The editor's field is labeled "Filename (id)" (`packages/shared/src/i18n.ts:116`), but its validation error calls the same thing "Puzzle id" (`packages/shared/src/puzzle.ts:29`) — unlike the sibling "Puzzle name" error, which matches its own label exactly. A contributor hitting this error may not connect it to the right field.

## Acceptance Criteria
- [x] The validation error for an empty filename/id names the field as it's labeled: "Filename (id) must not be empty." (and the matching French string).
- [x] No other validation message wording changes.

## Notes
Audit finding F8 (`.ux/audit/2026-09-04.md`). Pure wording fix.

## Resolution
`createPuzzle`'s `emptyId` message now reads "Filename (id) must not be empty" (`packages/shared/src/puzzle.ts`). This message is a plain-English, developer-facing string (used verbatim by `discoverPuzzles.ts`'s build-time diagnostics), not the translated string the editor UI shows on screen — it has no French counterpart anywhere in the codebase, so there is no "matching French string" to update. The editor's own user-facing translated string (`editor.error.emptyFilename`, English and French) was already correct and is unchanged.
