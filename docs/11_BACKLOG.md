# AppTower ranked backlog

Last competitor scan: 2026-09-04.

## Rules

- One functional TASK may be `ACTIVE` at a time (global WIP = 1).
- New TASK execution is blocked while CI is red.
- `TASKS` require acceptance criteria and an automated test plan.
- `IDEAS` are retained with a score and promotion condition.
- Scores are recalculated whenever a material new item is added.
- Score = user value 25% + real pain/regression 20% + AppTower fit 15% + measurable performance/UX gain 15% + implementation risk 10% (higher = lower risk) + privacy/permissions 5% + competitor maturity 5% + automated testability 5%.

Current execution gate: **CI RED** on PR #1 (`validate` run 33811327161 failed at head `148db8a170a5c2ed1e116d9090acf2da2103ba62`). No TASK may transition to `ACTIVE` until Quality Loop restores green CI.

## TASKS

| Rank | Score | Status | TASK | Why now | Dependencies |
|---:|---:|---|---|---|---|
| 1 | 97 | BLOCKED | Restore deterministic Side Panel command routing and Add Current Page source resolution | Current E2E reproduces empty URL on Add Current Page and panel routing failure; both are core interaction regressions. | CI/Quality Loop |
| 2 | 92 | BLOCKED | Serialized state coordinator for panel/rail/workspace mutations | AppTower has multiple concurrent state/event sources; serializing state mutation should reduce race-driven reload/reconnect bugs and technical debt. | Task 1 green; design spec |
| 3 | 86 | BLOCKED | Command Palette: unified search across shortcuts, templates, workspaces and recent | Strong fit with AppTower's existing search; competitors repeatedly use command bars for fast navigation without expanding UI surface. | Tasks 1–2 green |
| 4 | 84 | BLOCKED | Event-based workspace snapshots + Undo for destructive mutations | High recovery value with low steady-state energy cost if snapshots happen on meaningful mutations rather than polling. | Serialized coordinator preferred |
| 5 | 82 | BLOCKED | Compatibility ladder UX: Auto / Embedded / Mobile / Real Page with failure-driven fallback | Directly addresses iframe/site compatibility confusion while keeping low-level S/C modes out of the normal UX. | Task 1 green; renderer telemetry |
| 6 | 80 | BLOCKED | Duplicate shortcut detection and reuse prompt | Low-risk UX improvement validated by multiple tab managers; prevents workspace clutter. | Stable add flow |
| 7 | 78 | BLOCKED | Native browser tab-group import/export bridge | Useful workspace interoperability without trying to fully replace Chrome/Edge tab management. | Stable groups/workspaces |
| 8 | 76 | BLOCKED | Glance preview in temporary bottom pane | Leverages AppTower's split-pane model for link preview without spawning a new tab/window. | Stable split-pane lifecycle |

### TASK 1 — Deterministic panel command routing and Add Current Page

**Rationale:** this is an observed regression, not a competitor-inspired feature. Existing Playwright runs have already reproduced an empty `#site-url` after Add Current Page and a failure path where a command attempts to open a native side panel rather than route to the already-live panel document.

**Acceptance criteria**

- `+` from the rail and Home always pre-fills the current HTTP(S) browser tab URL/title when no pane source is selected.
- Search, Add and Organize commands delivered to an already-live panel do not recreate/reload the panel document.
- Empty workspace remains usable after Chromium restart.
- No duplicate injected rail is created after reload/reconnect.
- Existing split-pane isolation remains intact.

**Automated test plan**

- Playwright persistent-context test for real current-tab resolution.
- Document-instance token invariant across Search/Add/Organize commands.
- Restart with zero shortcuts, then Add Current Page and save.
- Rail uniqueness assertion after page reload.
- Re-run all existing E2E before marking done.

### TASK 2 — Serialized state coordinator

**Rationale:** Lunma (Apache-2.0) documents a strongly structured local extension architecture and automated Playwright testing. The useful pattern for AppTower is independent clean-room implementation of a single serialized mutation queue around workspace/panel lifecycle state, not code copying.

**Acceptance criteria**

