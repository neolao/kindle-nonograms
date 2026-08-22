import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { renderPreviewsForFiles } from "./renderPreviewArtifact.js";

const catPuzzle = {
  name: "Cat",
  width: 2,
  height: 1,
  palette: ["#000000"],
  cells: [[0, null]],
};

const dogPuzzle = {
  name: "Dog",
  width: 2,
  height: 1,
  palette: ["#ff0000"],
  cells: [[null, 0]],
};

describe("renderPreviewsForFiles", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "render-preview-artifact-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("renders one PNG per requested file, in the same order, with a matching manifest", async () => {
    await writeFile(join(dir, "cat.json"), JSON.stringify(catPuzzle));
    await writeFile(join(dir, "dog.json"), JSON.stringify(dogPuzzle));

    const result = await renderPreviewsForFiles(dir, ["cat.json", "dog.json"]);

    expect(result.manifest.puzzles).toEqual(["cat", "dog"]);
    expect(result.images).toHaveLength(2);
    expect(result.images[0]?.id).toBe("cat");
    expect(result.images[1]?.id).toBe("dog");
    expect(Buffer.isBuffer(result.images[0]?.png)).toBe(true);
    expect(result.images[0]?.png.subarray(0, 8)).toEqual(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    );
  });

  it("renders only the requested files, ignoring other puzzles present in the directory", async () => {
    await writeFile(join(dir, "cat.json"), JSON.stringify(catPuzzle));
    await writeFile(join(dir, "dog.json"), JSON.stringify(dogPuzzle));

    const result = await renderPreviewsForFiles(dir, ["cat.json"]);

    expect(result.manifest.puzzles).toEqual(["cat"]);
  });

  it("returns an empty result for an empty file list, without reading the directory", async () => {
    const result = await renderPreviewsForFiles(dir, []);

    expect(result.manifest.puzzles).toEqual([]);
    expect(result.images).toEqual([]);
  });

  it("throws a descriptive error naming the file when a requested puzzle fails validation", async () => {
    await writeFile(
      join(dir, "broken.json"),
      JSON.stringify({ ...catPuzzle, cells: [[0]] }), // shape mismatch
    );

    await expect(renderPreviewsForFiles(dir, ["broken.json"])).rejects.toThrow(
      /broken\.json/,
    );
  });
});
