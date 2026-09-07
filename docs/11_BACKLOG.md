# AppTower ranked backlog

Last competitor scan: 2026-09-07.

## Rules

- Global WIP = 1: only one functional TASK may be `ACTIVE`.
- New TASK execution is blocked while CI is red, `action_required`, or revalidation is pending.
- TASKS require score, rationale, acceptance criteria, automated test plan, dependencies, sources/competitors and status `READY/BLOCKED/ACTIVE/DONE/REJECTED`.
- IDEA/TASK score = user value 25 + real pain/regression 20 + AppTower fit 15 + measurable performance/UX 15 + low implementation risk 10 + privacy/permissions 5 + competitor maturity 5 + automated testability 5.
- At equal score, prefer technical-debt/race-condition reduction.
- TASK numbers are stable identifiers; table rank is the current priority order.
- Competitor code is never copied when licensing is incompatible/unclear; only clean-room behavior/architecture patterns may be transferred.

## Current execution gate

**No TASK is ACTIVE.** TASK 2 is complete. This research process does not activate implementation work; only the AppTower Task Executor may move another TASK to `ACTIVE`.

The current regression PR #2 head observed during this scan is `72f8d3e27674dcff41c35d3f83329fd2b7e42d71`. Its `validate` workflow run `34091866718` completed with conclusion **`success`**. Source validation, unit tests, Chromium extension E2E, exact-commit fallback/package rebuild and artifact upload all passed. The previous global CI block is therefore cleared for TASKS that are otherwise `READY`; TASKS with unresolved functional dependencies remain `BLOCKED`.

## Fresh research notes

- Microsoft Edge documentation updated in July 2026 now explicitly marks the PWA `edge_side_panel` integration as **deprecated** and says it will soon no longer be supported. AppTower must not make PWA-sidebar metadata a required compatibility path. PWA discovery may remain useful for ordinary installability/app metadata, but panel compatibility must stay capability-driven and fall back to AppTower's own Embedded/Mobile/Real Page surfaces. This strengthens TASK 9 and adds a guardrail to TASK 12; it does not justify a separate TASK or a score change.
- Tab Pilot / Tab Radar is a current MIT-licensed side-panel tab command center with fuzzy search, command palette, grouping, sessions/recently-closed and activity features. Its manifest currently requests `tabs`, `tabGroups`, `windows`, `sidePanel`, `storage`, `sessions`, `history`, `activeTab`, `scripting`, `nativeMessaging`, `idle`, `alarms`, `<all_urls>`, and an all-page content script. This is useful competitor evidence for Command Palette/search UX, but its broad permission/injection surface is an anti-pattern for AppTower's core and reinforces TASK 10 (permission budget) plus TASK 12 (context-scoped injection). No source code is needed or copied.
- All TASK and IDEA scores were recalculated after these findings. No numeric score changed: the Edge deprecation changes compatibility constraints rather than user value, and Tab Pilot adds corroborating evidence without enough independent maturity/performance evidence to change a score.

## TASKS

| Rank | Score | Status | TASK | Dependencies |
|---:|---:|---|---|---|
| 1 | 97 | DONE | Deterministic Side Panel command routing and Add Current Page source resolution | Completed; regression suite green at completion |
| 2 | 92 | DONE | Serialized state coordinator for panel/rail/workspace mutations | TASK 1; completed on green CI |
| 3 | 90 | BLOCKED | Deterministic drag/drop interaction model for reorder, groups and two-pane templates | TASK 2; stable pointer/drag lifecycle |
| 4 | 89 | READY | Safe pane sleep guards for unsaved input, active media and explicit keep-awake | Embedded-frame bridge; resource lease/sleep path |
| 5 | 88 | BLOCKED | Versioned persistence schema + append-only migrations | TASK 2; persisted-state inventory |
| 6 | 86 | BLOCKED | Command Palette across shortcuts/templates/workspaces/recent | TASK 2 |
| 7 | 85 | BLOCKED | Event-driven nearest-deadline resource scheduling | Performance baseline |
| 8 | 84 | BLOCKED | Event-based workspace snapshots + Undo | TASK 2; TASK 4 preferred |
| 9 | 83 | BLOCKED | Installed-extension lifecycle E2E harness using browser-managed install/action/inspection | Reproducible package; Chrome toolchain availability |
| 10 | 82 | BLOCKED | Compatibility ladder UX: Auto / Embedded / Mobile / Real Page | Stable renderer telemetry; TASK 1 |
| 11 | 81 | BLOCKED | Manifest permission budget + CI regression gate | Current manifest/variant inventory |
| 12 | 80 | READY | Duplicate shortcut detection and reuse prompt | Stable add flow |
| 13 | 79 | BLOCKED | Context-scoped pane bridge/PWA content-script injection instead of all-page/all-frame injection | Current script-role inventory; TASK 1 |
| 14 | 79 | BLOCKED | Restorable split layout metadata in templates | TASK 2; TASK 4 preferred; stable split lifecycle |
| 15 | 78 | BLOCKED | Native browser tab-group import/export bridge | Stable groups/workspaces; TASK 4 preferred |
| 16 | 76 | BLOCKED | Glance preview in temporary bottom pane | Stable split-pane lifecycle |

