import { describe, expect, it } from "vitest";
import { isPrNumberAssociated } from "./previewPrTrust.js";

describe("isPrNumberAssociated", () => {
  it("returns true when the candidate PR number appears in the associated list", () => {
    expect(isPrNumberAssociated(42, [1, 42, 100])).toBe(true);
  });

  it("returns false when the candidate PR number is not among the associated PRs", () => {
    expect(isPrNumberAssociated(42, [1, 2, 3])).toBe(false);
  });

  it("returns false for an empty associated list (e.g. a forged or stale PR number)", () => {
    expect(isPrNumberAssociated(42, [])).toBe(false);
  });

  it("rejects a non-positive-integer candidate outright, without consulting the list", () => {
    expect(isPrNumberAssociated(0, [0])).toBe(false);
    expect(isPrNumberAssociated(-1, [-1])).toBe(false);
    expect(isPrNumberAssociated(1.5, [1.5])).toBe(false);
  });
});
