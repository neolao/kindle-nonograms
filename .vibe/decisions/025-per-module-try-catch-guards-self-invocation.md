---
date: 2026-09-07
status: accepted
---
# Per-module try/catch guards each page module's self-invocation

**Context:** `main.ts` loads all three page-hydration modules via static `import` declarations for their self-invoking side effects; an uncaught error thrown while one module's top-level `hydrate()` call ran could halt the shared bundle's remaining synchronous execution, stopping the other two modules from ever being imported (backlog item 041).

**Decision:** Each of the three `hydrate*.ts` modules wraps its own self-invocation (`hydrate()`) in a try/catch, right where it already guards on `typeof document !== "undefined"`, rather than changing anything in `main.ts` itself.

**Reason:** A static `import` declaration cannot be wrapped in try/catch, so isolating a whole module's failure from the next one in `main.ts`'s import order is only possible from inside the failing module. This keeps the fix fully synchronous and `es2015`-safe (no dynamic `import()`, no top-level `await`, both of which would risk Kindle's old WebKit and complicate test timing), and matches the codebase's existing "degrade silently" try/catch convention used elsewhere in these same files.

**Rejected alternatives:** Converting `main.ts`'s three imports to dynamic `import()` calls wrapped in try/catch, each awaited in sequence — this would genuinely centralize the isolation logic in `main.ts`, but requires either top-level `await` (a newer module-evaluation feature riskier for Kindle's browser and untested here) or an async IIFE (which decouples `import("./main.js")`'s completion from the actual hydration work, breaking the deterministic timing every existing hydration test relies on). Exporting each module's `hydrate` and having `main.ts` call all three explicitly inside its own try/catch was also considered, but a whole-module evaluation failure (e.g. a throw in top-level module code, not just inside `hydrate()`) would still happen during the static `import` itself, before `main.ts`'s own try/catch ever runs — it would not have covered the actual reported failure mode.
