import { describe, expect, it } from "vitest";
import { formatClueLine } from "./main.js";

describe("formatClueLine", () => {
  it("joins multiple clues with a single space", () => {
    expect(formatClueLine([1, 2, 3])).toBe("1 2 3");
  });

  it("returns '0' for an empty clue list", () => {
    expect(formatClueLine([])).toBe("0");
  });

  it("returns the single clue as a string when there is only one", () => {
    expect(formatClueLine([5])).toBe("5");
  });
});
