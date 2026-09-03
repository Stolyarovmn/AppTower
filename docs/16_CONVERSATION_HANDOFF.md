# 16 — Conversation / design handoff

This is the curated product history needed to continue work without replaying
the whole chat.

## Origin

The project started because the old Microsoft Edge right sidebar/App Tower was
removed/retired. The goal became a replacement extension that feels native but
adds capabilities the old sidebar did not have.

An existing third-party extension ("Classic Sidebar") was inspected only to
understand the feasible architecture: native extension Side Panel containing
extension HTML, with external sites framed inside and a compatibility DNR
approach. Its code was not to be copied/distributed.

## Early requirements

- right-side rail similar to old Edge App Tower
- panel manually resizable by browser/user
- collapse/expand without covering page content
- rail remains visible in collapsed state
- preserve width when possible
- split content horizontally into upper/lower panes
- panes independent
- active pane follows interaction
- system theme/manual override
- no duplicated/misaligned controls
- no extra scrollbars
- add current page
- arbitrary URL
- import/export
- sync
- no default shortcut list

## Renderer evolution

Initial Secure/Compatibility/Real Page modes evolved into canonical **Auto**.

Auto:
1. optional module renderer
2. PWA-aware app behavior
3. normal web + scoped compatibility

User specifically wanted every new/manual scenario to begin as Auto, rather
than silently persisting Secure/Compatibility.

## Media

Yandex Music initially motivated a compact media adapter. The requirement
expanded from one track to album/playlist/favorites/general provider support.
This led to the decision that provider logic should be optional modules so users
do not carry Yandex/Spotify/etc code they never use.

Current architecture therefore has declarative modules and a future Module Store
idea.

## PWA discussion

Installable web apps/PWAs were considered because they are often better suited
to narrow app-like surfaces.

Decision:
- discover standard Web App Manifest
- use its metadata/shortcuts
- do not depend on deprecated Edge-specific PWA sidebar metadata
- optionally launch top-level app-like sidecar to escape iframe restrictions

## Shortcut organization

Requirements grew beyond a flat rail:

- wheel/touchpad/touch scrolling
- up/down overflow arrows
- groups with editable names and initials icon
- pointer drag/drop
- site on site asks Group or Template
- two-pane templates with 50% default favicon overlap
- TOP icon above BOTTOM icon
- overlap adjustable
- swap top/bottom
- group/template management accessible without discovering hidden context menus

## Control plane

As features grew, settings moved from a panel dialog to a dedicated Options
Page with left navigation.

The user wanted it to feel as native as possible. Browser APIs are used for
real native context-menu actions, while in-extension menus are styled for the
browser. Injecting a custom App Tower section into the browser's own Settings
left navigation is not supported.

## Workspace/search/performance phase

Agreed directions:

- App Tower Workspaces
- possible browser-native workspace binding if a public API exists
- search magnifier at bottom
- Recent
- session snapshots deferred as "too early"
- mandatory sleep after 5 minutes
- hard maximum 6 live web/media resources
- site notifications and settings
- per-site configuration
- dynamic/linked template idea to develop later
- Sidecar Manager
- media shelf/contract
- module permissions dashboard

## Browser targets

- Edge and Chrome are primary.
- Yandex Browser should have a fallback rather than forcing all features through
  `chrome.sidePanel`.
- BrowserAdapter introduced to isolate container behavior.
- Firefox may come later.

## Important runtime lessons from user testing

1. Collapsed and expanded rails were simultaneously visible because Port
   disconnect was wrongly treated as Side Panel close.
2. Different font/SVG icon sources caused visually different rails.
3. Group/template dialogs lost state when a previous dialog closed.
4. Native favicon drag produced the browser's prohibited-drop cursor.
5. Workspace changes caused forced iframe reloads of both panes.
6. `sidePanel.open()` after async work loses user activation in some paths.
7. Search re-render-on-hover destroyed the clickable result before click.
8. Generic YouTube iframe behavior is unstable and should not be "fixed" by
   repeatedly inventing arbitrary mobile URLs.
9. Add-current logic must know whether the user means pane content or the
   browser tab behind the Side Panel.
10. Collapse/expand must work even with zero shortcuts and after restart.

These lessons should be preserved as regression tests, not forgotten with each
new version.
