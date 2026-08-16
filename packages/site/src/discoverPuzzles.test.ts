import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadPuzzleSources } from "./discoverPuzzles.js";

const nativePuzzle = {
  id: "ignored-content-id",
  name: "Cat",
  width: 2,
  height: 2,
  palette: ["#000000"],
  cells: [
    [0, null],
    [null, 0],
  ],
};

const exportPuzzle = {
  name: "Dog",
  width: 2,
  height: 1,
  cells: [[true, false]],
};

describe("loadPuzzleSources", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "discover-puzzles-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("loads native-format and reMarkable-export-format files, deriving ids from filenames", async () => {
    await writeFile(join(dir, "cat.json"), JSON.stringify(nativePuzzle));
    await writeFile(join(dir, "dog.json"), JSON.stringify(exportPuzzle));

    const puzzles = await loadPuzzleSources(dir);

    expect(puzzles).toEqual([
      {
        id: "cat",
        name: "Cat",
        width: 2,
        height: 2,
        palette: ["#000000"],
        cells: [
          [0, null],
          [null, 0],
        ],
      },
      {
        id: "dog",
        name: "Dog",
        width: 2,
        height: 1,
        palette: ["#000000"],
        cells: [[0, null]],
      },
    ]);
  });

  it("uses the filename as id even when the native-format file carries its own id", async () => {
    await writeFile(join(dir, "cat.json"), JSON.stringify(nativePuzzle));

    const [puzzle] = await loadPuzzleSources(dir);

    expect(puzzle.id).toBe("cat");
  });

  it("returns an empty list when the source directory has no files", async () => {
    const puzzles = await loadPuzzleSources(dir);

    expect(puzzles).toEqual([]);
  });

  it("ignores non-JSON files in the source directory", async () => {
    await writeFile(join(dir, "cat.json"), JSON.stringify(nativePuzzle));
    await writeFile(join(dir, "README.txt"), "not a puzzle");

    const puzzles = await loadPuzzleSources(dir);

    expect(puzzles).toHaveLength(1);
    expect(puzzles[0]?.id).toBe("cat");
  });

  it("throws a descriptive error naming the file when its content is not valid JSON", async () => {
    await writeFile(join(dir, "broken.json"), "{not json");

    await expect(loadPuzzleSources(dir)).rejects.toThrow(/broken\.json/);
  });

  it("throws a descriptive error and loads nothing when one file fails puzzle validation", async () => {
    await writeFile(join(dir, "cat.json"), JSON.stringify(nativePuzzle));
    await writeFile(
      join(dir, "invalid.json"),
      JSON.stringify({
        id: "invalid",
        name: "Invalid",
        width: 2,
        height: 2,
        palette: ["#000000"],
        cells: [[0, null]], // only one row for a height of 2 — fails validation
      }),
    );

    await expect(loadPuzzleSources(dir)).rejects.toThrow(/invalid\.json/);
  });
});
