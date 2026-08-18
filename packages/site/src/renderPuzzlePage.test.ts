// @vitest-environment jsdom
import type { Puzzle } from "@kindle-nonograms/shared";
import { describe, expect, it } from "vitest";
import { renderPuzzlePage } from "./renderPuzzlePage.js";

const multiColorPuzzle: Puzzle = {
  id: "fixture",
  name: "Fixture",
  width: 3,
  height: 2,
  palette: ["#ff0000", "#0000ff"],
  cells: [
    [0, null, 1],
    [0, 0, 1],
  ],
};

function parse(html: string): Document {
  return new DOMParser().parseFromString(html, "text/html");
}

function runTexts(cell: Element | null): string[] {
  return Array.from(cell?.querySelectorAll(".run") ?? []).map(
    (run) => run.textContent ?? "",
  );
}

describe("renderPuzzlePage", () => {
  it("renders the correct row and column clue numbers for a multi-color fixture", () => {
    const doc = parse(renderPuzzlePage(multiColorPuzzle));

    const rowHeaders = doc.querySelectorAll("tbody th");
    expect(runTexts(rowHeaders[0])).toEqual(["1", "1"]);
    expect(runTexts(rowHeaders[1])).toEqual(["2", "1"]);

    const columnHeaders = doc.querySelectorAll("thead th.column-clue");
    expect(runTexts(columnHeaders[0])).toEqual(["2"]);
    expect(runTexts(columnHeaders[1])).toEqual(["1"]);
    expect(runTexts(columnHeaders[2])).toEqual(["2"]);
  });

  it("gives runs of different palette colors distinct color classes", () => {
    const doc = parse(renderPuzzlePage(multiColorPuzzle));

    const runs = doc.querySelectorAll(".run");
    const colorClasses = new Set(
      Array.from(runs).map((run) =>
        Array.from(run.classList).find((c) => c.startsWith("run-c")),
      ),
    );

    expect(colorClasses).toEqual(new Set(["run-c0", "run-c1"]));
  });

  it("renders a plain '0' with no color markup for an entirely empty line", () => {
    const emptyRowPuzzle: Puzzle = {
      id: "empty-row",
      name: "Empty row",
      width: 2,
      height: 1,
      palette: ["#ff0000"],
      cells: [[null, null]],
    };

    const doc = parse(renderPuzzlePage(emptyRowPuzzle));
    const rowHeader = doc.querySelector("tbody th");

    expect(rowHeader?.textContent?.trim()).toBe("0");
    expect(rowHeader?.querySelector(".run")).toBeNull();
  });

  it("renders plain unadorned numbers for a single-color puzzle", () => {
    const singleColorPuzzle: Puzzle = {
      id: "mono",
      name: "Mono",
      width: 2,
      height: 1,
      palette: ["#000000"],
      cells: [[0, 0]],
    };

    const doc = parse(renderPuzzlePage(singleColorPuzzle));
    const rowHeader = doc.querySelector("tbody th");

    expect(rowHeader?.textContent?.trim()).toBe("2");
    expect(rowHeader?.querySelector(".run")).toBeNull();
  });

  it("renders empty, solution-blind grid cells addressable by row and column", () => {
    const doc = parse(renderPuzzlePage(multiColorPuzzle));
    const cells = doc.querySelectorAll("tbody td");

    expect(cells).toHaveLength(6);
    for (const cell of Array.from(cells)) {
      expect(cell.textContent?.trim()).toBe("");
      expect(cell.getAttribute("style")).toBeNull();
      expect(cell.hasAttribute("data-row")).toBe(true);
      expect(cell.hasAttribute("data-col")).toBe(true);
    }

    expect(cells[0]?.getAttribute("data-row")).toBe("0");
    expect(cells[0]?.getAttribute("data-col")).toBe("0");
    expect(cells[5]?.getAttribute("data-row")).toBe("1");
    expect(cells[5]?.getAttribute("data-col")).toBe("2");
  });

  it("embeds the puzzle as JSON that round-trips to the original data, including the solution", () => {
    const doc = parse(renderPuzzlePage(multiColorPuzzle));
    const payload = doc.querySelector('script[type="application/json"]');

    expect(payload).not.toBeNull();
    expect(JSON.parse(payload?.textContent ?? "null")).toEqual(
      multiColorPuzzle,
    );
  });

  it("escapes an embedded </script> sequence in puzzle content instead of breaking out of the page", () => {
    const maliciousPuzzle: Puzzle = {
      ...multiColorPuzzle,
      id: "cat</script><script>alert(1)</script>",
    };

    const html = renderPuzzlePage(maliciousPuzzle);
    const doc = parse(html);

    // Escaping worked if the malicious id never created real extra <script>
    // elements — only the page's own two (JSON payload + module bundle).
    expect(doc.querySelectorAll("script")).toHaveLength(2);

    const payload = doc.querySelector('script[type="application/json"]');
    expect(JSON.parse(payload?.textContent ?? "null")).toEqual(maliciousPuzzle);
  });

  it("escapes special characters in the puzzle name instead of injecting markup", () => {
    const puzzleWithMarkupName: Puzzle = {
      ...multiColorPuzzle,
      name: "<b>Bold</b>",
    };

    const doc = parse(renderPuzzlePage(puzzleWithMarkupName));
    const heading = doc.querySelector("h1");

    expect(heading?.querySelector("b")).toBeNull();
    expect(heading?.textContent).toContain("<b>Bold</b>");
  });

  it("references the client bundle with a relative path that has no leading slash", () => {
    const doc = parse(renderPuzzlePage(multiColorPuzzle));
    const script = doc.querySelector('script[type="module"]');
    const src = script?.getAttribute("src") ?? "";

    expect(src).not.toBe("");
    expect(src.startsWith("/")).toBe(false);
    expect(src.startsWith("http")).toBe(false);
  });

  it("appends the given asset version as a query string on the client bundle script", () => {
    const doc = parse(renderPuzzlePage(multiColorPuzzle, "abc123ef"));
    const script = doc.querySelector('script[type="module"]');

    expect(script?.getAttribute("src")).toBe("../../assets/main.js?v=abc123ef");
  });

  it("hides grid overflow instead of exposing a horizontal scrollbar", () => {
    const doc = parse(renderPuzzlePage(multiColorPuzzle));
    const css = doc.querySelector("style")?.textContent ?? "";

    expect(css).toMatch(/\.grid-wrapper\{[^}]*overflow:hidden/);
    expect(css).not.toContain("overflow-x");
  });

  it("frames the grid with its own border, sized so the border can't push it past its computed cap", () => {
    const doc = parse(renderPuzzlePage(multiColorPuzzle));
    const css = doc.querySelector("style")?.textContent ?? "";

    expect(css).toMatch(/\.grid-wrapper\{[^}]*border:/);
    expect(css).toMatch(/\.grid-wrapper\{[^}]*box-sizing:border-box/);
  });

  it("wraps the heading and back-link in their own bordered, shadowed panel, kept separate from the grid", () => {
    const doc = parse(renderPuzzlePage(multiColorPuzzle));

    const chromePanel = doc.querySelector(".chrome-panel");
    expect(chromePanel).not.toBeNull();
    expect(chromePanel?.querySelector("h1")).not.toBeNull();
    expect(chromePanel?.querySelector(".page-header")).not.toBeNull();
    expect(chromePanel?.querySelector(".grid-wrapper")).toBeNull();
    expect(chromePanel?.querySelector("table")).toBeNull();
  });

  it("rounds the corners of the chrome panel and the grid's own frame", () => {
    const doc = parse(renderPuzzlePage(multiColorPuzzle));
    const css = doc.querySelector("style")?.textContent ?? "";

    expect(css).toMatch(/\.chrome-panel\{[^}]*border-radius:\d+px/);
    expect(css).toMatch(/\.grid-wrapper\{[^}]*border-radius:\d+px/);
  });

  it("shows a decorative dot row before the heading", () => {
    const doc = parse(renderPuzzlePage(multiColorPuzzle));

    const dotRow = doc.querySelector(".dot-row");
    expect(dotRow).not.toBeNull();
    expect(dotRow?.getAttribute("aria-hidden")).toBe("true");
    expect(dotRow?.nextElementSibling?.tagName).toBe("H1");
  });

  it("uses the shared design tokens' font stack instead of a hardcoded font", () => {
    const doc = parse(renderPuzzlePage(multiColorPuzzle));
    const css = doc.querySelector("style")?.textContent ?? "";

    expect(css).toContain(
      'font-family:"Helvetica Neue", Helvetica, Arial, sans-serif',
    );
  });

  it("renders a static, translatable link back to the puzzle library", () => {
    const doc = parse(renderPuzzlePage(multiColorPuzzle));
    const link = doc.querySelector<HTMLAnchorElement>("a.back-link");

    expect(link).not.toBeNull();
    expect(link?.getAttribute("data-i18n")).toBe("play.backToLibrary");
    expect(link?.getAttribute("href")).toBe("../../");
    expect(link?.textContent).toBe("Back to puzzle list");
  });

  it("places the back-link in a header row alongside where the language switcher is inserted", () => {
    const doc = parse(renderPuzzlePage(multiColorPuzzle));
    const link = doc.querySelector<HTMLAnchorElement>("a.back-link");
    if (!link) {
      throw new Error("back-link not found");
    }

    expect(link.closest(".page-header")).not.toBeNull();
  });
});
