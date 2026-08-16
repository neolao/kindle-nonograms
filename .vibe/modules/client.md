# Module: client
**Role:** Vanilla TypeScript frontend, built with Vite (es2015 target) for compatibility with Kindle's browser.
**Files:** `packages/client/src/main.ts`, `packages/client/src/progressStorage.ts`
**Exports:** `formatClueLine(clues: number[]): string`; mounts the app into `#app` on load; `saveProgress(puzzleId, progress): void`, `loadProgress(puzzleId): PuzzleProgress | undefined` — persists a puzzle's progress to `localStorage`, degrading silently if storage is unavailable, throws, or holds corrupted JSON
**Depends on:** `modules/shared.md`
