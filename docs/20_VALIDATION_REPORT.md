# 20 — Validation status

This document records what the repository's automated validation can and cannot prove. Exact package checksums belong to generated `dist/CHECKSUMS.sha256`, CI artifacts and release assets rather than a hand-maintained Markdown snapshot.

## Automated validation

Run:

```bash
node tools/validate.mjs
python tools/package.py
```

The validator checks, for both the main source tree and generated fallback where applicable:

- JSON syntax;
- JavaScript parse/syntax via Node;
- local ES-module paths;
- manifest resource paths;
- manifest description store-length constraint;
- DOM ID references for sidepanel/options/newtab;
- Yandex fallback manifest shape;
- version consistency between main and fallback manifests;
- absence of `.pem` / `.crx` signing artifacts in source trees.

The package script:

1. validates source;
2. regenerates `variants/yandex-sidecar/` from `app/`;
3. validates again;
4. creates full-replacement ZIPs under `dist/`;
5. writes SHA-256 checksums to `dist/CHECKSUMS.sha256`.

## What automated validation does not prove

Static validation and successful packaging do **not** prove browser runtime behavior.

The following still require real Edge/Chrome testing:

- Side Panel open/close lifecycle;
- collapse/expand and restart recovery;
- Chromium user-activation requirements;
- Add Current behavior against real browser focus state;
- third-party iframe/auth/anti-bot behavior;
- drag/drop interaction;
- visual rendering, DPI scaling and icon alignment;
- long-running resource sleep/reload behavior.

The current blocking runtime queue is maintained in `docs/10_KNOWN_ISSUES.md` and `docs/09_ACCEPTANCE_CRITERIA.md`.

## Release rule

Do not mark a release as runtime-verified solely because CI is green. A release may be described as **implemented / statically validated / awaiting live verification** until the relevant browser acceptance checks have actually passed.
