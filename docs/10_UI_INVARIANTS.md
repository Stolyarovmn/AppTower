# 10 — UI and lifecycle invariants

These rules are acceptance criteria. A change that violates one of them is a regression even if unit tests still pass.

## One visual language

- Spacing comes from the shared 4/8/12/16/20/24 px scale in `shared/ui-system.css`.
- Floating dialogs and shortcut context menus share the same surface border, radius, background and edge gutter.
- Toolbar action icons use stroke SVGs with one optical size/stroke. Do not mix Unicode glyphs, Fluent font glyphs and bespoke SVGs for equivalent actions.
- Mode letters (`A/S/C/R`) and the active-pane dot are state indicators, not action icons, and may remain text/shape based.
- Standard controls use the shared control height/radius unless a component has an explicit compact/rail role.
- Context menus may not start/end with a separator or contain consecutive separators.

## Drag feedback

- Exactly one `.atn-drag-proxy` exists while dragging a shortcut.
- The proxy is placed to the right of the pointer and vertically centered on it, so the pointer itself remains the exact drop target.
- Releasing/cancelling the pointer removes the proxy.

## Group context menu

- Empty groups do not show opening actions that require contained sites/templates.
- Empty groups still expose management actions (content/name, dissolve, delete).
- Conditional actions must never leave an orphan separator at the top of the menu.

## Pane focus control

- The focus/maximize control is hidden when only one pane is already visible and the action would have no visual effect.
- It is visible in split layout.
- In focused layout it changes to a restore affordance and returns to split layout.

## Browser Sync

- Enabling Browser Sync writes both the sync payload and a sync opt-in marker to `chrome.storage.sync`.
- A fresh reinstall restores the opt-in and local shortcut tree when a valid remote App Tower sync payload is available.
- The sync preference snapshot includes theme/accent, site settings, performance settings and PWA preferences.
- Workspaces/shortcuts/modules remain part of the existing sync payload.
- Current open pane URLs and the current pane layout are device-local.
- No code may promise that the browser vendor will retain `chrome.storage.sync` data after uninstall; restoration is conditional on the remote payload still being available to the reinstalled extension.

## Collapse

- On a normal `http://` or `https://` tab, Collapse first verifies that the compact rail receiver exists, then closes the native Side Panel.
- On the App Tower new-tab page, Collapse hands off to the built-in new-tab rail.
- On restricted browser pages where no compact rail can exist, Collapse must keep the Side Panel open and explain why instead of silently behaving as Close.
- On successful collapse, the next Expand opens App Tower again.
