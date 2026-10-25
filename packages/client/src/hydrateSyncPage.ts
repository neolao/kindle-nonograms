import {
  type Locale,
  type TranslationKey,
  isSupportedLocale,
  translate,
} from "@kindle-nonograms/shared";
import {
  applyLocale,
  readLocaleCookie,
  resolveLocale,
  writeLocaleCookie,
} from "./i18n.js";
import { cancelRunningSyncs, syncAllOnOpen } from "./sync.js";
import { type ConnectionResult, testConnection } from "./syncClient.js";
import {
  clearSyncConfig,
  loadSyncConfig,
  loadSyncStatus,
  parseBaseUrl,
  saveSyncConfig,
} from "./syncConfig.js";

type StatusState = "idle" | "ok" | "error";

interface PageContext {
  locale: Locale;
  /**
   * Counts Save attempts and Forget clicks: a connection test answers only
   * for the attempt it started, once a Forget or a newer Save has come by it
   * is ignored.
   */
  attempt: number;
}

// One distinct "Failed: <cause> – <what to do>" message per failure kind;
// none of them embeds the typed address or key.
const FAILURE_KEYS: Record<Exclude<ConnectionResult, "ok">, TranslationKey> = {
  unauthorized: "sync.error.unauthorized",
  unreachable: "sync.error.unreachable",
  "server-error": "sync.error.serverError",
  "not-a-sync-server": "sync.error.notSyncServer",
  "mixed-content": "sync.error.mixedContent",
};

function byRole<T extends HTMLElement>(name: string): T {
  const element = document.querySelector<T>(`[data-role="${name}"]`);
  if (!element) {
    throw new Error(`missing ${name}`);
  }
  return element;
}

/**
 * Sets an element's text from a translation key and keeps that key in
 * `data-i18n`, so a later language switch (`applyLocale`) retranslates it.
 */
function setText(
  element: HTMLElement,
  locale: Locale,
  key: TranslationKey,
): void {
  element.setAttribute("data-i18n", key);
  element.textContent = translate(locale, key);
}

function setStatus(
  ctx: PageContext,
  key: TranslationKey,
  state: StatusState,
): void {
  const status = byRole("sync-status");
  setText(status, ctx.locale, key);
  status.setAttribute("data-state", state);
}

/**
 * Feeds the "Last sync" line from the stored status. The time is formatted
 * here, so that line drops its `data-i18n` (the generic walker would put the
 * raw `{time}` template back) and is refreshed again on a language switch.
 */
function renderLastSync(ctx: PageContext): void {
  const last = byRole("sync-last");
  const status = loadSyncStatus();
  if (status.lastAttemptFailed) {
    setText(last, ctx.locale, "sync.lastFailed");
  } else if (status.lastSyncAt !== undefined) {
    last.removeAttribute("data-i18n");
    last.textContent = translate(ctx.locale, "sync.lastSync").replace(
      "{time}",
      new Date(status.lastSyncAt).toLocaleString(ctx.locale),
    );
  } else {
    setText(last, ctx.locale, "sync.neverSynced");
  }
}

function setUpLanguageSwitcher(ctx: PageContext): void {
  const select = document.querySelector<HTMLSelectElement>(
    '[data-role="language-switcher-select"]',
  );
  if (select) {
    select.value = ctx.locale;
    select.addEventListener("change", () => {
      if (isSupportedLocale(select.value)) {
        writeLocaleCookie(select.value);
        ctx.locale = select.value;
        applyLocale(ctx.locale);
        try {
          renderLastSync(ctx);
        } catch {
          // The line keeps its previous text.
        }
      }
    });
  }
  applyLocale(ctx.locale);
}

function restoreFields(ctx: PageContext): void {
  const config = loadSyncConfig();
  if (config) {
    byRole<HTMLInputElement>("sync-url").value = config.baseUrl;
    // The key stays in a type="password" input; it is never written to
    // markup, text or an attribute.
    byRole<HTMLInputElement>("sync-key").value = config.key;
    setStatus(ctx, "sync.status.saved", "idle");
  }
  renderLastSync(ctx);
}

function attachKeyToggle(ctx: PageContext): void {
  const toggle = byRole("sync-key-toggle");
  const key = byRole<HTMLInputElement>("sync-key");
  toggle.addEventListener("click", () => {
    const reveal = key.type === "password";
    key.type = reveal ? "text" : "password";
    toggle.setAttribute("aria-pressed", reveal ? "true" : "false");
    setText(toggle, ctx.locale, reveal ? "sync.hideKey" : "sync.showKey");
  });
}

