---
status: todo
---
# Move Import Feedback Next To The Import Controls

## Description
All Import-section feedback (validation errors, "Importing…", failure messages) is written into the single error node that lives in the unrelated "Name and export" panel, two panels away (`renderEditorPage.ts:58-90`; `hydrateEditorPage.ts:533-586`). A contributor who clicks Import and gets it wrong sees no feedback near the button they pressed.

## Acceptance Criteria
- [ ] The Import section has its own inline status/error element next to its own controls.
- [ ] The shared bottom error region is reserved for Export-only feedback (or removed if no longer needed there).
- [ ] All existing import feedback messages (missing file, bad palette size, importing/failure) still appear, just relocated.

## Notes
Audit finding F24 (`.ux/audit/2026-09-04.md`).
