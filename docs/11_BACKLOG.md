# AppTower ranked backlog

Last competitor scan: 2026-09-04.

## Rules

- Global WIP = 1: only one functional TASK may be `ACTIVE`.
- New TASK execution is blocked while CI is red, `action_required`, or revalidation is pending.
- TASKS require score, rationale, acceptance criteria, automated test plan, dependencies, sources/competitors and status `READY/BLOCKED/ACTIVE/DONE/REJECTED`.
- IDEA/TASK score = user value 25 + real pain/regression 20 + AppTower fit 15 + measurable performance/UX 15 + low implementation risk 10 + privacy/permissions 5 + competitor maturity 5 + automated testability 5.
- At equal score, prefer technical-debt/race-condition reduction.
- Competitor code is never copied when licensing is incompatible/unclear; only clean-room behavior/architecture patterns may be transferred.

## Current execution gate

**No TASK is ACTIVE.** TASK 2 is complete; the executor must select the next TASK in a later run.

The current PR head observed during this scan is `5a29da97a59620d057f458fb3adc26ecab037d42`. GitHub returned no combined-status entries for that head during this scan, so CI is **not confirmed green**. READY TASKS therefore remain blocked from activation until a successful validation run is observed.

## TASKS

| Rank | Score | Status | TASK | Dependencies |
|---:|---:|---|---|---|
| 1 | 97 | DONE | Deterministic Side Panel command routing and Add Current Page source resolution | Completed; regression suite green at completion |
| 2 | 92 | DONE | Serialized state coordinator for panel/rail/workspace mutations | Task 1; completed on green CI |
| 3 | 89 | READY | Safe pane sleep guards for unsaved input, active media and explicit keep-awake | Embedded-frame bridge; resource lease/sleep path; green CI |
| 4 | 88 | BLOCKED | Versioned persistence schema + append-only migrations | TASK 2; persisted-state inventory |
| 5 | 86 | BLOCKED | Command Palette across shortcuts/templates/workspaces/recent | TASK 2 |
| 6 | 85 | BLOCKED | Event-driven nearest-deadline resource scheduling | Performance baseline; green CI |
| 7 | 84 | BLOCKED | Event-based workspace snapshots + Undo | TASK 2; TASK 4 preferred |
| 8 | 82 | BLOCKED | Compatibility ladder UX: Auto / Embedded / Mobile / Real Page | Stable renderer telemetry; Task 1 |
| 9 | 80 | READY | Duplicate shortcut detection and reuse prompt | Stable add flow; green CI |
| 10 | 79 | BLOCKED | Restorable split layout metadata in templates | TASK 2; TASK 4 preferred; stable split lifecycle |
| 11 | 78 | BLOCKED | Native browser tab-group import/export bridge | Stable groups/workspaces; TASK 4 preferred |
| 12 | 76 | BLOCKED | Glance preview in temporary bottom pane | Stable split-pane lifecycle |

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

### TASK 3 — Safe pane sleep guards — 89/100 — READY
**Rationale:** automatic sleep must not destroy unsaved edits or interrupt active media while retaining resource savings.
**Acceptance criteria:** dirty form/contenteditable and active media block auto-sleep; `Keep awake` persists without polling; blockers clear after submit/reset/pause/end; pane-scoped cleanup on navigation/removal; no broad permission.
**Automated test plan:** dirty text/checkbox/contenteditable; playing/paused media; keep-awake restart; blocker cleanup; unchanged 5-minute idle/max-live=6 semantics for normal panes.
**Dependencies:** embedded-frame bridge, resource lease/sleep path, green CI.
**Sources/competitors:** Drowzy (MIT); QuickPanel Lite Mode/Keep Alive is additional behavior evidence, but its PolyForm Noncommercial code is not reusable.

