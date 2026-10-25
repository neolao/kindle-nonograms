import { describe, expect, it } from "vitest";
import { readConfig } from "./config.js";

const VALID = {
  KINDLE_SYNC_KEYS: "aaaaaaaaaaaaaaaa, bbbbbbbbbbbbbbbb ,,cccccccccccccccc",
  ALLOWED_ORIGIN: "https://neolao.github.io",
};

describe("readConfig", () => {
  it("splits and trims the comma separated keys and applies defaults", () => {
    expect(readConfig(VALID)).toEqual({
      keys: ["aaaaaaaaaaaaaaaa", "bbbbbbbbbbbbbbbb", "cccccccccccccccc"],
      allowedOrigin: "https://neolao.github.io",
      dataDir: "sync-data",
      host: "0.0.0.0",
      port: 3000,
    });
  });

  it("reads DATA_DIR, HOST and PORT when provided", () => {
    const config = readConfig({
      ...VALID,
      DATA_DIR: "/var/sync",
      HOST: "127.0.0.1",
      PORT: "8080",
    });

    expect(config.dataDir).toBe("/var/sync");
    expect(config.host).toBe("127.0.0.1");
    expect(config.port).toBe(8080);
  });

  it("refuses a key shorter than 16 characters", () => {
    expect(() =>
      readConfig({ ...VALID, KINDLE_SYNC_KEYS: "aaaaaaaaaaaaaaaa,short" }),
    ).toThrow(/at least 16/);
  });

  it("accepts a key of exactly 16 characters", () => {
    expect(
      readConfig({ ...VALID, KINDLE_SYNC_KEYS: "0123456789abcdef" }).keys,
    ).toEqual(["0123456789abcdef"]);
  });

  it("refuses to start without keys", () => {
    expect(() => readConfig({ ALLOWED_ORIGIN: VALID.ALLOWED_ORIGIN })).toThrow(
      /KINDLE_SYNC_KEYS/,
    );
    expect(() => readConfig({ ...VALID, KINDLE_SYNC_KEYS: " , " })).toThrow(
      /KINDLE_SYNC_KEYS/,
    );
  });

  it("refuses to start without an allowed origin", () => {
    expect(() => readConfig({ KINDLE_SYNC_KEYS: "aaaaaaaaaaaaaaaa" })).toThrow(
      /ALLOWED_ORIGIN/,
    );
  });

  it("refuses an invalid port", () => {
    expect(() => readConfig({ ...VALID, PORT: "abc" })).toThrow(/PORT/);
    expect(() => readConfig({ ...VALID, PORT: "70000" })).toThrow(/PORT/);
  });

  it("refuses port 0 and accepts the highest port, 65535", () => {
    expect(() => readConfig({ ...VALID, PORT: "0" })).toThrow(/PORT/);
    expect(readConfig({ ...VALID, PORT: "65535" }).port).toBe(65535);
  });

  it("trims the spaces around the allowed origin", () => {
    expect(
      readConfig({ ...VALID, ALLOWED_ORIGIN: "  https://user.github.io " })
        .allowedOrigin,
    ).toBe("https://user.github.io");
  });

  it.each(["https://user.github.io", "http://localhost:4180"])(
    "accepts the origin %s",
    (origin) => {
      expect(
        readConfig({ ...VALID, ALLOWED_ORIGIN: origin }).allowedOrigin,
      ).toBe(origin);
    },
  );

  it.each([
    "https://user.github.io/",
    "https://user.github.io/kindle-nonograms/",
    "user.github.io",
    "not a url",
  ])("refuses the origin %s, which no Origin header can equal", (origin) => {
    expect(() => readConfig({ ...VALID, ALLOWED_ORIGIN: origin })).toThrow(
      /ALLOWED_ORIGIN must be an origin like https:\/\/user\.github\.io/,
    );
  });
});
