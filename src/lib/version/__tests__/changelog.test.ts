import { describe, expect, it } from "vitest";
import { entriesSince, entriesUpTo, sortByVersionDesc } from "@/lib/version";

const entries = [
  { version: "v1.0.1-ozols" },
  { version: "v1.0.4-ozols" },
  { version: "v1.0.0-ozols" },
  { version: "v1.0.3-ozols" },
];

const versions = (list: { version: string }[]) => list.map((e) => e.version);

describe("sortByVersionDesc", () => {
  it("orders newest first regardless of input order", () => {
    expect(versions(sortByVersionDesc(entries))).toEqual([
      "v1.0.4-ozols",
      "v1.0.3-ozols",
      "v1.0.1-ozols",
      "v1.0.0-ozols",
    ]);
  });

  it("sorts an unparseable tag last instead of throwing", () => {
    const sorted = sortByVersionDesc([{ version: "nonsense" }, { version: "v1.0.0" }]);
    expect(versions(sorted)).toEqual(["v1.0.0", "nonsense"]);
  });

  it("does not mutate its input", () => {
    const input = [...entries];
    sortByVersionDesc(input);
    expect(versions(input)).toEqual(versions(entries));
  });
});

describe("entriesUpTo", () => {
  it("drops entries newer than the installed build", () => {
    expect(versions(entriesUpTo(entries, "v1.0.3-ozols"))).toEqual([
      "v1.0.3-ozols",
      "v1.0.1-ozols",
      "v1.0.0-ozols",
    ]);
  });

  it("returns nothing when the current version is unparseable", () => {
    expect(entriesUpTo(entries, "nonsense")).toEqual([]);
  });
});

describe("entriesSince", () => {
  it("returns only the releases between last seen and the installed build", () => {
    expect(versions(entriesSince(entries, "v1.0.1-ozols", "v1.0.4-ozols"))).toEqual([
      "v1.0.4-ozols",
      "v1.0.3-ozols",
    ]);
  });

  it("returns nothing when the user is already current", () => {
    expect(entriesSince(entries, "v1.0.4-ozols", "v1.0.4-ozols")).toEqual([]);
  });

  it("shows nothing on an install that has never been marked", () => {
    expect(entriesSince(entries, null, "v1.0.4-ozols")).toEqual([]);
  });

  it("never announces a version the installed APK does not contain", () => {
    // Skipped two releases, but the build on the device is only v1.0.3.
    expect(versions(entriesSince(entries, "v1.0.0-ozols", "v1.0.3-ozols"))).toEqual([
      "v1.0.3-ozols",
      "v1.0.1-ozols",
    ]);
  });

  it("returns nothing after a downgrade rather than replaying history", () => {
    expect(entriesSince(entries, "v1.0.4-ozols", "v1.0.1-ozols")).toEqual([]);
  });

  it("ignores entries and versions whose tags do not parse", () => {
    expect(entriesSince([...entries, { version: "nope" }], "bad", "v1.0.4-ozols")).toEqual([]);
    expect(
      versions(entriesSince([...entries, { version: "nope" }], "v1.0.3-ozols", "v1.0.4")),
    ).toEqual(["v1.0.4-ozols"]);
  });
});
