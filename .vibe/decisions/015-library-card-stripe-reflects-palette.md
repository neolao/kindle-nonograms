---
date: 2026-08-19
status: accepted
---
# Library card top stripe reflects the puzzle's own palette

**Context:** The library card's 6px top stripe cycled decoratively through the three cabinet accent colors by list position, carrying no meaning (see `.vibe/decisions/013-three-accent-cabinet-reskin.md`). It now needs to reflect the puzzle's own color palette instead.

**Decision:** A monochrome puzzle (1-color palette) always shows a literal solid black stripe, regardless of what that single palette color actually is. A multi-color puzzle shows its stripe split into equal-width hard-stop segments, one per palette color, in palette order, painted via a per-card `background-image: linear-gradient(...)` (border-top kept transparent but still 6px wide, so card layout is unaffected). Each palette hex is validated against a strict `#rgb`/`#rrggbb`/`#rrggbbaa` pattern before being interpolated into the generated `<style>` block; a value that doesn't match falls back to black for that segment instead of being emitted as-is.

**Reason:** The literal-black rule for monochrome is the explicit acceptance criterion from the backlog item, not an oversight — it keeps the common (single-color) case visually simple and matches how monochrome puzzles are conventionally treated elsewhere in the app. The hex validation closes a CSS-injection surface this change newly introduces: unlike the existing puzzle-grid clue-color interpolation (a single, already-curated puzzle rendered as trusted app content), the library page interpolates every listed puzzle's palette into one shared `<style>` block per page.

**Rejected alternatives:** Using the puzzle's actual single palette color for the monochrome case (closer to "always data-driven") was considered — rejected because it contradicts the backlog item's explicit, deliberate acceptance criterion.
