// @vitest-environment jsdom
import { renderEditorPage, renderSyncPage } from "@kindle-nonograms/site";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FakeXhr } from "./fakeXhr.js";
import { extractBodyHtml } from "./htmlFixture.js";
import { hydrate } from "./hydrateSyncPage.js";
import { loadProgress } from "./progressStorage.js";
import {
  loadSyncConfig,
  loadSyncStatus,
  saveSyncConfig,
  saveSyncStatus,
} from "./syncConfig.js";
import { loadSyncMeta, saveSyncMeta } from "./syncMeta.js";

const SECRET = "s3cr3t-key-123";
const ADDRESS = "http://192.168.1.20:3000";
const CELLS = [[0, null]];

beforeEach(() => {
  FakeXhr.install();
  localStorage.clear();
  document.cookie = "kindle-nonograms-locale=; max-age=0";
  document.body.innerHTML = extractBodyHtml(renderSyncPage());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  FakeXhr.uninstall();
  localStorage.clear();
  document.body.innerHTML = "";
});

function el<T extends HTMLElement = HTMLElement>(name: string): T {
  return document.querySelector(`[data-role="${name}"]`) as T;
}

function type(url: string, key: string): void {
  el<HTMLInputElement>("sync-url").value = url;
  el<HTMLInputElement>("sync-key").value = key;
}

function save(): void {
  el("sync-save").click();
}

function status(): string {
  return el("sync-status").textContent ?? "";
}

function lastXhr(): FakeXhr {
  return FakeXhr.instances[FakeXhr.instances.length - 1];
}

function entry(puzzleId: string, rev: number): unknown {
  return { puzzleId, cells: CELLS, rev };
}

