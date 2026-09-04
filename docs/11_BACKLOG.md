# AppTower ranked backlog

Last competitor scan: 2026-09-04.

## Rules

- One functional TASK may be `ACTIVE` at a time (global WIP = 1).
- New TASK execution is blocked while CI is red, `action_required`, or revalidation is pending after a new change.
- `TASKS` require score, rationale, acceptance criteria, automated test plan, dependencies, sources/competitors and one of `READY/BLOCKED/ACTIVE/DONE/REJECTED`.
- `IDEAS` remain below execution priority until their promotion condition is satisfied.
- Scores are recalculated whenever a material new item is added.
- Score = user value 25% + real pain/regression 20% + AppTower fit 15% + measurable performance/UX gain 15% + implementation risk 10% (higher = lower risk) + privacy/permissions 5% + competitor maturity 5% + automated testability 5%.
- At equal score, prefer the item that reduces technical debt/race conditions.

## Current execution gate

**TASK 2 remains the only ACTIVE TASK.** Global WIP lock is held by the Serialized state coordinator implementation.

Latest observed PR head before this backlog commit: `fceccbd028acd2d116dd2e91690ac24724eaf29d` (`docs: record coordinator routing CI and performance sample`). `validate` run `33853054828` completed successfully. Therefore CI was green before this backlog-only change, but this new head requires normal revalidation before any READY TASK may start. TASK 2 remains ACTIVE regardless, so global single-WIP still blocks another implementation.

## TASKS

| Rank | Score | Status | TASK | Dependencies |
|---:|---:|---|---|---|
| 1 | 97 | DONE | Deterministic Side Panel command routing and Add Current Page source resolution | Completed; regression suite green at completion |
| 2 | 92 | ACTIVE | Serialized state coordinator for panel/rail/workspace mutations | Task 1; single-WIP lock |
| 3 | 89 | READY | Safe pane sleep guards for unsaved input, active media and explicit keep-awake | Embedded-frame bridge; resource lease/sleep path; green CI before execution |
| 4 | 88 | BLOCKED | Versioned persistence schema + append-only migrations | TASK 2 green; persisted-state inventory |
| 5 | 86 | BLOCKED | Command Palette across shortcuts/templates/workspaces/recent | TASK 2 green |
| 6 | 85 | BLOCKED | Event-driven nearest-deadline resource scheduling | Performance baseline; green CI |
| 7 | 84 | BLOCKED | Event-based workspace snapshots + Undo | TASK 2 preferred; TASK 4 preferred |
| 8 | 82 | BLOCKED | Compatibility ladder UX: Auto / Embedded / Mobile / Real Page | Stable renderer telemetry; Task 1 |
| 9 | 80 | READY | Duplicate shortcut detection and reuse prompt | Stable add flow; green CI before execution |
| 10 | 79 | BLOCKED | Restorable split layout metadata in templates | TASK 2; TASK 4 preferred; stable split lifecycle |
| 11 | 78 | BLOCKED | Native browser tab-group import/export bridge | Stable groups/workspaces; TASK 4 preferred |
| 12 | 76 | BLOCKED | Glance preview in temporary bottom pane | Stable split-pane lifecycle |

Only the AppTower Task Executor may change another TASK to `ACTIVE`.

### TASK 1 — Deterministic panel routing / Add Current Page — 97/100 — DONE

**Rationale:** fixes an observed core regression and removes invalid assumptions from the E2E harness.

**Acceptance criteria:** `+` resolves the real active HTTP(S) tab; live Search/Add/Organize intents do not recreate the panel document; empty workspace survives restart; only one injected rail exists; split-pane isolation remains intact.

**Automated test plan/result:** headed Chromium Playwright coverage for Add Current Page, live command routing, restart, duplicate rail and split isolation; 11/11 E2E passed when TASK 1 was completed.

**Sources/competitors:** internal AppTower regressions and regression suite; no competitor code dependency.

### TASK 2 — Serialized state coordinator — 92/100 — ACTIVE

**Rationale:** AppTower has concurrent user actions, storage events, port reconnects and panel lifecycle events. One ordered mutation boundary should reduce race-driven reload/reconnect bugs and technical debt.

**Acceptance criteria:** all shared-state mutations enter one queue/coordinator; persistence/render phases cannot interleave; read-only events do not persist/wake unnecessarily; pane isolation/restart/rail behavior stays unchanged.

