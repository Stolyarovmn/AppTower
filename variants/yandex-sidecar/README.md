# App Tower v1.0.0

This directory is the generated Chromium/Yandex sidecar fallback variant derived from the main `app/` source tree.

> Variant note: this source tree intentionally omits the native `sidePanel` manifest permission/entry and uses the BrowserAdapter sidecar fallback.

> Runtime status: implemented, but browser parity is not claimed until tested against the actual target Yandex/Chromium browser version.

## Architecture summary

- `background.js` — MV3 service worker, workspace/state coordination, fallback window lifecycle, DNR compatibility rules, Recent, sync and resource leases.
- `sidepanel/` — App Tower UI reused inside the managed sidecar container.
- `content/` — collapsed rail, embedded-frame bridge and Web App Manifest discovery.
- `shared/` — browser adapter, workspace/shortcut/theme/media helpers.
- `modules/` — declarative data-only provider modules.
- `options/` — App Tower control plane.
- `newtab/` — App Tower New Tab override.

## Generated-source rule

Do not develop this variant as an independent browser fork.

The authoritative product source is `../../app/`. Regenerate this directory with:

```bash
python tools/make_yandex_variant.py
```

The generator copies the main source tree and removes the native Side Panel manifest permission/entry while retaining BrowserAdapter fallback behavior.

## Validation and packaging

Run from repository root:

```bash
node tools/validate.mjs
python tools/package.py
```

The packaging flow regenerates this variant before producing release ZIPs and checks version/manifest consistency.

## Product invariants

- Fresh installs have no default shortcuts.
- `Auto` is the canonical/default pane mode.
- Top and bottom panes are independent.
- Provider integrations remain declarative/data-only.
- Idle web panes sleep after 5 minutes; the hard live-resource cap is at most 6.
- Sites that block iframe/auth/DRM/anti-bot flows are not promised to work in-pane; Real Page/sidecar behavior is the fallback.

## Browser status

The fallback exists so Chromium-family browsers without a usable `chrome.sidePanel` API are not forced through the native Side Panel path.

It does **not** mean that App Tower claims identical behavior on Yandex Browser or every Chromium fork. Compatibility must be verified against the actual target browser/version.

## Release history and policy

Use the repository root `CHANGELOG.md` and `archive/` for history instead of duplicating release notes here.

Public privacy policy: `../../PRIVACY.md`  
Security/permission design: `../../docs/08_SECURITY_PRIVACY_PERMISSIONS.md`

App Tower is independent software and is not affiliated with or endorsed by Microsoft, Google, Yandex, or the operators of websites opened through it.
