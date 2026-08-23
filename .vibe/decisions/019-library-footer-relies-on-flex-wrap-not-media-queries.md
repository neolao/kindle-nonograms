---
date: 2026-08-23
status: accepted
---
# Library page footer stacks via flex-wrap, not a media query

**Context:** The new library-page footer (backlog item 026) holds a language switcher plus two links (an in-app editor link and an external GitHub contribution link) and needs to read as two distinct groups on a wide screen while stacking cleanly on a narrow one, since the switcher's native `<select>` renders at a browser-controlled width that can wrap unpredictably next to adjacent links.

**Decision:** The footer is a `display:flex;flex-wrap:wrap` container, same as every other adaptive chrome element already in the site (`.page-header`, `.page-header-controls`, `.library-filters`) — no `@media` breakpoint. The two links are grouped in their own inner flex container with `margin-left:auto`, so they visually separate from the switcher on a wide screen and fall onto their own line(s) on a narrow one purely through wrap, each still growing to its own full-width row via `flex-wrap` on the inner group.

**Reason:** The project has never used a media query anywhere in its stylesheet — every existing adaptive layout already relies on `flex-wrap` alone, and this footer is not different enough to justify becoming the first exception. Verified by rendering the built page at both a wide and a narrow (360px) viewport: the footer degrades to one full-width row per control with no awkward mid-wrap split.

**Rejected alternatives:** An explicit `@media` breakpoint forcing a vertical stack below a fixed width (suggested during plan review) — rejected to keep the one layout technique this project already uses everywhere, and because the flex-wrap-only result, checked visually, already meets the requirement without it.
