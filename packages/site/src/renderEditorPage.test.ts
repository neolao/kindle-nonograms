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
    // Renders a <table> now too (the canvas's default grid — see the next
    // test), so it can no longer be *this* page's distinguishing marker;
    // the other pages' own embedded-data markers must still be absent so
    // this page's static shell can never be mistaken for the play or
    // library page by their own self-detection checks (see main.ts's doc
    // comment and hydratePlayPage.ts, which now detects the play page via
    // `#puzzle-data` rather than `<table>` for exactly this reason).
    expect(doc.getElementById("puzzle-data")).toBeNull();
    expect(doc.getElementById("puzzles-data")).toBeNull();
  });

  it("bakes the editor's fixed default (5×5, one black color, Paint mode) into the static markup, so it looks complete before hydration runs", () => {
    const doc = parse(renderEditorPage());

    const palette = doc.querySelector('[data-role="editor-palette"]');
    const swatch = palette?.querySelector('[data-role="swatch"]');
    expect(swatch?.getAttribute("aria-pressed")).toBe("true");
    expect(swatch?.getAttribute("style")).toContain("background-color:#000000");
    expect(
      palette
        ?.querySelector('[data-role="palette-remove"]')
        ?.hasAttribute("disabled"),
    ).toBe(true);

    const gridWrapper = doc.querySelector('[data-role="editor-grid-wrapper"]');
    expect(gridWrapper?.closest(".grid-center")).not.toBeNull();
    expect(gridWrapper?.querySelectorAll("td")).toHaveLength(25);

    const toolbar = doc.querySelector('[data-role="editor-toolbar"]');
    const paintButton = toolbar?.querySelector('[data-role="mode-paint"]');
    const eraseButton = toolbar?.querySelector('[data-role="mode-erase"]');
    expect(paintButton?.getAttribute("aria-pressed")).toBe("true");
    expect(eraseButton?.getAttribute("aria-pressed")).toBe("false");
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

  it("renders the image import controls: file, palette size, background color, and an Import button", () => {
    const doc = parse(renderEditorPage());

    const file = doc.querySelector('[data-role="editor-import-file"]');
    expect(file?.tagName).toBe("INPUT");
    expect(file?.getAttribute("type")).toBe("file");
    expect(file?.getAttribute("accept")).toBe("image/png,image/jpeg");

    const paletteSize = doc.querySelector(
      '[data-role="editor-import-palette-size"]',
    );
    expect(paletteSize?.getAttribute("type")).toBe("number");
    expect(paletteSize?.getAttribute("min")).toBe("1");
    expect(paletteSize?.getAttribute("max")).toBe("16");

    const background = doc.querySelector(
      '[data-role="editor-import-background"]',
    );
    expect(background?.getAttribute("type")).toBe("color");

    expect(
      doc.querySelector('[data-role="editor-import-button"]')?.tagName,
    ).toBe("BUTTON");
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
