---
date: 2026-09-08
status: superseded by 033
---
# Clue-number contrast fix ships without waiting on broader hex-format support

**Context:** Multi-color clue-run numbers render in the puzzle's raw palette hex directly on white with no contrast safeguard (backlog item 048); a related backlog item 049 would teach the existing `contrastingTextColor` helper to accept 3-digit and 8-digit hex, not just strict 6-digit.

**Decision:** Fix 048 now with a new pure function in `contrastColor.ts` (`readableRunColor`) that reuses the module's existing WCAG luminance/contrast-ratio helpers, without waiting on item 049. Every palette color actually produced by this codebase — the editor's `<input type="color">`, the image-quantizer's `rgbToHex`, and every hand-authored puzzle JSON file — is already strict 6-digit `#rrggbb`, the exact format the existing `HEX_COLOR_PATTERN` accepts, so item 049's broader format support has no effect on this code path today.

**Reason:** Confirmed by inspecting every palette producer in the codebase (`packages/client/src/imageQuantize.ts`, `packages/site/src/renderEditorPage.ts`, `data/puzzles/*.json`) before deciding: none emit shorthand or alpha hex. A malformed/unexpected color still degrades safely to black text, same spirit as the existing helper. Blocking 048 on 049 would delay a legibility fix for a format gap that cannot currently occur.

**Rejected alternatives:** Waiting for item 049 first — rejected as an unnecessary sequencing dependency given the confirmed input format. Reusing `contrastingTextColor` as-is — rejected because it answers a different question (best of black/white *as background*) than the one this code needs (is the palette hex itself legible *as foreground text* on white, and if not, fall back to black).
