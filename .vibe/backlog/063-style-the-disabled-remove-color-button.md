---
status: todo
---
# Style The Disabled Remove-Color Button

## Description
The disabled "remove color" (×) button in the editor palette (shown when only one palette color remains, `hydrateEditorPage.ts:253-274`) has no authored disabled styling, so it can look identical to a clickable button — no matching rule exists in `sharedStyles.ts`.

## Acceptance Criteria
- [ ] A generic `button:disabled` rule (reduced opacity, no box-shadow) applies across the app, matching the one already used for pagination buttons.
- [ ] The disabled remove-color button visibly reads as non-interactive.
- [ ] No unintended visual change to any other, currently-enabled button.

## Notes
Audit finding F32 (`.ux/audit/2026-09-04.md`).
