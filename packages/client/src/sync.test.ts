// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FakeXhr } from "./fakeXhr.js";
import { loadProgress, saveProgress } from "./progressStorage.js";
import {
  cancelRunningSyncs,
  syncAllOnOpen,
  syncPuzzleAfterSave,
} from "./sync.js";
import {
  loadSyncStatus,
  saveSyncConfig,
  saveSyncStatus,
} from "./syncConfig.js";
import { loadSyncMeta, saveSyncMeta } from "./syncMeta.js";

const config = { baseUrl: "https://nonograms.lan", key: "secret" };

beforeEach(() => {
  FakeXhr.install();
  vi.useFakeTimers();
  vi.setSystemTime(new Date(1_700_000_000_000));
});

afterEach(() => {
  cancelRunningSyncs();
  // Settle whatever a test left unanswered, so no puzzle stays "in flight".
  for (const request of FakeXhr.instances) {
    if (request.readyState !== 4) {
      request.fail();
    }
  }
  vi.useRealTimers();
  vi.restoreAllMocks();
  FakeXhr.uninstall();
  localStorage.clear();
});

function xhr(index: number): FakeXhr {
  return FakeXhr.instances[index];
}

function sentBody(index: number): { cells: unknown; baseRev: number } {
  return JSON.parse(xhr(index).body ?? "");
}

function serverPage(items: unknown[]): unknown {
  return { items, nextCursor: null };
}

