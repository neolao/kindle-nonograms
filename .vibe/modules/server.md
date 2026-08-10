# Module: server
**Role:** Express API for the game; builds the app separately from the HTTP listener so it can be tested in isolation.
**Files:** `packages/server/src/app.ts`, `packages/server/src/index.ts`
**Exports:** `createApp(): Express` (from `app.ts`); `index.ts` starts the HTTP listener on `PORT` (default 3000)
**Depends on:** `modules/shared.md`
