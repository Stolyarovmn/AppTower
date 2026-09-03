# Release notes archive

Historical README/release notes extracted from archived Edge/Chrome ZIPs. They are evidence of earlier implementation intent and may be superseded by later builds.


---

## v0.8.5 — `AppTowerNext-v0.8.5.zip`

# App Tower Next v0.8.5

## v0.8.5 — current page / collapse recovery

- `Добавить текущую страницу` now asks the browser for the active normal HTTP(S) tab and, if the active tab is App Tower New Tab or another privileged page, falls back to the most recently accessed normal web tab in the same window.
- The injected collapsed rail passes its exact `location.href` and page title when `+` is clicked, so the Add dialog no longer has to guess which browser tab was meant.
- The empty onboarding screen treats `Добавить текущую страницу` as the browser tab behind the Side Panel rather than an empty App Tower pane.
- Edge settings buttons use the Windows Segoe Fluent Icons `Settings` glyph (U+E713); Chromium/Yandex keep an SVG fallback.
- Collapse now prefers the real `chrome.sidePanel.close()` operation. The old v0.8.4 disable-and-immediately-enable workaround was removed.
- If a browser does not implement `sidePanel.close()`, App Tower disables the current tab's side panel and keeps it disabled until the next explicit open.
- Expand/open receives the sender tab ID and re-enables a previously disabled panel in the same user-gesture chain before opening it.
- Startup repairs `enabled:false` side-panel options that may have been left behind by v0.8.4, including restored browser tabs after restart.
- Literal `\n` escape sequences accidentally written into v0.8.3/v0.8.4 CSS were converted back to real newlines, so the later interaction/spacing rules are parsed normally.

## v0.8.5 — interaction reliability

- Search results no longer rebuild themselves on `mouseenter`; mouse clicks now
  reach the selected result.
- Search `Close` is an explicit button and no longer gets cancelled by the
  form's `preventDefault`; Esc still closes the palette.
- `Add current page` deterministically prefers the focused/last/active App Tower
  pane and falls back to a blank form instead of failing silently.
- Options/Recent opening calls native `sidePanel.open()` directly from the click
  handler before background state work, preserving Chromium user activation.
- Collapse uses BrowserAdapter only. On Edge, if `sidePanel.close()` is absent
  or unreliable, the current tab's Side Panel is temporarily disabled and
  re-enabled through `sidePanel.setOptions()`, leaving it available but hidden.
- Pane toolbar, expanded rail, collapsed rail, and Options action rows have
  larger control spacing.
- Bundled YouTube module 1.2.0 keeps official embeds for concrete videos but
  removes the failed generic `m.youtube.com` iframe fallback. Generic YouTube
  pages return to ordinary Auto/Compatibility rendering.
- Existing installed YouTube modules are refreshed during schema-15 migration.

## v0.8.5 — interaction and stability pass

This build focuses on real browser-runtime problems reported from v0.8.2.

- Workspace state notifications no longer force-reload both pane iframes.
- Add Site tracks the last actually interacted pane and includes explicit
  Upper / Lower / Browser-tab source switches.
- Native favicon/image dragging is disabled so pointer drag/drop can own the
  shortcut gesture without the browser's prohibited-drop cursor.
- The two-overlapping-squares button is now an Organizer: New Group or
  Two-pane Template.
- Group context/actions can open a contained site in the upper or lower pane.
- Native Side Panel collapse calls `chrome.sidePanel.close()` directly from the
  click handler. OPEN_PANEL starts `sidePanel.open()` before asynchronous work
  so expand keeps Chromium's required user activation.
- Options -> Open App Tower/Search also invoke the native Side Panel API directly
  from the button click.
- Options Shortcuts is actionable instead of read-only.
- Recent is recorded on iframe navigation, can show all workspaces in Options,
  and falls back to currently loaded pane URLs after upgrading from builds that
  did not have history.
- Performance's live resource list is explicitly presented as collapsible
  diagnostics, not a log.
- Web Apps has Open in App Tower / Open as App / Auto App / Forget actions.
- Sidecar Manager explains that only separate Real Page/PWA windows appear.
- Bundled YouTube module v1.1 keeps official embeds for specific videos and adds
  a declarative mobile-web fallback for ordinary YouTube pages. Existing users
  with the YouTube module installed are migrated to the new bundled manifest.
- App Tower icons were redrawn on a transparent background to remain readable on
  light and dark browser chrome. Options navigation uses consistent 19px SVGs.

## v0.8.5 — shortcut creation fixes

- The rail `+` now prefers the active App Tower pane as its source. The outer
  browser tab is only a fallback when that pane has no HTTP/HTTPS URL.
- Each pane toolbar has a bookmark-plus action that opens Add Site prefilled
  from that pane.
- Embedded ordinary pages report their current URL/title back to the Side Panel,
  so quick-add follows normal in-pane navigations instead of being stuck on the
  original typed URL.
- Add Site shows where the prefilled URL came from and derives a usable title
  from the host when the pane has only a URL.
- Group/template creation no longer relies on `pendingCombine` surviving a
  dialog close event. Group and template editors carry their own immutable
  source/target draft.
- Template/Group Save buttons now surface persistence errors instead of silently
  doing nothing.
- `Create template...` from a shortcut context menu no longer re-opens the
  "Template or Group?" dialog. With one possible second site it opens the
  template editor immediately; with several sites it shows an App Tower chooser.
- The old JavaScript `prompt()` numeric chooser was removed. Group and template
  target selection now uses an in-extension chooser dialog.

## v0.8.1 — rail ownership / icon consistency

- Native `sidePanel.onOpened` / `sidePanel.onClosed` are authoritative for
  expanded-vs-collapsed state when the browser provides them.
- A transient `runtime.Port` disconnect no longer marks an actually visible
  native Side Panel as closed.
- Chromium variants without `sidePanel.onClosed` use a 900 ms reconnect debounce
  before showing the collapsed rail.
- Reopening the native Side Panel clears stale collapsed state immediately.
- Expanded Side Panel rail, collapsed injected rail and App Tower New Tab now
  use the same deterministic SVG glyphs for Add, Search and Settings instead of
  mixing Segoe Fluent font glyphs with Unicode fallbacks.
- The browser-owned Side Panel title-bar X remains browser UI. The collapsed
  rail X remains App Tower's global-disable action; those are intentionally
  different actions.

Experimental Manifest V3 extension targeting Microsoft Edge and Google Chrome,
with a sidecar fallback path for Chromium-family browsers where
`chrome.sidePanel` is unavailable.

## v0.8.1 — browser layer, Workspaces and control plane

### BrowserAdapter

Browser-specific container operations are isolated in
`shared/browser-adapter.js`.

- Edge / Chrome with `chrome.sidePanel`: native browser Side Panel.
- Browser without the API: managed top-level sidecar window.
- UI skin hint:
  - Edge -> Fluent-like
  - Chrome -> Chromium-like
  - Yandex Browser -> Yandex-like

The Core does not depend directly on a browser-specific sidebar implementation.

A public Extensions API that exposes the user's native Edge/Chrome/Yandex
browser Workspace identity is not used because App Tower cannot rely on such an
API. App Tower instead binds its own active Workspace to the current browser
window for the session.

### Native-style Options page

The gear opens the extension Options page instead of growing the Side Panel
settings dialog.

The page has a browser-settings-like left navigation:

- General
- Appearance
- Workspaces
- Shortcuts
- Recent
- Sites
- Notifications
- Performance
- Modules
- Web Apps
- Sidecars
- Media
- Permissions
- Sync and data

Contextual `Site settings...` opens/focuses the same Options page and routes it
to the matching site.

### Workspaces

Each App Tower Workspace owns:

- shortcut tree (sites, groups, two-pane templates)
- top/bottom pane URLs and modes
- split state and split ratio

The active Workspace is bound to a browser window for the current session.
Workspace names and shortcut trees can be synchronized through Browser Sync;
open pane state remains local.

### Search

A magnifier is at the bottom of the expanded rail and collapsed rail.

Default command:

`Ctrl+Shift+Space` (`Command+Shift+Space` on macOS)

Search covers:

- sites
- groups
- two-pane templates
- Workspaces
- Recent App Tower entries
- App Tower commands

### Recent

App Tower keeps a bounded Recent list per Workspace. It is separate from the
rail and can be searched or opened from Options -> Recent.

### Resource sleeping

Normal web/media pane surfaces register a live resource lease.

Policy:

- idle web pane: unload after 5 minutes
- global hard cap: 1..6 live pane resources, default 6
- hidden pane is unloaded immediately
- `Never sleep` protects a site from the 5-minute idle timer
- the global hard cap still wins, so App Tower never intentionally keeps more
  live pane resources than the configured maximum

Resource leases live in `chrome.storage.session`, so MV3 service-worker
suspension does not reset the idle timer.

Sleeping unloads the iframe and keeps the App Tower pane URL/state. The pane can
be woken explicitly.

### Per-site settings

Options -> Sites currently provides per-origin:

- Zoom: 60%..150%
- Sleep policy: 5 minutes / Never sleep

Shortcut context menus provide renderer mode:

- Auto
- Secure
- Compatibility
- Real Page

### Notifications

Options -> Notifications uses the browser's site notification content setting
when the optional `contentSettings` permission is granted:

- Default
- Allow
- Block

Rules are rebuilt as a set so returning one origin to `Default` does not remove
the other App Tower notification rules.

Declarative modules may also declare notification categories. App Tower stores
the selected categories per origin. A module still needs an actual documented
integration to produce or filter those category-specific notifications.

### Native browser context menu

The normal browser page/link context menu contains App Tower actions:

- Open App Tower
- Add current page
- Open link in bottom pane
- Settings

The custom menu inside the Side Panel is styled for the detected browser,
because browsers do not expose an API for placing native context-menu widgets
inside an arbitrary extension page.

Shortcut menu actions include:

- Open
- Open in bottom pane
- Open separately
- Add to group
- Create two-pane template
- Auto / Secure / Compatibility / Real Page
- Site settings
- Duplicate
- Remove

### Sidecar Manager

Top-level Real Page / PWA sidecar windows are tracked in session state.
Options -> Sidecars can focus or close tracked sidecars.

### Media contract

`shared/media-contract.js` defines a provider-neutral state contract for
module-backed media surfaces.

The Core can expose an attached media surface in the rail/Options. Transport
controls such as play/pause are deliberately not fabricated: they are only
enabled when a provider module has a verified control API.

### Module Permissions dashboard

Options -> Permissions shows the BrowserAdapter capabilities and installed
declarative modules, including their host scope.

Modules remain data-only: no downloaded JavaScript/WASM is executed by the
module registry.

A module manifest may declare notification categories as metadata.

## v0.7.x shortcut organization

The rail supports mouse wheel, touchpad, touch/pen panning, overflow arrows,
groups with 1-2 letter badges, pointer drag/reorder, drag-to-group, and
two-pane templates with adjustable 20-80% favicon overlap.

## v0.6.x foundations

- System / Light / Dark theme
- system or custom accent
- modular Auto renderer
- PWA-aware discovery and top-level sidecar launch
- split panes
- persistent collapsed rail
- App Tower New Tab

## Browser notes

### Edge / Chrome

The main build uses the native Side Panel API when available.

### Yandex Browser

The runtime contains a sidecar fallback, but Yandex Browser compatibility is
not claimed as identical to Edge/Chrome until the actual target Yandex version
is tested. A fallback package can omit the Side Panel manifest key/permission
so installation does not depend on Yandex supporting that Chrome API.

## Install / update unpacked build

1. Extract the ZIP into a stable folder.
2. Open `edge://extensions` or `chrome://extensions`.
3. Enable Developer mode if needed.
4. Load unpacked, or replace the files of the already-loaded unpacked build.
5. Press Reload on App Tower Next.
6. Reload already-open HTTP/HTTPS pages so the current collapsed rail/content
   scripts are injected.

Do not uninstall the unpacked extension merely to update it if you want to keep
its local storage.

---

## v0.8.4 — `AppTowerNext-v0.8.4.zip`

# App Tower Next v0.8.4

## v0.8.4 — interaction reliability

- Search results no longer rebuild themselves on `mouseenter`; mouse clicks now
  reach the selected result.
- Search `Close` is an explicit button and no longer gets cancelled by the
  form's `preventDefault`; Esc still closes the palette.
- `Add current page` deterministically prefers the focused/last/active App Tower
  pane and falls back to a blank form instead of failing silently.
- Options/Recent opening calls native `sidePanel.open()` directly from the click
  handler before background state work, preserving Chromium user activation.
- Collapse uses BrowserAdapter only. On Edge, if `sidePanel.close()` is absent
  or unreliable, the current tab's Side Panel is temporarily disabled and
  re-enabled through `sidePanel.setOptions()`, leaving it available but hidden.
- Pane toolbar, expanded rail, collapsed rail, and Options action rows have
  larger control spacing.
- Bundled YouTube module 1.2.0 keeps official embeds for concrete videos but
  removes the failed generic `m.youtube.com` iframe fallback. Generic YouTube
  pages return to ordinary Auto/Compatibility rendering.
- Existing installed YouTube modules are refreshed during schema-15 migration.

## v0.8.4 — interaction and stability pass

This build focuses on real browser-runtime problems reported from v0.8.2.

- Workspace state notifications no longer force-reload both pane iframes.
- Add Site tracks the last actually interacted pane and includes explicit
  Upper / Lower / Browser-tab source switches.
- Native favicon/image dragging is disabled so pointer drag/drop can own the
  shortcut gesture without the browser's prohibited-drop cursor.
- The two-overlapping-squares button is now an Organizer: New Group or
  Two-pane Template.
- Group context/actions can open a contained site in the upper or lower pane.
- Native Side Panel collapse calls `chrome.sidePanel.close()` directly from the
  click handler. OPEN_PANEL starts `sidePanel.open()` before asynchronous work
  so expand keeps Chromium's required user activation.
- Options -> Open App Tower/Search also invoke the native Side Panel API directly
  from the button click.
- Options Shortcuts is actionable instead of read-only.
- Recent is recorded on iframe navigation, can show all workspaces in Options,
  and falls back to currently loaded pane URLs after upgrading from builds that
  did not have history.
- Performance's live resource list is explicitly presented as collapsible
  diagnostics, not a log.
- Web Apps has Open in App Tower / Open as App / Auto App / Forget actions.
- Sidecar Manager explains that only separate Real Page/PWA windows appear.
- Bundled YouTube module v1.1 keeps official embeds for specific videos and adds
  a declarative mobile-web fallback for ordinary YouTube pages. Existing users
  with the YouTube module installed are migrated to the new bundled manifest.
- App Tower icons were redrawn on a transparent background to remain readable on
  light and dark browser chrome. Options navigation uses consistent 19px SVGs.

## v0.8.4 — shortcut creation fixes

- The rail `+` now prefers the active App Tower pane as its source. The outer
  browser tab is only a fallback when that pane has no HTTP/HTTPS URL.
- Each pane toolbar has a bookmark-plus action that opens Add Site prefilled
  from that pane.
- Embedded ordinary pages report their current URL/title back to the Side Panel,
  so quick-add follows normal in-pane navigations instead of being stuck on the
  original typed URL.
- Add Site shows where the prefilled URL came from and derives a usable title
  from the host when the pane has only a URL.
- Group/template creation no longer relies on `pendingCombine` surviving a
  dialog close event. Group and template editors carry their own immutable
  source/target draft.
- Template/Group Save buttons now surface persistence errors instead of silently
  doing nothing.
- `Create template...` from a shortcut context menu no longer re-opens the
  "Template or Group?" dialog. With one possible second site it opens the
  template editor immediately; with several sites it shows an App Tower chooser.
- The old JavaScript `prompt()` numeric chooser was removed. Group and template
  target selection now uses an in-extension chooser dialog.

## v0.8.1 — rail ownership / icon consistency

- Native `sidePanel.onOpened` / `sidePanel.onClosed` are authoritative for
  expanded-vs-collapsed state when the browser provides them.
- A transient `runtime.Port` disconnect no longer marks an actually visible
  native Side Panel as closed.
- Chromium variants without `sidePanel.onClosed` use a 900 ms reconnect debounce
  before showing the collapsed rail.
- Reopening the native Side Panel clears stale collapsed state immediately.
- Expanded Side Panel rail, collapsed injected rail and App Tower New Tab now
  use the same deterministic SVG glyphs for Add, Search and Settings instead of
  mixing Segoe Fluent font glyphs with Unicode fallbacks.
- The browser-owned Side Panel title-bar X remains browser UI. The collapsed
  rail X remains App Tower's global-disable action; those are intentionally
  different actions.

Experimental Manifest V3 extension targeting Microsoft Edge and Google Chrome,
with a sidecar fallback path for Chromium-family browsers where
`chrome.sidePanel` is unavailable.

## v0.8.1 — browser layer, Workspaces and control plane

### BrowserAdapter

Browser-specific container operations are isolated in
`shared/browser-adapter.js`.