describe("syncPuzzleAfterSave", () => {
  it("makes no network call and writes no sync key without a config", () => {
    saveProgress("cat", { cells: [[0, null]] });

    syncPuzzleAfterSave("cat");

    expect(FakeXhr.instances).toHaveLength(0);
    expect(loadSyncMeta("cat")).toBeUndefined();
    const keys = Object.keys(localStorage).filter(
      (key) => key.indexOf("kindle-nonograms:sync") === 0,
    );
    expect(keys).toEqual([]);
  });

  it("pushes the saved cells and records the revision once the server accepts", () => {
    saveSyncConfig(config);
    saveProgress("cat", { cells: [[0, null]] });

    syncPuzzleAfterSave("cat");
    expect(loadSyncMeta("cat")).toBeUndefined();
    expect(sentBody(0)).toEqual({ cells: [[0, null]], baseRev: 0 });
    xhr(0).respond(200, { puzzleId: "cat", cells: [[0, null]], rev: 1 });

    expect(loadSyncMeta("cat")).toEqual({ baseRev: 1, dirty: false });
    expect(loadSyncStatus()).toEqual({
      lastSyncAt: 1_700_000_000_000,
      lastAttemptFailed: false,
    });
  });

  it("keeps the puzzle dirty and records a failed attempt when the network fails", () => {
    saveSyncConfig(config);
    saveSyncMeta("cat", { baseRev: 2, dirty: false });
    saveProgress("cat", { cells: [[0, null]] });

    syncPuzzleAfterSave("cat");
    xhr(0).fail();

    expect(loadSyncMeta("cat")).toEqual({ baseRev: 2, dirty: true });
    expect(loadSyncStatus().lastAttemptFailed).toBe(true);
  });

  it("keeps the puzzle dirty and records a failed attempt on 401", () => {
    saveSyncConfig(config);
    saveSyncMeta("cat", { baseRev: 2, dirty: false });
    saveProgress("cat", { cells: [[0, null]] });

    syncPuzzleAfterSave("cat");
    xhr(0).respond(401, {});

    expect(loadSyncMeta("cat")?.dirty).toBe(true);
    expect(loadSyncStatus().lastAttemptFailed).toBe(true);
  });

  it("rebases onto the server's revision with one retry when the push is stale", () => {
    saveSyncConfig(config);
    saveSyncMeta("cat", { baseRev: 1, dirty: false });
    saveProgress("cat", { cells: [[0, null]] });

    syncPuzzleAfterSave("cat");
    xhr(0).respond(409, {
      error: { code: "progress_stale" },
      current: { puzzleId: "cat", cells: [[null, 0]], rev: 4 },
    });

    expect(FakeXhr.instances).toHaveLength(2);
    expect(sentBody(1)).toEqual({ cells: [[0, null]], baseRev: 4 });
    xhr(1).respond(200, { puzzleId: "cat", cells: [[0, null]], rev: 5 });

    expect(loadSyncMeta("cat")).toEqual({ baseRev: 5, dirty: false });
    expect(loadProgress("cat")).toEqual({ cells: [[0, null]] });
  });

  it("never loops: a second stale answer leaves the puzzle dirty", () => {
    saveSyncConfig(config);
    saveSyncMeta("cat", { baseRev: 1, dirty: false });
    saveProgress("cat", { cells: [[0, null]] });
    const stale = (rev: number) => ({
      error: { code: "progress_stale" },
      current: { puzzleId: "cat", cells: [[null, 0]], rev },
    });

    syncPuzzleAfterSave("cat");
    xhr(0).respond(409, stale(4));
    xhr(1).respond(409, stale(5));

    expect(FakeXhr.instances).toHaveLength(2);
    expect(loadSyncMeta("cat")).toEqual({ baseRev: 1, dirty: true });
    expect(loadProgress("cat")).toEqual({ cells: [[0, null]] });
  });

  it("sends the latest cells in one follow-up PUT on the new revision when the player saved again in flight", () => {
    saveSyncConfig(config);
    saveProgress("cat", { cells: [[0, null]] });

    syncPuzzleAfterSave("cat");
    saveProgress("cat", { cells: [[0, 0]] });
    xhr(0).respond(200, { puzzleId: "cat", cells: [[0, null]], rev: 1 });

    expect(loadSyncMeta("cat")).toEqual({ baseRev: 1, dirty: true });
    expect(FakeXhr.instances).toHaveLength(2);
    expect(sentBody(1)).toEqual({ cells: [[0, 0]], baseRev: 1 });
    xhr(1).respond(200, { puzzleId: "cat", cells: [[0, 0]], rev: 2 });
    expect(loadSyncMeta("cat")).toEqual({ baseRev: 2, dirty: false });
  });

  it("coalesces three quick saves into the first PUT and one follow-up with the latest cells", () => {
    saveSyncConfig(config);
    saveSyncMeta("cat", { baseRev: 4, dirty: false });
    saveProgress("cat", { cells: [[0, null, null]] });

    syncPuzzleAfterSave("cat");
    saveProgress("cat", { cells: [[0, 0, null]] });
    syncPuzzleAfterSave("cat");
    saveProgress("cat", { cells: [[0, 0, 0]] });
    syncPuzzleAfterSave("cat");

    expect(FakeXhr.instances).toHaveLength(1);
    expect(sentBody(0)).toEqual({ cells: [[0, null, null]], baseRev: 4 });
    xhr(0).respond(200, {
      puzzleId: "cat",
      cells: [[0, null, null]],
      rev: 5,
    });
    expect(FakeXhr.instances).toHaveLength(2);
    expect(sentBody(1)).toEqual({ cells: [[0, 0, 0]], baseRev: 5 });
    xhr(1).respond(200, { puzzleId: "cat", cells: [[0, 0, 0]], rev: 6 });

    expect(FakeXhr.instances).toHaveLength(2);
    expect(loadSyncMeta("cat")).toEqual({ baseRev: 6, dirty: false });
  });

  it("keeps the puzzle dirty and sends no follow-up when the first of several saves fails", () => {
    saveSyncConfig(config);
    saveSyncMeta("cat", { baseRev: 4, dirty: false });
    saveProgress("cat", { cells: [[0, null]] });

    syncPuzzleAfterSave("cat");
    saveProgress("cat", { cells: [[0, 0]] });
    syncPuzzleAfterSave("cat");
    xhr(0).fail();

    expect(FakeXhr.instances).toHaveLength(1);
    expect(loadSyncMeta("cat")).toEqual({ baseRev: 4, dirty: true });
  });

  it("allows a new push for the puzzle once the previous one has settled", () => {
    saveSyncConfig(config);
    saveProgress("cat", { cells: [[0, null]] });
    syncPuzzleAfterSave("cat");
    xhr(0).respond(200, { puzzleId: "cat", cells: [[0, null]], rev: 1 });
    saveProgress("cat", { cells: [[0, 0]] });

    syncPuzzleAfterSave("cat");

    expect(FakeXhr.instances).toHaveLength(2);
    expect(sentBody(1)).toEqual({ cells: [[0, 0]], baseRev: 1 });
  });

  it("takes the server's copy instead of overwriting it when a never-synced puzzle is stale (wiped device, first GET failed)", () => {
    saveSyncConfig(config);
    const onChanged = vi.fn();
    syncAllOnOpen(onChanged);
    xhr(0).fail();
    saveProgress("cat", { cells: [[0, null]] });

    syncPuzzleAfterSave("cat", onChanged);
    expect(sentBody(1)).toEqual({ cells: [[0, null]], baseRev: 0 });
    xhr(1).respond(409, {
      error: { code: "progress_stale" },
      current: { puzzleId: "cat", cells: [[1, 1]], rev: 5 },
    });

    expect(FakeXhr.instances).toHaveLength(2);
    expect(loadProgress("cat")).toEqual({ cells: [[1, 1]] });
    expect(loadSyncMeta("cat")).toEqual({ baseRev: 5, dirty: false });
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  it("does not report a pull when a stale answer is resolved by pushing", () => {
    saveSyncConfig(config);
    saveSyncMeta("cat", { baseRev: 1, dirty: false });
    saveProgress("cat", { cells: [[0, null]] });
    const onPulled = vi.fn();

    syncPuzzleAfterSave("cat", onPulled);
    xhr(0).respond(409, {
      error: { code: "progress_stale" },
      current: { puzzleId: "cat", cells: [[null, 0]], rev: 4 },
    });
    xhr(1).respond(200, { puzzleId: "cat", cells: [[0, null]], rev: 5 });

    expect(onPulled).not.toHaveBeenCalled();
  });

  it("leaves the puzzle as it was when the pulled grid cannot be saved after a stale answer", () => {
    saveSyncConfig(config);
    saveProgress("cat", { cells: [[0, null]] });
    const onPulled = vi.fn();
    syncPuzzleAfterSave("cat", onPulled);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });

    xhr(0).respond(409, {
      error: { code: "progress_stale" },
      current: { puzzleId: "cat", cells: [[1, 1]], rev: 5 },
    });

    expect(onPulled).not.toHaveBeenCalled();
    expect(loadSyncMeta("cat")).toBeUndefined();
    expect(loadProgress("cat")).toEqual({ cells: [[0, null]] });
  });

  it("sends nothing when there is no valid local progress to push", () => {
    saveSyncConfig(config);
    localStorage.setItem("kindle-nonograms:progress:cat", '{"cells":"bad"}');

    syncPuzzleAfterSave("cat");

    expect(FakeXhr.instances).toHaveLength(0);
  });
});

