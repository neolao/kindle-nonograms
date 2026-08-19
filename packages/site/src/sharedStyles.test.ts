import { describe, expect, it } from "vitest";
import { sharedStyles } from "./sharedStyles.js";

describe("sharedStyles", () => {
  it("sets the shared conservative font stack on body, buttons and selects", () => {
    const css = sharedStyles();

    expect(css).toContain(
      'font-family:"Helvetica Neue", Helvetica, Arial, sans-serif',
    );
  });

  it("gives buttons and the language switcher select a 44px minimum tap target", () => {
    const css = sharedStyles();

    expect(css).toMatch(/button,\s*\.back-link\{[^}]*min-height:44px/);
    expect(css).toMatch(/\.language-switcher select\{[^}]*min-height:44px/);
  });

  it("gives a pressed/active button a visibly thicker border, not a color-only cue", () => {
    const css = sharedStyles();

    expect(css).toMatch(/button\[aria-pressed="true"\]\{[^}]*border-width:3px/);
  });

  it("gives a focused button and select a visible, non-color-only outline", () => {
    const css = sharedStyles();

    expect(css).toMatch(/button:focus,\s*\.back-link:focus\{outline:3px solid/);
    expect(css).toMatch(/\.language-switcher select:focus\{outline:3px solid/);
  });

  it("never uses CSS custom properties, since var() support on Kindle's WebKit is uncertain", () => {
    expect(sharedStyles()).not.toContain("var(");
  });

  it("never adds animations or transitions, per the e-ink constraint", () => {
    const css = sharedStyles();

    expect(css).not.toMatch(/animation|transition/);
  });

  it("gives the page heading an explicit size and vertical spacing instead of the browser default", () => {
    const css = sharedStyles();

    expect(css).toMatch(/h1\{[^}]*font-size:/);
    expect(css).toMatch(/h1\{[^}]*margin:/);
  });

  it("lays the back-link and language switcher out in one header row instead of stacked rows", () => {
    const css = sharedStyles();

    expect(css).toMatch(/\.page-header\{[^}]*display:flex/);
  });

  it("groups the puzzle toolbar's buttons with a visible gap instead of letting them touch", () => {
    const css = sharedStyles();

    expect(css).toMatch(/\.play-toolbar\{[^}]*display:flex/);
    expect(css).toMatch(/\.play-toolbar\{[^}]*gap:\d+px/);
  });

  it("boxes the win/check result message so it reads as a distinct banner, not plain text", () => {
    const css = sharedStyles();

    expect(css).toMatch(/\[data-role="win-banner"\]\{[^}]*border:/);
  });

  it("uses the amber accent for the back-link, the 'navigate away' role", () => {
    const css = sharedStyles();

    // Pinned as a literal, not imported from theme.ts, so a change to the
    // token itself would actually be caught here instead of both sides
    // silently drifting together.
    expect(css).toMatch(/\.back-link\{[^}]*#a85f00/);
  });

  it("uses the teal accent for the win banner, the 'completed' role shared with the library's solved stamp", () => {
    const css = sharedStyles();

    expect(css).toMatch(/\[data-role="win-banner"\]\{[^}]*#0b7a68/);
  });

  it("uses the amber accent for a pressed/active mode button, not just a thicker border", () => {
    const css = sharedStyles();

    expect(css).toMatch(/button\[aria-pressed="true"\]\{[^}]*#a85f00/);
  });

  it("gives the page background a subtle static paper texture, never an animated one", () => {
    const css = sharedStyles();

    expect(css).toMatch(/body\{[^}]*repeating-linear-gradient/);
    expect(css).not.toMatch(/body\{[^}]*(animation|transition)/);
  });

  it("gives the page heading a flat duotone shadow instead of a blurred glow", () => {
    const css = sharedStyles();

    expect(css).toMatch(/h1\{[^}]*text-shadow:[^;]*0 #/);
    expect(css).not.toMatch(/h1\{[^}]*text-shadow:[^;]*blur/);
  });

  it("styles a decorative dot row and a rule-flanked section label using the label font", () => {
    const css = sharedStyles();

    expect(css).toMatch(/\.dot-row\{[^}]*display:flex/);
    expect(css).toMatch(/\.section-label\{[^}]*font-family:/);
  });

  it("gives the library page's wrapping panel a bordered, shadowed card look", () => {
    const css = sharedStyles();

    expect(css).toMatch(/\.panel\{[^}]*border:/);
    expect(css).toMatch(/\.panel\{[^}]*box-shadow:/);
  });

  it("never adds animation or transition anywhere in the new cabinet-style rules", () => {
    const css = sharedStyles();

    expect(css).not.toMatch(/animation|transition/);
  });

  it("gives buttons and the back-link a chunky 3D offset shadow", () => {
    const css = sharedStyles();

    expect(css).toMatch(/button,\s*\.back-link\{[^}]*box-shadow:0 3px 0/);
  });

  it("presses a button in with a discrete style swap on :active, not an animated transition", () => {
    const css = sharedStyles();

    expect(css).toMatch(
      /button:active,\s*\.back-link:active\{[^}]*transform:translateY/,
    );
    expect(css).not.toMatch(/button:active[^{]*\{[^}]*transition/);
  });

  it("keeps a pressed/active toggle button visually pressed in, matching the :active state", () => {
    const css = sharedStyles();

    expect(css).toMatch(
      /button\[aria-pressed="true"\]\{[^}]*transform:translateY/,
    );
  });

  it("rounds the corners of the panel, buttons, and the decorative dots", () => {
    const css = sharedStyles();

    expect(css).toMatch(/\.panel\{[^}]*border-radius:\d+px/);
    expect(css).toMatch(/button,\s*\.back-link\{[^}]*border-radius:\d+px/);
    expect(css).toMatch(/\.dot-row i\{[^}]*border-radius:50%/);
  });

  it("truncates a long heading inside the header row instead of pushing its controls or wrapping", () => {
    const css = sharedStyles();

    expect(css).toMatch(/\.page-header h1\{[^}]*text-overflow:ellipsis/);
    expect(css).toMatch(/\.page-header h1\{[^}]*white-space:nowrap/);
    // min-width:0 is required for ellipsis to actually take effect on a
    // flex item — without it, a flex child never shrinks below its
    // content's natural width, so overflow/ellipsis silently never fires.
    expect(css).toMatch(/\.page-header h1\{[^}]*min-width:0/);
  });

  it("removes the standalone heading's own margin when it joins the header row, instead of adding to the row's margin", () => {
    const css = sharedStyles();

    expect(css).toMatch(/\.page-header h1\{[^}]*margin:0/);
  });

  it("groups the header row's controls in their own flex cluster that wraps together as one unit", () => {
    const css = sharedStyles();

    expect(css).toMatch(/\.page-header-controls\{[^}]*display:flex/);
  });
});
