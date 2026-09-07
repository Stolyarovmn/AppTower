# 11 — Product and architecture decisions

This file records decisions so future work does not re-open settled questions
without new evidence.

## Accepted

### Cleanroom close completion reconciliation (2.0.1)
The bec410bd diagnostic trace records successful close Promise completion without
an onClosed event. For explicit Cleanroom close requests, successful API completion
may settle a still-closing state; rail remains hidden before completion. This
supplements browser events, and does not infer closure from a disconnected port.
The close Promise contract is documented at
https://developer.chrome.com/docs/extensions/reference/api/sidePanel#method-close.
Live Edge verification remains outstanding.

### Native Side Panel when available
Use Edge/Chrome native Side Panel for the main build.

### BrowserAdapter
All new browser-container behavior belongs behind BrowserAdapter so Yandex or
future Firefox adapters do not require rewriting Core.

### Sidecar fallback
For browsers/sites where iframe/native Side Panel is unsuitable, top-level
sidecar is allowed.

### Two independent panes
Top and bottom are independent documents and must not reload together due to
ordinary state changes.

### Auto default
All ordinary new/manual navigation starts in Auto unless the shortcut has an
explicit persisted mode.

### No default shortcuts
Fresh install starts empty.

### Home onboarding
Empty state offers Add current, Add arbitrary, Import and Sync.

### Workspaces
App Tower has its own Workspaces and can bind one to a browser window/session.

### Groups/templates
Both are first-class shortcut entities; organizer button exposes both.

### Search at bottom
Magnifier stays near bottom rail controls.

### Resource cap
Idle sleep = 5 minutes; global live resource limit configurable up to 6.

### Modules are optional
Provider-specific functionality is installable/removable declarative metadata.

### PWA metadata, not deprecated Edge PWA sidebar
Use Web App Manifest; do not build on deprecated `edge_side_panel`.

### Options Page
Use supported extension options page instead of trying to inject into browser
settings.

### System/manual theme
System/light/dark + system/custom accent.

### Mobile/provider adapter over fake viewport scaling
For poor narrow-screen sites, prefer a verified mobile endpoint/provider adapter
rather than globally shrinking/scaling an arbitrary desktop page.

## Rejected / not possible

### Add custom entry to `edge://settings` left menu
Not available via normal extension API.

### Programmatically force native Side Panel open on startup
Public API requires/depends on user activation; collapsed rail is the startup
presence mechanism.

### Arbitrary site always works in iframe
Not technically guaranteeable.

### Native browser password autofill parity inside cross-origin iframe
Not guaranteeable; use top-level mode.

### Nested groups
Deferred/disabled to keep interaction predictable.

### Remote executable plugin code
Rejected for current module architecture.

## Deferred

- Session snapshots that capture whole layouts beyond a two-pane template
- dynamic/linked templates
- persistent offscreen audio
- remote Module Store
- richer provider notification categories
- Firefox adapter
- true integration with browser-native Workspaces if a stable API appears


### Cleanroom worker restart (2.0.2)
Runtime Ports are not a durable delivery registry. Rail visibility must also
reach existing content scripts through tab messages, including after worker
restart with zero registered rail ports. Unknown state is reconciled against
runtime.getContexts rather than a 250 ms assumption. Existing Side Panel documents
re-register without renderer reload. The attached user trace was inspected but
is not stored in the repository because it contains browsing history.
