---
status: done
depends_on: [022]
---
# Language Switcher and Contribution Footer

## Description
The language switcher currently appears on both the library (listing) page and the puzzle (play) page, right after each page's heading. Restrict it to the library page only, and move it out of the header area into a new footer shared by that page, alongside a link to the project's GitHub repository explaining how to contribute a puzzle.

## Acceptance Criteria
- [x] The puzzle/play page no longer renders a language switcher — `setUpLanguageSwitcher` in `packages/client/src/hydratePlayPage.ts` no longer inserts the FR/EN select there.
- [x] The library page renders a new footer element containing the language switcher (moved out of its current position right after the heading) and a link to the project's GitHub repository explaining how to contribute a puzzle.
- [x] Changing the language from the footer switcher still persists the choice via the locale cookie and updates the page's translated text, exactly as it does today.
- [x] The puzzle page still applies a previously saved locale cookie to its own translated text (toolbar/banner labels) even without a switcher control present — removing the switcher only removes the ability to change the language from that page, not locale application itself.

## Notes
Builds on the existing i18n implementation from [[017-language-switcher-cookie-persistence]] and [[015-shared-translation-table-i18n]]: `buildLanguageSwitcher`/`applyLocale`/`readLocaleCookie`/`writeLocaleCookie`/`resolveLocale` in `packages/client/src/i18n.ts`, wired up by `setUpLanguageSwitcher` in both `packages/client/src/hydrateLibraryPage.ts` and `packages/client/src/hydratePlayPage.ts`, with the `.language-switcher` styling in `packages/site/src/sharedStyles.ts`. This item removes the puzzle-page call site and adds a new footer container (new style block, e.g. `.page-footer`) around the library page's switcher plus the contribution link. Depends on [[022-contributing-guide-for-puzzle-submissions]] so the footer's GitHub link can point at the actual `CONTRIBUTING.md` it introduces, rather than a bare repo URL. Per CLAUDE.md's Kindle browser constraints, keep the footer static and simple — no animation, e-ink-friendly tap targets.
