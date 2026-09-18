import { describe, expect, it } from "vitest";
import { checkForUpdate, type FetchLatestRelease, type GitHubRelease } from "@/lib/version";

const fakeFetch =
  (
    tag_name: string,
    html_url = "https://example.com/release",
    assets: GitHubRelease["assets"] = [],
  ): FetchLatestRelease =>
  () =>
    Promise.resolve({ tag_name, html_url, assets });

const failingFetch: FetchLatestRelease = () => Promise.reject(new Error("offline"));

describe("checkForUpdate", () => {
  it("reports an update when the release tag is newer", async () => {
    const result = await checkForUpdate(
      "v0.0.1-alpha",
      "dmytropolizhai",
      "stundio",
      fakeFetch("v0.2.0-beta"),
    );
    expect(result).toEqual({
      hasUpdate: true,
      currentVersion: "v0.0.1-alpha",
      latestVersion: "v0.2.0-beta",
      url: "https://example.com/release",
      apkUrl: null,
    });
  });

  it("reports no update when already current", async () => {
    const result = await checkForUpdate(
      "v0.2.0-beta",
      "dmytropolizhai",
      "stundio",
      fakeFetch("v0.2.0-alpha"),
    );
    expect(result?.hasUpdate).toBe(false);
  });

  it("never throws, and returns null on network failure", async () => {
    await expect(
      checkForUpdate("v0.0.1-alpha", "dmytropolizhai", "stundio", failingFetch),
    ).resolves.toBeNull();
  });

  it("returns null when the tag can't be parsed", async () => {
    const result = await checkForUpdate(
      "v0.0.1-alpha",
      "dmytropolizhai",
      "stundio",
      fakeFetch("nightly"),
    );
    expect(result).toBeNull();
  });

  it("picks the .apk asset's download URL when the release has one", async () => {
    const result = await checkForUpdate(
      "v0.0.1-alpha",
      "dmytropolizhai",
      "stundio",
      fakeFetch("v0.2.0-beta", "https://example.com/release", [
        { name: "stundio.apk", browser_download_url: "https://example.com/stundio.apk" },
        { name: "checksums.txt", browser_download_url: "https://example.com/checksums.txt" },
      ]),
    );
    expect(result?.apkUrl).toBe("https://example.com/stundio.apk");
  });

  it("has no apkUrl when the release attached no APK", async () => {
    const result = await checkForUpdate(
      "v0.0.1-alpha",
      "dmytropolizhai",
      "stundio",
      fakeFetch("v0.2.0-beta"),
    );
    expect(result?.apkUrl).toBeNull();
  });
});
