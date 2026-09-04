---
status: todo
---
# Explain Invalid Grid Size Input In The Editor

## Description
Typing an invalid width/height (zero, negative, non-numeric) in the editor silently reverts the field with no explanation (`packages/client/src/hydrateEditorPage.ts:483-500`), unlike every other editor action, which reports its problem into `elements.error`.

## Acceptance Criteria
- [ ] Entering an invalid width or height shows a message in the editor's error region ("Width/height must be a whole number greater than 0") before the field reverts.
- [ ] The field still reverts to its previous valid value, as today.
- [ ] Entering a valid value clears the error as usual.

## Notes
Audit finding F12 (`.ux/audit/2026-09-04.md`).
