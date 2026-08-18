import {
  BORDER_WIDTH,
  COLORS,
  FONT_STACK,
  MIN_TAP_TARGET_PX,
  SPACING_PX,
} from "./theme.js";

/**
 * CSS fragment shared by every generated page: base typography, the
 * language switcher, and button styling (the play toolbar's mode/check
 * buttons and color swatches). Built from `theme.ts` tokens as a literal
 * string, not CSS custom properties — see that module's doc comment for
 * why. No animations or transitions (e-ink constraint): every state change
 * below is a static style swap.
 */
export function sharedStyles(): string {
  return `
body{font-family:${FONT_STACK};color:${COLORS.text};}
button,select{font-family:${FONT_STACK};}
button{border:${BORDER_WIDTH.thin} solid ${COLORS.border};background:#fff;color:${COLORS.text};padding:${SPACING_PX.xs}px ${SPACING_PX.md}px;min-height:${MIN_TAP_TARGET_PX}px;min-width:${MIN_TAP_TARGET_PX}px;}
button:focus{outline:${BORDER_WIDTH.thick} solid ${COLORS.focusOutline};}
button[aria-pressed="true"]{border-width:${BORDER_WIDTH.thick};}
.language-switcher{display:flex;align-items:center;gap:${SPACING_PX.sm}px;margin:${SPACING_PX.sm}px 0;}
.language-switcher select{font-family:${FONT_STACK};min-height:${MIN_TAP_TARGET_PX}px;padding:0 ${SPACING_PX.sm}px;border:${BORDER_WIDTH.thin} solid ${COLORS.border};}
.language-switcher select:focus{outline:${BORDER_WIDTH.thick} solid ${COLORS.focusOutline};}
`;
}
