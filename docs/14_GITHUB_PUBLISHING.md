# 14 — GitHub publishing

## Recommended first repository

Start private until the live-runtime behavior and permission model are stable.

Example with GitHub CLI:

```bash
cd AppTowerNext
git init
git add .
git commit -m "Initial App Tower v0.8.5"
git branch -M main
git tag v0.8.5
gh repo create app-tower --private --source=. --remote=origin --push
```

Or create the repository in GitHub UI and add the remote manually.

## What belongs in Git

Commit:
- `app/`
- `variants/`
- `docs/`
- `tools/`
- `.github/`
- `archive/` (historical release ZIPs + checksums/index, ~3 MB)
- `LICENSE`, `CHANGELOG.md`, `README.md`, `AGENTS.md`, `.editorconfig`, `.gitignore`

Do not commit (git-ignored):
- `prompts/` (internal agent prompts)
- `HANDOFF_MANIFEST.sha256` (handoff archive artifact)
- `.pem` (signing keys — never commit or distribute)
- generated `.crx`
- `dist/` (generated release output)
- browser profiles, temporary pack directories
- secrets

Historical ZIPs are only a few MB total. If the project grows,
move binary release artifacts to GitHub Releases and keep only the checksum
index in the main branch.

## Releases

For a future release:
- source changes in `app/`
- tag: `vX.Y.Z`
- attach generated Edge/Chrome and Yandex fallback ZIPs to GitHub Release
- update changelog/status
- do not rewrite historical release files

## Branch policy suggestion

- `main`: tested baseline
- `feature/<name>`: isolated feature
- `fix/<name>`: regression fixes
- release tags: `v1.0.0`, `v1.0.1`, ...

Avoid a long-lived branch per browser; generate/maintain browser variants from
shared source rules whenever possible.
