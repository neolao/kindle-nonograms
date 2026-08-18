// @vitest-environment jsdom
import type { Puzzle } from "@kindle-nonograms/shared";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { hydrate } from "./hydrateLibraryPage.js";
import { saveProgress } from "./progressStorage.js";

const catPuzzle: Puzzle = {
  id: "cat",
  name: "Cat",
  width: 2,
  height: 1,
  palette: ["#000000"],
  cells: [[0, null]],
};

const dogPuzzle: Puzzle = {
  id: "dog",
  name: "Dog",
  width: 2,
  height: 1,
  palette: ["#000000"],
  cells: [[null, 0]],
};

function buildFixture(puzzles: Puzzle[]): void {
  const items = puzzles
    .map(
      (puzzle) =>
        `<li data-puzzle-id="${puzzle.id}"><a href="puzzles/${puzzle.id}/">${puzzle.name}</a><span class="solved-badge" data-i18n="library.solvedBadge" hidden>Solved</span></li>`,
    )
    .join("");

  document.body.innerHTML = `<h1 data-i18n="library.title">Kindle Nonograms</h1><ul>${items}</ul><script type="application/json" id="puzzles-data">${JSON.stringify(puzzles)}</script>`;
}

function buildEmptyFixture(): void {
  document.body.innerHTML =
    '<h1 data-i18n="library.title">Kindle Nonograms</h1><p data-i18n="library.empty">No puzzles are available yet.</p><script type="application/json" id="puzzles-data">[]</script>';
}

function switcherSelect(): HTMLSelectElement {
  const found = document.querySelector<HTMLSelectElement>(
    '[data-role="language-switcher-select"]',
  );
  if (!found) {
    throw new Error("fixture language switcher select not found");
  }
  return found;
}

const originalNavigatorLanguage = window.navigator.language;

function setNavigatorLanguage(language: string): void {
  Object.defineProperty(window.navigator, "language", {
    value: language,
    configurable: true,
  });
}

function badgeFor(puzzleId: string): HTMLElement {
  const found = document.querySelector<HTMLElement>(
    `[data-puzzle-id="${puzzleId}"] .solved-badge`,
  );
  if (!found) {
    throw new Error(`fixture badge for ${puzzleId} not found`);
  }
  return found;
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  document.body.innerHTML = "";
  document.cookie = "kindle-nonograms-locale=; path=/; max-age=0";
  document.documentElement.lang = "";
  setNavigatorLanguage(originalNavigatorLanguage);
});

describe("hydrate", () => {
  it("reveals the solved badge for a puzzle with stored, fully-correct progress", () => {
    saveProgress("cat", { cells: [[0, null]] });
    buildFixture([catPuzzle, dogPuzzle]);

    hydrate();

    expect(badgeFor("cat").hidden).toBe(false);
    expect(badgeFor("dog").hidden).toBe(true);
  });

  it("does not reveal the badge for a puzzle with incomplete stored progress", () => {
    saveProgress("cat", { cells: [[null, null]] });
    buildFixture([catPuzzle, dogPuzzle]);

    hydrate();

    expect(badgeFor("cat").hidden).toBe(true);
  });

  it("does not reveal the badge for a puzzle with incorrect stored progress", () => {
    saveProgress("dog", { cells: [[0, null]] });
    buildFixture([catPuzzle, dogPuzzle]);

    hydrate();

    expect(badgeFor("dog").hidden).toBe(true);
  });

  it("does not throw and leaves every badge hidden when no puzzle has any stored progress", () => {
    buildFixture([catPuzzle, dogPuzzle]);

    expect(() => hydrate()).not.toThrow();
    expect(badgeFor("cat").hidden).toBe(true);
    expect(badgeFor("dog").hidden).toBe(true);
  });

  it("treats corrupted-shape stored progress as not solved instead of throwing", () => {
    saveProgress("cat", { cells: [[0, null, 0]] });
    buildFixture([catPuzzle, dogPuzzle]);

    expect(() => hydrate()).not.toThrow();
    expect(badgeFor("cat").hidden).toBe(true);
  });

  it("does nothing and does not throw when the embedded puzzles JSON is missing", () => {
    document.body.innerHTML =
      '<ul><li data-puzzle-id="cat"><span class="solved-badge" hidden>Solved</span></li></ul>';

    expect(() => hydrate()).not.toThrow();
    expect(badgeFor("cat").hidden).toBe(true);
  });

  it("does nothing and does not throw when the embedded puzzles JSON is malformed", () => {
    document.body.innerHTML =
      '<ul><li data-puzzle-id="cat"><span class="solved-badge" hidden>Solved</span></li></ul><script type="application/json" id="puzzles-data">not json[</script>';

    expect(() => hydrate()).not.toThrow();
    expect(badgeFor("cat").hidden).toBe(true);
  });
});

describe("language switcher", () => {
  it("inserts the language switcher immediately after the page heading", () => {
    buildFixture([catPuzzle, dogPuzzle]);

    hydrate();

    const h1 = document.querySelector("h1");
    expect(
      h1?.nextElementSibling?.querySelector(
        '[data-role="language-switcher-select"]',
      ),
    ).not.toBeNull();
  });

  it("defaults to the language detected from the browser when there is no saved cookie", () => {
    setNavigatorLanguage("fr-FR");
    buildFixture([catPuzzle, dogPuzzle]);

    hydrate();

    expect(switcherSelect().value).toBe("fr");
    expect(document.querySelector("h1")?.textContent).toBe("Kindle Nonograms");
  });

  it("falls back to English when the browser language is not supported", () => {
    setNavigatorLanguage("de-DE");
    buildFixture([catPuzzle, dogPuzzle]);

    hydrate();

    expect(switcherSelect().value).toBe("en");
  });

  it("prefers a saved cookie over the browser-detected language", () => {
    document.cookie = "kindle-nonograms-locale=fr; path=/";
    setNavigatorLanguage("en-US");
    buildFixture([catPuzzle, dogPuzzle]);

    hydrate();

    expect(switcherSelect().value).toBe("fr");
  });

  it("retranslates the page immediately, with no reload, when the language is changed", () => {
    buildFixture([catPuzzle, dogPuzzle]);

    hydrate();
    switcherSelect().value = "fr";
    switcherSelect().dispatchEvent(new Event("change"));

    expect(document.documentElement.lang).toBe("fr");
    expect(badgeFor("cat").textContent).toBe("Résolu");
  });

  it("saves the chosen language in a cookie, read back as the priority source on the next load", () => {
    buildFixture([catPuzzle, dogPuzzle]);

    hydrate();
    switcherSelect().value = "fr";
    switcherSelect().dispatchEvent(new Event("change"));

    expect(document.cookie).toContain("kindle-nonograms-locale=fr");
  });

  it("also inserts and applies the switcher on the empty library page", () => {
    setNavigatorLanguage("fr-FR");
    buildEmptyFixture();

    hydrate();

    expect(switcherSelect().value).toBe("fr");
    expect(
      document.querySelector("[data-i18n='library.empty']")?.textContent,
    ).toBe("Aucun puzzle disponible pour le moment.");
  });
});
