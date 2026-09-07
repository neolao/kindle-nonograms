// @vitest-environment jsdom
import type { Puzzle } from "@kindle-nonograms/shared";
import { renderEditorPage, renderPuzzlePage } from "@kindle-nonograms/site";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { extractBodyHtml } from "./htmlFixture.js";
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
    document.body.innerHTML = extractBodyHtml(renderPuzzlePage(puzzle));

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

  it("does not mistake the editor page's own static canvas <table> for the puzzle page", async () => {
    // The editor's canvas now renders a real <table> statically too (see
    // .ux/decisions/001-frozen-chrome-blocking-reconciliation.md) — a bare
    // <table> alone must never trigger hydratePlayPage.ts's hydration.
    document.body.innerHTML = `<div data-role="editor-page"><div class="grid-wrapper" data-role="editor-grid-wrapper"><table><tbody><tr><td data-row="0" data-col="0"></td></tr></tbody></table></div></div>`;

    await import("./main.js");

    expect(document.querySelector('[data-role="mode-fill"]')).toBeNull();
    expect(document.querySelector('[data-role="win-banner"]')).toBeNull();
  });

  it("still restores play-page progress when the library module's hydration throws", async () => {
    // A real page is never both shapes at once. This fixture combines a
    // play page's own markup with an extra library-page marker purely to
    // prove, from outside, that a genuine throw inside the library
    // module's hydrate() (forced here via the mocked `buildThumbnail`,
    // reached only once it finds a solved puzzle to build a thumbnail for)
    // never stops the next module (play, imported right after in main.ts)
    // from attempting its own hydration — see backlog item 041.
    vi.doMock("@kindle-nonograms/shared", async (importOriginal) => {
      const actual =
        await importOriginal<typeof import("@kindle-nonograms/shared")>();
      return {
        ...actual,
        buildThumbnail: () => {
          throw new Error("boom");
        },
      };
    });
    saveProgress("solo", { cells: [[0]] });
    document.body.innerHTML = `${extractBodyHtml(renderPuzzlePage(puzzle))}<ul><li data-puzzle-id="solo"><span class="solved-badge" hidden></span><span class="thumb">?</span></li></ul><script type="application/json" id="puzzles-data">${JSON.stringify([puzzle])}</script>`;

    await expect(import("./main.js")).resolves.toBeDefined();

    // Play's hydrate() paints a cell's saved progress onto the grid on
    // load — a background color only its own hydration can have set, never
    // the static markup.
    const cell = document.querySelector<HTMLTableCellElement>(
      'td[data-row="0"][data-col="0"]',
    );
    expect(cell?.style.backgroundColor).not.toBe("");

    vi.doUnmock("@kindle-nonograms/shared");
  });

  it("still wires the editor page's grid clicks when the play module's hydration throws", async () => {
    // Likewise, combines an editor page's markup with an extra play-page
    // marker to prove that a genuine throw inside the play module's
    // hydrate() (forced here via the mocked `createEmptyProgressGrid`,
    // which play's own hydrate() calls to build a fresh progress grid when
    // no saved progress exists yet) never stops the next module (editor,
    // imported right after play in main.ts) from attempting its own
    // hydration — see backlog item 041.
    vi.doMock("@kindle-nonograms/shared", async (importOriginal) => {
      const actual =
        await importOriginal<typeof import("@kindle-nonograms/shared")>();
      return {
        ...actual,
        createEmptyProgressGrid: () => {
          throw new Error("boom");
        },
      };
    });
    document.body.innerHTML = `${extractBodyHtml(renderEditorPage())}<script type="application/json" id="puzzle-data">${JSON.stringify(puzzle)}</script>`;

    await expect(import("./main.js")).resolves.toBeDefined();

    // Editor's hydrate() wires a delegated click listener that paints a
    // clicked cell — a background color only its own hydration can produce.
    const cell = document.querySelector<HTMLTableCellElement>(
      'td[data-row="0"][data-col="0"]',
    );
    cell?.click();
    expect(cell?.style.backgroundColor).not.toBe("");

    vi.doUnmock("@kindle-nonograms/shared");
  });
});