- Edge / Chrome with `chrome.sidePanel`: native browser Side Panel.
- Browser without the API: managed top-level sidecar window.
- UI skin hint:
  - Edge -> Fluent-like
  - Chrome -> Chromium-like
  - Yandex Browser -> Yandex-like

The Core does not depend directly on a browser-specific sidebar implementation.

A public Extensions API that exposes the user's native Edge/Chrome/Yandex
browser Workspace identity is not used because App Tower cannot rely on such an
API. App Tower instead binds its own active Workspace to the current browser
window for the session.

### Native-style Options page

The gear opens the extension Options page instead of growing the Side Panel
settings dialog.

The page has a browser-settings-like left navigation:

- General
- Appearance
- Workspaces
- Shortcuts
- Recent
- Sites
- Notifications
- Performance
- Modules
- Web Apps
- Sidecars
- Media
- Permissions
- Sync and data

Contextual `Site settings...` opens/focuses the same Options page and routes it
to the matching site.

### Workspaces

Each App Tower Workspace owns:

- shortcut tree (sites, groups, two-pane templates)
- top/bottom pane URLs and modes
- split state and split ratio

The active Workspace is bound to a browser window for the current session.
Workspace names and shortcut trees can be synchronized through Browser Sync;
open pane state remains local.

### Search

A magnifier is at the bottom of the expanded rail and collapsed rail.

Default command:

`Ctrl+Shift+Space` (`Command+Shift+Space` on macOS)

Search covers:

- sites
- groups
- two-pane templates
- Workspaces
- Recent App Tower entries
- App Tower commands

### Recent

App Tower keeps a bounded Recent list per Workspace. It is separate from the
rail and can be searched or opened from Options -> Recent.

### Resource sleeping

Normal web/media pane surfaces register a live resource lease.

Policy:

- idle web pane: unload after 5 minutes
- global hard cap: 1..6 live pane resources, default 6
- hidden pane is unloaded immediately
- `Never sleep` protects a site from the 5-minute idle timer
- the global hard cap still wins, so App Tower never intentionally keeps more
  live pane resources than the configured maximum

Resource leases live in `chrome.storage.session`, so MV3 service-worker
suspension does not reset the idle timer.

Sleeping unloads the iframe and keeps the App Tower pane URL/state. The pane can
be woken explicitly.

### Per-site settings

Options -> Sites currently provides per-origin:

- Zoom: 60%..150%
- Sleep policy: 5 minutes / Never sleep

Shortcut context menus provide renderer mode:

- Auto
- Secure
- Compatibility
- Real Page

### Notifications

Options -> Notifications uses the browser's site notification content setting
when the optional `contentSettings` permission is granted:

- Default
- Allow
- Block

Rules are rebuilt as a set so returning one origin to `Default` does not remove
the other App Tower notification rules.

Declarative modules may also declare notification categories. App Tower stores
the selected categories per origin. A module still needs an actual documented
integration to produce or filter those category-specific notifications.

### Native browser context menu

The normal browser page/link context menu contains App Tower actions:

- Open App Tower
- Add current page
- Open link in bottom pane
- Settings

The custom menu inside the Side Panel is styled for the detected browser,
because browsers do not expose an API for placing native context-menu widgets
inside an arbitrary extension page.

Shortcut menu actions include:

- Open
- Open in bottom pane
- Open separately
- Add to group
- Create two-pane template
- Auto / Secure / Compatibility / Real Page
- Site settings
- Duplicate
- Remove

### Sidecar Manager

Top-level Real Page / PWA sidecar windows are tracked in session state.
Options -> Sidecars can focus or close tracked sidecars.

### Media contract

`shared/media-contract.js` defines a provider-neutral state contract for
module-backed media surfaces.

The Core can expose an attached media surface in the rail/Options. Transport
controls such as play/pause are deliberately not fabricated: they are only
enabled when a provider module has a verified control API.

### Module Permissions dashboard

Options -> Permissions shows the BrowserAdapter capabilities and installed
declarative modules, including their host scope.

Modules remain data-only: no downloaded JavaScript/WASM is executed by the
module registry.

A module manifest may declare notification categories as metadata.

## v0.7.x shortcut organization

The rail supports mouse wheel, touchpad, touch/pen panning, overflow arrows,
groups with 1-2 letter badges, pointer drag/reorder, drag-to-group, and
two-pane templates with adjustable 20-80% favicon overlap.

## v0.6.x foundations

- System / Light / Dark theme
- system or custom accent
- modular Auto renderer
- PWA-aware discovery and top-level sidecar launch
- split panes
- persistent collapsed rail
- App Tower New Tab

## Browser notes

### Edge / Chrome

The main build uses the native Side Panel API when available.

### Yandex Browser

The runtime contains a sidecar fallback, but Yandex Browser compatibility is
not claimed as identical to Edge/Chrome until the actual target Yandex version
is tested. A fallback package can omit the Side Panel manifest key/permission
so installation does not depend on Yandex supporting that Chrome API.

## Install / update unpacked build

1. Extract the ZIP into a stable folder.
2. Open `edge://extensions` or `chrome://extensions`.
3. Enable Developer mode if needed.
4. Load unpacked, or replace the files of the already-loaded unpacked build.
5. Press Reload on App Tower Next.
6. Reload already-open HTTP/HTTPS pages so the current collapsed rail/content
   scripts are injected.

Do not uninstall the unpacked extension merely to update it if you want to keep
its local storage.

---

## v0.8.3 — `AppTowerNext-v0.8.3.zip`

# App Tower Next v0.8.3

## v0.8.3 — interaction and stability pass

This build focuses on real browser-runtime problems reported from v0.8.2.

- Workspace state notifications no longer force-reload both pane iframes.
- Add Site tracks the last actually interacted pane and includes explicit
  Upper / Lower / Browser-tab source switches.
- Native favicon/image dragging is disabled so pointer drag/drop can own the
  shortcut gesture without the browser's prohibited-drop cursor.
- The two-overlapping-squares button is now an Organizer: New Group or
  Two-pane Template.
- Group context/actions can open a contained site in the upper or lower pane.
- Native Side Panel collapse calls `chrome.sidePanel.close()` directly from the
  click handler. OPEN_PANEL starts `sidePanel.open()` before asynchronous work
  so expand keeps Chromium's required user activation.
- Options -> Open App Tower/Search also invoke the native Side Panel API directly
  from the button click.
- Options Shortcuts is actionable instead of read-only.
- Recent is recorded on iframe navigation, can show all workspaces in Options,
  and falls back to currently loaded pane URLs after upgrading from builds that
  did not have history.
- Performance's live resource list is explicitly presented as collapsible
  diagnostics, not a log.
- Web Apps has Open in App Tower / Open as App / Auto App / Forget actions.
- Sidecar Manager explains that only separate Real Page/PWA windows appear.
- Bundled YouTube module v1.1 keeps official embeds for specific videos and adds
  a declarative mobile-web fallback for ordinary YouTube pages. Existing users
  with the YouTube module installed are migrated to the new bundled manifest.
- App Tower icons were redrawn on a transparent background to remain readable on
  light and dark browser chrome. Options navigation uses consistent 19px SVGs.

## v0.8.3 — shortcut creation fixes

- The rail `+` now prefers the active App Tower pane as its source. The outer
  browser tab is only a fallback when that pane has no HTTP/HTTPS URL.
- Each pane toolbar has a bookmark-plus action that opens Add Site prefilled
  from that pane.
- Embedded ordinary pages report their current URL/title back to the Side Panel,
  so quick-add follows normal in-pane navigations instead of being stuck on the
  original typed URL.
- Add Site shows where the prefilled URL came from and derives a usable title
  from the host when the pane has only a URL.
- Group/template creation no longer relies on `pendingCombine` surviving a
  dialog close event. Group and template editors carry their own immutable
  source/target draft.
- Template/Group Save buttons now surface persistence errors instead of silently
  doing nothing.
- `Create template...` from a shortcut context menu no longer re-opens the
  "Template or Group?" dialog. With one possible second site it opens the
  template editor immediately; with several sites it shows an App Tower chooser.
- The old JavaScript `prompt()` numeric chooser was removed. Group and template
  target selection now uses an in-extension chooser dialog.

## v0.8.1 — rail ownership / icon consistency

- Native `sidePanel.onOpened` / `sidePanel.onClosed` are authoritative for
  expanded-vs-collapsed state when the browser provides them.
- A transient `runtime.Port` disconnect no longer marks an actually visible
  native Side Panel as closed.
- Chromium variants without `sidePanel.onClosed` use a 900 ms reconnect debounce
  before showing the collapsed rail.
- Reopening the native Side Panel clears stale collapsed state immediately.
- Expanded Side Panel rail, collapsed injected rail and App Tower New Tab now
  use the same deterministic SVG glyphs for Add, Search and Settings instead of
  mixing Segoe Fluent font glyphs with Unicode fallbacks.
- The browser-owned Side Panel title-bar X remains browser UI. The collapsed
  rail X remains App Tower's global-disable action; those are intentionally
  different actions.

Experimental Manifest V3 extension targeting Microsoft Edge and Google Chrome,
with a sidecar fallback path for Chromium-family browsers where
`chrome.sidePanel` is unavailable.

## v0.8.1 — browser layer, Workspaces and control plane

### BrowserAdapter

Browser-specific container operations are isolated in
`shared/browser-adapter.js`.

- Edge / Chrome with `chrome.sidePanel`: native browser Side Panel.
- Browser without the API: managed top-level sidecar window.
- UI skin hint:
  - Edge -> Fluent-like
  - Chrome -> Chromium-like
  - Yandex Browser -> Yandex-like

The Core does not depend directly on a browser-specific sidebar implementation.

A public Extensions API that exposes the user's native Edge/Chrome/Yandex
browser Workspace identity is not used because App Tower cannot rely on such an
API. App Tower instead binds its own active Workspace to the current browser
window for the session.

### Native-style Options page

The gear opens the extension Options page instead of growing the Side Panel
settings dialog.

The page has a browser-settings-like left navigation:

- General
- Appearance
- Workspaces
- Shortcuts
- Recent
- Sites
- Notifications
- Performance
- Modules
- Web Apps
- Sidecars
- Media
- Permissions
- Sync and data

Contextual `Site settings...` opens/focuses the same Options page and routes it
to the matching site.

### Workspaces

Each App Tower Workspace owns:

- shortcut tree (sites, groups, two-pane templates)
- top/bottom pane URLs and modes
- split state and split ratio

The active Workspace is bound to a browser window for the current session.
Workspace names and shortcut trees can be synchronized through Browser Sync;
open pane state remains local.

### Search

A magnifier is at the bottom of the expanded rail and collapsed rail.

Default command:

`Ctrl+Shift+Space` (`Command+Shift+Space` on macOS)

Search covers:

- sites
- groups
- two-pane templates
- Workspaces
- Recent App Tower entries
- App Tower commands

### Recent

App Tower keeps a bounded Recent list per Workspace. It is separate from the
rail and can be searched or opened from Options -> Recent.

### Resource sleeping

Normal web/media pane surfaces register a live resource lease.

Policy:

- idle web pane: unload after 5 minutes
- global hard cap: 1..6 live pane resources, default 6
- hidden pane is unloaded immediately
- `Never sleep` protects a site from the 5-minute idle timer
- the global hard cap still wins, so App Tower never intentionally keeps more
  live pane resources than the configured maximum

Resource leases live in `chrome.storage.session`, so MV3 service-worker
suspension does not reset the idle timer.

Sleeping unloads the iframe and keeps the App Tower pane URL/state. The pane can
be woken explicitly.

### Per-site settings

Options -> Sites currently provides per-origin:

- Zoom: 60%..150%
- Sleep policy: 5 minutes / Never sleep

Shortcut context menus provide renderer mode:

- Auto
- Secure
- Compatibility
- Real Page

### Notifications

Options -> Notifications uses the browser's site notification content setting
when the optional `contentSettings` permission is granted:

- Default
- Allow
- Block

Rules are rebuilt as a set so returning one origin to `Default` does not remove
the other App Tower notification rules.

Declarative modules may also declare notification categories. App Tower stores
the selected categories per origin. A module still needs an actual documented
integration to produce or filter those category-specific notifications.

### Native browser context menu

The normal browser page/link context menu contains App Tower actions:

- Open App Tower
- Add current page
- Open link in bottom pane
- Settings

The custom menu inside the Side Panel is styled for the detected browser,
because browsers do not expose an API for placing native context-menu widgets
inside an arbitrary extension page.

Shortcut menu actions include:

- Open
- Open in bottom pane
- Open separately
- Add to group
- Create two-pane template
- Auto / Secure / Compatibility / Real Page
- Site settings
- Duplicate
- Remove

### Sidecar Manager

Top-level Real Page / PWA sidecar windows are tracked in session state.
Options -> Sidecars can focus or close tracked sidecars.

### Media contract

`shared/media-contract.js` defines a provider-neutral state contract for
module-backed media surfaces.

The Core can expose an attached media surface in the rail/Options. Transport
controls such as play/pause are deliberately not fabricated: they are only
enabled when a provider module has a verified control API.

### Module Permissions dashboard

Options -> Permissions shows the BrowserAdapter capabilities and installed
declarative modules, including their host scope.

Modules remain data-only: no downloaded JavaScript/WASM is executed by the
module registry.

A module manifest may declare notification categories as metadata.

## v0.7.x shortcut organization

The rail supports mouse wheel, touchpad, touch/pen panning, overflow arrows,
groups with 1-2 letter badges, pointer drag/reorder, drag-to-group, and
two-pane templates with adjustable 20-80% favicon overlap.

## v0.6.x foundations

- System / Light / Dark theme
- system or custom accent
- modular Auto renderer
- PWA-aware discovery and top-level sidecar launch
- split panes
- persistent collapsed rail
- App Tower New Tab

## Browser notes

### Edge / Chrome

The main build uses the native Side Panel API when available.

### Yandex Browser

The runtime contains a sidecar fallback, but Yandex Browser compatibility is
not claimed as identical to Edge/Chrome until the actual target Yandex version
is tested. A fallback package can omit the Side Panel manifest key/permission
so installation does not depend on Yandex supporting that Chrome API.

## Install / update unpacked build

1. Extract the ZIP into a stable folder.
2. Open `edge://extensions` or `chrome://extensions`.
3. Enable Developer mode if needed.
4. Load unpacked, or replace the files of the already-loaded unpacked build.
5. Press Reload on App Tower Next.
6. Reload already-open HTTP/HTTPS pages so the current collapsed rail/content
   scripts are injected.

Do not uninstall the unpacked extension merely to update it if you want to keep
its local storage.

---

## v0.8.2 — `AppTowerNext-v0.8.2.zip`

# App Tower Next v0.8.2

## v0.8.2 — shortcut creation fixes

- The rail `+` now prefers the active App Tower pane as its source. The outer
  browser tab is only a fallback when that pane has no HTTP/HTTPS URL.
- Each pane toolbar has a bookmark-plus action that opens Add Site prefilled
  from that pane.
- Embedded ordinary pages report their current URL/title back to the Side Panel,
  so quick-add follows normal in-pane navigations instead of being stuck on the
  original typed URL.
- Add Site shows where the prefilled URL came from and derives a usable title
  from the host when the pane has only a URL.
- Group/template creation no longer relies on `pendingCombine` surviving a
  dialog close event. Group and template editors carry their own immutable
  source/target draft.
- Template/Group Save buttons now surface persistence errors instead of silently
  doing nothing.
- `Create template...` from a shortcut context menu no longer re-opens the
  "Template or Group?" dialog. With one possible second site it opens the
  template editor immediately; with several sites it shows an App Tower chooser.
- The old JavaScript `prompt()` numeric chooser was removed. Group and template
  target selection now uses an in-extension chooser dialog.

## v0.8.1 — rail ownership / icon consistency

- Native `sidePanel.onOpened` / `sidePanel.onClosed` are authoritative for
  expanded-vs-collapsed state when the browser provides them.
- A transient `runtime.Port` disconnect no longer marks an actually visible
  native Side Panel as closed.
- Chromium variants without `sidePanel.onClosed` use a 900 ms reconnect debounce
  before showing the collapsed rail.
- Reopening the native Side Panel clears stale collapsed state immediately.
- Expanded Side Panel rail, collapsed injected rail and App Tower New Tab now
  use the same deterministic SVG glyphs for Add, Search and Settings instead of
  mixing Segoe Fluent font glyphs with Unicode fallbacks.
- The browser-owned Side Panel title-bar X remains browser UI. The collapsed
  rail X remains App Tower's global-disable action; those are intentionally
  different actions.

Experimental Manifest V3 extension targeting Microsoft Edge and Google Chrome,
with a sidecar fallback path for Chromium-family browsers where
`chrome.sidePanel` is unavailable.

## v0.8.1 — browser layer, Workspaces and control plane

### BrowserAdapter

Browser-specific container operations are isolated in
`shared/browser-adapter.js`.

- Edge / Chrome with `chrome.sidePanel`: native browser Side Panel.
- Browser without the API: managed top-level sidecar window.
- UI skin hint:
  - Edge -> Fluent-like
  - Chrome -> Chromium-like
  - Yandex Browser -> Yandex-like

