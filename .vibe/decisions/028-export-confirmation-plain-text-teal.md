---
date: 2026-09-08
status: accepted
---
# Export confirmation reuses the plain error-text idiom, styled teal

**Context:** A successful export in the puzzle editor had no visible on-page confirmation, only a silent browser download. Backlog item 045 asked for a brief confirmation next to the editor's existing feedback.

**Decision:** Add a second reserved, always-present, `aria-live="polite"` region (`.editor-confirmation`) right next to the existing `.editor-error` region, styled as plain inline text (no border, no background) in the app's `teal` accent — the color already fixed to the "completed/success" role by the three-accent cabinet system — prefixed with a fixed "✓" glyph, mirroring the error region's own fixed "⚠" glyph. Only the export handler ever writes to it, clearing it at the start of every export attempt.

**Reason:** Both a UX and a visual-design review agreed plain text matches the weight of its sibling `.editor-error` inside the same tight form panel, and reuses the color system's existing "completed" role instead of inventing a new one; a boxed/soft-background treatment (like the play page's win banner) would create an unjustified two-tier visual language between two sibling messages that report on the same action.

**Rejected alternatives:** A bordered, soft-background banner matching the play page's win-banner style — rejected as disproportionate for a small form-panel message and inconsistent with its plain-text error sibling right next to it.
