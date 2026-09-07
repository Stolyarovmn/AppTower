# App Tower v1.0.0

This directory is the main Microsoft Edge / Google Chrome Manifest V3 extension source tree.

> Runtime status: implemented, but the current store candidate still requires the live P0 checks listed in `../docs/10_KNOWN_ISSUES.md` before production/store verification is claimed.

## Architecture summary

- `background.js` — MV3 service worker, workspace/state coordination, Side Panel lifecycle, DNR compatibility rules, Recent, sync and resource leases.
- `sidepanel/` — App Tower UI, two independent panes, rail, groups/templates, search and dialogs.
- `content/` — collapsed rail, embedded-frame bridge and Web App Manifest discovery.
- `shared/` — browser adapter, workspace/shortcut/theme/media helpers.
- `modules/` — declarative data-only provider modules.
- `options/` — browser-settings-like App Tower control plane.
- `newtab/` — App Tower New Tab override.
- `icons/` — extension icons.

## Core product invariants

- Fresh installs have no default shortcuts.
- `Auto` is the canonical/default pane mode.
- Top and bottom panes are independent.
- The collapsed rail must work with zero shortcuts and after browser restart.
- Browser Side Panel open/close events are authoritative where supported.
- Provider integrations remain declarative/data-only; no remote executable JS/WASM.
- Idle web panes sleep after 5 minutes; the hard live-resource cap is at most 6.
- Sites that block iframe embedding, anti-bot, DRM, OAuth or CAPTCHA are not promised to work in-pane; Real Page/PWA sidecar is the fallback.

See `../AGENTS.md`, `../docs/03_ARCHITECTURE.md`, `../docs/09_ACCEPTANCE_CRITERIA.md` and `../docs/11_DECISIONS.md` for the detailed engineering rules.

## Local development

Load this `app/` directory as an unpacked extension in Edge/Chrome Developer mode.

To update an unpacked installation while preserving browser-managed extension storage:

1. keep the same unpacked directory;
2. replace its contents with the new full source tree;
3. press **Reload** in the browser extensions page;
4. reload already-open HTTP(S) tabs when content-script changes need reinjection.

Do not uninstall merely to update unless you intentionally want browser-managed extension data removed.

## Validation and packaging

Run from repository root:

```bash
node tools/validate.mjs
python tools/package.py
```

`tools/package.py` regenerates `variants/yandex-sidecar/`, validates both source trees and creates full replacement ZIPs in `dist/` with SHA-256 checksums.

## Release history

Do not duplicate release history in this file. Use:

- `../CHANGELOG.md` for current release notes;
- `../archive/release-notes/` for historical notes;
- `../archive/releases/` and `../archive/RELEASE_INDEX.csv` for historical source packages/checksums.

## Privacy and permissions

Public privacy policy: `../PRIVACY.md`  
Security/permission design: `../docs/08_SECURITY_PRIVACY_PERMISSIONS.md`  
Store submission checklist: `../docs/21_STORE_SUBMISSION.md`

App Tower is independent software and is not affiliated with or endorsed by Microsoft, Google, Yandex, or the operators of websites opened through it.