function finishTest(
  ctx: PageContext,
  result: ConnectionResult,
  config: { baseUrl: string; key: string },
): void {
  const button = byRole<HTMLButtonElement>("sync-save");
  button.disabled = false;
  setText(button, ctx.locale, "sync.saveButton");

  if (result !== "ok") {
    setStatus(ctx, FAILURE_KEYS[result], "error");
    return;
  }
  if (!saveSyncConfig(config)) {
    setStatus(ctx, "sync.error.storage", "error");
    return;
  }
  // A sync started with the previous config must not write anything anymore.
  cancelRunningSyncs();
  setStatus(ctx, "sync.status.connected", "ok");
  // Restores whatever the server already holds (a wiped or new device).
  syncAllOnOpen(
    () => {},
    () => {
      try {
        renderLastSync(ctx);
      } catch {
        // The line keeps its previous text.
      }
    },
  );
  renderLastSync(ctx);
}

function reportUnreachable(ctx: PageContext, button: HTMLButtonElement): void {
  button.disabled = false;
  setText(button, ctx.locale, "sync.saveButton");
  setStatus(ctx, "sync.error.unreachable", "error");
}

function attachSave(ctx: PageContext): void {
  const button = byRole<HTMLButtonElement>("sync-save");
  const url = byRole<HTMLInputElement>("sync-url");
  const key = byRole<HTMLInputElement>("sync-key");
  button.addEventListener("click", () => {
    const baseUrl = parseBaseUrl(url.value.trim());
    const secret = key.value.trim();
    if (baseUrl === undefined) {
      setStatus(ctx, "sync.error.invalidUrl", "error");
      return;
    }
    if (secret === "") {
      setStatus(ctx, "sync.error.emptyKey", "error");
      return;
    }

    ctx.attempt++;
    const attempt = ctx.attempt;
    button.disabled = true;
    setText(button, ctx.locale, "sync.testing");
    setStatus(ctx, "sync.testing", "idle");
    const config = { baseUrl, key: secret };
    try {
      testConnection(config, (result) => {
        if (attempt !== ctx.attempt) {
          return;
        }
        try {
          finishTest(ctx, result, config);
        } catch {
          reportUnreachable(ctx, button);
        }
      });
    } catch {
      reportUnreachable(ctx, button);
    }
  });
}

function attachForget(ctx: PageContext): void {
  const button = byRole("sync-forget");
  button.addEventListener("click", () => {
    // Only a stored config is worth a confirmation; otherwise the button
    // just empties what was typed.
    if (
      loadSyncConfig() &&
      !confirm(translate(ctx.locale, "sync.confirmForget"))
    ) {
      return;
    }
    cancelRunningSyncs();
    // A connection test still pending is abandoned (see `PageContext.attempt`).
    ctx.attempt++;
    const save = byRole<HTMLButtonElement>("sync-save");
    save.disabled = false;
    setText(save, ctx.locale, "sync.saveButton");
    if (!clearSyncConfig()) {
      setStatus(ctx, "sync.error.storage", "error");
      return;
    }
    byRole<HTMLInputElement>("sync-url").value = "";
    byRole<HTMLInputElement>("sync-key").value = "";
    setStatus(ctx, "sync.status.notConfigured", "idle");
    renderLastSync(ctx);
  });
}

/**
 * Hydrates the optional-sync settings page: everything is already in the
 * static markup (see `renderSyncPage.ts`), so this only fills the stored
 * values in and attaches behavior. Self-detects by its own
 * `[data-role="sync-page"]` marker and is a no-op on every other page. Each
 * setup step runs in its own try/catch so one failing control cannot dead-end
 * its siblings (flow 001).
 */
export function hydrate(): void {
  if (!document.querySelector('[data-role="sync-page"]')) {
    return;
  }
  const ctx: PageContext = {
    locale: resolveLocale(readLocaleCookie(), navigator.language),
    attempt: 0,
  };

  for (const step of [
    setUpLanguageSwitcher,
    restoreFields,
    attachKeyToggle,
    attachSave,
    attachForget,
  ]) {
    try {
      step(ctx);
    } catch {
      // Degrades silently, same spirit as the rest of this client.
    }
  }
}

if (typeof document !== "undefined") {
  try {
    hydrate();
  } catch {
    // Isolates this module from the other page modules main.ts imports.
  }
}
