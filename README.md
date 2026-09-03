# App Tower

> Independent browser extension. App Tower is not affiliated with, endorsed by, sponsored by, or developed by Microsoft, Google, Yandex, or the operators of websites opened through the extension.

App Tower is a Manifest V3 extension for Microsoft Edge and Google Chrome that recreates and extends the idea of a persistent right-side application rail: shortcuts, a native Side Panel where available, two independent web panes, groups/templates, workspaces, PWA/module adapters, resource management and a browser-settings-like control plane.

Microsoft is phasing out the legacy Edge Sidebar app-list experience for some users. App Tower is an independent replacement concept rather than a continuation of that Microsoft feature.

<details><summary>English summary</summary>

A Manifest V3 browser extension for Microsoft Edge and Google Chrome with a persistent app rail, native Side Panel support where available, two independent web panes, groups/templates, workspaces, PWA/module adapters, resource management and a browser-settings-like control plane.

App Tower is independent software and is not affiliated with or endorsed by Microsoft.
</details>

## Features

- **Persistent rail** — vertical shortcut rail for sites, groups and two-pane templates. The collapsed rail remains available even with zero shortcuts.
- **Two independent panes** — upper and lower panes; navigating one must not reload the other.
- **Native Side Panel** — primary container on supported Edge/Chrome builds; sidecar fallback for browsers without the API.
- **Workspaces** — separate shortcut/pane sets bound to browser windows.
- **Groups and templates** — first-class shortcut organization, including two-pane launch templates.
- **PWA / modules** — declarative data-only adapters for provider-specific behavior.
- **Resource management** — idle web panes sleep after 5 minutes; configurable hard cap of at most 6 live web/media pane resources.
- **Optional Browser Sync** — disabled by default.
- **Import / Export** — App Tower configuration can be exported and restored.
- **System / light / dark themes** with optional custom accent.

## Browser targets

Primary targets:

- Microsoft Edge
- Google Chrome

Minimum Chromium version declared by the main build: **116**.

A generated Yandex/Chromium sidecar fallback exists under `variants/yandex-sidecar/`, but identical behavior is not claimed until tested against the actual target browser version.

## Install from source

1. Use the `app/` directory.
2. Open `edge://extensions` or `chrome://extensions`.
3. Enable Developer mode.
4. Choose **Load unpacked** and select `app/`.
5. Click the extension action to open App Tower.

Do not uninstall the unpacked extension just to update it if you want to keep browser-managed extension storage. Replace the files in the same directory and use **Reload** on the extensions page.

## Build and validation

```bash
node tools/validate.mjs
python tools/package.py
```

The package script regenerates the Yandex/Chromium fallback, validates both trees, creates full-replacement ZIPs and writes SHA-256 checksums.

Release packages must never contain private signing keys, `.pem` files, generated `.crx` files, browser profiles or secrets.

## Repository map

```text
app/                         main extension source (Edge/Chrome)
variants/yandex-sidecar/     generated Chromium/Yandex sidecar fallback
archive/releases/            historical source/release archives
archive/release-notes/       historical release notes
archive/RELEASE_INDEX.csv    historical version/platform/SHA-256 index
docs/                        product, architecture, tests, status and roadmap
tools/                       validation and packaging
.github/                     CI and issue/PR templates
AGENTS.md                    engineering rules for coding agents
PRIVACY.md                   public privacy policy
SECURITY.md                  vulnerability reporting policy
CONTRIBUTING.md              contribution guide
SUPPORT.md                   support routes
```

Start with `docs/00_START_HERE.md` and `docs/01_PROJECT_STATUS.md`.

Security and permissions: `docs/08_SECURITY_PRIVACY_PERMISSIONS.md`  
Store submission checklist: `docs/21_STORE_SUBMISSION.md`  
Known issues/live verification queue: `docs/10_KNOWN_ISSUES.md`

## Current release status

The source version is **1.0.0**, but store publication remains **release-candidate / awaiting live verification** until the current P0 browser-runtime queue is completed in real Edge and Chrome.

Static validation is useful but is not proof of runtime behavior. Native Side Panel lifecycle, browser user-activation requirements, third-party iframe behavior and visual rendering must be verified in a real browser before a release is described as production-verified.

## Privacy

App Tower does not operate its own analytics, advertising or telemetry backend. Browser Sync is optional. See [`PRIVACY.md`](PRIVACY.md) for the full policy.

## Distribution

Planned distribution targets:

- Microsoft Edge Add-ons
- Google Chrome Web Store

Store links will be added after approval. The Yandex/Chromium fallback is intended as a sidecar/source distribution rather than a store claim of native parity.

## License

MIT — see [`LICENSE`](LICENSE).

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md). Pull requests should state whether Edge/Chrome runtime behavior was actually tested or only statically validated.