describe("a wiped device that is played before the server answers", () => {
  const serverEntry = { puzzleId: "cat", cells: [[1, 1]], rev: 5 };

  it("keeps the server's grid when the tap's PUT is refused before the open-time GET answers", () => {
    saveSyncConfig(config);
    const onChanged = vi.fn();
    syncAllOnOpen(onChanged);
    saveProgress("cat", { cells: [[0, null]] });
    syncPuzzleAfterSave("cat");

    xhr(1).respond(409, {
      error: { code: "progress_stale" },
      current: serverEntry,
    });
    xhr(0).respond(200, serverPage([serverEntry]));

    expect(FakeXhr.instances).toHaveLength(2);
    expect(loadProgress("cat")).toEqual({ cells: [[1, 1]] });
    expect(loadSyncMeta("cat")).toEqual({ baseRev: 5, dirty: false });
  });

  it("keeps the server's grid when the open-time GET answers before the tap's PUT", () => {
    saveSyncConfig(config);
    syncAllOnOpen(vi.fn());
    saveProgress("cat", { cells: [[0, null]] });
    syncPuzzleAfterSave("cat");

    xhr(0).respond(200, serverPage([serverEntry]));
    xhr(1).respond(409, {
      error: { code: "progress_stale" },
      current: serverEntry,
    });

    expect(FakeXhr.instances).toHaveLength(2);
    expect(loadProgress("cat")).toEqual({ cells: [[1, 1]] });
    expect(loadSyncMeta("cat")).toEqual({ baseRev: 5, dirty: false });
  });
});

