---
status: todo
---
# Remove Library Size Filter

## Description
The library page currently offers two filters: puzzle size (small/medium/large/all) and color type (monochrome/multi-color/all), added together in item 021. The size filter is no longer wanted — remove it and keep only the color filter.

## Acceptance Criteria
- [ ] Library page no longer renders a size filter control (the small/medium/large/all select).
- [ ] The color filter (monochrome/multi-color/all) still works on its own, unaffected by the removal.
- [ ] The "no results" message still shows correctly when the color filter alone matches zero puzzles.
- [ ] No dead code remains: size-filter markup, hydration logic, `data-size-bucket` tagging, and the related `library.filterSize*` translation keys are all removed, and their tests are updated or removed accordingly.

## Notes
Affects `packages/site/src/renderLibraryPage.ts` (size filter select + `data-size-bucket` row tagging), `packages/client/src/hydrateLibraryPage.ts` (size filter wiring), and `packages/shared/src/i18n.ts` (`library.filterSizeLabel`/`filterSizeAll`/`filterSizeSmall`/`filterSizeMedium`/`filterSizeLarge` keys). Update the corresponding tests in `renderLibraryPage.test.ts` and `hydrateLibraryPage.test.ts` (several assert on `sizeFilterSelect()` and the AND-combination of both filters). Supersedes part of backlog item 021 (already done).
