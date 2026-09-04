#!/usr/bin/env python3
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import os
import subprocess
import sys
import zipfile

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"


def run(*args, capture=False):
    result = subprocess.run(
        args,
        cwd=ROOT,
        check=True,
        text=True,
        capture_output=capture,
    )
    return result.stdout.strip() if capture else None


def git(*args):
    return run("git", *args, capture=True)


def assert_clean_tracked_tree():
    # CI/user test packages must correspond to one exact Git commit. Untracked
    # files (for example npm's local cache/lock artifacts) are ignored, but no
    # tracked source modification may be smuggled into a ZIP outside Git/CI.
    subprocess.run(["git", "diff", "--quiet", "--", "."], cwd=ROOT, check=True)
    subprocess.run(["git", "diff", "--cached", "--quiet", "--", "."], cwd=ROOT, check=True)


def build_info():
    commit = git("rev-parse", "HEAD")
    branch = (
        os.environ.get("GITHUB_HEAD_REF")
        or os.environ.get("GITHUB_REF_NAME")
        or git("branch", "--show-current")
        or "detached"
    )
    return {
        "product": "App Tower",
        "source_branch": branch,
        "source_commit": commit,
        "dirty_tracked_tree": False,
        "ci_run_id": os.environ.get("GITHUB_RUN_ID"),
        "ci_run_attempt": os.environ.get("GITHUB_RUN_ATTEMPT"),
        "built_at_utc": datetime.now(timezone.utc).isoformat(),
    }


def package_tree(src: Path, out: Path, provenance: dict):
    forbidden = {".pem", ".crx"}
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as zf:
        for file in sorted(src.rglob("*")):
            if not file.is_file():
                continue
            if file.suffix.lower() in forbidden:
                raise RuntimeError(f"Refusing to package signing material: {file}")
            zf.write(file, file.relative_to(src))
        zf.writestr(
            "build-info.json",
            json.dumps(provenance, ensure_ascii=False, indent=2) + "\n",
        )


def verify_provenance(path: Path, expected: dict):
    with zipfile.ZipFile(path) as zf:
        actual = json.loads(zf.read("build-info.json").decode("utf-8"))
    if actual.get("source_commit") != expected["source_commit"]:
        raise RuntimeError(f"Package provenance mismatch: {path.name}")
    if actual.get("dirty_tracked_tree") is not False:
        raise RuntimeError(f"Dirty package provenance: {path.name}")


def sha256(path: Path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


assert_clean_tracked_tree()
provenance = build_info()

run("node", "tools/validate.mjs")
run(sys.executable, "tools/make_yandex_variant.py")
run("node", "tools/validate.mjs")

manifest = json.loads((ROOT / "app" / "manifest.json").read_text(encoding="utf-8"))
version = manifest["version"]
short_sha = provenance["source_commit"][:12]

DIST.mkdir(exist_ok=True)
main_zip = DIST / f"AppTower-v{version}-{short_sha}.zip"
yandex_zip = DIST / f"AppTower-v{version}-{short_sha}-yandex-sidecar.zip"

for path in DIST.glob(f"AppTower-v{version}*.zip"):
    path.unlink()

package_tree(ROOT / "app", main_zip, provenance)
package_tree(ROOT / "variants" / "yandex-sidecar", yandex_zip, provenance)
verify_provenance(main_zip, provenance)
verify_provenance(yandex_zip, provenance)

checks = [
    (sha256(main_zip), main_zip.name),
    (sha256(yandex_zip), yandex_zip.name),
]
(DIST / "CHECKSUMS.sha256").write_text(
    "".join(f"{digest}  {name}\n" for digest, name in checks),
    encoding="utf-8",
)
(DIST / "BUILD_INFO.json").write_text(
    json.dumps(provenance, ensure_ascii=False, indent=2) + "\n",
    encoding="utf-8",
)

print(f"SOURCE {provenance['source_branch']}@{provenance['source_commit']}")
for digest, name in checks:
    print(f"{digest}  {name}")
