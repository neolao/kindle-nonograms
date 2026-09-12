---
status: todo
---
# Replace Color Filter With Toggle Buttons

## Description
The library's color filter is currently a `<select>` dropdown (mono/multi/all). Dropdowns are hard to use in Kindle's browser, so replace it with two directly-tappable toggle buttons: "Mono-color" and "Multi-color".

## Acceptance Criteria
- [ ] Library page shows a "Mono-color" button and a "Multi-color" button instead of the color filter `<select>`.
- [ ] Tapping "Mono-color" shows only monochrome puzzles; tapping "Multi-color" shows only multi-color puzzles.
- [ ] Tapping the currently active button again deselects it and shows puzzles of every color type (equivalent to today's "all" option); only one of the two buttons can be active at a time.
- [ ] The active button visually indicates its pressed state (e.g. `aria-pressed`), and the "no results" message still shows when a color selection matches zero puzzles.

## Notes
Affects `packages/site/src/renderLibraryPage.ts` (drop `COLOR_FILTER_OPTIONS`/the color `<select>`, add two buttons), `packages/client/src/hydrateLibraryPage.ts` (button click handlers instead of a `change` listener), and `packages/shared/src/i18n.ts` (`library.filterColorLabel`/`filterColorAll`/`filterColorMono`/`filterColorMulti` keys — reuse the mono/multi copy for button labels, drop the "all"/label-only keys no longer needed). Update `renderLibraryPage.test.ts` and `hydrateLibraryPage.test.ts` accordingly. Independent of backlog item 066 (removing the size filter) — both touch `.library-filters` but can be implemented in either order; worth a quick check for merge overlap if done close together.