Only the AppTower Task Executor may change another TASK to `ACTIVE`.

### TASK 1 — Deterministic panel routing / Add Current Page — 97/100 — DONE
**Rationale:** fixes an observed core regression and removes invalid panel-routing assumptions.
**Acceptance criteria:** `+` resolves the real active HTTP(S) tab; Search/Add/Organize do not recreate the panel document; empty workspace survives restart; one injected rail; split-pane isolation.
**Automated test plan/result:** headed Chromium Playwright for Add Current Page, live command routing, restart, duplicate rail, split isolation; 11/11 E2E passed at completion.
**Dependencies:** none beyond current panel architecture.
**Sources/competitors:** internal AppTower regressions; no competitor code dependency.

### TASK 2 — Serialized state coordinator — 92/100 — DONE
**Rationale:** one ordered mutation boundary reduces race-driven reload/reconnect bugs across user actions, storage events, ports and panel lifecycle.
**Acceptance criteria/result:** shared-state mutations use one FIFO coordinator and lifecycle store/controller; persistence/render phases serialize; read barriers do not generate mutation commits; reconnect preserves rail/workspace state without reopening panel document.
**Automated test plan/result:** delayed-async ordering/read barriers; coordinator/store/controller unit coverage; static wiring regression; headed Chromium rapid Search/Organize/Add + reconnect; live background panel routing/document reuse diagnostics.
**Dependencies:** TASK 1.
**Sources/competitors:** Lunma (Apache-2.0) as architectural evidence only; AppTower implementation clean-room.

### TASK 16 — Deterministic drag/drop interaction model — 90/100 — BLOCKED
**Score:** 23/25 user value + 19/20 real pain/regression + 15/15 AppTower fit + 13/15 measurable UX/reliability + 7/10 low implementation risk + 5/5 privacy/permissions + 3/5 competitor maturity + 5/5 automated testability = **90**.
**Rationale:** fixes the known prohibited-drop/group/template interaction regression. SuperSplit supplies clean-room evidence for explicit drop zones; Tab Canopy supplies evidence for declaring move intent before background/UI synchronization.
**Acceptance criteria:** deterministic reorder/group/template targets; deterministic insertion into existing groups; explicit top/bottom template target; invalid/self/cross-workspace drop never mutates state; Esc/pointercancel/lost capture rolls back; mouse/pointer semantics agree; unrelated pane does not reload.
**Automated test plan:** hit-test boundary fixtures; reorder; site→group; site→site→Group; site→site→Template; invalid/self/cross-workspace rejection; cancellation; race with storage/render update; in-flight move plus browser event; headed Chromium real drag/pointer E2E and persisted-state assertions.
**Dependencies:** TASK 2 completed; stable pointer/drag lifecycle. Coordinate with TASK 13 so layout metadata does not create a second drag model.
**Sources/competitors:** AppTower known P0; SuperSplit (`schappim/supersplit-js`, MIT); Tab Canopy (`firtoz/tab-canopy`, MIT, alpha). Clean-room behavior only.

### TASK 3 — Safe pane sleep guards — 89/100 — READY
**Rationale:** automatic sleep must not destroy unsaved edits or interrupt active media while retaining resource savings.
**Acceptance criteria:** dirty form/contenteditable and active media block auto-sleep; `Keep awake` persists without polling; blockers clear after submit/reset/pause/end; pane-scoped cleanup on navigation/removal; no broad permission.
**Automated test plan:** dirty text/checkbox/contenteditable; playing/paused media; keep-awake restart; blocker cleanup; unchanged idle/max-live semantics for normal panes.
**Dependencies:** embedded-frame bridge and resource lease/sleep path.
**Sources/competitors:** Drowzy (MIT); QuickPanel Lite Mode/Keep Alive as behavior evidence only because QuickPanel is PolyForm Noncommercial.

