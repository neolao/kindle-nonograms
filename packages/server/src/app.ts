import { createHash, timingSafeEqual } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import {
  PROGRESS_ROUTE,
  STORAGE_CORRUPT_CODE,
  type WireEntry,
  isProgressShape,
  isRevision,
  isValidPuzzleId,
  isValidTimestamp,
} from "@kindle-nonograms/shared";
import express, {
  type ErrorRequestHandler,
  type Request,
  type Response,
} from "express";
import {
  StorageCorruptError,
  type StoredEntry,
  createStorage,
} from "./storage.js";

export interface AppOptions {
  keys: string[];
  dataDir: string;
  allowedOrigin: string;
}

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

function sendError(
  res: Response,
  status: number,
  code: string,
  message: string,
  extra = {},
) {
  res.status(status).json({ error: { code, message }, ...extra });
}

function toWire(puzzleId: string, entry: StoredEntry): WireEntry {
  const wire: WireEntry = { puzzleId, cells: entry.cells, rev: entry.rev };
  if (entry.openedAt !== undefined) {
    wire.openedAt = entry.openedAt;
  }
  return wire;
}

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

/** Returns the configured key matching the bearer token, if any. */
function findKey(keys: string[], request: Request): string | undefined {
  const match = /^Bearer (.+)$/.exec(request.headers.authorization ?? "");
  if (!match) {
    return undefined;
  }
  const presented = digest(match[1]);
  return keys.find((key) => timingSafeEqual(digest(key), presented));
}

function parseLimit(raw: unknown): number | null {
  if (raw === undefined) {
    return DEFAULT_LIMIT;
  }
  if (typeof raw !== "string" || !/^[0-9]+$/.test(raw) || Number(raw) < 1) {
    return null;
  }
  return Math.min(Number(raw), MAX_LIMIT);
}

/** One line per unexpected failure; never the key or the Authorization header. */
function logError(req: Request, error: unknown): void {
  const cause = error instanceof Error ? error : new Error(String(error));
  process.stderr.write(
    `${JSON.stringify({
      method: req.method,
      path: req.path,
      error: cause.name,
      message: cause.message,
    })}\n`,
  );
}

