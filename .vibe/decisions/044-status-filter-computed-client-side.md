---
date: 2026-09-14
status: accepted
---
# Status filter tagging happens client-side, not server-baked

**Context:** The library page's color filter reads a `data-color-type` attribute baked into each row's markup at build time, since a puzzle's color type is static content. The new solve-status filter (unsolved / in progress / solved) needs an equivalent per-row attribute to filter on.

**Decision:** The status attribute is computed and set during client-side hydration, before the first filter/pagination pass runs, reusing the existing solved/partial-progress detection already used for the solved badge and thumbnail preview.

**Reason:** Solve status depends on the player's own progress, stored in the browser's local storage — it does not exist at static-site build time and cannot be baked server-side the way color type can.

**Rejected alternatives:** Server-baking a placeholder status and patching it client-side was considered and rejected as needless indirection — there is no server-known status value to bake in the first place.
