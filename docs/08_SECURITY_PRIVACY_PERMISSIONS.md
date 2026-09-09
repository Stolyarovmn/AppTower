# 08 — Security, privacy and permissions

## Current broad host access

The main extension requests:

```text
http://*/*
https://*/*
```

This is a significant permission surface and must remain explicitly documented.

It is currently required for two distinct product paths:

1. the always-available collapsed rail and Web App Manifest discovery on ordinary HTTP(S) pages;
2. user-selected embedded web panes and their scoped Compatibility/DNR behavior.

Do not describe the universal content-script access as if it applied only to pinned sites. The **DNR compatibility rules** are the part that must remain scoped to sites selected by the user.

## Manifest permissions

Current main build permissions:

- `sidePanel`
- `storage`
- `favicon`
- `declarativeNetRequestWithHostAccess`
- `scripting`
- `windows`
- `alarms`
- `contextMenus`

Optional:

- `contentSettings`

Permissions must remain feature-driven and minimal. A permission that is no longer used by product code must be removed rather than retained for possible future work.

`declarativeNetRequestFeedback` and optional `notifications` were removed from the store-candidate manifest because the audited source did not have a confirmed runtime use for those APIs. Re-add them only together with an implemented feature and a documented justification.

## Compatibility / DNR

Compatibility may modify frame-embedding response headers for selected target domains.

Rules:

- scope rules to domains selected for Compatibility rendering;
- scope extension DNR rules to the extension's own sub-frame requests where possible;
- do not globally strip security headers;
- do not claim DNR can surgically remove only one directive such as `frame-ancestors` from an arbitrary existing CSP;
- do not deliberately bypass CAPTCHA, anti-bot, DRM or authentication protections.

## Content scripts and page data

Content scripts run on normal HTTP(S) pages to render the collapsed rail, provide the embedded-frame bridge and discover standard Web App Manifest metadata.

Product policy:

- do not intentionally collect or transmit page text or form contents;
- do not read/export cookies, saved passwords or authentication tokens;
- only capture URL/title metadata needed for user-requested Add Current, App Tower Recent, shortcut/PWA metadata and related local features;
- do not add telemetry/analytics without a new explicit privacy decision and store disclosure.

## Module security

Module import is declarative and validated.

Keep these invariants:

- no remote executable JavaScript;
- no `eval`-based module loading;
- no remote WASM execution;
- bounded regex/template inputs;
- explicit host scope;
- capability display in the Permissions Dashboard.

## User data

Export/Import should contain App Tower configuration only.

Do not export:

- cookies;
- browser passwords;
- authentication tokens;
- form data;
- browsing history outside App Tower's own Recent feature.

Browser Sync is optional. When enabled it may contain App Tower workspace/shortcut metadata including selected site URLs and titles. Browser Sync is operated by the browser vendor, not by an App Tower server.

The public policy is `../PRIVACY.md`; keep it synchronized with actual behavior.

## Notification settings

App Tower can manage the browser's per-origin notification content setting through optional `contentSettings` permission. This controls whether a site is allowed/block/default at the browser content-setting layer; it does not require App Tower itself to request the extension `notifications` permission.

Module-specific notification categories are App Tower metadata until a provider module implements a documented provider-side integration.

## Embedded-site permission policy

Web panes are real cross-origin web content and are not extension-privileged documents. If a pane grants a web-platform permission policy such as camera, microphone, autoplay, fullscreen or clipboard-write, that lets the embedded site request/use that web capability subject to browser rules; it does not grant access to App Tower's `chrome.*` extension APIs.

This risk surface must be disclosed in the public privacy/store text.

## Signing and release artifacts

Never commit/share `.pem` private signing keys.

Generated test `.crx`/`.pem` files must be deleted after packability checks and must not be included in ZIPs. Public source/release packages must also exclude browser profiles, secrets and temporary development artifacts.