### TASK 4 — Versioned persistence schema + append-only migrations — 88/100 — BLOCKED
**Score:** 23+17+15+10+8+5+5+5 = **88**.
**Rationale:** long-lived workspaces/settings/templates/layout/export state needs explicit evolution rather than silent reset/defaulting.
**Acceptance criteria:** explicit current version per durable family; one validation/normalization boundary; deterministic ordered append-only migrations; safe corrupt/future handling; migration before runtime mutation; export/import shares pipeline; no new permission/network dependency.
**Automated test plan:** historical fixtures; golden/idempotent migrations; malformed/future cases; legacy-profile restart; export/import round trip; coordinator never sees pre-migration state.
**Dependencies:** TASK 2, persisted-state inventory.
**Sources/competitors:** Lunma (Apache-2.0), pattern only.

### TASK 5 — Command Palette — 86/100 — BLOCKED
**Rationale:** keyboard-first command/search improves reach without permanent UI density.
**Acceptance criteria:** unified search over shortcuts/templates/workspaces/recent; keyboard execution; deterministic ranking; no history permission for core results; `/` search remains compatible or migrates cleanly.
**Automated test plan:** keyboard-only E2E; ranking fixtures; empty/no-match; execute each entity type; no panel-document reload on open/close.
**Dependencies:** TASK 2.
**Sources/competitors:** ArchTabs, SuperchargeBrowser, Tab Manager v2, Tablio.

### TASK 6 — Event-driven resource budget scheduling — 85/100 — BLOCKED
**Rationale:** fixed periodic alarms wake the MV3 worker when no work exists; nearest-deadline scheduling reduces idle wakeups.
**Acceptance criteria:** no recurring alarm with zero leases; next check is earliest meaningful deadline; create/touch/remove reschedules deterministically; 5-minute idle/max-live=6 unchanged; restart restores deadline.
**Automated test plan:** zero/one/many lease scheduler; touch/remove; pane-isolation E2E; instrument service-worker wakeups before/after.
**Dependencies:** performance baseline, green CI.
**Sources/competitors:** AppTower resource-budget implementation; MV3 event-driven design guidance; QuickPanel shared-environment/Lite-Mode behavior as non-code evidence.

### TASK 7 — Event-based workspace snapshots + Undo — 84/100 — BLOCKED
**Rationale:** recovery from destructive workspace/group/template mutations has high value without periodic background work.
**Acceptance criteria:** snapshot only meaningful destructive mutations; bounded retention; one-step Undo without unrelated pane reload; versioned snapshot schema; no polling.
**Automated test plan:** mutation fixtures; undo per destructive operation; retention; restart; zero snapshot writes during read-only activity.
**Dependencies:** TASK 2; TASK 4 preferred.
**Sources/competitors:** VertiTab, ArchTabs, SuperchargeBrowser, SnapTabs (MIT).

### TASK 8 — Compatibility ladder — 82/100 — BLOCKED
**Rationale:** explainable fallback is better than exposing renderer internals when sites cannot embed cleanly.
**Acceptance criteria:** Auto/Embedded/Mobile/Real Page; deterministic failure reason; optional diagnostics only on explicit action; site/pane-scoped fallback; unrelated pane remains live.
**Automated test plan:** successful embed/frame denial/navigation failure/Real Page fixtures; per-site persistence; two-window compatibility-rule collision; permission prompt tests.
**Dependencies:** stable renderer telemetry, TASK 1.
**Sources/competitors:** Universal Split View; SplitView; SidePilot (Apache-2.0); QuickPanel WebView2 demonstrates why a Real Page/native sidecar remains necessary for iframe-blocked sites, but QuickPanel source is PolyForm Noncommercial and not reusable.

### TASK 9 — Duplicate shortcut detection — 80/100 — READY
**Rationale:** prevents rail/workspace clutter with low implementation and permission risk.
**Acceptance criteria:** canonical URL matching; reuse/open existing or intentionally duplicate; group/template identity not merged accidentally; no network lookup.
**Automated test plan:** canonical URL/query/hash fixtures; same URL across workspaces/groups; Add Current Page E2E; keyboard confirmation.
**Dependencies:** stable add flow, green CI.
**Sources/competitors:** Tab Wise, Tabwise, TabDog, Tab Manager v2, Tablio.

