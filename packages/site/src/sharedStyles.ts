import {
  BORDER_RADIUS_PX,
  BORDER_WIDTH,
  COLORS,
  FONT_STACK,
  LABEL_FONT_STACK,
  MIN_TAP_TARGET_PX,
  SPACING_PX,
} from "./theme.js";

/**
 * CSS fragment shared by every generated page: base typography, the page
 * heading, the header row (back-link + language switcher on the puzzle
 * page), button styling (the play toolbar's mode/check buttons and color
 * swatches), the win/check result banner, and the "cabinet" visual system
 * (paper-textured background, a duotone-shadow heading, a decorative dot
 * row, rule-flanked section labels, and the library page's bordered/
 * shadowed wrapping panel) — see
 * .vibe/decisions/013-three-accent-cabinet-reskin.md. Built from `theme.ts`
 * tokens as a literal string, not CSS custom properties — see that
 * module's doc comment for why. No animations or transitions (e-ink
 * constraint): every state change below is a static style swap, and every
 * new decorative rule below is a one-time paint, never a keyframe.
 *
 * Deliberately never adds spacing to `body` itself: the puzzle page's
 * `.grid-wrapper` measures the raw viewport size to fit itself with no
 * scrollbar (see `hydratePlayPage.ts`'s `applyGridFit`), so every element
 * here gets its own margin/padding instead — see
 * .vibe/decisions/011-chrome-padding-excludes-grid-wrapper.md. The paper
 * texture and panel box-shadow below are backgrounds/shadows, not padding
 * or borders on `body`, so they add zero layout footprint and can't affect
 * that measurement.
 */
export function sharedStyles(): string {
  return `
body{font-family:${FONT_STACK};color:${COLORS.text};background:${COLORS.paper} repeating-linear-gradient(0deg,${COLORS.line} 0px,${COLORS.line} 1px,transparent 1px,transparent 28px),${COLORS.paper} repeating-linear-gradient(90deg,${COLORS.line} 0px,${COLORS.line} 1px,transparent 1px,transparent 28px);}
h1{font-family:${LABEL_FONT_STACK};font-size:1.4em;margin:${SPACING_PX.md}px ${SPACING_PX.md}px ${SPACING_PX.sm}px;text-shadow:2px 2px 0 ${COLORS.amberSoft};}
p{margin:${SPACING_PX.sm}px ${SPACING_PX.md}px;}
button,select{font-family:${LABEL_FONT_STACK};}
button,.back-link{border:${BORDER_WIDTH.thin} solid ${COLORS.border};border-radius:${BORDER_RADIUS_PX}px;background:${COLORS.panel};color:${COLORS.text};padding:${SPACING_PX.xs}px ${SPACING_PX.md}px;min-height:${MIN_TAP_TARGET_PX}px;min-width:${MIN_TAP_TARGET_PX}px;box-shadow:0 3px 0 ${COLORS.border};}
button:focus,.back-link:focus{outline:${BORDER_WIDTH.thick} solid ${COLORS.focusOutline};}
button:active,.back-link:active{transform:translateY(2px);box-shadow:0 1px 0 ${COLORS.border};}
button[aria-pressed="true"]{border-width:${BORDER_WIDTH.thick};border-color:${COLORS.amber};background:${COLORS.amberSoft};transform:translateY(2px);box-shadow:0 1px 0 ${COLORS.border};}
.back-link{display:inline-flex;align-items:center;justify-content:center;text-decoration:none;border-color:${COLORS.amber};background:${COLORS.amberSoft};}
.page-header{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:${SPACING_PX.sm}px;margin:${SPACING_PX.sm}px ${SPACING_PX.md}px;}
.page-header h1{flex:1;min-width:0;margin:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;}
.page-header-controls{display:flex;align-items:center;flex-wrap:wrap;gap:${SPACING_PX.sm}px;}
.page-header .language-switcher{margin:0;}
.language-switcher{display:flex;align-items:center;gap:${SPACING_PX.sm}px;margin:${SPACING_PX.sm}px ${SPACING_PX.md}px;}
.language-switcher select{font-family:${FONT_STACK};min-height:${MIN_TAP_TARGET_PX}px;padding:0 ${SPACING_PX.sm}px;border:${BORDER_WIDTH.thin} solid ${COLORS.border};}
.language-switcher select:focus{outline:${BORDER_WIDTH.thick} solid ${COLORS.focusOutline};}
.play-toolbar{display:flex;flex-wrap:wrap;align-items:center;gap:${SPACING_PX.md}px;margin:${SPACING_PX.sm}px ${SPACING_PX.md}px;}
.fill-color-group{display:inline-flex;flex-wrap:wrap;align-items:center;gap:${SPACING_PX.xs}px;padding:${SPACING_PX.xs}px;border:${BORDER_WIDTH.thin} solid ${COLORS.panelEdge};border-radius:${BORDER_RADIUS_PX}px;background:${COLORS.paper};}
.btn-primary,.play-toolbar [data-role="check"]{background:${COLORS.magenta};border-color:${COLORS.magenta};color:${COLORS.panel};}
[data-role="win-banner"]{border:${BORDER_WIDTH.medium} solid ${COLORS.teal};background:${COLORS.tealSoft};color:${COLORS.teal};font-weight:bold;padding:${SPACING_PX.sm}px ${SPACING_PX.md}px;}
[data-role="storage-warning"]:not([hidden]){display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:${SPACING_PX.sm}px;border:${BORDER_WIDTH.medium} solid ${COLORS.amber};background:${COLORS.amberSoft};color:${COLORS.amber};font-weight:bold;padding:${SPACING_PX.sm}px ${SPACING_PX.md}px;}
.dot-row{display:flex;gap:${SPACING_PX.sm}px;margin:${SPACING_PX.md}px ${SPACING_PX.md}px 0;}
.dot-row i{width:6px;height:6px;background:${COLORS.muted};display:inline-block;border-radius:50%;}
.dot-row i:nth-child(3n+1){background:${COLORS.amber};}
.dot-row i:nth-child(3n+2){background:${COLORS.magenta};}
.dot-row i:nth-child(3n){background:${COLORS.teal};}
.section-label{display:flex;align-items:center;gap:${SPACING_PX.sm}px;margin:${SPACING_PX.md}px;color:${COLORS.muted};font-family:${LABEL_FONT_STACK};font-size:0.75em;text-transform:uppercase;letter-spacing:0.15em;}
.section-label::before,.section-label::after{content:"";height:${BORDER_WIDTH.thin};flex:1;background:${COLORS.line};}
.panel{background:${COLORS.panel};border:${BORDER_WIDTH.medium} solid ${COLORS.border};border-radius:${BORDER_RADIUS_PX}px;box-shadow:6px 6px 0 ${COLORS.panelEdge};}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;}
`;
}
