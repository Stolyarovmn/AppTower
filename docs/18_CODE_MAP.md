# 18 — Code map for Codex

## Main entry points

### `app/background.js`

Owns most shared state and browser orchestration.

Look here first for bugs involving:
- open/collapse/restart
- duplicated collapsed rail
- workspace persistence
- DNR compatibility
- resource sleeping
- Recent
- notifications/content settings
- PWA/sidecars
- Browser Sync
- native context menu

Current state schema version: 15.

### `app/sidepanel/sidepanel.js`

Owns:
- split/single pane rendering
- pane toolbar
- Auto/S/C/R renderer selection
- active/last-interacted pane
- Add Site dialogs
- group/template editors
- shortcut drag/drop in expanded rail
- Search dialog
- settings/options routing
- media/PWA pane UI

For "both panes reloaded" bugs inspect every call to `renderAll()` and every
place assigning/removing iframe `src`.

### `app/content/rail.js`

Collapsed rail injected into normal HTTP(S) pages.

Owns:
- earliest page rail presence
- shortcut list rendering
- overflow scroll
- expand
- add current page from exact page URL/title
- organizer/search/settings actions
- global disable

### `app/content/embedded-frame.js`

Bridge from a framed third-party page back to App Tower.

Used for:
- pane interaction/focus
- current URL/title metadata after in-pane navigation

### `app/content/pwa-discovery.js`

Detects Web App Manifest declarations and reports them to background.

### `app/options/options.js`

Owns browser-settings-like management UI.

Important for:
- Recent open user-gesture path
- Workspaces
- per-site settings
- notifications
- performance diagnostics
- modules/PWA/sidecars/media
- Permissions dashboard
- sync/export/import

### `app/shared/browser-adapter.js`

All container-specific operations should converge here.

Owns:
- browser detection/skin hints
- native Side Panel capability
- fallback sidecar
- Edge/Chromium collapse/open compatibility state
- disabled-side-panel tab recovery

### `app/modules/module-registry.js`

Validator/loader for declarative modules.

Keep provider code out of Core when it can be expressed here.

## Persistent state keys

### Local

- `atnEnabled`
- `atnWorkspacesV1`
- `atnDefaultWorkspaceIdV1`
- `atnInstalledModules`
- `atnRecentV1`
- `atnPerformanceV1`
- `atnSiteSettingsV1`
- `atnPwaCacheV1`
- `atnPwaPreferencesV1`
- `atnThemeMode`
- `atnAccentMode`
- `atnAccentColor`
- `atnSyncEnabled`
- `atnSyncUpdatedAt`

### Session

- `atnCollapsedWindowsV037`
- `atnPanelOpenWindowsV025`
- `atnWindowWorkspaceMapV1`
- `atnResourceLeasesV1`
- `atnMediaStateV1`
- `atnSidecarRegistryV1`
- `atnPwaSidecarsV1`
- `atnTowerFallbackWindowsV1`
- `atnDisabledSidePanelTabsV1`

### Sync

- `atnSyncPayload`

## Important runtime messages

Lifecycle:
- `OPEN_PANEL`
- `COLLAPSE_PANEL`
- `PANEL_COLLAPSED`
- `GET_RAIL_VISIBILITY`
- `ATN_RAIL_VISIBILITY`

Navigation:
- `OPEN_SITE`
- `OPEN_TEMPLATE`
- `OPEN_REAL_SIDECAR`
- `OPEN_PWA_SIDECAR`

Workspace/shortcuts:
- `GET_WINDOW_STATE`
- `UPDATE_WORKSPACE_STATE`
- `LIST_WORKSPACES`
- `CREATE_WORKSPACE`
- `RENAME_WORKSPACE`
- `DELETE_WORKSPACE`
- `SET_ACTIVE_WORKSPACE`
- `MUTATE_SHORTCUTS`
- `GET_SHORTCUTS`

History/resources:
- `GET_RECENT`
- `RECORD_RECENT`
- `PANE_LIVE`
- `PANE_ACTIVITY`
- `PANE_RELEASE`
- `GET_RESOURCE_STATUS`
- `ATN_SLEEP_PANE`

Settings:
- `GET_SITE_SETTINGS`
- `SET_SITE_SETTINGS`
- `APPLY_NOTIFICATION_SETTING`
- `SET_PERFORMANCE`
- `SET_SYNC_ENABLED`

PWA/media/sidecars:
- `GET_PWA_FOR_URL`
- `SET_PWA_PREFERENCE`
- `FORGET_PWA`
- `GET_SIDECARS`
- `FOCUS_SIDECAR`
- `CLOSE_SIDECAR`
- `MEDIA_STATE`
- `MEDIA_CLEAR`
- `GET_MEDIA_STATE`

When adding a new message, document which component owns the state and whether
the message is request/response or fire-and-forget.