The Core does not depend directly on a browser-specific sidebar implementation.

A public Extensions API that exposes the user's native Edge/Chrome/Yandex
browser Workspace identity is not used because App Tower cannot rely on such an
API. App Tower instead binds its own active Workspace to the current browser
window for the session.

### Native-style Options page

The gear opens the extension Options page instead of growing the Side Panel
settings dialog.

The page has a browser-settings-like left navigation:

- General
- Appearance
- Workspaces
- Shortcuts
- Recent
- Sites
- Notifications
- Performance
- Modules
- Web Apps
- Sidecars
- Media
- Permissions
- Sync and data

Contextual `Site settings...` opens/focuses the same Options page and routes it
to the matching site.

### Workspaces

Each App Tower Workspace owns:

- shortcut tree (sites, groups, two-pane templates)
- top/bottom pane URLs and modes
- split state and split ratio

The active Workspace is bound to a browser window for the current session.
Workspace names and shortcut trees can be synchronized through Browser Sync;
open pane state remains local.

### Search

A magnifier is at the bottom of the expanded rail and collapsed rail.

Default command:

`Ctrl+Shift+Space` (`Command+Shift+Space` on macOS)

Search covers:

- sites
- groups
- two-pane templates
- Workspaces
- Recent App Tower entries
- App Tower commands

### Recent

App Tower keeps a bounded Recent list per Workspace. It is separate from the
rail and can be searched or opened from Options -> Recent.

### Resource sleeping

Normal web/media pane surfaces register a live resource lease.

Policy:

- idle web pane: unload after 5 minutes
- global hard cap: 1..6 live pane resources, default 6
- hidden pane is unloaded immediately
- `Never sleep` protects a site from the 5-minute idle timer
- the global hard cap still wins, so App Tower never intentionally keeps more
  live pane resources than the configured maximum

Resource leases live in `chrome.storage.session`, so MV3 service-worker
suspension does not reset the idle timer.

Sleeping unloads the iframe and keeps the App Tower pane URL/state. The pane can
be woken explicitly.

### Per-site settings

Options -> Sites currently provides per-origin:

- Zoom: 60%..150%
- Sleep policy: 5 minutes / Never sleep

Shortcut context menus provide renderer mode:

- Auto
- Secure
- Compatibility
- Real Page

### Notifications

Options -> Notifications uses the browser's site notification content setting
when the optional `contentSettings` permission is granted:

- Default
- Allow
- Block

Rules are rebuilt as a set so returning one origin to `Default` does not remove
the other App Tower notification rules.

Declarative modules may also declare notification categories. App Tower stores
the selected categories per origin. A module still needs an actual documented
integration to produce or filter those category-specific notifications.

### Native browser context menu

The normal browser page/link context menu contains App Tower actions:

- Open App Tower
- Add current page
- Open link in bottom pane
- Settings

The custom menu inside the Side Panel is styled for the detected browser,
because browsers do not expose an API for placing native context-menu widgets
inside an arbitrary extension page.

Shortcut menu actions include:

- Open
- Open in bottom pane
- Open separately
- Add to group
- Create two-pane template
- Auto / Secure / Compatibility / Real Page
- Site settings
- Duplicate
- Remove

### Sidecar Manager

Top-level Real Page / PWA sidecar windows are tracked in session state.
Options -> Sidecars can focus or close tracked sidecars.

### Media contract

`shared/media-contract.js` defines a provider-neutral state contract for
module-backed media surfaces.

The Core can expose an attached media surface in the rail/Options. Transport
controls such as play/pause are deliberately not fabricated: they are only
enabled when a provider module has a verified control API.

### Module Permissions dashboard

Options -> Permissions shows the BrowserAdapter capabilities and installed
declarative modules, including their host scope.

Modules remain data-only: no downloaded JavaScript/WASM is executed by the
module registry.

A module manifest may declare notification categories as metadata.

## v0.7.x shortcut organization

The rail supports mouse wheel, touchpad, touch/pen panning, overflow arrows,
groups with 1-2 letter badges, pointer drag/reorder, drag-to-group, and
two-pane templates with adjustable 20-80% favicon overlap.

## v0.6.x foundations

- System / Light / Dark theme
- system or custom accent
- modular Auto renderer
- PWA-aware discovery and top-level sidecar launch
- split panes
- persistent collapsed rail
- App Tower New Tab

## Browser notes

### Edge / Chrome

The main build uses the native Side Panel API when available.

### Yandex Browser

The runtime contains a sidecar fallback, but Yandex Browser compatibility is
not claimed as identical to Edge/Chrome until the actual target Yandex version
is tested. A fallback package can omit the Side Panel manifest key/permission
so installation does not depend on Yandex supporting that Chrome API.

## Install / update unpacked build

1. Extract the ZIP into a stable folder.
2. Open `edge://extensions` or `chrome://extensions`.
3. Enable Developer mode if needed.
4. Load unpacked, or replace the files of the already-loaded unpacked build.
5. Press Reload on App Tower Next.
6. Reload already-open HTTP/HTTPS pages so the current collapsed rail/content
   scripts are injected.

Do not uninstall the unpacked extension merely to update it if you want to keep
its local storage.

---

## v0.8.1 — `AppTowerNext-v0.8.1.zip`

# App Tower Next v0.8.1

## v0.8.1 — rail ownership / icon consistency

- Native `sidePanel.onOpened` / `sidePanel.onClosed` are authoritative for
  expanded-vs-collapsed state when the browser provides them.
- A transient `runtime.Port` disconnect no longer marks an actually visible
  native Side Panel as closed.
- Chromium variants without `sidePanel.onClosed` use a 900 ms reconnect debounce
  before showing the collapsed rail.
- Reopening the native Side Panel clears stale collapsed state immediately.
- Expanded Side Panel rail, collapsed injected rail and App Tower New Tab now
  use the same deterministic SVG glyphs for Add, Search and Settings instead of
  mixing Segoe Fluent font glyphs with Unicode fallbacks.
- The browser-owned Side Panel title-bar X remains browser UI. The collapsed
  rail X remains App Tower's global-disable action; those are intentionally
  different actions.

Experimental Manifest V3 extension targeting Microsoft Edge and Google Chrome,
with a sidecar fallback path for Chromium-family browsers where
`chrome.sidePanel` is unavailable.

## v0.8.1 — browser layer, Workspaces and control plane

### BrowserAdapter

Browser-specific container operations are isolated in
`shared/browser-adapter.js`.

- Edge / Chrome with `chrome.sidePanel`: native browser Side Panel.
- Browser without the API: managed top-level sidecar window.
- UI skin hint:
  - Edge -> Fluent-like
  - Chrome -> Chromium-like
  - Yandex Browser -> Yandex-like

The Core does not depend directly on a browser-specific sidebar implementation.

A public Extensions API that exposes the user's native Edge/Chrome/Yandex
browser Workspace identity is not used because App Tower cannot rely on such an
API. App Tower instead binds its own active Workspace to the current browser
window for the session.

### Native-style Options page

The gear opens the extension Options page instead of growing the Side Panel
settings dialog.

The page has a browser-settings-like left navigation:

- General
- Appearance
- Workspaces
- Shortcuts
- Recent
- Sites
- Notifications
- Performance
- Modules
- Web Apps
- Sidecars
- Media
- Permissions
- Sync and data

Contextual `Site settings...` opens/focuses the same Options page and routes it
to the matching site.

### Workspaces

Each App Tower Workspace owns:

- shortcut tree (sites, groups, two-pane templates)
- top/bottom pane URLs and modes
- split state and split ratio

The active Workspace is bound to a browser window for the current session.
Workspace names and shortcut trees can be synchronized through Browser Sync;
open pane state remains local.

### Search

A magnifier is at the bottom of the expanded rail and collapsed rail.

Default command:

`Ctrl+Shift+Space` (`Command+Shift+Space` on macOS)

Search covers:

- sites
- groups
- two-pane templates
- Workspaces
- Recent App Tower entries
- App Tower commands

### Recent

App Tower keeps a bounded Recent list per Workspace. It is separate from the
rail and can be searched or opened from Options -> Recent.

### Resource sleeping

Normal web/media pane surfaces register a live resource lease.

Policy:

- idle web pane: unload after 5 minutes
- global hard cap: 1..6 live pane resources, default 6
- hidden pane is unloaded immediately
- `Never sleep` protects a site from the 5-minute idle timer
- the global hard cap still wins, so App Tower never intentionally keeps more
  live pane resources than the configured maximum

Resource leases live in `chrome.storage.session`, so MV3 service-worker
suspension does not reset the idle timer.

Sleeping unloads the iframe and keeps the App Tower pane URL/state. The pane can
be woken explicitly.

### Per-site settings

Options -> Sites currently provides per-origin:

- Zoom: 60%..150%
- Sleep policy: 5 minutes / Never sleep

Shortcut context menus provide renderer mode:

- Auto
- Secure
- Compatibility
- Real Page

### Notifications

Options -> Notifications uses the browser's site notification content setting
when the optional `contentSettings` permission is granted:

- Default
- Allow
- Block

Rules are rebuilt as a set so returning one origin to `Default` does not remove
the other App Tower notification rules.

Declarative modules may also declare notification categories. App Tower stores
the selected categories per origin. A module still needs an actual documented
integration to produce or filter those category-specific notifications.

### Native browser context menu

The normal browser page/link context menu contains App Tower actions:

- Open App Tower
- Add current page
- Open link in bottom pane
- Settings

The custom menu inside the Side Panel is styled for the detected browser,
because browsers do not expose an API for placing native context-menu widgets
inside an arbitrary extension page.

Shortcut menu actions include:

- Open
- Open in bottom pane
- Open separately
- Add to group
- Create two-pane template
- Auto / Secure / Compatibility / Real Page
- Site settings
- Duplicate
- Remove

### Sidecar Manager

Top-level Real Page / PWA sidecar windows are tracked in session state.
Options -> Sidecars can focus or close tracked sidecars.

### Media contract

`shared/media-contract.js` defines a provider-neutral state contract for
module-backed media surfaces.

The Core can expose an attached media surface in the rail/Options. Transport
controls such as play/pause are deliberately not fabricated: they are only
enabled when a provider module has a verified control API.

### Module Permissions dashboard

Options -> Permissions shows the BrowserAdapter capabilities and installed
declarative modules, including their host scope.

Modules remain data-only: no downloaded JavaScript/WASM is executed by the
module registry.

A module manifest may declare notification categories as metadata.

## v0.7.x shortcut organization

The rail supports mouse wheel, touchpad, touch/pen panning, overflow arrows,
groups with 1-2 letter badges, pointer drag/reorder, drag-to-group, and
two-pane templates with adjustable 20-80% favicon overlap.

## v0.6.x foundations

- System / Light / Dark theme
- system or custom accent
- modular Auto renderer
- PWA-aware discovery and top-level sidecar launch
- split panes
- persistent collapsed rail
- App Tower New Tab

## Browser notes

### Edge / Chrome

The main build uses the native Side Panel API when available.

### Yandex Browser

The runtime contains a sidecar fallback, but Yandex Browser compatibility is
not claimed as identical to Edge/Chrome until the actual target Yandex version
is tested. A fallback package can omit the Side Panel manifest key/permission
so installation does not depend on Yandex supporting that Chrome API.

## Install / update unpacked build

1. Extract the ZIP into a stable folder.
2. Open `edge://extensions` or `chrome://extensions`.
3. Enable Developer mode if needed.
4. Load unpacked, or replace the files of the already-loaded unpacked build.
5. Press Reload on App Tower Next.
6. Reload already-open HTTP/HTTPS pages so the current collapsed rail/content
   scripts are injected.

Do not uninstall the unpacked extension merely to update it if you want to keep
its local storage.

---

## v0.8.0 — `AppTowerNext-v0.8.0.zip`

# App Tower Next v0.8.0

Experimental Manifest V3 extension targeting Microsoft Edge and Google Chrome,
with a sidecar fallback path for Chromium-family browsers where
`chrome.sidePanel` is unavailable.

## v0.8.0 — browser layer, Workspaces and control plane

### BrowserAdapter

Browser-specific container operations are isolated in
`shared/browser-adapter.js`.

- Edge / Chrome with `chrome.sidePanel`: native browser Side Panel.
- Browser without the API: managed top-level sidecar window.
- UI skin hint:
  - Edge -> Fluent-like
  - Chrome -> Chromium-like
  - Yandex Browser -> Yandex-like

The Core does not depend directly on a browser-specific sidebar implementation.

A public Extensions API that exposes the user's native Edge/Chrome/Yandex
browser Workspace identity is not used because App Tower cannot rely on such an
API. App Tower instead binds its own active Workspace to the current browser
window for the session.

### Native-style Options page

The gear opens the extension Options page instead of growing the Side Panel
settings dialog.

The page has a browser-settings-like left navigation:

- General
- Appearance
- Workspaces
- Shortcuts
- Recent
- Sites
- Notifications
- Performance
- Modules
- Web Apps
- Sidecars
- Media
- Permissions
- Sync and data

Contextual `Site settings...` opens/focuses the same Options page and routes it
to the matching site.

### Workspaces

Each App Tower Workspace owns:

- shortcut tree (sites, groups, two-pane templates)
- top/bottom pane URLs and modes
- split state and split ratio

The active Workspace is bound to a browser window for the current session.
Workspace names and shortcut trees can be synchronized through Browser Sync;
open pane state remains local.

### Search

A magnifier is at the bottom of the expanded rail and collapsed rail.

Default command:

`Ctrl+Shift+Space` (`Command+Shift+Space` on macOS)

Search covers:

- sites
- groups
- two-pane templates
- Workspaces
- Recent App Tower entries
- App Tower commands

### Recent

App Tower keeps a bounded Recent list per Workspace. It is separate from the
rail and can be searched or opened from Options -> Recent.

### Resource sleeping

Normal web/media pane surfaces register a live resource lease.

Policy:

- idle web pane: unload after 5 minutes
- global hard cap: 1..6 live pane resources, default 6
- hidden pane is unloaded immediately
- `Never sleep` protects a site from the 5-minute idle timer
- the global hard cap still wins, so App Tower never intentionally keeps more
  live pane resources than the configured maximum

Resource leases live in `chrome.storage.session`, so MV3 service-worker
suspension does not reset the idle timer.

Sleeping unloads the iframe and keeps the App Tower pane URL/state. The pane can
be woken explicitly.

### Per-site settings

Options -> Sites currently provides per-origin:

- Zoom: 60%..150%
- Sleep policy: 5 minutes / Never sleep

Shortcut context menus provide renderer mode:

- Auto
- Secure
- Compatibility
- Real Page

### Notifications

Options -> Notifications uses the browser's site notification content setting
when the optional `contentSettings` permission is granted:

- Default
- Allow
- Block

Rules are rebuilt as a set so returning one origin to `Default` does not remove
the other App Tower notification rules.

Declarative modules may also declare notification categories. App Tower stores
the selected categories per origin. A module still needs an actual documented
integration to produce or filter those category-specific notifications.

### Native browser context menu

The normal browser page/link context menu contains App Tower actions:

- Open App Tower
- Add current page
- Open link in bottom pane
- Settings

The custom menu inside the Side Panel is styled for the detected browser,
because browsers do not expose an API for placing native context-menu widgets
inside an arbitrary extension page.

Shortcut menu actions include:

- Open
- Open in bottom pane
- Open separately
- Add to group
- Create two-pane template
- Auto / Secure / Compatibility / Real Page
- Site settings
- Duplicate
- Remove

### Sidecar Manager

Top-level Real Page / PWA sidecar windows are tracked in session state.
Options -> Sidecars can focus or close tracked sidecars.

### Media contract

`shared/media-contract.js` defines a provider-neutral state contract for
module-backed media surfaces.

The Core can expose an attached media surface in the rail/Options. Transport
controls such as play/pause are deliberately not fabricated: they are only
enabled when a provider module has a verified control API.

### Module Permissions dashboard

Options -> Permissions shows the BrowserAdapter capabilities and installed
declarative modules, including their host scope.

Modules remain data-only: no downloaded JavaScript/WASM is executed by the
module registry.

A module manifest may declare notification categories as metadata.

## v0.7.x shortcut organization

The rail supports mouse wheel, touchpad, touch/pen panning, overflow arrows,
groups with 1-2 letter badges, pointer drag/reorder, drag-to-group, and
two-pane templates with adjustable 20-80% favicon overlap.

## v0.6.x foundations

- System / Light / Dark theme
- system or custom accent
- modular Auto renderer
- PWA-aware discovery and top-level sidecar launch
- split panes
- persistent collapsed rail
- App Tower New Tab

## Browser notes

### Edge / Chrome

The main build uses the native Side Panel API when available.

### Yandex Browser

The runtime contains a sidecar fallback, but Yandex Browser compatibility is
not claimed as identical to Edge/Chrome until the actual target Yandex version
is tested. A fallback package can omit the Side Panel manifest key/permission
so installation does not depend on Yandex supporting that Chrome API.

