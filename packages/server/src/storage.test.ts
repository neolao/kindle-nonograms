import { createHash } from "node:crypto";
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  StorageCorruptError,
  type StoredEntry,
  createStorage,
} from "./storage.js";

const renameFails = vi.hoisted(() => ({ on: false }));
const calls = vi.hoisted(() => ({ order: [] as string[] }));

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return {
    ...actual,
    open: async (...args: Parameters<typeof actual.open>) => {
      const handle = await actual.open(...args);
      const sync = handle.sync.bind(handle);
      handle.sync = () => {
        calls.order.push("sync");
        return sync();
      };
      return handle;
    },
    rename: (...args: Parameters<typeof actual.rename>) => {
      calls.order.push("rename");
      return renameFails.on
        ? Promise.reject(new Error("rename failed"))
        : actual.rename(...args);
    },
  };
});

const KEY = "storage-test-key";

let dataDir: string;

beforeEach(async () => {
  dataDir = await mkdtemp(join(tmpdir(), "kindle-storage-"));
});

afterEach(async () => {
  renameFails.on = false;
  calls.order = [];
  await rm(dataDir, { recursive: true, force: true });
});

function entry(rev: number): StoredEntry {
  return { cells: [[rev]], rev, updatedAt: "2026-01-01T00:00:00.000Z" };
}

const FILE = () => `${createHash("sha256").update(KEY).digest("hex")}.json`;

describe("read", () => {
  it("reads a missing file as no entries", async () => {
    const storage = createStorage(dataDir);

    expect((await storage.read(KEY)).size).toBe(0);
  });

  it("throws StorageCorruptError for an unparseable file instead of reading it as empty", async () => {
    await writeFile(join(dataDir, FILE()), "{nope");

    await expect(createStorage(dataDir).read(KEY)).rejects.toBeInstanceOf(
      StorageCorruptError,
    );
  });

  it.each(["null", "[]", "{}", '{"entries":null}', '{"entries":"x"}'])(
    "throws StorageCorruptError for the valid JSON %s of the wrong shape",
    async (raw) => {
      await writeFile(join(dataDir, FILE()), raw);

      await expect(createStorage(dataDir).read(KEY)).rejects.toBeInstanceOf(
        StorageCorruptError,
      );
    },
  );
});

describe("update", () => {
  it("persists the returned entries and hands back the result", async () => {
    const storage = createStorage(dataDir);

    const result = await storage.update(KEY, (entries) => ({
      next: new Map(entries).set("cat", entry(1)),
      result: "done",
    }));

    expect(result).toBe("done");
    expect((await storage.read(KEY)).get("cat")?.rev).toBe(1);
  });

  it("leaves the file alone when the change returns no entries", async () => {
    const storage = createStorage(dataDir);

    await storage.update(KEY, () => ({ next: null, result: undefined }));

    expect(await readdir(dataDir)).toEqual([]);
  });

  it("keeps working on a key after a failed update", async () => {
    const storage = createStorage(dataDir);
    await expect(
      storage.update(KEY, () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");

    await storage.update(KEY, (entries) => ({
      next: new Map(entries).set("cat", entry(1)),
      result: undefined,
    }));

    expect((await storage.read(KEY)).get("cat")?.rev).toBe(1);
  });

  it("serializes concurrent updates and leaves only the key's json file behind", async () => {
    const storage = createStorage(dataDir);

    await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        storage.update(KEY, (entries) => ({
          next: new Map(entries).set(`p${i}`, entry(1)),
          result: undefined,
        })),
      ),
    );

    expect((await storage.read(KEY)).size).toBe(20);
    expect(await readdir(dataDir)).toEqual([FILE()]);
  });

  it("flushes the temp file to disk before renaming it over the real one", async () => {
    const storage = createStorage(dataDir);

    await storage.update(KEY, (entries) => ({
      next: new Map(entries).set("cat", entry(1)),
      result: undefined,
    }));

    expect(calls.order).toEqual(["sync", "rename"]);
  });

  it("removes its temp file and rethrows when the rename fails after the write", async () => {
    const storage = createStorage(dataDir);
    renameFails.on = true;

    await expect(
      storage.update(KEY, (entries) => ({
        next: new Map(entries).set("dog", entry(1)),
        result: undefined,
      })),
    ).rejects.toThrow();

    expect(await readdir(dataDir)).toEqual([]);
  });
});
