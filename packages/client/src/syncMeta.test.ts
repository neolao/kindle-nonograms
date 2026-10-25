// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { clearAllSyncMeta, loadSyncMeta, saveSyncMeta } from "./syncMeta.js";

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("saveSyncMeta / loadSyncMeta", () => {
  it("round-trips a puzzle's meta under its own key", () => {
    saveSyncMeta("cat", { baseRev: 4, dirty: true });

    expect(loadSyncMeta("cat")).toEqual({ baseRev: 4, dirty: true });
    expect(localStorage.getItem("kindle-nonograms:sync-meta:cat")).toBe(
      '{"baseRev":4,"dirty":true}',
    );
  });

  it("returns undefined when there is no meta", () => {
    expect(loadSyncMeta("cat")).toBeUndefined();
  });

  it.each([
    ["invalid JSON", "{nope"],
    ["a wrong shape", '{"baseRev":"3","dirty":false}'],
    ["a negative revision", '{"baseRev":-1,"dirty":false}'],
    ["revision 0, which no server entry has", '{"baseRev":0,"dirty":false}'],
    ["a fractional revision", '{"baseRev":1.5,"dirty":false}'],
    ["a missing dirty flag", '{"baseRev":1}'],
    ["null", "null"],
  ])("treats %s as no meta", (_label, raw) => {
    localStorage.setItem("kindle-nonograms:sync-meta:cat", raw);

    expect(loadSyncMeta("cat")).toBeUndefined();
  });

  it("reports false instead of throwing when the write fails", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });

    expect(saveSyncMeta("cat", { baseRev: 1, dirty: false })).toBe(false);
  });

  it("returns undefined instead of throwing when storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });

    expect(loadSyncMeta("cat")).toBeUndefined();
  });
});

describe("clearAllSyncMeta", () => {
  it("removes every sync meta, leaves other keys and reports true", () => {
    saveSyncMeta("cat", { baseRev: 1, dirty: false });
    saveSyncMeta("dog", { baseRev: 2, dirty: true });
    localStorage.setItem("kindle-nonograms:progress:cat", "[]");

    expect(clearAllSyncMeta()).toBe(true);

    expect(loadSyncMeta("cat")).toBeUndefined();
    expect(loadSyncMeta("dog")).toBeUndefined();
    expect(localStorage.getItem("kindle-nonograms:progress:cat")).toBe("[]");
  });

  it("reports false when the keys cannot be removed", () => {
    saveSyncMeta("cat", { baseRev: 1, dirty: false });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("denied");
    });

    expect(clearAllSyncMeta()).toBe(false);
  });

  it("reports false when the keys cannot be listed", () => {
    vi.spyOn(Storage.prototype, "key").mockImplementation(() => {
      throw new Error("denied");
    });
    saveSyncMeta("cat", { baseRev: 1, dirty: false });

    expect(clearAllSyncMeta()).toBe(false);
  });
});
