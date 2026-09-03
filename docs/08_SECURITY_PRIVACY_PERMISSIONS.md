# 08 — Security, privacy and permissions

## Current broad host access

The extension currently requests:

```text
http://*/*
https://*/*
```

This is required by the current generic iframe/rail/compatibility architecture,
but it is a significant permission surface and should remain visible in project
documentation.

## Manifest permissions

Current main build includes permissions such as:

- sidePanel
- storage
- favicon
- declarativeNetRequestWithHostAccess
- scripting
- declarativeNetRequestFeedback
- windows
- alarms
- contextMenus

Optional:
- contentSettings
- notifications

Any new permission must have a documented feature justification and UI path.

## Compatibility/DNR

Compatibility may modify response headers for scoped target domains to allow
framing.

Rules:
- scope to only domains currently requiring compatibility
- do not globally strip security headers
- do not claim DNR can selectively remove only one directive such as
  `frame-ancestors` from an arbitrary existing CSP
- do not bypass CAPTCHA/anti-bot deliberately

## Module security

Module import is declarative and validated.

Keep these invariants:
- no remote JS
- no eval
- no remote WASM execution
- bounded regex/template inputs
- explicit host scope
- capability display in Permissions Dashboard

## User data

Export/Import should contain App Tower configuration only.

Do not export:
- cookies
- browser passwords
- browsing history outside App Tower's own Recent feature
- authentication tokens

## Notification settings

The browser content setting is per origin. App Tower must rebuild its own
notification rules as a set so returning one site to Default does not erase
other sites' choices.

Module-specific notification categories are only App Tower metadata until a
provider module actually implements category-aware integration.

## Signing

Never commit/share `.pem` private keys.

Generated test `.crx`/`.pem` files must be deleted after packability checks and
must not be included in ZIPs.
