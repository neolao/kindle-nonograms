// @vitest-environment jsdom
import type { Puzzle } from "@kindle-nonograms/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { saveProgress } from "./progressStorage.js";

const puzzle: Puzzle = {
  id: "solo",
  name: "Solo",
  width: 1,
  height: 1,
  palette: ["#000000"],
  cells: [[0]],
};

beforeEach(() => {
  localStorage.clear();
  vi.resetModules();
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("main", () => {
  it("hydrates a puzzle page when loaded on one", async () => {
    document.body.innerHTML = `<h1>Solo</h1><div class="grid-wrapper"><table><tbody><tr><td data-row="0" data-col="0"></td></tr></tbody></table></div><script type="application/json" id="puzzle-data">${JSON.stringify(puzzle)}</script>`;

    await import("./main.js");

    expect(document.querySelector('[data-role="mode-fill"]')).not.toBeNull();
  });

  it("hydrates the library page when loaded on one", async () => {
    saveProgress("solo", { cells: [[0]] });
    document.body.innerHTML = `<h1>Kindle Nonograms</h1><ul><li data-puzzle-id="solo"><a href="puzzles/solo/">Solo</a><span class="solved-badge" hidden>Solved</span></li></ul><script type="application/json" id="puzzles-data">${JSON.stringify([puzzle])}</script>`;

    await import("./main.js");

    const badge = document.querySelector<HTMLElement>(
      '[data-puzzle-id="solo"] .solved-badge',
    );
    expect(badge?.hidden).toBe(false);
  });

  it("does not throw when loaded on a page that matches neither shape", async () => {
    document.body.innerHTML = "<p>nothing to hydrate here</p>";

    await expect(import("./main.js")).resolves.toBeDefined();
  });
});
