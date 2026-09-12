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
  it("links a favicon relative to the site root, two levels up from a puzzle page", () => {
    const doc = parse(renderPuzzlePage(multiColorPuzzle));
    const icon = doc.querySelector('link[rel="icon"]');

    expect(icon?.getAttribute("href")).toBe("../../favicon.svg");
    expect(icon?.getAttribute("type")).toBe("image/svg+xml");
  });

  it("numbers each color swatch's accessible name in palette order, starting at 1", () => {
    const doc = parse(renderPuzzlePage(multiColorPuzzle));

    const swatches = doc.querySelectorAll('[data-role="swatch"]');
    expect(swatches).toHaveLength(2);
    expect(swatches[0]?.getAttribute("aria-label")).toBe("Color 1");
    expect(swatches[1]?.getAttribute("aria-label")).toBe("Color 2");
  });

  it("marks each color swatch's aria-label as retranslatable via data-i18n-aria", () => {
    const doc = parse(renderPuzzlePage(multiColorPuzzle));

    const swatch = doc.querySelector('[data-role="swatch"]');
    expect(swatch?.getAttribute("data-i18n-aria")).toBe(
      "play.swatchColorAriaLabel",
    );
  });

  it("renders no swatch aria-labels for a single-color puzzle, which has no swatches at all", () => {
    const soloPuzzle: Puzzle = {
      id: "solo",
      name: "Solo",
      width: 1,
      height: 1,
      palette: ["#000000"],
      cells: [[0]],
    };
    const doc = parse(renderPuzzlePage(soloPuzzle));

    expect(doc.querySelectorAll('[data-role="swatch"]')).toHaveLength(0);
  });

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

  it("gives every div of a stacked multi-color column clue with more than one run a spacing class, with a CSS rule that only adds margin from the second one on", () => {
    const stackedMultiRunPuzzle: Puzzle = {
      id: "stacked-multi-run",
      name: "Stacked multi-run",
      width: 1,
      height: 3,
      palette: ["#ff0000", "#0000ff"],
      cells: [[0], [null], [1]],
    };

    const doc = parse(renderPuzzlePage(stackedMultiRunPuzzle));
    const columnHeader = doc.querySelector("thead th.column-clue");
    const runDivs = columnHeader?.querySelectorAll(":scope > div") ?? [];

    expect(runDivs).toHaveLength(2);
    for (const div of Array.from(runDivs)) {
      expect(div.classList.contains("run-row")).toBe(true);
    }

    const css = doc.querySelector("style")?.textContent ?? "";
    expect(css).toMatch(
      /\.run-row\+\.run-row\{margin-top:(0\.\d+|[1-9][\d.]*)(em|px);\}/,
    );
  });

  it("gives a single-run stacked column clue's div no spacing class, since it has nothing to be spaced from", () => {
    const doc = parse(renderPuzzlePage(multiColorPuzzle));

    // Every column of the shared multi-color fixture resolves to a single run.
    const columnHeaders = doc.querySelectorAll("thead th.column-clue");
    for (const header of Array.from(columnHeaders)) {
      const div = header.querySelector(":scope > div");
      expect(div?.classList.contains("run-row")).toBe(false);
    }
  });

  it("gives a stacked multi-run single-color column clue's divs no spacing class, since runs there carry no border to separate", () => {
    const singleColorStackedPuzzle: Puzzle = {
      id: "stacked-mono",
      name: "Stacked mono",
      width: 1,
      height: 3,
      palette: ["#000000"],
      cells: [[0], [null], [0]],
    };

    const doc = parse(renderPuzzlePage(singleColorStackedPuzzle));
    const columnHeader = doc.querySelector("thead th.column-clue");
    const runDivs = columnHeader?.querySelectorAll(":scope > div") ?? [];

    expect(runDivs).toHaveLength(2);
    for (const div of Array.from(runDivs)) {
      expect(div.classList.contains("run-row")).toBe(false);
    }
  });

  it("renders an inline row clue with multiple runs as plain spans with no divs, so it is unaffected by stacked-clue spacing", () => {
    const doc = parse(renderPuzzlePage(multiColorPuzzle));

    const rowHeaders = doc.querySelectorAll("tbody th");
    // Fixture row 1 ("2 1") has two runs.
    expect(rowHeaders[1]?.querySelectorAll("div")).toHaveLength(0);
    expect(rowHeaders[1]?.querySelectorAll(".run")).toHaveLength(2);
  });

  it("falls back clue-run text to black when the palette color's contrast against white is too low, but keeps the border in the palette color", () => {
    // #ff0000 (pure red) is ~4:1 against white, below the WCAG normal-text
    // threshold (4.5:1); #0000ff (pure blue) is ~8.6:1, above it.
    const doc = parse(renderPuzzlePage(multiColorPuzzle));
    const css = doc.querySelector("style")?.textContent ?? "";

    expect(css).toMatch(/\.run-c0\{color:#000000;border:[^}]*#ff0000/);
    expect(css).toMatch(/\.run-c1\{color:#0000ff;border:[^}]*#0000ff/);
  });

  it("keeps clue-run numbers legible for a puzzle with a pale palette color", () => {
    const paleYellowPuzzle: Puzzle = {
      id: "pale",
      name: "Pale",
      width: 2,
      height: 1,
      palette: ["#ffff99", "#000080"],
      cells: [[0, 1]],
    };
    const doc = parse(renderPuzzlePage(paleYellowPuzzle));
    const css = doc.querySelector("style")?.textContent ?? "";

    // Pale yellow fails the contrast threshold: text falls back to black,
    // while its border cue (the color-identity signal) stays pale yellow.
    expect(css).toMatch(/\.run-c0\{color:#000000;border:[^}]*#ffff99/);
    // Navy clears the threshold: text stays navy, same as its border.
    expect(css).toMatch(/\.run-c1\{color:#000080;border:[^}]*#000080/);
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
    // elements — only the page's own three (early lang script + JSON
    // payload + module bundle).
    expect(doc.querySelectorAll("script")).toHaveLength(3);

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

  it("lets the grid wrapper scroll instead of clipping, now that the legibility floor can leave a puzzle wider than the viewport", () => {
    const doc = parse(renderPuzzlePage(multiColorPuzzle));
    const css = doc.querySelector("style")?.textContent ?? "";

    expect(css).toMatch(/\.grid-wrapper\{[^}]*overflow:auto/);
    expect(css).not.toMatch(/\.grid-wrapper\{[^}]*overflow:hidden/);
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

  it("wraps the grid frame in a centering container instead of letting it stretch full-width with the grid stuck on the left", () => {
    const doc = parse(renderPuzzlePage(multiColorPuzzle));
    const css = doc.querySelector("style")?.textContent ?? "";
    const gridWrapper = doc.querySelector(".grid-wrapper");

    expect(gridWrapper?.parentElement?.classList.contains("grid-center")).toBe(
      true,
    );
    expect(css).toMatch(/\.grid-center\{[^}]*text-align:center/);
    expect(css).toMatch(/\.grid-wrapper\{[^}]*display:inline-block/);
  });

  it("does not render the decorative dot row, to keep the header compact on this space-constrained page", () => {
    const doc = parse(renderPuzzlePage(multiColorPuzzle));

    expect(doc.querySelector(".dot-row")).toBeNull();
  });

  it("merges the heading into the header row instead of stacking it in its own row above", () => {
    const doc = parse(renderPuzzlePage(multiColorPuzzle));
    const heading = doc.querySelector("h1");

    expect(heading?.closest(".page-header")).not.toBeNull();
  });

  it("places the back-link before the heading, not grouped with the language switcher's controls", () => {
    const doc = parse(renderPuzzlePage(multiColorPuzzle));
    const link = doc.querySelector<HTMLAnchorElement>("a.back-link");
    const heading = doc.querySelector("h1");

    expect(link?.closest(".page-header-controls")).toBeNull();
    expect(
      link?.compareDocumentPosition(heading as Node) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("uses the shared design tokens' font stack instead of a hardcoded font", () => {
    const doc = parse(renderPuzzlePage(multiColorPuzzle));
    const css = doc.querySelector("style")?.textContent ?? "";

    expect(css).toContain(
      'font-family:"Helvetica Neue", Helvetica, Arial, sans-serif',
    );
  });

  it("renders a static link back to the puzzle library, as a compact icon with a visually-hidden accessible label", () => {
    const doc = parse(renderPuzzlePage(multiColorPuzzle));
    const link = doc.querySelector<HTMLAnchorElement>("a.back-link");

    expect(link).not.toBeNull();
    expect(link?.getAttribute("href")).toBe("../../");

    const icon = link?.querySelector('[aria-hidden="true"]');
    expect(icon?.textContent).toBe("←");

    const label = link?.querySelector(".sr-only");
    expect(label?.getAttribute("data-i18n")).toBe("play.backToLibrary");
    expect(label?.textContent).toBe("Back to puzzle list");
  });

  it("places the back-link in a header row alongside where the language switcher is inserted", () => {
    const doc = parse(renderPuzzlePage(multiColorPuzzle));
    const link = doc.querySelector<HTMLAnchorElement>("a.back-link");
    if (!link) {
      throw new Error("back-link not found");
    }

    expect(link.closest(".page-header")).not.toBeNull();
  });

  it("places the early lang-setting script immediately after the charset meta, ahead of styles and the module bundle", () => {
    const html = renderPuzzlePage(multiColorPuzzle);

    const charsetIndex = html.indexOf('<meta charset="UTF-8" />');
    const scriptIndex = html.indexOf("<script>");
    const styleIndex = html.indexOf("<style>");
    const moduleScriptIndex = html.indexOf('<script type="module"');

    expect(charsetIndex).toBeGreaterThan(-1);
    expect(scriptIndex).toBeGreaterThan(charsetIndex);
    expect(scriptIndex).toBeLessThan(styleIndex);
    expect(scriptIndex).toBeLessThan(moduleScriptIndex);
  });
});
