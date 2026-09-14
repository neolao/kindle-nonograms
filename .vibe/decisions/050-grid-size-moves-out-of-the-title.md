---
date: 2026-09-14
status: accepted
---
# Library card's grid size moves out of the puzzle title into the stars row, and the thumbnail stretches to full card height

**Context:** [[049-grid-size-decorative-next-to-stars]] put the grid size on
its own `space-between` line, spread away from the stars, still duplicating
the size already spelled out in the puzzle link's own title text. Product
feedback on the shipped result: the size reads as stranded under the
thumbnail rather than paired with the stars, and the duplicate copy in the
title is now pointless since the meta row already shows it.

**Decision:** The puzzle link's visible text drops its "— W × H" suffix
(name only). The grid-size span becomes the sole copy of that fact and is no
longer `aria-hidden`. In the meta row, the size and the stars are grouped as
one adjacent unit (a small `gap`, pushed to one side via `margin-left:auto`)
instead of `justify-content:space-between`. The thumbnail (`.thumb`) drops
its fixed height; `<li>` switches from `align-items:center` to
`align-items:stretch` and wraps the link/badge/meta-row content in a new
`.puzzle-card-body` sibling (carrying the `flex-wrap:wrap` behavior `<li>`
used to have directly), so the thumbnail's unset cross-size stretches to
match that body's full two-line height automatically.

**Reason:** A screen-reader user no longer hears the puzzle's size twice
(once from the title, once from the meta row) — moving it out of the title
instead of hiding the new copy also means the fact survives even if a future
change ever separates the two visually. Grouping size+stars as one unit
matches "next to the stars", not opposite corners of the row. Stretching via
flexbox's own cross-axis alignment needs no measured/computed pixel value
and stays correct at any card height a translation or a long puzzle name
might produce.

**Rejected alternatives:** Keeping the size in the title and marking the new
meta-row copy `aria-hidden` (the original 049 decision) — rejected once the
visual result made the duplication and its layout look accidental rather
than intentional. Giving the thumbnail an explicit taller pixel height
(matching the two-line card's measured height) — rejected, brittle: it would
need updating by hand every time card content (translations, name length)
changes its natural height, where `align-items:stretch` tracks it for free.
