// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { renderEditorPage } from "./renderEditorPage.js";

function parse(html: string): Document {
  return new DOMParser().parseFromString(html, "text/html");
}

describe("renderEditorPage", () => {
  it("links a favicon relative to the site root, one level up from the editor page", () => {
    const doc = parse(renderEditorPage());
    const icon = doc.querySelector('link[rel="icon"]');

    expect(icon?.getAttribute("href")).toBe("../favicon.svg");
    expect(icon?.getAttribute("type")).toBe("image/svg+xml");
  });

  it("renders a back-link to the library and a translated heading", () => {
    const doc = parse(renderEditorPage());
    const backLink = doc.querySelector(".back-link");

    expect(backLink?.getAttribute("href")).toBe("../");
    expect(doc.querySelector("h1")?.getAttribute("data-i18n")).toBe(
      "editor.title",
    );
  });

  it("carries a unique self-detection marker distinct from every other page shape", () => {
    const doc = parse(renderEditorPage());

    expect(doc.querySelector('[data-role="editor-page"]')).not.toBeNull();
    // Never statically renders a <table> (built later by hydration) or the
    // other pages' own embedded-data markers, so this page's static shell
    // can never be mistaken for the play or library page by their own
    // self-detection checks (see main.ts's doc comment and the project's
    // own "two page shapes satisfying the same marker" precedent).
    expect(doc.querySelector("table")).toBeNull();
    expect(doc.getElementById("puzzle-data")).toBeNull();
    expect(doc.getElementById("puzzles-data")).toBeNull();
  });

  it("reserves empty containers for hydration to fill: palette, grid wrapper, toolbar", () => {
    const doc = parse(renderEditorPage());

    const palette = doc.querySelector('[data-role="editor-palette"]');
    const gridWrapper = doc.querySelector('[data-role="editor-grid-wrapper"]');
    const toolbar = doc.querySelector('[data-role="editor-toolbar"]');

    expect(palette).not.toBeNull();
    expect(palette?.children).toHaveLength(0);
    expect(gridWrapper).not.toBeNull();
    expect(gridWrapper?.children).toHaveLength(0);
    expect(gridWrapper?.closest(".grid-center")).not.toBeNull();
    expect(toolbar).not.toBeNull();
    expect(toolbar?.children).toHaveLength(0);
  });

  it("renders width/height number inputs with a minimum of 1", () => {
    const doc = parse(renderEditorPage());

    const width = doc.querySelector('[data-role="editor-width"]');
    const height = doc.querySelector('[data-role="editor-height"]');

    expect(width?.getAttribute("type")).toBe("number");
    expect(width?.getAttribute("min")).toBe("1");
    expect(height?.getAttribute("type")).toBe("number");
    expect(height?.getAttribute("min")).toBe("1");
  });

  it("renders name and filename text inputs plus an Export button", () => {
    const doc = parse(renderEditorPage());

    expect(doc.querySelector('[data-role="editor-name"]')?.tagName).toBe(
      "INPUT",
    );
    expect(doc.querySelector('[data-role="editor-filename"]')?.tagName).toBe(
      "INPUT",
    );
    expect(doc.querySelector('[data-role="editor-export"]')?.tagName).toBe(
      "BUTTON",
    );
  });

  it("reserves an empty, accessible error region near the export action", () => {
    const doc = parse(renderEditorPage());
    const error = doc.querySelector('[data-role="editor-error"]');

    expect(error).not.toBeNull();
    expect(error?.getAttribute("aria-live")).toBe("polite");
    expect(error?.textContent).toBe("");
  });

  it("references the shared client bundle one directory up, versioned when given", () => {
    const doc = parse(renderEditorPage("abc123"));
    const script = doc.querySelector('script[type="module"]');

    expect(script?.getAttribute("src")).toBe("../assets/main.js?v=abc123");
  });

  it("references the shared client bundle with no version query when none is given", () => {
    const doc = parse(renderEditorPage());
    const script = doc.querySelector('script[type="module"]');

    expect(script?.getAttribute("src")).toBe("../assets/main.js");
  });
});