### TASK 10 — Restorable split layout metadata — 79/100 — BLOCKED
**Score:** 21+12+14+12+7+5+4+4 = **79**.
**Rationale:** layout ratios are durable workflow state; AppTower can gain repeatability without going beyond two panes.
**Acceptance criteria:** bounded ratio in template; legacy default; restore without unnecessary pane reload; rebalance/reset; restart/export-import; exactly two panes.
**Automated test plan:** schema bounds/defaults; non-default ratio with stable document tokens; reset/save; restart/export-import; pane isolation.
**Dependencies:** TASK 2, TASK 4 preferred, stable split lifecycle.
**Sources/competitors:** Chromium Split View/session restore and persisted side-panel resizing; Split View; SideSplit.

### TASK 11 — Native tab-group import/export bridge — 78/100 — BLOCKED
**Rationale:** native interoperability without turning AppTower into a full tab manager.
**Acceptance criteria:** explicit import/export; preserve title/color/order where API supports; AppTower remains authoritative; no history/bookmarks permission for basic bridge.
**Automated test plan:** import/export native groups; duplicates; collapsed groups; restart; unsupported-browser fallback.
**Dependencies:** stable groups/workspaces; TASK 4 preferred.
**Sources/competitors:** Lunma, TabTOC, SnapTabs, Tab Manager v2.

### TASK 12 — Glance preview in temporary bottom pane — 76/100 — BLOCKED
**Rationale:** temporary reference preview reuses AppTower split model instead of spawning permanent tabs/windows.
**Acceptance criteria:** temporary bottom pane; top unchanged; explicit promote; close restores layout; compatibility fallback applies.
**Automated test plan:** preview/close/promote; repeated previews; blocked-embed fallback; stable top-pane document token.
**Dependencies:** stable split-pane lifecycle.
**Sources/competitors:** SuperchargeBrowser Glance-style preview.

## IDEAS

| Rank | Score | IDEA | Evidence / source | Promotion condition / risk |
|---:|---:|---|---|---|
| 1 | 74 | Per-site sleep policy presets: default/aggressive/never sleep | Drowzy (MIT) | Promote after TASK 3 + measurable resource baseline |
| 2 | 74 | Panel navigation escape policy: keep intended same-app navigation in pane, offer/open unrelated cross-domain destinations in the main browser, with explicit authentication-flow exceptions | QuickPanel | Promote only after navigation telemetry proves accidental pane hijacking is a real AppTower pain; clean-room only because QuickPanel is PolyForm Noncommercial |
| 3 | 73 | Resource-pressure-aware emergency eviction using coarse system-memory pressure, LRU and pane safety guards | TabRest (MIT) | Promote after TASK 3 + TASK 6 baseline; justify `system.memory`; no per-pane heap polling/broad host access |
| 4 | 73 | Favorites/pinned mini-row independent of workspace ordering | ddSideBar (MIT), Lunma, TabTree, ThisPanel | Promote if rail overflow is recurring UX pain |
| 5 | 72 | Anchored Real Page/sidecar placement: remember monitor/window bounds and optionally reuse sidecar | Tab Anchor (MIT), QuickPanel | Promote after Real Page lifecycle is stable; normalize display changes; never reroute normal browsing globally |
| 6 | 72 | Workspace/session import from other managers | VertiTab, Lunma, Tabwise | Promote after TASK 4 export/import schema; avoid mandatory history permission |
| 7 | 70 | Recently accessed smart view | VertiTab, TabDog | Promote after current Recent is stable/searchable |
| 8 | 68 | Optional browser-context actions over selected text/link | AI Side Panel / SuperchargeNavigation-style flows | Needs concrete non-AI use case and optional-permission review |
| 9 | 65 | Portable workspace export/mirror to native browser bookmarks | Mooring | Explicit optional `bookmarks` only; pattern only where license unclear |
| 10 | 65 | Focus mode: temporarily show only one group/workspace | TabTree, Tabwise | Promote if groups/templates overload rail |
| 11 | 62 | Automatic domain grouping suggestions | VertiTab, TabDog, SuperchargeNavigation | Opt-in shortcut organizer only; do not become tab manager |
| 12 | 58 | Optional AI organizer module | Leap/VertiTab-style products | Keep out of core until privacy-preserving provider/module contract and demand |
| 13 | 54 | Full vertical-tab manager | VertiTab, TabTOC, ddSideBar, TabTree, Tabwise | Deliberately low; conflicts with product boundary |

