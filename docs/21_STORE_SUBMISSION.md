# 21 — Store submission — Edge Add-ons & Chrome Web Store

Purpose: define exactly what is submitted, how each permission is justified, which privacy text is public, and which runtime limitations must be disclosed.

Current source version: **1.0.0** (`STATE_SCHEMA_VERSION` 15).

> Release state: **store candidate / awaiting live verification**. Do not describe 1.0.0 as production-verified until the P0 runtime queue in `docs/10_KNOWN_ISSUES.md` passes in real Edge/Chrome.

Keep this document synchronized with:

- `app/manifest.json`
- `PRIVACY.md`
- `docs/08_SECURITY_PRIVACY_PERMISSIONS.md`
- `docs/10_KNOWN_ISSUES.md`

## 1. Distribution targets

- **Microsoft Edge Add-ons** — primary target.
- **Google Chrome Web Store** — same main MV3 build.
- **Yandex/Chromium fallback** — generated under `variants/yandex-sidecar/`; not a claim of native Side Panel parity and not part of the Edge/Chrome store package.

## 2. Product identity / independence

Use a visible independence statement in the store listing:

> App Tower is an independent browser extension. It is not affiliated with, endorsed by, sponsored by, or developed by Microsoft.

Do not imply that the extension is the Microsoft Edge feature itself or an official continuation of it.

## 3. Store description

The manifest description must stay within the browser store metadata limit. Current manifest text:

> Persistent side-panel workspace for Edge and Chrome with app rail, dual web panes, workspaces, groups, templates, and sync.

`tools/validate.mjs` enforces the maximum description length used by the Chrome manifest/store pipeline.

## 4. Permission and behavior disclosures

### Universal host access — `http://*/*`, `https://*/*`

The extension has broad host access because its core behavior spans arbitrary user-chosen web sites and because the collapsed rail is injected into normal HTTP(S) pages.

This broad access has two distinct uses:

1. universal content-script behavior for the collapsed rail, embedded-frame bridge and standard Web App Manifest discovery;
2. user-selected embedded web panes and scoped Compatibility/DNR behavior.

Do **not** say that all host access is limited only to pinned sites. The compatibility networking rules are the part that must remain user/site scoped.

### Content scripts

The main build registers content scripts on normal HTTP(S) pages. They provide:

- collapsed App Tower rail;
- embedded-frame state/focus bridge;
- standard Web App Manifest discovery.

Product/privacy policy: these scripts must not intentionally collect or transmit page text, form contents, cookies, passwords or authentication tokens to the developer.

URL/title metadata may be handled for explicit product functions such as Add Current, App Tower Recent, shortcuts and PWA metadata.

### `sidePanel`

Used for the native browser Side Panel container on supported Edge/Chrome builds.

### `storage`

Used for App Tower workspaces, shortcuts, pane state, settings, Recent, modules and optional browser sync metadata.

### `favicon`

Used to resolve/render site favicons for the rail and App Tower UI.

### `declarativeNetRequestWithHostAccess`

Used for Compatibility rendering of user-selected sites that block frame embedding through response headers.

Rules must be scoped to the selected target domains and extension-initiated sub-frame behavior. App Tower does not intentionally bypass CAPTCHA, anti-bot, DRM or authentication protections.

### `scripting`

Used for catch-up injection of App Tower's **local bundled files** into already-open HTTP(S) tabs when startup/enable/update timing means static content scripts did not yet run there.

Do not describe this as remote-code execution. App Tower does not download executable provider modules.

### `windows`

Used for managed Real Page/PWA/sidecar fallback windows where a top-level page is required.

### `alarms`

Used for resource lease housekeeping, including idle-pane sleep policy.

### `contextMenus`

Used for browser-native App Tower context-menu actions.

### Optional `contentSettings`

Requested only from an explicit settings action when App Tower needs to manage supported per-origin browser content settings such as notification allow/block/default behavior.

The extension-level optional `notifications` permission is **not** requested by the current audited manifest because App Tower does not have a confirmed runtime feature that creates extension notifications.

### Removed permission — `declarativeNetRequestFeedback`

The audited store-candidate source did not have a confirmed runtime dependency on matched-rule feedback APIs, so this permission was removed. Re-add it only with an implemented diagnostic feature and explicit store justification.

## 5. New Tab override

`chrome_url_overrides.newtab` replaces the browser New Tab page with the App Tower launch page.

This must be visible in the store listing, not buried only in the manifest/permission documentation. Users must understand that installing/enabling the extension changes the New Tab experience and that disabling/removing the extension reverts that extension override.

Suggested store-listing wording:

> App Tower can replace the browser New Tab page with its launch surface so the rail is available from new tabs. This behavior is part of the extension and can be reverted by disabling or removing App Tower.

## 6. Browser Sync

Browser Sync is optional and disabled by default.

When enabled, App Tower may sync browser-managed extension data such as:

- workspace names;
- shortcut/group/template structures;
- selected site URLs and titles;
- module configuration supported by the sync payload.

