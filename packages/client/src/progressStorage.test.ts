// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadProgress, saveProgress } from "./progressStorage.js";

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

  it("degrades silently when localStorage.setItem throws (quota, restricted mode)", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });

    expect(() => saveProgress("flag", { cells: [[0]] })).not.toThrow();
  });

  it("degrades silently when localStorage.getItem throws (quota, restricted mode)", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });

    expect(() => loadProgress("flag")).not.toThrow();
    expect(loadProgress("flag")).toBeUndefined();
  });
});