## Install / update unpacked build

1. Extract the ZIP into a stable folder.
2. Open `edge://extensions` or `chrome://extensions`.
3. Enable Developer mode if needed.
4. Load unpacked, or replace the files of the already-loaded unpacked build.
5. Press Reload on App Tower Next.
6. Reload already-open HTTP/HTTPS pages so the current collapsed rail/content
   scripts are injected.

Do not uninstall the unpacked extension merely to update it if you want to keep
its local storage.

---

## v0.7.0 — `AppTowerNext-v0.7.0.zip`

# App Tower Next v0.7.0

Experimental Manifest V3 extension for Microsoft Edge and Google Chrome.

## v0.7.0 — shortcut organization

The App Tower rail is no longer a flat fixed-height shortcut list.

### Overflow and scrolling

The shortcut area is its own vertical scroll viewport.

Supported input:
- mouse wheel
- touchpad scrolling
- touchscreen / pen pan gesture
- explicit up/down buttons

The up/down buttons are hidden while every shortcut fits in the visible area.
When the list overflows, both buttons appear; the button at the reached edge is
disabled. The native scrollbar remains hidden to keep the 46 px rail clean.

The same behavior is implemented in:
- expanded Side Panel rail
- collapsed injected rail
- App Tower New Tab rail

### Groups

A new Group tool appears below Add.

A group has:
- a user-editable name
- a rail icon generated from the first one or two letters of that name
- child site/template shortcuts

Clicking a group opens its contents. Dropping a top-level shortcut onto an
existing group adds it to that group. Nested groups are intentionally not
supported in this version.

Groups can be renamed and dissolved back into top-level shortcuts.

### Pointer drag

Top-level shortcut organization uses Pointer Events instead of desktop-only
HTML drag/drop.

- Mouse: move after pointer-down to start dragging.
- Touch / pen: hold for about 360 ms, then drag.
- Normal touch movement before the hold threshold remains native vertical
  scrolling.

Drop zones:
- upper quarter of an icon: move before
- lower quarter: move after
- center: combine / add to group

On touch/pen, holding a Group or Template without moving opens its editor.

### Two-pane templates

Dropping one normal site shortcut onto another asks whether to create:
- a Group
- a two-pane Template

A Template contains exactly two site shortcuts:
- Top site
- Bottom site

By default the dragged shortcut becomes Top. The editor can swap Top/Bottom.
Clicking the template opens both panes at once and selects the top pane.

The template icon shows the two site favicons overlaid. The Top site's favicon
has the higher visual z-order, matching the pane it opens into.

Per-template overlap is adjustable from 20% to 80% (default 50%). The template
editor also supports rename, Top/Bottom swap and dissolving the template back
into two ordinary shortcuts.

Desktop: right-click a template to edit it.
Touch/pen: hold the template without moving to open the editor.

### Persistence

The historical `sites` storage key is retained for compatibility, but its
entries are now a shortcut tree:

```text
site

group
  site
  template

template
  top: site
  bottom: site
  overlap: 50
```

State schema is 12. Existing flat shortcuts are migrated to `kind: site`.

JSON Export schema 5 preserves groups and templates. Browser Sync schema 3 also
carries the shortcut tree.

## Existing v0.6.x features

- unified System / Light / Dark theme
- system or custom accent color
- modular Auto renderer
- installable declarative provider modules
- PWA-aware Auto / top-level sidecar launcher
- split panes
- persistent collapsed App Tower rail at `document_start`
- App Tower New Tab

## Install / update unpacked build

1. Extract the ZIP into a clean folder, or replace the files in the current
   unpacked extension directory.
2. Open `edge://extensions` or `chrome://extensions`.
3. Press Reload on App Tower Next.
4. Reload already-open HTTP/HTTPS tabs so the updated collapsed rail is injected.

---

## v0.6.1 — `AppTowerNext-v0.6.1.zip`

# App Tower Next v0.6.1

Experimental Manifest V3 extension for Microsoft Edge and Google Chrome.

## v0.6.1 — unified appearance

App Tower now has one local appearance configuration shared by:
- expanded native Side Panel UI
- collapsed injected App Tower rail
- App Tower New Tab page

### Theme mode

Settings -> Appearance -> Theme:

- System
- Light
- Dark

`System` follows `prefers-color-scheme` and updates live when the operating
system/browser switches between light and dark appearance.

Manual Light/Dark selection overrides the OS preference for App Tower UI only.
Websites loaded in panes keep their own styling.

### Accent color

Settings -> Appearance -> Accent:

- System
- Custom color

In System mode App Tower asks the browser for the CSS system `AccentColor`.
If it is unavailable, App Tower falls back to its built-in teal accent.

Custom mode uses a native color picker. The chosen accent is applied to focus
rings, active rail state, primary actions, native checkboxes and theme preview.
Text contrast is derived from the resolved accent.

`Reset` restores:
- Theme: System
- Accent: System
- fallback custom color: `#45c9bc`

### Storage and backup

Theme settings are stored in `chrome.storage.local`.

They are intentionally not put in Browser Sync because System/Light/Dark and
desktop appearance can reasonably differ between devices.

JSON Export schema 4 includes:

```json
{
  "theme": {
    "mode": "system",
    "accentMode": "system",
    "accentColor": "#45c9bc"
  }
}
```

Older App Tower exports remain importable. If an older backup has no `theme`
section, the current local appearance is preserved.

## v0.6.0 — PWA-aware Auto

App Tower detects the standard Web App Manifest declared by normal web pages
without depending on Edge's deprecated PWA sidebar mechanism.

Auto priority:

1. Installed declarative App Tower module
2. PWA/App preference for a discovered Web App Manifest
3. Ordinary web iframe with scoped Compatibility when necessary

PWA App mode launches a top-level managed popup/sidecar through
`chrome.windows.create()` instead of loading the site in an iframe.

## Modules

Provider-specific integrations remain declarative modules rather than Core
JavaScript. The bundled catalog currently contains YouTube and Yandex Music.

Settings -> Modules supports installation/removal and validated JSON module
imports.

## Startup

The collapsed App Tower rail is injected at `document_start` on ordinary web
pages. App Tower also supplies its own New Tab page.

The browser-owned native Side Panel cannot be force-opened at browser startup;
`chrome.sidePanel.open()` still requires a user gesture.

## Install / update unpacked build

1. Extract the ZIP into a clean folder.
2. Open `edge://extensions` or `chrome://extensions`.
3. Enable Developer mode.
4. Load unpacked, or replace the files of the existing unpacked extension.
5. Press Reload for the extension.
6. Reload already-open HTTP/HTTPS tabs so the current rail/content scripts are
   injected into them.

---

## v0.6.0 — `AppTowerNext-v0.6.0.zip`

# App Tower Next v0.6.0

Experimental Manifest V3 extension for Microsoft Edge and Google Chrome.

## v0.6.0 — PWA-aware Auto

App Tower no longer depends on the deprecated Edge PWA sidebar mechanism.

The Core now detects the standard Web App Manifest declared by a normal page:

```html
<link rel="manifest" href="/manifest.webmanifest">
```

Discovery is performed by a dedicated `content/pwa-discovery.js` content script.
The background worker fetches the manifest, validates/sanitizes it and stores a
bounded local metadata cache.

Cached metadata includes:
- name / short_name
- start_url
- scope
- display
- icons
- shortcuts
- manifest URL

The cache is local discovery metadata and is not Browser Sync data.

## Auto priority

Auto uses this order:

1. Installed declarative App Tower module
2. PWA/App preference for a discovered Web App Manifest
3. Ordinary web iframe with scoped Compatibility when necessary

A specialized module therefore wins over generic PWA handling.

## PWA App mode

When a Web App Manifest is discovered, a small app button appears in that
pane's toolbar (unless an installed specialized module already owns the URL).

The PWA dialog shows the app name, start URL, display mode and manifest
shortcuts. Settings -> Web Apps lists discovered manifests and can clear the
rediscoverable cache.

The user can enable:

`Use app mode in Auto`

When enabled, App Tower does NOT load that site in the pane iframe. The pane
becomes a lightweight launcher.

`Open as app` creates a top-level browser popup/sidecar using
`chrome.windows.create()`.

This is intentionally NOT an Edge `edge_side_panel` integration and it is not
an attempt to control an installed OS/PWA shell. It is a normal top-level web
page in a managed popup window, so the page is no longer an iframe child of the
App Tower extension.

One sidecar window is reused per web-app origin while the background state is
available; the mapping is also persisted in `chrome.storage.session`.

Manifest shortcuts are exposed as launch buttons and open inside the same
sidecar app window.

## Add Site integration

If the Add Site URL belongs to a known but uninstalled provider module, App
Tower suggests the declarative module first.

If no provider module owns the URL and a Web App Manifest has already been
discovered, Add Site offers `Use App`.

## Modules

Provider-specific integrations remain outside Core logic:

- YouTube
- Yandex Music
- additional user JSON modules

A module is declarative data, not executable JavaScript/WASM.

Settings -> Modules supports:
- install bundled module
- remove module
- import validated module JSON

## Data / backup

`chrome.storage.local`
- sites
- panes
- layout
- installed declarative modules
- PWA manifest cache
- local PWA launch preferences

`chrome.storage.sync` (optional)
- shortcuts
- installed declarative module manifests

PWA launch preference is intentionally local because desktop/window layouts can
differ between devices.

JSON Export schema 3 includes:
- sites
- panes
- layout
- modules
- PWA sidecar preferences

PWA manifest cache is not exported because it is rediscoverable.

## Startup

The collapsed App Tower rail remains injected at `document_start`.

The extension also overrides New Tab with its own minimal start page, as in
v0.4.x/v0.5.x.

The native Side Panel still cannot be force-opened automatically at browser
startup because the browser requires a user gesture for `sidePanel.open()`.

## Install

1. Extract the ZIP to a clean folder.
2. Open `edge://extensions` or `chrome://extensions`.
3. Enable Developer mode.
4. Load unpacked and choose the folder containing `manifest.json`.
5. Reload already-open HTTP/HTTPS tabs after updating an unpacked build.

---

## v0.5.0 — `AppTowerNext-v0.5.0.zip`

# App Tower Next v0.5.0

Experimental Manifest V3 extension for Microsoft Edge and Google Chrome.

## What changed in v0.5.0

App Tower now has a real declarative module layer.

The Core still owns:
- persistent App Tower rail
- native Side Panel integration
- split panes
- Auto / Secure / Compatibility / Real Page
- startup / New Tab behavior
- shortcuts, Browser Sync and JSON backup
- a fixed safe renderer engine

Provider-specific media behavior is no longer hard-coded into `sidepanel.js`.

Bundled optional modules:
- `YouTube`
- `Яндекс Музыка`

They are described by JSON manifests under `modules/` and are copied to
`chrome.storage.local.atnInstalledModules` only when installed.

A fresh v0.5.0 install starts with no optional media modules enabled.
An upgrade from an older App Tower build automatically installs YouTube and
Yandex Music once so existing behavior is not lost; either module can then be
removed from Settings.

## Module Manager

Settings -> Modules shows available and installed declarative adapters.

Supported actions:
- Install a bundled module
- Remove a module
- Install an additional module from a JSON file

The Add Site dialog also suggests a matching module when the current URL belongs
to a known provider but its module is not installed.

## Security model

A module is data, not executable code.

The module loader accepts only the App Tower declarative schema:
- module metadata
- host hints
- bounded URL regex matchers
- media renderer type
- URL templates built from regex captures
- fixed height / fill / aspect-ratio layout hints

JavaScript, WASM, remote script URLs and arbitrary commands are not part of the
schema and are ignored/rejected by the validator. The executable logic remains
inside the reviewed extension package.

## Data / Sync

JSON Export now includes installed module manifests as well as shortcuts, panes
and layout. Import can merge or replace them.

Browser Sync payload schema 2 also carries the installed declarative module
manifests. Old schema-1 sync payloads remain accepted and do not wipe local
modules.

## Current bundled module behavior

### YouTube
Recognizes:
- `youtube.com/watch?v=...`
- `youtube.com/shorts/...`
- `youtube.com/embed/...`
- `youtube.com/live/...`
- `youtu.be/...`

Renderer: official `youtube-nocookie.com` 16:9 embed.

### Яндекс Музыка
Recognizes:
- `/album/<albumId>/track/<trackId>` -> 180 px track player
- `/album/<albumId>` -> fill-height album player
- `/users/<owner>/playlists/<playlistId>` -> fill-height legacy/public playlist
- already-embedded `/iframe/` URLs

Unsupported/new/private Yandex Music URL forms simply fall back to the ordinary
Auto web renderer.

## Install

1. Extract the ZIP into a clean folder.
2. Open `edge://extensions` or `chrome://extensions`.
3. Enable Developer mode.
4. Load unpacked and select the folder containing `manifest.json`.
5. Reload already-open HTTP/HTTPS tabs after updating an unpacked build.

## Notes

The browser-owned native Side Panel still cannot be automatically expanded at
browser startup because `chrome.sidePanel.open()` requires a user gesture.
The collapsed App Tower rail is injected at `document_start` and remains the
startup-presence mechanism.

---

## v0.4.2 — `AppTowerNext-v0.4.2.zip`

# App Tower Next v0.4.2

Experimental Manifest V3 extension for Microsoft Edge and Google Chrome.

## v0.4.2

- Removed the development default shortcuts (Yandex Translate / Google / GitHub / YouTube).
- Added Home onboarding when no shortcuts exist.
- `+` now opens the Add Site dialog prefilled from the active browser tab.
- The broom button clears the prefilled title/URL so an arbitrary site can be entered.
- Home provides Add current page, Add arbitrary site, Import, and Browser Sync.
- Settings provides Browser Sync on/off and JSON Export / Import.
- Browser Sync uses `chrome.storage.sync` for shortcut definitions only. Current panes, split ratio and active layout remain local to the device.
- JSON backup includes shortcuts, panes and layout. Import supports Merge or Replace.
- Fixed collapsed rail disappearing after `>` collapse by keeping an explicit per-window collapse intent across Side Panel port/onClosed races.
- Collapse broadcasts the page rail immediately and then invokes native `chrome.sidePanel.close()` without waiting for the background worker.

## Data model

- `chrome.storage.local`: working state and local layout.
- `chrome.storage.sync`: optional synced shortcut payload.
- Uninstall removes extension-local data as expected by Chromium.
- JSON Export is the explicit portable backup path.

## Install

1. Extract the ZIP into a clean folder.
2. Open `edge://extensions` or `chrome://extensions`.
3. Enable Developer mode.
4. Load unpacked and select the folder containing `manifest.json`.
5. Reload already-open HTTP/HTTPS tabs after updating an unpacked build.

## Security note

Compatibility mode removes frame-blocking response headers only for domains attached to a pane. Use Secure or Real Page for sensitive login/password pages when appropriate.


## v0.4.2

- The Add Site broom moved to the top-right corner and resets the whole form:
  title, URL, mode and compatibility domains.
- Collapse no longer shows or resizes the underlying page before Chromium has
  actually closed the native Side Panel.
- `sidePanel.onClosed` is authoritative for the collapsed state, so the browser
  owned native Side Panel X also naturally collapses back to App Tower.
- A stale Side Panel runtime port cannot override the collapsed state because
  `collapsedWindows` is persisted before the external rail is broadcast.


## v0.4.2

- Auto (`A`) is now the canonical default mode everywhere.
- Typing a URL manually into either pane always starts that new URL in Auto.
- Empty panes use Auto.
- New shortcuts default to Auto; an explicitly selected S/C/R shortcut keeps
  that configured mode.
- Auto is no longer silently persisted as Compatibility. The UI/state stays
  `A`; runtime logic decides whether scoped Compatibility is required.
- Schema 8 migrates old manually-entered S/C pane state back to Auto. Shortcut
  modes are preserved.
- Added the first compact media adapter: a Yandex Music track URL in the form
  `/album/<albumId>/track/<trackId>` is rendered through Yandex's official
  `/iframe/#track/<trackId>/<albumId>` player while the pane remains in Auto.


## v0.4.2

- Auto media renderer now presents supported services as compact player cards instead of full pages.
  Yandex Music track links use the documented 180 px official embed; YouTube video URLs use youtube-nocookie embeds.
- The collapsed App Tower rail is painted/reserved immediately from the static `document_start` content script, then reconciled with the persistent global X state.
- `runtime.onStartup` also performs a recovery injection pass for already-restored web tabs.
- The package overrides the browser New Tab page with a minimal App Tower start page so the rail exists on Ctrl+T and when the browser starts on a New Tab page.
- Browser-internal pages such as `edge://settings`, `edge://extensions`, downloads UI, the PDF viewer and other privileged surfaces still cannot be modified by a normal extension.
- The native Side Panel itself still cannot be programmatically opened on browser startup because `sidePanel.open()` requires a user action. Startup therefore guarantees the collapsed App Tower rail, not an expanded native side panel.


## v0.4.2 media UI

