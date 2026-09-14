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

  it("exposes visually-hidden text stating the GitHub contribution link opens in a new tab", () => {
    const doc = parse(renderLibraryPage(puzzles));
    const link = doc.querySelector<HTMLAnchorElement>('a[target="_blank"]');

    expect(link).not.toBeNull();

    const arrow = link?.querySelector('[aria-hidden="true"]');
    expect(arrow?.textContent).toBe(" ↗");

    const label = link?.querySelector(".sr-only");
    expect(label?.getAttribute("data-i18n")).toBe("library.opensInNewTab");
    expect(label?.textContent).toBe("opens in a new tab");
  });

  it("keeps the visible arrow before the hidden new-tab text, both after the visible label", () => {
    const doc = parse(renderLibraryPage(puzzles));
    const link = doc.querySelector<HTMLAnchorElement>('a[target="_blank"]');
    if (!link) {
      throw new Error("contribute link not found");
    }

    const children = Array.from(link.children);
    const arrowIndex = children.findIndex((el) =>
      el.hasAttribute("aria-hidden"),
    );
    const labelIndex = children.findIndex((el) =>
      el.classList.contains("sr-only"),
    );

    expect(arrowIndex).toBeGreaterThan(0);
    expect(labelIndex).toBeGreaterThan(arrowIndex);
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

    // The page's own three <script> elements: the early lang script, the
    // JSON payload, and the module bundle.
    expect(doc.querySelectorAll("script")).toHaveLength(3);
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

  it("tags every row with its color type for client-side filtering", () => {
    const filterablePuzzles: Puzzle[] = [
      {
        id: "mono-a",
        name: "Mono A",
        width: 4,
        height: 4,
        palette: ["#000000"],
        cells: Array.from({ length: 4 }, () => Array(4).fill(null)),
      },
      {
        id: "multi-a",
        name: "Multi A",
        width: 15,
        height: 15,
        palette: ["#000000", "#ff0000"],
        cells: Array.from({ length: 15 }, () => Array(15).fill(null)),
      },
    ];

    const doc = parse(renderLibraryPage(filterablePuzzles));
    const items = doc.querySelectorAll("li");

    expect(items[0]?.getAttribute("data-color-type")).toBe("mono");
    expect(items[1]?.getAttribute("data-color-type")).toBe("multi");
  });

  it("no longer tags rows with a size bucket, since the size filter was removed", () => {
    const doc = parse(renderLibraryPage(puzzles));

    expect(doc.querySelector("li")?.hasAttribute("data-size-bucket")).toBe(
      false,
    );
  });

  it("no longer bakes a size filter select", () => {
    const doc = parse(renderLibraryPage(puzzles));

    expect(
      doc.querySelector('[data-role="library-filter-size-select"]'),
    ).toBeNull();
  });

  it("lets a filter/sort button group wrap to a second line instead of overflowing, for a group with more buttons or longer labels", () => {
    const doc = parse(renderLibraryPage(puzzles));
    const css = doc.querySelector("style")?.textContent ?? "";

    expect(css).toMatch(/\.library-filters\s*>\s*div\{[^}]*flex-wrap:wrap/);
  });

  it("gives the pagination block more vertical separation from the filters above it than the gap between sibling filter groups in the same row, so it reads as its own distinct block", () => {
    const doc = parse(renderLibraryPage(puzzles));
    const css = doc.querySelector("style")?.textContent ?? "";

    const rowGapMatch = css.match(
      /\.library-filters\s*>\s*div\{[^}]*gap:(\d+)px/,
    );
    const paginationMarginMatch = css.match(
      /\.library-pagination:not\(\[hidden\]\)\{[^}]*margin:(\d+)px/,
    );
    expect(rowGapMatch).not.toBeNull();
    expect(paginationMarginMatch).not.toBeNull();

    const rowGap = Number(rowGapMatch?.[1]);
    const paginationTopMargin = Number(paginationMarginMatch?.[1]);
    expect(paginationTopMargin).toBeGreaterThan(rowGap);
  });

  it("bakes the color filter as two unpressed, compactly-labeled toggle buttons (mono/multi), 'all' being neither pressed, plus a hidden 'no results' message", () => {
    const doc = parse(renderLibraryPage(puzzles));

    const monoButton = doc.querySelector(
      '[data-role="library-filter-color-mono"]',
    );
    const multiButton = doc.querySelector(
      '[data-role="library-filter-color-multi"]',
    );
    expect(monoButton?.getAttribute("aria-pressed")).toBe("false");
    expect(multiButton?.getAttribute("aria-pressed")).toBe("false");
    expect(monoButton?.textContent).toBe("Mono");
    expect(multiButton?.textContent).toBe("Multi");

    const noResults = doc.querySelector(
      '[data-i18n="library.filterNoResults"]',
    );
    expect(noResults?.hasAttribute("hidden")).toBe(true);
  });

  it("announces the 'no results' message to assistive tech when a filter reveals it, like the pagination status already does", () => {
    const doc = parse(renderLibraryPage(puzzles));

    const noResults = doc.querySelector(
      '[data-i18n="library.filterNoResults"]',
    );
    expect(noResults?.getAttribute("role")).toBe("status");
    expect(noResults?.getAttribute("aria-live")).toBe("polite");
  });

  it("gives the color filter group both a small visible label and a matching accessible group name", () => {
    const doc = parse(renderLibraryPage(puzzles));

    const group = doc
      .querySelector('[data-role="library-filter-color-mono"]')
      ?.closest('[role="group"]');
    expect(group?.getAttribute("aria-label")).toBe("Color");
    expect(group?.getAttribute("data-i18n-aria")).toBe(
      "library.filterColorLabel",
    );

    const visibleLabel = group?.querySelector("span");
    expect(visibleLabel?.textContent).toBe("Color");
    expect(visibleLabel?.getAttribute("data-i18n")).toBe(
      "library.filterColorLabel",
    );
  });

  it("composes the group's color context into each color filter button's own accessible name, not just the group's", () => {
    const doc = parse(renderLibraryPage(puzzles));

    const monoButton = doc.querySelector(
      '[data-role="library-filter-color-mono"]',
    );
    const multiButton = doc.querySelector(
      '[data-role="library-filter-color-multi"]',
    );
    expect(monoButton?.getAttribute("aria-label")).toBe("Color: Mono");
    expect(monoButton?.getAttribute("data-i18n-aria")).toBe(
      "library.filterColorMonoAriaLabel",
    );
    expect(multiButton?.getAttribute("aria-label")).toBe("Color: Multi");
    expect(multiButton?.getAttribute("data-i18n-aria")).toBe(
      "library.filterColorMultiAriaLabel",
    );
  });

  it("no longer bakes a color filter select", () => {
    const doc = parse(renderLibraryPage(puzzles));

    expect(
      doc.querySelector('[data-role="library-filter-color-select"]'),
    ).toBeNull();
  });

  it("bakes an unpressed 'recently opened' sort toggle button, in the secondary controls after the puzzle list", () => {
    const doc = parse(renderLibraryPage(puzzles));

    const sortButton = doc.querySelector('[data-role="library-sort-recent"]');
    expect(sortButton?.tagName).toBe("BUTTON");
    expect(sortButton?.getAttribute("aria-pressed")).toBe("false");
    expect(sortButton?.textContent).toBe("Recently opened");
    expect(
      sortButton?.closest('[data-role="library-secondary-filters"]'),
    ).not.toBeNull();
  });

  it("keeps the color filter out of the secondary controls, above the puzzle list", () => {
    const doc = parse(renderLibraryPage(puzzles));

    const monoButton = doc.querySelector(
      '[data-role="library-filter-color-mono"]',
    );
    expect(
      monoButton?.closest('[data-role="library-secondary-filters"]'),
    ).toBeNull();
  });

  it("bakes the status filter as three unpressed toggle buttons, in the secondary controls after the puzzle list", () => {
    const doc = parse(renderLibraryPage(puzzles));

    const unsolvedButton = doc.querySelector(
      '[data-role="library-filter-status-unsolved"]',
    );
    const inProgressButton = doc.querySelector(
      '[data-role="library-filter-status-in-progress"]',
    );
    const solvedButton = doc.querySelector(
      '[data-role="library-filter-status-solved"]',
    );

    expect(unsolvedButton?.getAttribute("aria-pressed")).toBe("false");
    expect(inProgressButton?.getAttribute("aria-pressed")).toBe("false");
    expect(solvedButton?.getAttribute("aria-pressed")).toBe("false");
    expect(unsolvedButton?.textContent).toBe("Unsolved");
    expect(inProgressButton?.textContent).toBe("In progress");
    expect(solvedButton?.textContent).toBe("Solved");
    expect(
      unsolvedButton?.closest('[data-role="library-secondary-filters"]'),
    ).not.toBeNull();
  });

  it("gives the status filter buttons an accessible group name", () => {
    const doc = parse(renderLibraryPage(puzzles));

    const group = doc
      .querySelector('[data-role="library-filter-status-unsolved"]')
      ?.closest('[role="group"]');
    expect(group?.getAttribute("aria-label")).toBe("Status");
    expect(group?.getAttribute("data-i18n-aria")).toBe(
      "library.filterStatusLabel",
    );
  });

  it("positions the 'no results' message after the secondary filters row, so feedback from a status/sort tap never appears above the control just used", () => {
    const doc = parse(renderLibraryPage(puzzles));

    const noResults = doc.querySelector(
      '[data-i18n="library.filterNoResults"]',
    );
    const secondaryFilters = doc.querySelector(
      '[data-role="library-secondary-filters"]',
    );
    if (!noResults || !secondaryFilters) {
      throw new Error(
        "fixture no-results message or secondary filters not found",
      );
    }

    const position = secondaryFilters.compareDocumentPosition(noResults);
    expect(Boolean(position & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
  });

  it("hides the pagination controls by default when every puzzle already fits on one page", () => {
    const doc = parse(renderLibraryPage(puzzles));

    expect(
      doc
        .querySelector('[data-role="library-pagination"]')
        ?.hasAttribute("hidden"),
    ).toBe(true);
  });

  it("shows correct, already-computed pagination when there are more puzzles than fit on one page", () => {
    const manyPuzzles: Puzzle[] = Array.from({ length: 30 }, (_, index) => ({
      id: `p${index}`,
      name: `Puzzle ${index}`,
      width: 5,
      height: 5,
      palette: ["#000000"],
      cells: Array.from({ length: 5 }, () => Array(5).fill(null)),
    }));

    const doc = parse(renderLibraryPage(manyPuzzles));

    const pagination = doc.querySelector('[data-role="library-pagination"]');
    expect(pagination?.hasAttribute("hidden")).toBe(false);
    expect(
      doc.querySelector('[data-role="library-pagination-position"]')
        ?.textContent,
    ).toBe("1 / 2");
    expect(
      doc
        .querySelector('[data-role="library-pagination-prev"]')
        ?.hasAttribute("disabled"),
    ).toBe(true);
    expect(
      doc
        .querySelector('[data-role="library-pagination-next"]')
        ?.hasAttribute("disabled"),
    ).toBe(false);

    const items = doc.querySelectorAll("li");
    expect(items[24]?.hasAttribute("hidden")).toBe(false);
    expect(items[25]?.hasAttribute("hidden")).toBe(true);
    expect(items[29]?.hasAttribute("hidden")).toBe(true);
  });

  it("bakes the footer language switcher with English selected by default", () => {
    const doc = parse(renderLibraryPage(puzzles));

    const select = doc.querySelector('[data-role="language-switcher-select"]');
    expect(select).not.toBeNull();
    const options = Array.from(select?.querySelectorAll("option") ?? []);
    expect(options.map((option) => option.getAttribute("value"))).toEqual([
      "en",
      "fr",
    ]);
    expect(options.map((option) => option.textContent)).toEqual([
      "English",
      "Français",
    ]);
    expect(
      select?.querySelector("option[selected]")?.getAttribute("value"),
    ).toBe("en");
  });

  it("places the early lang-setting script immediately after the charset meta, ahead of styles and the module bundle", () => {
    const html = renderLibraryPage(puzzles);

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
