import { createHash } from "node:crypto";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "./app.js";

const KEY = "secret-key-one";
const ORIGIN = "https://neolao.github.io";
const CELLS = [
  [0, null],
  ["marked", 1],
];
const OTHER_CELLS = [
  [null, null],
  [null, 1],
];

let dataDir: string;
let app: ReturnType<typeof createApp>;

beforeEach(async () => {
  dataDir = await mkdtemp(join(tmpdir(), "kindle-sync-"));
  app = createApp({
    keys: [KEY, "secret-key-two"],
    dataDir,
    allowedOrigin: ORIGIN,
  });
});

afterEach(async () => {
  vi.restoreAllMocks();
  await rm(dataDir, { recursive: true, force: true });
});

function keyFile(key: string): string {
  return join(
    dataDir,
    `${createHash("sha256").update(key).digest("hex")}.json`,
  );
}

function auth(key = KEY) {
  return { Authorization: `Bearer ${key}` };
}

function put(id: string, body: unknown, key = KEY) {
  return request(app)
    .put(`/api/progress/${id}`)
    .set(auth(key))
    .send(body as object);
}

async function seed(
  entries: Record<string, unknown>,
  key = KEY,
): Promise<void> {
  await writeFile(keyFile(key), JSON.stringify({ entries }));
}

function seedEntry(updatedAt = "2026-01-01T00:00:00.000Z") {
  return { cells: CELLS, rev: 1, updatedAt };
}

describe("authentication", () => {
  it("answers 401 with the same body for a missing key and a wrong key", async () => {
    const missing = await request(app).get("/api/progress");
    const wrong = await request(app).get("/api/progress").set(auth("nope"));

    expect(missing.status).toBe(401);
    expect(wrong.status).toBe(401);
    expect(wrong.body).toEqual(missing.body);
    expect(missing.body.error.code).toBe("unauthorized");
    expect(missing.headers["www-authenticate"]).toBe("Bearer");
  });

  it("rejects a key that is only a prefix of a real key", async () => {
    const res = await request(app)
      .get("/api/progress")
      .set(auth(KEY.slice(0, 5)));

    expect(res.status).toBe(401);
  });

  it("accepts any of the configured keys, each with its own storage", async () => {
    await put("flag", { cells: CELLS, baseRev: 0 }, "secret-key-two");

    const second = await request(app)
      .get("/api/progress")
      .set(auth("secret-key-two"));
    const first = await request(app).get("/api/progress").set(auth());

    expect(second.body.items).toHaveLength(1);
    expect(first.body.items).toEqual([]);
  });
});

