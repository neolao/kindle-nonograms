import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { withTimeout } from "./withTimeout.js";

describe("withTimeout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("resolves with the wrapped value when it settles before the timeout", async () => {
    const onTimeout = vi.fn(() => new Error("timed out"));

    const result = withTimeout(Promise.resolve("decoded"), 15000, onTimeout);
    await vi.advanceTimersByTimeAsync(0);

    await expect(result).resolves.toBe("decoded");
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it("rejects with the wrapped promise's own error when it fails before the timeout", async () => {
    const onTimeout = vi.fn(() => new Error("timed out"));
    const originalError = new Error("decode failed");

    const result = withTimeout(
      Promise.resolve().then(() => {
        throw originalError;
      }),
      15000,
      onTimeout,
    );

    await expect(result).rejects.toBe(originalError);
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it("rejects with onTimeout()'s error once the timeout elapses without the promise settling", async () => {
    const timeoutError = new Error("timed out");
    const onTimeout = vi.fn(() => timeoutError);
    const neverSettles = new Promise(() => {});

    const result = withTimeout(neverSettles, 15000, onTimeout);
    const assertion = expect(result).rejects.toBe(timeoutError);
    await vi.advanceTimersByTimeAsync(15000);

    await assertion;
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it("never calls onTimeout again once the wrapped promise already resolved (timer is cleared)", async () => {
    const onTimeout = vi.fn(() => new Error("timed out"));

    const result = withTimeout(Promise.resolve("fast"), 15000, onTimeout);
    await vi.advanceTimersByTimeAsync(0);
    await result;

    await vi.advanceTimersByTimeAsync(15000);

    expect(onTimeout).not.toHaveBeenCalled();
  });
});
