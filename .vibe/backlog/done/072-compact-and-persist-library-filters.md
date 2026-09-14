---
status: done
---
# Compact And Persist Library Filters

## Description
The library page's filter row (color toggle buttons, sort-by-recent button) takes up too much space on Kindle's narrow viewport. Redesign it to be more compact, add a useful new filter (puzzle solve status: unsolved / in progress / solved — already derivable client-side from saved progress), and remember the player's last-chosen filter/sort selection across visits via a cookie, the same way the locale switcher already does (see `packages/client/src/i18n.ts`'s `readLocaleCookie`/`writeLocaleCookie`).

## Acceptance Criteria
- [ ] The number and size of always-visible filter/sort controls above the puzzle list is reduced compared to today (shorter labels, icons, or grouping), with secondary controls (e.g. sort-by-recent, the new status filter) allowed to live after the puzzle list instead of only above it.
- [ ] A new status filter (unsolved / in progress / solved) is available, combining with the existing color filter and sort-by-recent exactly like the color filter combines with pagination today (AND, not OR).
- [ ] Selecting any filter or sort option persists the player's current selection to a cookie; reloading the library page restores that exact selection automatically, without the player reselecting it.
- [ ] With no cookie present (first visit, or cookies cleared), the library page falls back to today's defaults (all colors, all statuses, default order) with no errors.

## Notes
Affects `packages/site/src/renderLibraryPage.ts` (filter/sort markup and layout), `packages/client/src/hydrateLibraryPage.ts` (filter wiring, status derivation already available via `isSolved`/`partialProgressCells`, new cookie read/write), and `packages/shared/src/i18n.ts` (new translation keys for the status filter). Exact compact layout (icons, shortened labels, a collapsed "more filters" affordance, controls moved below the list, or a combination) is left to implementation — the constraint is Kindle's old WebKit browser and small screen, so no reliance on recent CSS/JS features and no added visual clutter. The color filter was previously moved from a `<select>` to toggle buttons specifically because dropdowns are hard to use on Kindle (see `done/067-replace-color-filter-with-toggle-buttons.md`) — keep any new status filter control equally tap-friendly, not a dropdown. A puzzle size filter was deliberately removed in `done/066-remove-library-size-filter.md`; do not reintroduce it as one of the "other useful filters".
