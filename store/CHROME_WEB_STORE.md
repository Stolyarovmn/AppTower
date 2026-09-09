# Chrome Web Store listing — English

## Summary

Keep your most-used sites, groups and two-pane workspaces in a persistent side
panel.

## Description

AppTower gives Chrome a persistent workspace for the websites you choose. Pin a
site to the rail, group related sites, save a two-pane template, and reopen it
without rebuilding your layout. The upper and lower panes are independent, so a
navigation in one does not reload the other.

Use separate-window or normal-tab mode for a site that does not allow embedding.
Configure appearance, per-site zoom and optional notifications from the extension
settings. Your configuration stays in browser storage; sync is optional and off
by default. AppTower contains no account, advertising or analytics.

## Single purpose

Organise user-selected websites into a persistent browser side panel, compact
rail, workspaces, groups and two-pane layouts.

## Permission explanations

| Permission | Explanation |
| --- | --- |
| `sidePanel` | Shows the AppTower panel in supported Chromium browsers. |
| `storage` | Saves shortcuts, workspaces and local preferences; optional browser sync is user-controlled. |
| `tabs` | Captures the current page only after the user chooses to add or open it. |
| `scripting` | Restores the local compact rail in already-open HTTP(S) tabs. |
| `contextMenus` | Provides user-triggered “open/add in AppTower” page context actions. |
| `favicon` | Requests browser-provided icons for user shortcuts. |
| `declarativeNetRequestWithHostAccess` | Applies session-only compatibility rules for AppTower subframes. |
| `http://*/*`, `https://*/*` | Shows the compact rail and opens only sites selected by the user. |
| optional `contentSettings` | Requested only when the user enables notification control for a site. |

## Privacy

Privacy policy: https://github.com/Stolyarovmn/AppTower/blob/main/PRIVACY.md

Data declarations: configuration is stored locally; optional browser sync stores
user-selected settings through the browser sync service. AppTower does not sell,
transmit or use data for advertising or analytics. It does not use remote code.
