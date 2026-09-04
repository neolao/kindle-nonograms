---
status: todo
---
# Announce External Links Open In A New Tab

## Description
The "Contribute a puzzle on GitHub" library footer link's "opens in new tab" arrow is `aria-hidden` (`renderLibraryPage.ts:119`), with no text equivalent exposed to assistive tech.

## Acceptance Criteria
- [ ] The GitHub contribution link has visually-hidden text stating it opens in a new tab (same `.sr-only` pattern already used for the back-link).
- [ ] The visible arrow glyph is unchanged.

## Notes
Audit finding F26 (`.ux/audit/2026-09-04.md`).
