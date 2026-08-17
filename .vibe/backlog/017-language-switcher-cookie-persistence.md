---
status: todo
depends_on: [015]
---
# Language Switcher With Browser Detection And Cookie Persistence

## Description
Add a new module `packages/client/src/i18n.ts`: cookie read/write helpers (`kindle-nonograms-locale`) with silent degradation, in the same spirit as `progressStorage.ts` but for `document.cookie`; a pure, testable `resolveLocale(cookieValue, navigatorLanguage)` (priority: cookie > `navigator.language` > `DEFAULT_LOCALE`); `applyLocale(locale)`, which updates `document.documentElement.lang` and retranslates every element carrying `data-i18n`; and `buildLanguageSwitcher(currentLocale, onChange)`, a `<select>` listing native language names ("English"/"Français"). Externalize the hardcoded strings in `packages/site/src/renderLibraryPage.ts` (title, empty state, "Solved" badge) into `data-i18n` attributes, pre-filled in EN at build time. Wire the switcher into `hydrateLibraryPage.ts` and `hydratePlayPage.ts`, inserted right after each page's `<h1>` — it must run before the empty-library-page early return.

## Acceptance Criteria
- [ ] A FR/EN dropdown is present on both the library page and the puzzle page
- [ ] On first load, the default language follows `navigator.language`, falling back to EN if unsupported
- [ ] Changing the language retranslates the page immediately, with no reload
- [ ] The choice is saved in a cookie and read back on the next load, taking priority over browser detection
- [ ] `resolveLocale` is unit-tested (cookie priority, navigator fallback, default fallback)
- [ ] Also works correctly on the empty library page ("No puzzles are available yet.")

## Notes
Depends on item 015 (translation table). The page `<title>` and the puzzle page's static `lang` attribute are out of scope — the puzzle name itself isn't translatable, an accepted limitation. See the approved plan at `/home/neolao/.claude/plans/ajoute-une-passe-graphique-twinkling-dijkstra.md`.
