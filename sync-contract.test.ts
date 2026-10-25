import { createHash } from "node:crypto";
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
// @vitest-environment jsdom
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  loadProgress,
  saveProgress,
} from "./packages/client/src/progressStorage.js";
import {
  syncAllOnOpen,
  syncPuzzleAfterSave,
} from "./packages/client/src/sync.js";
import { testConnection } from "./packages/client/src/syncClient.js";
import {
  loadSyncConfig,
  saveSyncConfig,
} from "./packages/client/src/syncConfig.js";
import { loadSyncMeta, saveSyncMeta } from "./packages/client/src/syncMeta.js";
import { createApp } from "./packages/server/src/app.js";

// The real client modules against the real server app over HTTP, so a
// disagreement between the two on the wire contract fails here.

const KEY = "contract-test-key-123";
const ORIGIN = "https://neolao.github.io";

/** A minimal XMLHttpRequest backed by Node's fetch, counting requests in flight. */
class FetchXhr {
  static urls: string[] = [];
  static pending = 0;

  timeout = 0;
  readyState = 0;
  status = 0;
  responseText = "";
  onreadystatechange: (() => void) | null = null;
  private method = "";
  private url = "";
  private headers: Record<string, string> = {};

  open(method: string, url: string): void {
    this.method = method;
    this.url = url;
  }

  setRequestHeader(name: string, value: string): void {
    this.headers[name] = value;
  }

  send(body: string | null): void {
    FetchXhr.urls.push(this.url);
    FetchXhr.pending++;
    fetch(this.url, {
      method: this.method,
      headers: this.headers,
      body: body ?? undefined,
    })
      .then(async (response) => {
        this.status = response.status;
        this.responseText = await response.text();
      })
      .catch(() => {
        this.status = 0;
      })
      .finally(() => {
        this.readyState = 4;
        this.onreadystatechange?.();
        FetchXhr.pending--;
      });
  }

  abort(): void {}

  /** Resolves once no request is in flight (follow-up requests included). */
  static async idle(): Promise<void> {
    do {
      await new Promise((resolve) => setTimeout(resolve, 10));
    } while (FetchXhr.pending > 0);
  }
}

let dataDir: string;
let server: Server;
let baseUrl: string;

beforeEach(async () => {
  dataDir = await mkdtemp(join(tmpdir(), "kindle-contract-"));
  server = createApp({ keys: [KEY], dataDir, allowedOrigin: ORIGIN }).listen(
    0,
    "127.0.0.1",
  );
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  FetchXhr.urls = [];
  FetchXhr.pending = 0;
  (globalThis as unknown as { XMLHttpRequest: unknown }).XMLHttpRequest =
    FetchXhr;
  localStorage.clear();
});

afterEach(async () => {
  vi.restoreAllMocks();
  (globalThis as unknown as { XMLHttpRequest: unknown }).XMLHttpRequest =
    undefined;
  localStorage.clear();
  await new Promise((resolve) => server.close(resolve));
  await rm(dataDir, { recursive: true, force: true });
});

function auth() {
  return { Authorization: `Bearer ${KEY}` };
}

async function serverEntries(): Promise<
  { puzzleId: string; cells: unknown; rev: number }[]
> {
  const response = await fetch(`${baseUrl}/api/progress`, { headers: auth() });
  return (await response.json()).items;
}

/** Another device pushing straight to the server. */
async function putFromElsewhere(
  puzzleId: string,
  cells: unknown,
  baseRev: number,
): Promise<void> {
  const response = await fetch(`${baseUrl}/api/progress/${puzzleId}`, {
    method: "PUT",
    headers: { ...auth(), "Content-Type": "application/json" },
    body: JSON.stringify({ cells, baseRev }),
  });
  expect(response.status).toBe(200);
}

function openSync(): Promise<string[]> {
  return new Promise((resolve) => {
    const changed: string[] = [];
    syncAllOnOpen(
      (ids) => changed.push(...ids),
      () => resolve(changed),
    );
  });
}

function becomeNewDevice(): void {
  localStorage.clear();
  saveSyncConfig({ baseUrl, key: KEY });
}

