# 16 — Design history / engineering handoff

This document preserves product decisions and runtime lessons that matter for future development without depending on private conversation history.

## Origin

App Tower began as an independent replacement concept for the retired/retiring Microsoft Edge right-side app-list experience, then expanded beyond parity into a browser workspace layer.

A third-party sidebar extension was inspected only to understand feasible browser-extension architecture. App Tower's codebase and product design remain independent.

## Early product requirements

- right-side rail similar to the old Edge app tower;
- browser/user-resizable Side Panel;
- collapse/expand without permanently covering page content;
- rail remains visible while collapsed;
- preserve usable panel width/state where browser APIs permit;
- split content into independent upper/lower panes;
- active pane follows interaction;
- system theme plus manual override;
- no duplicated/misaligned controls or extra scrollbars;
- Add Current and arbitrary URL;
- import/export and optional browser sync;
- no default shortcut list on fresh install.

## Renderer evolution

Initial Secure / Compatibility / Real Page modes evolved into canonical **Auto**.

Auto should prefer, in order:

1. supported declarative module behavior;
2. PWA-aware app behavior;
3. normal web rendering with scoped compatibility as appropriate.

New/manual navigation scenarios should start in Auto unless the user explicitly overrides the renderer mode.

## Media and modules

A compact Yandex Music player idea exposed a broader requirement: service-specific behavior should not bloat the core for every user.

Decision:

- optional/provider-specific behavior belongs in declarative modules;
- module manifests remain data-only;
- no remote executable JS/WASM module loading;
- the media contract stays provider-neutral;
- play/pause or other transport controls are exposed only when backed by a verified provider integration.

## PWA / Web App direction

PWAs/Web App Manifests are useful metadata and top-level app surfaces for sites that are poor iframe candidates.

Decision:

- discover standard Web App Manifest metadata;
- use manifest metadata/shortcuts where useful;
- do not depend on deprecated Edge-specific PWA sidebar metadata;
- allow a top-level Real Page/PWA sidecar when iframe restrictions make an embedded surface inappropriate.

## Shortcut organization

The rail evolved from a flat list into first-class shortcut entities:

- wheel/touchpad/touch scrolling;
- overflow arrows;
- groups with editable names and initials;
- pointer drag/reorder;
- site-on-site choice between Group and Template;
- two-pane templates;
- default 50% favicon overlap;
- TOP icon above BOTTOM icon;
- adjustable overlap;
- swap top/bottom;
- group/template management visible without relying only on hidden context menus.

## Control plane

As features grew, settings moved from a panel dialog to a dedicated Options page with browser-settings-like left navigation.

Native browser APIs are used where they genuinely provide native UI, such as browser context menus. Extension HTML is browser-styled but must not be described as truly native browser settings UI.

A custom App Tower section cannot be inserted into the browser's internal Settings left navigation through supported public extension APIs.

## Workspace / search / resource management

Current agreed direction:

- App Tower Workspaces bound to browser windows;
- use native browser Workspace identity only if a stable public API becomes available;
- search magnifier at the bottom of the rail;
- App Tower Recent;
- idle web-pane sleep after 5 minutes;
- hard maximum of 6 live web/media resources;
- per-site settings and browser content settings where supported;
- Sidecar Manager for top-level Real Page/PWA windows;
- media shelf/contract;
- module permissions dashboard.

## Browser targets

- Edge and Chrome are primary targets.
- Yandex Browser uses a generated sidecar fallback rather than forcing all behavior through `chrome.sidePanel`.
- Browser-specific container operations belong behind BrowserAdapter.
- Firefox is a possible future adapter, not a current supported target.

## Runtime lessons that must remain regression tests

1. A runtime Port disconnect is not proof that the native Side Panel closed.
2. Browser Side Panel open/close events are authoritative where available.
3. Collapsed and expanded rails must never be simultaneously visible.
4. Mixed font/SVG icon sources cause visibly inconsistent rails; use a shared deterministic icon system.
5. Dialog draft state must not depend on a previous dialog surviving close events.
6. Native favicon/image drag can produce the browser's prohibited-drop cursor; pointer drag must own the gesture.
7. Ordinary workspace writes must not force-reload both pane iframes.
8. `sidePanel.open()` may lose required user activation if asynchronous work happens first.
9. Search result re-rendering during hover/focus can destroy click targets.
10. Generic YouTube iframe behavior is unstable; do not invent arbitrary URL rewrites without evidence.
11. Add Current must distinguish active pane content from the browser tab behind the Side Panel.
12. Collapse/expand must work with zero shortcuts and after browser restart.
13. Third-party anti-bot/CAPTCHA behavior must not be bypassed with compatibility rules.

These lessons belong in acceptance/regression coverage and should not be rediscovered release by release.
