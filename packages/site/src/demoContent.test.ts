import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadPuzzleSources } from "./discoverPuzzles.js";

const PUZZLES_DIR = join(process.cwd(), "data", "puzzles");

describe("demo content in data/puzzles/", () => {
  it("all committed puzzle files load and validate successfully", async () => {
    await expect(loadPuzzleSources(PUZZLES_DIR)).resolves.not.toThrow();
  });

  it("includes at least one black-and-white puzzle", async () => {
    const puzzles = await loadPuzzleSources(PUZZLES_DIR);

    expect(puzzles.some((puzzle) => puzzle.palette.length === 1)).toBe(true);
  });

  it("includes at least one multi-color puzzle", async () => {
    const puzzles = await loadPuzzleSources(PUZZLES_DIR);

    expect(puzzles.some((puzzle) => puzzle.palette.length > 1)).toBe(true);
  });

  it("includes at least one puzzle with exactly four palette colors", async () => {
    const puzzles = await loadPuzzleSources(PUZZLES_DIR);

    expect(puzzles.some((puzzle) => puzzle.palette.length === 4)).toBe(true);
  });
});
