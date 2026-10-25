import { describe, expect, it } from "vitest";
import { planSync } from "./syncPlan.js";

const dirty = { baseRev: 3, dirty: true };
const clean = { baseRev: 3, dirty: false };

describe("planSync without a server entry", () => {
  it("pushes local progress that has no sync meta on top of revision 0", () => {
    expect(
      planSync({ hasProgress: true, matchesServer: false }, undefined),
    ).toEqual({
      kind: "push",
      baseRev: 0,
    });
  });

  it("pushes dirty local progress on top of the revision it knew", () => {
    expect(
      planSync(
        { hasProgress: true, meta: dirty, matchesServer: false },
        undefined,
      ),
    ).toEqual({
      kind: "push",
      baseRev: 3,
    });
  });

  it("re-uploads clean local progress on top of the revision it knew (the server lost its data)", () => {
    expect(
      planSync(
        { hasProgress: true, meta: clean, matchesServer: false },
        undefined,
      ),
    ).toEqual({
      kind: "push",
      baseRev: 3,
    });
  });

  it("does nothing when there is no local progress at all", () => {
    expect(
      planSync({ hasProgress: false, matchesServer: false }, undefined),
    ).toEqual({
      kind: "nothing",
    });
    expect(
      planSync(
        { hasProgress: false, meta: clean, matchesServer: false },
        undefined,
      ),
    ).toEqual({
      kind: "nothing",
    });
  });
});

describe("planSync with a server entry", () => {
  it("pulls when the device has no meta, even if it has local progress (wiped then played)", () => {
    expect(
      planSync({ hasProgress: true, matchesServer: true }, { rev: 5 }),
    ).toEqual({
      kind: "pull",
    });
  });

  it("pulls on a fresh device with nothing local", () => {
    expect(
      planSync({ hasProgress: false, matchesServer: true }, { rev: 1 }),
    ).toEqual({
      kind: "pull",
    });
  });

  it("pushes dirty progress when the server is still at the known revision", () => {
    expect(
      planSync(
        { hasProgress: true, meta: dirty, matchesServer: true },
        { rev: 3 },
      ),
    ).toEqual({
      kind: "push",
      baseRev: 3,
    });
  });

  it("does nothing when clean and at the known revision", () => {
    expect(
      planSync(
        { hasProgress: true, meta: clean, matchesServer: true },
        { rev: 3 },
      ),
    ).toEqual({
      kind: "nothing",
    });
  });

  it("pushes dirty progress on top of the server's revision when the server moved ahead", () => {
    expect(
      planSync(
        { hasProgress: true, meta: dirty, matchesServer: true },
        { rev: 4 },
      ),
    ).toEqual({
      kind: "push",
      baseRev: 4,
    });
  });

  it("pulls when clean and the server moved ahead", () => {
    expect(
      planSync(
        { hasProgress: true, meta: clean, matchesServer: true },
        { rev: 4 },
      ),
    ).toEqual({
      kind: "pull",
    });
  });

  it("pushes local progress on top of the server's revision when the server is behind the known one (data lost)", () => {
    expect(
      planSync(
        { hasProgress: true, meta: clean, matchesServer: true },
        { rev: 1 },
      ),
    ).toEqual({
      kind: "push",
      baseRev: 1,
    });
  });

  it("does nothing when the server is behind and there is no local progress", () => {
    expect(
      planSync(
        { hasProgress: false, meta: clean, matchesServer: true },
        { rev: 1 },
      ),
    ).toEqual({
      kind: "nothing",
    });
  });

  it("pulls when clean at the known revision but the server holds other cells (a wiped server refilled by another device reached the same number)", () => {
    expect(
      planSync(
        { hasProgress: true, meta: clean, matchesServer: false },
        { rev: 3 },
      ),
    ).toEqual({ kind: "pull" });
  });

  it("pulls when clean at the known revision with no local progress at all", () => {
    expect(
      planSync(
        { hasProgress: false, meta: clean, matchesServer: false },
        { rev: 3 },
      ),
    ).toEqual({ kind: "pull" });
  });

  it("still pushes dirty progress at the known revision when the server holds other cells", () => {
    expect(
      planSync(
        { hasProgress: true, meta: dirty, matchesServer: false },
        { rev: 3 },
      ),
    ).toEqual({ kind: "push", baseRev: 3 });
  });
});