**Automated test plan:** delayed-async ordering unit tests; rapid collapse/expand/search/add/reconnect/workspace E2E; assert one persist/render phase per logical mutation where applicable.

**Sources/competitors:** Lunma (Apache-2.0) is architectural evidence for a structured local store and Playwright testing. AppTower implementation is clean-room.

### TASK 3 — Safe pane sleep guards — 89/100 — READY

**Rationale:** auto-sleep must never destroy unsaved edits or interrupt playing media. This directly protects correctness while retaining resource saving.

**Acceptance criteria:** dirty form/contenteditable and active media block automatic pane sleep; explicit `Keep awake` persists without polling; blockers clear after submit/reset/pause/end; blocker state is pane-scoped and cleaned on navigation/removal; no new broad permission.

**Automated test plan:** fixture E2E for dirty text/checkbox/contenteditable; playing/paused media; keep-awake restart persistence; blocker cleanup; unchanged 5-minute idle / max-live=6 behavior for normal panes.

**Sources/competitors:** Drowzy (MIT) validates unsaved-form protection and keep-awake as a suspension pattern; AppTower uses its own iframe bridge implementation.

### TASK 4 — Versioned persistence schema + append-only migrations — 88/100 — BLOCKED

**Score:** 23/25 value + 17/20 pain + 15/15 fit + 10/15 UX/reliability + 8/10 low risk + 5/5 privacy + 5/5 maturity + 5/5 testability = **88**.

**Rationale:** workspaces/settings/templates/layout/export payloads are long-lived state. Explicit versioning prevents silent defaults/reset and makes future evolution testable.

**Acceptance criteria:** every durable state family has an explicit current version; all reads pass one validation/normalization boundary; migrations are ordered, append-only and deterministic; corrupt/future data fails safely; migration completes before normal runtime mutation; export/import uses the same pipeline; no new permission/network dependency.

**Automated test plan:** historical fixtures; golden migrations; idempotency; malformed/future-version cases; restart from legacy profile; export/import round trip; regression that TASK 2 never observes pre-migration durable state.

**Sources/competitors:** Lunma (Apache-2.0) documents versioned persisted reads and append-only migrations. Pattern only; no code copying.

### TASK 5 — Command Palette — 86/100 — BLOCKED

**Rationale:** a keyboard-first command/search surface increases reach without adding permanent UI density and is repeatedly validated by current workspace/tab tools.

**Acceptance criteria:** one palette searches shortcuts/templates/workspaces/recent; keyboard-first open/filter/execute; deterministic ranking; no history permission required for core results; existing `/` search remains compatible or migrates cleanly.

**Automated test plan:** keyboard-only E2E; ranking fixtures; empty/no-match behavior; execute each entity type; assert no panel-document reload when palette opens/closes.

**Sources/competitors:** ArchTabs, SuperchargeBrowser, Tab Manager v2.

### TASK 6 — Event-driven resource budget scheduling — 85/100 — BLOCKED

**Rationale:** current fixed one-minute alarm wakes the MV3 worker even when there are no resource leases. Nearest-deadline scheduling removes deterministic idle wakeups.

**Acceptance criteria:** no recurring alarm with zero leases; next check equals earliest meaningful deadline; create/touch/remove reschedules deterministically; 5-minute idle and max-live=6 semantics unchanged; restart restores the next deadline.

**Automated test plan:** zero/one/many lease scheduler tests; touch/remove rescheduling; pane-isolation E2E; compare service-worker wakeup count before/after with instrumentation.

**Sources/competitors:** internal AppTower background/resource-budget implementation; general MV3 event-driven design principle.

### TASK 7 — Event-based workspace snapshots + Undo — 84/100 — BLOCKED

**Rationale:** recovery from destructive grouping/template/workspace changes has high value, while mutation-triggered snapshots avoid periodic background work.

**Acceptance criteria:** snapshot only meaningful destructive mutations; bounded retention; one-step Undo restores prior workspace state without reloading unrelated panes; snapshot data uses versioned schema; no polling.

**Automated test plan:** add/remove/reorder/group/template mutation fixtures; undo after each destructive operation; retention boundary; restart; verify zero snapshot writes during read-only activity.

