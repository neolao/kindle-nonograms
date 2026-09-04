---
status: todo
---
# Set Correct HTML Lang Before Hydration

## Description
The server-rendered HTML always declares `<html lang="en">` (`renderLibraryPage.ts:103`, `renderPuzzlePage.ts:41`); only client-side `applyLocale()` (`packages/client/src/i18n.ts:87`) corrects `document.documentElement.lang` after hydration runs. Any view before/without JS (crawlers, some assistive tech, view-source) sees English tagged on possibly-French content.

## Acceptance Criteria
- [ ] The page's `lang` attribute reflects the visitor's resolved locale (from the saved cookie) as early as possible — before the main hydration bundle finishes retranslating the rest of the page.
- [ ] A visitor with no saved locale still sees a sensible default (`lang="en"`).
- [ ] No regression to the existing `applyLocale`-driven retranslation of page content.

## Notes
Audit finding F7 (`.ux/audit/2026-09-04.md`). Likely needs a small inline script in the page `<head>`, ahead of the main bundle — the static site generator can't know the visitor's locale at build time.
