#!/usr/bin/env python3
"""Build a local bundle, or export a commit-pinned manifest for Flathub review."""
import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[2]
PACKAGING = ROOT / "packaging/flatpak"
APP_ID = "io.github.dmytropolizhai.stundio"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--submission", type=Path, help="Export submission files here instead of building")
    parser.add_argument("--ref", default="HEAD", help="Published Git commit/ref for submission")
    parser.add_argument("--source-url", default="https://github.com/dmytropolizhai/stundio.git")
    args = parser.parse_args()
    generated = PACKAGING / "generated"
    if not all((generated / name).exists() for name in ("node-sources.json", "cargo-sources.json")):
        parser.error("Generate dependency sources first; see LINUX.md.")
    manifest = json.loads((PACKAGING / f"{APP_ID}.json").read_text())
    if args.submission:
        if subprocess.check_output(["git", "status", "--porcelain"], cwd=ROOT, text=True).strip():
            parser.error("Commit all changes before exporting a submission.")
        commit = subprocess.check_output(["git", "rev-parse", args.ref], cwd=ROOT, text=True).strip()
        args.submission.mkdir(parents=True, exist_ok=True)
        manifest["modules"][0]["sources"][0] = {"type": "git", "url": args.source_url, "commit": commit}
        for name in ("node-sources.json", "cargo-sources.json"):
            shutil.copyfile(generated / name, args.submission / name)
        shutil.copyfile(PACKAGING / "flathub.json", args.submission / "flathub.json")
        manifest["modules"][0]["sources"][1:] = ["node-sources.json", "cargo-sources.json"]
        (args.submission / f"{APP_ID}.json").write_text(json.dumps(manifest, indent=2) + "\n")
        print(f"Submission files written to {args.submission.resolve()}; source commit: {commit}")
        return
    # The environment may point at the isolated SDK installation; system installations work too.
    for executable in ("flatpak", "flatpak-builder", "appstreamcli"):
        if shutil.which(executable) is None:
            parser.error(f"Missing {executable}; install the Linux packaging prerequisites in LINUX.md.")
    subprocess.run([
        "flatpak-builder", "--user", "--force-clean", "--keep-build-dirs", "--repo=flatpak-repo",
        "build-flatpak", str(PACKAGING / f"{APP_ID}.json"),
    ], cwd=ROOT, check=True, env=os.environ)
    subprocess.run([
        "flatpak", "build-bundle", "flatpak-repo", f"Stundio-{APP_ID}.flatpak", APP_ID,
        "--runtime-repo=https://dl.flathub.org/repo/flathub.flatpakrepo",
    ], cwd=ROOT, check=True)


if __name__ == "__main__":
    main()
