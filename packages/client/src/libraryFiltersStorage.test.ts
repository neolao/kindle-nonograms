// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_LIBRARY_FILTERS,
  readLibraryFiltersCookie,
  writeLibraryFiltersCookie,
} from "./libraryFiltersStorage.js";

afterEach(() => {
  vi.restoreAllMocks();
  document.cookie = "kindle-nonograms-library-filters=; path=/; max-age=0";
});

describe("readLibraryFiltersCookie / writeLibraryFiltersCookie", () => {
  it("reads back the exact filters state that was just written", () => {
    writeLibraryFiltersCookie({
      color: "multi",
      status: "solved",
      sortByRecent: true,
    });

    expect(readLibraryFiltersCookie()).toEqual({
      color: "multi",
      status: "solved",
      sortByRecent: true,
    });
  });

  it("returns undefined when no filters cookie has been set", () => {
    expect(readLibraryFiltersCookie()).toBeUndefined();
  });

  it("ignores unrelated cookies and finds its own among them", () => {
    document.cookie = "some-other-cookie=abc; path=/";
    writeLibraryFiltersCookie({
      color: "mono",
      status: "in-progress",
      sortByRecent: false,
    });

    expect(readLibraryFiltersCookie()).toEqual({
      color: "mono",
      status: "in-progress",
      sortByRecent: false,
    });
  });

  it("falls back to each field's own default when the cookie has an unknown/corrupted value for it, instead of discarding the whole preference", () => {
    document.cookie =
      "kindle-nonograms-library-filters=color%3Dpurple%26status%3Dsolved%26sort%3D1; path=/";

    expect(readLibraryFiltersCookie()).toEqual({
      color: DEFAULT_LIBRARY_FILTERS.color,
      status: "solved",
      sortByRecent: true,
    });
  });

  it("falls back to every default when the cookie value is entirely missing/malformed", () => {
    document.cookie =
      "kindle-nonograms-library-filters=not-a-querystring; path=/";

    expect(readLibraryFiltersCookie()).toEqual(DEFAULT_LIBRARY_FILTERS);
  });

  it("degrades silently (no throw, undefined) when reading document.cookie throws", () => {
    vi.spyOn(document, "cookie", "get").mockImplementation(() => {
      throw new Error("cookies disabled");
    });

    expect(() => readLibraryFiltersCookie()).not.toThrow();
    expect(readLibraryFiltersCookie()).toBeUndefined();
  });

  it("degrades silently (no throw) when writing document.cookie throws", () => {
    vi.spyOn(document, "cookie", "set").mockImplementation(() => {
      throw new Error("cookies disabled");
    });

    expect(() =>
      writeLibraryFiltersCookie({
        color: "mono",
        status: "unsolved",
        sortByRecent: false,
      }),
    ).not.toThrow();
  });
});
