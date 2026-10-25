// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { keysWithPrefix } from "./storageKeys.js";

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("keysWithPrefix", () => {
  it("returns only the keys that start with the prefix", () => {
    localStorage.setItem("a:one", "1");
    localStorage.setItem("a:two", "2");
    localStorage.setItem("b:a:three", "3");
    localStorage.setItem("other", "4");

    expect(keysWithPrefix("a:").sort()).toEqual(["a:one", "a:two"]);
  });

  it("returns an empty list when nothing matches", () => {
    expect(keysWithPrefix("a:")).toEqual([]);
  });

  it("lets a storage failure surface to the caller", () => {
    vi.spyOn(Storage.prototype, "key").mockImplementation(() => {
      throw new Error("denied");
    });
    localStorage.setItem("a:one", "1");

    expect(() => keysWithPrefix("a:")).toThrow("denied");
  });
});