**Sources/competitors:** VertiTab, ArchTabs, SuperchargeBrowser, SnapTabs (MIT) provide maturity evidence for snapshot/session recovery.

### TASK 8 — Compatibility ladder — 82/100 — BLOCKED

**Rationale:** users should see an understandable fallback model rather than low-level renderer modes when a site cannot embed cleanly.

**Acceptance criteria:** normal UX exposes Auto/Embedded/Mobile/Real Page; Auto records a deterministic failure reason and escalates only as needed; optional diagnostic permissions are requested only on explicit action; fallback is site/pane scoped and does not reload the unrelated pane.

**Automated test plan:** fixtures for successful embed, frame denial, navigation failure and Real Page fallback; persistence per site; two-window collision regression for compatibility rules; permission prompt tests.

**Sources/competitors:** Universal Split View; SplitView; SidePilot (Apache-2.0) for explicit diagnostics and optional diagnostic permissions. AppTower uses independent implementation.

### TASK 9 — Duplicate shortcut detection — 80/100 — READY

**Rationale:** prevents rail/workspace clutter with low implementation and permission risk.

**Acceptance criteria:** canonical URL matching detects an existing shortcut; user can reuse/open existing or intentionally add another; group/template identity is not accidentally merged; no network lookup.

**Automated test plan:** canonical URL fixtures; query/hash policy; same URL in different workspaces/groups; Add Current Page E2E; keyboard confirmation flow.

**Sources/competitors:** Tab Wise, Tabwise, TabDog, Tab Manager v2.

### TASK 10 — Restorable split layout metadata — 79/100 — BLOCKED

**Score:** 21/25 value + 12/20 pain + 14/15 fit + 12/15 UX + 7/10 low risk + 5/5 privacy + 4/5 maturity + 4/5 testability = **79**.

**Rationale:** split ratios/layout are becoming persistent workflow state; AppTower can gain repeatability without expanding beyond two panes.

**Acceptance criteria:** template may persist bounded ratio; legacy templates use default; reopening restores ratio without unnecessary pane reload; rebalance/reset; restart/export-import persistence; scope remains exactly two panes.

**Automated test plan:** schema bounds/defaults; non-default-ratio E2E with stable pane document tokens; reset/save; restart/export-import; pane isolation regression.

**Sources/competitors:** Chromium Split View/session restore and persisted Side Panel resizing (BSD-style browser source as behavioral evidence only); Split View; SideSplit.

### TASK 11 — Native tab-group import/export bridge — 78/100 — BLOCKED

**Rationale:** provides interoperability with browser-native organization without turning AppTower into a full tab manager.

**Acceptance criteria:** explicit import/export only; preserve group title/color/order where browser API supports it; AppTower remains authoritative storage; no history/bookmarks permission required for the basic bridge.

**Automated test plan:** import/export native tab groups; duplicate URLs; collapsed groups; restart; unsupported-browser fallback.

**Sources/competitors:** Lunma, TabTOC, SnapTabs, Tab Manager v2.

### TASK 12 — Glance preview in temporary bottom pane — 76/100 — BLOCKED

**Rationale:** AppTower can reuse its split model for temporary link/reference preview without spawning a permanent tab/window.

**Acceptance criteria:** preview opens in temporary bottom pane; current top pane remains unchanged; promote preview to persistent shortcut/pane explicitly; close returns previous layout; compatibility fallback still applies.

**Automated test plan:** link preview/close/promote; repeated previews; blocked-embed fallback; assert top-pane document token stays stable.

**Sources/competitors:** SuperchargeBrowser Glance-style preview; current split-pane products as workflow evidence.

## IDEAS

