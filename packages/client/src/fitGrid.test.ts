import { describe, expect, it } from "vitest";
import { computeFitFontSizePx } from "./fitGrid.js";

const baseInput = {
  naturalWidth: 400,
  naturalHeight: 400,
  availableWidth: 400,
  availableHeight: 400,
  baseFontSizePx: 16,
  minScale: 0.5,
  maxScale: 2,
};

describe("computeFitFontSizePx", () => {
  it("scales down by the width ratio when width is the tighter constraint", () => {
    const result = computeFitFontSizePx({
      ...baseInput,
      naturalWidth: 700,
      naturalHeight: 100,
      availableWidth: 500,
      availableHeight: 500,
    });

    // widthRatio = 500/700, heightRatio = 5 -> min is widthRatio * 0.98
    expect(result).toBe(Math.floor((500 / 700) * 0.98 * 16));
  });

  it("scales down by the height ratio when height is the tighter constraint", () => {
    const result = computeFitFontSizePx({
      ...baseInput,
      naturalWidth: 100,
      naturalHeight: 700,
      availableWidth: 500,
      availableHeight: 500,
    });

    // heightRatio = 500/700, widthRatio = 5 -> min is heightRatio * 0.98
    expect(result).toBe(Math.floor((500 / 700) * 0.98 * 16));
  });

  it("clamps to minScale when the puzzle is far too large to fit even shrunk", () => {
    const result = computeFitFontSizePx({
      ...baseInput,
      naturalWidth: 10000,
      naturalHeight: 10000,
      availableWidth: 100,
      availableHeight: 100,
    });

    expect(result).toBe(Math.floor(0.5 * 16));
  });

  it("clamps to maxScale instead of blowing up a tiny puzzle to fill the viewport", () => {
    const result = computeFitFontSizePx({
      ...baseInput,
      naturalWidth: 10,
      naturalHeight: 10,
      availableWidth: 1000,
      availableHeight: 1000,
    });

    expect(result).toBe(Math.floor(2 * 16));
  });

  it("falls back to the clamped base font size when natural size is zero", () => {
    const result = computeFitFontSizePx({
      ...baseInput,
      naturalWidth: 0,
      naturalHeight: 0,
    });

    expect(result).toBe(16);
  });

  it("falls back to the clamped base font size when available size is negative", () => {
    const result = computeFitFontSizePx({
      ...baseInput,
      availableWidth: -10,
    });

    expect(result).toBe(16);
  });

  it("scales by width alone, ignoring a tight height, when availableHeight is omitted", () => {
    const result = computeFitFontSizePx({
      naturalWidth: 100,
      naturalHeight: 700,
      availableWidth: 500,
      // availableHeight omitted — height must not be a factor at all, even
      // though 500/700 would otherwise be the tighter ratio.
      baseFontSizePx: 16,
      minScale: 0.5,
      maxScale: 2,
    });

    // widthRatio = 500/100 = 5, clamped to maxScale (2) since height never
    // enters the calculation.
    expect(result).toBe(Math.floor(2 * 16));
  });

  it("does not fall back to the base size just because naturalHeight is zero, when availableHeight is omitted", () => {
    const result = computeFitFontSizePx({
      naturalWidth: 200,
      naturalHeight: 0,
      availableWidth: 100,
      baseFontSizePx: 16,
      minScale: 0.5,
      maxScale: 2,
    });

    // A zero/unmeasured naturalHeight is irrelevant once height fit isn't
    // requested at all — only the real width ratio (100/200 = 0.5) applies;
    // with the 0.98 safety margin that's 0.49, below minScale (0.5), so it
    // clamps up to exactly minScale.
    expect(result).toBe(Math.floor(0.5 * 16));
  });
});
