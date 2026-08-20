// Shared entry point bundled for every generated page (see
// .vibe/decisions/007-static-site-build-orchestrator-design.md). Each
// hydration script already self-invokes on import and no-ops harmlessly
// when the markup it expects isn't on the current page, so it's safe to
// load both unconditionally rather than shipping a separate bundle per
// page shape.
import "./hydrateLibraryPage.js";
import "./hydratePlayPage.js";
// Imported last, deliberately: this page's own grid <table> is built by its
// hydrate() call below, only once it finds this page's `editor-page` marker
// — importing it before hydratePlayPage.js would let that freshly-built
// table exist by the time hydratePlayPage's own `document.querySelector
// ("table")` self-detection check runs, wrongly matching the editor page.
import "./hydrateEditorPage.js";
