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
  it("derives android versionName and versionCode from package.json", () => {
    // build.gradle must not hardcode either: package.json is the single source of truth.
    expect(gradle).toMatch(/versionName\s+appVersion\.name/);
    expect(gradle).toMatch(/versionCode\s+appVersion\.code/);
    expect(gradle).toContain("package.json");
  });

  it("has a package.json version Gradle can turn into a rising versionCode", () => {
    // Mirrors build.gradle: "v2.5.0" -> 20500. Minor/patch must stay below 100.
    const [major = 0, minor = 0, patch = 0] = (
      /^v?(\d+(?:\.\d+){0,2})/.exec(pkg.version)?.[1] ?? ""
    )
      .split(".")
      .map(Number);
    expect(minor).toBeLessThan(100);
    expect(patch).toBeLessThan(100);
    expect(major * 10000 + minor * 100 + patch).toBeGreaterThan(5);
  });
});
