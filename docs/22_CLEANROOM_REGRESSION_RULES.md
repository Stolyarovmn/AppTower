# Cleanroom regression rules — release gate

These rules consolidate user reports from previous builds. They apply to the
rewrite even when implementation was written from scratch. A new implementation
is not evidence that old behavioral defects cannot recur.

| Report / invariant | Required evidence |
|---|---|
| Browser extension action and browser-owned Side Panel entry must converge on the same workspace and collapse behavior | Test each entry after global disable, worker restart and browser restart; explicit Collapse restores rail, not global disable |
| Exactly one AppTower representation per window | Expanded hides injected rail; closing never reveals rail before close confirmation; failed close leaves rail hidden |
| Expanded panel has only browser-owned global X | No extension global-disable button in expanded rail; pane X only in split |
| Collapsed rail X disables globally | Persists across restart; explicit action re-enables; native entry then Collapse restores compact surface |
| Chevron direction | Right-pointing expanded Collapse, left-pointing compact Expand |
| Settings icon | One shared SVG source in rail/panel/welcome; centered, same stroke, no font glyph or post-render patch replacement |
| Icon buttons and spacing | Compact consistent hit areas; no oversized kebab tile; verify Windows scaling and both themes |
| Pane independence | Renaming, organizing and navigating bottom do not assign top iframe src; closing top retains bottom document |
| Add current | Populated browser source when empty; explicit top/bottom/browser source selection; no stale URL after pane navigation |
| Search | Mouse click/keyboard/close/Escape work; hover does not recreate result; commands consumed once |
| Drag/drop | Real valid targets only; reject self/nested/invalid drops; cancellation safe; preview left of pointer; native favicon drag suppressed |
| Rail page space | Reserve once; restore original styles; fixed headers/buttons remain reachable; no accumulating width or extra scrollbar |
| Empty/reloaded tab | Rail works with zero shortcuts; recover stale extension context on existing tabs |
| Restart | Worker suspension is not browser close; reconnect must not reload pane; test full browser restart separately |
| Recent and Options open | Real user-action path; opens target, not an empty/recreated panel |
| Modules / external sites | No claim of universal iframe/media/auth support; explicit top-level fallback |
| Settings | Site notifications isolated; system theme updates; shared icons on all surfaces |
| Data loss | Existing TASK 3 risk remains planned; these fixes do not claim dirty-form/media protection |

## Entry-path diagnostics

Record browser action, native onOpened, panel connection, explicit Collapse,
enable reconciliation, close promise/event and rail visibility acknowledgement.
Include extension version and window/context identity. Do not infer two installed
extensions from two browser controls. Never log form contents or credentials.

## Release discipline

For each release record: source SHA, actual local test result, actual CI result,
and live-browser cases that passed or remain unverified. Mocked API/jsdom tests
are not Edge UI tests. A missing environment is a recorded gap, not a pass.
Every reported regression must map to a rule and an executable test where
possible. Visual and browser-owned entry controls still need live validation.

## 2.2 interaction and resource rules

- Both rails use the same entity icon renderer. A template is two overlaid site
  tiles, TOP in front; a group is an outline folder in its chosen color.
- Bottom controls are Add → Groups/templates → Search → Settings in every state.
- Combining sites first asks Template or Group. Cancellation never mutates data.
- Template editor shows visual TOP/BOTTOM order and swap, no name input.
  Groups have name and color. Order determines opened panes.
- Context menus anchor to their trigger and clamp within viewport; no group
  top/bottom navigation. Final actions: ungroup/decompose, settings, delete.
  Delete always asks for confirmation.
- Add-current opens the added site only if both pane URLs are empty.
- Open pane documents are never idle-evicted. Background cache is per window,
  defaults to 12, range 0–24. LRU eviction applies only to parked frames;
  parked frames expire after five minutes unless that site disables idle sleep.
- Returning to a cached site must reuse the DOM frame without src assignment
  or reparenting. The deprecated global active-pane lease cap is removed.
- Address display omits http(s) scheme; editing restores it. An untouched HTTP
  address must not silently become HTTPS on Go/Save.
- Single/split icon and renderer menu selection reflect current workspace state.
- Viewport-width page shells and min-width must be included in rail space
  reservation, with original styles restored. Live site validation is required.

### Unresolved native-container requirement

Closing the native Side Panel may destroy its entire document. Neither cache
nor iframe idle policy can preserve that document or its audio afterward.
2.2 does NOT claim collapse/expand document continuity or background playback.
A persistent renderer/container design remains required before this user
acceptance item can be marked passed. Do not work around it with unsupported
browser-internal APIs, hidden UI patches, or a fake successful test.

## 2.2.1 visual gate

All transient dialogs use shared X and outside-pointer dismissal. No Cancel or
Close text footer. Keyboard focus remains accessible; pointer dismissal must not
leave a trigger outline. Toolbar inset must include the focus outline extents.
Template/group choice uses two equal columns separated by a rule; each has an
icon, heading, and description. Layout icon always has two rectangles; lower
fill indicates split. Group tiles show first two letters on a pastel fill.
Color palette is inline with a separate custom color control. Site initials are
fallback only: remove after favicon load and restore on failure. Settings nav
uses named sections and outline icons. Native collapse is not changed by this
visual release; do not claim retained pages/audio without live evidence.

## 2.3 gate

Single bottom pane must have flex-grow 1 and fill the same area as single top.
Loaded site icons must have transparent tile backgrounds on every surface.
Group menu entries include site icons. Menu actions align left. Workspace buttons
are a fully fitting prefix in persisted order; overflow provides all workspaces.
No chrome_url_overrides: onboarding belongs inside the empty extension only.
Boolean/module choices use labeled switches. No claim of inheriting private
Edge/Chrome settings UI. Original icon retained pending a verified sharper source.

## 2.4 gate

Selecting separate-window mode performs the open action once; it does not leave
a second “open” command in the pane. Reload refreshes the owned popup, and Return
closes that popup before switching the pane back to Auto. Workspace ordering uses
drag handles and stable IDs. Settings do not emit permanent success notices or
repeat action names beside self-describing icons. Search results remain left
aligned and every non-site command has a semantic icon. Web App entries dedupe by
start URL. The browser new-tab page is never overridden; first-install welcome is
an ordinary extension tab. Application icons are exported from one vector source.
