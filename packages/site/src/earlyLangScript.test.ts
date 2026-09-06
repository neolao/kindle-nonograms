// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderEarlyLangScript } from "./earlyLangScript.js";

/**
 * Extracts the JS body from the `<script>...</script>` markup
 * `renderEarlyLangScript()` returns and actually runs it against the real
 * `document` — the meaningful behaviour lives in what that JS does once
 * executed, not in the literal string, so asserting on the string alone
 * would be tautological.
 */
function runEarlyLangScript(): void {
  const html = renderEarlyLangScript();
  const match = /<script>([\s\S]*)<\/script>/.exec(html);
  if (!match) {
    throw new Error("renderEarlyLangScript: no <script> tag found");
  }
  new Function(match[1])();
}

afterEach(() => {
  vi.restoreAllMocks();
  document.cookie = "kindle-nonograms-locale=; path=/; max-age=0";
  document.documentElement.lang = "en";
});

describe("renderEarlyLangScript", () => {
  it("is a plain, non-module script so it runs synchronously as soon as the parser reaches it", () => {
    const html = renderEarlyLangScript();

    expect(html).toMatch(/^<script>/);
    expect(html).not.toContain("type=");
  });

  it("sets the document's lang to the saved locale cookie's value", () => {
    document.cookie = "kindle-nonograms-locale=fr; path=/";

    runEarlyLangScript();

    expect(document.documentElement.lang).toBe("fr");
  });

  it("finds the locale cookie among other cookies, even one whose name embeds it as a substring", () => {
    document.cookie = "other-kindle-nonograms-locale-flag=1; path=/";
    document.cookie = "kindle-nonograms-locale=fr; path=/";

    runEarlyLangScript();

    expect(document.documentElement.lang).toBe("fr");
  });

  it("leaves the baked-in default lang untouched when no locale cookie is saved", () => {
    runEarlyLangScript();

    expect(document.documentElement.lang).toBe("en");
  });

  it("leaves the baked-in default lang untouched when the saved cookie value is not a supported locale", () => {
    document.cookie = "kindle-nonograms-locale=de; path=/";

    runEarlyLangScript();

    expect(document.documentElement.lang).toBe("en");
  });

  it("does not throw and leaves lang untouched when reading document.cookie throws", () => {
    vi.spyOn(document, "cookie", "get").mockImplementation(() => {
      throw new Error("cookies disabled");
    });

    expect(() => runEarlyLangScript()).not.toThrow();
    expect(document.documentElement.lang).toBe("en");
  });
});
