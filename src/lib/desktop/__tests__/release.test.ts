/** A desktop release must advertise the same version and app identity in every artifact. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import pkg from "../../../../package.json";
import config from "../../../../src-tauri/tauri.conf.json";
import flatpak from "../../../../packaging/flatpak/io.github.dmytropolizhai.stundio.json";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("Linux release metadata", () => {
  it("keeps Rust, frontend and desktop versions aligned", () => {
    const version = pkg.version.replace(/^v/, "");
    expect(config.version).toBe(version);
    expect(read("src-tauri/Cargo.toml")).toMatch(
      new RegExp(`^version = "${version.replaceAll(".", "\\.")}"$`, "m"),
    );
    expect(read(`packaging/flatpak/${config.identifier}.metainfo.xml`)).toContain(
      `release version="${version}"`,
    );
  });

  it("keeps the launcher, store metadata and sandbox identity consistent", () => {
    expect(flatpak["app-id"]).toBe(config.identifier);
    expect(read(`packaging/flatpak/${config.identifier}.desktop`)).toContain(
      `Icon=${config.identifier}`,
    );
    expect(read(`packaging/flatpak/${config.identifier}.metainfo.xml`)).toContain(
      `<id>${config.identifier}</id>`,
    );
    expect(flatpak["finish-args"]).not.toContain("--filesystem=home");
    expect(flatpak["finish-args"]).not.toContain("--filesystem=host");
  });
});