describe("syncAllOnOpen", () => {
  it("makes no network call and still reports completion without a config", () => {
    const onChanged = vi.fn();
    const done = vi.fn();

    syncAllOnOpen(onChanged, done);

    expect(FakeXhr.instances).toHaveLength(0);
    expect(done).toHaveBeenCalledTimes(1);
    expect(onChanged).not.toHaveBeenCalled();
  });

  it("restores a wiped device from the server and reports the pulled puzzles once", () => {
    saveSyncConfig(config);
    const onChanged = vi.fn();
    const done = vi.fn();

    syncAllOnOpen(onChanged, done);
    xhr(0).respond(
      200,
      serverPage([
        { puzzleId: "cat", cells: [[0, null]], rev: 3 },
        { puzzleId: "dog", cells: [[null, 1]], rev: 1 },
      ]),
    );

    expect(loadProgress("cat")).toEqual({ cells: [[0, null]] });
    expect(loadProgress("dog")).toEqual({ cells: [[null, 1]] });
    expect(loadSyncMeta("cat")).toEqual({ baseRev: 3, dirty: false });
    expect(onChanged).toHaveBeenCalledTimes(1);
    expect(onChanged).toHaveBeenCalledWith(["cat", "dog"]);
    expect(done).toHaveBeenCalledTimes(1);
    expect(loadSyncStatus()).toEqual({
      lastSyncAt: 1_700_000_000_000,
      lastAttemptFailed: false,
    });
  });

  it("lets the server win over local progress that has no sync meta", () => {
    saveSyncConfig(config);
    saveProgress("cat", { cells: [[null, null]] });

    syncAllOnOpen(vi.fn());
    xhr(0).respond(
      200,
      serverPage([{ puzzleId: "cat", cells: [[0, 0]], rev: 2 }]),
    );

    expect(loadProgress("cat")).toEqual({ cells: [[0, 0]] });
  });

  it("does not report a puzzle whose local cells already equal the server's", () => {
    saveSyncConfig(config);
    saveProgress("cat", { cells: [[0, null]] });
    const onChanged = vi.fn();

    syncAllOnOpen(onChanged);
    xhr(0).respond(
      200,
      serverPage([{ puzzleId: "cat", cells: [[0, null]], rev: 2 }]),
    );

    expect(onChanged).not.toHaveBeenCalled();
    expect(loadSyncMeta("cat")).toEqual({ baseRev: 2, dirty: false });
  });

  it("saves a pulled grid even when its size differs from the puzzle", () => {
    saveSyncConfig(config);

    syncAllOnOpen(vi.fn());
    xhr(0).respond(
      200,
      serverPage([{ puzzleId: "other", cells: [[0], [1], [null]], rev: 1 }]),
    );

    expect(loadProgress("other")).toEqual({ cells: [[0], [1], [null]] });
  });

  it("skips an invalid server entry without saving or reporting it", () => {
    saveSyncConfig(config);
    const onChanged = vi.fn();

    syncAllOnOpen(onChanged);
    xhr(0).respond(
      200,
      serverPage([{ puzzleId: "cat", cells: [[0], [0, 1]], rev: 1 }]),
    );

    expect(loadProgress("cat")).toBeUndefined();
    expect(onChanged).not.toHaveBeenCalled();
  });

  it("pulls a newer server version over clean local progress", () => {
    saveSyncConfig(config);
    saveSyncMeta("cat", { baseRev: 1, dirty: false });
    saveProgress("cat", { cells: [[0, null]] });
    const onChanged = vi.fn();

    syncAllOnOpen(onChanged);
    xhr(0).respond(
      200,
      serverPage([{ puzzleId: "cat", cells: [[0, 0]], rev: 2 }]),
    );

    expect(loadProgress("cat")).toEqual({ cells: [[0, 0]] });
    expect(onChanged).toHaveBeenCalledWith(["cat"]);
  });

  it("pushes dirty local progress over a newer server version using the server's revision", () => {
    saveSyncConfig(config);
    saveSyncMeta("cat", { baseRev: 1, dirty: true });
    saveProgress("cat", { cells: [[0, null]] });
    const onChanged = vi.fn();
    const done = vi.fn();

    syncAllOnOpen(onChanged, done);
    xhr(0).respond(
      200,
      serverPage([{ puzzleId: "cat", cells: [[0, 0]], rev: 4 }]),
    );

    expect(sentBody(1)).toEqual({ cells: [[0, null]], baseRev: 4 });
    expect(done).not.toHaveBeenCalled();
    xhr(1).respond(200, { puzzleId: "cat", cells: [[0, null]], rev: 5 });

    expect(loadSyncMeta("cat")).toEqual({ baseRev: 5, dirty: false });
    expect(loadProgress("cat")).toEqual({ cells: [[0, null]] });
    expect(onChanged).not.toHaveBeenCalled();
    expect(done).toHaveBeenCalledTimes(1);
  });

  it("reports a pulled puzzle before the queued pushes are answered", () => {
    saveSyncConfig(config);
    saveSyncMeta("cat", { baseRev: 1, dirty: false });
    saveProgress("cat", { cells: [[0, null]] });
    saveProgress("dog", { cells: [[null, 0]] });
    const onChanged = vi.fn();
    const done = vi.fn();

    syncAllOnOpen(onChanged, done);
    xhr(0).respond(
      200,
      serverPage([{ puzzleId: "cat", cells: [[0, 0]], rev: 5 }]),
    );

    expect(xhr(1).url).toBe("https://nonograms.lan/api/progress/dog");
    expect(xhr(1).readyState).not.toBe(4);
    expect(onChanged).toHaveBeenCalledTimes(1);
    expect(onChanged).toHaveBeenCalledWith(["cat"]);
    expect(done).not.toHaveBeenCalled();
    xhr(1).respond(200, { puzzleId: "dog", cells: [[null, 0]], rev: 1 });

    expect(onChanged).toHaveBeenCalledTimes(1);
    expect(done).toHaveBeenCalledTimes(1);
  });

  it("reports a puzzle replaced by a stale push in a second call, without repeating the pulled one", () => {
    saveSyncConfig(config);
    saveSyncMeta("cat", { baseRev: 1, dirty: false });
    saveProgress("cat", { cells: [[0, null]] });
    saveProgress("dog", { cells: [[null, 0]] });
    const onChanged = vi.fn();
    const done = vi.fn();

    syncAllOnOpen(onChanged, done);
    xhr(0).respond(
      200,
      serverPage([{ puzzleId: "cat", cells: [[0, 0]], rev: 5 }]),
    );
    xhr(1).respond(409, {
      error: { code: "progress_stale" },
      current: { puzzleId: "dog", cells: [[0, null]], rev: 3 },
    });

    expect(onChanged.mock.calls).toEqual([[["cat"]], [["dog"]]]);
    expect(done).toHaveBeenCalledTimes(1);
  });

  it("re-uploads local progress when the server lost its data", () => {
    saveSyncConfig(config);
    saveSyncMeta("cat", { baseRev: 6, dirty: false });
    saveProgress("cat", { cells: [[0, null]] });

    syncAllOnOpen(vi.fn());
    xhr(0).respond(
      200,
      serverPage([{ puzzleId: "cat", cells: [[1]], rev: 2 }]),
    );

    expect(sentBody(1)).toEqual({ cells: [[0, null]], baseRev: 2 });
  });

  it("uploads local progress that predates sync when the server has no entry", () => {
    saveProgress("cat", { cells: [[0, null]] });
    saveSyncConfig(config);

    syncAllOnOpen(vi.fn());
    xhr(0).respond(200, serverPage([]));

    expect(xhr(1).url).toBe("https://nonograms.lan/api/progress/cat");
    expect(sentBody(1)).toEqual({ cells: [[0, null]], baseRev: 0 });
    xhr(1).respond(200, { puzzleId: "cat", cells: [[0, null]], rev: 1 });
    expect(loadSyncMeta("cat")).toEqual({ baseRev: 1, dirty: false });
  });

  it("re-uploads clean progress the server no longer has, on top of the revision it knew", () => {
    saveSyncConfig(config);
    saveSyncMeta("cat", { baseRev: 2, dirty: false });
    saveProgress("cat", { cells: [[0, null]] });

    syncAllOnOpen(vi.fn());
    xhr(0).respond(200, serverPage([]));

    expect(FakeXhr.instances).toHaveLength(2);
    expect(sentBody(1)).toEqual({ cells: [[0, null]], baseRev: 2 });
    xhr(1).respond(200, { puzzleId: "cat", cells: [[0, null]], rev: 3 });
    expect(loadSyncMeta("cat")).toEqual({ baseRev: 3, dirty: false });
  });

  it("keeps two clean devices consistent after the server lost its data: the first refills, the second pulls", () => {
    // Device A, clean at revision 5; the server was emptied.
    saveSyncConfig(config);
    saveSyncMeta("cat", { baseRev: 5, dirty: false });
    saveProgress("cat", { cells: [[0, 0]] });
    syncAllOnOpen(vi.fn());
    xhr(0).respond(200, serverPage([]));
    expect(sentBody(1)).toEqual({ cells: [[0, 0]], baseRev: 5 });
    // The server restores it one revision ahead of the 5 it was given.
    xhr(1).respond(200, { puzzleId: "cat", cells: [[0, 0]], rev: 6 });

    // Device B: older copy, also clean at revision 5.
    localStorage.clear();
    saveSyncConfig(config);
    saveSyncMeta("cat", { baseRev: 5, dirty: false });
    saveProgress("cat", { cells: [[0, null]] });
    const onChanged = vi.fn();
    syncAllOnOpen(onChanged);
    xhr(2).respond(
      200,
      serverPage([{ puzzleId: "cat", cells: [[0, 0]], rev: 6 }]),
    );

    expect(FakeXhr.instances).toHaveLength(3);
    expect(loadProgress("cat")).toEqual({ cells: [[0, 0]] });
    expect(onChanged).toHaveBeenCalledWith(["cat"]);
  });

  it("retries a dirty puzzle the server does not know yet", () => {
    saveSyncConfig(config);
    saveSyncMeta("cat", { baseRev: 1, dirty: true });
    saveProgress("cat", { cells: [[0, null]] });

    syncAllOnOpen(vi.fn());
    xhr(0).respond(200, serverPage([]));

    expect(xhr(1).url).toBe("https://nonograms.lan/api/progress/cat");
    expect(sentBody(1)).toEqual({ cells: [[0, null]], baseRev: 1 });
    xhr(1).respond(200, { puzzleId: "cat", cells: [[0, null]], rev: 2 });
    expect(loadSyncMeta("cat")).toEqual({ baseRev: 2, dirty: false });
  });

  it("sends nothing for clean progress that matches the server's revision", () => {
    saveSyncConfig(config);
    saveSyncMeta("cat", { baseRev: 2, dirty: false });
    saveProgress("cat", { cells: [[0, null]] });
    const done = vi.fn();

    syncAllOnOpen(vi.fn(), done);
    xhr(0).respond(
      200,
      serverPage([{ puzzleId: "cat", cells: [[0, null]], rev: 2 }]),
    );

    expect(FakeXhr.instances).toHaveLength(1);
    expect(done).toHaveBeenCalledTimes(1);
  });

  it("records a failed attempt and changes nothing when the server is unreachable", () => {
    saveSyncConfig(config);
    saveProgress("cat", { cells: [[0, null]] });
    const onChanged = vi.fn();
    const done = vi.fn();

    syncAllOnOpen(onChanged, done);
    xhr(0).fail();

    expect(loadProgress("cat")).toEqual({ cells: [[0, null]] });
    expect(onChanged).not.toHaveBeenCalled();
    expect(done).toHaveBeenCalledTimes(1);
    expect(loadSyncStatus()).toEqual({ lastAttemptFailed: true });
  });

  it("records a failed attempt on 401 and keeps the last success time", () => {
    saveSyncConfig(config);
    localStorage.setItem(
      "kindle-nonograms:sync-status",
      JSON.stringify({ lastSyncAt: 42 }),
    );

    syncAllOnOpen(vi.fn());
    xhr(0).respond(401, {});

    expect(loadSyncStatus()).toEqual({
      lastSyncAt: 42,
      lastAttemptFailed: true,
    });
  });

  it("still sends the next push when one in the queue fails", () => {
    saveSyncConfig(config);
    saveProgress("cat", { cells: [[0, null]] });
    saveProgress("dog", { cells: [[null, 1]] });
    const done = vi.fn();

    syncAllOnOpen(vi.fn(), done);
    xhr(0).respond(200, serverPage([]));
    expect(xhr(1).url).toBe("https://nonograms.lan/api/progress/cat");
    xhr(1).fail();

    expect(xhr(2).url).toBe("https://nonograms.lan/api/progress/dog");
    xhr(2).respond(200, { puzzleId: "dog", cells: [[null, 1]], rev: 1 });
    expect(loadSyncMeta("dog")).toEqual({ baseRev: 1, dirty: false });
    expect(loadSyncStatus().lastAttemptFailed).toBe(false);
    expect(done).toHaveBeenCalledTimes(1);
  });

  it("does not report a puzzle whose pulled grid could not be saved", () => {
    saveSyncConfig(config);
    const onChanged = vi.fn();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation((key: string) => {
      if (key.indexOf("progress") !== -1) {
        throw new Error("quota");
      }
    });

    syncAllOnOpen(onChanged);
    xhr(0).respond(
      200,
      serverPage([{ puzzleId: "cat", cells: [[0, 0]], rev: 2 }]),
    );

    expect(onChanged).not.toHaveBeenCalled();
    expect(loadSyncMeta("cat")).toBeUndefined();
  });

  it("still completes when onChanged throws", () => {
    saveSyncConfig(config);
    const done = vi.fn();

    syncAllOnOpen(() => {
      throw new Error("callback bug");
    }, done);

    expect(() =>
      xhr(0).respond(
        200,
        serverPage([{ puzzleId: "cat", cells: [[0, 0]], rev: 2 }]),
      ),
    ).not.toThrow();
    expect(done).toHaveBeenCalledTimes(1);
  });

  it("does not throw when done itself throws", () => {
    saveSyncConfig(config);

    syncAllOnOpen(vi.fn(), () => {
      throw new Error("callback bug");
    });

    expect(() => xhr(0).respond(200, serverPage([]))).not.toThrow();
  });

  it("does not let a push still in flight from a tap be sent twice", () => {
    saveSyncConfig(config);
    saveProgress("cat", { cells: [[0, null]] });
    syncPuzzleAfterSave("cat");

    syncAllOnOpen(vi.fn());
    xhr(1).respond(200, serverPage([]));

    expect(FakeXhr.instances).toHaveLength(2);
  });
});

