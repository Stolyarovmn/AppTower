# Tools

No npm dependencies are required.

## Validate

```bash
node tools/validate.mjs
```

Checks:
- all JSON parses
- every JS file passes `node --check`
- local ES-module imports exist
- manifest resources exist
- DOM IDs referenced by sidepanel/options/newtab JS exist
- no duplicate IDs
- no `.pem`/`.crx` in source
- Yandex fallback omits native Side Panel manifest dependency
- source/variant version consistency

This is static validation, not a substitute for a real Edge runtime test.

## Generate Yandex fallback

```bash
python tools/make_yandex_variant.py
```

The script recreates `variants/yandex-sidecar/` from `app/` and removes the
native `sidePanel` manifest dependency.

## Package

```bash
python tools/package.py
```

Output:
- `dist/AppTower-vX.Y.Z.zip`
- `dist/AppTower-vX.Y.Z-yandex-sidecar.zip`
- `dist/CHECKSUMS.sha256`

All ZIPs are full replacement packages.
