import { describe, expect, it } from "vitest";
import {
  computeOrphanedPreviewNumbers,
  parsePreviewDirName,
} from "./previewSweepDecisions.js";

describe("computeOrphanedPreviewNumbers", () => {
  it("keeps only the preview numbers with no matching open PR", () => {
    expect(computeOrphanedPreviewNumbers([1, 2, 3], [2])).toEqual([1, 3]);
  });

  it("returns an empty list when every preview still has an open PR", () => {
    expect(computeOrphanedPreviewNumbers([5, 7], [5, 7, 9])).toEqual([]);
  });

  it("returns an empty list when there are no previews at all", () => {
    expect(computeOrphanedPreviewNumbers([], [1, 2])).toEqual([]);
  });

  it("treats every preview as orphaned when no PR is open", () => {
    expect(computeOrphanedPreviewNumbers([1, 2], [])).toEqual([1, 2]);
  });
});

describe("parsePreviewDirName", () => {
  it("extracts the PR number from a well-formed directory name", () => {
    expect(parsePreviewDirName("pr-42")).toBe(42);
  });

  it("returns undefined for a name with a non-numeric suffix", () => {
    expect(parsePreviewDirName("pr-abc")).toBeUndefined();
  });

  it("returns undefined for a name missing the pr- prefix", () => {
    expect(parsePreviewDirName("42")).toBeUndefined();
  });

  it("returns undefined for a directory name with trailing garbage", () => {
    expect(parsePreviewDirName("pr-42-old")).toBeUndefined();
  });

  it("parses a leading-zero-padded number the same as its plain value", () => {
    expect(parsePreviewDirName("pr-0012")).toBe(12);
  });

  it("returns undefined for a name with no digits after the prefix", () => {
    expect(parsePreviewDirName("pr-")).toBeUndefined();
  });

  it("returns undefined for an unrelated entry that isn't a preview directory at all", () => {
    expect(parsePreviewDirName("README.md")).toBeUndefined();
  });
});
