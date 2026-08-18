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

    expect(css).toContain('button[aria-pressed="true"]{border-width:3px;}');
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

  it("uses the muted accent color as decoration on the back-link and the result banner", () => {
    const css = sharedStyles();

    // Pinned as a literal, not imported from theme.ts, so a change to the
    // token itself would actually be caught here instead of both sides
    // silently drifting together.
    expect(css).toContain("#2f5f8a");
  });
});