/** Makes only the sync meta writes fail, as a nearly full storage would. */
function failMetaWrites(): void {
  const realSetItem = Storage.prototype.setItem;
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
    this: Storage,
    key: string,
    value: string,
  ) {
    if (key.indexOf("kindle-nonograms:sync-meta:") === 0) {
      throw new Error("quota");
    }
    realSetItem.call(this, key, value);
  });
}

describe("cancelRunningSyncs", () => {
  it("drops everything an open-time sync would write once it is cancelled, but still completes it", () => {
    saveSyncConfig(config);
    saveSyncStatus({ lastSyncAt: 5, lastAttemptFailed: false });
    const onChanged = vi.fn();
    const done = vi.fn();

    syncAllOnOpen(onChanged, done);
    cancelRunningSyncs();
    xhr(0).respond(
      200,
      serverPage([{ puzzleId: "cat", cells: [[0, 0]], rev: 2 }]),
    );

    expect(loadProgress("cat")).toBeUndefined();
    expect(loadSyncMeta("cat")).toBeUndefined();
    expect(loadSyncStatus()).toEqual({
      lastSyncAt: 5,
      lastAttemptFailed: false,
    });
    expect(FakeXhr.instances).toHaveLength(1);
    expect(onChanged).not.toHaveBeenCalled();
    expect(done).toHaveBeenCalledTimes(1);
  });

  it("drops the answer of a push in flight: no meta, no status, no follow-up request", () => {
    saveSyncConfig(config);
    saveSyncMeta("cat", { baseRev: 2, dirty: false });
    saveProgress("cat", { cells: [[0, null]] });
    syncPuzzleAfterSave("cat");

    cancelRunningSyncs();
    xhr(0).respond(200, { puzzleId: "cat", cells: [[0, null]], rev: 3 });

    expect(loadSyncMeta("cat")).toEqual({ baseRev: 2, dirty: true });
    expect(loadSyncStatus()).toEqual({});
    expect(FakeXhr.instances).toHaveLength(1);
  });

  it("drops a stale answer instead of pulling the server's grid over the player's", () => {
    saveSyncConfig(config);
    saveProgress("cat", { cells: [[0, null]] });
    const onPulled = vi.fn();
    syncPuzzleAfterSave("cat", onPulled);

    cancelRunningSyncs();
    xhr(0).respond(409, {
      error: { code: "progress_stale" },
      current: { puzzleId: "cat", cells: [[1, 1]], rev: 5 },
    });

    expect(loadProgress("cat")).toEqual({ cells: [[0, null]] });
    expect(loadSyncMeta("cat")).toBeUndefined();
    expect(onPulled).not.toHaveBeenCalled();
  });

  it("records no failure when a cancelled request fails", () => {
    saveSyncConfig(config);
    saveProgress("cat", { cells: [[0, null]] });
    syncPuzzleAfterSave("cat");

    cancelRunningSyncs();
    xhr(0).fail();

    expect(loadSyncStatus()).toEqual({});
  });

  it("does not let a cancelled push block the same puzzle's next push", () => {
    saveSyncConfig(config);
    saveProgress("cat", { cells: [[0, null]] });
    syncPuzzleAfterSave("cat");
    cancelRunningSyncs();

    syncPuzzleAfterSave("cat");
    expect(FakeXhr.instances).toHaveLength(2);
    xhr(0).respond(200, { puzzleId: "cat", cells: [[0, null]], rev: 1 });
    expect(loadSyncMeta("cat")).toBeUndefined();

    xhr(1).respond(200, { puzzleId: "cat", cells: [[0, null]], rev: 7 });
    expect(loadSyncMeta("cat")).toEqual({ baseRev: 7, dirty: false });
  });

  it("stops the push queue of a cancelled open-time sync", () => {
    saveSyncConfig(config);
    saveProgress("a", { cells: [[0]] });
    saveProgress("b", { cells: [[0]] });
    syncAllOnOpen(vi.fn());
    xhr(0).respond(200, serverPage([]));
    expect(FakeXhr.instances).toHaveLength(2);

    cancelRunningSyncs();
    xhr(1).respond(200, { puzzleId: "a", cells: [[0]], rev: 1 });

    expect(FakeXhr.instances).toHaveLength(2);
    expect(loadSyncMeta("a")).toBeUndefined();
  });
});

