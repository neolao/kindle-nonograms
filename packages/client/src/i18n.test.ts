// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applyLocale,
  readLocaleCookie,
  resolveLocale,
  writeLocaleCookie,
} from "./i18n.js";

afterEach(() => {
  vi.restoreAllMocks();
  document.cookie = "kindle-nonograms-locale=; path=/; max-age=0";
  document.body.innerHTML = "";
  document.documentElement.lang = "";
});

describe("readLocaleCookie / writeLocaleCookie", () => {
  it("reads back the exact locale that was just written", () => {
    writeLocaleCookie("fr");

    expect(readLocaleCookie()).toBe("fr");
  });

  it("returns undefined when no locale cookie has been set", () => {
    expect(readLocaleCookie()).toBeUndefined();
  });

  it("ignores unrelated cookies and finds the locale cookie among them", () => {
    document.cookie = "some-other-cookie=abc; path=/";
    writeLocaleCookie("en");

    expect(readLocaleCookie()).toBe("en");
  });

  it("degrades silently (no throw, undefined) when reading document.cookie throws", () => {
    vi.spyOn(document, "cookie", "get").mockImplementation(() => {
      throw new Error("cookies disabled");
    });

    expect(() => readLocaleCookie()).not.toThrow();
    expect(readLocaleCookie()).toBeUndefined();
  });

  it("degrades silently (no throw) when writing document.cookie throws", () => {
    vi.spyOn(document, "cookie", "set").mockImplementation(() => {
      throw new Error("cookies disabled");
    });

    expect(() => writeLocaleCookie("fr")).not.toThrow();
  });
});

describe("resolveLocale", () => {
  it("prefers the cookie value when it is a supported locale", () => {
    expect(resolveLocale("fr", "en-US")).toBe("fr");
  });

  it("falls back to the browser language when there is no cookie", () => {
    expect(resolveLocale(undefined, "fr-FR")).toBe("fr");
  });

  it("matches the browser language by its primary subtag, ignoring region", () => {
    expect(resolveLocale(undefined, "en-GB")).toBe("en");
  });

  it("falls back to the default locale when neither cookie nor browser language is supported", () => {
    expect(resolveLocale(undefined, "de-DE")).toBe("en");
  });

  it("falls back to the default locale when both cookie and browser language are absent", () => {
    expect(resolveLocale(undefined, undefined)).toBe("en");
  });

  it("ignores an unsupported cookie value and falls back to the browser language", () => {
    expect(resolveLocale("xx", "fr-FR")).toBe("fr");
  });
});

describe("applyLocale", () => {
  it("updates the document's lang attribute to the given locale", () => {
    applyLocale("fr");

    expect(document.documentElement.lang).toBe("fr");
  });

  it("translates every element carrying a data-i18n key", () => {
    document.body.innerHTML =
      '<h1 data-i18n="library.title"></h1><p data-i18n="library.empty"></p>';

    applyLocale("fr");

    expect(document.querySelector("h1")?.textContent).toBe("Kindle Nonograms");
    expect(document.querySelector("p")?.textContent).toBe(
      "Aucun puzzle disponible pour le moment.",
    );
  });

  it("leaves elements with no data-i18n attribute untouched", () => {
    document.body.innerHTML = "<span>untouched</span>";

    applyLocale("fr");

    expect(document.querySelector("span")?.textContent).toBe("untouched");
  });

  it("does not throw when no element in the document carries a data-i18n key", () => {
    document.body.innerHTML = "<p>plain</p>";

    expect(() => applyLocale("en")).not.toThrow();
  });
});
