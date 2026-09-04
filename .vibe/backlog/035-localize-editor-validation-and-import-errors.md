---
status: todo
---
# Localize Editor Validation And Import Errors

## Description
`createPuzzle`'s validation errors (`packages/shared/src/puzzle.ts:29-55`) and image-decode failures (`packages/client/src/decodeImageFile.ts:44-47`, shown via `hydrateEditorPage.ts:579-605`) are raw hardcoded English `Error` messages — some literal browser `DOMException` text — shown verbatim to the contributor. They're dev-toned, can't be localized, and sometimes surface technical noise instead of guidance.

## Acceptance Criteria
- [ ] Every `createPuzzle` validation failure the editor can trigger maps to a translation key with contributor-facing phrasing (e.g. `editor.error.emptyFilename`), not a raw thrown message.
- [ ] A raw/unexpected exception (e.g. a `DOMException` from image decoding) is normalized to a fixed, translated message before display; the original error is not shown to the user.
- [ ] Existing editor validation behavior (what triggers an error, when export is blocked) is unchanged — only the displayed text changes.

## Notes
Audit finding F4 (`.ux/audit/2026-09-04.md`). Related to, but distinct from, item 036 (editor i18n wiring) — this item is specifically about routing these particular error messages through the dictionary.
