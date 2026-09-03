# 06 — Storage and state

## Persistent local storage

Current keys include:

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
- contextual/options routing keys such as `atnOptionsRoute`

Current state schema version in v0.8.5: **15**.

Do not change persistent shape without migration.

## Session storage

Used for window/lifecycle state that should survive MV3 worker suspension but
not become cross-device configuration:

- `atnCollapsedWindowsV037`
- `atnPanelOpenWindowsV025`
- `atnWindowWorkspaceMapV1`
- `atnResourceLeasesV1`
- `atnMediaStateV1`
- `atnSidecarRegistryV1`
- `atnPwaSidecarsV1`
- `atnTowerFallbackWindowsV1`
- `atnDisabledSidePanelTabsV1`

## Sync storage

The background uses a versioned payload under `atnSyncPayload`.

Design intent:
- sync shortcut/workspace organization and declarative module configuration
- do not sync device-local pane/window geometry and transient active state
- do not sync browser-specific system appearance unless deliberately changed

## Update behavior

Normal extension update with the same extension identity preserves
`chrome.storage.local`.

Uninstall removes extension storage; this is accepted behavior.

For unpacked testing, keep the same loaded folder/extension identity and replace
the folder contents, then use browser Reload. Do not uninstall simply to update.

## Stable identity

The manifest currently carries a public `key` so unpacked identity is stable in
the development workflow. Never include a private PEM key in the repository or
release ZIP.