| Rank | Score | IDEA | Evidence / source | Promotion condition / risk |
|---:|---:|---|---|---|
| 1 | 74 | Per-site sleep policy presets: default/aggressive/never sleep | Drowzy (MIT) | Promote after TASK 3 + measurable resource baseline; avoid confusing overlapping policies |
| 2 | 73 | Resource-pressure-aware emergency eviction using coarse system-memory pressure, LRU and existing pane safety guards | TabRest (MIT) | Promote only after TASK 3 + TASK 6 baseline. `system.memory` must be justified/optional where possible; no continuous per-pane heap polling or broad host permission |
| 3 | 73 | Favorites/pinned mini-row independent of workspace ordering | ddSideBar (MIT), Lunma, TabTree | Promote if rail overflow is a recurring UX problem |
| 4 | 72 | Anchored Real Page/sidecar placement: remember monitor/window bounds and optionally reuse an existing sidecar window | Tab Anchor (MIT) stores `left/top/width/height`, supports reuse-existing-window and local-only state | Promote after Compatibility ladder/Real Page lifecycle is stable; must gracefully normalize missing/changed displays and never globally reroute normal browsing |
| 5 | 72 | Workspace/session import from other managers | VertiTab, Lunma, Tabwise | Promote after TASK 4 export/import schema; avoid mandatory history permission |
| 6 | 70 | Recently accessed smart view | VertiTab, TabDog | Promote after current Recent is stable/searchable |
| 7 | 68 | Optional browser-context actions over selected text/link | AI Side Panel / SuperchargeNavigation-style flows | Requires concrete non-AI use case and strict optional-permission review |
| 8 | 65 | Portable workspace export/mirror to native browser bookmarks | Mooring | `bookmarks` permission is broad; explicit optional permission only; Mooring has no verified reusable license in current backlog evidence, so pattern only |
| 9 | 65 | Focus mode: temporarily show only one group/workspace | TabTree, Tabwise | Promote if groups/templates create rail overload |
| 10 | 62 | Automatic domain grouping suggestions | VertiTab, TabDog, SuperchargeNavigation | AppTower must not become a general tab manager; opt-in shortcut organizer only |
| 11 | 58 | Optional AI organizer module | Leap/VertiTab-style products | Keep out of core until privacy-preserving provider/module contract and clear demand |
| 12 | 54 | Full vertical-tab manager | VertiTab, TabTOC, ddSideBar, TabTree, Tabwise | Deliberately low; conflicts with AppTower product boundary |

### New IDEA score: Resource-pressure-aware emergency eviction — 73/100

18/25 user value + 12/20 real pain + 14/15 AppTower fit + 13/15 measurable performance gain + 6/10 low implementation risk + 3/5 privacy/permissions + 3/5 competitor maturity + 4/5 automated testability = **73**.

At the 73-point tie, pressure-aware eviction ranks above the favorites mini-row because it extends the resource/sleep architecture and can prevent pathological memory pressure, while the mini-row is primarily UI convenience.

**Why this remains an IDEA:** TabRest demonstrates that a Chrome MV3 extension can combine `chrome.system.memory.getInfo()` with LRU selection and native discard, but its implementation checks system pressure every 30 seconds when enabled. Its per-tab JS-heap mode additionally depends on injected reporting and optional HTTP(S) host access. Those costs conflict with AppTower's event-driven/least-permission direction unless measurements prove the benefit.

**Transferable clean-room pattern:** if AppTower eventually needs pressure-aware behavior, use only a coarse emergency signal to tighten the existing pane budget, then evict the least-recently-used pane that passes TASK 3 safety guards. Do not copy TabRest code; do not add per-pane heap instrumentation by default; do not let memory pressure bypass unsaved-input/media/keep-awake blockers.

**License/permissions:** TabRest's repository contains an MIT license (including MIT attribution for portions derived from Drowzy). Its current MV3 manifest declares `tabs`, `storage`, `alarms`, `system.memory`, `contextMenus`, `tabGroups`, `scripting`, `idle`, `notifications`, `sidePanel`, a Sentry host permission, and optional `http://*/*` / `https://*/*` host permissions. AppTower should not inherit that permission set; only the independent coarse-pressure concept is considered compatible.

### Previous IDEA score: Anchored Real Page/sidecar placement — 72/100

18/25 user value + 10/20 real pain + 14/15 AppTower fit + 10/15 measurable UX gain + 8/10 low implementation risk + 5/5 privacy/permissions + 3/5 competitor maturity + 4/5 automated testability = **72**.

At the 72-point tie, anchored sidecar placement ranks above cross-manager import because stable Real Page fallback geometry reduces future window-placement/lifecycle regressions and therefore wins the technical-debt tie-break.

**Why this remains an IDEA:** it is useful only after the Real Page fallback lifecycle is stable; it is not a core regression today. The transferable pattern is small and can be implemented independently. Tab Anchor is MIT-licensed, but AppTower does not need to copy implementation code.