describe("client and server agree on the sync wire contract", () => {
  beforeEach(() => {
    saveSyncConfig({ baseUrl, key: KEY });
  });

  it("creates the server's entry from a tap on a puzzle the server has never seen", async () => {
    saveProgress("cat", { cells: [[0, null]] });

    syncPuzzleAfterSave("cat");
    await FetchXhr.idle();

    expect(await serverEntries()).toEqual([
      { puzzleId: "cat", cells: [[0, null]], rev: 1 },
    ]);
    expect(loadSyncMeta("cat")).toEqual({ baseRev: 1, dirty: false });
  });

  it("rebases a dirty tap onto the revision another device left on the server", async () => {
    await putFromElsewhere("cat", [[0, null]], 0);
    await putFromElsewhere("cat", [[0, 0]], 1);
    saveSyncMeta("cat", { baseRev: 1, dirty: false });
    saveProgress("cat", { cells: [[null, 0]] });

    syncPuzzleAfterSave("cat");
    await FetchXhr.idle();

    expect(await serverEntries()).toEqual([
      { puzzleId: "cat", cells: [[null, 0]], rev: 3 },
    ]);
    expect(loadSyncMeta("cat")).toEqual({ baseRev: 3, dirty: false });
  });

  it("restores a wiped device from the server", async () => {
    await putFromElsewhere("cat", [[0, 0]], 0);
    await putFromElsewhere("dog", [[1]], 0);

    const changed = await openSync();

    expect(changed.sort()).toEqual(["cat", "dog"]);
    expect(loadProgress("cat")).toEqual({ cells: [[0, 0]] });
    expect(loadSyncMeta("dog")).toEqual({ baseRev: 1, dirty: false });
  });

  it("never overwrites the server's grid when a wiped device taps before the open-time answer", async () => {
    await putFromElsewhere("cat", [[1, 1]], 0);
    saveProgress("cat", { cells: [[0, null]] });

    const opened = openSync();
    syncPuzzleAfterSave("cat");
    await opened;
    await FetchXhr.idle();

    expect(await serverEntries()).toEqual([
      { puzzleId: "cat", cells: [[1, 1]], rev: 1 },
    ]);
    expect(loadProgress("cat")).toEqual({ cells: [[1, 1]] });
  });

  it("never overwrites the server's grid when the open-time request failed and the player then taps", async () => {
    await putFromElsewhere("cat", [[1, 1]], 0);
    saveSyncConfig({ baseUrl: "http://127.0.0.1:1", key: KEY });
    await openSync();
    saveSyncConfig({ baseUrl, key: KEY });
    saveProgress("cat", { cells: [[0, null]] });

    syncPuzzleAfterSave("cat");
    await FetchXhr.idle();

    expect(await serverEntries()).toEqual([
      { puzzleId: "cat", cells: [[1, 1]], rev: 1 },
    ]);
    expect(loadProgress("cat")).toEqual({ cells: [[1, 1]] });
  });

  it("refills a server that lost its data, and the other device then pulls instead of pushing its older copy", async () => {
    await putFromElsewhere("cat", [[0, null]], 0);
    await putFromElsewhere("cat", [[0, 0]], 1);
    for (const file of await readdir(dataDir)) {
      await rm(join(dataDir, file));
    }

    // Device A: clean at revision 2, newer copy.
    saveSyncMeta("cat", { baseRev: 2, dirty: false });
    saveProgress("cat", { cells: [[0, 0]] });
    await openSync();

    // Device B: clean at revision 2, older copy.
    becomeNewDevice();
    saveSyncMeta("cat", { baseRev: 2, dirty: false });
    saveProgress("cat", { cells: [[0, null]] });
    const changed = await openSync();

    expect(await serverEntries()).toEqual([
      { puzzleId: "cat", cells: [[0, 0]], rev: 3 },
    ]);
    expect(changed).toEqual(["cat"]);
    expect(loadProgress("cat")).toEqual({ cells: [[0, 0]] });
  });

  it("pulls the server's cells over a clean copy when a refilled server reached the same revision number with other cells", async () => {
    // Device B refilled the emptied server from its revision 4, reaching 5.
    await putFromElsewhere("cat", [[1, 1]], 4);
    // Device A is clean at revision 5 with other cells.
    saveSyncMeta("cat", { baseRev: 5, dirty: false });
    saveProgress("cat", { cells: [[0, 0]] });

    const changed = await openSync();

    expect(changed).toEqual(["cat"]);
    expect(loadProgress("cat")).toEqual({ cells: [[1, 1]] });
    expect(loadSyncMeta("cat")).toEqual({ baseRev: 5, dirty: false });
    expect(await serverEntries()).toEqual([
      { puzzleId: "cat", cells: [[1, 1]], rev: 5 },
    ]);
  });

  it("restores a wiped device from a server holding more than one page of puzzles", async () => {
    const entries: Record<string, unknown> = {};
    for (let i = 0; i < 230; i++) {
      entries[`puzzle-${String(i).padStart(3, "0")}`] = {
        cells: [[i % 2]],
        rev: 1,
        updatedAt: "2026-01-01T00:00:00.000Z",
      };
    }
    const file = `${createHash("sha256").update(KEY).digest("hex")}.json`;
    await writeFile(join(dataDir, file), JSON.stringify({ entries }));

    const changed = await openSync();

    expect(changed).toHaveLength(230);
    expect(FetchXhr.urls.filter((url) => url.includes("cursor="))).toHaveLength(
      2,
    );
    expect(loadProgress("puzzle-000")).toEqual({ cells: [[0]] });
    expect(loadProgress("puzzle-229")).toEqual({ cells: [[1]] });
    expect(loadSyncMeta("puzzle-229")).toEqual({ baseRev: 1, dirty: false });
  });

  it("sends no request with a double slash when the address was saved with a trailing slash", async () => {
    saveSyncConfig({ baseUrl: `${baseUrl}/`, key: KEY });
    expect(loadSyncConfig()?.baseUrl).toBe(baseUrl);
    saveProgress("cat", { cells: [[0, null]] });

    await openSync();
    syncPuzzleAfterSave("cat");
    await FetchXhr.idle();

    expect(FetchXhr.urls.length).toBeGreaterThan(1);
    for (const url of FetchXhr.urls) {
      expect(url).not.toContain("//api");
    }
    expect((await serverEntries()).map((entry) => entry.puzzleId)).toEqual([
      "cat",
    ]);
  });
});

describe("the connection test against the real server", () => {
  function connectionResult(key: string): Promise<string> {
    return new Promise((resolve) => testConnection({ baseUrl, key }, resolve));
  }

  it("answers ok with the right key", async () => {
    expect(await connectionResult(KEY)).toBe("ok");
  });

  it("answers unauthorized with a wrong key", async () => {
    expect(await connectionResult("another-key-456")).toBe("unauthorized");
  });

  it("answers server-error when the server's key file is corrupt", async () => {
    const file = `${createHash("sha256").update(KEY).digest("hex")}.json`;
    await writeFile(join(dataDir, file), "{not json");
    vi.spyOn(process.stderr, "write").mockReturnValue(true);

    expect(await connectionResult(KEY)).toBe("server-error");
  });
});