- User actions, storage changes, port reconnects and side-panel lifecycle events that mutate shared AppTower state pass through one ordered coordinator.
- A mutation cannot interleave persistence/render with another mutation.
- Read-only events do not wake or persist unnecessarily.
- Existing pane isolation, restart persistence and rail lifecycle behavior remain unchanged.

**Automated test plan**

- Deterministic ordering unit tests with intentionally delayed async mutations.
- E2E rapid sequences: collapse/expand/search/add/reconnect and workspace changes.
- Assert one persist/render phase per logical mutation where applicable.

## IDEAS

| Rank | Score | IDEA | Evidence / source | Risks / promotion condition |
|---:|---:|---|---|---|
| 1 | 73 | Favorites/pinned mini-row independent of workspace ordering | `ddx-510/dd-sidebar` (MIT) uses a compact bottom/quick-access layer. | Promote if shortcut overflow becomes a frequent UX problem and it can reuse existing storage schema. |
| 2 | 72 | Workspace/session import from other managers | VertiTab advertises Session Buddy/Toby import; Leap and Workona-like products emphasize reusable contexts. | Promote when AppTower export schema is versioned and stable. |
| 3 | 70 | Recently accessed smart view | VertiTab exposes Active/Recently Accessed panels; TabDog includes recently closed. | Promote after current Recent is proven stable and searchable. |
| 4 | 68 | Optional browser-context actions over selected text/link | AI Side Panel/SuperchargeNavigation-style context actions make side tools accessible without opening UI first. | Requires strict permission review and a concrete non-AI use case. |
| 5 | 65 | Focus mode: temporarily show only one group/workspace | Common in workspace/tab managers. | Promote if users report rail overload after groups/templates mature. |
| 6 | 62 | Automatic domain grouping suggestions | VertiTab, TabDog and SuperchargeNavigation expose domain grouping. | AppTower should not become a tab manager; promote only as an opt-in shortcut organizer. |
| 7 | 58 | Optional AI organizer module | Leap/VertiTab expose AI organization. | Keep out of core until there is a privacy-preserving provider/module contract and clear demand. |
| 8 | 54 | Full vertical-tab manager | Many competitors focus here (VertiTab, TabTOC, Leap, ddSideBar). | Deliberately low: conflicts with AppTower's product boundary; reconsider only if product scope changes. |

## Competitor evidence used in this ranking

- Lunma — Apache-2.0, local/open-source vertical tabs + Spaces, Playwright E2E: https://github.com/lunma-app/lunma
- ddSideBar — MIT, injected iframe or Chrome SidePanel, Spaces/bookmarks: https://github.com/ddx-510/dd-sidebar
- SuperchargeBrowser — open-source navigation/performance extensions; workspaces, command palette, Glance, dedup, snapshots: https://github.com/SuperchargeBrowser/supercharge-browser
- Tab Wise — open-source side-panel tab manager with duplicate detection, sessions, activity/memory UI: https://github.com/Sid-1819/tab-wise
- TabDog — open-source search, domain grouping, workspaces, recent/history: https://github.com/sung01299/tabdog
- VertiTab — current Chrome Web Store listing advertises workspaces, snapshots, suspend, universal search, split view and rich context actions: https://chromewebstore.google.com/detail/vertitab-%E2%80%93-vertical-tab-m/chejfhdknideagdnddjpgamkchefjhoi
- TabTOC — current Chrome Web Store listing advertises native side panel/overlay/new-tab modes, tab-group sync and auto suspend: https://chromewebstore.google.com/detail/tabtoc-vertical-tab-sideb/gpoeknemdldoghgbljpgndafaieffalj
- ArchTabs — current Chrome Web Store listing advertises Spaces, command bar, snapshots and optional permissions for history/bookmarks: https://chromewebstore.google.com/detail/archtabs-%E2%80%94-ultra-compact/iibohhagdapncaofncjmphehlaajoecd

## Product guardrails from this scan

- Do not turn AppTower into a general vertical-tab manager while the differentiator remains persistent web applications/panes beside the current page.
- Prefer event-driven snapshots and lifecycle handling over periodic polling.
- Prefer optional permissions for optional integrations.
- Specialized adapters/modules are preferable to broad core permissions or forcing every site through the same iframe renderer.
- Every promoted competitor-inspired feature must first prove fit through acceptance criteria and automated tests.