- Removed the App Tower card around official media embeds.
- The pane toolbar is the only App Tower chrome; the official player appears
  directly below it.
- Yandex Music track: full pane width, official 180 px embed.
- YouTube: full pane width, official 16:9 embed.
- AUTO remains visible only as the pane mode button `A`, not as a second badge.


## v0.4.2 Yandex Music entities

Auto now classifies Yandex Music URLs instead of treating the service as
track-only:

- `/album/<albumId>/track/<trackId>` -> compact track embed (180 px)
- `/album/<albumId>` -> album embed with track list
- `/users/<owner>/playlists/<playlistId>` -> playlist embed with track list
- the classic "Liked / Мне нравится" URL is handled through the same playlist
  route when that playlist is accessible for embedding
- `/playlists/<uuid>`, `/artist/<id>`, collection pages, My Wave and other
  account/service pages intentionally fall back to the normal Auto web renderer
  because this build does not have a verified public embed mapping for them.

The current Yandex public help explicitly documents the track iframe form.
Album/legacy-playlist iframe routes are treated as established compatibility
routes rather than claimed as newly documented public API.

---

## v0.4.1 — `AppTowerNext-v0.4.1.zip`

# App Tower Next v0.4.1

Experimental Manifest V3 extension for Microsoft Edge and Google Chrome.

## v0.4.1

- Removed the development default shortcuts (Yandex Translate / Google / GitHub / YouTube).
- Added Home onboarding when no shortcuts exist.
- `+` now opens the Add Site dialog prefilled from the active browser tab.
- The broom button clears the prefilled title/URL so an arbitrary site can be entered.
- Home provides Add current page, Add arbitrary site, Import, and Browser Sync.
- Settings provides Browser Sync on/off and JSON Export / Import.
- Browser Sync uses `chrome.storage.sync` for shortcut definitions only. Current panes, split ratio and active layout remain local to the device.
- JSON backup includes shortcuts, panes and layout. Import supports Merge or Replace.
- Fixed collapsed rail disappearing after `>` collapse by keeping an explicit per-window collapse intent across Side Panel port/onClosed races.
- Collapse broadcasts the page rail immediately and then invokes native `chrome.sidePanel.close()` without waiting for the background worker.

## Data model

- `chrome.storage.local`: working state and local layout.
- `chrome.storage.sync`: optional synced shortcut payload.
- Uninstall removes extension-local data as expected by Chromium.
- JSON Export is the explicit portable backup path.

## Install

1. Extract the ZIP into a clean folder.
2. Open `edge://extensions` or `chrome://extensions`.
3. Enable Developer mode.
4. Load unpacked and select the folder containing `manifest.json`.
5. Reload already-open HTTP/HTTPS tabs after updating an unpacked build.

## Security note

Compatibility mode removes frame-blocking response headers only for domains attached to a pane. Use Secure or Real Page for sensitive login/password pages when appropriate.


## v0.4.1

- The Add Site broom moved to the top-right corner and resets the whole form:
  title, URL, mode and compatibility domains.
- Collapse no longer shows or resizes the underlying page before Chromium has
  actually closed the native Side Panel.
- `sidePanel.onClosed` is authoritative for the collapsed state, so the browser
  owned native Side Panel X also naturally collapses back to App Tower.
- A stale Side Panel runtime port cannot override the collapsed state because
  `collapsedWindows` is persisted before the external rail is broadcast.


## v0.4.1

- Auto (`A`) is now the canonical default mode everywhere.
- Typing a URL manually into either pane always starts that new URL in Auto.
- Empty panes use Auto.
- New shortcuts default to Auto; an explicitly selected S/C/R shortcut keeps
  that configured mode.
- Auto is no longer silently persisted as Compatibility. The UI/state stays
  `A`; runtime logic decides whether scoped Compatibility is required.
- Schema 8 migrates old manually-entered S/C pane state back to Auto. Shortcut
  modes are preserved.
- Added the first compact media adapter: a Yandex Music track URL in the form
  `/album/<albumId>/track/<trackId>` is rendered through Yandex's official
  `/iframe/#track/<trackId>/<albumId>` player while the pane remains in Auto.


## v0.4.1

- Auto media renderer now presents supported services as compact player cards instead of full pages.
  Yandex Music track links use the documented 180 px official embed; YouTube video URLs use youtube-nocookie embeds.
- The collapsed App Tower rail is painted/reserved immediately from the static `document_start` content script, then reconciled with the persistent global X state.
- `runtime.onStartup` also performs a recovery injection pass for already-restored web tabs.
- The package overrides the browser New Tab page with a minimal App Tower start page so the rail exists on Ctrl+T and when the browser starts on a New Tab page.
- Browser-internal pages such as `edge://settings`, `edge://extensions`, downloads UI, the PDF viewer and other privileged surfaces still cannot be modified by a normal extension.
- The native Side Panel itself still cannot be programmatically opened on browser startup because `sidePanel.open()` requires a user action. Startup therefore guarantees the collapsed App Tower rail, not an expanded native side panel.


## v0.4.1 media UI

- Removed the App Tower card around official media embeds.
- The pane toolbar is the only App Tower chrome; the official player appears
  directly below it.
- Yandex Music track: full pane width, official 180 px embed.
- YouTube: full pane width, official 16:9 embed.
- AUTO remains visible only as the pane mode button `A`, not as a second badge.

---

## v0.4.0 — `AppTowerNext-v0.4.0.zip`

# App Tower Next v0.4.0

Experimental Manifest V3 extension for Microsoft Edge and Google Chrome.

## v0.4.0

- Removed the development default shortcuts (Yandex Translate / Google / GitHub / YouTube).
- Added Home onboarding when no shortcuts exist.
- `+` now opens the Add Site dialog prefilled from the active browser tab.
- The broom button clears the prefilled title/URL so an arbitrary site can be entered.
- Home provides Add current page, Add arbitrary site, Import, and Browser Sync.
- Settings provides Browser Sync on/off and JSON Export / Import.
- Browser Sync uses `chrome.storage.sync` for shortcut definitions only. Current panes, split ratio and active layout remain local to the device.
- JSON backup includes shortcuts, panes and layout. Import supports Merge or Replace.
- Fixed collapsed rail disappearing after `>` collapse by keeping an explicit per-window collapse intent across Side Panel port/onClosed races.
- Collapse broadcasts the page rail immediately and then invokes native `chrome.sidePanel.close()` without waiting for the background worker.

## Data model

- `chrome.storage.local`: working state and local layout.
- `chrome.storage.sync`: optional synced shortcut payload.
- Uninstall removes extension-local data as expected by Chromium.
- JSON Export is the explicit portable backup path.

## Install

1. Extract the ZIP into a clean folder.
2. Open `edge://extensions` or `chrome://extensions`.
3. Enable Developer mode.
4. Load unpacked and select the folder containing `manifest.json`.
5. Reload already-open HTTP/HTTPS tabs after updating an unpacked build.

## Security note

Compatibility mode removes frame-blocking response headers only for domains attached to a pane. Use Secure or Real Page for sensitive login/password pages when appropriate.


## v0.4.0

- The Add Site broom moved to the top-right corner and resets the whole form:
  title, URL, mode and compatibility domains.
- Collapse no longer shows or resizes the underlying page before Chromium has
  actually closed the native Side Panel.
- `sidePanel.onClosed` is authoritative for the collapsed state, so the browser
  owned native Side Panel X also naturally collapses back to App Tower.
- A stale Side Panel runtime port cannot override the collapsed state because
  `collapsedWindows` is persisted before the external rail is broadcast.


## v0.4.0

- Auto (`A`) is now the canonical default mode everywhere.
- Typing a URL manually into either pane always starts that new URL in Auto.
- Empty panes use Auto.
- New shortcuts default to Auto; an explicitly selected S/C/R shortcut keeps
  that configured mode.
- Auto is no longer silently persisted as Compatibility. The UI/state stays
  `A`; runtime logic decides whether scoped Compatibility is required.
- Schema 8 migrates old manually-entered S/C pane state back to Auto. Shortcut
  modes are preserved.
- Added the first compact media adapter: a Yandex Music track URL in the form
  `/album/<albumId>/track/<trackId>` is rendered through Yandex's official
  `/iframe/#track/<trackId>/<albumId>` player while the pane remains in Auto.


## v0.4.0

- Auto media renderer now presents supported services as compact player cards instead of full pages.
  Yandex Music track links use the documented 180 px official embed; YouTube video URLs use youtube-nocookie embeds.
- The collapsed App Tower rail is painted/reserved immediately from the static `document_start` content script, then reconciled with the persistent global X state.
- `runtime.onStartup` also performs a recovery injection pass for already-restored web tabs.
- The package overrides the browser New Tab page with a minimal App Tower start page so the rail exists on Ctrl+T and when the browser starts on a New Tab page.
- Browser-internal pages such as `edge://settings`, `edge://extensions`, downloads UI, the PDF viewer and other privileged surfaces still cannot be modified by a normal extension.
- The native Side Panel itself still cannot be programmatically opened on browser startup because `sidePanel.open()` requires a user action. Startup therefore guarantees the collapsed App Tower rail, not an expanded native side panel.

---

## v0.3.8 — `AppTowerNext-v0.3.8.zip`

# App Tower Next v0.3.8

Experimental Manifest V3 extension for Microsoft Edge and Google Chrome.

## v0.3.8

- Removed the development default shortcuts (Yandex Translate / Google / GitHub / YouTube).
- Added Home onboarding when no shortcuts exist.
- `+` now opens the Add Site dialog prefilled from the active browser tab.
- The broom button clears the prefilled title/URL so an arbitrary site can be entered.
- Home provides Add current page, Add arbitrary site, Import, and Browser Sync.
- Settings provides Browser Sync on/off and JSON Export / Import.
- Browser Sync uses `chrome.storage.sync` for shortcut definitions only. Current panes, split ratio and active layout remain local to the device.
- JSON backup includes shortcuts, panes and layout. Import supports Merge or Replace.
- Fixed collapsed rail disappearing after `>` collapse by keeping an explicit per-window collapse intent across Side Panel port/onClosed races.
- Collapse broadcasts the page rail immediately and then invokes native `chrome.sidePanel.close()` without waiting for the background worker.

## Data model

- `chrome.storage.local`: working state and local layout.
- `chrome.storage.sync`: optional synced shortcut payload.
- Uninstall removes extension-local data as expected by Chromium.
- JSON Export is the explicit portable backup path.

## Install

1. Extract the ZIP into a clean folder.
2. Open `edge://extensions` or `chrome://extensions`.
3. Enable Developer mode.
4. Load unpacked and select the folder containing `manifest.json`.
5. Reload already-open HTTP/HTTPS tabs after updating an unpacked build.

## Security note

Compatibility mode removes frame-blocking response headers only for domains attached to a pane. Use Secure or Real Page for sensitive login/password pages when appropriate.


## v0.3.8

- The Add Site broom moved to the top-right corner and resets the whole form:
  title, URL, mode and compatibility domains.
- Collapse no longer shows or resizes the underlying page before Chromium has
  actually closed the native Side Panel.
- `sidePanel.onClosed` is authoritative for the collapsed state, so the browser
  owned native Side Panel X also naturally collapses back to App Tower.
- A stale Side Panel runtime port cannot override the collapsed state because
  `collapsedWindows` is persisted before the external rail is broadcast.


## v0.3.8

- Auto (`A`) is now the canonical default mode everywhere.
- Typing a URL manually into either pane always starts that new URL in Auto.
- Empty panes use Auto.
- New shortcuts default to Auto; an explicitly selected S/C/R shortcut keeps
  that configured mode.
- Auto is no longer silently persisted as Compatibility. The UI/state stays
  `A`; runtime logic decides whether scoped Compatibility is required.
- Schema 8 migrates old manually-entered S/C pane state back to Auto. Shortcut
  modes are preserved.
- Added the first compact media adapter: a Yandex Music track URL in the form
  `/album/<albumId>/track/<trackId>` is rendered through Yandex's official
  `/iframe/#track/<trackId>/<albumId>` player while the pane remains in Auto.

---

## v0.3.7 — `AppTowerNext-v0.3.7.zip`

# App Tower Next v0.3.7

Experimental Manifest V3 extension for Microsoft Edge and Google Chrome.

## v0.3.7

- Removed the development default shortcuts (Yandex Translate / Google / GitHub / YouTube).
- Added Home onboarding when no shortcuts exist.
- `+` now opens the Add Site dialog prefilled from the active browser tab.
- The broom button clears the prefilled title/URL so an arbitrary site can be entered.
- Home provides Add current page, Add arbitrary site, Import, and Browser Sync.
- Settings provides Browser Sync on/off and JSON Export / Import.
- Browser Sync uses `chrome.storage.sync` for shortcut definitions only. Current panes, split ratio and active layout remain local to the device.
- JSON backup includes shortcuts, panes and layout. Import supports Merge or Replace.
- Fixed collapsed rail disappearing after `>` collapse by keeping an explicit per-window collapse intent across Side Panel port/onClosed races.
- Collapse broadcasts the page rail immediately and then invokes native `chrome.sidePanel.close()` without waiting for the background worker.

## Data model

- `chrome.storage.local`: working state and local layout.
- `chrome.storage.sync`: optional synced shortcut payload.
- Uninstall removes extension-local data as expected by Chromium.
- JSON Export is the explicit portable backup path.

## Install

1. Extract the ZIP into a clean folder.
2. Open `edge://extensions` or `chrome://extensions`.
3. Enable Developer mode.
4. Load unpacked and select the folder containing `manifest.json`.
5. Reload already-open HTTP/HTTPS tabs after updating an unpacked build.

## Security note

Compatibility mode removes frame-blocking response headers only for domains attached to a pane. Use Secure or Real Page for sensitive login/password pages when appropriate.


## v0.3.7

- The Add Site broom moved to the top-right corner and resets the whole form:
  title, URL, mode and compatibility domains.
- Collapse no longer shows or resizes the underlying page before Chromium has
  actually closed the native Side Panel.
- `sidePanel.onClosed` is authoritative for the collapsed state, so the browser
  owned native Side Panel X also naturally collapses back to App Tower.
- A stale Side Panel runtime port cannot override the collapsed state because
  `collapsedWindows` is persisted before the external rail is broadcast.

---

## v0.3.6 — `AppTowerNext-v0.3.6.zip`

# App Tower Next v0.3.6

Experimental Manifest V3 extension for Microsoft Edge and Google Chrome.

## v0.3.6

- Removed the development default shortcuts (Yandex Translate / Google / GitHub / YouTube).
- Added Home onboarding when no shortcuts exist.
- `+` now opens the Add Site dialog prefilled from the active browser tab.
- The broom button clears the prefilled title/URL so an arbitrary site can be entered.
- Home provides Add current page, Add arbitrary site, Import, and Browser Sync.
- Settings provides Browser Sync on/off and JSON Export / Import.
- Browser Sync uses `chrome.storage.sync` for shortcut definitions only. Current panes, split ratio and active layout remain local to the device.
- JSON backup includes shortcuts, panes and layout. Import supports Merge or Replace.
- Fixed collapsed rail disappearing after `>` collapse by keeping an explicit per-window collapse intent across Side Panel port/onClosed races.
- Collapse broadcasts the page rail immediately and then invokes native `chrome.sidePanel.close()` without waiting for the background worker.

## Data model

- `chrome.storage.local`: working state and local layout.
- `chrome.storage.sync`: optional synced shortcut payload.
- Uninstall removes extension-local data as expected by Chromium.
- JSON Export is the explicit portable backup path.

## Install

1. Extract the ZIP into a clean folder.
2. Open `edge://extensions` or `chrome://extensions`.
3. Enable Developer mode.
4. Load unpacked and select the folder containing `manifest.json`.
5. Reload already-open HTTP/HTTPS tabs after updating an unpacked build.

## Security note

Compatibility mode removes frame-blocking response headers only for domains attached to a pane. Use Secure or Real Page for sensitive login/password pages when appropriate.

---

## v0.3.5 — `AppTowerNext-v0.3.5.zip`

# App Tower Next v0.3.5

Test build for Microsoft Edge and Google Chrome (Manifest V3).

## v0.2.9 changes

- Reworked collapsed App Tower page reservation using the same proven strategy as the audited Classic Sidebar:
  root right padding + scrollbar relocation + fixed-right element adjustment.
- This is intended to stop the 46 px rail from covering page content on browser start and after collapse.
- Internal panel controls moved to match the requested layout:
  - split (1/2 panes) stays in the content header;
  - collapse moved to the top of the right App Tower rail;
  - only one `+` remains, directly after the site shortcuts;
  - site shortcuts grow downward as sites are added;
  - Settings stays at the bottom.
- External collapsed rail follows the same shortcuts → `+` → Settings arrangement.
- Fluent/MDL2 system glyphs remain preferred for Add, Settings, and Collapse.

## Native Side Panel width limitation

The public Chromium `chrome.sidePanel` API still does not expose a width setter/resetter.
Edge 151 can therefore reset an extension Side Panel width when it is closed and reopened,
and the extension cannot reliably force the previous width back.

