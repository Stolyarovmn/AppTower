# 00 — Start here

## Active implementation and shared planning

The active rewrite is `cleanroom/` on `feature/cleanroom-functions`.
The 2.1.0 preview source is commit `2c1073b3d83e7a2d294a1621ce23f3a3b62220a1`.
Read [Cleanroom release status](../cleanroom/README.md) before interpreting any legacy status.

The canonical ranked TASKS/IDEAS list is currently maintained on another branch:
[docs/11_BACKLOG.md](https://github.com/Stolyarovmn/AppTower/blob/chore/store-readiness-audit-fixes/docs/11_BACKLOG.md).
Do not create an independently ranked copy here. The scheduled Competitor Scan
reassesses that list. Historical DONE applies only to its recorded implementation
and test evidence, never automatically to Cleanroom.

`app/`, `variants/yandex-sidecar/` and the older sections in docs describe the
legacy baseline. They remain behavioral references, not code to copy into the rewrite.
`archive/releases/` is immutable history.

## Current product boundary

AppTower provides an own-workspace rail, sites/groups/two-pane templates,
independent upper/lower panes, and optional provider adapters. It is not a full
vertical-tab manager. Browser-owned UI and arbitrary site behavior remain outside
our control.

## Reconciled interpretation of outstanding requirements

- **New Tab:** current preview replaces New Tab; TASK 17 targets a native-page
  action/Side Panel fallback without replacement. These are different designs.
  Do not report TASK 17 complete from the current preview. Resolve it within that
  task, preserving the working lifecycle; no injection into privileged pages.
- **Data safety and resource cap:** TASK 3 now records Cleanroom's missing
  dirty-form/media guards and the unresolved protected-pane/cap precedence.
  User requested scheduled reprioritization, not an immediate global blocker.
  Do not describe existing eviction as safe or the proposed protection as shipped.
- **Scheduling:** current pane controller uses a periodic timer. TASK 6's
  nearest-deadline scheduler remains future work, with measured comparison required.
- **Renderer modes:** Auto/Embedded/Mobile/Real Page in TASK 9 is a proposed UX
  refinement. Existing A/S/C/R and its per-origin DNR collision limitation remain
  as documented in cleanroom/README.md until that task is implemented.
- **Width:** distinguish saved split ratio and popup geometry from native Side
  Panel width, for which the checked API exposes no setter/resetter.
- **Tests:** Node/jsdom/API-double checks do not establish live Edge acceptance.
  Installed-extension tests and Edge restart/media/layout verification remain
  distinct gates. Store-submission documents for legacy v1 are not approved
  descriptions of the Cleanroom package.

## Working sequence

Use the shared backlog and its existing single-WIP process. Before changes,
identify the target branch/package and check actual CI rather than historical
green claims. Preserve user data and stable extension identity during updates.
Functional work stays in Cleanroom; do not merge legacy lifecycle or UI patches.

References:
- [Product specification](02_PRODUCT_SPEC.md)
- [Acceptance criteria](09_ACCEPTANCE_CRITERIA.md)
- [Browser limits](05_BROWSER_COMPATIBILITY.md)
- [Decisions](11_DECISIONS.md)
- [Side Panel API](https://developer.chrome.com/docs/extensions/reference/api/sidePanel)