describe("PUT then GET", () => {
  it("creates an entry at revision 1 and lists it back", async () => {
    const created = await put("flag", {
      cells: CELLS,
      baseRev: 0,
      openedAt: "2026-02-03T04:05:06.000Z",
    });

    expect(created.status).toBe(200);
    expect(created.body).toEqual({
      puzzleId: "flag",
      cells: CELLS,
      rev: 1,
      openedAt: "2026-02-03T04:05:06.000Z",
    });

    const listed = await request(app).get("/api/progress").set(auth());

    expect(listed.status).toBe(200);
    expect(listed.body).toEqual({ items: [created.body], nextCursor: null });
  });

  it("bumps the revision when baseRev equals the stored revision", async () => {
    await put("flag", { cells: CELLS, baseRev: 0 });

    const second = await put("flag", { cells: OTHER_CELLS, baseRev: 1 });

    expect(second.status).toBe(200);
    expect(second.body.rev).toBe(2);
    expect(second.body.cells).toEqual(OTHER_CELLS);
  });

  it("treats resending the same cells as a no-op that keeps the revision", async () => {
    await put("flag", { cells: CELLS, baseRev: 0 });

    const again = await put("flag", { cells: CELLS, baseRev: 0 });
    const afterBump = await put("flag", { cells: CELLS, baseRev: 1 });

    expect(again.status).toBe(200);
    expect(again.body.rev).toBe(1);
    expect(afterBump.status).toBe(200);
    expect(afterBump.body.rev).toBe(1);
  });

  it("answers 409 with the current entry on a stale baseRev and leaves storage unchanged", async () => {
    await put("flag", { cells: CELLS, baseRev: 0 });
    await put("flag", { cells: OTHER_CELLS, baseRev: 1 });
    const before = await readFile(keyFile(KEY), "utf-8");

    const res = await put("flag", {
      cells: [
        [1, 1],
        [1, 1],
      ],
      baseRev: 1,
    });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("progress_stale");
    expect(typeof res.body.error.message).toBe("string");
    expect(res.body.current).toEqual({
      puzzleId: "flag",
      cells: OTHER_CELLS,
      rev: 2,
    });
    expect(await readFile(keyFile(KEY), "utf-8")).toBe(before);
  });

  it("answers 409 when a device that never saw the puzzle writes over an existing entry", async () => {
    await put("flag", { cells: CELLS, baseRev: 0 });

    const res = await put("flag", { cells: OTHER_CELLS, baseRev: 0 });

    expect(res.status).toBe(409);
    expect(res.body.current.cells).toEqual(CELLS);
  });

  it("lets exactly one of two simultaneous creations win", async () => {
    const [a, b] = await Promise.all([
      put("flag", { cells: CELLS, baseRev: 0 }),
      put("flag", { cells: OTHER_CELLS, baseRev: 0 }),
    ]);

    expect([a.status, b.status].sort()).toEqual([200, 409]);
    const winner = a.status === 200 ? a : b;
    const listed = await request(app).get("/api/progress").set(auth());
    expect(listed.body.items).toEqual([winner.body]);
  });

  it("restores an entry the server lost one revision ahead of what the client saw", async () => {
    const res = await put("flag", { cells: CELLS, baseRev: 3 });

    expect(res.status).toBe(200);
    expect(res.body.rev).toBe(4);
  });
});

describe("openedAt", () => {
  const FIRST = "2026-02-03T04:05:06.000Z";
  const SECOND = "2026-03-04T05:06:07.000Z";

  async function storedEntry() {
    return JSON.parse(await readFile(keyFile(KEY), "utf-8")).entries.flag;
  }

  it("keeps the stored openedAt when a later write sends none", async () => {
    await put("flag", { cells: CELLS, baseRev: 0, openedAt: FIRST });

    const second = await put("flag", { cells: OTHER_CELLS, baseRev: 1 });

    expect(second.body.rev).toBe(2);
    expect(second.body.openedAt).toBe(FIRST);
    expect((await storedEntry()).openedAt).toBe(FIRST);
  });

  it("replaces the stored openedAt when a later write sends a new one", async () => {
    await put("flag", { cells: CELLS, baseRev: 0, openedAt: FIRST });

    const second = await put("flag", {
      cells: OTHER_CELLS,
      baseRev: 1,
      openedAt: SECOND,
    });

    expect(second.body.openedAt).toBe(SECOND);
  });

  it("updates openedAt on a resend of the same cells without bumping anything else", async () => {
    await put("flag", { cells: CELLS, baseRev: 0, openedAt: FIRST });
    const before = await storedEntry();

    const again = await put("flag", {
      cells: CELLS,
      baseRev: 1,
      openedAt: SECOND,
    });

    expect(again.status).toBe(200);
    expect(again.body.rev).toBe(1);
    expect(again.body.openedAt).toBe(SECOND);
    expect(await storedEntry()).toEqual({ ...before, openedAt: SECOND });
  });

  it("leaves the file untouched on a resend of the same cells with no openedAt", async () => {
    await put("flag", { cells: CELLS, baseRev: 0, openedAt: FIRST });
    const before = await readFile(keyFile(KEY), "utf-8");

    await put("flag", { cells: CELLS, baseRev: 1 });

    expect(await readFile(keyFile(KEY), "utf-8")).toBe(before);
  });
});

