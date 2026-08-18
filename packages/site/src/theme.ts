/**
 * Shared visual design tokens, consumed by `sharedStyles.ts` and the page
 * renderers as plain TS constants interpolated into literal CSS strings at
 * build time — not CSS custom properties (`var()`), whose support on
 * Kindle's old WebKit browser is uncertain. Same pattern already proven by
 * the palette-driven `.run-cN` classes in `renderPuzzlePage.ts`.
 */

/** A conservative body-text font stack, widely available without a web font fetch. */
export const FONT_STACK = '"Helvetica Neue", Helvetica, Arial, sans-serif';

/**
 * A second, monospace stack layered on top of `FONT_STACK` for headings,
 * button/badge labels and section labels only — never body copy or fine
 * print, where its tighter rendering hurts legibility at Kindle's small
 * sizes. A system stack, same "no web font fetch" reasoning as `FONT_STACK`.
 */
export const LABEL_FONT_STACK =
  'ui-monospace, "Cascadia Code", "SF Mono", Consolas, "Liberation Mono", monospace';

/**
 * The site's "cabinet" color system (see
 * .vibe/decisions/013-three-accent-cabinet-reskin.md): a light paper/panel
 * neutral pair plus three accents, each with one fixed, reused role so the
 * palette reads as a deliberate system rather than decoration for its own
 * sake — `amber` for navigating away / an active toggle state, `magenta`
 * for the primary in-puzzle action, `teal` for "completed" (shared by the
 * win message and the library's solved stamp, so the two visibly connect).
 * Library row stripes and the marquee dot row also cycle through all three,
 * but purely as decorative rhythm — that cycling carries no meaning.
 * Deliberately never applied to the puzzle grid's own rendering (clue
 * borders, cell/palette colors): the grid stays the calmest, most legible
 * element on the page, never competing with its own chrome.
 */
export const COLORS = {
  text: "#111111",
  muted: "#555555",
  border: "#000000",
  focusOutline: "#000000",
  paper: "#f5f2fb",
  panel: "#ffffff",
  panelEdge: "#ddd4ef",
  line: "#e4dcf3",
  amber: "#a85f00",
  amberSoft: "#f2dcb8",
  magenta: "#b0165c",
  magentaSoft: "#f6d8e6",
  teal: "#0b7a68",
  tealSoft: "#d3ede7",
} as const;

/**
 * Border widths in px (not `em`), so they stay crisp regardless of the
 * grid wrapper's own font-size-driven scaling. Exactly the three weights
 * already used across the app — a base grid line, the 5-cell group
 * divider, and a pressed/active-state outline.
 */
export const BORDER_WIDTH = {
  thin: "1px",
  medium: "2px",
  thick: "3px",
} as const;

/**
 * Coarse spacing scale (px) for toolbar/switcher chrome — deliberately a
 * separate axis from the grid's own `em`-based micro-spacing, so scaling
 * the grid wrapper's font-size for the fit-to-viewport feature never
 * resizes this chrome as a side effect.
 */
export const SPACING_PX = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
} as const;

/** Minimum touch target size (px) for buttons and the language selector. */
export const MIN_TAP_TARGET_PX = 44;

/**
 * Corner radius (px) for the cabinet system's panels, cards, buttons and
 * badges — a purely decorative render property (never affects box size or
 * layout measurement), so it's safe even on elements the grid-fit
 * calculation cares about (e.g. the puzzle grid's own frame).
 */
export const BORDER_RADIUS_PX = 4;
