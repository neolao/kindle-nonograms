import { describe, expect, it } from "vitest";
import { renderDifficultyBadge } from "./renderDifficultyBadge.js";

function starRun(html: string): string {
  const match = html.match(/aria-hidden="true">([^<]*)</);
  if (!match) {
    throw new Error(`no aria-hidden star run found in: ${html}`);
  }
  return match[1];
}

describe("renderDifficultyBadge", () => {
  it("shows every star filled for the maximum score", () => {
    const html = renderDifficultyBadge(10);

    expect(starRun(html)).toBe("★★★★★");
  });

  it("shows a mix of filled and empty stars for a mid-range score", () => {
    // 2 points per star: a score of 6 is exactly 3 of the 5 stars filled.
    const html = renderDifficultyBadge(6);

    expect(starRun(html)).toBe("★★★☆☆");
  });

  it("still shows one filled star for the lowest possible score, never zero", () => {
    // A fully-empty row would be visually indistinguishable from "no score
    // at all" — the lowest score (1) must still read as a rating, not an
    // absence of one.
    const html = renderDifficultyBadge(1);

    expect(starRun(html)).toBe("★☆☆☆☆");
  });

  it("carries the full score as screen-reader-only text, invisible to sighted players", () => {
    const html = renderDifficultyBadge(6);

    expect(html).toContain('class="sr-only"');
    expect(html).toContain('data-i18n="puzzle.difficultyLabel"');
    expect(html).toMatch(/sr-only"[\s\S]*?6\/10/);
  });

  it("hides the decorative star glyphs from assistive tech", () => {
    const html = renderDifficultyBadge(6);

    expect(html).toMatch(/aria-hidden="true">★★★☆☆</);
  });

  it("clamps an out-of-range score defensively instead of drawing an invalid star count", () => {
    expect(starRun(renderDifficultyBadge(0))).toBe("★☆☆☆☆");
    expect(starRun(renderDifficultyBadge(11))).toBe("★★★★★");
  });

  it("rounds a non-integer score before splitting it into stars", () => {
    expect(starRun(renderDifficultyBadge(6.7))).toBe(
      starRun(renderDifficultyBadge(7)),
    );
  });

  it("defaults its hidden label to English when no locale is given", () => {
    const html = renderDifficultyBadge(6);

    expect(html).toMatch(/sr-only"[\s\S]*?>Difficulty</);
  });

  it("renders its hidden label in an explicitly given locale, for content inserted after the page's own translation pass already ran", () => {
    // The editor's solvability confirmation is rebuilt on demand, well
    // after hydration's one-time page-wide translation sweep — this badge
    // must already show the right language the instant it's inserted,
    // not wait for a sweep that has already happened and won't run again
    // until (if ever) the language is switched.
    const html = renderDifficultyBadge(6, "fr");

    expect(html).toMatch(/sr-only"[\s\S]*?>Difficulté</);
  });
});
