# Contributing to App Tower

Thanks for helping improve App Tower.

## Before changing code

Read:

1. `AGENTS.md`
2. `docs/01_PROJECT_STATUS.md`
3. `docs/02_PRODUCT_SPEC.md`
4. `docs/03_ARCHITECTURE.md`
5. `docs/09_ACCEPTANCE_CRITERIA.md`
6. `docs/10_KNOWN_ISSUES.md`
7. `docs/11_DECISIONS.md`

Product source lives in `app/`. The Yandex/Chromium fallback under `variants/yandex-sidecar/` is generated from the shared source and should remain consistent with it.

## Branches

Use short-lived branches such as:

- `feature/<name>`
- `fix/<name>`
- `chore/<name>`

`main` is intended to remain the tested baseline.

## Pull requests

A pull request should explain:

- what changed;
- the root cause or design reason;
- regression scenarios covered;
- browser/API caveats;
- whether Edge and Chrome runtime behavior was actually tested.

Do not claim runtime verification when only static checks were run.

## Validation

Before opening a pull request, run:

```bash
node tools/validate.mjs
python tools/package.py
```

For user-visible behavior, also run the relevant live tests from `docs/09_ACCEPTANCE_CRITERIA.md` and the current queue in `docs/10_KNOWN_ISSUES.md`.

## Release and security rules

- Ship full replacement packages, not overlay archives.
- Never commit or distribute `.pem` private signing keys, `.crx` files, secrets or browser profiles.
- Provider integrations must remain declarative/data-only unless a separate architecture decision explicitly changes that rule.
- Do not weaken site security globally to make an iframe work.
- Do not bypass CAPTCHA, anti-bot, DRM or authentication protections.

For suspected vulnerabilities, follow `SECURITY.md` instead of opening a public issue.
