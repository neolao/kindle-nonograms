---
date: 2026-08-18
status: accepted
---
# Visual polish spacing stays off `.grid-wrapper`; back-link ships as static markup sharing the language-switcher's row

**Context:** The design pass adds spacing/borders/an accent color to page chrome (headings, toolbar, library rows, a new back-to-library link) on top of the puzzle page's existing fit-to-viewport grid feature, which measures `document.documentElement.clientWidth`/`clientHeight` directly and caps `.grid-wrapper` to that measurement.

**Decision:** All new spacing (margins, padding, borders) is applied to individual chrome elements (`h1`, `.page-header`, `.play-toolbar`, the win banner, library `ul`/`li`) — never to `body` or `.grid-wrapper` itself, which stay at zero added horizontal margin/padding. The new "back to puzzle list" link is rendered as static server HTML (not JS-inserted like the toolbar/banner) and placed in the same header row as the language switcher, which now appends into that row when present instead of always inserting right after `<h1>`.

**Reason:** The fit-to-viewport measurement reads the full viewport width/height with no knowledge of container padding — any padding added to `body` or an ancestor of `.grid-wrapper` would silently make the grid overflow its computed cap and reintroduce the scrollbar the previous design pass (item 019) eliminated. Keeping `.grid-wrapper` full-bleed sidesteps that entirely. Static markup for the back-link means it works even before hydration runs or with JS disabled (e.g. a puzzle reached via a direct/bookmarked link with no browser history to fall back on); sharing the switcher's row avoids adding a whole extra vertical row above the grid, which would shrink the space `applyGridFit` has to work with on small screens.

**Rejected alternatives:** Wrapping the whole page (including `.grid-wrapper`) in a padded container and switching the fit measurement from viewport size to that container's measured width — rejected as unnecessary risk to a delicate, already-tuned feature for a purely cosmetic goal. A JS-built back-link matching how the toolbar/banner are built — rejected because it wouldn't render before hydration and would leave direct-link visitors without a way back if hydration ever fails.
