// Shared entry point bundled for every generated page (see
// .vibe/decisions/007-static-site-build-orchestrator-design.md). Each
// hydration script already self-invokes on import and no-ops harmlessly
// when the markup it expects isn't on the current page, so it's safe to
// load both unconditionally rather than shipping a separate bundle per
// page shape.
import "./hydrateLibraryPage.js";
import "./hydratePlayPage.js";
