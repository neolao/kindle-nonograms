import { describe, expect, it } from "vitest";
import {
  PROGRESS_ROUTE,
  STORAGE_CORRUPT_CODE,
  isRevision,
  isValidTimestamp,
  isWireEntry,
} from "./syncWire.js";

const ENTRY = { puzzleId: "cat", cells: [[0, null]], rev: 1 };

describe("PROGRESS_ROUTE", () => {
  it("is the collection path both sides use", () => {
    expect(PROGRESS_ROUTE).toBe("/api/progress");
  });
});

describe("STORAGE_CORRUPT_CODE", () => {
  it("is the error code a server with unreadable data answers", () => {
    expect(STORAGE_CORRUPT_CODE).toBe("storage_corrupt");
  });
});

describe("isRevision", () => {
  it("accepts 0 as a base revision but not as a stored revision", () => {
    expect(isRevision(0, 0)).toBe(true);
    expect(isRevision(0, 1)).toBe(false);
  });

  it("accepts positive integers at either minimum", () => {
    expect(isRevision(1, 0)).toBe(true);
    expect(isRevision(1, 1)).toBe(true);
    expect(isRevision(250, 1)).toBe(true);
  });

  it.each([
    -1,
    1.5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    "3",
    null,
    undefined,
  ])("rejects %s", (value) => {
    expect(isRevision(value, 0)).toBe(false);
  });
});

describe("isValidTimestamp", () => {
  it("accepts a parseable date string only", () => {
    expect(isValidTimestamp("2026-02-03T04:05:06.000Z")).toBe(true);
    expect(isValidTimestamp("soon")).toBe(false);
    expect(isValidTimestamp(1700000000000)).toBe(false);
  });
});

describe("isWireEntry", () => {
  it("accepts an entry with or without openedAt", () => {
    expect(isWireEntry(ENTRY)).toBe(true);
    expect(
      isWireEntry({ ...ENTRY, openedAt: "2026-02-03T04:05:06.000Z" }),
    ).toBe(true);
  });

  it.each([
    ["null", null],
    ["a bad puzzle id", { ...ENTRY, puzzleId: "Bad Id" }],
    ["a ragged grid", { ...ENTRY, cells: [[0], [0, 1]] }],
    ["revision 0", { ...ENTRY, rev: 0 }],
    ["a fractional revision", { ...ENTRY, rev: 1.5 }],
    ["an unparseable openedAt", { ...ENTRY, openedAt: "soon" }],
  ])("rejects %s", (_label, value) => {
    expect(isWireEntry(value)).toBe(false);
  });
});
