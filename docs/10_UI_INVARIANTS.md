# 10 — UI and lifecycle invariants

These rules are release gates, not suggestions. A change that violates one of them is a regression even if the feature itself works.

The important implementation rule is **single source of truth**: do not repair a visual component after render with a second script. If a component needs a different icon, spacing, state or lifecycle, change the component that owns it and add a regression check.

## One visual language

- Spacing comes from the shared 4/8/12/16/20/24 px scale in `shared/ui-system.css`.
- Floating dialogs and shortcut context menus share the same surface border, radius, background and edge gutter.
- Equivalent actions use one icon implementation and one optical size. Do not keep a legacy icon in the component and replace it later with a DOM patch.
- Compact toolbar icon buttons are plain controls: no persistent tile background, heavy border, large focus rectangle or button-specific chrome. Background appears on hover/active only.
- Pane compact actions use the same 30 px control box and approximately 18 px optical icon size.
- Mode letters (`A/S/C/R`) and the active-pane dot are state indicators, not action icons.
- Context menus may not start/end with a separator or contain consecutive separators.

## Pane toolbar

The visible primary row is intentionally small so the URL field remains useful at narrow Side Panel widths.

- Always visible: active-pane indicator, URL field, **Go**, **Reload**, **Add shortcut**, compact **More**.
- **Close pane** is visible only in split layout. It has the same visual treatment as the other toolbar actions and closes the selected pane by keeping the other pane.
- `Mode`, `Web App parameters`, `Open in normal tab` and `Focus/restore pane` live in the More menu, not in the primary row.
- More and Close may never render as large framed square tiles beside the URL field.
- A focused/clicked More button may not retain a large browser-default focus rectangle after opening its menu.

## Settings icon

- The rail exposes exactly one canonical settings gear implementation for the current browser skin.
- There is no post-render settings-icon replacement script, polling timer or shadow-root-opening shim.
- A second/legacy settings glyph must not remain reachable through an alternate rail implementation.

## Drag feedback

- Exactly one `.atn-drag-proxy` exists while dragging a shortcut.
- The proxy stays to the **left** of the pointer and vertically centered so it does not cover the target under the cursor.
- Invalid App Tower surface exposes `not-allowed`; valid before/after/combine targets expose the allowed drag state.
- Releasing/cancelling the pointer removes the proxy and all drop marks.

## Group context menu

- Empty groups do not show opening actions that require contained sites/templates.
- Empty groups still expose management actions (content/name, dissolve, delete).
- Conditional actions must never leave an orphan separator at the top of the menu.

## Pane focus control

- The focus/maximize action is secondary and lives in More.
- It is disabled when the current layout makes the action meaningless.
- In focused layout it changes behavior to restore and returns to split layout.

## Native Side Panel lifecycle

- App Tower is a **browser-window workspace**, not a per-tab Side Panel.
- Native Side Panel open/reopen uses `windowId`, never `tabId`.
- Collapse compatibility code must not create tab-specific `sidePanel.setOptions({tabId:...})` state.
- Switching ordinary Edge tabs while App Tower is open must not recreate the Side Panel document or reload pane iframes. A playing video must continue.
- Opening the native Side Panel hides the injected compact rail for that browser window. Expanded state may never show native App Tower plus a second injected rail.
- Collapse first verifies that the compact rail receiver exists, then closes/disables the native container. Expand hides the compact rail before/while reopening the window-scoped native panel.
- On the App Tower new-tab page, Collapse hands off to the built-in new-tab rail.
- On restricted browser pages where no compact rail can exist, Collapse keeps the Side Panel open and explains why instead of silently behaving as Close.

## Browser Sync

- Enabling Browser Sync writes both the sync payload and a sync opt-in marker to `chrome.storage.sync`.
- A fresh reinstall restores the opt-in and local shortcut tree when a valid remote App Tower sync payload is available.
- The sync preference snapshot includes theme/accent, site settings, performance settings and PWA preferences.
- Workspaces/shortcuts/modules remain part of the existing sync payload.
- Current open pane URLs and the current pane layout are device-local.
- No code may promise that the browser vendor will retain `chrome.storage.sync` data after uninstall; restoration is conditional on the remote payload still being available to the reinstalled extension.