### TASK 4 — Versioned persistence schema + append-only migrations — 88/100 — BLOCKED
**Score:** 23+17+15+10+8+5+5+5 = **88**.
**Rationale:** durable workspaces/settings/templates/layout/export state needs explicit evolution rather than silent reset/defaulting.
**Acceptance criteria:** explicit version per durable family; one validation/normalization boundary; deterministic append-only migrations; safe corrupt/future handling; migration before runtime mutation; export/import uses the same pipeline.
**Automated test plan:** historical fixtures; golden/idempotent migrations; malformed/future cases; legacy-profile restart; export/import round trip; coordinator never sees pre-migration state.
**Dependencies:** TASK 2, persisted-state inventory.
**Sources/competitors:** Lunma (Apache-2.0), pattern only.

### TASK 5 — Command Palette — 86/100 — BLOCKED
**Rationale:** keyboard-first command/search improves reach without permanent UI density.
**Acceptance criteria:** unified search over shortcuts/templates/workspaces/recent; keyboard execution; deterministic ranking; no history permission for core results; `/` search remains compatible or migrates cleanly.
**Automated test plan:** keyboard-only E2E; ranking fixtures; empty/no-match; execute each entity type; no panel-document reload on open/close.
**Dependencies:** TASK 2.
**Sources/competitors:** ArchTabs, SuperchargeBrowser, Tab Manager v2, Tablio; Tab Pilot/Tab Radar (MIT) adds fresh 2026 behavior evidence but its broad permission model must not be copied.

### TASK 6 — Event-driven resource budget scheduling — 85/100 — BLOCKED
**Rationale:** fixed periodic alarms wake the MV3 worker when no work exists; nearest-deadline scheduling reduces idle wakeups.
**Acceptance criteria:** no recurring alarm with zero leases; next check is earliest meaningful deadline; create/touch/remove reschedules deterministically; current idle/max-live behavior is preserved; restart restores deadline.
**Automated test plan:** zero/one/many lease scheduler; touch/remove; pane-isolation E2E; instrument service-worker wakeups before/after.
**Dependencies:** performance baseline.
**Sources/competitors:** AppTower implementation; MV3 event-driven guidance; QuickPanel behavior evidence. Tab Pilot's simultaneous `idle` + `alarms` activity model is not evidence of lower energy use and must not be treated as such.

### TASK 7 — Event-based workspace snapshots + Undo — 84/100 — BLOCKED
**Rationale:** recovery from destructive workspace/group/template mutations has high value without periodic background work.
**Acceptance criteria:** snapshot only meaningful destructive mutations; bounded retention; one-step Undo without unrelated pane reload; versioned snapshot schema; no polling.
**Automated test plan:** mutation fixtures; undo per destructive operation; retention; restart; zero snapshot writes during read-only activity.
**Dependencies:** TASK 2; TASK 4 preferred.
**Sources/competitors:** VertiTab, ArchTabs, SuperchargeBrowser, SnapTabs (MIT).

### TASK 8 — Installed-extension lifecycle E2E harness — 83/100 — BLOCKED
**Score:** 20+18+14+10+7+5+4+5 = **83**.
**Rationale:** AppTower has repeatedly reproduced failures only after loading the real extension. Browser-managed install/action/inspection closes the gap between unit/page tests and live extension behavior.
**Acceptance criteria:** install exact package in clean Chrome profile; verify id/version; trigger real extension action; smoke open/collapse/expand/Add/Search/Organize; detect duplicate panel/rail; capture deterministic diagnostics; dispose profile; no new runtime permission.
**Automated test plan:** clean install/action; reload/reinstall; restart persistence; one rail; native side panel; Add Current Page; collapse/expand; diagnostics; stale/wrong package negative case.
**Dependencies:** reproducible exact-head package/provenance; supported Chrome DevTools-for-agents/MCP environment.
**Sources/competitors:** Chrome for Developers, “Debug Chrome extensions with AI agents” (2026-09-04; docs CC BY 4.0, samples Apache-2.0). AppTower harness is independent.

