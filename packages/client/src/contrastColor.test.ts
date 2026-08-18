import { describe, expect, it } from "vitest";
import { contrastingTextColor } from "./contrastColor.js";

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
});
