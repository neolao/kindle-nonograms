---
status: todo
---
# Fix Win Banner Announcement Timing For Screen Readers

## Description
The win/check banner's `aria-live="polite"` text is set while the element is still `hidden` (`packages/client/src/hydratePlayPage.ts:144-148,340-403`) — some assistive tech only announces content that changes after the element is already rendered, so the announcement can be silently missed.

## Acceptance Criteria
- [ ] The banner's `hidden` attribute is cleared before its text content is set/changed, for both the automatic (tap-completes-puzzle) and manual (Check button) paths.
- [ ] The banner's visible behavior (when it shows/hides, its text) is otherwise unchanged.

## Notes
Audit finding F30 (`.ux/audit/2026-09-04.md`). Also applies to the "already solved on load" pre-paint-correction path added by item "frozen default chrome" — verify that path still announces correctly (it likely already does, since it sets both together at hydration start).