### TASK 9 — Compatibility ladder — 82/100 — BLOCKED
**Rationale:** explainable fallback is better than exposing renderer internals when sites cannot embed cleanly. Edge's July 2026 deprecation of PWA `edge_side_panel` further argues against relying on browser-vendor PWA sidebar integration as a durable compatibility surface.
**Acceptance criteria:** Auto/Embedded/Mobile/Real Page; deterministic failure reason; diagnostics only on explicit action; site/pane-scoped fallback; unrelated pane remains live; no required dependency on `edge_side_panel` or another deprecated PWA-sidebar surface.
**Automated test plan:** successful embed/frame denial/navigation failure/Real Page fixtures; per-site persistence; two-window compatibility-rule collision; permission prompts; capability-negative fixture where Edge PWA-sidebar support is unavailable/deprecated and AppTower still selects its own supported surface.
**Dependencies:** stable renderer telemetry, TASK 1.
**Sources/competitors:** Universal Split View; SplitView; SidePilot (Apache-2.0); QuickPanel behavior evidence only (PolyForm Noncommercial); Microsoft Edge PWA-sidebar documentation updated July 2026, deprecating `edge_side_panel`.

### TASK 10 — Manifest permission budget + CI regression gate — 81/100 — BLOCKED
**Score:** 18+16+15+8+9+5+5+5 = **81**.
**Rationale:** AppTower already removed unneeded permissions; a CI allowlist prevents permission creep, unexpected warnings and store-review regressions.
**Acceptance criteria:** reviewed required/optional/host sets per variant; fail on unreviewed addition or optional→required promotion; rationale per permission; generated fallback has its own narrower budget; removals remain allowed.
**Automated test plan:** allowed/new required/new optional/new host/required↔optional/fallback-drift fixtures; package validation runs the same gate.
**Dependencies:** current manifest/variant inventory.
**Sources/competitors:** Benjamin410/chrome-tab-manager (ISC); Chrome Web Store minimum-permission guidance; Tab Pilot/Tab Radar (MIT) as fresh evidence of how a feature-rich side-panel manager can accumulate `history`, `nativeMessaging`, `idle`, `alarms`, `<all_urls>` and all-page injection — a boundary AppTower should avoid unless separately justified.

### TASK 11 — Duplicate shortcut detection — 80/100 — READY
**Rationale:** prevents rail/workspace clutter with low implementation and permission risk.
**Acceptance criteria:** canonical URL matching; reuse/open existing or intentionally duplicate; group/template identity not merged accidentally; no network lookup.
**Automated test plan:** canonical URL/query/hash fixtures; same URL across workspaces/groups; Add Current Page E2E; keyboard confirmation.
**Dependencies:** stable add flow.
**Sources/competitors:** Tab Wise, Tabwise, TabDog, Tab Manager v2, Tablio.

### TASK 12 — Context-scoped pane bridge/PWA content-script injection — 79/100 — BLOCKED
**Score:** 19+14+15+11+7+5+3+5 = **79**.
**Rationale:** pane bridge/PWA discovery currently run too broadly. Narrowing execution reduces injection surface and avoidable work. Edge's deprecation of `edge_side_panel` means PWA discovery must not evolve into a required Edge-sidebar integration dependency.
**Acceptance criteria:** inventory rail/pane/PWA roles; pane bridge only in AppTower-owned pane contexts; PWA discovery on-demand/bounded to inspected page; sensitive contexts are not broadened; Add Current Page/PWA metadata detection still works; no new permission; no required dependency on `edge_side_panel`; measure helper initializations before/after.
**Automated test plan:** static manifest assertion; ordinary page has no pane/PWA helper initialization; top/bottom pane isolation; on-demand PWA fixture; auth/payment fixtures; restart/reconnect/fallback; capability-negative Edge PWA-sidebar fixture; before/after initialization count.
**Dependencies:** current content-script inventory; TASK 1. Coordinate with TASK 9.
**Sources/competitors:** Side Link Preview (MIT) behavior/privacy evidence; Chrome `scripting` API docs; Microsoft Edge July 2026 PWA-sidebar deprecation. Tab Pilot's `<all_urls>` plus all-page content script is a current anti-pattern comparison, not an implementation source.

### TASK 13 — Restorable split layout metadata — 79/100 — BLOCKED
**Score:** 21+12+14+12+7+5+4+4 = **79**.
**Rationale:** layout ratios are durable workflow state; AppTower can gain repeatability without arbitrary tiling.
**Acceptance criteria:** bounded ratio; legacy default; restore without unnecessary pane reload; rebalance/reset; restart/export-import; exactly two panes.
**Automated test plan:** schema bounds/defaults; non-default ratio with stable document tokens; reset/save; restart/export-import; pane isolation.
**Dependencies:** TASK 2, TASK 4 preferred, stable split lifecycle.
**Sources/competitors:** Chromium Split View/session restore; SideSplit; Split Workspace store behavior. Split Workspace source/license unverified, behavior only.