If exact automatic width restoration becomes a hard requirement, the expanded renderer has
to move away from native `chrome.sidePanel` to a controllable sidecar browser window/native
helper. That trade-off is intentionally not made in this build.

## Install

Use a new empty folder for this build, then load it from `edge://extensions` /
`chrome://extensions` with Developer mode enabled. Keep only one App Tower Next installed.
Refresh already-open web tabs once so their content script is updated.

## Security

Compatibility mode removes frame-blocking CSP/X-Frame-Options only for the pane's configured
domains. Secure mode leaves them unchanged. Real Page uses a top-level browser page.

No telemetry, analytics, remote JavaScript, sync backend, or cloud service is included.


## v0.3.5 changes

- Collapsed App Tower now keeps a permanent Expand control at the very top. It reopens the native Side Panel without changing saved pane URLs, split ratio, active pane, or one/two-pane state.
- The open-panel Collapse control and the 1/2-layout control share the same 44 px row and are visually aligned.
- The page rail starts at `document_start` and reserves its 46 px immediately on normal HTTP/HTTPS pages.
- Right-edge compensation also recognizes sticky elements.
- Native Edge/Chrome New Tab pages (`edge://newtab`, `chrome://newtab`) are browser-internal pages and cannot receive this content-script rail. Showing App Tower there requires replacing New Tab with an extension-owned page using `chrome_url_overrides`; v0.3.5 deliberately does not replace the user's native New Tab page.


## v0.3.5 fixes

- Collapse is guarded against a stale/reconnecting Side Panel runtime port.
  The page App Tower is reasserted after the native panel closes.
- The native-panel layout button and rail collapse/expand button now share one
  exact 44 px control row and one border line; the extra separator/margins were
  removed.
- A blocked iframe can still activate its pane: focus of the iframe element is
  used as a fallback when the embedded content script cannot run.
- The collapsed rail keeps its expand button in the same aligned top row.


## v0.3.5 fixes

- Removed the artificial `html -> body` scrollbar relocation. It was the source
  of the extra bottom horizontal scrollbar on the first restored tab.
- The page keeps its native scrollbar at the far right; the collapsed App Tower
  is positioned immediately to the left of that scrollbar.
- The root document only reserves the 46 px rail and clips accidental root
  horizontal overflow instead of creating a second scroll container.
- The collapsed rail now mirrors the expanded visual structure:
  native-like 56 px close row -> 44 px expand row -> shortcuts -> separator ->
  Add -> Settings.
- Added a Fluent close (`X`) control to the collapsed rail. It hides App Tower
  on the current document; explicitly opening the native Side Panel resets that
  local dismissal.
- Restored the short top and bottom rail separators. The top separator is drawn
  at `bottom: 0` inside the same 44 px row, so it no longer shifts the right
  control line relative to the main layout button.


## v0.3.5 fixes

- The collapsed rail now makes the root layout box 46 px narrower instead of
  relying on right padding. This handles restored/startup pages whose layout
  uses the root width and prevents their ordinary content from rendering under
  App Tower.
- The collapsed `X` is drawn as a deterministic 14 px CSS cross inside the same
  36 x 36 control box as the other rail buttons, so the system font cannot
  render it oversized.
- Collapse now calls `chrome.sidePanel.close()` directly from the Side Panel
  user click. The background worker only prepares rail state; the close itself
  no longer waits on a worker request/response round-trip.


## v0.3.5 fixes

- Fixed a real JavaScript error in right-edge fixed/sticky compensation:
  `vw` was referenced outside its scope, preventing some right-side page UI
  from being moved away from the collapsed rail.
- Startup reserve is applied synchronously at `document_start`.
- Page reserve uses a 46 px root padding plus `max-width:100%` on top-level
  page wrappers, avoiding the previous root-width experiment.
- Collapse/expand glyphs are exact SVG geometry (`>|` / `<|`), not font glyphs.
- Collapse calls `chrome.sidePanel.close()` as the first async operation in the
  user click handler. No pre-close background message or artificial delay is
  added by App Tower Next.


## v0.3.5 interaction model

- Collapse/expand is purely a UI state. There is no longer a "close this tab"
  concept.
- The `X` in collapsed App Tower is global: it disables App Tower in all tabs
  and windows, closes currently open App Tower side panels, and persists the
  disabled state across browser restarts.
- To enable App Tower again, click the App Tower Next browser-action icon
  (toolbar / Extensions menu). That direct user gesture re-enables App Tower
  globally and opens the last saved Side Panel state.
- The expanded and collapsed toggle icons are the same centered 16x16 SVG
  chevron with the same 1.6 px stroke. No vertical bar is drawn.
- Note: the `X` in the native Edge/Chrome Side Panel title bar belongs to the
  browser itself and cannot be repurposed by an extension; it still closes only
  the native Side Panel.

---

## v0.3.4 — `AppTowerNext-v0.3.4.zip`

# App Tower Next v0.3.4

Test build for Microsoft Edge and Google Chrome (Manifest V3).

## v0.2.9 changes

- Reworked collapsed App Tower page reservation using the same proven strategy as the audited Classic Sidebar:
  root right padding + scrollbar relocation + fixed-right element adjustment.
- This is intended to stop the 46 px rail from covering page content on browser start and after collapse.
- Internal panel controls moved to match the requested layout:
  - split (1/2 panes) stays in the content header;
  - collapse moved to the top of the right App Tower rail;
  - only one `+` remains, directly after the site shortcuts;
  - site shortcuts grow downward as sites are added;
  - Settings stays at the bottom.
- External collapsed rail follows the same shortcuts → `+` → Settings arrangement.
- Fluent/MDL2 system glyphs remain preferred for Add, Settings, and Collapse.

## Native Side Panel width limitation

The public Chromium `chrome.sidePanel` API still does not expose a width setter/resetter.
Edge 151 can therefore reset an extension Side Panel width when it is closed and reopened,
and the extension cannot reliably force the previous width back.

If exact automatic width restoration becomes a hard requirement, the expanded renderer has
to move away from native `chrome.sidePanel` to a controllable sidecar browser window/native
helper. That trade-off is intentionally not made in this build.

## Install

Use a new empty folder for this build, then load it from `edge://extensions` /
`chrome://extensions` with Developer mode enabled. Keep only one App Tower Next installed.
Refresh already-open web tabs once so their content script is updated.

## Security

Compatibility mode removes frame-blocking CSP/X-Frame-Options only for the pane's configured
domains. Secure mode leaves them unchanged. Real Page uses a top-level browser page.

No telemetry, analytics, remote JavaScript, sync backend, or cloud service is included.


## v0.3.4 changes

- Collapsed App Tower now keeps a permanent Expand control at the very top. It reopens the native Side Panel without changing saved pane URLs, split ratio, active pane, or one/two-pane state.
- The open-panel Collapse control and the 1/2-layout control share the same 44 px row and are visually aligned.
- The page rail starts at `document_start` and reserves its 46 px immediately on normal HTTP/HTTPS pages.
- Right-edge compensation also recognizes sticky elements.
- Native Edge/Chrome New Tab pages (`edge://newtab`, `chrome://newtab`) are browser-internal pages and cannot receive this content-script rail. Showing App Tower there requires replacing New Tab with an extension-owned page using `chrome_url_overrides`; v0.3.4 deliberately does not replace the user's native New Tab page.


## v0.3.4 fixes

- Collapse is guarded against a stale/reconnecting Side Panel runtime port.
  The page App Tower is reasserted after the native panel closes.
- The native-panel layout button and rail collapse/expand button now share one
  exact 44 px control row and one border line; the extra separator/margins were
  removed.
- A blocked iframe can still activate its pane: focus of the iframe element is
  used as a fallback when the embedded content script cannot run.
- The collapsed rail keeps its expand button in the same aligned top row.


## v0.3.4 fixes

- Removed the artificial `html -> body` scrollbar relocation. It was the source
  of the extra bottom horizontal scrollbar on the first restored tab.
- The page keeps its native scrollbar at the far right; the collapsed App Tower
  is positioned immediately to the left of that scrollbar.
- The root document only reserves the 46 px rail and clips accidental root
  horizontal overflow instead of creating a second scroll container.
- The collapsed rail now mirrors the expanded visual structure:
  native-like 56 px close row -> 44 px expand row -> shortcuts -> separator ->
  Add -> Settings.
- Added a Fluent close (`X`) control to the collapsed rail. It hides App Tower
  on the current document; explicitly opening the native Side Panel resets that
  local dismissal.
- Restored the short top and bottom rail separators. The top separator is drawn
  at `bottom: 0` inside the same 44 px row, so it no longer shifts the right
  control line relative to the main layout button.


## v0.3.4 fixes

- The collapsed rail now makes the root layout box 46 px narrower instead of
  relying on right padding. This handles restored/startup pages whose layout
  uses the root width and prevents their ordinary content from rendering under
  App Tower.
- The collapsed `X` is drawn as a deterministic 14 px CSS cross inside the same
  36 x 36 control box as the other rail buttons, so the system font cannot
  render it oversized.
- Collapse now calls `chrome.sidePanel.close()` directly from the Side Panel
  user click. The background worker only prepares rail state; the close itself
  no longer waits on a worker request/response round-trip.


## v0.3.4 fixes

- Fixed a real JavaScript error in right-edge fixed/sticky compensation:
  `vw` was referenced outside its scope, preventing some right-side page UI
  from being moved away from the collapsed rail.
- Startup reserve is applied synchronously at `document_start`.
- Page reserve uses a 46 px root padding plus `max-width:100%` on top-level
  page wrappers, avoiding the previous root-width experiment.
- Collapse/expand glyphs are exact SVG geometry (`>|` / `<|`), not font glyphs.
- Collapse calls `chrome.sidePanel.close()` as the first async operation in the
  user click handler. No pre-close background message or artificial delay is
  added by App Tower Next.

---

## v0.3.3 — `AppTowerNext-v0.3.3.zip`

# App Tower Next v0.3.3

Test build for Microsoft Edge and Google Chrome (Manifest V3).

## v0.2.9 changes

- Reworked collapsed App Tower page reservation using the same proven strategy as the audited Classic Sidebar:
  root right padding + scrollbar relocation + fixed-right element adjustment.
- This is intended to stop the 46 px rail from covering page content on browser start and after collapse.
- Internal panel controls moved to match the requested layout:
  - split (1/2 panes) stays in the content header;
  - collapse moved to the top of the right App Tower rail;
  - only one `+` remains, directly after the site shortcuts;
  - site shortcuts grow downward as sites are added;
  - Settings stays at the bottom.
- External collapsed rail follows the same shortcuts → `+` → Settings arrangement.
- Fluent/MDL2 system glyphs remain preferred for Add, Settings, and Collapse.

## Native Side Panel width limitation

The public Chromium `chrome.sidePanel` API still does not expose a width setter/resetter.
Edge 151 can therefore reset an extension Side Panel width when it is closed and reopened,
and the extension cannot reliably force the previous width back.

If exact automatic width restoration becomes a hard requirement, the expanded renderer has
to move away from native `chrome.sidePanel` to a controllable sidecar browser window/native
helper. That trade-off is intentionally not made in this build.

## Install

Use a new empty folder for this build, then load it from `edge://extensions` /
`chrome://extensions` with Developer mode enabled. Keep only one App Tower Next installed.
Refresh already-open web tabs once so their content script is updated.

## Security

Compatibility mode removes frame-blocking CSP/X-Frame-Options only for the pane's configured
domains. Secure mode leaves them unchanged. Real Page uses a top-level browser page.

No telemetry, analytics, remote JavaScript, sync backend, or cloud service is included.


## v0.3.3 changes

- Collapsed App Tower now keeps a permanent Expand control at the very top. It reopens the native Side Panel without changing saved pane URLs, split ratio, active pane, or one/two-pane state.
- The open-panel Collapse control and the 1/2-layout control share the same 44 px row and are visually aligned.
- The page rail starts at `document_start` and reserves its 46 px immediately on normal HTTP/HTTPS pages.
- Right-edge compensation also recognizes sticky elements.
- Native Edge/Chrome New Tab pages (`edge://newtab`, `chrome://newtab`) are browser-internal pages and cannot receive this content-script rail. Showing App Tower there requires replacing New Tab with an extension-owned page using `chrome_url_overrides`; v0.3.3 deliberately does not replace the user's native New Tab page.


## v0.3.3 fixes

- Collapse is guarded against a stale/reconnecting Side Panel runtime port.
  The page App Tower is reasserted after the native panel closes.
- The native-panel layout button and rail collapse/expand button now share one
  exact 44 px control row and one border line; the extra separator/margins were
  removed.
- A blocked iframe can still activate its pane: focus of the iframe element is
  used as a fallback when the embedded content script cannot run.
- The collapsed rail keeps its expand button in the same aligned top row.


## v0.3.3 fixes

- Removed the artificial `html -> body` scrollbar relocation. It was the source
  of the extra bottom horizontal scrollbar on the first restored tab.
- The page keeps its native scrollbar at the far right; the collapsed App Tower
  is positioned immediately to the left of that scrollbar.
- The root document only reserves the 46 px rail and clips accidental root
  horizontal overflow instead of creating a second scroll container.
- The collapsed rail now mirrors the expanded visual structure:
  native-like 56 px close row -> 44 px expand row -> shortcuts -> separator ->
  Add -> Settings.
- Added a Fluent close (`X`) control to the collapsed rail. It hides App Tower
  on the current document; explicitly opening the native Side Panel resets that
  local dismissal.
- Restored the short top and bottom rail separators. The top separator is drawn
  at `bottom: 0` inside the same 44 px row, so it no longer shifts the right
  control line relative to the main layout button.


## v0.3.3 fixes

- The collapsed rail now makes the root layout box 46 px narrower instead of
  relying on right padding. This handles restored/startup pages whose layout
  uses the root width and prevents their ordinary content from rendering under
  App Tower.
- The collapsed `X` is drawn as a deterministic 14 px CSS cross inside the same
  36 x 36 control box as the other rail buttons, so the system font cannot
  render it oversized.
- Collapse now calls `chrome.sidePanel.close()` directly from the Side Panel
  user click. The background worker only prepares rail state; the close itself
  no longer waits on a worker request/response round-trip.

---

## v0.3.2 — `AppTowerNext-v0.3.2.zip`

# App Tower Next v0.3.2

Test build for Microsoft Edge and Google Chrome (Manifest V3).

## v0.2.9 changes

- Reworked collapsed App Tower page reservation using the same proven strategy as the audited Classic Sidebar:
  root right padding + scrollbar relocation + fixed-right element adjustment.
- This is intended to stop the 46 px rail from covering page content on browser start and after collapse.
- Internal panel controls moved to match the requested layout:
  - split (1/2 panes) stays in the content header;
  - collapse moved to the top of the right App Tower rail;
  - only one `+` remains, directly after the site shortcuts;
  - site shortcuts grow downward as sites are added;
  - Settings stays at the bottom.
- External collapsed rail follows the same shortcuts → `+` → Settings arrangement.
- Fluent/MDL2 system glyphs remain preferred for Add, Settings, and Collapse.

## Native Side Panel width limitation

The public Chromium `chrome.sidePanel` API still does not expose a width setter/resetter.
Edge 151 can therefore reset an extension Side Panel width when it is closed and reopened,
and the extension cannot reliably force the previous width back.

If exact automatic width restoration becomes a hard requirement, the expanded renderer has
to move away from native `chrome.sidePanel` to a controllable sidecar browser window/native
helper. That trade-off is intentionally not made in this build.

## Install

Use a new empty folder for this build, then load it from `edge://extensions` /
`chrome://extensions` with Developer mode enabled. Keep only one App Tower Next installed.
Refresh already-open web tabs once so their content script is updated.

## Security

Compatibility mode removes frame-blocking CSP/X-Frame-Options only for the pane's configured
domains. Secure mode leaves them unchanged. Real Page uses a top-level browser page.

No telemetry, analytics, remote JavaScript, sync backend, or cloud service is included.


## v0.3.2 changes

- Collapsed App Tower now keeps a permanent Expand control at the very top. It reopens the native Side Panel without changing saved pane URLs, split ratio, active pane, or one/two-pane state.
- The open-panel Collapse control and the 1/2-layout control share the same 44 px row and are visually aligned.
- The page rail starts at `document_start` and reserves its 46 px immediately on normal HTTP/HTTPS pages.
- Right-edge compensation also recognizes sticky elements.
- Native Edge/Chrome New Tab pages (`edge://newtab`, `chrome://newtab`) are browser-internal pages and cannot receive this content-script rail. Showing App Tower there requires replacing New Tab with an extension-owned page using `chrome_url_overrides`; v0.3.2 deliberately does not replace the user's native New Tab page.


## v0.3.2 fixes

- Collapse is guarded against a stale/reconnecting Side Panel runtime port.
  The page App Tower is reasserted after the native panel closes.
- The native-panel layout button and rail collapse/expand button now share one
  exact 44 px control row and one border line; the extra separator/margins were
  removed.
