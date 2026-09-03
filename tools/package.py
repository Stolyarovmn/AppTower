#!/usr/bin/env python3
from pathlib import Path
import hashlib
import json
import subprocess
import sys
import zipfile

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"

def run(*args):
    subprocess.run(args, cwd=ROOT, check=True)

def package_tree(src: Path, out: Path):
    forbidden = {".pem", ".crx"}
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as zf:
        for file in sorted(src.rglob("*")):
            if not file.is_file():
                continue
            if file.suffix.lower() in forbidden:
                raise RuntimeError(f"Refusing to package signing material: {file}")
            zf.write(file, file.relative_to(src))

def sha256(path: Path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

run("node", "tools/validate.mjs")
run(sys.executable, "tools/make_yandex_variant.py")
run("node", "tools/validate.mjs")

manifest = json.loads((ROOT / "app" / "manifest.json").read_text(encoding="utf-8"))
version = manifest["version"]

DIST.mkdir(exist_ok=True)
main_zip = DIST / f"AppTowerNext-v{version}.zip"
yandex_zip = DIST / f"AppTowerNext-v{version}-yandex-sidecar.zip"

for path in [main_zip, yandex_zip]:
    if path.exists():
        path.unlink()

package_tree(ROOT / "app", main_zip)
package_tree(ROOT / "variants" / "yandex-sidecar", yandex_zip)

checks = [
    (sha256(main_zip), main_zip.name),
    (sha256(yandex_zip), yandex_zip.name),
]
(DIST / "CHECKSUMS.sha256").write_text(
    "".join(f"{digest}  {name}\n" for digest, name in checks),
    encoding="utf-8",
)

for digest, name in checks:
    print(f"{digest}  {name}")
