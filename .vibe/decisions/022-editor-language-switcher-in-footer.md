---
date: 2026-09-06
status: accepted
---
# Editor's language switcher goes in a page footer, not the header

**Context:** The puzzle editor page had no language switcher at all and never applied a saved/detected locale, unlike the library and puzzle pages.

**Decision:** Add the editor's language switcher inside a new `<footer class="page-footer">`, at the very bottom of the page, reusing the exact same markup-building function and CSS as the library page's own footer switcher.

**Reason:** The backlog item asks for placement "consistent... with the library page's", which already moved its switcher out of the header into a footer (see decision 026 in the backlog, closed). Reusing that exact placement and markup keeps the two switchers visually and behaviorally identical instead of introducing a second, divergent pattern, and avoids reopening the earlier header-vs-footer discussion.

**Rejected alternatives:** Placing it in the editor's existing `.page-header-controls` slot (closer to the audit finding's own suggestion) — rejected because it would make the editor the only page with a header-row switcher, contradicting the "one shared footer pattern" the library page already established and the backlog item explicitly asks to match.
