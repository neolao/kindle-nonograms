import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { buildSite } from "./build.js";

const BUILD_TIMEOUT = 30000;

const catPuzzle = {
  id: "ignored-content-id",
  name: "Cat",
  width: 2,
  height: 1,
  palette: ["#000000"],
  cells: [[0, null]],
};

const dogPuzzle = {
  name: "Dog",
  width: 1,
  height: 1,
  cells: [[true]],
};

describe("buildSite", () => {
  describe("with a multi-puzzle fixture directory", () => {
    let puzzlesDir: string;
    let outDir: string;

    beforeAll(async () => {
      puzzlesDir = await mkdtemp(join(tmpdir(), "build-site-puzzles-"));
      outDir = await mkdtemp(join(tmpdir(), "build-site-out-"));
      await writeFile(join(puzzlesDir, "cat.json"), JSON.stringify(catPuzzle));
      await writeFile(join(puzzlesDir, "dog.json"), JSON.stringify(dogPuzzle));

      await buildSite({ puzzlesDir, outDir });
    }, BUILD_TIMEOUT);

    afterAll(async () => {
      await rm(puzzlesDir, { recursive: true, force: true });
      await rm(outDir, { recursive: true, force: true });
    });

    it("writes the home page and one page per discovered puzzle", async () => {
      const home = await readFile(join(outDir, "index.html"), "utf-8");
      expect(home).toContain('data-puzzle-id="cat"');
      expect(home).toContain('data-puzzle-id="dog"');

      const catPage = await readFile(
        join(outDir, "puzzles", "cat", "index.html"),
        "utf-8",
      );
      expect(catPage).toContain("Cat");

      const dogPage = await readFile(
        join(outDir, "puzzles", "dog", "index.html"),
        "utf-8",
      );
      expect(dogPage).toContain("Dog");
    });

    it("writes the built client bundle at a fixed, unhashed asset path", async () => {
      const files = await readdir(join(outDir, "assets"));
      expect(files).toContain("main.js");
    });

    it("only ever emits relative internal links and asset paths, never absolute or host-rooted", async () => {
      const home = await readFile(join(outDir, "index.html"), "utf-8");
      const catPage = await readFile(
        join(outDir, "puzzles", "cat", "index.html"),
        "utf-8",
      );

      for (const html of [home, catPage]) {
        const paths = Array.from(html.matchAll(/(?:href|src)="([^"]+)"/g)).map(
          (match) => match[1],
        );
        expect(paths.length).toBeGreaterThan(0);
        for (const path of paths) {
          expect(path.startsWith("/")).toBe(false);
          expect(path.startsWith("http")).toBe(false);
        }
      }
    });

    it("appends the same bundle version query string to every page, since the bundle itself is puzzle-independent", async () => {
      const home = await readFile(join(outDir, "index.html"), "utf-8");
      const catPage = await readFile(
        join(outDir, "puzzles", "cat", "index.html"),
        "utf-8",
      );

      const homeVersion = home.match(/assets\/main\.js\?v=([a-f0-9]+)"/)?.[1];
      const catVersion = catPage.match(/assets\/main\.js\?v=([a-f0-9]+)"/)?.[1];

      expect(homeVersion).toBeTruthy();
      expect(catVersion).toBe(homeVersion);
    });
  });

  it(
    "still produces a valid empty-state home page and the client bundle when there are no puzzles",
    async () => {
      const puzzlesDir = await mkdtemp(
        join(tmpdir(), "build-site-empty-puzzles-"),
      );
      const outDir = await mkdtemp(join(tmpdir(), "build-site-empty-out-"));

      try {
        await buildSite({ puzzlesDir, outDir });

        const home = await readFile(join(outDir, "index.html"), "utf-8");
        expect(home).toMatch(/no puzzles/i);

        const files = await readdir(join(outDir, "assets"));
        expect(files).toContain("main.js");
      } finally {
        await rm(puzzlesDir, { recursive: true, force: true });
        await rm(outDir, { recursive: true, force: true });
      }
    },
    BUILD_TIMEOUT,
  );

  it(
    "removes a puzzle's stale page and any other stale output from a previous build",
    async () => {
      const puzzlesDir = await mkdtemp(
        join(tmpdir(), "build-site-stale-puzzles-"),
      );
      const outDir = await mkdtemp(join(tmpdir(), "build-site-stale-out-"));

      try {
        await writeFile(
          join(puzzlesDir, "cat.json"),
          JSON.stringify(catPuzzle),
        );
        await writeFile(
          join(puzzlesDir, "dog.json"),
          JSON.stringify(dogPuzzle),
        );
        await buildSite({ puzzlesDir, outDir });

        await rm(join(puzzlesDir, "dog.json"));
        await buildSite({ puzzlesDir, outDir });

        await expect(readdir(join(outDir, "puzzles", "dog"))).rejects.toThrow();
        const home = await readFile(join(outDir, "index.html"), "utf-8");
        expect(home).not.toContain('data-puzzle-id="dog"');
      } finally {
        await rm(puzzlesDir, { recursive: true, force: true });
        await rm(outDir, { recursive: true, force: true });
      }
    },
    BUILD_TIMEOUT * 2,
  );

  describe("with an invalid puzzle file", () => {
    let puzzlesDir: string;
    let outDir: string;

    beforeAll(async () => {
      puzzlesDir = await mkdtemp(join(tmpdir(), "build-site-invalid-puzzles-"));
      outDir = join(
        await mkdtemp(join(tmpdir(), "build-site-invalid-out-")),
        "site",
      );
      await writeFile(
        join(puzzlesDir, "broken.json"),
        JSON.stringify({ ...catPuzzle, height: 2 }), // only 1 row for a height of 2
      );
    });

    afterEach(async () => {
      await rm(outDir, { recursive: true, force: true });
    });

    afterAll(async () => {
      await rm(puzzlesDir, { recursive: true, force: true });
    });

    it("rejects with a descriptive error naming the offending file", async () => {
      await expect(buildSite({ puzzlesDir, outDir })).rejects.toThrow(
        /broken\.json/,
      );
    });

    it("writes nothing to the output directory", async () => {
      await expect(buildSite({ puzzlesDir, outDir })).rejects.toThrow();
      await expect(readdir(outDir)).rejects.toThrow();
    });
  });
});