### New IDEA — Panel navigation escape policy — 74/100

**Score:** 19/25 user value + 9/20 real pain + 15/15 AppTower fit + 12/15 measurable UX gain + 8/10 low implementation risk + 5/5 privacy/permissions + 3/5 maturity + 3/5 automated testability = **74**.

**Why IDEA, not TASK:** QuickPanel provides strong UX evidence that app-like panels benefit from keeping intended app navigation inside while sending unrelated cross-domain destinations to the normal browser, but AppTower has not yet demonstrated accidental cross-domain pane hijacking as a recurring regression. At 74 it is intentionally below the promotion threshold.

**Clean-room design direction:** classify navigation from pane origin plus user intent, not from a hardcoded competitor list. Same-origin/same-app destinations stay in-pane by default; unrelated external destinations may be offered/opened in the main browser; authentication/SSO redirects must be allowed to complete. Never introduce a new broad permission solely for this policy.

**Automated test plan if promoted:** same-origin link stays in pane; unrelated cross-origin link opens main browser only when policy says so; Google/Microsoft-style auth redirect fixture completes; `target=_blank`, download and attachment cases; top/bottom pane isolation; user override persists per app/site.

**License:** QuickPanel is licensed under **PolyForm Noncommercial 1.0.0**. Its source is therefore treated as incompatible for general reusable/commercial code transfer. Only independently reimplemented behavior/architecture ideas are admissible.

## Research notes — 2026-09-04

- **QuickPanel v1.0.8** is unusually close to AppTower's original product problem: it restores an Edge-like app rail as a Windows native sidecar using WebView2, anchors one control to each Chromium window, keeps per-app persistent sessions/zoom, shares one WebView2 environment with named per-app profiles, and has Lite Mode with hidden-panel suspension, max-live=3 and per-panel Keep Alive. It is useful product/architecture evidence but not a code source because of PolyForm Noncommercial licensing.
- **SideFlow** validates per-tab versus global side-panel scoping and lightweight favorites, but does not justify a new backlog item yet because AppTower's persistent app-tower model intentionally favors stable window/workspace scope.
- **Tab Workspace / Tablio / ThisPanel** reinforce local-first workspaces, duplicate reuse, command palette/favorites and native side-panel UX; these map to existing TASKS/IDEAS and do not warrant duplicates.

## Product guardrails

- Do not turn AppTower into a general vertical-tab manager while the differentiator remains persistent web applications/panes beside the current page.
- Do not expand beyond two panes merely because tilers support larger grids.
- Treat split arrangement/restoration and durable state as versioned, testable compatibility surfaces.
- Never auto-sleep a pane if that can silently destroy unsaved state or interrupt active media.
- Prefer event-driven lifecycle/snapshot/resource handling over polling.
- System-memory pressure may only tighten eviction policy after measurement; never bypass pane safety guards or justify default per-pane heap polling/broad host access.
- Prefer optional permissions for optional integrations; do not require history/bookmarks merely for onboarding.
- Do not make native bookmarks the authoritative AppTower store.
- Real Page/sidecar geometry must be scoped to AppTower-owned fallback windows only; never globally reroute normal tabs/pop-ups.
- Cross-domain pane navigation policy must preserve authentication/SSO flows and remain user-overridable.
- Specialized adapters/modules are preferable to broad core permissions.
- Every promoted competitor-inspired feature must have acceptance criteria and automated regression/E2E coverage before execution.
