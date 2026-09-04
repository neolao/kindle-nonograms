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