describe("a sync meta that cannot be written", () => {
  it("does not record a success after a push when the new revision cannot be stored, and retries later", () => {
    saveSyncConfig(config);
    saveSyncMeta("cat", { baseRev: 2, dirty: false });
    saveProgress("cat", { cells: [[0, null]] });
    syncPuzzleAfterSave("cat");
    failMetaWrites();

    xhr(0).respond(200, { puzzleId: "cat", cells: [[0, null]], rev: 3 });

    expect(loadSyncStatus()).toEqual({ lastAttemptFailed: true });
    expect(loadSyncMeta("cat")).toEqual({ baseRev: 2, dirty: true });
  });

  it("converges on the next open: the dirty puzzle is pushed again on top of the server's revision", () => {
    saveSyncConfig(config);
    saveSyncMeta("cat", { baseRev: 2, dirty: false });
    saveProgress("cat", { cells: [[0, null]] });
    syncPuzzleAfterSave("cat");
    const spy = vi.spyOn(Storage.prototype, "setItem");
    failMetaWrites();
    xhr(0).respond(200, { puzzleId: "cat", cells: [[0, null]], rev: 3 });
    vi.restoreAllMocks();
    cancelRunningSyncs();
    spy.mockRestore();

    syncAllOnOpen(vi.fn());
    xhr(1).respond(
      200,
      serverPage([{ puzzleId: "cat", cells: [[0, null]], rev: 3 }]),
    );

    expect(sentBody(2)).toEqual({ cells: [[0, null]], baseRev: 3 });
    xhr(2).respond(200, { puzzleId: "cat", cells: [[0, null]], rev: 3 });
    expect(loadSyncMeta("cat")).toEqual({ baseRev: 3, dirty: false });
    expect(loadSyncStatus().lastAttemptFailed).toBe(false);
  });

  it("builds a tap that follows a failed meta write on the revision the server just gave, not on 0", () => {
    saveSyncConfig(config);
    saveProgress("cat", { cells: [[0, null]] });
    syncPuzzleAfterSave("cat");
    failMetaWrites();
    xhr(0).respond(200, { puzzleId: "cat", cells: [[0, null]], rev: 1 });
    expect(loadSyncMeta("cat")).toBeUndefined();

    saveProgress("cat", { cells: [[0, 0]] });
    syncPuzzleAfterSave("cat");

    expect(sentBody(1)).toEqual({ cells: [[0, 0]], baseRev: 1 });
  });

  it("reports a pull whose revision cannot be stored as a failed attempt, and a later tap builds on that revision", () => {
    saveSyncConfig(config);
    saveProgress("cat", { cells: [[0, null]] });
    const onChanged = vi.fn();
    failMetaWrites();

    syncAllOnOpen(onChanged);
    xhr(0).respond(
      200,
      serverPage([{ puzzleId: "cat", cells: [[1, 1]], rev: 4 }]),
    );

    expect(loadProgress("cat")).toEqual({ cells: [[1, 1]] });
    expect(onChanged).toHaveBeenCalledWith(["cat"]);
    expect(loadSyncStatus().lastAttemptFailed).toBe(true);

    saveProgress("cat", { cells: [[1, 0]] });
    syncPuzzleAfterSave("cat");
    expect(sentBody(1)).toEqual({ cells: [[1, 0]], baseRev: 4 });
  });

  it("converges on the next open after a pull whose revision could not be stored", () => {
    saveSyncConfig(config);
    failMetaWrites();
    syncAllOnOpen(vi.fn());
    xhr(0).respond(
      200,
      serverPage([{ puzzleId: "cat", cells: [[1, 1]], rev: 4 }]),
    );
    vi.restoreAllMocks();
    cancelRunningSyncs();

    const onChanged = vi.fn();
    syncAllOnOpen(onChanged);
    xhr(1).respond(
      200,
      serverPage([{ puzzleId: "cat", cells: [[1, 1]], rev: 4 }]),
    );

    expect(loadSyncMeta("cat")).toEqual({ baseRev: 4, dirty: false });
    expect(onChanged).not.toHaveBeenCalled();
    expect(FakeXhr.instances).toHaveLength(2);
  });
});

