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
});
