const MIN_KEY_LENGTH = 16;

/** Whether `value` is exactly an origin (scheme, host, optional port), as a browser sends it. */
function isOrigin(value: string): boolean {
  try {
    return new URL(value).origin === value;
  } catch {
    return false;
  }
}

export interface ServerConfig {
  keys: string[];
  allowedOrigin: string;
  dataDir: string;
  host: string;
  port: number;
}

/** Reads the server settings from the environment; throws when a required one is missing. */
export function readConfig(
  env: Record<string, string | undefined>,
): ServerConfig {
  const keys = (env.KINDLE_SYNC_KEYS ?? "")
    .split(",")
    .map((key) => key.trim())
    .filter((key) => key !== "");
  if (keys.length === 0) {
    throw new Error(
      "KINDLE_SYNC_KEYS must list at least one comma separated key",
    );
  }

  if (keys.some((key) => key.length < MIN_KEY_LENGTH)) {
    throw new Error(
      `Every key in KINDLE_SYNC_KEYS must be at least ${MIN_KEY_LENGTH} characters long`,
    );
  }

  const allowedOrigin = env.ALLOWED_ORIGIN?.trim();
  if (!allowedOrigin) {
    throw new Error(
      "ALLOWED_ORIGIN must be set to the site origin allowed to call the API",
    );
  }
  if (!isOrigin(allowedOrigin)) {
    throw new Error(
      "ALLOWED_ORIGIN must be an origin like https://user.github.io (scheme and host, no path or trailing slash)",
    );
  }

  const port = Number(env.PORT ?? "3000");
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }

  return {
    keys,
    allowedOrigin,
    dataDir: env.DATA_DIR ?? "sync-data",
    // All interfaces by default, so other devices of the LAN can reach it;
    // set HOST=127.0.0.1 behind a reverse proxy.
    host: env.HOST ?? "0.0.0.0",
    port,
  };
}
