# Module: server
**Role:** Optional Express service, run by hand on the owner's network, that keeps a copy of each player's progress; never built into or deployed with the static site.
**Files:** `packages/server/src/app.ts`, `packages/server/src/storage.ts`, `packages/server/src/config.ts`, `packages/server/src/index.ts`
**Exports:** `createApp({keys, dataDir, allowedOrigin})` — bearer-key auth (constant time, one identical 401), `GET /api/progress` (paged, `updatedSince`), `PUT /api/progress/:puzzleId` (revision compare-and-write, 409 with the server entry), one `{error:{code,message}}` envelope, exact-origin CORS incl. preflight and Private Network header, `no-store`, `nosniff`; `readConfig(env)` (`KINDLE_SYNC_KEYS` ≥ 16 chars, `ALLOWED_ORIGIN` bare origin, `DATA_DIR`, `PORT`, `HOST`); `createStorage` (one JSON file per key named by its SHA-256, flushed temp file + rename, per-key lock, `StorageCorruptError`)
**Depends on:** `modules/shared.md` (wire contract and validators)
