---
date: 2026-09-14
status: superseded by 050
---
# Library card's grid-size text is decorative, wrapped with the stars in one row

**Context:** The library card's difficulty stars sit on their own full-width
line below the puzzle link. The brief asks to show the grid size (e.g. "16 ×
16") in small text to the left of those stars, now that the taller card and a
bigger thumbnail have room for it.

**Decision:** The grid size and the star row are wrapped together in one new
flex container (space-between) that is itself the `<li>`'s direct child with
`flex-basis:100%`, so the pair still forces its own line exactly as the stars
did alone. The grid-size text is `aria-hidden="true"`.

**Reason:** The puzzle link's own visible text already reads "Name — W × H"
to assistive tech (only CSS ellipsis clips it visually, not the accessible
name), so a second, unhidden copy would be announced twice for the same
fact. The wrapper keeps the stars' own "not nested inside the link's
truncating text" property (why the badge was a sibling in the first place)
while letting the two share one line without re-deriving custom alignment
CSS on each side.

**Rejected alternatives:** Giving the grid-size span its own `flex-basis:100%`
line — rejected, it would force a third row instead of sharing the stars'
row. Making the size text the accessible source and hiding the link's
existing "— W × H" suffix instead — rejected as a larger, unrelated change to
the link's accessible name for the same visual outcome.
