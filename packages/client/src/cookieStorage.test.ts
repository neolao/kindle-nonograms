// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { readCookie, writeCookie } from "./cookieStorage.js";

afterEach(() => {
  vi.restoreAllMocks();
  document.cookie = "test-cookie=; path=/; max-age=0";
});

describe("readCookie / writeCookie", () => {
  it("reads back the exact value that was just written, under its own name", () => {
    writeCookie("test-cookie", "hello world");

    expect(readCookie("test-cookie")).toBe("hello world");
  });

  it("returns undefined when no cookie of that name has been set", () => {
    expect(readCookie("test-cookie")).toBeUndefined();
  });

  it("ignores unrelated cookies and finds the requested one among them", () => {
    document.cookie = "some-other-cookie=abc; path=/";
    writeCookie("test-cookie", "value");

    expect(readCookie("test-cookie")).toBe("value");
  });

  it("URL-decodes a value containing reserved characters", () => {
    writeCookie("test-cookie", "a=b&c d");

    expect(readCookie("test-cookie")).toBe("a=b&c d");
  });

  it("degrades silently (no throw, undefined) when reading document.cookie throws", () => {
    vi.spyOn(document, "cookie", "get").mockImplementation(() => {
      throw new Error("cookies disabled");
    });

    expect(() => readCookie("test-cookie")).not.toThrow();
    expect(readCookie("test-cookie")).toBeUndefined();
  });

  it("degrades silently (no throw) when writing document.cookie throws", () => {
    vi.spyOn(document, "cookie", "set").mockImplementation(() => {
      throw new Error("cookies disabled");
    });

    expect(() => writeCookie("test-cookie", "value")).not.toThrow();
  });
});
