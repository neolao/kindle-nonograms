// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadPuzzleOpenedAt, recordPuzzleOpened } from "./openedStorage.js";

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("recordPuzzleOpened / loadPuzzleOpenedAt", () => {
  it("round-trips the given timestamp for a puzzle id", () => {
    recordPuzzleOpened("flag", 1_700_000_000_000);

    expect(loadPuzzleOpenedAt("flag")).toBe(1_700_000_000_000);
  });

  it("defaults to the current time when no timestamp is given", () => {
    const before = Date.now();
    recordPuzzleOpened("flag");
    const after = Date.now();

    const stored = loadPuzzleOpenedAt("flag");
    expect(stored).toBeGreaterThanOrEqual(before);
    expect(stored).toBeLessThanOrEqual(after);
  });

  it("returns true when the write succeeds", () => {
    expect(recordPuzzleOpened("flag", 1)).toBe(true);
  });

  it("overwrites the previous timestamp on a later open, so last open always wins", () => {
    recordPuzzleOpened("flag", 1_000);
    recordPuzzleOpened("flag", 2_000);

    expect(loadPuzzleOpenedAt("flag")).toBe(2_000);
  });

  it("keeps opened timestamps for different puzzle ids independent", () => {
    recordPuzzleOpened("flag", 1_000);
    recordPuzzleOpened("cat", 2_000);

    expect(loadPuzzleOpenedAt("flag")).toBe(1_000);
    expect(loadPuzzleOpenedAt("cat")).toBe(2_000);
  });

  it("returns undefined when no entry exists for that puzzle id", () => {
    expect(loadPuzzleOpenedAt("never-opened")).toBeUndefined();
  });

  it("treats a non-numeric stored value as no entry rather than throwing", () => {
    localStorage.setItem("kindle-nonograms:opened:flag", "not a number");

    expect(() => loadPuzzleOpenedAt("flag")).not.toThrow();
    expect(loadPuzzleOpenedAt("flag")).toBeUndefined();
  });

  it("degrades to returning false when localStorage.setItem throws (quota, restricted mode)", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });

    expect(() => recordPuzzleOpened("flag")).not.toThrow();
    expect(recordPuzzleOpened("flag")).toBe(false);
  });

  it("degrades silently when localStorage.getItem throws (quota, restricted mode)", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });

    expect(() => loadPuzzleOpenedAt("flag")).not.toThrow();
    expect(loadPuzzleOpenedAt("flag")).toBeUndefined();
  });
});