### TASK 14 — Native tab-group import/export bridge — 78/100 — BLOCKED
**Rationale:** native interoperability without turning AppTower into a full tab manager.
**Acceptance criteria:** explicit import/export; preserve title/color/order where API supports; AppTower remains authoritative; no history/bookmarks permission for basic bridge.
**Automated test plan:** import/export native groups; duplicates; collapsed groups; restart; unsupported-browser fallback.
**Dependencies:** stable groups/workspaces; TASK 4 preferred.
**Sources/competitors:** Lunma, TabTOC, SnapTabs, Tab Manager v2.

### TASK 15 — Glance preview in temporary bottom pane — 76/100 — BLOCKED
**Rationale:** temporary reference preview reuses AppTower split model instead of spawning permanent tabs/windows.
**Acceptance criteria:** temporary bottom pane; top unchanged; explicit promote; close restores layout; compatibility fallback applies.
**Automated test plan:** preview/close/promote; repeated previews; blocked-embed fallback; stable top-pane document token.
**Dependencies:** stable split-pane lifecycle.
**Sources/competitors:** SuperchargeBrowser Glance-style preview.

## IDEAS

| Rank | Score | IDEA | Evidence / source | Promotion condition / risk |
|---:|---:|---|---|---|
| 1 | 74 | Anchored Real Page/sidecar placement: remember monitor/window bounds, restore extension-owned sidecar geometry after restart and optionally reuse an existing sidecar | Tab Anchor (MIT), QuickPanel; Split Workspace/splitescreen store behavior | Promote after Real Page lifecycle is stable; normalize display changes; never reroute normal browsing globally; store-only source/license remains unverified where noted. |
| 2 | 74 | Per-site sleep policy presets: default/aggressive/never sleep | Drowzy (MIT) | Promote after TASK 3 + measurable resource baseline. |
| 3 | 74 | Panel navigation escape policy | QuickPanel | Promote after navigation telemetry proves accidental pane hijacking; clean-room only because QuickPanel is PolyForm Noncommercial. |
| 4 | 73 | Resource-pressure-aware emergency eviction using coarse system-memory pressure, LRU and pane safety guards | TabRest (MIT) | Promote after TASK 3 + TASK 6 baseline; justify `system.memory`; no per-pane heap polling/broad host access. |
| 5 | 73 | Favorites/pinned mini-row independent of workspace ordering | ddSideBar (MIT), Lunma, TabTree, ThisPanel | Promote if rail overflow is recurring UX pain. |
| 6 | 72 | Workspace/session import from other managers | VertiTab, Lunma, Tabwise | Promote after TASK 4 export/import schema; avoid mandatory history permission. |
| 7 | 71 | Native browser Split View awareness/bridge | W3C WebExtensions split-tabs proposal; MDN; Chrome Web Store split-view behavior | Keep as IDEA until stable create/remove split-view APIs or a concrete coexistence regression. |
| 8 | 70 | Recently accessed smart view | VertiTab, TabDog; Tab Pilot adds fresh recency/activity UX evidence but uses `history`/`idle` and does not justify those permissions for AppTower | Promote after current Recent is stable/searchable; prefer AppTower-owned recency data before requesting history. |
| 9 | 70 | Optional Document Picture-in-Picture companion mode | Chrome Document PiP; Super Pinned Windows (MIT) | Concrete compact-player/reference use case required; no CSP/XFO stripping or broad host access. |
| 10 | 68 | Optional browser-context actions over selected text/link | AI Side Panel / SuperchargeNavigation patterns | Needs concrete non-AI use case and optional-permission review. |
| 11 | 65 | Portable workspace export/mirror to native browser bookmarks | Mooring | Explicit optional `bookmarks` only; clean-room where license is unclear. |
| 12 | 65 | Focus mode: temporarily show only one group/workspace | TabTree, Tabwise | Promote if groups/templates overload rail. |
| 13 | 62 | Automatic domain grouping suggestions | VertiTab, TabDog, SuperchargeNavigation | Opt-in shortcut organizer only; do not become a tab manager. |
| 14 | 58 | Optional AI organizer module | Leap/VertiTab-style products | Keep out of core until privacy-preserving provider/module contract and demand. |
| 15 | 54 | Full vertical-tab manager | VertiTab, TabTOC, ddSideBar, TabTree, Tabwise | Deliberately low; conflicts with product boundary. |
