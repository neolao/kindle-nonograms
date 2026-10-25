/** What a device remembers about one puzzle's relationship with the server. */
export interface PlanMeta {
  baseRev: number;
  dirty: boolean;
}

/** `push` carries the revision the PUT must name as its base. */
export type SyncAction =
  | { kind: "pull" }
  | { kind: "push"; baseRev: number }
  | { kind: "nothing" };

/**
 * Decides what to do for one puzzle from the local state and the server's
 * entry (if any). Pure. The server counts revisions, so no clock is involved
 * (see .vibe/decisions/054-sync-uses-server-revisions-not-clocks.md):
 * - a device with no meta (it never synced the puzzle) takes the server's
 *   copy and never overwrites it;
 * - unsent local changes win over a newer server copy (pushed on top of the
 *   server's revision) — the latest action of the player wins;
 * - a clean device at the server's revision still pulls when its cells differ
 *   from the server's (two devices can hold the same revision number for
 *   different cells after a wiped server was refilled);
 * - a server behind what this device has seen, or without any entry, lost
 *   data, so the device restores it (on top of the server's revision, or of
 *   the one it knew when the server has nothing, so revisions keep growing).
 */
export function planSync(
  local: { hasProgress: boolean; meta?: PlanMeta; matchesServer: boolean },
  server?: { rev: number },
): SyncAction {
  const { hasProgress, meta } = local;

  if (!server) {
    return hasProgress
      ? { kind: "push", baseRev: meta ? meta.baseRev : 0 }
      : { kind: "nothing" };
  }
  if (!meta) {
    return { kind: "pull" };
  }
  if (server.rev === meta.baseRev) {
    if (meta.dirty) {
      return { kind: "push", baseRev: server.rev };
    }
    // A refilled server can reach the revision another device knows with
    // other cells; a clean device has nothing unsent, so the server wins.
    return local.matchesServer ? { kind: "nothing" } : { kind: "pull" };
  }
  if (server.rev > meta.baseRev) {
    return meta.dirty
      ? { kind: "push", baseRev: server.rev }
      : { kind: "pull" };
  }
  return hasProgress
    ? { kind: "push", baseRev: server.rev }
    : { kind: "nothing" };
}
