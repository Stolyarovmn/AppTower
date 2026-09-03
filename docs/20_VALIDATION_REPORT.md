# 20 — Validation report

Generated for the GitHub/Codex handoff on 2026-09-02.

## Static source validation

```text
app: JSON 4, JS 13, manifest/DOM/import checks OK
variants/yandex-sidecar: JSON 4, JS 13, manifest/DOM/import checks OK
App Tower Next validation: OK
```

Exit code: `0`

## Packaging validation

`python tools/package.py` was executed successfully before this report and
generated current full-replacement packages under `dist/`.

Current generated package checksums:

```text
3a7860d673a1dc3189ec02b77bdb98d50ccd6dec0605dd8531cc97860684340d  AppTowerNext-v0.8.5.zip
7c3dcfab7d5e460121a07dd80df70325214dcde17f5f04818c586272c6916bc8  AppTowerNext-v0.8.5-yandex-sidecar.zip
```

## What this validates

- JSON syntax
- JavaScript parse/syntax via Node
- local ES-module paths
- manifest resource paths
- DOM ID references for sidepanel/options/newtab
- Yandex fallback manifest shape
- absence of PEM/CRX in source
- package generation

## What this does NOT validate

No live Microsoft Edge/Chrome GUI is available in this build environment.
Therefore Side Panel lifecycle, user-gesture behavior, third-party iframe
behavior and visual rendering still require the live acceptance tests in
`docs/09_ACCEPTANCE_CRITERIA.md`.

The current P0 live-verification queue is in `docs/10_KNOWN_ISSUES.md`.