Do not claim that absolutely nothing leaves the device when Sync is enabled. The browser vendor operates the sync backend; App Tower does not operate its own sync server.

App Tower does not intentionally sync cookies, saved passwords, authentication tokens, page contents or unrelated browser history.

## 7. Public privacy policy

The canonical public privacy policy is the repository-root [`PRIVACY.md`](../PRIVACY.md).

Before store submission it must be available at a **public, stable URL** that reviewers and users can access without repository credentials. A private GitHub repository URL is not sufficient as the final store privacy-policy URL.

Keep the store privacy form consistent with the actual behavior described there.

## 8. Embedded web-pane disclosure

The two App Tower panes embed real third-party websites as cross-origin web content.

They are not extension-privileged pages. Embedded sites cannot use App Tower's `chrome.*` extension APIs, but they remain ordinary web pages that communicate with their own servers and operate under their own privacy policies.

The pane permission policy may allow web capabilities such as autoplay, camera, microphone, clipboard-write, fullscreen, encrypted media, picture-in-picture or web share. Browser permission/security rules still apply.

This must be disclosed because the extension intentionally hosts arbitrary user-selected web content.

## 9. Honest limitations for the listing

State these limitations rather than promising universal iframe compatibility:

- Some sites block embedding, authentication, DRM, OAuth, anti-bot or CAPTCHA flows and cannot reliably operate inside an App Tower iframe.
- App Tower does not intentionally bypass those protections.
- Real Page/PWA/sidecar is the fallback for sites that require a top-level context.
- Generic YouTube pages inside arbitrary iframes are not guaranteed; provider-specific supported paths may be more reliable.
- Cross-origin framed pages may not provide password-manager/autofill behavior identical to normal top-level browsing.
- Native browser Settings navigation cannot be extended with a custom App Tower left-nav entry; App Tower uses its own Options page.

## 10. Suggested store listing structure

### Short summary

Persistent side-panel workspace for Edge and Chrome with an app rail, workspaces, two web panes, groups/templates and optional sync.

### Key features

- persistent shortcut rail;
- two independent panes;
- workspaces;
- groups and two-pane templates;
- PWA/module-aware Auto rendering;
- import/export;
- optional browser sync;
- idle-pane resource management;
- system/light/dark themes.

### Required transparency callouts

- independent/not affiliated with Microsoft;
- changes New Tab behavior;
- broad site access is required for the rail and arbitrary user-selected web panes;
- some third-party sites do not support iframe embedding.

## 11. Visual assets plan

Use screenshots captured from the **actual running release candidate**, not mockups.

Recommended capture set:

1. expanded rail with sites/groups — light theme;
2. expanded rail — dark theme;
3. independent two-pane view;
4. collapsed thin rail with search at bottom;
5. Options page;
6. optional Sync/export screen.

For Microsoft Edge store metadata, treat the square 300×300-style asset as the extension/logo artwork, not as a Chrome-style promotional tile. Maintain store-specific assets according to each dashboard's current requirements.

## 12. Pre-submission checklist

### Source/package

- [ ] `node tools/validate.mjs` passes.
- [ ] `python tools/package.py` succeeds.
- [ ] generated ZIP has `manifest.json` at the package root.
- [ ] `dist/` packages contain no `.pem`, `.crx`, secrets or browser profiles.
- [ ] package SHA-256 recorded from the exact submission artifact.
- [ ] source version is consistent across `manifest.json`, `app/README.md`, `STATUS.json` and release notes.

### Runtime P0

- [ ] Add Current works from an empty workspace.
- [ ] collapse/expand succeeds repeatedly with zero shortcuts.
- [ ] collapse/expand works after browser restart.
- [ ] no duplicate collapsed rail while native Side Panel is open.
- [ ] settings glyph is correct in Edge light/dark at 100% and scaled DPI.
- [ ] search mouse interaction works.
- [ ] Recent -> Open works.
- [ ] group/template drag/drop works.
- [ ] two independent panes do not spontaneously reload together during a 10+ minute observation.

### Store/privacy

- [ ] public stable Privacy Policy URL is live.
- [ ] permission declarations match `app/manifest.json` exactly.
- [ ] broad host/content-script access disclosed accurately.
- [ ] New Tab override disclosed prominently.
- [ ] Browser Sync data handling disclosed accurately.
- [ ] embedded web-content/device-permission behavior disclosed.
- [ ] independence/non-affiliation statement visible.
- [ ] limitations section does not promise unsupported iframe/auth/DRM behavior.

### GitHub/release provenance

- [ ] release tag points to the exact verified source commit.
- [ ] GitHub Release exists for the public release.
- [ ] release assets/checksums match the store-submitted ZIP.
- [ ] `main` protection/ruleset configured before public collaboration.

## 13. Current status

The source is **implemented and statically auditable**, but the project explicitly remains **awaiting live browser verification** for the P0 queue. Store submission should wait for those checks instead of treating version `1.0.0` alone as proof of production readiness.
