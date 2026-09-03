# 13 — Test plan

## Environments

Minimum:
- Microsoft Edge current stable on Windows 11
- Google Chrome current stable on Windows 11
- high-DPI scale if available (125%/150%)
- dark + light system theme

Secondary:
- Yandex Browser current version with fallback package
- touch/touchpad device if available

## Smoke sequence after every full replacement

1. Preserve same unpacked extension folder.
2. Delete old folder contents.
3. Copy new build contents.
4. `edge://extensions` -> Reload.
5. Reload existing normal web tabs.
6. Verify manifest version in Options.

Then:

1. zero shortcuts -> expand
2. Add current page
3. add arbitrary site
4. collapse -> expand x5
5. browser restart -> expand
6. open split with two different sites
7. navigate lower pane; confirm upper doesn't reload
8. create group
9. drag site into group
10. create template via organizer
11. create template via site->site drag
12. search by mouse + keyboard
13. Recent -> Open
14. Options -> Open App Tower
15. theme system/light/dark
16. wait >5 min for sleep test
17. YouTube specific video
18. generic YouTube page
19. one PWA/Web App action
20. Real Page sidecar and Sidecar Manager

## Lifecycle instrumentation when debugging

Log monotonic/Date timestamps for:

```text
UI expand click
UI collapse click
OPEN_PANEL message
COLLAPSE_PANEL message
sidePanel.open call / resolve / reject
sidePanel.close or setOptions hide
sidePanel.onOpened
sidePanel.onClosed
panel Port connect
panel Port disconnect
collapsedWindows mutation
openWindows mutation
broadcastRail
workspace write
ATN_WORKSPACE_CHANGED receive
renderAll forceReload argument
per-pane renderer source before/after
```

This is required for collapse/duplicate rail/reload regressions.

## Pane reload regression test

Load two pages with obvious state:
- upper: typed text / scroll / timer
- lower: different page

Perform:
- add/remove shortcut
- rename workspace
- change group
- open settings
- save site settings
- drag/reorder
- wait resource alarm cycles

Upper and lower should remain intact unless directly targeted or sleeping policy
explicitly unloads one.

## Persistence matrix

Test separately:
- extension Reload
- browser tab reload
- browser restart
- OS/browser theme change
- side panel browser-owned X
- App Tower collapse control
- global App Tower X
- toolbar re-enable

## Release validation

Static:
```bash
node tools/validate.mjs
```

Package:
```bash
python tools/package.py
```

Live:
Use acceptance criteria in `09_ACCEPTANCE_CRITERIA.md`.
