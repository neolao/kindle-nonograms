// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearSyncConfig,
  loadSyncConfig,
  loadSyncStatus,
  parseBaseUrl,
  saveSyncConfig,
  saveSyncStatus,
} from "./syncConfig.js";
import { loadSyncMeta, saveSyncMeta } from "./syncMeta.js";

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

/** Makes only the removal of sync meta keys fail. */
function failMetaRemovals(): void {
  const realRemoveItem = Storage.prototype.removeItem;
  vi.spyOn(Storage.prototype, "removeItem").mockImplementation(function (
    this: Storage,
    key: string,
  ) {
    if (key.indexOf("kindle-nonograms:sync-meta:") === 0) {
      throw new Error("denied");
    }
    realRemoveItem.call(this, key);
  });
}

describe("saveSyncConfig / loadSyncConfig", () => {
  it("round-trips a config and stores it under the documented key", () => {
    const config = { baseUrl: "https://nonograms.lan", key: "secret" };

    expect(saveSyncConfig(config)).toBe(true);

    expect(loadSyncConfig()).toEqual(config);
    expect(
      JSON.parse(localStorage.getItem("kindle-nonograms:sync-config") ?? ""),
    ).toEqual(config);
  });

  it("returns undefined when nothing is stored", () => {
    expect(loadSyncConfig()).toBeUndefined();
  });

  it("strips trailing slashes from the base URL", () => {
    localStorage.setItem(
      "kindle-nonograms:sync-config",
      JSON.stringify({ baseUrl: "http://192.168.1.5:3000//", key: "k" }),
    );

    expect(loadSyncConfig()?.baseUrl).toBe("http://192.168.1.5:3000");
  });

  it.each([
    ["invalid JSON", "{nope"],
    ["null", "null"],
    ["a missing key", '{"baseUrl":"https://a.lan"}'],
    ["an empty key", '{"baseUrl":"https://a.lan","key":""}'],
    ["a non-string key", '{"baseUrl":"https://a.lan","key":1}'],
    ["a missing base URL", '{"key":"k"}'],
    ["an unsupported scheme", '{"baseUrl":"ftp://a.lan","key":"k"}'],
    ["a javascript URL", '{"baseUrl":"javascript:alert(1)","key":"k"}'],
    ["a non-URL base", '{"baseUrl":"nonograms.lan","key":"k"}'],
  ])("treats %s as no config", (_label, raw) => {
    localStorage.setItem("kindle-nonograms:sync-config", raw);

    expect(loadSyncConfig()).toBeUndefined();
  });

  it("reports false instead of throwing when the write fails", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });

    expect(saveSyncConfig({ baseUrl: "https://a.lan", key: "k" })).toBe(false);
  });

  it("refuses to store an invalid config", () => {
    expect(saveSyncConfig({ baseUrl: "ftp://a.lan", key: "k" })).toBe(false);
    expect(localStorage.getItem("kindle-nonograms:sync-config")).toBeNull();
  });
});

describe("saveSyncConfig replacing the stored server", () => {
  const stored = { baseUrl: "https://a.lan", key: "key-a" };

  it("forgets every puzzle's sync meta when the key changes", () => {
    saveSyncConfig(stored);
    saveSyncMeta("cat", { baseRev: 7, dirty: true });

    saveSyncConfig({ ...stored, key: "key-b" });

    expect(loadSyncMeta("cat")).toBeUndefined();
    expect(loadSyncConfig()).toEqual({ ...stored, key: "key-b" });
  });

  it("forgets every puzzle's sync meta when the address changes", () => {
    saveSyncConfig(stored);
    saveSyncMeta("cat", { baseRev: 7, dirty: true });

    saveSyncConfig({ ...stored, baseUrl: "https://b.lan" });

    expect(loadSyncMeta("cat")).toBeUndefined();
  });

  it("keeps the sync meta when the same server is saved again, even with a trailing slash", () => {
    saveSyncConfig(stored);
    saveSyncMeta("cat", { baseRev: 7, dirty: true });

    saveSyncConfig({ ...stored, baseUrl: "https://a.lan/" });

    expect(loadSyncMeta("cat")).toEqual({ baseRev: 7, dirty: true });
  });

  it("keeps the sync meta of a first configuration", () => {
    saveSyncMeta("cat", { baseRev: 7, dirty: true });

    saveSyncConfig(stored);

    expect(loadSyncMeta("cat")).toEqual({ baseRev: 7, dirty: true });
  });

  it("keeps the sync meta when the new config cannot be stored", () => {
    saveSyncConfig(stored);
    saveSyncMeta("cat", { baseRev: 7, dirty: true });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });

    expect(saveSyncConfig({ ...stored, key: "key-b" })).toBe(false);

    expect(loadSyncMeta("cat")).toEqual({ baseRev: 7, dirty: true });
  });
});

