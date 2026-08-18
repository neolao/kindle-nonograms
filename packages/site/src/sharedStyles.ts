import {
  BORDER_WIDTH,
  COLORS,
  FONT_STACK,
  MIN_TAP_TARGET_PX,
  SPACING_PX,
} from "./theme.js";

/**
 * CSS fragment shared by every generated page: base typography, the page
 * heading, the header row (back-link + language switcher on the puzzle
 * page), button styling (the play toolbar's mode/check buttons and color
 * swatches), and the win/check result banner. Built from `theme.ts` tokens
 * as a literal string, not CSS custom properties — see that module's doc
 * comment for why. No animations or transitions (e-ink constraint): every
 * state change below is a static style swap.
 *
 * Deliberately never adds spacing to `body` itself: the puzzle page's
 * `.grid-wrapper` measures the raw viewport size to fit itself with no
 * scrollbar (see `hydratePlayPage.ts`'s `applyGridFit`), so every element
 * here gets its own margin/padding instead — see
 * .vibe/decisions/011-chrome-padding-excludes-grid-wrapper.md.
 */
export function sharedStyles(): string {
  return `
body{font-family:${FONT_STACK};color:${COLORS.text};}
h1{font-size:1.4em;margin:${SPACING_PX.md}px ${SPACING_PX.md}px ${SPACING_PX.sm}px;}
p{margin:${SPACING_PX.sm}px ${SPACING_PX.md}px;}
button,select{font-family:${FONT_STACK};}
button,.back-link{border:${BORDER_WIDTH.thin} solid ${COLORS.border};background:#fff;color:${COLORS.text};padding:${SPACING_PX.xs}px ${SPACING_PX.md}px;min-height:${MIN_TAP_TARGET_PX}px;min-width:${MIN_TAP_TARGET_PX}px;}
button:focus,.back-link:focus{outline:${BORDER_WIDTH.thick} solid ${COLORS.focusOutline};}
button[aria-pressed="true"]{border-width:${BORDER_WIDTH.thick};}
.back-link{display:inline-flex;align-items:center;justify-content:center;text-decoration:none;border-color:${COLORS.accent};background:${COLORS.accentBg};}
.page-header{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:${SPACING_PX.sm}px;margin:${SPACING_PX.sm}px ${SPACING_PX.md}px;}
.page-header .language-switcher{margin:0;}
.language-switcher{display:flex;align-items:center;gap:${SPACING_PX.sm}px;margin:${SPACING_PX.sm}px ${SPACING_PX.md}px;}
.language-switcher select{font-family:${FONT_STACK};min-height:${MIN_TAP_TARGET_PX}px;padding:0 ${SPACING_PX.sm}px;border:${BORDER_WIDTH.thin} solid ${COLORS.border};}
.language-switcher select:focus{outline:${BORDER_WIDTH.thick} solid ${COLORS.focusOutline};}
.play-toolbar{display:flex;flex-wrap:wrap;align-items:center;gap:${SPACING_PX.md}px;margin:${SPACING_PX.sm}px ${SPACING_PX.md}px;}
[data-role="win-banner"]{border:${BORDER_WIDTH.medium} solid ${COLORS.accent};background:${COLORS.accentBg};font-weight:bold;padding:${SPACING_PX.sm}px ${SPACING_PX.md}px;}
`;
}
