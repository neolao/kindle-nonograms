---
status: todo
---
# Add A Timeout To Editor Image Import

## Description
Image import in the editor has no timeout (`packages/client/src/hydrateEditorPage.ts:529-587`, `decodeImageFile.ts:16-60`) — if the browser's `<img>` element never fires `onload`/`onerror`, the import controls stay disabled indefinitely with no cancel or retry short of reloading the page.

## Acceptance Criteria
- [ ] The image decode is raced against a timeout (e.g. 15 seconds); on timeout, a clear error message is shown ("This image took too long to load").
- [ ] The import controls are always re-enabled after a timeout, exactly as after any other decode failure.
- [ ] A normal, fast import is unaffected.

## Notes
Audit finding F13 (`.ux/audit/2026-09-04.md`).
