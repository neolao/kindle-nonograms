---
date: 2026-09-09
status: accepted
---
# A solved puzzle link's aria-label composes the existing badge translation instead of duplicating it

**Context:** The library page's "Solved" badge is a sibling `<span>` next to the puzzle `<a>`, so the puzzle link's accessible name never mentions solved status. Fixing this means putting a translated "solved" word into the `<a>`'s `aria-label`, revealed at the same moment hydration un-hides the visible badge.
**Decision:** The new `aria-label` is composed at runtime from two pieces: the link's own visible text (name + dimensions, read via `element.textContent`) and the badge's existing translated string (`translate(locale, "library.solvedBadge")`), joined by a new template translation key (`library.solvedPuzzleLinkAriaLabel`, e.g. `"{label}, {status}"`). The generic `data-i18n-aria` retranslation sweep in `packages/client/src/i18n.ts` is extended to substitute both `{label}` and `{status}` tokens (alongside the existing `{number}` one), so a later language switch keeps the composed label correct with no page-specific code.
**Reason:** Two independent translated strings for the same concept ("Solved") would drift the day either wording changes. Reusing the badge's own translation guarantees the spoken status always matches the visible badge text, in both shipped locales, with a single source of truth. Keeping the label as a literal `{label}` prefix followed by status satisfies WCAG 2.5.3 (Label in Name) and matches the visual reading order.
**Rejected alternatives:** A second hardcoded "Solved"/"Résolu" string baked directly into the new translation key — rejected for the drift risk above. Composing the full label server-side at build time — rejected because solved status is only known client-side, after checking `localStorage` against the puzzle's solution.
