import { describe, expect, it } from "vitest";
import { sanitizePuzzleId } from "./previewFilenameGuard.js";

describe("sanitizePuzzleId", () => {
  it("accepts a plain filename and returns its id (without the .json extension)", () => {
    expect(sanitizePuzzleId("small-heart.json")).toBe("small-heart");
  });

  it("accepts a puzzle id containing only word characters, dashes, or dots", () => {
    expect(sanitizePuzzleId("12f34657-8f86-4d59-a30b-ea11099dbe95.json")).toBe(
      "12f34657-8f86-4d59-a30b-ea11099dbe95",
    );
  });

  it("rejects an entry containing a path separator, refusing to build an escaping path", () => {
    expect(sanitizePuzzleId("../../etc/passwd.json")).toBeUndefined();
    expect(sanitizePuzzleId("nested/path.json")).toBeUndefined();
    expect(sanitizePuzzleId("nested\\path.json")).toBeUndefined();
  });

  it("rejects an entry that isn't a .json file", () => {
    expect(sanitizePuzzleId("small-heart.png")).toBeUndefined();
    expect(sanitizePuzzleId("small-heart")).toBeUndefined();
  });

  it("rejects an empty or whitespace-only id", () => {
    expect(sanitizePuzzleId(".json")).toBeUndefined();
    expect(sanitizePuzzleId("   .json")).toBeUndefined();
  });
});
