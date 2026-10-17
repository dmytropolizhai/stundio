#!/usr/bin/env python3
"""Run the official dependency generators against clean copies of Stundio's lockfiles."""
import json
import argparse
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[2]
TOOLS = ROOT / ".desktop-tools/flatpak-builder-tools"
OUTPUT = ROOT / "packaging/flatpak/generated"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cargo-only", action="store_true")
    args = parser.parse_args()
    if not TOOLS.is_dir():
        sys.exit("Install flatpak-builder-tools as described in LINUX.md first.")
    OUTPUT.mkdir(parents=True, exist_ok=True)
    environment = dict(os.environ, XDG_CACHE_HOME=str(ROOT / ".desktop-tools/generator-cache"))
    with tempfile.TemporaryDirectory(prefix="stundio-locks-") as temporary:
        staging = Path(temporary)
        for name in ("package.json", "package-lock.json"):
            shutil.copyfile(ROOT / name, staging / name)
        if not args.cargo_only:
            subprocess.run([
                sys.executable, "-m", "flatpak_node_generator", "--no-requests-cache",
                "-o", str(OUTPUT / "node-sources.json"), "npm", str(staging / "package-lock.json"),
            ], check=True, env=environment)
    subprocess.run([
        sys.executable, str(TOOLS / "cargo/flatpak-cargo-generator.py"),
        str(ROOT / "src-tauri/Cargo.lock"), "-o", str(OUTPUT / "cargo-sources.json"),
    ], check=True, env=environment)
    revision = subprocess.check_output(["git", "-C", str(TOOLS), "rev-parse", "HEAD"], text=True).strip()
    (OUTPUT / "tools.json").write_text(json.dumps({"flatpak-builder-tools": revision}, indent=2) + "\n")


if __name__ == "__main__":
    main()
