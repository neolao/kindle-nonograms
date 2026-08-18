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

    expect(css).toMatch(/button\{[^}]*min-height:44px/);
    expect(css).toMatch(/\.language-switcher select\{[^}]*min-height:44px/);
  });

  it("gives a pressed/active button a visibly thicker border, not a color-only cue", () => {
    const css = sharedStyles();

    expect(css).toContain('button[aria-pressed="true"]{border-width:3px;}');
  });

  it("gives a focused button and select a visible, non-color-only outline", () => {
    const css = sharedStyles();

    expect(css).toMatch(/button:focus\{outline:3px solid/);
    expect(css).toMatch(/\.language-switcher select:focus\{outline:3px solid/);
  });

  it("never uses CSS custom properties, since var() support on Kindle's WebKit is uncertain", () => {
    expect(sharedStyles()).not.toContain("var(");
  });

  it("never adds animations or transitions, per the e-ink constraint", () => {
    const css = sharedStyles();

    expect(css).not.toMatch(/animation|transition/);
  });
});
