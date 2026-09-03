# 05 — Browser compatibility and hard platform limits

## Edge

Primary target.

Preferred container: native extension Side Panel.

Important:
- Side Panel open/close behavior differs across Chromium/Edge versions.
- Treat real runtime behavior as authoritative.
- `sidePanel.open()` can require direct user activation.
- Browser-owned Side Panel X cannot be restyled/replaced by the extension.
- Browser internal pages cannot receive normal HTTP(S) content scripts.

## Chrome

Primary target alongside Edge.

Manifest minimum currently declares Chrome 116.

The architecture should use the same core as Edge and isolate browser
differences in BrowserAdapter/UI skin.

## Yandex Browser

Secondary/experimental.

A dedicated source/package removes the `sidePanel` manifest dependency and uses
a managed top-level sidecar fallback.

Do not claim parity until tested against the actual target Yandex version.
Some Chromium APIs may exist while others differ.

## Firefox

Future adapter only. No current build.

## Native browser Workspaces

App Tower currently binds an App Tower Workspace to the browser window/session.
Do not claim integration with native Edge/Chrome/Yandex Workspaces without a
stable public extension API that exposes the necessary workspace identity and
events.

## Browser settings

Extensions cannot add an arbitrary App Tower item to the left side of
`edge://settings`/`chrome://settings`. The supported design is an
`options_ui` page styled similarly to browser settings.

## New Tab

Normal content scripts cannot inject into privileged native New Tab. App Tower
currently uses `chrome_url_overrides.newtab`, which intentionally replaces the
native NTP.

If native NTP is desired later, ship a variant without that manifest override;
it cannot be toggled dynamically by ordinary runtime settings.

## iframe limits

Even with compatibility header removal, the following may still fail:

- third-party cookie/auth assumptions
- OAuth flows/popups
- anti-bot / CAPTCHA
- site-specific Origin checks
- CSP `connect-src`
- Permissions Policy
- DRM / EME
- password manager/autofill in cross-origin iframe
- application layout that is not responsive

For password-manager/auth parity, top-level Real Page/PWA sidecar is the safer
mode.

## Responsive behavior

The iframe already receives the pane width. Arbitrary desktop-only sites cannot
be universally forced responsive by the extension. Preferred future direction:
verified mobile-site/provider adapters, not a fake scaled virtual viewport.
