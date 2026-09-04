---
status: todo
---
# Confirm Successful Puzzle Export

## Description
A successful export in the editor only clears the error field and silently triggers a download (`packages/client/src/hydrateEditorPage.ts:589-607`) — there's no visible confirmation of the terminal action of the whole editor flow, and browser download UI alone can be inconspicuous.

## Acceptance Criteria
- [ ] After a successful export, the page shows a brief confirmation (e.g. "Exported `<filename>.json` — download started.").
- [ ] The confirmation appears in a location consistent with the rest of the editor's feedback conventions.
- [ ] A failed export still shows its existing error message instead of a confirmation.

## Notes
Audit finding F14 (`.ux/audit/2026-09-04.md`).
