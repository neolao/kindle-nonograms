import { describe, expect, it } from "vitest";
import {
  buildRawPreviewImageUrl,
  determineArtifactMode,
  findExistingPreviewComment,
  shouldSkipClosedPr,
} from "./previewPublishDecisions.js";

describe("determineArtifactMode", () => {
  it("detects render mode from a manifest.json alongside pr-number.txt", () => {
    expect(
      determineArtifactMode(["pr-number.txt", "manifest.json", "cat.png"]),
    ).toBe("render");
  });

  it("detects cleanup mode when only pr-number.txt is present", () => {
    expect(determineArtifactMode(["pr-number.txt"])).toBe("cleanup");
  });

  it("returns undefined for an artifact missing pr-number.txt entirely", () => {
    expect(determineArtifactMode(["manifest.json", "cat.png"])).toBeUndefined();
  });

  it("returns undefined for an empty artifact directory", () => {
    expect(determineArtifactMode([])).toBeUndefined();
  });
});

describe("findExistingPreviewComment", () => {
  const marked = {
    id: 7,
    body: "<!-- kindle-nonograms:puzzle-preview -->\nold",
  };
  const unrelated = { id: 3, body: "just a normal comment" };

  it("finds the comment carrying the stable marker among others", () => {
    expect(findExistingPreviewComment([unrelated, marked])).toEqual(marked);
  });

  it("returns undefined when no comment carries the marker", () => {
    expect(findExistingPreviewComment([unrelated])).toBeUndefined();
  });

  it("returns undefined for an empty comment list", () => {
    expect(findExistingPreviewComment([])).toBeUndefined();
  });
});

describe("shouldSkipClosedPr", () => {
  it("skips a render publish when the PR is already closed (out-of-order delivery guard)", () => {
    expect(shouldSkipClosedPr("render", "closed")).toBe(true);
  });

  it("does not skip a render publish for a PR that's still open", () => {
    expect(shouldSkipClosedPr("render", "open")).toBe(false);
  });

  it("never skips a cleanup — it must run precisely because the PR closed", () => {
    expect(shouldSkipClosedPr("cleanup", "closed")).toBe(false);
    expect(shouldSkipClosedPr("cleanup", "open")).toBe(false);
  });
});

describe("buildRawPreviewImageUrl", () => {
  it("builds a raw.githubusercontent.com URL for the pushed preview image", () => {
    expect(
      buildRawPreviewImageUrl({
        owner: "neolao",
        repo: "kindle-nonograms",
        prNumber: 42,
        puzzleId: "small-heart",
      }),
    ).toBe(
      "https://raw.githubusercontent.com/neolao/kindle-nonograms/puzzle-previews/previews/pr-42/small-heart.png",
    );
  });
});