export function createApp({ keys, dataDir, allowedOrigin }: AppOptions) {
  const storage = createStorage(dataDir);
  const app = express();
  app.disable("x-powered-by");

  app.use((req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Vary", "Origin");
    if (req.headers.origin === allowedOrigin) {
      res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
    }
    if (req.method === "OPTIONS") {
      res.setHeader("Access-Control-Allow-Methods", "GET, PUT, OPTIONS");
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Authorization, Content-Type",
      );
      res.setHeader("Access-Control-Max-Age", "600");
      if (req.headers["access-control-request-private-network"] === "true") {
        res.setHeader("Access-Control-Allow-Private-Network", "true");
      }
      res.status(204).end();
      return;
    }
    next();
  });

  app.use("/api", (req, res, next) => {
    const key = findKey(keys, req);
    if (key === undefined) {
      res.setHeader("WWW-Authenticate", "Bearer");
      sendError(res, 401, "unauthorized", "A valid key is required");
      return;
    }
    res.locals.key = key;
    next();
  });

  app.use(express.json({ limit: "100kb" }));

  app.get(PROGRESS_ROUTE, async (req, res, next) => {
    try {
      const limit = parseLimit(req.query.limit);
      const { cursor, updatedSince } = req.query;
      let after: string | undefined;
      if (cursor !== undefined) {
        after =
          typeof cursor === "string"
            ? Buffer.from(cursor, "base64url").toString("utf-8")
            : "";
      }
      if (
        limit === null ||
        (after !== undefined && !isValidPuzzleId(after)) ||
        (updatedSince !== undefined && !isValidTimestamp(updatedSince))
      ) {
        sendError(
          res,
          400,
          "invalid_query",
          "limit, cursor or updatedSince is invalid",
        );
        return;
      }

      const since =
        typeof updatedSince === "string" ? Date.parse(updatedSince) : undefined;
      const matching = [...(await storage.read(res.locals.key))]
        .filter(
          ([puzzleId, entry]) =>
            (after === undefined || puzzleId > after) &&
            (since === undefined || Date.parse(entry.updatedAt) > since),
        )
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
      const page = matching.slice(0, limit);
      const nextCursor =
        matching.length > page.length
          ? Buffer.from(page[page.length - 1][0]).toString("base64url")
          : null;

      res.json({
        items: page.map(([puzzleId, entry]) => toWire(puzzleId, entry)),
        nextCursor,
      });
    } catch (error) {
      next(error);
    }
  });

  app.put(`${PROGRESS_ROUTE}/:puzzleId`, async (req, res, next) => {
    try {
      const { puzzleId } = req.params;
      if (!isValidPuzzleId(puzzleId)) {
        sendError(
          res,
          400,
          "invalid_puzzle_id",
          "The puzzle id is not a valid slug",
        );
        return;
      }
      const body: Record<string, unknown> =
        typeof req.body === "object" && req.body !== null ? req.body : {};
      if (body.puzzleId !== undefined && body.puzzleId !== puzzleId) {
        sendError(
          res,
          400,
          "puzzle_id_mismatch",
          "The body puzzleId differs from the path",
        );
        return;
      }
      const { cells, baseRev, openedAt } = body;
      if (
        !isProgressShape(cells) ||
        !isRevision(baseRev, 0) ||
        (openedAt !== undefined && !isValidTimestamp(openedAt))
      ) {
        sendError(
          res,
          422,
          "invalid_body",
          "cells, baseRev or openedAt is invalid",
        );
        return;
      }

      const outcome = await storage.update(res.locals.key, (entries) => {
        const current = entries.get(puzzleId);
        if (current && isDeepStrictEqual(current.cells, cells)) {
          // Same cells: no new revision, but a newer openedAt is kept.
          if (openedAt === undefined || openedAt === current.openedAt) {
            return { next: null, result: { stale: false, entry: current } };
          }
          const entry: StoredEntry = { ...current, openedAt };
          return {
            next: new Map(entries).set(puzzleId, entry),
            result: { stale: false, entry },
          };
        }
        if (current && current.rev !== baseRev) {
          return { next: null, result: { stale: true, entry: current } };
        }
        // No stored entry: accept whatever baseRev the client remembers, so a
        // server that lost its data can be restored from a device's copy, one
        // revision ahead of what any device saw.
        const entry: StoredEntry = {
          cells,
          rev: (current ? current.rev : baseRev) + 1,
          updatedAt: new Date().toISOString(),
        };
        const kept = openedAt ?? current?.openedAt;
        if (kept !== undefined) {
          entry.openedAt = kept;
        }
        return {
          next: new Map(entries).set(puzzleId, entry),
          result: { stale: false, entry },
        };
      });

      if (outcome.stale) {
        sendError(
          res,
          409,
          "progress_stale",
          "The stored progress changed since baseRev",
          {
            current: toWire(puzzleId, outcome.entry),
          },
        );
        return;
      }
      res.json(toWire(puzzleId, outcome.entry));
    } catch (error) {
      next(error);
    }
  });

  app.use((_req, res) => {
    sendError(res, 404, "not_found", "No such route");
  });

  const onError: ErrorRequestHandler = (error, req, res, _next) => {
    if (error.type === "entity.too.large") {
      sendError(res, 413, "payload_too_large", "The request body is too large");
    } else if (error.type === "entity.parse.failed") {
      sendError(res, 400, "invalid_json", "The request body is not valid JSON");
    } else if (error instanceof StorageCorruptError) {
      logError(req, error);
      sendError(
        res,
        500,
        STORAGE_CORRUPT_CODE,
        "The stored progress cannot be read",
      );
    } else {
      logError(req, error);
      sendError(res, 500, "internal_error", "Internal server error");
    }
  };
  app.use(onError);

  return app;
}
