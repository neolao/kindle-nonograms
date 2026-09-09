/**
 * Default UI state shared by the static-site generator (`packages/site`,
 * which bakes each page's default chrome into its build-time HTML) and the
 * client hydration bundle (`packages/client`, which builds that same
 * default at runtime for any state change after first paint). Kept in one
 * place so the two can never silently disagree on what "default" means —
 * see `.ux/decisions/001-frozen-chrome-blocking-reconciliation.md`.
 */

/** Puzzle rows shown per library page before pagination controls appear. */
export const LIBRARY_PAGE_SIZE = 25;

/** The play page's paint tool, active by default on every fresh visit. */
export const PLAY_DEFAULT_MODE = "fill";

/** The play page's active palette color index, active by default on every fresh visit. */
export const PLAY_DEFAULT_ACTIVE_COLOR_INDEX = 0;

/** The editor's starting grid width — never persisted across visits. */
export const EDITOR_DEFAULT_WIDTH = 5;

/** The editor's starting grid height — never persisted across visits. */
export const EDITOR_DEFAULT_HEIGHT = 5;

/** The editor's starting palette — never persisted across visits. */
export const EDITOR_DEFAULT_PALETTE: readonly string[] = ["#000000"];

/** The editor's starting paint tool — never persisted across visits. */
export const EDITOR_DEFAULT_MODE = "paint";

/**
 * Border widths in px (not `em`), so they stay crisp regardless of the grid
 * wrapper's own font-size-driven scaling. Exactly the three weights already
 * used across the app — a base grid line, the 5-cell group divider, and a
 * pressed/active-state outline. Lives here, alongside the rest of this
 * file's cross-package defaults, for the same reason: `site`'s build-time
 * render (a color swatch's default `border-width`) and `client`'s runtime
 * toggle of that same property (`hydratePlayPage.ts`, when the active color
 * changes) must always read the identical value, never a second literal
 * duplicated at the runtime call site — see backlog item 052.
 */
export const BORDER_WIDTH = {
  thin: "1px",
  medium: "2px",
  thick: "3px",
} as const;
