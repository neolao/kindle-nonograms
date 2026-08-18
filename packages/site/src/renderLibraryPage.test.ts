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
});
