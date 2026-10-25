// @vitest-environment jsdom
import { type TranslationKey, translate } from "@kindle-nonograms/shared";
import { describe, expect, it } from "vitest";
import { renderSyncPage } from "./renderSyncPage.js";

function parse(html: string): Document {
  return new DOMParser().parseFromString(html, "text/html");
}

function role(doc: Document, name: string): HTMLElement {
  const element = doc.querySelector<HTMLElement>(`[data-role="${name}"]`);
  if (!element) {
    throw new Error(`missing data-role="${name}"`);
  }
  return element;
}

describe("renderSyncPage", () => {
  it("links a favicon one level up and a back-link to the library", () => {
    const doc = parse(renderSyncPage());

    expect(doc.querySelector('link[rel="icon"]')?.getAttribute("href")).toBe(
      "../favicon.svg",
    );
    expect(doc.querySelector(".back-link")?.getAttribute("href")).toBe("../");
    expect(doc.querySelector("h1")?.getAttribute("data-i18n")).toBe(
      "sync.title",
    );
  });

  it("carries its own unique marker and none of the other page shapes' markers", () => {
    const doc = parse(renderSyncPage());

    expect(doc.querySelectorAll('[data-role="sync-page"]')).toHaveLength(1);
    expect(doc.querySelector('[data-role="editor-page"]')).toBeNull();
    expect(doc.getElementById("puzzle-data")).toBeNull();
    expect(doc.getElementById("puzzles-data")).toBeNull();
    expect(doc.querySelector("table")).toBeNull();
  });

  it("states that sync is optional and that the game works without it", () => {
    const doc = parse(renderSyncPage());
    const note = doc.querySelector('[data-i18n="sync.optionalNote"]');

    expect(note?.textContent).toMatch(/optional/i);
    expect(note?.textContent).toMatch(/works fully without/i);
  });

  it("renders a required url field with a visible example hint instead of a placeholder", () => {
    const doc = parse(renderSyncPage());
    const url = role(doc, "sync-url") as HTMLInputElement;

    expect(url.getAttribute("type")).toBe("url");
    expect(url.required).toBe(true);
    expect(url.hasAttribute("placeholder")).toBe(false);
    expect(doc.querySelector(`label[for="${url.id}"]`)?.textContent).toMatch(
      /required/i,
    );
    const hintId = url.getAttribute("aria-describedby") ?? "";
    expect(doc.getElementById(hintId)?.textContent).toBe(
      "Example: http://192.168.1.20:3000",
    );
  });

  it("renders a required masked key field with a Show toggle that starts unpressed", () => {
    const doc = parse(renderSyncPage());
    const key = role(doc, "sync-key") as HTMLInputElement;
    const toggle = role(doc, "sync-key-toggle");

    expect(key.getAttribute("type")).toBe("password");
    expect(key.required).toBe(true);
    expect(key.hasAttribute("placeholder")).toBe(false);
    expect(key.getAttribute("autocomplete")).toBe("off");
    expect(doc.querySelector(`label[for="${key.id}"]`)).not.toBeNull();
    expect(toggle.tagName).toBe("BUTTON");
    expect(toggle.textContent).toBe("Show");
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
  });

  it("renders the Save and test and Forget buttons as real buttons", () => {
    const doc = parse(renderSyncPage());

    expect(role(doc, "sync-save").tagName).toBe("BUTTON");
    expect(role(doc, "sync-save").textContent).toBe("Save and test");
    expect(role(doc, "sync-forget").tagName).toBe("BUTTON");
    expect(role(doc, "sync-forget").textContent).toBe("Forget this server");
  });

  it("shows a polite live status that already says Not configured, plus a last-sync line with text", () => {
    const doc = parse(renderSyncPage());
    const status = role(doc, "sync-status");

    expect(status.getAttribute("aria-live")).toBe("polite");
    expect(status.textContent).toBe("Not configured");
    expect(role(doc, "sync-last").textContent).toBe("No sync yet");
  });

  it("gives every translated element a known key whose English text is baked in", () => {
    const doc = parse(renderSyncPage());
    const translated = Array.from(doc.querySelectorAll("[data-i18n]"));

    expect(translated.length).toBeGreaterThan(8);
    for (const element of translated) {
      const key = element.getAttribute("data-i18n") as TranslationKey;
      const english = translate("en", key);
      expect(english, key).toBeTypeOf("string");
      expect(element.textContent, key).toBe(english);
    }
  });

  it("renders the footer language switcher", () => {
    const doc = parse(renderSyncPage());

    expect(
      doc.querySelector('footer [data-role="language-switcher-select"]'),
    ).not.toBeNull();
  });

  it("loads only the shared bundle, so no control is built by an inline script", () => {
    const doc = parse(renderSyncPage("abc12345"));
    const modules = Array.from(doc.querySelectorAll('script[type="module"]'));

    expect(modules).toHaveLength(1);
    expect(modules[0].getAttribute("src")).toBe("../assets/main.js?v=abc12345");
    const json = doc.querySelectorAll('script[type="application/json"]');
    expect(json).toHaveLength(0);
  });

  it("styles tap targets of at least 44px, with no animation, transition or media query", () => {
    const css = parse(renderSyncPage()).querySelector("style")?.textContent;

    expect(css).toMatch(/\.sync-field input\{[^}]*min-height:44px/);
    expect(css).not.toMatch(/@media|transition|animation|@keyframes/);
    expect(css).not.toMatch(/var\(--/);
  });
});
