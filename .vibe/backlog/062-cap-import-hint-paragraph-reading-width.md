---
status: todo
---
# Cap Import Hint Paragraph Reading Width

## Description
The editor's Import-section hint paragraph has no `max-width` (`renderEditorPage.ts:69,105`; `sharedStyles.ts:38`), rendering as one ~130-character line on a wide desktop viewport — well past a comfortable reading measure, in the editor's actual target context (desktop contributor). See capture `editor-desktop.png`.

## Acceptance Criteria
- [ ] The Import hint paragraph (and similar reading-text paragraphs, if applicable) is capped at roughly 60–70 characters per line on wide viewports.
- [ ] No change on narrow (Kindle-width) viewports, where the line already wraps naturally.

## Notes
Audit finding F31 (`.ux/audit/2026-09-04.md`).
