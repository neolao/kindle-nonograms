---
status: todo
---
# Prevent Button Size Jump On Press And Centralize Border Width

## Description
Pressed/active buttons (mode toggles, color swatches) jump in size because their border-width changes (1px→3px) with no `box-sizing:border-box` reset (`packages/site/src/sharedStyles.ts:40,43`) — on the app's single most frequent interaction. The swatch's active-state border-width is also still a hardcoded `"3px"`/`"1px"` literal in `packages/client/src/hydratePlayPage.ts:212` instead of the shared `BORDER_WIDTH` token, because the client package can't currently reach `theme.ts`.

## Acceptance Criteria
- [ ] `button,.back-link` (or an equivalent shared rule) uses `box-sizing:border-box` so a border-width change never alters the button's outer box size.
- [ ] Toggling a button's pressed state no longer visibly shifts its size or its siblings' alignment.
- [ ] The border-width values used at runtime (`hydratePlayPage.ts`) come from a single shared source instead of a duplicated literal — e.g. by moving the relevant `BORDER_WIDTH` values into `@kindle-nonograms/shared`, alongside the other tokens already centralized there (see `.ux/decisions/001-frozen-chrome-blocking-reconciliation.md`).

## Notes
Audit finding F21 (`.ux/audit/2026-09-04.md`). The equivalent literal in `packages/site/src/renderPuzzlePage.ts` was already fixed to use `BORDER_WIDTH` tokens during item "frozen default chrome" (F1) — this item covers the remaining client-side runtime literal and the `box-sizing` fix.
