// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { type PuzzleSummary, renderLibraryPage } from "./renderLibraryPage.js";

const summaries: PuzzleSummary[] = [
  { id: "sailboat", name: "Sailboat", width: 20, height: 20 },
  { id: "cat", name: "Cat", width: 10, height: 15 },
];

function parse(html: string): Document {
  return new DOMParser().parseFromString(html, "text/html");
}

describe("renderLibraryPage", () => {
  it("lists every puzzle with a relative link and its size in the accessible link name", () => {
    const doc = parse(renderLibraryPage(summaries));
    const links = doc.querySelectorAll("li a");

    expect(links).toHaveLength(2);
    expect(links[0]?.getAttribute("href")).toBe("puzzles/sailboat/");
    expect(links[0]?.textContent).toContain("Sailboat");
    expect(links[0]?.textContent).toContain("20");
    expect(links[1]?.getAttribute("href")).toBe("puzzles/cat/");
    expect(links[1]?.textContent).toContain("Cat");
  });

  it("tags every row with the puzzle id for later hydration to find it", () => {
    const doc = parse(renderLibraryPage(summaries));
    const items = doc.querySelectorAll("li");

    expect(items[0]?.getAttribute("data-puzzle-id")).toBe("sailboat");
    expect(items[1]?.getAttribute("data-puzzle-id")).toBe("cat");
  });

  it("reserves a hidden solved-badge node in every row for hydration to reveal", () => {
    const doc = parse(renderLibraryPage(summaries));
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
        { id: "weird", name: "<b>Bold</b>", width: 5, height: 5 },
      ]),
    );

    expect(doc.querySelector("li b")).toBeNull();
    expect(doc.querySelector("li a")?.textContent).toContain("<b>Bold</b>");
  });

  it("references the client bundle with a relative path that has no leading slash", () => {
    const doc = parse(renderLibraryPage(summaries));
    const script = doc.querySelector('script[type="module"]');
    const src = script?.getAttribute("src") ?? "";

    expect(src).not.toBe("");
    expect(src.startsWith("/")).toBe(false);
    expect(src.startsWith("http")).toBe(false);
  });
});