describe("hydrateSyncPage", () => {
  describe("on first open with nothing stored", () => {
    it("keeps empty fields, the Not configured status and the no-sync-yet line", () => {
      hydrate();

      expect(el<HTMLInputElement>("sync-url").value).toBe("");
      expect(el<HTMLInputElement>("sync-key").value).toBe("");
      expect(status()).toBe("Not configured");
      expect(el("sync-last").textContent).toBe("No sync yet");
      expect(FakeXhr.instances).toHaveLength(0);
    });
  });

  describe("with a stored config", () => {
    beforeEach(() => {
      saveSyncConfig({ baseUrl: ADDRESS, key: SECRET });
    });

    it("prefills both fields and says the server is saved, without any request", () => {
      hydrate();

      expect(el<HTMLInputElement>("sync-url").value).toBe(ADDRESS);
      expect(el<HTMLInputElement>("sync-key").value).toBe(SECRET);
      expect(status()).toBe("Server saved. Sync is active.");
      expect(FakeXhr.instances).toHaveLength(0);
    });

    it("keeps the stored key masked and out of the page's text and attributes", () => {
      hydrate();

      expect(el<HTMLInputElement>("sync-key").type).toBe("password");
      expect(el<HTMLInputElement>("sync-key").getAttribute("value")).toBeNull();
      expect(document.body.textContent).not.toContain(SECRET);
      expect(document.body.innerHTML).not.toContain(SECRET);
    });

    it("shows the last sync time from the stored status", () => {
      saveSyncStatus({
        lastSyncAt: Date.UTC(2026, 5, 15, 12, 0, 0),
        lastAttemptFailed: false,
      });

      hydrate();

      expect(el("sync-last").textContent).toMatch(/^Last sync: .*2026/);
    });

    it("shows Last attempt failed when the latest attempt failed", () => {
      saveSyncStatus({ lastSyncAt: 1, lastAttemptFailed: true });

      hydrate();

      expect(el("sync-last").textContent).toBe("Last attempt failed");
    });
  });

  describe("Show / Hide toggle", () => {
    it("flips the key between masked and visible and back, labelling the button and its pressed state", () => {
      hydrate();
      const key = el<HTMLInputElement>("sync-key");
      const toggle = el("sync-key-toggle");

      toggle.click();
      expect(key.type).toBe("text");
      expect(toggle.textContent).toBe("Hide");
      expect(toggle.getAttribute("aria-pressed")).toBe("true");

      toggle.click();
      expect(key.type).toBe("password");
      expect(toggle.textContent).toBe("Show");
      expect(toggle.getAttribute("aria-pressed")).toBe("false");
    });

    it("keeps the typed key when toggling", () => {
      hydrate();
      type("", "abc");

      el("sync-key-toggle").click();

      expect(el<HTMLInputElement>("sync-key").value).toBe("abc");
    });
  });

  describe("Save and test: inline validation", () => {
    it.each([
      ["an empty address", ""],
      ["a scheme with no host", "http://"],
      ["an address that is not http(s)", "ftp://server.lan"],
      ["a bare host without scheme", "192.168.1.20:3000"],
    ])(
      "rejects %s with how to fix it, no request and nothing stored",
      (_n, url) => {
        hydrate();
        type(url, SECRET);

        save();

        expect(status()).toBe(
          "Failed: invalid address – enter an address starting with http:// or https://",
        );
        expect(FakeXhr.instances).toHaveLength(0);
        expect(loadSyncConfig()).toBeUndefined();
        expect(el<HTMLInputElement>("sync-url").value).toBe(url);
        expect(el<HTMLButtonElement>("sync-save").disabled).toBe(false);
      },
    );

    it("rejects an empty key with how to fix it, no request and nothing stored", () => {
      hydrate();
      type(ADDRESS, "");

      save();

      expect(status()).toBe("Failed: no key – enter the key set on the server");
      expect(FakeXhr.instances).toHaveLength(0);
      expect(loadSyncConfig()).toBeUndefined();
    });
  });

  describe("Save and test: the connection test", () => {
    it("sends the test to the typed address and disables the button as Testing… until the answer", () => {
      hydrate();
      type(ADDRESS, SECRET);
      const button = el<HTMLButtonElement>("sync-save");

      save();

      expect(FakeXhr.instances).toHaveLength(1);
      expect(lastXhr().url).toBe(`${ADDRESS}/api/progress?limit=1`);
      expect(lastXhr().headers.Authorization).toBe(`Bearer ${SECRET}`);
      expect(button.disabled).toBe(true);
      expect(button.textContent).toBe("Testing…");

      lastXhr().respond(401, { error: "unauthorized" });

      expect(button.disabled).toBe(false);
      expect(button.textContent).toBe("Save and test");
    });

    it("stores the config, says Connected and restores the server's progress on success", () => {
      hydrate();
      type(`${ADDRESS}/`, SECRET);

      save();
      lastXhr().respond(200, { items: [], nextCursor: null });
      // The restore pulls every entry from the server.
      const restore = lastXhr();
      expect(restore.url).toBe(`${ADDRESS}/api/progress`);
      restore.respond(200, {
        items: [entry("cat", 3)],
        nextCursor: null,
      });

      expect(status()).toBe("Connected");
      expect(loadSyncConfig()).toEqual({ baseUrl: ADDRESS, key: SECRET });
      expect(loadProgress("cat")?.cells).toEqual(CELLS);
      expect(loadSyncMeta("cat")).toEqual({ baseRev: 3, dirty: false });
    });

    it("tests and saves an address typed with a trailing slash without it, so no request has a double slash", () => {
      hydrate();
      type(`${ADDRESS}/`, SECRET);

      save();
      expect(lastXhr().url).toBe(`${ADDRESS}/api/progress?limit=1`);
      lastXhr().respond(200, { items: [], nextCursor: null });

      expect(loadSyncConfig()).toEqual({ baseUrl: ADDRESS, key: SECRET });
      for (const request of FakeXhr.instances) {
        expect(request.url).not.toMatch(/[^:]\/\//);
      }
    });

    it("refreshes the Last sync line once the restore has finished", () => {
      hydrate();
      type(ADDRESS, SECRET);

      save();
      lastXhr().respond(200, { items: [], nextCursor: null });
      expect(el("sync-last").textContent).toBe("No sync yet");
      lastXhr().respond(200, { items: [], nextCursor: null });

      expect(el("sync-last").textContent).toMatch(/^Last sync: /);
    });

    it("shows Connected only after a success, not while the test is running", () => {
      hydrate();
      type(ADDRESS, SECRET);

      save();

      expect(status()).toBe("Testing…");
      expect(loadSyncConfig()).toBeUndefined();
    });

    it.each([
      [
        "a wrong key",
        (x: FakeXhr) => x.respond(401, { error: "unauthorized" }),
        "Failed: wrong key – check the key set on the server",
      ],
      [
        "an unreachable server",
        (x: FakeXhr) => x.fail(),
        "Failed: server not reachable – check the address and that the server is running",
      ],
      [
        "a server that cannot read its own storage",
        (x: FakeXhr) =>
          x.respond(500, { error: { code: "storage_corrupt", message: "x" } }),
        "Failed: the server reports an internal error – check the server log",
      ],
      [
        "an address that is not a sync server",
        (x: FakeXhr) => x.respond(200, "<html>hello</html>"),
        "Failed: not a sync server – check the address",
      ],
    ])(
      "shows its own message for %s, keeps the typed values and stores nothing",
      (_n, answer, message) => {
        hydrate();
        type(ADDRESS, SECRET);

        save();
        answer(lastXhr());

        expect(status()).toBe(message);
        expect(el<HTMLInputElement>("sync-url").value).toBe(ADDRESS);
        expect(el<HTMLInputElement>("sync-key").value).toBe(SECRET);
        expect(loadSyncConfig()).toBeUndefined();
        expect(FakeXhr.instances).toHaveLength(1);
        expect(el<HTMLButtonElement>("sync-save").disabled).toBe(false);
      },
    );

    it("explains mixed content for an http address from an https page, with no request and nothing stored", () => {
      vi.stubGlobal("location", { protocol: "https:" });
      hydrate();
      type(ADDRESS, SECRET);

      save();

      expect(status()).toBe(
        "Failed: an http address cannot be used from this https page – use an https address",
      );
      expect(FakeXhr.instances).toHaveLength(0);
      expect(loadSyncConfig()).toBeUndefined();
    });

    it("never puts the key or the address in a failure message", () => {
      hydrate();
      type("http://user:hunter2@192.168.1.20:3000", SECRET);

      save();
      lastXhr().respond(401, {});

      expect(status()).not.toContain(SECRET);
      expect(status()).not.toContain("hunter2");
      expect(status()).not.toContain("192.168");
    });

    it("leaves a previously stored config untouched when a new test fails", () => {
      saveSyncConfig({ baseUrl: ADDRESS, key: SECRET });
      hydrate();
      type("http://10.0.0.5:3000", "other");

      save();
      lastXhr().fail();

      expect(loadSyncConfig()).toEqual({ baseUrl: ADDRESS, key: SECRET });
    });

    it("restores the button and reports the server as unreachable when the connection test itself throws", () => {
      hydrate();
      type(ADDRESS, SECRET);
      vi.stubGlobal("location", {
        get protocol(): string {
          throw new Error("denied");
        },
      });

      save();

      expect(status()).toBe(
        "Failed: server not reachable – check the address and that the server is running",
      );
      expect(el("sync-save").textContent).toBe("Save and test");
      expect(el<HTMLButtonElement>("sync-save").disabled).toBe(false);
    });

    it("restores the button and replaces Testing… when handling the answer throws", () => {
      hydrate();
      type(ADDRESS, SECRET);
      const button = el<HTMLButtonElement>("sync-save");
      save();
      expect(button.textContent).toBe("Testing…");
      button.removeAttribute("data-role");

      lastXhr().respond(200, { items: [], nextCursor: null });

      expect(status()).toBe(
        "Failed: server not reachable – check the address and that the server is running",
      );
      expect(button.textContent).toBe("Save and test");
      expect(button.disabled).toBe(false);
    });

    it("reports a storage failure instead of Connected when the config cannot be saved", () => {
      hydrate();
      type(ADDRESS, SECRET);
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("quota");
      });

      save();
      lastXhr().respond(200, { items: [], nextCursor: null });

      expect(status()).toBe(
        "Failed: could not save – check that the browser allows local storage",
      );
      expect(FakeXhr.instances).toHaveLength(1);
    });
  });

  describe("Save and test: replacing the stored server", () => {
    const OTHER_KEY = "another-key-456";

    function saveSucceeding(url: string, key: string): void {
      hydrate();
      type(url, key);
      save();
      lastXhr().respond(200, { items: [], nextCursor: null });
    }

    beforeEach(() => {
      saveSyncConfig({ baseUrl: ADDRESS, key: SECRET });
      saveSyncMeta("cat", { baseRev: 7, dirty: true });
    });

    it("forgets the previous server's revisions when the key changes", () => {
      saveSucceeding(ADDRESS, OTHER_KEY);

      expect(loadSyncMeta("cat")).toBeUndefined();
      expect(loadSyncConfig()).toEqual({ baseUrl: ADDRESS, key: OTHER_KEY });
    });

    it("forgets the previous server's revisions when the address changes", () => {
      saveSucceeding("http://192.168.1.99:3000", SECRET);

      expect(loadSyncMeta("cat")).toBeUndefined();
    });

    it("keeps the revisions when the same server is saved again, even with a trailing slash", () => {
      saveSucceeding(`${ADDRESS}/`, SECRET);

      expect(loadSyncMeta("cat")).toEqual({ baseRev: 7, dirty: true });
    });

    it("keeps the revisions when the new server fails its test", () => {
      hydrate();
      type(ADDRESS, OTHER_KEY);
      save();
      lastXhr().respond(401, {});

      expect(loadSyncMeta("cat")).toEqual({ baseRev: 7, dirty: true });
    });
  });

  describe("a sync still running when the server changes", () => {
    const PULLED = [{ puzzleId: "cat", cells: [[1, 1]], rev: 2 }];

    function saveSucceedingKeepingSyncPending(url: string, key: string): void {
      type(url, key);
      save();
      lastXhr().respond(200, { items: [], nextCursor: null });
    }

    it("writes nothing from the previous server's answers once another server was saved, and still syncs with the new one", () => {
      hydrate();
      saveSucceedingKeepingSyncPending(ADDRESS, SECRET);
      const firstSync = lastXhr();
      saveSucceedingKeepingSyncPending("http://192.168.1.99:3000", "other-key");
      const secondSync = lastXhr();
      expect(secondSync.url).toBe("http://192.168.1.99:3000/api/progress");

      firstSync.respond(200, { items: PULLED, nextCursor: null });

      expect(loadProgress("cat")).toBeUndefined();
      expect(loadSyncMeta("cat")).toBeUndefined();
      expect(loadSyncStatus().lastSyncAt).toBeUndefined();

      secondSync.respond(200, {
        items: [{ puzzleId: "cat", cells: [[0, 0]], rev: 1 }],
        nextCursor: null,
      });
      expect(loadProgress("cat")).toEqual({ cells: [[0, 0]] });
      expect(loadSyncMeta("cat")).toEqual({ baseRev: 1, dirty: false });
    });

    it("writes nothing from the answers of a sync still running when the server is forgotten", () => {
      vi.spyOn(window, "confirm").mockReturnValue(true);
      hydrate();
      saveSucceedingKeepingSyncPending(ADDRESS, SECRET);
      const sync = lastXhr();

      el("sync-forget").click();
      sync.respond(200, { items: PULLED, nextCursor: null });

      expect(loadProgress("cat")).toBeUndefined();
      expect(loadSyncMeta("cat")).toBeUndefined();
      expect(loadSyncStatus()).toEqual({});
      expect(el("sync-last").textContent).toBe("No sync yet");
    });
  });

  describe("Forget this server", () => {
    beforeEach(() => {
      saveSyncConfig({ baseUrl: ADDRESS, key: SECRET });
      saveSyncStatus({ lastSyncAt: 1, lastAttemptFailed: false });
    });

    it("asks first, then clears the config, the fields and the status when accepted", () => {
      const ask = vi.spyOn(window, "confirm").mockReturnValue(true);
      hydrate();

      el("sync-forget").click();

      expect(ask).toHaveBeenCalledTimes(1);
      expect(ask.mock.calls[0][0]).toBe(
        "Forget this server? Your progress on this device is kept.",
      );
      expect(loadSyncConfig()).toBeUndefined();
      expect(el<HTMLInputElement>("sync-url").value).toBe("");
      expect(el<HTMLInputElement>("sync-key").value).toBe("");
      expect(status()).toBe("Not configured");
      expect(el("sync-last").textContent).toBe("No sync yet");
    });

    it("keeps the fields and reports a storage failure when the config cannot be removed", () => {
      vi.spyOn(window, "confirm").mockReturnValue(true);
      hydrate();
      vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
        throw new Error("denied");
      });

      el("sync-forget").click();

      expect(el<HTMLInputElement>("sync-url").value).toBe(ADDRESS);
      expect(el<HTMLInputElement>("sync-key").value).toBe(SECRET);
      expect(status()).toBe(
        "Failed: could not save – check that the browser allows local storage",
      );
    });

    it("changes nothing when the confirmation is declined", () => {
      vi.spyOn(window, "confirm").mockReturnValue(false);
      hydrate();

      el("sync-forget").click();

      expect(loadSyncConfig()).toEqual({ baseUrl: ADDRESS, key: SECRET });
      expect(el<HTMLInputElement>("sync-url").value).toBe(ADDRESS);
      expect(status()).toBe("Server saved. Sync is active.");
    });

    it("ignores a connection test that answers ok after the server was forgotten", () => {
      localStorage.clear();
      vi.spyOn(window, "confirm").mockReturnValue(true);
      hydrate();
      type(ADDRESS, SECRET);
      save();
      const pendingTest = lastXhr();

      el("sync-forget").click();
      pendingTest.respond(200, { items: [], nextCursor: null });

      expect(loadSyncConfig()).toBeUndefined();
      expect(el<HTMLInputElement>("sync-url").value).toBe("");
      expect(el<HTMLInputElement>("sync-key").value).toBe("");
      expect(status()).toBe("Not configured");
      expect(FakeXhr.instances).toHaveLength(1);
      expect(el<HTMLButtonElement>("sync-save").disabled).toBe(false);
      expect(el("sync-save").textContent).toBe("Save and test");
    });

    it("lets the newer Save win when an older test answers after it", () => {
      localStorage.clear();
      vi.spyOn(window, "confirm").mockReturnValue(true);
      hydrate();
      type(ADDRESS, SECRET);
      save();
      const older = lastXhr();
      el("sync-forget").click();
      type("http://other.lan:3000", "other-key");
      save();
      const newer = lastXhr();

      older.respond(200, { items: [], nextCursor: null });

      expect(loadSyncConfig()).toBeUndefined();
      expect(status()).toBe("Testing…");
      expect(el<HTMLButtonElement>("sync-save").disabled).toBe(true);

      newer.respond(200, { items: [], nextCursor: null });

      expect(loadSyncConfig()).toEqual({
        baseUrl: "http://other.lan:3000",
        key: "other-key",
      });
      expect(status()).toBe("Connected");
    });

    it("does not ask when no config is stored, and just clears the typed values", () => {
      localStorage.clear();
      const ask = vi.spyOn(window, "confirm").mockReturnValue(true);
      hydrate();
      type("http://typed.lan", "typed");

      el("sync-forget").click();

      expect(ask).not.toHaveBeenCalled();
      expect(el<HTMLInputElement>("sync-url").value).toBe("");
      expect(el<HTMLInputElement>("sync-key").value).toBe("");
      expect(status()).toBe("Not configured");
    });
  });

  describe("language", () => {
    it("shows the French status and button once the locale cookie says fr", () => {
      document.cookie = "kindle-nonograms-locale=fr";

      hydrate();

      expect(status()).toBe("Non configuré");
      expect(el("sync-save").textContent).toBe("Enregistrer et tester");
      expect(document.documentElement.lang).toBe("fr");
    });

    it("retranslates a failure message when the language is switched", () => {
      hydrate();
      type("", "x");
      save();
      const select = el<HTMLSelectElement>("language-switcher-select");

      select.value = "fr";
      select.dispatchEvent(new Event("change"));

      expect(status()).toBe(
        "Échec : adresse invalide – saisissez une adresse commençant par http:// ou https://",
      );
    });

    it("keeps the Last sync time when the language is switched", () => {
      saveSyncConfig({ baseUrl: ADDRESS, key: SECRET });
      saveSyncStatus({ lastSyncAt: Date.UTC(2026, 5, 15, 12, 0, 0) });
      hydrate();
      const select = el<HTMLSelectElement>("language-switcher-select");

      select.value = "fr";
      select.dispatchEvent(new Event("change"));

      expect(el("sync-last").textContent).toMatch(/^Dernière synchro : .*2026/);
    });
  });

  describe("on other pages", () => {
    it("does nothing on the editor page", () => {
      document.body.innerHTML = extractBodyHtml(renderEditorPage());
      const before = document.body.innerHTML;

      hydrate();

      expect(document.body.innerHTML).toBe(before);
    });

    it("does nothing on an empty page", () => {
      document.body.innerHTML = "<p>hello</p>";

      expect(() => hydrate()).not.toThrow();
      expect(document.body.innerHTML).toBe("<p>hello</p>");
    });
  });

  describe("isolation", () => {
    it("still wires Save and Forget when setting up the Show toggle throws", () => {
      el("sync-key-toggle").remove();
      vi.spyOn(window, "confirm").mockReturnValue(true);
      saveSyncConfig({ baseUrl: ADDRESS, key: SECRET });
      hydrate();

      type(ADDRESS, SECRET);
      save();
      expect(FakeXhr.instances).toHaveLength(1);

      el("sync-forget").click();
      expect(loadSyncConfig()).toBeUndefined();
    });

    it("never writes to the console", () => {
      const spies = (["log", "warn", "error"] as const).map((method) =>
        vi.spyOn(console, method).mockImplementation(() => {}),
      );
      hydrate();
      type("", "");
      save();

      for (const spy of spies) {
        expect(spy).not.toHaveBeenCalled();
      }
    });
  });
});