**Permission/energy note:** Tab Anchor's MV3 manifest uses `storage`, `tabs`, `windows`, `webNavigation`, `contextMenus`; it does not declare broad host permissions. AppTower should require only the minimum subset needed for an explicit Real Page sidecar operation and must not adopt global tab interception. Geometry persistence is event-driven/local and requires no polling.

## Recalculation after this scan

All pre-existing TASK and IDEA numeric scores remain unchanged. The new pressure-aware-eviction IDEA scores 73/100, so it does **not** cross the >=75 TASK threshold. No TASK was promoted or made ACTIVE. Global WIP remains 1 with TASK 2 ACTIVE. The only ordering change is insertion of the new 73-point IDEA above the existing 73-point favorites item under the technical-debt/resource-architecture tie-break.

## Competitor evidence used in this ranking

- Chromium built-in direction — BSD-style source: Split View, Split View Session Restore and persisted Side Panel width. Behavioral evidence only.
- Lunma — Apache-2.0; local Spaces/vertical tabs, structured store, migrations, Playwright E2E.
- Drowzy — MIT; MV3 suspension, unsaved-form protection, keep-awake.
- TabRest — MIT; active in 2026; system-memory threshold + LRU unload, optional per-tab heap monitoring, snooze/pause controls, Side Panel UI. Used only as clean-room resource-policy evidence because its periodic memory checks and optional host-injection path are not suitable defaults for AppTower.
- Tab Anchor — MIT; Chrome MV3 extension that stores a chosen window region (`left/top/width/height`), can reuse an existing window, supports multi-monitor placement and local-only state. Its manifest declares `storage`, `tabs`, `windows`, `webNavigation`, `contextMenus` and no host permissions. Used as sidecar-placement UX/architecture evidence only: https://github.com/Night-Owl-Labs/Tab-Anchor
- Mooring — source-visible Side Panel workspace manager using bookmarks/tab groups/runtime session state. Treat as pattern-only until license compatibility is explicitly verified.
- Sharp Tabs — minimum-permission/native suspension direction.
- TabTree — Side Panel vertical tabs/tree/pinned/search; use as UX evidence pending license verification.
- Tabwise — local workspaces/favorites/search/duplicate avoidance.
- ddSideBar — MIT; injected iframe or Chrome SidePanel; Spaces/bookmarks.
- SuperchargeBrowser — workspaces, command palette, Glance, dedup, snapshots.
- Tab Wise — side-panel manager with duplicate detection, sessions, activity/memory UI.
- TabDog — search, domain grouping, workspaces, recent/history.
- SnapTabs — MIT; local snapshots/restores including native tab groups.
- Tab Manager v2 — keyboard-first search/command palette/native tab-group operations.
- SidePilot — Apache-2.0; Side Panel web workspace, explicit diagnostics, optional diagnostic permissions and owner/lease-style rule management patterns.
- Universal Split View / SplitView / Split View / SideSplit — current split/real-window/layout product evidence; closed-source items are UX evidence only.
- VertiTab / TabTOC / ArchTabs — current workspace/search/snapshot/suspend/side-panel product evidence.
- SidepanelFallback — MIT; tested per-browser side-panel/window fallback pattern. AppTower already has an equivalent capability-based browser adapter/sidecar path, so no duplicate backlog item was added.

## Product guardrails

- Do not turn AppTower into a general vertical-tab manager while the differentiator remains persistent web applications/panes beside the current page.
- Do not expand beyond two panes merely because tilers support larger grids.
- Treat split arrangement/restoration and durable state as versioned, testable compatibility surfaces.
- Never auto-sleep a pane if that can silently destroy unsaved state or interrupt active media.
- Prefer event-driven lifecycle/snapshot/resource handling over polling.
- System-memory pressure may only tighten eviction policy after measurement; it must never bypass pane safety guards or justify default per-pane heap polling/broad host access.
- Prefer optional permissions for optional integrations; do not require history/bookmarks merely for onboarding.
- Do not make native bookmarks the authoritative AppTower store.
- Real Page/sidecar geometry must be scoped to AppTower-owned fallback windows only; never globally reroute normal tabs/pop-ups.
- Specialized adapters/modules are preferable to broad core permissions.
- Every promoted competitor-inspired feature must have acceptance criteria and automated regression/E2E coverage before execution.