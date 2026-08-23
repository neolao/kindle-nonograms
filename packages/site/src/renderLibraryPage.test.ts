// @vitest-environment jsdom
import type { Puzzle } from "@kindle-nonograms/shared";
import { describe, expect, it } from "vitest";
import { renderLibraryPage } from "./renderLibraryPage.js";

const puzzles: Puzzle[] = [
  {
    id: "sailboat",
    name: "Sailboat",
    width: 20,
    height: 20,
    palette: ["#000000"],
    cells: Array.from({ length: 20 }, () => Array(20).fill(null)),
  },
  {
    id: "cat",
    name: "Cat",
    width: 10,
    height: 15,
    palette: ["#000000"],
    cells: Array.from({ length: 15 }, () => Array(10).fill(null)),
  },
];

function parse(html: string): Document {
  return new DOMParser().parseFromString(html, "text/html");
}

describe("renderLibraryPage", () => {
  it("links a favicon relative to the site root", () => {
    const doc = parse(renderLibraryPage(puzzles));
    const icon = doc.querySelector('link[rel="icon"]');

    expect(icon?.getAttribute("href")).toBe("./favicon.svg");
    expect(icon?.getAttribute("type")).toBe("image/svg+xml");
  });

  it("lists every puzzle with a relative link and its size in the accessible link name", () => {
    const doc = parse(renderLibraryPage(puzzles));
    const links = doc.querySelectorAll("li a");

    expect(links).toHaveLength(2);
    expect(links[0]?.getAttribute("href")).toBe("puzzles/sailboat/");
    expect(links[0]?.textContent).toContain("Sailboat");
    expect(links[0]?.textContent).toContain("20");
    expect(links[1]?.getAttribute("href")).toBe("puzzles/cat/");
    expect(links[1]?.textContent).toContain("Cat");
  });

  it("tags every row with the puzzle id for later hydration to find it", () => {
    const doc = parse(renderLibraryPage(puzzles));
    const items = doc.querySelectorAll("li");

    expect(items[0]?.getAttribute("data-puzzle-id")).toBe("sailboat");
    expect(items[1]?.getAttribute("data-puzzle-id")).toBe("cat");
  });

  it("reserves a hidden solved-badge node in every row for hydration to reveal", () => {
    const doc = parse(renderLibraryPage(puzzles));
    const items = doc.querySelectorAll("li");

    for (const item of Array.from(items)) {
      const badge = item.querySelector(".solved-badge");
      expect(badge).not.toBeNull();
      expect(badge?.hasAttribute("hidden")).toBe(true);
    }
  });

  it("renders a message and no list element when there are no puzzles", () => {
    const doc = parse(renderLibraryPage([]));

    expect(doc.querySelector("ul")).toBeNull();
    expect(doc.body.textContent).toMatch(/no puzzles/i);
  });

  it("links to the puzzle editor even when the library is empty", () => {
    const withPuzzles = parse(renderLibraryPage(puzzles));
    const empty = parse(renderLibraryPage([]));

    for (const doc of [withPuzzles, empty]) {
      const link = doc.querySelector('a[href="editor/"]');
      expect(link).not.toBeNull();
      expect(link?.getAttribute("data-i18n")).toBe("library.createPuzzleLink");
    }
  });

  it("escapes special characters in a puzzle's name instead of injecting markup", () => {
    const doc = parse(
      renderLibraryPage([
        {
          id: "weird",
          name: "<b>Bold</b>",
          width: 5,
          height: 5,
          palette: ["#000000"],
          cells: Array.from({ length: 5 }, () => Array(5).fill(null)),
        },
      ]),
    );

    expect(doc.querySelector("li b")).toBeNull();
    expect(doc.querySelector("li a")?.textContent).toContain("<b>Bold</b>");
  });

  it("references the client bundle with a relative path that has no leading slash", () => {
    const doc = parse(renderLibraryPage(puzzles));
    const script = doc.querySelector('script[type="module"]');
    const src = script?.getAttribute("src") ?? "";

    expect(src).not.toBe("");
    expect(src.startsWith("/")).toBe(false);
    expect(src.startsWith("http")).toBe(false);
  });

  it("embeds every puzzle's full data as JSON that round-trips, for later solved-state checking", () => {
    const doc = parse(renderLibraryPage(puzzles));
    const payload = doc.querySelector('script[type="application/json"]');

    expect(payload).not.toBeNull();
    expect(JSON.parse(payload?.textContent ?? "null")).toEqual(puzzles);
  });

  it("escapes an embedded </script> sequence in puzzle content instead of breaking out of the page", () => {
    const maliciousPuzzles: Puzzle[] = [
      { ...puzzles[0], id: "cat</script><script>alert(1)</script>" },
    ];

    const doc = parse(renderLibraryPage(maliciousPuzzles));

    expect(doc.querySelectorAll("script")).toHaveLength(2);
    const payload = doc.querySelector('script[type="application/json"]');
    expect(JSON.parse(payload?.textContent ?? "null")).toEqual(
      maliciousPuzzles,
    );
  });

  it("does not render any puzzle solution content in the visible list markup", () => {
    const doc = parse(renderLibraryPage(puzzles));
    const items = doc.querySelectorAll("li");

    for (const item of Array.from(items)) {
      expect(item.querySelector("table")).toBeNull();
      expect(item.innerHTML).not.toContain("#000000");
    }
  });

  it("reserves a neutral, solution-independent thumbnail placeholder in every row", () => {
    const doc = parse(renderLibraryPage(puzzles));
    const items = doc.querySelectorAll("li");

    for (const item of Array.from(items)) {
      const thumb = item.querySelector(".thumb");
      expect(thumb).not.toBeNull();
      expect(thumb?.getAttribute("aria-hidden")).toBe("true");
      expect(thumb?.textContent?.trim()).toBe("?");
    }
  });

  it("appends the given asset version as a query string on the client bundle script", () => {
    const doc = parse(renderLibraryPage(puzzles, "abc123ef"));
    const script = doc.querySelector('script[type="module"]');

    expect(script?.getAttribute("src")).toBe("./assets/main.js?v=abc123ef");
  });

  it("tags the title with its translation key while keeping the default English text", () => {
    const doc = parse(renderLibraryPage(puzzles));
    const heading = doc.querySelector("h1");

    expect(heading?.getAttribute("data-i18n")).toBe("library.title");
    expect(heading?.textContent).toBe("Kindle Nonograms");
  });

  it("tags the empty-state message with its translation key while keeping the default English text", () => {
    const doc = parse(renderLibraryPage([]));
    const message = doc.querySelector("[data-i18n='library.empty']");

    expect(message?.textContent).toBe("No puzzles are available yet.");
  });

  it("tags every solved badge with its translation key while keeping the default English text", () => {
    const doc = parse(renderLibraryPage(puzzles));
    const badges = doc.querySelectorAll("[data-i18n='library.solvedBadge']");

    expect(badges).toHaveLength(puzzles.length);
    for (const badge of Array.from(badges)) {
      expect(badge.textContent).toBe("Solved");
    }
  });

  it("uses the shared design tokens' font stack, consistent with the puzzle page", () => {
    const doc = parse(renderLibraryPage(puzzles));
    const css = doc.querySelector("style")?.textContent ?? "";

    expect(css).toContain(
      'font-family:"Helvetica Neue", Helvetica, Arial, sans-serif',
    );
  });

  it("renders each puzzle row as its own separate, bordered card with a gap between cards", () => {
    const doc = parse(renderLibraryPage(puzzles));
    const css = doc.querySelector("style")?.textContent ?? "";

    expect(css).toMatch(/ul\{[^}]*display:flex/);
    expect(css).toMatch(/ul\{[^}]*gap:\d+px/);
    expect(css).toMatch(/li\{[^}]*border:/);
    expect(css).toMatch(/li\{[^}]*box-shadow:/);
  });

  it("rounds each card's corners and gives it a colored top stripe", () => {
    const doc = parse(renderLibraryPage(puzzles));
    const css = doc.querySelector("style")?.textContent ?? "";

    expect(css).toMatch(/li\{[^}]*border-radius:\d+px/);
    expect(css).toMatch(/li\{[^}]*border-top-width:\d+px/);
  });

  it("no longer cycles the top stripe through position-based accent colors", () => {
    const doc = parse(renderLibraryPage(puzzles));
    const css = doc.querySelector("style")?.textContent ?? "";

    expect(css).not.toMatch(/li:nth-child/);
  });

  it("constrains the stripe to a fixed-height band pinned to the card's top, not the whole card", () => {
    const doc = parse(renderLibraryPage(puzzles));
    const css = doc.querySelector("style")?.textContent ?? "";

    expect(css).toMatch(/li\{[^}]*border-top-color:transparent/);
    expect(css).toMatch(/li\{[^}]*background-repeat:no-repeat/);
    expect(css).toMatch(/li\{[^}]*background-position:top/);
    expect(css).toMatch(/li\{[^}]*background-size:100% 6px/);
  });

  it("gives each card its own stripe class matching its position in the list", () => {
    const doc = parse(renderLibraryPage(puzzles));
    const items = doc.querySelectorAll("li");

    expect(items[0]?.classList.contains("stripe-0")).toBe(true);
    expect(items[1]?.classList.contains("stripe-1")).toBe(true);
  });

  it("shows a solid black top stripe for a monochrome puzzle, regardless of its actual palette color", () => {
    const nonBlackMono: Puzzle = {
      id: "mono",
      name: "Mono",
      width: 3,
      height: 3,
      palette: ["#e63946"],
      cells: Array.from({ length: 3 }, () => Array(3).fill(null)),
    };
    const doc = parse(renderLibraryPage([nonBlackMono]));
    const css = doc.querySelector("style")?.textContent ?? "";
    const rule = /\.stripe-0\{[^}]*\}/.exec(css)?.[0] ?? "";

    expect(rule).toContain("linear-gradient(#000000, #000000)");
    expect(rule).not.toContain("#e63946");
  });

  it("splits the top stripe into equal hard-stop segments in palette order for a multi-color puzzle", () => {
    const quad: Puzzle = {
      id: "quad",
      name: "Quad",
      width: 4,
      height: 4,
      palette: ["#e63946", "#f1a208", "#2a9d8f", "#264653"],
      cells: Array.from({ length: 4 }, () => Array(4).fill(null)),
    };
    const doc = parse(renderLibraryPage([quad]));
    const css = doc.querySelector("style")?.textContent ?? "";
    const rule = /\.stripe-0\{[^}]*\}/.exec(css)?.[0] ?? "";

    expect(rule).toContain(
      "linear-gradient(to right, #e63946 0%, #e63946 25%, #f1a208 25%, #f1a208 50%, #2a9d8f 50%, #2a9d8f 75%, #264653 75%, #264653 100%)",
    );
  });

  it("falls back to black for a palette entry that isn't a valid hex color, instead of injecting it into the stylesheet", () => {
    const malicious: Puzzle = {
      id: "bad",
      name: "Bad",
      width: 2,
      height: 2,
      palette: ["#fff", "red;}body{display:none"],
      cells: Array.from({ length: 2 }, () => Array(2).fill(null)),
    };
    const doc = parse(renderLibraryPage([malicious]));
    const css = doc.querySelector("style")?.textContent ?? "";
    const rule = /\.stripe-0\{[^}]*\}/.exec(css)?.[0] ?? "";

    expect(css).not.toContain("red;}body{display:none");
    expect(rule).toContain(
      "linear-gradient(to right, #fff 0%, #fff 50%, #000000 50%, #000000 100%)",
    );
  });

  it("gives every row link at least the minimum tap target height", () => {
    const doc = parse(renderLibraryPage(puzzles));
    const css = doc.querySelector("style")?.textContent ?? "";

    expect(css).toMatch(/li a\{[^}]*min-height:44px/);
  });

  it("removes the browser's default underline and fixes a neutral text color that never changes once a puzzle page has been visited", () => {
    const doc = parse(renderLibraryPage(puzzles));
    const css = doc.querySelector("style")?.textContent ?? "";

    expect(css).toMatch(/li a\{[^}]*text-decoration:none/);
    expect(css).toMatch(/li a\{[^}]*color:#111111/);
    // The whole point is no color change after a visit — an explicit
    // :visited override (even one that repeats the same value) would be
    // a smell that something upstream still expects the default to win.
    expect(css).not.toContain(":visited");
  });

  it("gives the puzzle name the label font, matching the site's other short UI labels", () => {
    const doc = parse(renderLibraryPage(puzzles));
    const css = doc.querySelector("style")?.textContent ?? "";

    expect(css).toMatch(/li a\{[^}]*font-family:ui-monospace/);
  });

  it("vertically centers the row link's text instead of letting it sit at the top of the row", () => {
    const doc = parse(renderLibraryPage(puzzles));
    const css = doc.querySelector("style")?.textContent ?? "";

    expect(css).toMatch(/li a\{[^}]*display:flex/);
    expect(css).toMatch(/li a\{[^}]*align-items:center/);
  });

  it("truncates a long puzzle name with an ellipsis instead of wrapping and inflating that row's height", () => {
    const doc = parse(renderLibraryPage(puzzles));
    const css = doc.querySelector("style")?.textContent ?? "";

    expect(css).toMatch(/li a\{[^}]*white-space:nowrap/);
    expect(css).toMatch(/li a\{[^}]*text-overflow:ellipsis/);
    // min-width:0 is required for ellipsis to take effect on a flex
    // item — without it, a flex child never shrinks below its content's
    // natural width, so overflow/ellipsis silently never fires (same
    // gotcha already fixed for the puzzle page's own heading).
    expect(css).toMatch(/li a\{[^}]*min-width:0/);
  });

  it("renders the solved badge as a bordered, rotated stamp instead of plain text", () => {
    const doc = parse(renderLibraryPage(puzzles));
    const css = doc.querySelector("style")?.textContent ?? "";

    expect(css).toMatch(/\.solved-badge\{[^}]*border:/);
    expect(css).toMatch(/\.solved-badge\{[^}]*transform:rotate\(-?\d+deg\)/);
  });

  it("colors the solved stamp with the 'completed' accent, matching the win banner's color", () => {
    const doc = parse(renderLibraryPage(puzzles));
    const css = doc.querySelector("style")?.textContent ?? "";

    expect(css).toMatch(/\.solved-badge\{[^}]*#0b7a68/);
  });

  it("rounds the corners of the thumbnail box and the solved stamp", () => {
    const doc = parse(renderLibraryPage(puzzles));
    const css = doc.querySelector("style")?.textContent ?? "";

    expect(css).toMatch(/\.thumb\{[^}]*border-radius:\d+px/);
    expect(css).toMatch(/\.solved-badge\{[^}]*border-radius:\d+px/);
  });

  it("wraps the page content in a bordered, shadowed panel", () => {
    const doc = parse(renderLibraryPage(puzzles));

    const panel = doc.querySelector(".panel");
    expect(panel).not.toBeNull();
    expect(panel?.querySelector("h1")).not.toBeNull();
    expect(panel?.querySelector("ul")).not.toBeNull();
  });

  it("shows a decorative dot row before the heading", () => {
    const doc = parse(renderLibraryPage(puzzles));

    const dotRow = doc.querySelector(".dot-row");
    expect(dotRow).not.toBeNull();
    expect(dotRow?.getAttribute("aria-hidden")).toBe("true");
    expect(dotRow?.nextElementSibling?.tagName).toBe("H1");
  });

  it("labels the puzzle list with a translatable, rule-flanked section label", () => {
    const doc = parse(renderLibraryPage(puzzles));

    const label = doc.querySelector(".section-label");
    expect(label).not.toBeNull();
    expect(label?.getAttribute("data-i18n")).toBe("library.sectionLabel");
    expect(label?.textContent).toBe("Choose a puzzle");
  });

  it("tags every row with its size bucket and color type for client-side filtering", () => {
    const filterablePuzzles: Puzzle[] = [
      {
        id: "small-mono",
        name: "Small Mono",
        width: 4,
        height: 4,
        palette: ["#000000"],
        cells: Array.from({ length: 4 }, () => Array(4).fill(null)),
      },
      {
        id: "medium-multi",
        name: "Medium Multi",
        width: 15,
        height: 15,
        palette: ["#000000", "#ff0000"],
        cells: Array.from({ length: 15 }, () => Array(15).fill(null)),
      },
      {
        id: "large-mono",
        name: "Large Mono",
        width: 25,
        height: 25,
        palette: ["#000000"],
        cells: Array.from({ length: 25 }, () => Array(25).fill(null)),
      },
    ];

    const doc = parse(renderLibraryPage(filterablePuzzles));
    const items = doc.querySelectorAll("li");

    expect(items[0]?.getAttribute("data-size-bucket")).toBe("small");
    expect(items[0]?.getAttribute("data-color-type")).toBe("mono");
    expect(items[1]?.getAttribute("data-size-bucket")).toBe("medium");
    expect(items[1]?.getAttribute("data-color-type")).toBe("multi");
    expect(items[2]?.getAttribute("data-size-bucket")).toBe("large");
    expect(items[2]?.getAttribute("data-color-type")).toBe("mono");
  });
});
