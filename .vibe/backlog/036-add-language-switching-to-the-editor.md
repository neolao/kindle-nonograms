---
status: todo
---
# Add Language Switching To The Editor

## Description
The editor page (`packages/client/src/hydrateEditorPage.ts`, `packages/site/src/renderEditorPage.ts`) is entirely un-internationalized: it always renders in English regardless of the player's saved locale, and has no language switcher at all — confirmed by loading it right after the library in French. This breaks the app's bilingual promise for the one page a French-speaking contributor is most likely to use deliberately.

## Acceptance Criteria
- [ ] `hydrateEditorPage.ts` applies the resolved locale (saved cookie, else browser language, else English) to every `[data-i18n]` element on the page, same mechanism as the library/puzzle pages.
- [ ] The editor page shows a language switcher, consistent in placement/behavior with the library page's.
- [ ] Switching language on the editor persists the choice (same cookie) and is honored on other pages afterward.
- [ ] Every already-`data-i18n`-tagged element on the editor's default markup (baked by item "frozen default chrome") retranslates correctly.

## Notes
Audit finding F5 (`.ux/audit/2026-09-04.md`) — flagged during discovery as directly important to the product owner. `packages/shared/src/i18n.ts` already has unused keys for several editor strings (`editor.modePaint`, `editor.selectColorAriaLabel`, etc.) ready to use.