describe("PUT validation", () => {
  it.each([
    ["a ragged grid", { cells: [[null, null], [null]], baseRev: 0 }],
    ["an invalid cell", { cells: [[-1]], baseRev: 0 }],
    ["a missing grid", { baseRev: 0 }],
    ["a missing baseRev", { cells: CELLS }],
    ["a negative baseRev", { cells: CELLS, baseRev: -1 }],
    ["a fractional baseRev", { cells: CELLS, baseRev: 0.5 }],
    [
      "a non-date openedAt",
      { cells: CELLS, baseRev: 0, openedAt: "yesterday" },
    ],
  ])("rejects %s with 422 and stores nothing", async (_label, body) => {
    const res = await put("flag", body);

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("invalid_body");
    expect(await readdir(dataDir)).toEqual([]);
  });

  it("rejects a body puzzleId that differs from the path with 400", async () => {
    const res = await put("flag", {
      puzzleId: "other",
      cells: CELLS,
      baseRev: 0,
    });

    expect(res.status).toBe(400);
    expect(await readdir(dataDir)).toEqual([]);
  });

  it("accepts a body puzzleId equal to the path", async () => {
    const res = await put("flag", {
      puzzleId: "flag",
      cells: CELLS,
      baseRev: 0,
    });

    expect(res.status).toBe(200);
  });

  it.each([
    "..%2Fx",
    "..%2F..%2Fetc%2Fpasswd",
    "Flag",
    "a.json",
    "a%00b",
    "x".repeat(101),
  ])("rejects the puzzle id %s with 400 and writes no file", async (id) => {
    const res = await put(id, { cells: CELLS, baseRev: 0 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("invalid_puzzle_id");
    expect(await readdir(dataDir)).toEqual([]);
  });

  it("answers 400 on malformed JSON", async () => {
    const res = await request(app)
      .put("/api/progress/flag")
      .set(auth())
      .set("Content-Type", "application/json")
      .send("{not json");

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("invalid_json");
  });

  it("answers 413 on a body over 100kb", async () => {
    const res = await put("flag", {
      cells: CELLS,
      baseRev: 0,
      pad: "x".repeat(150_000),
    });

    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe("payload_too_large");
  });
});

describe("GET /api/progress", () => {
  async function seedMany(count: number) {
    const entries: Record<string, unknown> = {};
    for (let i = 0; i < count; i++) {
      entries[`p${String(i).padStart(3, "0")}`] = seedEntry();
    }
    await seed(entries);
  }

  it("pages through 150 entries sorted by id, 100 then 50", async () => {
    await seedMany(150);

    const first = await request(app).get("/api/progress").set(auth());
    const second = await request(app)
      .get("/api/progress")
      .query({ cursor: first.body.nextCursor })
      .set(auth());

    expect(first.body.items).toHaveLength(100);
    expect(first.body.items[0].puzzleId).toBe("p000");
    expect(first.body.items[99].puzzleId).toBe("p099");
    expect(typeof first.body.nextCursor).toBe("string");
    expect(second.body.items).toHaveLength(50);
    expect(second.body.items[0].puzzleId).toBe("p100");
    expect(second.body.nextCursor).toBeNull();
  });

  it("honors a smaller limit and caps a huge limit at 500", async () => {
    await seedMany(600);

    const small = await request(app).get("/api/progress?limit=2").set(auth());
    const huge = await request(app).get("/api/progress?limit=9999").set(auth());

    expect(
      small.body.items.map((i: { puzzleId: string }) => i.puzzleId),
    ).toEqual(["p000", "p001"]);
    expect(huge.body.items).toHaveLength(500);
    expect(huge.body.nextCursor).not.toBeNull();
  });

  it.each([
    "limit=0",
    "limit=abc",
    "limit=1.5",
    "cursor=%25%25%25",
    "limit[]=5",
    "cursor[]=a",
    "cursor[a]=b",
    "updatedSince[]=2026-01-01",
    `cursor=${Buffer.from("../x").toString("base64url")}`,
  ])("rejects the bad query %s with 400", async (query) => {
    const res = await request(app).get(`/api/progress?${query}`).set(auth());

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("invalid_query");
  });

  it("returns only entries updated strictly after updatedSince", async () => {
    await seed({
      old: seedEntry("2026-01-01T00:00:00.000Z"),
      mid: seedEntry("2026-01-02T00:00:00.000Z"),
      new: seedEntry("2026-01-03T00:00:00.000Z"),
    });

    const res = await request(app)
      .get("/api/progress")
      .query({ updatedSince: "2026-01-02T00:00:00.000Z" })
      .set(auth());

    expect(res.body.items.map((i: { puzzleId: string }) => i.puzzleId)).toEqual(
      ["new"],
    );
  });

  it("rejects an unparseable updatedSince with 400", async () => {
    const res = await request(app)
      .get("/api/progress?updatedSince=soon")
      .set(auth());

    expect(res.status).toBe(400);
  });

  it("skips invalid entries inside a hand-edited file", async () => {
    await seed({
      good: seedEntry(),
      ragged: {
        cells: [[1], []],
        rev: 1,
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      norev: { cells: CELLS, updatedAt: "2026-01-01T00:00:00.000Z" },
      "Bad Id": seedEntry(),
    });

    const res = await request(app).get("/api/progress").set(auth());

    expect(res.status).toBe(200);
    expect(res.body.items.map((i: { puzzleId: string }) => i.puzzleId)).toEqual(
      ["good"],
    );
  });

  it("lists an empty file set as no items", async () => {
    const res = await request(app).get("/api/progress").set(auth());

    expect(res.body).toEqual({ items: [], nextCursor: null });
  });
});

describe("corrupt storage", () => {
  beforeEach(async () => {
    await writeFile(keyFile(KEY), "{this is not json");
  });

  it("answers GET with the storage_corrupt envelope instead of an empty list", async () => {
    vi.spyOn(process.stderr, "write").mockReturnValue(true);

    const res = await request(app).get("/api/progress").set(auth());

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      error: { code: "storage_corrupt", message: expect.any(String) },
    });
    expect(JSON.stringify(res.body)).not.toContain(dataDir);
  });

  it("logs the corrupt storage without the key", async () => {
    const write = vi.spyOn(process.stderr, "write").mockReturnValue(true);

    await request(app).get("/api/progress").set(auth());

    const logged = write.mock.calls.map(([chunk]) => String(chunk)).join("");
    expect(logged).toContain("StorageCorruptError");
    expect(logged).toContain("/api/progress");
    expect(logged).not.toContain(KEY);
  });

  it("refuses PUT with a 500 envelope that leaks no path and keeps the file", async () => {
    vi.spyOn(process.stderr, "write").mockReturnValue(true);
    const res = await put("flag", { cells: CELLS, baseRev: 0 });

    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe("storage_corrupt");
    expect(JSON.stringify(res.body)).not.toContain(dataDir);
    expect(await readFile(keyFile(KEY), "utf-8")).toBe("{this is not json");
  });
});

describe("a stored file that is valid JSON of the wrong shape", () => {
  it.each(["null", "[]", "{}", '{"entries":null}', '{"entries":"x"}'])(
    "answers 500 storage_corrupt and keeps %s untouched on a PUT",
    async (raw) => {
      vi.spyOn(process.stderr, "write").mockReturnValue(true);
      await writeFile(keyFile(KEY), raw);

      const res = await put("flag", { cells: CELLS, baseRev: 0 });

      expect(res.status).toBe(500);
      expect(res.body.error.code).toBe("storage_corrupt");
      expect(await readFile(keyFile(KEY), "utf-8")).toBe(raw);
    },
  );
});

describe("CORS and caching", () => {
  it("allows exactly the configured origin on success, 401, 409 and 404 responses", async () => {
    await put("flag", { cells: CELLS, baseRev: 0 });
    const responses = [
      await request(app).get("/api/progress").set(auth()).set("Origin", ORIGIN),
      await request(app).get("/api/progress").set("Origin", ORIGIN),
      await request(app)
        .put("/api/progress/flag")
        .set(auth())
        .set("Origin", ORIGIN)
        .send({ cells: OTHER_CELLS, baseRev: 0 }),
      await request(app).get("/nope").set(auth()).set("Origin", ORIGIN),
    ];

    expect(responses.map((r) => r.status)).toEqual([200, 401, 409, 404]);
    for (const res of responses) {
      expect(res.headers["access-control-allow-origin"]).toBe(ORIGIN);
      expect(res.headers.vary).toContain("Origin");
    }
  });

  it("omits Allow-Origin for another origin but still varies on Origin", async () => {
    const res = await request(app)
      .get("/api/progress")
      .set(auth())
      .set("Origin", "https://evil.example");

    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
    expect(res.headers.vary).toContain("Origin");
  });

  it("answers a preflight with 204 and no auth, including Private Network access", async () => {
    const res = await request(app)
      .options("/api/progress/flag")
      .set("Origin", ORIGIN)
      .set("Access-Control-Request-Method", "PUT")
      .set("Access-Control-Request-Private-Network", "true");

    expect(res.status).toBe(204);
    expect(res.headers["access-control-allow-origin"]).toBe(ORIGIN);
    expect(res.headers["access-control-allow-methods"]).toBe(
      "GET, PUT, OPTIONS",
    );
    expect(res.headers["access-control-allow-headers"]).toBe(
      "Authorization, Content-Type",
    );
    expect(res.headers["access-control-max-age"]).toBeDefined();
    expect(res.headers["access-control-allow-private-network"]).toBe("true");
    expect(res.headers["cache-control"]).toBe("no-store");
  });

  it("does not grant Private Network access when the preflight did not ask for it", async () => {
    const res = await request(app)
      .options("/api/progress")
      .set("Origin", ORIGIN);

    expect(res.headers["access-control-allow-private-network"]).toBeUndefined();
  });

  it("forbids content sniffing on every kind of response", async () => {
    const responses = [
      await request(app).get("/api/progress").set(auth()),
      await request(app).get("/api/progress"),
      await request(app).get("/nope"),
      await request(app).options("/api/progress"),
    ];

    for (const res of responses) {
      expect(res.headers["x-content-type-options"]).toBe("nosniff");
    }
  });

  it("marks every kind of response no-store", async () => {
    const responses = [
      await request(app).get("/api/progress").set(auth()),
      await request(app).get("/api/progress"),
      await request(app).get("/nope"),
      await put("flag", { cells: [[-1]], baseRev: 0 }),
    ];

    for (const res of responses) {
      expect(res.headers["cache-control"]).toBe("no-store");
    }
  });
});

describe("errors", () => {
  it("answers an unknown route with the 404 envelope", async () => {
    const res = await request(app).get("/nope");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: { code: "not_found", message: expect.any(String) },
    });
  });

  it("logs an unexpected failure with method, path and cause but never the key", async () => {
    const write = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    const broken = createApp({
      keys: [KEY],
      dataDir: join(dataDir, "missing-parent", "\0bad"),
      allowedOrigin: ORIGIN,
    });

    await request(broken)
      .put("/api/progress/flag")
      .set(auth())
      .send({ cells: CELLS, baseRev: 0 });

    const logged = write.mock.calls.map(([chunk]) => String(chunk)).join("");
    expect(logged).toContain("PUT");
    expect(logged).toContain("/api/progress/flag");
    expect(logged).toContain("TypeError");
    expect(logged).not.toContain(KEY);
    expect(logged).not.toContain("Bearer");
  });

  it("answers an unexpected failure with a generic 500 that leaks nothing", async () => {
    vi.spyOn(process.stderr, "write").mockReturnValue(true);
    const broken = createApp({
      keys: [KEY],
      dataDir: join(dataDir, "missing-parent", "\0bad"),
      allowedOrigin: ORIGIN,
    });

    const res = await request(broken)
      .put("/api/progress/flag")
      .set(auth())
      .send({ cells: CELLS, baseRev: 0 });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      error: { code: "internal_error", message: expect.any(String) },
    });
    expect(JSON.stringify(res.body)).not.toContain(dataDir);
    expect(JSON.stringify(res.body)).not.toContain(KEY);
  });
});
