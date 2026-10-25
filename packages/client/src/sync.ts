import { type WireEntry, isProgressShape } from "@kindle-nonograms/shared";
import {
  listProgressPuzzleIds,
  loadProgress,
  saveProgress,
} from "./progressStorage.js";
import { fetchAllProgress, putProgress } from "./syncClient.js";
import {
  type SyncConfig,
  loadSyncConfig,
  loadSyncStatus,
  saveSyncStatus,
} from "./syncConfig.js";
import { loadSyncMeta, saveSyncMeta } from "./syncMeta.js";
import { type PlanMeta, planSync } from "./syncPlan.js";

/**
 * One sync run: the config it was started with and the generation it belongs
 * to. `cancelRunningSyncs` bumps the generation, after which every answer of
 * an older run is dropped without writing anything.
 */
interface Run {
  config: SyncConfig;
  generation: number;
}

let generation = 0;

function isCurrent(run: Run): boolean {
  return run.generation === generation;
}

/** Puzzles with a PUT on the wire: a save meanwhile waits for its answer. */
const pushing = new Set<string>();

/**
 * Metas that could not be written (storage full), kept for this page view so
 * a tap right after still builds on the revision the server gave, not on 0.
 */
const unsavedMeta = new Map<string, PlanMeta>();

/**
 * Called when the server identity changes or is forgotten: the answers of
 * every sync running now are dropped, and the next one starts afresh.
 */
export function cancelRunningSyncs(): void {
  generation++;
  pushing.clear();
  unsavedMeta.clear();
}

function startRun(): Run | undefined {
  const config = loadSyncConfig();
  return config ? { config, generation } : undefined;
}

function readMeta(puzzleId: string): PlanMeta | undefined {
  return unsavedMeta.get(puzzleId) ?? loadSyncMeta(puzzleId);
}

/** Stores a meta; `false` (and a failed attempt recorded) when storage refuses it. */
function writeMeta(puzzleId: string, meta: PlanMeta): boolean {
  if (saveSyncMeta(puzzleId, meta)) {
    unsavedMeta.delete(puzzleId);
    return true;
  }
  unsavedMeta.set(puzzleId, meta);
  recordSyncFailure();
  return false;
}

/**
 * Flags a puzzle as changed since its last sync, keeping the known revision
 * (read through `readMeta`, written through `writeMeta`, so a failed write
 * still leaves the flag in memory for this page view). A puzzle this device
 * never synced has no meta and gets none: it holds no revision to build on,
 * so it can only take the server's copy (or create it when the server has none).
 */
function markDirty(puzzleId: string): void {
  const meta = readMeta(puzzleId);
  if (meta) {
    writeMeta(puzzleId, { baseRev: meta.baseRev, dirty: true });
  }
}

function sameCells(puzzleId: string, entry: WireEntry): boolean {
  const local = loadProgress(puzzleId);
  return (
    local !== undefined &&
    JSON.stringify(local.cells) === JSON.stringify(entry.cells)
  );
}

/** Records a successful attempt for the settings panel. */
function recordSyncSuccess(): void {
  saveSyncStatus({ lastSyncAt: Date.now(), lastAttemptFailed: false });
}

/** Records a failed attempt, keeping the time of the last success. */
function recordSyncFailure(): void {
  saveSyncStatus({ ...loadSyncStatus(), lastAttemptFailed: true });
}

/**
 * Replaces the local progress with the server's entry. Returns whether the
 * local cells actually changed; `false` too when the local write failed (the
 * meta is then left alone so the next open tries again). When only the meta
 * write fails, the cells are replaced all the same and the revision is kept
 * in memory (see `unsavedMeta`).
 */
function pullWireEntry(entry: WireEntry): boolean {
  const unchanged = sameCells(entry.puzzleId, entry);
  if (!unchanged && !saveProgress(entry.puzzleId, { cells: entry.cells })) {
    return false;
  }
  writeMeta(entry.puzzleId, { baseRev: entry.rev, dirty: false });
  return !unchanged;
}

/**
 * One PUT of a puzzle's local cells on top of `baseRev`. A stale answer is not
 * an error: the plan is re-run against the server's entry and, when it says to
 * push, exactly one more PUT is sent on top of the server's revision
 * (`canRetry`) — never a loop. A second stale answer leaves the puzzle dirty
 * for the next open. When the player saved again while the request was in
 * flight, one follow-up PUT carries the latest cells on the new revision.
 * `done(true)` means the local progress was replaced by a pull.
 */
function sendPush(
  run: Run,
  puzzleId: string,
  baseRev: number,
  canRetry: boolean,
  done: (replaced: boolean) => void,
): void {
  const progress = loadProgress(puzzleId);
  if (!progress || !isProgressShape(progress.cells)) {
    done(false);
    return;
  }
  const sentCells = JSON.stringify(progress.cells);

  putProgress(run.config, puzzleId, progress.cells, baseRev, (result) => {
    if (!isCurrent(run)) {
      done(false);
      return;
    }
    try {
      if (result.kind === "ok") {
        const latest = loadProgress(puzzleId);
        const changedSince = JSON.stringify(latest?.cells) !== sentCells;
        if (
          writeMeta(puzzleId, {
            baseRev: result.entry.rev,
            dirty: changedSince,
          })
        ) {
          recordSyncSuccess();
        }
        if (changedSince) {
          sendPush(run, puzzleId, result.entry.rev, true, done);
          return;
        }
        done(false);
      } else if (result.kind === "stale") {
        const action = planSync(
          {
            hasProgress: true,
            meta: readMeta(puzzleId),
            matchesServer: sameCells(puzzleId, result.current),
          },
          result.current,
        );
        if (action.kind === "pull") {
          done(pullWireEntry(result.current));
        } else if (action.kind === "push" && canRetry) {
          sendPush(run, puzzleId, action.baseRev, false, done);
        } else {
          done(false);
        }
      } else {
        recordSyncFailure();
        done(false);
      }
    } catch {
      done(false);
    }
  });
}

