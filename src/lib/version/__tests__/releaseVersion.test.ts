/**
 * Guards the release tag against shipping an APK Android treats as the already-installed
 * build: v1.3-elna was tagged one commit before `build.gradle` was bumped, so its APK still
 * said versionCode 2 / 1.2.0 and "updating" from 1.2 silently reinstalled 1.2.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

const gradle = read("android/app/build.gradle");
const pkg = JSON.parse(read("package.json")) as { version: string };

describe("release version", () => {
  it("keeps android versionName in step with package.json", () => {
    const name = /versionName\s+"([^"]+)"/.exec(gradle)?.[1];
    // "v1.3-elna" -> 1.3.0, "v2.0.0" -> 2.0.0: the numeric core, padded to major.minor.patch.
    const [major = "0", minor = "0", patch = "0"] = (
      /^v?(\d+(?:\.\d+)*)/.exec(pkg.version)?.[1] ?? ""
    ).split(".");
    expect(name).toBe(`${major}.${minor}.${patch}`);
  });

  it("has a positive integer versionCode", () => {
    const code = Number(/versionCode\s+(\d+)/.exec(gradle)?.[1]);
    expect(Number.isInteger(code) && code > 0).toBe(true);
  });
});
