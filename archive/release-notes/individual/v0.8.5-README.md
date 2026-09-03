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
