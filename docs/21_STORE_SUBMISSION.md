# 21 — Store submission (Edge Add-ons & Chrome Web Store)

Purpose: what to submit, how to justify each permission, the privacy policy to
publish, and the honest limitations to state. Keep this in sync with
`docs/08_SECURITY_PRIVACY_PERMISSIONS.md` and `app/manifest.json`.

Current build: **v0.8.5** (`STATE_SCHEMA_VERSION` 15).

## 1. Distribution targets
- **Microsoft Edge Add-ons** — primary (native Side Panel support).
- **Google Chrome Web Store** — same MV3 build.
- **Yandex fallback** (`variants/yandex-sidecar/`) — NOT submitted to a store;
  distributed as source/sidecar for Chromium-based browsers without a Side Panel.

## 2. What reviewers will ask (and the answers)

### Broad host permissions `http://*/* https://*/*`
The product is a two-pane browser: it embeds the sites the user pins into
iframes inside the Side Panel / tower container, and injects the always-available
rail into pages. Host access is required so the `<iframe>` can load the chosen
sites and so the DNR compatibility rules (below) can be applied. It is used only
for the sites the user explicitly pins/opens.

### Content scripts on all `http/https` pages
Three content scripts (`rail.js`, `embedded-frame.js`, `pwa-discovery.js`; two
run in all frames) are registered on all `http/https` pages. They provide the
collapsed rail (available with zero shortcuts — a core product invariant), the
embedded-frame behavior, and local Web App Manifest detection. They render UI
and report manifest metadata to the extension. They do **not** read, store, or
transmit page content, form data, cookies, or browsing history.

### `scripting`
Used only to inject `rail.css`, `rail.js` and `pwa-discovery.js` (all frames)
into **tabs already open** before the static content scripts ran — a catch-up so
a freshly-opened tab is not missing the rail. Injects **local files only**
(`content/rail.css`, `content/rail.js`, `content/pwa-discovery.js`); it reads,
stores, and transmits no page content. Called from `injectIntoOpenTabs()` at
startup/enable/update (`background.js`). This complements — does not replace —
the universal content-script registration above.

### Web view panes: not sandboxed, broad device-permission policy

The two web-view panes (`sidepanel.html`) embed the sites you pin as `<iframe>`
elements that are **not sandboxed** (no `sandbox` attribute). Embedding a real
website requires its own scripts to run, so each frame runs as a fully
privileged cross-origin document — the same as opening that site in a normal
tab. Each frame declares an `allow` permission policy:

`accelerometer; autoplay; camera; clipboard-write; encrypted-media; fullscreen; gyroscope; microphone; picture-in-picture; web-share`

What this means:
- An embedded site can **request** camera, microphone, clipboard writes,
  fullscreen, autoplay and the other listed domains; the browser's own
  permission prompts still apply at the device level — App Tower does not
  auto-grant them.
- An embedded site is **cross-origin** and **cannot** access the extension's
  `chrome.*` APIs or its host permissions. The `allow` policy governs only
  standard web Platform permission domains (camera/mic/clipboard/…), never
  extension APIs — there is no privilege escalation from a pinned page into the
  extension.
- You explicitly choose every site that is embedded; nothing loads without your
  action, and removing a site removes its frame.
- This is the inherent risk surface of embedding real websites (identical to
  opening the site in a normal browser tab). App Tower neither adds nor removes
  it; it is disclosed here.

### `declarativeNetRequestWithHostAccess` (DNR)
Removes `x-frame-options` / `content-security-policy` (frame-embedding) response
headers **only** for the specific domains the user pins, **only** for requests
initiated by the extension's own frames (`initiatorDomains: [chrome.runtime.id]`,
`resourceTypes: ["sub_frame"]`), as **session** rules (max 100). It is not a
global header stripper and does not modify traffic to any site the user has not
pinned.

### `chrome_url_overrides.newtab`
Replaces the new-tab page with the App Tower launch page. The user can revert
this in browser settings / Options.

### Optional permissions `contentSettings` / `notifications`
Requested only on explicit user action in Options, to enable per-site media
(autoplay) control and notifications. Not required for core function.

### Suggested search hotkey
The `manifest` declares `commands.open-search` with `suggested_key`
Ctrl+Shift+Space (mac: Command+Shift+Space). This is a standard, user-disableable
browser command (`chrome://extensions/shortcuts`) — not a permission and not a
broad-injection surface. It does not conflict with the "no default shortcuts on
a fresh install" invariant (which refers to site/rail activation shortcuts,
empty by default).

## 3. Privacy policy (publish this text)