- A blocked iframe can still activate its pane: focus of the iframe element is
  used as a fallback when the embedded content script cannot run.
- The collapsed rail keeps its expand button in the same aligned top row.


## v0.3.2 fixes

- Removed the artificial `html -> body` scrollbar relocation. It was the source
  of the extra bottom horizontal scrollbar on the first restored tab.
- The page keeps its native scrollbar at the far right; the collapsed App Tower
  is positioned immediately to the left of that scrollbar.
- The root document only reserves the 46 px rail and clips accidental root
  horizontal overflow instead of creating a second scroll container.
- The collapsed rail now mirrors the expanded visual structure:
  native-like 56 px close row -> 44 px expand row -> shortcuts -> separator ->
  Add -> Settings.
- Added a Fluent close (`X`) control to the collapsed rail. It hides App Tower
  on the current document; explicitly opening the native Side Panel resets that
  local dismissal.
- Restored the short top and bottom rail separators. The top separator is drawn
  at `bottom: 0` inside the same 44 px row, so it no longer shifts the right
  control line relative to the main layout button.

---

## v0.3.1 — `AppTowerNext-v0.3.1.zip`

# App Tower Next v0.3.1

Test build for Microsoft Edge and Google Chrome (Manifest V3).

## v0.2.9 changes

- Reworked collapsed App Tower page reservation using the same proven strategy as the audited Classic Sidebar:
  root right padding + scrollbar relocation + fixed-right element adjustment.
- This is intended to stop the 46 px rail from covering page content on browser start and after collapse.
- Internal panel controls moved to match the requested layout:
  - split (1/2 panes) stays in the content header;
  - collapse moved to the top of the right App Tower rail;
  - only one `+` remains, directly after the site shortcuts;
  - site shortcuts grow downward as sites are added;
  - Settings stays at the bottom.
- External collapsed rail follows the same shortcuts → `+` → Settings arrangement.
- Fluent/MDL2 system glyphs remain preferred for Add, Settings, and Collapse.

## Native Side Panel width limitation

The public Chromium `chrome.sidePanel` API still does not expose a width setter/resetter.
Edge 151 can therefore reset an extension Side Panel width when it is closed and reopened,
and the extension cannot reliably force the previous width back.

If exact automatic width restoration becomes a hard requirement, the expanded renderer has
to move away from native `chrome.sidePanel` to a controllable sidecar browser window/native
helper. That trade-off is intentionally not made in this build.

## Install

Use a new empty folder for this build, then load it from `edge://extensions` /
`chrome://extensions` with Developer mode enabled. Keep only one App Tower Next installed.
Refresh already-open web tabs once so their content script is updated.

## Security

Compatibility mode removes frame-blocking CSP/X-Frame-Options only for the pane's configured
domains. Secure mode leaves them unchanged. Real Page uses a top-level browser page.

No telemetry, analytics, remote JavaScript, sync backend, or cloud service is included.


## v0.3.1 changes

- Collapsed App Tower now keeps a permanent Expand control at the very top. It reopens the native Side Panel without changing saved pane URLs, split ratio, active pane, or one/two-pane state.
- The open-panel Collapse control and the 1/2-layout control share the same 44 px row and are visually aligned.
- The page rail starts at `document_start` and reserves its 46 px immediately on normal HTTP/HTTPS pages.
- Right-edge compensation also recognizes sticky elements.
- Native Edge/Chrome New Tab pages (`edge://newtab`, `chrome://newtab`) are browser-internal pages and cannot receive this content-script rail. Showing App Tower there requires replacing New Tab with an extension-owned page using `chrome_url_overrides`; v0.3.1 deliberately does not replace the user's native New Tab page.


## v0.3.1 fixes

- Collapse is guarded against a stale/reconnecting Side Panel runtime port.
  The page App Tower is reasserted after the native panel closes.
- The native-panel layout button and rail collapse/expand button now share one
  exact 44 px control row and one border line; the extra separator/margins were
  removed.
- A blocked iframe can still activate its pane: focus of the iframe element is
  used as a fallback when the embedded content script cannot run.
- The collapsed rail keeps its expand button in the same aligned top row.

---

## v0.3.0 — `AppTowerNext-v0.3.0.zip`

# App Tower Next v0.3.0

Test build for Microsoft Edge and Google Chrome (Manifest V3).

## v0.2.9 changes

- Reworked collapsed App Tower page reservation using the same proven strategy as the audited Classic Sidebar:
  root right padding + scrollbar relocation + fixed-right element adjustment.
- This is intended to stop the 46 px rail from covering page content on browser start and after collapse.
- Internal panel controls moved to match the requested layout:
  - split (1/2 panes) stays in the content header;
  - collapse moved to the top of the right App Tower rail;
  - only one `+` remains, directly after the site shortcuts;
  - site shortcuts grow downward as sites are added;
  - Settings stays at the bottom.
- External collapsed rail follows the same shortcuts → `+` → Settings arrangement.
- Fluent/MDL2 system glyphs remain preferred for Add, Settings, and Collapse.

## Native Side Panel width limitation

The public Chromium `chrome.sidePanel` API still does not expose a width setter/resetter.
Edge 151 can therefore reset an extension Side Panel width when it is closed and reopened,
and the extension cannot reliably force the previous width back.

If exact automatic width restoration becomes a hard requirement, the expanded renderer has
to move away from native `chrome.sidePanel` to a controllable sidecar browser window/native
helper. That trade-off is intentionally not made in this build.

## Install

Use a new empty folder for this build, then load it from `edge://extensions` /
`chrome://extensions` with Developer mode enabled. Keep only one App Tower Next installed.
Refresh already-open web tabs once so their content script is updated.

## Security

Compatibility mode removes frame-blocking CSP/X-Frame-Options only for the pane's configured
domains. Secure mode leaves them unchanged. Real Page uses a top-level browser page.

No telemetry, analytics, remote JavaScript, sync backend, or cloud service is included.


## v0.3.0 changes

- Collapsed App Tower now keeps a permanent Expand control at the very top. It reopens the native Side Panel without changing saved pane URLs, split ratio, active pane, or one/two-pane state.
- The open-panel Collapse control and the 1/2-layout control share the same 44 px row and are visually aligned.
- The page rail starts at `document_start` and reserves its 46 px immediately on normal HTTP/HTTPS pages.
- Right-edge compensation also recognizes sticky elements.
- Native Edge/Chrome New Tab pages (`edge://newtab`, `chrome://newtab`) are browser-internal pages and cannot receive this content-script rail. Showing App Tower there requires replacing New Tab with an extension-owned page using `chrome_url_overrides`; v0.3.0 deliberately does not replace the user's native New Tab page.

---

## v0.2.9 — `AppTowerNext-v0.2.9.zip`

# App Tower Next v0.2.9

Test build for Microsoft Edge and Google Chrome (Manifest V3).

## v0.2.9 changes

- Reworked collapsed App Tower page reservation using the same proven strategy as the audited Classic Sidebar:
  root right padding + scrollbar relocation + fixed-right element adjustment.
- This is intended to stop the 46 px rail from covering page content on browser start and after collapse.
- Internal panel controls moved to match the requested layout:
  - split (1/2 panes) stays in the content header;
  - collapse moved to the top of the right App Tower rail;
  - only one `+` remains, directly after the site shortcuts;
  - site shortcuts grow downward as sites are added;
  - Settings stays at the bottom.
- External collapsed rail follows the same shortcuts → `+` → Settings arrangement.
- Fluent/MDL2 system glyphs remain preferred for Add, Settings, and Collapse.

## Native Side Panel width limitation

The public Chromium `chrome.sidePanel` API still does not expose a width setter/resetter.
Edge 151 can therefore reset an extension Side Panel width when it is closed and reopened,
and the extension cannot reliably force the previous width back.

If exact automatic width restoration becomes a hard requirement, the expanded renderer has
to move away from native `chrome.sidePanel` to a controllable sidecar browser window/native
helper. That trade-off is intentionally not made in this build.

## Install

Use a new empty folder for this build, then load it from `edge://extensions` /
`chrome://extensions` with Developer mode enabled. Keep only one App Tower Next installed.
Refresh already-open web tabs once so their content script is updated.

## Security

Compatibility mode removes frame-blocking CSP/X-Frame-Options only for the pane's configured
domains. Secure mode leaves them unchanged. Real Page uses a top-level browser page.

No telemetry, analytics, remote JavaScript, sync backend, or cloud service is included.

---

## v0.2.8 — `AppTowerNext-v0.2.8.zip`

# App Tower Next v0.2.8

Test build for current Microsoft Edge / Google Chrome (Manifest V3).

## New in v0.2.8

- Added **Collapse to App Tower** button in the native side-panel header. It closes only the expanded Side Panel and immediately reveals the 46 px App Tower rail on the current web page.
- Added the same collapse action to Settings.
- Replaced custom add/settings artwork with Windows **Segoe Fluent Icons** when available (`Add` U+E710, `Settings` U+E713, `ChevronRight` U+E76C), with symbol fallback outside Windows.
- Keeps v0.2.7 pane activation bridge, split workspace, compatibility renderer, YouTube support and rail stability fixes.

## Chromium limitations

### Full panel auto-open on browser startup
The public Side Panel API permits `chrome.sidePanel.open()` only in response to a user action. The expanded native panel therefore cannot be opened honestly from `runtime.onStartup`. The collapsed App Tower rail loads automatically on normal HTTP/HTTPS pages.

### Native Side Panel width
Chromium owns and persists the manually resized width for each side-panel entry. The public extension API exposes no width/default-width/reset-width setter, so v0.2.8 does not include a fake reset-width control. A real reset would require an external native helper editing the browser profile while the browser is closed.

### Narrow widths
The project will not use a fake virtual viewport. Future narrow-width support should prefer a real mobile site/mobile renderer on a per-site basis where technically possible.

## Install / update
1. Unpack into a **new empty folder**.
2. Open `edge://extensions` or `chrome://extensions`.
3. Keep only one App Tower Next install enabled.
4. Load the unpacked v0.2.8 folder.
5. Reload already-open web tabs so the newest content script is active.

---

## v0.2.7 — `AppTowerNext-v0.2.7.zip`

# App Tower Next v0.2.7

Changes in this build:

- A click, focus, or keyboard interaction inside an embedded cross-origin site now activates that pane.
- Keeps all v0.2.6 rail geometry / split / compatibility behavior.
- Documents Chromium credential-autofill limitation for cross-origin iframes.
- No attempt is made to bypass the browser password manager security boundary.

## Side-panel width

The public `chrome.sidePanel` extension API does not expose a width/default-width setter. Chromium owns the side-panel width and remembers a user-resized width for a panel entry. Set the preferred width once by dragging the native panel divider.

## Password autofill

The websites inside Secure/Compatibility panes are cross-origin iframes under an `extension://` top-level document. Chromium intentionally does not fill credentials across frames. Use Real Page for logins that must use the browser's built-in password manager.

---

## v0.2.6 — `AppTowerNext-v0.2.6.zip`

# App Tower Next v0.2.6 — rail jitter fix

This build is based on v0.2.5 and fixes a feedback loop in the external 46 px rail.

## Fixed in v0.2.6

- Fixed/sticky controls on the host website no longer oscillate between shifted and unshifted positions.
- Rail geometry adjustment is now sticky for the lifetime of the visible rail.
- The MutationObserver no longer watches the class/style mutations generated by App Tower itself.
- Wide fixed headers are narrowed instead of being translated as a whole.
- Existing v0.2.5 behavior (native side panel, split panes, per-site modes, compatibility rules) is preserved.

## Why the jitter happened

The previous rail scanner used the current bounding rectangle to decide whether a fixed element touched the right edge. After App Tower moved that element 46 px left, the next scan concluded that it no longer touched the edge and restored it. The following scan saw it at the edge again. This formed a feedback loop and caused visible shaking.

## Install for testing

Use a clean folder, load it via `edge://extensions` / `chrome://extensions`, and refresh already-open normal web pages so their content script is replaced.

---

## v0.2.5 — `AppTowerNext-v0.2.5.zip`

# App Tower Next v0.2.5 — interaction/lifecycle fix

## Fixes in this build

- Side Panel presence survives extension service-worker restarts through `chrome.storage.session`.
- The Side Panel reconnects its runtime port automatically after a service-worker restart. This prevents the external page rail from reappearing while the native Side Panel is still open.
- External and internal Settings buttons now use the same SVG icon.
- Built-in shortcuts (Yandex, Google, GitHub, YouTube) migrate to Auto, so selecting a shortcut resolves to a working Compatibility mode instead of unexpectedly opening in Secure mode.
- Normal click on a shortcut that is already open in either pane now activates that existing pane instead of replacing the other pane. Shift+Click still explicitly replaces/opens the bottom pane.
- One/two-pane layout was rewritten from the prototype grid rules to a simpler flex layout. Switching 2 → 1 keeps the active pane visible; switching back restores both panes.
- Both iframe panes explicitly delegate the `fullscreen` feature in addition to `allowfullscreen`.
- Embedded-scrollbar cleanup from v0.2.4 is retained.

## Install / update

Use a NEW empty folder for this ZIP. Do not merge files into an older source folder.

Because early v0.1/v0.2.1 builds did not use the current stable manifest key, open `edge://extensions` and make sure there is only ONE enabled **App Tower Next** extension. An older copy with a different extension ID can inject its own rail and look exactly like a duplicate panel.

Expected current development extension ID: `hkehhabineigjcpjgopbdhmgaiahgehk`.

After reloading the extension, refresh already-open web pages once (`Ctrl+R`) so old content-script DOM is removed.

## Shortcut behavior

- Click shortcut: if that site is already in top/bottom, activate that pane; otherwise replace the active pane using Auto.
- Shift+Click shortcut: explicitly open/replace the bottom pane and enable split mode.
- Auto ordinary page → Compatibility.
- Auto concrete YouTube video URL → official `youtube-nocookie.com/embed/...` renderer.
- S = Secure iframe; C = Compatibility; R = real top-level page.

---

## v0.2.4 — `AppTowerNext-v0.2.4.zip`

# App Tower Next v0.2.4 — clean test build

This build fixes two development-update problems seen in v0.2.1:

1. The page rail could remain visible while the native Side Panel was open.
2. Repeated visibility messages could reserve another 46px each time, progressively shrinking the page and making scrollbars/layout look broken.

## Important: install this build CLEAN

Do **not** unpack v0.2.4 over v0.2.1.

1. In `edge://extensions` / `chrome://extensions`, remove the old **App Tower Next** test extension.
2. Extract `AppTowerNext-v0.2.4.zip` into a new empty folder.
3. Load that folder with **Load unpacked**.
4. Refresh already-open web pages once (`Ctrl+R`).

Starting with v0.2.4 the manifest contains a stable public extension key. Future unpacked builds can be placed in a new folder without changing the extension ID, as long as this key is preserved.

Expected development extension ID: `hkehhabineigjcpjgopbdhmgaiahgehk`.

## v0.2.4 changes

- Rail visibility is tracked per browser window.
- Uses native `chrome.sidePanel.onOpened/onClosed` when available.
- Side Panel and page rail also keep explicit runtime ports as a fallback.
- The page rail self-cleans stale DOM/classes from earlier App Tower Next builds.
- On install/update the service worker injects the current rail into already-open HTTP/HTTPS tabs, so stale development DOM is replaced without relying only on navigation.
- Fixed width reservation: original page padding is captured only on a hidden→visible transition, so repeated messages cannot stack 46px reservations.
- Moves the document scrollbar before the 46px rail when the document root owns scrolling, then restores it when the rail is hidden.
- Compatibility rules now use session-scoped DNR rules and anchored domain filters such as `||youtube.com/`.
- Expanded the YouTube compatibility domain set.
- Old dynamic compatibility rules are cleared at startup.

## Current limitation

Embedded sites are still real cross-origin pages inside iframes. A site can have its own nested scroll containers; the extension cannot directly restyle those cross-origin scrollbars. If Yandex/YouTube still shows awkward internal horizontal scrolling after this clean build, the next step is a per-pane **Fit/Mobile** rendering mode rather than more global CSS hacks.


## v0.2.4 changes

- **Auto is now actually automatic.** For an ordinary HTTP/HTTPS page, Auto enables scoped Compatibility for only that pane's current/configured domains. A concrete YouTube video still uses the dedicated `youtube-nocookie.com/embed/...` renderer.
- DNR matching now uses `requestDomains` instead of URL filters. Subdomains are matched by Chromium's domain matcher.
- Changing renderer mode in one pane reloads **only that pane**. The other pane is no longer force-reloaded.
- Typing a new URL similarly reloads only the pane whose URL changed.
- For sensitive sites, use **S (Secure)** to keep CSP/X-Frame-Options untouched, or **R (Real Page)** to avoid iframe entirely.


## v0.2.4 fixes

