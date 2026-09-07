# Security Policy

## Supported versions

Security fixes are provided for the current release line and, when necessary, the immediately preceding release while users are migrating.

| Version | Supported |
|---|---|
| 1.x | Yes |
| 0.x | Best effort / development history |

## Reporting a vulnerability

Please do **not** open a public GitHub issue for a vulnerability that could expose user data, credentials, browser permissions, or enable arbitrary code execution.

Report security issues privately by email to `m.stoliarov@outlook.com` with:

- affected App Tower version;
- browser and browser version;
- reproduction steps or proof of concept;
- expected security impact;
- any suggested mitigation.

Please allow reasonable time for investigation and remediation before public disclosure.

## Security design notes

App Tower is a Manifest V3 extension with broad `http://*/*` and `https://*/*` host access because the product provides an always-available rail and user-selected embedded web panes. The permission model and design constraints are documented in [`docs/08_SECURITY_PRIVACY_PERMISSIONS.md`](docs/08_SECURITY_PRIVACY_PERMISSIONS.md).

Important invariants include:

- no remote executable JavaScript or WASM modules;
- no `eval`-based module loading;
- no deliberate CAPTCHA, anti-bot, DRM or authentication bypass;
- compatibility networking rules must be scoped to selected sites;
- private signing keys (`.pem`) and generated `.crx` files must never be committed or distributed through source packages.
