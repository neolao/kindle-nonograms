// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  listProgressPuzzleIds,
  loadProgress,
  saveProgress,
} from "./progressStorage.js";

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("saveProgress / loadProgress", () => {
  it("round-trips the same progress data for a given puzzle id", () => {
    const progress = {
      cells: [
        [0, null],
        [null, "marked"],
      ],
    };

    saveProgress("flag", progress);

    expect(loadProgress("flag")).toEqual(progress);
  });

  it("returns true when the write succeeds", () => {
    expect(saveProgress("flag", { cells: [[0]] })).toBe(true);
  });

  it("keeps progress for different puzzle ids independent", () => {
    saveProgress("flag", { cells: [[0]] });
    saveProgress("cat", { cells: [[1]] });

    expect(loadProgress("flag")).toEqual({ cells: [[0]] });
    expect(loadProgress("cat")).toEqual({ cells: [[1]] });
  });

  it("returns undefined when no entry exists for that puzzle id", () => {
    expect(loadProgress("never-saved")).toBeUndefined();
  });

  it("treats corrupted JSON in storage as no progress rather than throwing", () => {
    localStorage.setItem("kindle-nonograms:progress:flag", "not valid json{");

    expect(() => loadProgress("flag")).not.toThrow();
    expect(loadProgress("flag")).toBeUndefined();
  });

  it("degrades to returning false when localStorage.setItem throws (quota, restricted mode)", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });

    expect(() => saveProgress("flag", { cells: [[0]] })).not.toThrow();
    expect(saveProgress("flag", { cells: [[0]] })).toBe(false);
  });

  it("degrades silently when localStorage.getItem throws (quota, restricted mode)", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });

    expect(() => loadProgress("flag")).not.toThrow();
    expect(loadProgress("flag")).toBeUndefined();
  });
});

describe("listProgressPuzzleIds", () => {
  it("lists the ids that have stored progress, ignoring other keys", () => {
    saveProgress("cat", { cells: [[0]] });
    saveProgress("dog", { cells: [[1]] });
    localStorage.setItem("kindle-nonograms:sync-meta:bird", "{}");
    localStorage.setItem("other", "x");

    expect(listProgressPuzzleIds().sort()).toEqual(["cat", "dog"]);
  });

  it("returns an empty list when nothing is stored", () => {
    expect(listProgressPuzzleIds()).toEqual([]);
  });

  it("returns an empty list instead of throwing when storage is unavailable", () => {
    saveProgress("cat", { cells: [[0]] });
    vi.spyOn(Storage.prototype, "key").mockImplementation(() => {
      throw new Error("denied");
    });

    expect(listProgressPuzzleIds()).toEqual([]);
  });
});
