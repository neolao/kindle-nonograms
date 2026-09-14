---
date: 2026-09-14
status: accepted
---
# Generic `button:disabled` rule replaces the pagination-specific one

**Context:** The editor's disabled "remove color" (×) button had no authored disabled styling and could look identical to a clickable button. The only prior art was a page-specific rule, `.library-pagination button:disabled{color:muted;border-color:muted;box-shadow:none;}`, scoped to the library page only.

**Decision:** Add one generic `button:disabled{opacity:0.5;box-shadow:none;}` rule to `sharedStyles.ts` so every button on every page (library, puzzle, editor) gets the same non-interactive treatment, and remove the now-redundant `.library-pagination button:disabled` rule. This changes the pagination buttons' shipped look from solid muted-gray to translucent.

**Reason:** The audit finding behind this backlog item (F32) explicitly prescribes "reduced opacity, no box-shadow" as the fix, and the acceptance criteria ask for one rule applying "across the app" rather than a second page-scoped exception. Opacity is accent-agnostic (works the same against amber/magenta/teal accents and against a color swatch's own background) where a fixed muted color/border only reads correctly on a plain panel background. Consolidating avoids a second, slightly different disabled treatment living on only one page.

**Rejected alternatives:** Keeping `.library-pagination button:disabled` untouched and adding a second, separate generic rule for every other button — rejected because it leaves two different disabled treatments in the app with no reason for the difference, contradicting the acceptance criterion that the rule should be the one already used for pagination, generalized.