describe("clearSyncConfig", () => {
  it("removes the config, the status and every puzzle's sync meta but keeps progress", () => {
    saveSyncConfig({ baseUrl: "https://a.lan", key: "k" });
    saveSyncStatus({ lastSyncAt: 5 });
    saveSyncMeta("cat", { baseRev: 2, dirty: true });
    saveSyncMeta("dog", { baseRev: 1, dirty: false });
    localStorage.setItem("kindle-nonograms:progress:cat", '{"cells":[[0]]}');

    expect(clearSyncConfig()).toBe(true);

    expect(loadSyncConfig()).toBeUndefined();
    expect(loadSyncStatus()).toEqual({});
    expect(loadSyncMeta("cat")).toBeUndefined();
    expect(loadSyncMeta("dog")).toBeUndefined();
    expect(localStorage.getItem("kindle-nonograms:progress:cat")).toBe(
      '{"cells":[[0]]}',
    );
  });

  it("does not throw when storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("denied");
    });

    expect(() => clearSyncConfig()).not.toThrow();
  });

  it("returns false and keeps the config when it cannot be removed", () => {
    saveSyncConfig({ baseUrl: "https://a.lan", key: "k" });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("denied");
    });

    expect(clearSyncConfig()).toBe(false);

    expect(loadSyncConfig()).toEqual({ baseUrl: "https://a.lan", key: "k" });
  });

  it("returns false when a puzzle's sync meta cannot be removed, although the config is gone", () => {
    saveSyncConfig({ baseUrl: "https://a.lan", key: "k" });
    saveSyncMeta("cat", { baseRev: 2, dirty: true });
    failMetaRemovals();

    expect(clearSyncConfig()).toBe(false);

    expect(loadSyncConfig()).toBeUndefined();
  });
});

describe("saveSyncConfig replacing the stored server", () => {
  it("returns false when the previous server's sync meta cannot be removed", () => {
    saveSyncConfig({ baseUrl: "https://a.lan", key: "k" });
    saveSyncMeta("cat", { baseRev: 2, dirty: true });
    failMetaRemovals();

    expect(saveSyncConfig({ baseUrl: "https://b.lan", key: "k" })).toBe(false);
  });
});

describe("saveSyncStatus / loadSyncStatus", () => {
  it("round-trips the status", () => {
    saveSyncStatus({ lastSyncAt: 1234, lastAttemptFailed: false });

    expect(loadSyncStatus()).toEqual({
      lastSyncAt: 1234,
      lastAttemptFailed: false,
    });
  });

  it("returns an empty status when nothing is stored", () => {
    expect(loadSyncStatus()).toEqual({});
  });

  it("drops fields of the wrong type and survives invalid JSON", () => {
    localStorage.setItem(
      "kindle-nonograms:sync-status",
      '{"lastSyncAt":"x","lastAttemptFailed":true}',
    );
    expect(loadSyncStatus()).toEqual({ lastAttemptFailed: true });

    localStorage.setItem("kindle-nonograms:sync-status", "{nope");
    expect(loadSyncStatus()).toEqual({});
  });

  it("does not throw when the write fails", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });

    expect(() => saveSyncStatus({ lastSyncAt: 1 })).not.toThrow();
  });
});

describe("parseBaseUrl", () => {
  it.each([
    ["https://nonograms.lan", "https://nonograms.lan"],
    ["http://192.168.1.20:3000/", "http://192.168.1.20:3000"],
    ["http://192.168.1.20:3000///", "http://192.168.1.20:3000"],
    ["HTTP://Host.lan/base/", "HTTP://Host.lan/base"],
  ])("accepts %s and strips trailing slashes", (raw, expected) => {
    expect(parseBaseUrl(raw)).toBe(expected);
  });

  it.each([
    "",
    "http://",
    "https:///path",
    "ftp://server.lan",
    "192.168.1.20:3000",
    "javascript:alert(1)",
  ])("rejects %j", (raw) => {
    expect(parseBaseUrl(raw)).toBeUndefined();
  });
});
