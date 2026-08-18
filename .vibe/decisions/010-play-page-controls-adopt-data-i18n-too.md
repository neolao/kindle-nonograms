---
date: 2026-08-18
status: accepted
---
# Play page toolbar/banner adopt data-i18n too, not just the library page

**Context:** Backlog item 017 introduces a generic client-side i18n mechanism
(cookie persistence, locale resolution, `applyLocale`, a language switcher)
and, per its written description, wires the switcher onto both the library
and puzzle-play pages but only externalizes hardcoded strings into
`data-i18n` on the library page's server-rendered HTML. The puzzle page's
Fill/Cross toggle buttons and win banner are built entirely in client JS
with hardcoded English text, untouched by that description.

**Decision:** Also give the puzzle page's Fill/Cross buttons and win banner
`data-i18n` attributes and translate them via the exact same
`translate()`/`applyLocale()` mechanism, instead of leaving them
permanently English regardless of the switcher's selection.

**Reason:** A UI/UX consult on this item's plan flagged that a visible
language switcher on the puzzle page which retranslates nothing on that
page reads as broken, not "not yet wired" — a user selecting Français and
seeing every visible control stay in English reasonably concludes the
feature is buggy. The fix reuses the same generic `data-i18n` mechanism
already being built for the library page, at negligible extra cost (two
existing translation keys, `play.modeFill`/`play.modeCross`, already exist
for this exact purpose since item 015).

**Rejected alternatives:** Ship item 017 exactly as scoped in its written
description (switcher present but inert on the puzzle page) and accept the
half-translated UX until a later item revisits it — rejected because it
ships a visibly broken-looking control now, with no committed follow-up
item to fix it. Restricting the switcher to the library page only — rejected
because the item's acceptance criteria explicitly require a switcher on the
puzzle page too.