> **Privacy — App Tower Next**
>
> App Tower Next is a local browser extension. It organizes the sites you choose
> into a persistent rail and two independent web panes.
>
> **What we collect: nothing that leaves your device automatically.** The
> extension stores your configuration (workspaces, rail shortcuts, site list,
> group/template layout, themes, module choices) in your browser's local
> storage. There is no account, no analytics, no telemetry, no advertising, and
> no third-party data sharing.
>
> **Network requests:**
> - When you open a site, the extension may fetch **that site's own Web App
>   Manifest** (name/icons) to render it as a PWA. The request sends no personal
>   data.
> - Favicon images are loaded from the site's own origin for the rail icons.
> - When you enable **Sync** (off by default), your workspace names and site
>   list (URLs and titles) are stored in your browser's **sync storage**,
>   associated with your signed-in browser account, so they follow you across
>   devices. Cookies, passwords, history, and page content are **never** synced.
>
> **Content scripts** on web pages render the rail and detect PWA manifests;
> they do not read or send page content, form data, or browsing history.
>
> **Web content.** The two web views load the sites you explicitly pin. Those
> sites run as ordinary web content in the browser, governed by their own
> privacy policies; App Tower does not read or transmit their content. The web
> views are not sandboxed and are opted into a device-permission policy (camera,
> microphone, clipboard, fullscreen, autoplay, etc.) so embedded sites behave as
> they would in a normal tab — the browser's standard permission prompts still
> apply, and an embedded site cannot access the extension's own APIs or host
> permissions.
>
> **You control everything:** you can export your data as JSON at any time and
> remove the extension (which removes all stored data).
>
> Questions / data requests: `<your-contact-email>`

## 4. Permissions table (paste into the store form)

| Permission | Why |
|---|---|
| `sidePanel` | Native Side Panel host (Edge/Chrome 116+). |
| `storage` | Persist workspaces, shortcuts, settings locally (and optional sync). |
| `favicon` | Resolve site favicons for rail icons. |
| `declarativeNetRequestWithHostAccess` | Scoped removal of frame-embedding headers for pinned sites only. |
| `declarativeNetRequestFeedback` | Observe which compatibility rules fire (local diagnostics). |
| `scripting` | Catch-up rail / PWA detection injection into already-open http/https tabs (local files only). |
| `windows` | Create the tower container / sidecar fallback window. |
| `alarms` | Periodic resource-lease housekeeping (idle pane sleep). |
| `contextMenus` | Right-click actions on the rail / sites. |
| `http://*/* https://*/*` | Load pinned sites in iframes and apply scoped DNR rules. |
| Optional `contentSettings` | Per-site autoplay/media control (user opt-in). |
| Optional `notifications` | User-triggered notifications (opt-in). |
| `chrome_url_overrides.newtab` | Replace the new-tab page with the App Tower launch page. |

## 5. Honest limitations (state in the listing)
- Some sites that actively block embedding (anti-bot, DRM, OAuth, CAPTCHA) cannot
  be shown inside the two-pane iframes; App Tower does not bypass these. The
  "Real Page / PWA sidecar" mode opens such sites in a full tab instead.
- **Embedded-site device permissions.** The web-view iframes are not sandboxed
  and carry a broad `allow` policy (camera, microphone, clipboard-write,
  fullscreen, autoplay, etc.). A pinned site can request these; the browser's
  standard prompts apply. This is inherent to embedding real websites (equivalent
  to a normal tab). An embedded site cannot access the extension's APIs or host
  permissions.
- Generic YouTube playback inside an iframe is unreliable; the YouTube module
  uses a PWA/real-page path where needed.
- Native browser settings pages cannot be modified; configuration lives in the
  extension Options page.

## 6. Screenshot plan
- **Edge Add-ons:** 300×300 promo + detail shots.
- **Chrome Web Store:** 1280×800 × 3 + promo images.
- Capture from the **running build** (real behavior), no mockups:
  1. Rail expanded with sites + groups (light theme).
  2. Rail expanded (dark theme).
  3. Two-pane view: top + bottom independent panes with two sites.
  4. Collapsed rail (thin) with the search icon at the bottom.
  5. Options page (settings control plane).
  6. (Optional) Sync enabled / export dialog.

## 7. Pre-submission checklist
- [ ] `node tools/validate.mjs` passes.
- [ ] `python tools/package.py` produces clean ZIPs; `dist/` contains no
      `.pem` / `.crx` / secrets.
- [ ] `*.pem`, `*.crx`, secrets are git-ignored (never committed).
- [ ] Privacy policy (Section 3) published and linked in the store form.
- [ ] All Section 4 disclosures filled into the store permission form.
- [ ] P0 live-verification queue (`docs/10`) passed in a real Edge/Chrome:
      add-page-from-empty-workspace; collapse/expand ×5 + restart (0 sites
      lost); settings glyph light/dark @100%/150%.
- [ ] Version matches `manifest.json`, `app/README.md`, `STATUS.json` (0.8.5).
- [ ] Edge and Yandex/Chrome variant kept consistent (`tools/make_yandex_variant.py`).

> Status: Edge/Chrome runtime behavior is **implemented; awaiting live
> verification** until the P0 queue above is run in a real browser.