/**
 * Pushes a puzzle's local cells on top of `baseRev`, at most one PUT in
 * flight per puzzle. A push asked meanwhile is skipped: the one in flight
 * notices the newer cells when it is answered and sends them itself.
 */
function pushPuzzle(
  run: Run,
  puzzleId: string,
  baseRev: number,
  done: (replaced: boolean) => void,
): void {
  if (pushing.has(puzzleId)) {
    done(false);
    return;
  }
  pushing.add(puzzleId);
  sendPush(run, puzzleId, baseRev, true, (replaced) => {
    if (isCurrent(run)) {
      pushing.delete(puzzleId);
    }
    done(replaced);
  });
}

/**
 * Called after a successful local save: when a server is configured, flags
 * the puzzle as changed (the retry queue) and pushes it; `onPulled` runs when
 * the server turned out to hold a copy that replaced the local one. Without a
 * config it does nothing at all. Never throws.
 */
export function syncPuzzleAfterSave(
  puzzleId: string,
  onPulled?: () => void,
): void {
  try {
    const run = startRun();
    if (!run) {
      // Never configured: no sync key is written, and a later first sync
      // lets the server's copy win.
      return;
    }
    markDirty(puzzleId);
    const action = planSync({
      hasProgress: true,
      meta: readMeta(puzzleId),
      matchesServer: false,
    });
    if (action.kind !== "push") {
      return;
    }
    pushPuzzle(run, puzzleId, action.baseRev, (replaced) => {
      try {
        if (replaced) {
          onPulled?.();
        }
      } catch {
        // A failing callback must not surface from the sync.
      }
    });
  } catch {
    // Sync must never block the game.
  }
}

/**
 * Called when a page opens: pulls what the server has that this device lacks
 * (a wiped device is restored), pushes what is waiting, and reports, via
 * `onChanged`, the ids whose local progress was replaced. The pulled ids are
 * reported right away, before the pushes start, so a page repaints before the
 * player can act on stale cells; ids replaced later by a stale push come in
 * further calls. Each id is reported once and `onChanged` never gets an empty
 * list. Without a config nothing is requested. Never throws; `done` runs
 * when everything settled.
 */
export function syncAllOnOpen(
  onChanged: (puzzleIds: string[]) => void,
  done?: () => void,
): void {
  const finish = (): void => {
    try {
      done?.();
    } catch {
      // A failing callback must not surface from the sync.
    }
  };

  try {
    const run = startRun();
    if (!run) {
      finish();
      return;
    }
    fetchAllProgress(run.config, (result) => {
      try {
        if (!isCurrent(run)) {
          finish();
          return;
        }
        if (result.kind !== "ok") {
          recordSyncFailure();
          finish();
          return;
        }
        recordSyncSuccess();
        applyServerState(run, result.items, onChanged, finish);
      } catch {
        finish();
      }
    });
  } catch {
    finish();
  }
}

function applyServerState(
  run: Run,
  items: WireEntry[],
  onChanged: (puzzleIds: string[]) => void,
  finish: () => void,
): void {
  const replaced: string[] = [];
  const pushes: { puzzleId: string; baseRev: number }[] = [];

  for (const entry of items) {
    const action = planSync(
      {
        hasProgress: loadProgress(entry.puzzleId) !== undefined,
        meta: readMeta(entry.puzzleId),
        matchesServer: sameCells(entry.puzzleId, entry),
      },
      entry,
    );
    if (action.kind === "pull") {
      if (pullWireEntry(entry)) {
        replaced.push(entry.puzzleId);
      }
    } else if (action.kind === "push") {
      pushes.push({ puzzleId: entry.puzzleId, baseRev: action.baseRev });
    }
  }

  const known = new Set(items.map((entry) => entry.puzzleId));
  // Local progress the server doesn't know: dirty, or older than sync itself.
  for (const puzzleId of listProgressPuzzleIds()) {
    if (known.has(puzzleId)) {
      continue;
    }
    const action = planSync({
      hasProgress: true,
      meta: readMeta(puzzleId),
      matchesServer: false,
    });
    if (action.kind === "push") {
      pushes.push({ puzzleId, baseRev: action.baseRev });
    }
  }

  function report(puzzleIds: string[]): void {
    try {
      if (puzzleIds.length > 0) {
        onChanged(puzzleIds);
      }
    } catch {
      // A failing callback must not surface from the sync.
    }
  }

  // Before any push: the pulled cells are already stored, the page must
  // not keep (and save) the old ones while the pushes wait for the network.
  report(replaced);

  function next(index: number): void {
    if (index >= pushes.length || !isCurrent(run)) {
      finish();
      return;
    }
    const { puzzleId, baseRev } = pushes[index];
    pushPuzzle(run, puzzleId, baseRev, (wasReplaced) => {
      if (wasReplaced) {
        report([puzzleId]);
      }
      next(index + 1);
    });
  }
  next(0);
}
