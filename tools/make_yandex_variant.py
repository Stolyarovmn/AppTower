#!/usr/bin/env python3
from pathlib import Path
import json
import shutil

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "app"
DST = ROOT / "variants" / "yandex-sidecar"

if DST.exists():
    shutil.rmtree(DST)
shutil.copytree(SRC, DST)

manifest_path = DST / "manifest.json"
manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
manifest["permissions"] = [p for p in manifest.get("permissions", []) if p != "sidePanel"]
manifest.pop("side_panel", None)
manifest["description"] = (
    "App Tower Next with sidecar fallback for Chromium-family browsers "
    "without chrome.sidePanel."
)
manifest_path.write_text(
    json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
    encoding="utf-8",
)

readme = DST / "README.md"
if readme.exists():
    text = readme.read_text(encoding="utf-8")
    marker = "\n> Variant note: this source tree intentionally omits the native "
    if marker not in text:
        text += (
            "\n\n> Variant note: this source tree intentionally omits the native "
            "`sidePanel` manifest permission/entry and uses the BrowserAdapter "
            "sidecar fallback.\n"
        )
        readme.write_text(text, encoding="utf-8")

print(f"Generated {DST}")
