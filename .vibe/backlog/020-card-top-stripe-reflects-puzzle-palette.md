---
status: todo
---
# Card Top Stripe Reflects Puzzle Palette

## Description
The library card's 6px top stripe currently cycles decoratively through the three accent colors (amber, magenta, teal, text) based on the card's position in the list (see `.vibe/decisions/013-three-accent-cabinet-reskin.md`), carrying no meaning. Instead, the stripe should reflect the puzzle's own color palette: solid black for a monochrome puzzle, and all of the puzzle's colors when it has more than one.

## Acceptance Criteria
- [ ] A puzzle with a single-color palette (monochrome) shows a solid black top stripe on its library card.
- [ ] A puzzle with a multi-color palette (e.g. the 4-color demo puzzle) shows its top stripe split into segments, one per palette color, in palette order.
- [ ] The stripe no longer cycles through decorative accent colors based on the card's position in the list (the `li:nth-child(4n+…)` rule in `renderLibraryPage.ts` is removed).
- [ ] Existing card layout (border, radius, shadow, thumbnail, solved badge) is otherwise unchanged.

## Notes
Each puzzle's `palette` array is already available server-side when rendering the library page (`renderLibraryItem` in `packages/site/src/renderLibraryPage.ts`), so the stripe can be generated per-card without needing client-side hydration. Since a plain CSS `border-top-color` can only show one color, showing multiple palette colors likely requires a `background` (e.g. `linear-gradient` with hard color stops) on the stripe area instead of a border-color trick — left as an implementation detail. Decision doc `.vibe/decisions/013-three-accent-cabinet-reskin.md` explicitly documented the current stripe as "decorative-only... carries no meaning" — this item supersedes that for the stripe (the marquee dot row's own cycling is unaffected).
