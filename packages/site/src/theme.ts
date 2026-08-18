/**
 * Shared visual design tokens, consumed by `sharedStyles.ts` and the page
 * renderers as plain TS constants interpolated into literal CSS strings at
 * build time — not CSS custom properties (`var()`), whose support on
 * Kindle's old WebKit browser is uncertain. Same pattern already proven by
 * the palette-driven `.run-cN` classes in `renderPuzzlePage.ts`.
 */

/** A conservative font stack, widely available without a web font fetch. */
export const FONT_STACK = '"Helvetica Neue", Helvetica, Arial, sans-serif';

/**
 * A mostly-grayscale color set: the puzzle grid already spends this app's
 * color budget on palette swatches and clue-run colors, so the surrounding
 * chrome (text, borders, focus ring) deliberately stays grayscale instead
 * of introducing a competing "brand" accent.
 */
export const COLORS = {
  text: "#111111",
  muted: "#555555",
  border: "#000000",
  focusOutline: "#000000",
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
