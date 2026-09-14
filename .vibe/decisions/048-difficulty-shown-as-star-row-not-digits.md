---
date: 2026-09-14
status: accepted
---
# Difficulty shown as a 5-star row, not visible digits
**Context:** Deciding how to surface the new 1-10 difficulty score in the library, the play page, and the editor's solvability confirmation.
**Decision:** The score is displayed as 5 star glyphs (filled vs. outline, 2 points per star so no half-star is ever needed) with no visible text, identically in all three places; the full "Difficulty N/10" wording is still present as screen-reader-only text right next to the stars, the same aria-hidden-icon-plus-`.sr-only`-label pattern already used by every other icon in the app.
**Reason:** A compact, purely visual rating reads faster than digits at a glance and was the Product Owner's explicit preference; keeping a hidden text equivalent preserves the same accessibility guarantee every other icon-only control in the app already has, at no visual cost.
**Rejected alternatives:** Plain digit text ("Difficulty 6/10"), the originally planned option — rejected once the Product Owner asked for a wordless visual instead. A 10-star row matching the raw 1-10 score one-for-one (rejected: too much repeated glyph clutter at the library's compact row height, and doubles the already-accepted risk of the two new star glyphs not rendering on Kindle's older browser for no legibility benefit over 5).
