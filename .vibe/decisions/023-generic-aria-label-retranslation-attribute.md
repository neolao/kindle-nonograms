---
date: 2026-09-06
status: accepted
---
# `data-i18n-aria` extends `applyLocale` to retranslate `aria-label`s generically

**Context:** The editor's palette buttons (swatch, color input, remove, add-color) each carry a translated `aria-label`, but `applyLocale()`'s existing `[data-i18n]` mechanism only swaps `textContent`, so these labels never picked up a language switch or a non-default locale resolved at hydration time.

**Decision:** Extend `applyLocale()` (`packages/client/src/i18n.ts`) with a second, parallel attribute convention: an element carrying `data-i18n-aria="<key>"` gets its `aria-label` set from `translate(locale, key)` on every call, exactly like `data-i18n` does for `textContent`.

**Reason:** Keeps the project's one existing rule — "a single generic call re-walks the page and retranslates every tagged element" — intact for this new case instead of adding editor-specific retranslation logic. It requires no DOM rebuild (so it can't disturb keyboard focus mid-edit) and is immediately reusable by any future page that needs a translated `aria-label`.

**Rejected alternatives:** Re-rendering the palette (calling `render()`) on every language switch to regenerate fresh `aria-label`s — rejected because a full rebuild risks dropping a contributor's current focus/selection mid-edit, which `hydrateEditorPage.ts`'s existing "attach, don't rebuild, at hydration time" rule was specifically written to avoid.
