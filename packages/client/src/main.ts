// Shared entry point bundled for every generated page (see
// .vibe/decisions/007-static-site-build-orchestrator-design.md). Each
// hydration script already self-invokes on import and no-ops harmlessly
// when the markup it expects isn't on the current page, so it's safe to
// load all three unconditionally rather than shipping a separate bundle per
// page shape. Import order no longer matters for self-detection: the editor
// page's canvas now renders a real `<table>` statically (see
// `.ux/decisions/001-frozen-chrome-blocking-reconciliation.md`), so a bare
// `<table>` stopped being a safe marker — hydratePlayPage.ts now detects
// its own page via the embedded `#puzzle-data` script instead, which the
// editor page never has.
//
// Each module's own self-invocation also wraps its `hydrate()` call in a
// try/catch (see backlog item 041): an uncaught error thrown while one
// module hydrates would otherwise halt this shared bundle's remaining
// synchronous top-level execution — a static `import` declaration can't be
// wrapped in try/catch here, so each module guards its own call instead —
// and stop the other two modules below from ever getting imported at all.
import "./hydrateLibraryPage.js";
import "./hydratePlayPage.js";
import "./hydrateEditorPage.js";
