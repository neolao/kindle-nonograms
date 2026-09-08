import { describe, expect, it } from "vitest";
import { contrastingTextColor, readableRunColor } from "./contrastColor.js";

describe("contrastingTextColor", () => {
  it("returns black text for a light background", () => {
    expect(contrastingTextColor("#ffffff")).toBe("#000000");
  });

  it("returns white text for a dark background", () => {
    expect(contrastingTextColor("#000000")).toBe("#ffffff");
  });

  it("returns black text for a light mid-tone background close to the crossover point", () => {
    // #808080 has a relative luminance (~0.216) just above the WCAG
    // black/white crossover (~0.179): black wins the contrast-ratio race.
    expect(contrastingTextColor("#808080")).toBe("#000000");
  });

  it("returns white text for a dark mid-tone background close to the crossover point", () => {
    // #666666 has a relative luminance (~0.133) just below the WCAG
    // black/white crossover (~0.179): white wins the contrast-ratio race.
    expect(contrastingTextColor("#666666")).toBe("#ffffff");
  });

  it("falls back to black text for a malformed color instead of throwing", () => {
    expect(() => contrastingTextColor("not-a-color")).not.toThrow();
    expect(contrastingTextColor("not-a-color")).toBe("#000000");
  });

  it("falls back to black text for an empty string", () => {
    expect(contrastingTextColor("")).toBe("#000000");
  });

  it("returns white text for a dark background given as 3-digit shorthand hex", () => {
    // #000 expands to #000000 — same crossover-clearing dark color already
    // covered above.
    expect(contrastingTextColor("#000")).toBe("#ffffff");
  });

  it("returns black text for a light background given as uppercase 3-digit shorthand hex", () => {
    // #FFF expands to #ffffff.
    expect(contrastingTextColor("#FFF")).toBe("#000000");
  });

  it("returns white text for a dark background given as 8-digit hex with an opaque alpha byte", () => {
    // #000000ff drops its trailing alpha byte and expands to #000000.
    expect(contrastingTextColor("#000000ff")).toBe("#ffffff");
  });

  it("ignores the alpha byte of an 8-digit hex background instead of blending it", () => {
    // #666666 alone is already established above as crossing over to white
    // text; a partially transparent alpha byte must not change that
    // decision, since the swatch it colors always renders as a solid fill.
    expect(contrastingTextColor("#666666cc")).toBe("#ffffff");
  });

  it("falls back to black text for a 4-digit shorthand-with-alpha string (unsupported format)", () => {
    // #rgba (CSS Color 4) is a different, longer shorthand than the
    // 3-digit/8-digit formats this fix adds — still treated as malformed.
    expect(contrastingTextColor("#000f")).toBe("#000000");
  });

  it("falls back to black text for a 7-character hex string (invalid length)", () => {
    expect(contrastingTextColor("#1234567")).toBe("#000000");
  });
});

describe("readableRunColor", () => {
  it("keeps the palette color when it already has enough contrast against white", () => {
    // #000080 (navy) has a contrast ratio of ~16:1 against white — well
    // above the WCAG AA normal-text threshold (4.5:1).
    expect(readableRunColor("#000080")).toBe("#000080");
  });

  it("falls back to black when a pale palette color has insufficient contrast against white", () => {
    // #ffff99 (pale yellow) has a contrast ratio of ~1.05:1 against white —
    // the exact illegibility case reported for backlog item 048.
    expect(readableRunColor("#ffff99")).toBe("#000000");
  });

  it("falls back to black for a mid-saturation color that still fails the normal-text threshold", () => {
    // #ff0000 (pure red) has a contrast ratio of ~4:1 against white — below
    // 4.5:1, so this isn't only a "very pale colors" edge case.
    expect(readableRunColor("#ff0000")).toBe("#000000");
  });

  it("keeps a saturated color whose contrast against white clears the threshold", () => {
    // #0000ff (pure blue) has a contrast ratio of ~8.6:1 against white.
    expect(readableRunColor("#0000ff")).toBe("#0000ff");
  });

  it("falls back to black text for a malformed color instead of throwing", () => {
    expect(() => readableRunColor("not-a-color")).not.toThrow();
    expect(readableRunColor("not-a-color")).toBe("#000000");
  });

  it("falls back to black text for an empty string", () => {
    expect(readableRunColor("")).toBe("#000000");
  });
});
