#!/usr/bin/env python3
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
PATCH = ROOT / "tools" / "native-panel-stability.patch"
BACKGROUND = ROOT / "app" / "background.js"
SIDEPANEL = ROOT / "app" / "sidepanel" / "sidepanel.js"
RAIL = ROOT / "app" / "content" / "rail.js"

MARKERS = (
    (BACKGROUND, "const openingWindows = new Map();"),
    (SIDEPANEL, "resolvePanelHostWindowId({"),
    (RAIL, "async function requestPanelOpen(payload)"),
)


def applied():
    return all(marker in path.read_text(encoding="utf-8") for path, marker in MARKERS)


if applied():
    print("Native Side Panel stabilization patch already applied")
else:
    check = subprocess.run(
        ["git", "apply", "--check", str(PATCH)],
        cwd=ROOT,
        text=True,
        capture_output=True,
    )
    if check.returncode != 0:
        raise SystemExit(
            "Stabilization patch no longer applies cleanly. Refusing to build from an ambiguous source tree.\n"
            + check.stderr
        )
    subprocess.run(["git", "apply", "--whitespace=nowarn", str(PATCH)], cwd=ROOT, check=True)
    if not applied():
        raise SystemExit("Stabilization patch completed but required runtime markers are missing")
    print("Applied Native Side Panel stabilization patch")