- Embedded pages receive an opt-in handshake and hide their visual scrollbars while keeping wheel/touchpad scrolling. This targets the duplicated nested scrollbars seen in narrow sites such as Yandex Translate.
- The external page rail no longer relocates the page's root scrolling element.
- Auto now resolves ordinary pages to Compatibility; a normal YouTube homepage therefore shows `C`, while a concrete YouTube video URL can still use `A` and the official embed renderer.
- Compatibility DNR rules now use Chromium domain-anchor `urlFilter` syntax (`||domain^`) and include a broader set of YouTube/Google navigation domains.
- Opening a site from the internal rail no longer force-reloads the unrelated pane.

---

## v0.2.3 — `AppTowerNext-v0.2.3.zip`

# App Tower Next v0.2.3 — clean test build

This build fixes two development-update problems seen in v0.2.1:

1. The page rail could remain visible while the native Side Panel was open.
2. Repeated visibility messages could reserve another 46px each time, progressively shrinking the page and making scrollbars/layout look broken.

## Important: install this build CLEAN

Do **not** unpack v0.2.3 over v0.2.1.

1. In `edge://extensions` / `chrome://extensions`, remove the old **App Tower Next** test extension.
2. Extract `AppTowerNext-v0.2.3.zip` into a new empty folder.
3. Load that folder with **Load unpacked**.
4. Refresh already-open web pages once (`Ctrl+R`).

Starting with v0.2.3 the manifest contains a stable public extension key. Future unpacked builds can be placed in a new folder without changing the extension ID, as long as this key is preserved.

Expected development extension ID: `hkehhabineigjcpjgopbdhmgaiahgehk`.

## v0.2.3 changes

- Rail visibility is tracked per browser window.
- Uses native `chrome.sidePanel.onOpened/onClosed` when available.
- Side Panel and page rail also keep explicit runtime ports as a fallback.
- The page rail self-cleans stale DOM/classes from earlier App Tower Next builds.
- On install/update the service worker injects the current rail into already-open HTTP/HTTPS tabs, so stale development DOM is replaced without relying only on navigation.
- Fixed width reservation: original page padding is captured only on a hidden→visible transition, so repeated messages cannot stack 46px reservations.
- Moves the document scrollbar before the 46px rail when the document root owns scrolling, then restores it when the rail is hidden.
- Compatibility rules now use session-scoped DNR rules and anchored domain filters such as `||youtube.com/`.
- Expanded the YouTube compatibility domain set.
- Old dynamic compatibility rules are cleared at startup.

## Current limitation

Embedded sites are still real cross-origin pages inside iframes. A site can have its own nested scroll containers; the extension cannot directly restyle those cross-origin scrollbars. If Yandex/YouTube still shows awkward internal horizontal scrolling after this clean build, the next step is a per-pane **Fit/Mobile** rendering mode rather than more global CSS hacks.


## v0.2.3 changes

- **Auto is now actually automatic.** For an ordinary HTTP/HTTPS page, Auto enables scoped Compatibility for only that pane's current/configured domains. A concrete YouTube video still uses the dedicated `youtube-nocookie.com/embed/...` renderer.
- DNR matching now uses `requestDomains` instead of URL filters. Subdomains are matched by Chromium's domain matcher.
- Changing renderer mode in one pane reloads **only that pane**. The other pane is no longer force-reloaded.
- Typing a new URL similarly reloads only the pane whose URL changed.
- For sensitive sites, use **S (Secure)** to keep CSP/X-Frame-Options untouched, or **R (Real Page)** to avoid iframe entirely.

---

## v0.2.2 — `AppTowerNext-v0.2.2.zip`

# App Tower Next v0.2.2 — clean test build

This build fixes two development-update problems seen in v0.2.1:

1. The page rail could remain visible while the native Side Panel was open.
2. Repeated visibility messages could reserve another 46px each time, progressively shrinking the page and making scrollbars/layout look broken.

## Important: install this build CLEAN

Do **not** unpack v0.2.2 over v0.2.1.

1. In `edge://extensions` / `chrome://extensions`, remove the old **App Tower Next** test extension.
2. Extract `AppTowerNext-v0.2.2.zip` into a new empty folder.
3. Load that folder with **Load unpacked**.
4. Refresh already-open web pages once (`Ctrl+R`).

Starting with v0.2.2 the manifest contains a stable public extension key. Future unpacked builds can be placed in a new folder without changing the extension ID, as long as this key is preserved.

Expected development extension ID: `hkehhabineigjcpjgopbdhmgaiahgehk`.

## v0.2.2 changes

- Rail visibility is tracked per browser window.
- Uses native `chrome.sidePanel.onOpened/onClosed` when available.
- Side Panel and page rail also keep explicit runtime ports as a fallback.
- The page rail self-cleans stale DOM/classes from earlier App Tower Next builds.
- On install/update the service worker injects the current rail into already-open HTTP/HTTPS tabs, so stale development DOM is replaced without relying only on navigation.
- Fixed width reservation: original page padding is captured only on a hidden→visible transition, so repeated messages cannot stack 46px reservations.
- Moves the document scrollbar before the 46px rail when the document root owns scrolling, then restores it when the rail is hidden.
- Compatibility rules now use session-scoped DNR rules and anchored domain filters such as `||youtube.com/`.
- Expanded the YouTube compatibility domain set.
- Old dynamic compatibility rules are cleared at startup.

## Current limitation

Embedded sites are still real cross-origin pages inside iframes. A site can have its own nested scroll containers; the extension cannot directly restyle those cross-origin scrollbars. If Yandex/YouTube still shows awkward internal horizontal scrolling after this clean build, the next step is a per-pane **Fit/Mobile** rendering mode rather than more global CSS hacks.

---

## v0.2.1 — `AppTowerNext-v0.2.1.zip`

# App Tower Next v0.2.1

Тестовая сборка для Microsoft Edge / Google Chrome (Manifest V3).

## Что нового в 0.2

- 4 renderer-режима на каждую область: **Auto / Secure / Compatibility / Real Page**.
- `Compatibility` использует `declarativeNetRequest` и снимает `X-Frame-Options`, `Content-Security-Policy` и `Content-Security-Policy-Report-Only` **только у sub-frame ответов выбранных доменов**.
- Для Яндекс Переводчика добавлен preset `yandex.ru, ya.ru`, потому что авторизация может уходить на `sso.ya.ru`.
- YouTube video URL (`watch`, `youtu.be`, `shorts`, `live`) в режиме `Auto` превращается в privacy-enhanced `youtube-nocookie.com/embed/...` mini-player.
- `Real Page` не использует iframe: показывает кнопку для открытия URL как настоящего popup browser window либо обычной вкладки.
- Режим можно переключать прямо в toolbar кнопкой `A/S/C/R`. Shift+click — назад.
- При добавлении сайта можно выбрать renderer по умолчанию и список Compatibility domains.

## Режимы

- **A / Auto** — специальные renderers. Сейчас: YouTube video → mini-player; остальные URL → Secure.
- **S / Secure** — обычный iframe, защитные заголовки сайта не меняются.
- **C / Compatibility** — iframe, но для заданных доменов снимаются frame-blocking response headers.
- **R / Real Page** — top-level browser page в отдельном окне/вкладке. CSP/X-Frame-Options не обходятся.

### Важное ограничение Compatibility

Chromium DNR умеет удалить response header целиком, но не вырезать только директиву `frame-ancestors` из существующего CSP. Поэтому Compatibility удаляет **весь CSP response header** у sub-frame документа для разрешённых доменов. Это существенно ослабляет защиту встроенной страницы. Не используйте Compatibility для password vault, банков, финансовых и других чувствительных страниц.

## Установка / обновление в Edge

1. Распакуйте ZIP в постоянную папку.
2. Откройте `edge://extensions`.
3. Включите **Режим разработчика**.
4. Для сохранения старых настроек лучше заменить содержимое прежней папки App Tower Next файлами этой версии и нажать **Обновить** на карточке расширения.
5. При новой папке используйте **Загрузить распакованное расширение** и выберите папку с `manifest.json`.
6. После обновления нажмите F5 в уже открытых сайтах, чтобы content script rail обновился.

Chrome: те же шаги через `chrome://extensions`.

## Как проверить

1. Верхний pane должен стартовать с Яндекс Переводчиком в режиме `C`.
2. Если он всё ещё не проходит SSO, это значит, что в redirect/login flow участвует ещё один домен — его можно будет добавить в Compatibility domains в следующем UI для редактирования закладки; пока переключите pane в `R`.
3. Вставьте в нижнюю область URL конкретного YouTube-ролика и оставьте режим `A`: должен открыться mini-player.
4. Нажмите `R` для сложного сайта → **Открыть боковым окном**: это уже top-level browser page, не iframe.

## Что осталось на следующие версии

- UI редактирования/удаления/drag&drop существующих закладок.
- Автоматическая диагностика iframe failure там, где это возможно.
- Workspaces и сохранённые split-комбинации.
- Translate selected text.
- Более аккуратный sidecar manager для Real Page (привязка к окну браузера, восстановление геометрии, multi-monitor).
- Firefox adapter без изменения core-модели.


## v0.2.1 fixes

- Removed duplicate extension title inside the native browser Side Panel header.
- New one/two-pane icon with visual state.
- Cancel in Add Site no longer triggers required-field validation.
- External 46 px page rail is actively hidden while the native Side Panel is open.
- Removed persistent renderer warning banners.
- Auto mode now attempts the full YouTube website using scoped Compatibility rules; specific video URLs still use the privacy-enhanced mini-player.
- Added microphone/camera permission delegation to embedded pages (the browser/site may still deny it).

Full YouTube in an iframe is best-effort: YouTube can still change login, third-party-cookie, or JavaScript behavior independently of X-Frame-Options/CSP.

---

## v0.2.0 — `AppTowerNext-v0.2.0.zip`

# App Tower Next v0.2.0

Тестовая сборка для Microsoft Edge / Google Chrome (Manifest V3).

## Что нового в 0.2

- 4 renderer-режима на каждую область: **Auto / Secure / Compatibility / Real Page**.
- `Compatibility` использует `declarativeNetRequest` и снимает `X-Frame-Options`, `Content-Security-Policy` и `Content-Security-Policy-Report-Only` **только у sub-frame ответов выбранных доменов**.
- Для Яндекс Переводчика добавлен preset `yandex.ru, ya.ru`, потому что авторизация может уходить на `sso.ya.ru`.
- YouTube video URL (`watch`, `youtu.be`, `shorts`, `live`) в режиме `Auto` превращается в privacy-enhanced `youtube-nocookie.com/embed/...` mini-player.
- `Real Page` не использует iframe: показывает кнопку для открытия URL как настоящего popup browser window либо обычной вкладки.
- Режим можно переключать прямо в toolbar кнопкой `A/S/C/R`. Shift+click — назад.
- При добавлении сайта можно выбрать renderer по умолчанию и список Compatibility domains.

## Режимы

- **A / Auto** — специальные renderers. Сейчас: YouTube video → mini-player; остальные URL → Secure.
- **S / Secure** — обычный iframe, защитные заголовки сайта не меняются.
- **C / Compatibility** — iframe, но для заданных доменов снимаются frame-blocking response headers.
- **R / Real Page** — top-level browser page в отдельном окне/вкладке. CSP/X-Frame-Options не обходятся.

### Важное ограничение Compatibility

Chromium DNR умеет удалить response header целиком, но не вырезать только директиву `frame-ancestors` из существующего CSP. Поэтому Compatibility удаляет **весь CSP response header** у sub-frame документа для разрешённых доменов. Это существенно ослабляет защиту встроенной страницы. Не используйте Compatibility для password vault, банков, финансовых и других чувствительных страниц.

## Установка / обновление в Edge

1. Распакуйте ZIP в постоянную папку.
2. Откройте `edge://extensions`.
3. Включите **Режим разработчика**.
4. Для сохранения старых настроек лучше заменить содержимое прежней папки App Tower Next файлами этой версии и нажать **Обновить** на карточке расширения.
5. При новой папке используйте **Загрузить распакованное расширение** и выберите папку с `manifest.json`.
6. После обновления нажмите F5 в уже открытых сайтах, чтобы content script rail обновился.

Chrome: те же шаги через `chrome://extensions`.

## Как проверить

1. Верхний pane должен стартовать с Яндекс Переводчиком в режиме `C`.
2. Если он всё ещё не проходит SSO, это значит, что в redirect/login flow участвует ещё один домен — его можно будет добавить в Compatibility domains в следующем UI для редактирования закладки; пока переключите pane в `R`.
3. Вставьте в нижнюю область URL конкретного YouTube-ролика и оставьте режим `A`: должен открыться mini-player.
4. Нажмите `R` для сложного сайта → **Открыть боковым окном**: это уже top-level browser page, не iframe.

## Что осталось на следующие версии

- UI редактирования/удаления/drag&drop существующих закладок.
- Автоматическая диагностика iframe failure там, где это возможно.
- Workspaces и сохранённые split-комбинации.
- Translate selected text.
- Более аккуратный sidecar manager для Real Page (привязка к окну браузера, восстановление геометрии, multi-monitor).
- Firefox adapter без изменения core-модели.

---

## v0.1.1 — `AppTowerNext-v0.1.1.zip`

# App Tower Next v0.1.1

Test build for Microsoft Edge and Google Chrome (Manifest V3).

## Fixed in 0.1.1

- The collapsed 46 px App Tower now reserves page width instead of simply
  covering the right edge of the site.
- Common `position: fixed` controls anchored to the right edge are shifted left
  while the collapsed rail is visible.
- Clicking a rail icon now calls `chrome.sidePanel.open()` before any async
  storage work so Chromium keeps the required user gesture.
- When the native Side Panel opens, the page-injected rail hides and an
  equivalent App Tower is rendered on the far-right inside the Side Panel.
- `+` and Settings now have working dialogs.

## Current functionality

- Native `chrome.sidePanel`.
- Collapsed 46 px App Tower on ordinary HTTP/HTTPS pages.
- Expanded layout: `[web panes | App Tower]`.
- Browser favicons through Chromium's built-in `_favicon` endpoint.
- Click a rail icon: open it in the active pane.
- Shift+Click: open it in the bottom pane and enable split mode.
- One-pane / two-pane layout.
- Horizontal draggable splitter; double-click = 50/50.
- Focus button (`□`) temporarily expands one pane.
- URL field, reload and open-as-normal-tab (`↗`) per pane.
- Add custom sites.
- Local persistence with `chrome.storage.local`.
- System light/dark theme.

## Security baseline

The web panes are still `iframe`s because public Chromium Side Panel APIs host
an extension page rather than arbitrary top-level web contents.

This build DOES NOT remove CSP or X-Frame-Options.

If a site refuses to embed, click `↗` to open it as a normal browser tab.

## Install / upgrade in Edge

1. Extract this ZIP into a permanent folder.
2. Open `edge://extensions`.
3. Enable **Developer mode**.
4. If v0.1.0 is already loaded:
   - remove it, OR replace the files in its folder with this build and press
     **Reload** on the extension card.
5. Click **Load unpacked** if needed.
6. Select the folder containing `manifest.json`.
7. Refresh already-open web pages once so the new content script is injected.

## Install / upgrade in Chrome

Use the same procedure at `chrome://extensions`.

## Known v0.1.1 limitations

- Width reservation is implemented from a content script. Very unusual sites
  with custom full-screen/fixed layouts can still require site-specific
  adjustments.
- Panel-open state is global in this prototype; multiple simultaneous browser
  windows are not yet independently tracked.
- Some websites cannot be embedded because of their security/authentication
  policy.
- Site edit/delete/reorder is planned for the next iteration.

---

## v0.1.0 — `AppTowerNext-v0.1.0.zip`

# App Tower Next v0.1.0

Test build for Microsoft Edge and Google Chrome (Manifest V3).

## Implemented
- Native `chrome.sidePanel`.
- 46 px App Tower rail on ordinary HTTP/HTTPS pages.
- Chromium built-in favicons (`_favicon`), no external favicon service.
- Click = active pane; Shift+Click = bottom pane.
- One/two-pane layout with draggable horizontal splitter; double-click = 50/50.
- Focus a pane with `□`.
- URL field, reload, open normal tab (`↗`).
- Add custom sites (`+`).
- Local persistence with `chrome.storage.local`.
- System light/dark theme.

## Important limitation
The two web panes are iframes inside the native browser Side Panel. Some sites refuse embedding via X-Frame-Options, CSP frame-ancestors, authentication policy, third-party-cookie policy, or JavaScript. This build intentionally DOES NOT strip CSP or X-Frame-Options. Use `↗` when a site refuses to embed.

## Install Edge
1. Extract ZIP to a permanent folder.
2. Open `edge://extensions`.
3. Enable Developer mode.
4. Click Load unpacked.
5. Select the folder containing `manifest.json`.
6. Open an ordinary website; the right rail should appear.
7. Click a rail icon or the extension toolbar icon.

## Install Chrome
Same, using `chrome://extensions`.

## Permissions
- `sidePanel`: native Chromium side panel.
- `storage`: local state only.
- `favicon`: browser-provided site favicons.
- Static HTTP/HTTPS content-script matches: used only to inject the App Tower rail on ordinary web pages.

No telemetry, analytics, remote code, sync or cloud backend is included.
