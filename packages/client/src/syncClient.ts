import {
  PROGRESS_ROUTE,
  type PlayerCellMark,
  STORAGE_CORRUPT_CODE,
  type WireEntry,
  isWireEntry,
} from "@kindle-nonograms/shared";
import type { SyncConfig } from "./syncConfig.js";

type PutResult =
  | { kind: "ok"; entry: WireEntry }
  | { kind: "stale"; current: WireEntry }
  | { kind: "unauthorized" }
  | { kind: "network" }
  | { kind: "server-error" }
  | { kind: "invalid" }
  | { kind: "not-a-sync-server" };

type RequestFailure =
  | { kind: "unauthorized" }
  | { kind: "network" }
  | { kind: "server-error" }
  | { kind: "not-a-sync-server" };

type PageResult =
  | { kind: "ok"; items: WireEntry[]; nextCursor: string | null }
  | RequestFailure;

type AllResult = { kind: "ok"; items: WireEntry[] } | RequestFailure;

export type ConnectionResult =
  | "ok"
  | "unauthorized"
  | "unreachable"
  | "server-error"
  | "not-a-sync-server"
  | "mixed-content";

const REQUEST_TIMEOUT_MS = 10000;
// shortcut: stops at 100 pages (10,000 puzzles at the default page size) so a
// misbehaving server can't make the client loop forever; raise it if a
// library ever grows past that.
const MAX_PAGES = 100;

type RawResult =
  | { kind: "network" }
  | { kind: "http"; status: number; body: unknown };

/**
 * One XHR with a hard 10 s limit (`xhr.timeout` plus a timer, since an old
 * WebKit may ignore the property). `done` is called exactly once and this
 * function never throws.
 */
function request(
  config: SyncConfig,
  method: "GET" | "PUT",
  path: string,
  payload: unknown,
  done: (result: RawResult) => void,
): void {
  let finished = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let xhr: XMLHttpRequest | undefined;

  function finish(result: RawResult): void {
    if (finished) {
      return;
    }
    finished = true;
    clearTimeout(timer);
    done(result);
  }

  try {
    xhr = new XMLHttpRequest();
    xhr.open(method, config.baseUrl + path, true);
    xhr.timeout = REQUEST_TIMEOUT_MS;
    xhr.setRequestHeader("Authorization", `Bearer ${config.key}`);
    if (payload !== undefined) {
      xhr.setRequestHeader("Content-Type", "application/json");
    }
    const sent = xhr;
    sent.onreadystatechange = () => {
      if (sent.readyState !== 4) {
        return;
      }
      if (sent.status === 0) {
        finish({ kind: "network" });
        return;
      }
      let body: unknown;
      try {
        body = JSON.parse(sent.responseText);
      } catch {
        body = undefined;
      }
      finish({ kind: "http", status: sent.status, body });
    };
    timer = setTimeout(() => {
      finish({ kind: "network" });
      try {
        sent.abort();
      } catch {
        // Already finished — nothing to abort.
      }
    }, REQUEST_TIMEOUT_MS);
    sent.send(payload === undefined ? null : JSON.stringify(payload));
  } catch {
    finish({ kind: "network" });
  }
}

/**
 * Shared mapping of the answers every endpoint gives the same way. A 5xx
 * carrying the sync server's own `storage_corrupt` error is a reachable
 * server worth a message of its own; any other 5xx counts as a network failure.
 */
function statusFailure(
  status: number,
  body: unknown,
): RequestFailure | undefined {
  if (status === 401) {
    return { kind: "unauthorized" };
  }
  if (status < 500) {
    return undefined;
  }
  const code = (body as { error?: { code?: unknown } } | null)?.error?.code;
  return code === STORAGE_CORRUPT_CODE
    ? { kind: "server-error" }
    : { kind: "network" };
}

function getPage(
  config: SyncConfig,
  query: string,
  done: (result: PageResult) => void,
): void {
  request(config, "GET", `${PROGRESS_ROUTE}${query}`, undefined, (raw) => {
    if (raw.kind === "network") {
      done(raw);
      return;
    }
    const failure = statusFailure(raw.status, raw.body);
    if (failure) {
      done(failure);
      return;
    }
    const body = raw.body as
      | { items?: unknown; nextCursor?: unknown }
      | null
      | undefined;
    if (
      raw.status !== 200 ||
      body === null ||
      typeof body !== "object" ||
      !Array.isArray(body.items) ||
      !(body.nextCursor === null || typeof body.nextCursor === "string")
    ) {
      done({ kind: "not-a-sync-server" });
      return;
    }
    // An entry that fails validation is dropped rather than failing the page.
    const items = body.items.filter(isWireEntry);
    done({ kind: "ok", items, nextCursor: body.nextCursor });
  });
}

/** Fetches every entry, following `nextCursor` page after page. */
export function fetchAllProgress(
  config: SyncConfig,
  done: (result: AllResult) => void,
): void {
  const items: WireEntry[] = [];

  function next(cursor: string | null, pagesFetched: number): void {
    getPage(
      config,
      cursor === null ? "" : `?cursor=${encodeURIComponent(cursor)}`,
      (page) => {
        if (page.kind !== "ok") {
          done(page);
          return;
        }
        items.push(...page.items);
        if (page.nextCursor === null || pagesFetched + 1 >= MAX_PAGES) {
          done({ kind: "ok", items });
          return;
        }
        next(page.nextCursor, pagesFetched + 1);
      },
    );
  }

  next(null, 0);
}

/** Sends a puzzle's cells, conditional on `baseRev` being the server's revision. */
export function putProgress(
  config: SyncConfig,
  puzzleId: string,
  cells: PlayerCellMark[][],
  baseRev: number,
  done: (result: PutResult) => void,
): void {
  request(
    config,
    "PUT",
    `${PROGRESS_ROUTE}/${encodeURIComponent(puzzleId)}`,
    { cells, baseRev },
    (raw) => {
      if (raw.kind === "network") {
        done(raw);
        return;
      }
      const failure = statusFailure(raw.status, raw.body);
      if (failure) {
        done(failure);
      } else if (raw.status === 400 || raw.status === 422) {
        done({ kind: "invalid" });
      } else if (raw.status === 200) {
        done(
          isWireEntry(raw.body)
            ? { kind: "ok", entry: raw.body }
            : { kind: "not-a-sync-server" },
        );
      } else if (raw.status === 409) {
        const current = (raw.body as { current?: unknown } | null)?.current;
        done(
          isWireEntry(current)
            ? { kind: "stale", current }
            : { kind: "invalid" },
        );
      } else {
        done({ kind: "not-a-sync-server" });
      }
    },
  );
}

/**
 * Checks that `config` reaches a sync server with a good key, using a
 * one-item page. An http server from an https page is reported up-front: the
 * browser would block it silently.
 */
export function testConnection(
  config: SyncConfig,
  done: (result: ConnectionResult) => void,
): void {
  if (location.protocol === "https:" && /^http:/i.test(config.baseUrl)) {
    done("mixed-content");
    return;
  }
  getPage(config, "?limit=1", (page) => {
    done(page.kind === "network" ? "unreachable" : page.kind);
  });
}
