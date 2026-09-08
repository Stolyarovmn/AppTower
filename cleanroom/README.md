# AppTower Cleanroom v2

This directory is a from-scratch implementation.

Rules:
- no JavaScript/CSS/HTML is copied from legacy `app/`;
- the extension is loaded from `cleanroom/` only;
- manifest has no fixed `key`, so a clean unpacked install in a new folder gets a different extension identity and cannot inherit legacy extension storage;
- lifecycle is window-scoped only; `chrome.sidePanel.setOptions({tabId: ...})` and `chrome.sidePanel.open({tabId: ...})` are forbidden;
- panel lifecycle has exactly one state machine per browser window: `unknown | collapsed | opening | expanded | closing`;
- rail visibility is derived from that state, not persisted independently;
- browser restart starts collapsed unless an already-live Side Panel reconnect proves it is expanded;
- Search/Add are commands, not panel lifecycle states;
- pane documents are never rebuilt because a normal browser tab changed;
- single-pane toolbar has no close X;
- active pane is indicated only by the vertical accent line; there is no dot/select button.

The first milestone intentionally contains only the lifecycle/UI vertical slice needed to prove the P0 behaviors before more legacy features are reimplemented.

## 2.0.1 — close reconciliation (based on bec410bd)

- Compact rail is visible only in `collapsed`, never in `closing`.
- Successful window-scoped `sidePanel.close()` completion reconciles a still
  `closing` state even when the advertised `onClosed` event is absent in the log.
  A port disconnect alone still does not prove closure.
- Browser close/open events remain active. An old close Promise cannot overwrite
  a subsequent `opening` or `expanded` state.
- Runtime regression tests execute background.js with controlled API events and
  promises: missing close event, close failure, Search delivery, event-before-Promise.
- Reference: https://developer.chrome.com/docs/extensions/reference/api/sidePanel#method-close
  documents Promise completion after closure. Edge runtime still requires validation.
- No legacy implementation was imported; package only this directory.

Run tests: `node --test tests/*.test.mjs` (Node 22+).
Update the existing unpacked Cleanroom directory and reload that extension.
Do not load an additional copy alongside the old one. Diagnostics must show 2.0.1.


## 2.0.2 — worker restart and rail delivery

- Reproduced 2.0.1 failure with surviving content scripts and an empty worker port
  registry: open left the rail visible, collapse hid it without restoring it.
- Lifecycle visibility now also reaches HTTP(S) tabs via tabs.sendMessage and
  records rail.visibility.ack with requested and reported visibility.
- A fresh worker queries runtime.getContexts for SIDE_PANEL before deciding an
  unknown window is collapsed. A user action supersedes an outstanding query.
- Surviving panel documents can reconnect to the fresh worker without reloading
  their UI or iframe contents. Restored pages request rail state on pageshow.
- Expand points left; Collapse points right.
- Diagnostics includes active Side Panel contexts. Self-test explicitly reports
  that it checks API capabilities, not actual lifecycle behavior.
- Regression tests use actual background.js and rail.js with API/DOM doubles.
  Live browser restart and Edge UI remain unverified in this environment.

## 2.1.0 — modular feature preview

Update the existing unpacked folder, then reload the extension; do not install a
second copy. Diagnostics should report 2.1.0. Export data before testing this
preview. The previous Cleanroom shortcuts and pane URLs migrate automatically.

The collapsed rail reserves 48 CSS pixels and restores the original inline
styles when hidden. Viewport-fixed right controls are adjusted separately;
transformed containers are excluded. This is implemented and DOM-tested, not
verified on arbitrary live sites or in Edge in this environment.

New code is organized into pure model/reducer, serialized storage, browser
services, pane resource controller, DOM UI, page-space controller and trusted
provider adapters. No implementation imports from legacy app/ exist.

Implemented: workspaces; site/group/two-pane template entities; editing,
reordering, ungrouping, swapping and decomposing templates; pointer/touch drag;
search across entities/history/workspaces/commands; independent panes and split
resize; themes, accent and template overlap; site zoom, keep-awake, notification
settings; 5-minute idle sleep and shared 1–6 resource cap; global disable;
context menus; own new-tab page; schema-1 JSON import/export; optional sync of
organization and modules; declarative embed modules and opt-in YouTube adapter;
standard same-origin Web App Manifest discovery and reusable popup sidecars.

### Remaining parity and verification work

- This preview is NOT a declaration of complete legacy parity. Legacy v1 backup
  formats, Yandex Music integration and provider-specific media controls are not
  restored. Yandex/Firefox fallback builds remain the historical implementation.
- Recent entries track AppTower-issued navigation, not arbitrary navigation
  inside cross-origin frames.
- Sync currently has a 7,600-byte payload limit; excess data stays local and
  displays an export recommendation. Pane sessions and site permissions stay local.
- A/C compatibility removes frame-blocking response headers only for extension
  initiated subframes on selected origins. A simultaneous S frame on the same
  origin shares that rule; S is not strict per-frame isolation in this preview.
- PWA discovery is same-origin only. Separate windows are browser popups, not
  installed OS apps. Sites with DRM/OAuth/anti-bot may still reject embedding.
- Live Edge installation/restart, pointer/touch drag, real iframe media and site
  geometry need browser verification. The cloud browser policy blocked opening
  the extension-management page; no live Edge pass is claimed.

### Reproduce checks / package

Node 24: `npm ci --ignore-scripts` then `npm test` inside cleanroom/.
`python cleanroom/tools/package.py --output dist/AppTower-Cleanroom.zip` from repo root.
The full ZIP contains runtime sources, tests and lockfile, excluding node_modules.

Acceptance gate: existing tab → collapse/expand 20 times; browser restart;
fixed header and right button stay reachable with compact rail; hide restores
page width; upper/lower iframe source stays unchanged on metadata edits and
closing the other pane; global X hides every rail; reducing resource cap sleeps
excess panes; export/import preserves organization. Automated tests cover the
state/DOM/API-double portions, not browser-owned UI.

### Permission regression gate

`node tools/check-permissions.mjs` verifies the manifest against documented
required, optional, host and content-script budgets. New permissions and
optional-to-required promotion fail; removals pass. Inherited-origin, all-frame
and MAIN-world script expansion also fail. The same checker runs from npm tests,
CI and tools/package.py. Existing broad HTTP(S) access is explicitly recorded,
not certified as minimal; narrowing remains TASK 12. Changes to the budget itself
require review. Legacy/fallback variants are not covered by this Cleanroom gate.

## 2.1.1 — explicit collapse and UI regression repair

Explicit Collapse now persists enabled=true before closing. Browser-owned panel
entry can bypass the extension action's enable path; a previously disabled
workspace otherwise collapses into a hidden rail. Tests cover browser onOpened
and panel connection after disable, close completion and subsequent expansion.
The expanded rail no longer contains a global X competing with the browser's X.
The compact rail retains global disable. Settings uses a centered shared gear SVG.

Mandatory historical regression rules: docs/22_CLEANROOM_REGRESSION_RULES.md in
the repository. Local tests do not certify the two actual Edge menu controls.