describe("two devices holding the same revision for different cells", () => {
  it("pulls the server's cells over a clean local copy at the same revision", () => {
    // Device A is clean at revision 5 with cells X; the wiped server was
    // refilled by device B and also reached revision 5, with cells Z.
    saveSyncConfig(config);
    saveSyncMeta("cat", { baseRev: 5, dirty: false });
    saveProgress("cat", { cells: [[0, 0]] });
    const onChanged = vi.fn();

    syncAllOnOpen(onChanged);
    xhr(0).respond(
      200,
      serverPage([{ puzzleId: "cat", cells: [[1, 1]], rev: 5 }]),
    );

    expect(FakeXhr.instances).toHaveLength(1);
    expect(loadProgress("cat")).toEqual({ cells: [[1, 1]] });
    expect(onChanged).toHaveBeenCalledWith(["cat"]);
  });

  it("still pushes unsent local changes at the same revision", () => {
    saveSyncConfig(config);
    saveSyncMeta("cat", { baseRev: 5, dirty: true });
    saveProgress("cat", { cells: [[0, 0]] });

    syncAllOnOpen(vi.fn());
    xhr(0).respond(
      200,
      serverPage([{ puzzleId: "cat", cells: [[1, 1]], rev: 5 }]),
    );

    expect(sentBody(1)).toEqual({ cells: [[0, 0]], baseRev: 5 });
  });
});

