"""Build complete unpacked extension ZIP without installed test dependencies."""
import argparse, json, pathlib, zipfile, subprocess
parser = argparse.ArgumentParser()
parser.add_argument('--output', required=True)
args = parser.parse_args()
root = pathlib.Path(__file__).resolve().parents[1]
subprocess.run(['node', str(root / 'tools/check-permissions.mjs')], check=True)
manifest = json.loads((root / 'manifest.json').read_text())
assert 'key' not in manifest
out = pathlib.Path(args.output).resolve()
out.parent.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as archive:
    for file in sorted(root.rglob('*')):
        relative = file.relative_to(root)
        if file.is_file() and not any(p in {'node_modules', '__pycache__', '.git'} or p.startswith('.') for p in relative.parts) and file.resolve() != out:
            archive.write(file, relative.as_posix())
with zipfile.ZipFile(out) as archive:
    assert archive.testzip() is None
    assert 'manifest.json' in archive.namelist()
print(out)
