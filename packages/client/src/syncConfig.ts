import { clearAllSyncMeta } from "./syncMeta.js";

const CONFIG_KEY = "kindle-nonograms:sync-config";
const STATUS_KEY = "kindle-nonograms:sync-status";

/** The optional sync server the player configured, and the key to reach it. */
export interface SyncConfig {
  baseUrl: string;
  key: string;
}

/** What the settings panel shows: the last success and the last attempt. */
export interface SyncStatus {
  lastSyncAt?: number;
  lastAttemptFailed?: boolean;
}

/**
 * The base URL without its trailing slashes (so a path appended to it never
 * has a double slash), or `undefined` when it is not an http(s) address.
 * The one place that decides which addresses are acceptable.
 */
export function parseBaseUrl(value: string): string | undefined {
  return /^https?:\/\/[^/\s]/i.test(value)
    ? value.replace(/\/+$/, "")
    : undefined;
}

function parseConfig(value: unknown): SyncConfig | undefined {
  if (value === null || typeof value !== "object") {
    return undefined;
  }
  const { baseUrl, key } = value as Record<string, unknown>;
  if (typeof baseUrl !== "string" || typeof key !== "string" || key === "") {
    return undefined;
  }
  const parsed = parseBaseUrl(baseUrl);
  return parsed === undefined ? undefined : { baseUrl: parsed, key };
}

/**
 * Reads the sync config. `undefined` when there is none, when it is invalid
 * (wrong shape, empty key, a URL that is not http/https) or when storage
 * throws — sync then stays off and no request is ever made.
 */
export function loadSyncConfig(): SyncConfig | undefined {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    return raw === null ? undefined : parseConfig(JSON.parse(raw));
  } catch {
    return undefined;
  }
}

/**
 * Persists the sync config. Never throws; `false` when the config is invalid,
 * the write fails or the previous server's sync meta could not be forgotten.
 * Replacing the stored server by another (other address or key) also forgets
 * every puzzle's sync meta: the other server counts its own revisions, so the
 * previous ones are void.
 */
export function saveSyncConfig(config: SyncConfig): boolean {
  const valid = parseConfig(config);
  if (!valid) {
    return false;
  }
  const previous = loadSyncConfig();
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(valid));
  } catch {
    return false;
  }
  if (
    previous &&
    (previous.baseUrl !== valid.baseUrl || previous.key !== valid.key)
  ) {
    return clearAllSyncMeta();
  }
  return true;
}

/**
 * Forgets the server: removes the config, the status and every puzzle's sync
 * meta (the local progress itself is kept). Never throws; `false` when the
 * config, the status or a sync meta could not be removed.
 */
export function clearSyncConfig(): boolean {
  let cleared = true;
  try {
    localStorage.removeItem(CONFIG_KEY);
    localStorage.removeItem(STATUS_KEY);
  } catch {
    cleared = false;
  }
  return clearAllSyncMeta() && cleared;
}

/** Reads the sync status; empty when absent, invalid or unreadable. */
export function loadSyncStatus(): SyncStatus {
  try {
    const value = JSON.parse(localStorage.getItem(STATUS_KEY) ?? "null");
    const status: SyncStatus = {};
    if (value !== null && typeof value === "object") {
      if (typeof value.lastSyncAt === "number") {
        status.lastSyncAt = value.lastSyncAt;
      }
      if (typeof value.lastAttemptFailed === "boolean") {
        status.lastAttemptFailed = value.lastAttemptFailed;
      }
    }
    return status;
  } catch {
    return {};
  }
}

/** Persists the sync status. Never throws. */
export function saveSyncStatus(status: SyncStatus): void {
  try {
    localStorage.setItem(STATUS_KEY, JSON.stringify(status));
  } catch {
    // Status is informational — losing it must not affect the game.
  }
}
