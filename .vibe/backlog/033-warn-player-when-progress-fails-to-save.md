---
status: todo
---
# Warn Player When Progress Fails To Save

## Description
`saveProgress` (`packages/client/src/progressStorage.ts:10-19`) swallows every `localStorage` write failure (quota exceeded, private-mode restrictions) silently. A player can fill in an entire puzzle believing it was saved and find it gone on their next visit, with no way to know it happened.

## Acceptance Criteria
- [ ] `saveProgress` reports success/failure back to its caller instead of swallowing every error silently.
- [ ] The first time a save fails during a session, the player sees a one-time, dismissible warning ("Progress can't be saved on this device").
- [ ] The warning doesn't repeat on every subsequent failed save in the same session.
- [ ] Existing successful-save behavior is unchanged.

## Notes
Audit finding F2 (`.ux/audit/2026-09-04.md`). High priority — silent data loss on the app's core action.