describe("a tap while the sync meta cannot be written", () => {
  const stale = {
    error: { code: "progress_stale" },
    current: { puzzleId: "cat", cells: [[null, 0]], rev: 4 },
  };

  it("pushes the player's tap on the server's revision instead of pulling when an earlier meta write failed", () => {
    saveSyncConfig(config);
    saveSyncMeta("cat", { baseRev: 1, dirty: false });
    saveProgress("cat", { cells: [[0, null]] });
    syncPuzzleAfterSave("cat");
    failMetaWrites();
    xhr(0).respond(200, { puzzleId: "cat", cells: [[0, null]], rev: 2 });
    saveProgress("cat", { cells: [[0, 0]] });

    syncPuzzleAfterSave("cat");
    expect(sentBody(1)).toEqual({ cells: [[0, 0]], baseRev: 2 });
    xhr(1).respond(409, stale);

    expect(FakeXhr.instances).toHaveLength(3);
    expect(sentBody(2)).toEqual({ cells: [[0, 0]], baseRev: 4 });
    expect(loadProgress("cat")).toEqual({ cells: [[0, 0]] });
  });

  it("still pushes in the same page view and records a failure when the dirty flag itself cannot be stored", () => {
    saveSyncConfig(config);
    saveSyncMeta("cat", { baseRev: 1, dirty: false });
    saveProgress("cat", { cells: [[0, null]] });
    failMetaWrites();

    syncPuzzleAfterSave("cat");

    expect(loadSyncStatus().lastAttemptFailed).toBe(true);
    expect(sentBody(0)).toEqual({ cells: [[0, null]], baseRev: 1 });
    xhr(0).respond(409, stale);
    expect(FakeXhr.instances).toHaveLength(2);
    expect(sentBody(1)).toEqual({ cells: [[0, null]], baseRev: 4 });
    expect(loadProgress("cat")).toEqual({ cells: [[0, null]] });
  });

  it("stores the dirty flag and records no failure when storage works", () => {
    saveSyncConfig(config);
    saveSyncMeta("cat", { baseRev: 1, dirty: false });
    saveProgress("cat", { cells: [[0, null]] });

    syncPuzzleAfterSave("cat");

    expect(loadSyncMeta("cat")).toEqual({ baseRev: 1, dirty: true });
    expect(loadSyncStatus()).toEqual({});
  });
});
