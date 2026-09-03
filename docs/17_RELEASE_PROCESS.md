# 17 — Release process

## Versioning

Current version: `0.8.5`.

Until 1.0, use:
- patch: bug/regression fixes
- minor: new architecture/product capability
- major: reserved for stable public milestone

## Full replacement rule

User explicitly requested full replacement builds.

Do not ship a partial overlay archive.

A release ZIP must contain the whole extension tree with `manifest.json` at ZIP
root.

## Build flow

1. edit `app/`
2. bump manifest version
3. update migration schema if necessary
4. update release notes/docs
5. run validator
6. generate Yandex fallback variant
7. package both variants
8. compute SHA-256
9. live test
10. only then mark behavior verified

Commands:

```bash
node tools/validate.mjs
python tools/make_yandex_variant.py
python tools/package.py
```

## Packaging exclusions

Never include:
- `.git/`
- `.pem`
- `.crx`
- temporary browser profile
- test output
- secrets

## Unpacked update instructions

To preserve extension storage:
- keep the same loaded unpacked directory identity
- remove old contents
- copy the new complete extension contents into that directory
- browser extensions page -> Reload
- reload existing HTTP(S) tabs

Do not uninstall merely to update.

## Historical archives

`archive/releases/` is immutable. Add new ZIPs; do not replace old files.
Update `archive/RELEASE_INDEX.csv` and `archive/CHECKSUMS.sha256`.
