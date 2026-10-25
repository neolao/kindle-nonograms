// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FakeXhr } from "./fakeXhr.js";
import { fetchAllProgress, putProgress, testConnection } from "./syncClient.js";

const config = { baseUrl: "https://nonograms.lan", key: "secret" };

const entry = { puzzleId: "cat", cells: [[0, null]], rev: 2 };

beforeEach(() => {
  vi.useFakeTimers();
  FakeXhr.install();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  FakeXhr.uninstall();
});

function lastXhr(): FakeXhr {
  return FakeXhr.instances[FakeXhr.instances.length - 1];
}

describe("fetchAllProgress on a single page", () => {
  it("sends an authorized GET and returns the validated items and cursor", () => {
    const cb = vi.fn();

    fetchAllProgress(config, cb);
    const xhr = lastXhr();
    xhr.respond(200, { items: [entry], nextCursor: null });

    expect(xhr.method).toBe("GET");
    expect(xhr.url).toBe("https://nonograms.lan/api/progress");
    expect(xhr.headers.Authorization).toBe("Bearer secret");
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith({ kind: "ok", items: [entry] });
  });

  it("passes the cursor as an encoded query parameter", () => {
    fetchAllProgress(config, vi.fn());
    lastXhr().respond(200, { items: [], nextCursor: "a+b/c=" });

    expect(lastXhr().url).toBe(
      "https://nonograms.lan/api/progress?cursor=a%2Bb%2Fc%3D",
    );
  });

  it("drops an item whose cells or id are invalid but keeps the others", () => {
    const cb = vi.fn();

    fetchAllProgress(config, cb);
    lastXhr().respond(200, {
      items: [
        entry,
        { puzzleId: "bad", cells: [[0], [0, 1]], rev: 1 },
        { puzzleId: "../x", cells: [[0]], rev: 1 },
        { puzzleId: "norev", cells: [[0]] },
        null,
      ],
      nextCursor: null,
    });

    expect(cb).toHaveBeenCalledWith({ kind: "ok", items: [entry] });
  });

  it("reports unauthorized on 401", () => {
    const cb = vi.fn();
    fetchAllProgress(config, cb);
    lastXhr().respond(401, { error: { code: "unauthorized" } });
    expect(cb).toHaveBeenCalledWith({ kind: "unauthorized" });
  });

  it("reports network when the request fails", () => {
    const cb = vi.fn();
    fetchAllProgress(config, cb);
    lastXhr().fail();
    expect(cb).toHaveBeenCalledWith({ kind: "network" });
  });

  it("reports network on a server error", () => {
    const cb = vi.fn();
    fetchAllProgress(config, cb);
    lastXhr().respond(503, "unavailable");
    expect(cb).toHaveBeenCalledWith({ kind: "network" });
  });

  it("reports server-error when the server answers 5xx with its storage_corrupt error", () => {
    const cb = vi.fn();
    fetchAllProgress(config, cb);
    lastXhr().respond(500, {
      error: { code: "storage_corrupt", message: "unreadable" },
    });
    expect(cb).toHaveBeenCalledWith({ kind: "server-error" });
  });

  it("keeps network for a 5xx whose body is another error", () => {
    const cb = vi.fn();
    fetchAllProgress(config, cb);
    lastXhr().respond(500, { error: { code: "internal_error" } });
    expect(cb).toHaveBeenCalledWith({ kind: "network" });
  });

  it("reports not-a-sync-server for invalid JSON or an unexpected shape", () => {
    const html = vi.fn();
    fetchAllProgress(config, html);
    lastXhr().respond(200, "<html>hello</html>");
    expect(html).toHaveBeenCalledWith({ kind: "not-a-sync-server" });

    const shape = vi.fn();
    fetchAllProgress(config, shape);
    lastXhr().respond(200, { items: "nope", nextCursor: null });
    expect(shape).toHaveBeenCalledWith({ kind: "not-a-sync-server" });

    const cursor = vi.fn();
    fetchAllProgress(config, cursor);
    lastXhr().respond(200, { items: [], nextCursor: 3 });
    expect(cursor).toHaveBeenCalledWith({ kind: "not-a-sync-server" });
  });

  it("reports not-a-sync-server on a 404", () => {
    const cb = vi.fn();
    fetchAllProgress(config, cb);
    lastXhr().respond(404, "not found");
    expect(cb).toHaveBeenCalledWith({ kind: "not-a-sync-server" });
  });

  it("gives up after the timeout even if the browser ignores xhr.timeout, and answers once", () => {
    const cb = vi.fn();

    fetchAllProgress(config, cb);
    const xhr = lastXhr();
    expect(xhr.timeout).toBe(10000);
    vi.advanceTimersByTime(10000);

    expect(cb).toHaveBeenCalledWith({ kind: "network" });
    expect(xhr.aborted).toBe(true);

    xhr.respond(200, { items: [], nextCursor: null });
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("does not fire the fallback timer after a normal answer", () => {
    const cb = vi.fn();
    fetchAllProgress(config, cb);
    const xhr = lastXhr();
    xhr.respond(200, { items: [], nextCursor: null });

    vi.advanceTimersByTime(20000);

    expect(cb).toHaveBeenCalledTimes(1);
    expect(xhr.aborted).toBe(false);
  });

  it("reports network instead of throwing when XMLHttpRequest is unavailable", () => {
    FakeXhr.uninstall();
    const cb = vi.fn();

    expect(() => fetchAllProgress(config, cb)).not.toThrow();
    expect(cb).toHaveBeenCalledWith({ kind: "network" });
  });
});

describe("fetchAllProgress", () => {
  it("follows nextCursor and concatenates every page", () => {
    const cb = vi.fn();
    const dog = { puzzleId: "dog", cells: [[1]], rev: 1 };

    fetchAllProgress(config, cb);
    lastXhr().respond(200, { items: [entry], nextCursor: "c1" });
    expect(lastXhr().url).toContain("cursor=c1");
    lastXhr().respond(200, { items: [dog], nextCursor: null });

    expect(FakeXhr.instances).toHaveLength(2);
    expect(cb).toHaveBeenCalledWith({ kind: "ok", items: [entry, dog] });
  });

  it("stops with the failure kind when a later page fails", () => {
    const cb = vi.fn();

    fetchAllProgress(config, cb);
    lastXhr().respond(200, { items: [entry], nextCursor: "c1" });
    lastXhr().respond(401, {});

    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith({ kind: "unauthorized" });
  });

  it("stops requesting after a bounded number of pages when the server never ends", () => {
    const cb = vi.fn();

    fetchAllProgress(config, cb);
    for (let i = 0; i < 1000 && cb.mock.calls.length === 0; i++) {
      lastXhr().respond(200, { items: [], nextCursor: "again" });
    }

    expect(cb).toHaveBeenCalledWith({ kind: "ok", items: [] });
    expect(FakeXhr.instances).toHaveLength(100);
  });
});

describe("putProgress", () => {
  it("sends the cells and baseRev as JSON to the puzzle's URL", () => {
    putProgress(config, "cat", [[0, null]], 1, vi.fn());
    const xhr = lastXhr();

    expect(xhr.method).toBe("PUT");
    expect(xhr.url).toBe("https://nonograms.lan/api/progress/cat");
    expect(xhr.headers["Content-Type"]).toBe("application/json");
    expect(xhr.headers.Authorization).toBe("Bearer secret");
    expect(JSON.parse(xhr.body ?? "")).toEqual({
      cells: [[0, null]],
      baseRev: 1,
    });
  });

  it("returns the stored entry on 200", () => {
    const cb = vi.fn();
    putProgress(config, "cat", [[0, null]], 1, cb);
    lastXhr().respond(200, entry);
    expect(cb).toHaveBeenCalledWith({ kind: "ok", entry });
  });

  it("returns the server's current entry on a 409 progress_stale", () => {
    const cb = vi.fn();
    putProgress(config, "cat", [[0, null]], 1, cb);
    lastXhr().respond(409, {
      error: { code: "progress_stale", message: "x" },
      current: entry,
    });
    expect(cb).toHaveBeenCalledWith({ kind: "stale", current: entry });
  });

  it("treats a 409 without a valid current entry as invalid", () => {
    const cb = vi.fn();
    putProgress(config, "cat", [[0, null]], 1, cb);
    lastXhr().respond(409, { error: { code: "progress_stale" } });
    expect(cb).toHaveBeenCalledWith({ kind: "invalid" });
  });

  it("maps 401, 400 and 422, network failures and non-sync answers", () => {
    const run = (act: (xhr: FakeXhr) => void) => {
      const cb = vi.fn();
      putProgress(config, "cat", [[0]], 0, cb);
      act(lastXhr());
      return cb.mock.calls[0][0];
    };

    expect(run((x) => x.respond(401, {}))).toEqual({ kind: "unauthorized" });
    expect(run((x) => x.respond(400, {}))).toEqual({ kind: "invalid" });
    expect(run((x) => x.respond(422, {}))).toEqual({ kind: "invalid" });
    expect(run((x) => x.fail())).toEqual({ kind: "network" });
    expect(run((x) => x.respond(500, {}))).toEqual({ kind: "network" });
    expect(
      run((x) => x.respond(500, { error: { code: "storage_corrupt" } })),
    ).toEqual({ kind: "server-error" });
    expect(run((x) => x.respond(200, "<html>"))).toEqual({
      kind: "not-a-sync-server",
    });
    expect(run((x) => x.respond(200, { rev: "x" }))).toEqual({
      kind: "not-a-sync-server",
    });
  });

  it("reports not-a-sync-server on a 404 and on a redirect", () => {
    const run = (status: number) => {
      const cb = vi.fn();
      putProgress(config, "cat", [[0]], 0, cb);
      lastXhr().respond(status, {});
      return cb.mock.calls[0][0];
    };

    expect(run(404)).toEqual({ kind: "not-a-sync-server" });
    expect(run(302)).toEqual({ kind: "not-a-sync-server" });
  });

  it("times out as a network failure", () => {
    const cb = vi.fn();
    putProgress(config, "cat", [[0]], 0, cb);
    vi.advanceTimersByTime(10000);
    expect(cb).toHaveBeenCalledWith({ kind: "network" });
  });
});

describe("testConnection", () => {
  it("asks for a single item and reports ok", () => {
    const cb = vi.fn();
    testConnection(config, cb);
    expect(lastXhr().url).toBe("https://nonograms.lan/api/progress?limit=1");
    lastXhr().respond(200, { items: [], nextCursor: null });
    expect(cb).toHaveBeenCalledWith("ok");
  });

  it("reports unauthorized for a wrong key", () => {
    const cb = vi.fn();
    testConnection(config, cb);
    lastXhr().respond(401, {});
    expect(cb).toHaveBeenCalledWith("unauthorized");
  });

  it("reports unreachable on a network failure or a timeout", () => {
    const failed = vi.fn();
    testConnection(config, failed);
    lastXhr().fail();
    expect(failed).toHaveBeenCalledWith("unreachable");

    const slow = vi.fn();
    testConnection(config, slow);
    vi.advanceTimersByTime(10000);
    expect(slow).toHaveBeenCalledWith("unreachable");
  });

  it("reports server-error when the server is reachable but cannot read its storage", () => {
    const cb = vi.fn();
    testConnection(config, cb);
    lastXhr().respond(500, { error: { code: "storage_corrupt" } });
    expect(cb).toHaveBeenCalledWith("server-error");
  });

  it("reports not-a-sync-server when the answer is not the expected JSON", () => {
    const cb = vi.fn();
    testConnection(config, cb);
    lastXhr().respond(200, "<html>router login</html>");
    expect(cb).toHaveBeenCalledWith("not-a-sync-server");
  });

  it("reports not-a-sync-server when a 200 answer is JSON of another shape", () => {
    const cb = vi.fn();
    testConnection(config, cb);
    lastXhr().respond(200, { hello: "world" });
    expect(cb).toHaveBeenCalledWith("not-a-sync-server");
  });

  it("allows an http URL from an http page and sends the request", () => {
    vi.stubGlobal("location", { protocol: "http:" });
    const cb = vi.fn();

    testConnection({ baseUrl: "http://192.168.1.5:3000", key: "k" }, cb);

    expect(FakeXhr.instances).toHaveLength(1);
    lastXhr().respond(200, { items: [], nextCursor: null });
    expect(cb).toHaveBeenCalledWith("ok");
  });

  it("reports mixed-content up-front, without a request, for an http URL from an https page", () => {
    vi.stubGlobal("location", { protocol: "https:" });
    const cb = vi.fn();

    testConnection({ baseUrl: "http://192.168.1.5:3000", key: "k" }, cb);

    expect(cb).toHaveBeenCalledWith("mixed-content");
    expect(FakeXhr.instances).toHaveLength(0);
  });

  it("allows an https URL from an https page", () => {
    vi.stubGlobal("location", { protocol: "https:" });
    testConnection(config, vi.fn());
    expect(FakeXhr.instances).toHaveLength(1);
  });
});
