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

**No TASK is ACTIVE.** TASK 2 is complete; the executor must select the next TASK in a later run.

The current regression PR #2 head observed during this scan is `6ec579a64af0ba9d1346a04a0f3df854aaba839c`. Its `validate` workflow run `34061140457` completed with conclusion **`action_required`**, so CI is not green. READY TASKS remain blocked from activation until a successful validation run is observed. PR #1 head `1fc726fac69410d4ae313fed2c7e4d02a3a8f3a0` separately passed `validate` run `34076573657`, but that documentation-branch success does not override the newer regression-branch gate.

## TASKS

| Rank | Score | Status | TASK | Dependencies |
|---:|---:|---|---|---|
| 1 | 97 | DONE | Deterministic Side Panel command routing and Add Current Page source resolution | Completed; regression suite green at completion |
| 2 | 92 | DONE | Serialized state coordinator for panel/rail/workspace mutations | Task 1; completed on green CI |
| 3 | 90 | BLOCKED | Deterministic drag/drop interaction model for reorder, groups and two-pane templates | TASK 2; stable pointer/drag lifecycle; green CI |
| 4 | 89 | READY | Safe pane sleep guards for unsaved input, active media and explicit keep-awake | Embedded-frame bridge; resource lease/sleep path; green CI |
| 5 | 88 | BLOCKED | Versioned persistence schema + append-only migrations | TASK 2; persisted-state inventory |
| 6 | 86 | BLOCKED | Command Palette across shortcuts/templates/workspaces/recent | TASK 2 |
| 7 | 85 | BLOCKED | Event-driven nearest-deadline resource scheduling | Performance baseline; green CI |
| 8 | 84 | BLOCKED | Event-based workspace snapshots + Undo | TASK 2; TASK 4 preferred |
| 9 | 83 | BLOCKED | Installed-extension lifecycle E2E harness using browser-managed install/action/inspection | Green CI; reproducible packaged build; Chrome DevTools-for-agents toolchain availability |
| 10 | 82 | BLOCKED | Compatibility ladder UX: Auto / Embedded / Mobile / Real Page | Stable renderer telemetry; Task 1 |
| 11 | 81 | BLOCKED | Manifest permission budget + CI regression gate | Current manifest/variant inventory; green CI before executor activation |
| 12 | 80 | READY | Duplicate shortcut detection and reuse prompt | Stable add flow; green CI |
| 13 | 79 | BLOCKED | Context-scoped pane bridge/PWA content-script injection instead of all-page/all-frame injection | Current script-role inventory; TASK 1; green CI |
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
**Score:** 23/25 user value + 19/20 real pain/regression + 15/15 AppTower fit + 13/15 measurable UX/reliability gain + 7/10 low implementation risk + 5/5 privacy/permissions + 3/5 competitor maturity + 5/5 automated testability = **90**.
**Rationale:** AppTower already has a P0 live-verification item for prohibited-drop cursors, inability to drop a site into an existing group and unreliable site-on-site creation of Group/Template. This is a core interaction regression, not optional polish. Fresh split-layout evidence from SuperSplit shows a useful clean-room UX pattern: explicit magnetic drop zones with deterministic targets instead of ambiguous free-form drop handling. Tab Canopy (MIT, alpha) adds useful architectural evidence for declaring a pending move intent before browser/UI synchronization, specifically to prevent drag/reorder races while the background remains authoritative. AppTower should adapt these patterns to its deliberately limited model: reorder, group target and exactly two-pane template target; it should not import SuperSplit's arbitrary nested tiling engine or Tab Canopy's database/sync implementation.
**Acceptance criteria:** every draggable shortcut has a deterministic drag state and visible valid target feedback; reorder is distinct from grouping; dropping on an existing group inserts at a deterministic position; site-on-site offers/executes Group versus two-pane Template without ambiguous overlap; template top/bottom target is explicit and preserves intended order; invalid targets show a stable rejected state without mutating storage; cancel/Esc/pointer loss leaves state unchanged; mouse and Pointer Events paths behave consistently; no panel/pane reload is caused unless the resulting user action actually changes the opened template; no new browser permission or host access.
**Automated test plan:** pure hit-testing/drop-intent fixtures around target boundaries; reorder before/after fixtures; site→existing-group; site→site→Group; site→site→Template with top/bottom order; invalid/self/cross-workspace target rejection; pointercancel/Esc/lostpointercapture rollback; rapid drag followed by storage/render update to catch race conditions; an in-flight move-intent fixture where a browser/storage event arrives before commit and must not duplicate/revert the user move; headed Chromium E2E with real drag/pointer sequences and assertions on persisted order/group/template state plus unchanged unrelated pane document token; keep the existing real-Edge P0 verification queue until installed-extension E2E coverage is available.
**Dependencies:** TASK 2 completed; stable pointer/drag lifecycle and workspace mutation model; green CI before executor activation. Coordinate with TASK 13 so template layout metadata does not introduce a second competing drag model.
**Sources/competitors:** AppTower `docs/10_KNOWN_ISSUES.md` P0 Group/template drag regression. SuperSplit (`schappim/supersplit-js`, created 2026-06-26, MIT) provides current behavior evidence for explicit drag-to-re-split/drop-zone feedback. Tab Canopy (`firtoz/tab-canopy`, MIT, alpha) documents a background-single-source-of-truth model with explicit move intents to avoid synchronization races during drag/reorder. AppTower must independently implement its smaller interaction model; competitor source code is not required.

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

### TASK 8 — Installed-extension lifecycle E2E harness — 83/100 — BLOCKED
**Score:** 20/25 user value + 18/20 real pain/regression + 14/15 AppTower fit + 10/15 measurable UX/reliability gain + 7/10 low implementation risk + 5/5 privacy/permissions + 4/5 maturity + 5/5 automated testability = **83**.
**Rationale:** AppTower has repeatedly reproduced failures only after loading the real extension in a browser. Chrome's official DevTools-for-agents extension tooling, documented on 2026-09-04, can install an unpacked extension, list installed extensions, trigger its toolbar action and then inspect the live browser state. That provides a browser-managed E2E layer between unit/headed-page tests and the remaining Edge manual gate.
**Acceptance criteria:** test harness installs the exact packaged AppTower build into a fresh Chrome profile; verifies the expected extension id/version metadata; triggers the extension action through the browser-managed extension lifecycle rather than DOM-mocking it; executes P0 smoke flows for open/collapse/expand/Add Current Page/Search/Organize; detects duplicate panel/rail instances; captures deterministic failure diagnostics; uninstalls or disposes the profile after the run; does not add runtime manifest permissions to AppTower.
**Automated test plan:** clean-profile install and action-trigger smoke; extension reload/reinstall; restart with persisted workspace; one injected rail; native side-panel open; add-current-page source resolution; collapse/expand; failure artifact capture; negative case for wrong/stale package provenance. Keep Edge-specific verification separate until equivalent Edge automation is proven.
**Dependencies:** green CI; reproducible exact-head package/provenance work from regression PR #2; supported Chrome DevTools-for-agents/MCP environment.
**Sources/competitors:** Chrome for Developers, “Debug Chrome extensions with AI agents”, last updated 2026-09-04. Documentation is CC BY 4.0 and Google code samples are Apache-2.0; AppTower should implement its own harness and need not copy sample code.

### TASK 9 — Compatibility ladder — 82/100 — BLOCKED
**Rationale:** explainable fallback is better than exposing renderer internals when sites cannot embed cleanly.
**Acceptance criteria:** Auto/Embedded/Mobile/Real Page; deterministic failure reason; optional diagnostics only on explicit action; site/pane-scoped fallback; unrelated pane remains live.
**Automated test plan:** successful embed/frame denial/navigation failure/Real Page fixtures; per-site persistence; two-window compatibility-rule collision; permission prompt tests.
**Dependencies:** stable renderer telemetry, TASK 1.
**Sources/competitors:** Universal Split View; SplitView; SidePilot (Apache-2.0); QuickPanel WebView2 demonstrates why a Real Page/native sidecar remains necessary for iframe-blocked sites, but QuickPanel source is PolyForm Noncommercial and not reusable.

### TASK 10 — Manifest permission budget + CI regression gate — 81/100 — BLOCKED
**Score:** 18/25 user value + 16/20 real pain/regression + 15/15 AppTower fit + 8/15 measurable UX/reliability gain + 9/10 low implementation risk + 5/5 privacy/permissions + 5/5 maturity + 5/5 automated testability = **81**.
**Rationale:** AppTower has already removed runtime permissions that were not backed by confirmed API use, but the current validator does not enforce a manifest permission allowlist/budget. A small CI contract prevents accidental permission creep, unexpected install/update warnings and review regressions without changing runtime behavior or adding any permission.
**Acceptance criteria:** define reviewed required permissions, optional permissions and host-pattern sets for each generated/browser variant; validation fails on any unreviewed addition or required↔optional promotion; each allowlisted permission has a short repository rationale; generated fallback manifests are checked against their own narrower budget; removals are allowed without special approval; no runtime code or manifest permission is added by this TASK.
**Automated test plan:** manifest fixtures for allowed set, new required permission, new optional permission, new host pattern, required↔optional movement and fallback-only drift; validator must fail deterministic negative fixtures and pass current manifests; package validation runs the same gate so generated artifacts cannot bypass it.
**Dependencies:** current manifest/variant inventory; green CI before executor activation.
**Sources/competitors:** Benjamin410/chrome-tab-manager (ISC) enforces a documented permission set in CI; Chrome Web Store privacy guidance requires the minimum permissions consistent with the extension purpose and notes broader-than-necessary permissions may cause rejection. Pattern is independently implemented; no competitor source needs to be copied.

### TASK 11 — Duplicate shortcut detection — 80/100 — READY
**Rationale:** prevents rail/workspace clutter with low implementation and permission risk.
**Acceptance criteria:** canonical URL matching; reuse/open existing or intentionally duplicate; group/template identity not merged accidentally; no network lookup.
**Automated test plan:** canonical URL/query/hash fixtures; same URL across workspaces/groups; Add Current Page E2E; keyboard confirmation.
**Dependencies:** stable add flow, green CI.
**Sources/competitors:** Tab Wise, Tabwise, TabDog, Tab Manager v2, Tablio.

### TASK 12 — Context-scoped pane bridge/PWA content-script injection — 79/100 — BLOCKED
**Score:** 19/25 user value + 14/20 real pain/regression + 15/15 AppTower fit + 11/15 measurable performance/UX + 7/10 low implementation risk + 5/5 privacy/permissions + 3/5 maturity + 5/5 automated testability = **79**.
**Rationale:** AppTower currently declares `embedded-frame.js` and `pwa-discovery.js` as `all_frames` content scripts across every HTTP(S) page. That makes pane-specific bridge/discovery code run in ordinary browsing contexts where it is usually not needed, increasing injection surface and avoidable work. A fresh Side Link Preview release demonstrates a conservative injection-scope mindset by excluding sensitive authentication, banking, webmail, streaming and cloud-console contexts; Chrome's stable `chrome.scripting` API additionally supports runtime targeting by tab/frame and dynamic content-script registration. AppTower should independently narrow its own script roles rather than copy Side Link Preview's hard-coded site list.
**Acceptance criteria:** inventory rail, pane-bridge and PWA-discovery responsibilities separately; keep only the minimum script surface required for ordinary pages; pane bridge executes only for AppTower-owned pane documents/frames or an equivalently precise lifecycle scope; PWA discovery becomes explicit/on-demand or otherwise bounded to the page being inspected rather than every frame of every page; sensitive auth/payment/admin contexts are not broadened by the change; Add Current Page/PWA detection, split-pane messaging and compatibility fallback remain functional; no new host/runtime permission is added; measure before/after injection count or equivalent per-navigation work on representative ordinary browsing pages.
**Automated test plan:** manifest/static assertion that pane/PWA helper scripts are no longer unconditional `all_frames` injections; ordinary-page fixture proves no pane bridge/PWA discovery initialization; AppTower top/bottom pane fixtures prove bridge initialization and isolation; Add Current Page PWA fixture proves on-demand discovery; auth/login and payment-like fixtures prove no accidental helper injection; restart/reconnect and compatibility-fallback E2E; performance fixture records helper-initialization count before/after.
**Dependencies:** current content-script role inventory; TASK 1; green CI. Coordinate with TASK 9 so compatibility fallback still receives required pane telemetry.
**Sources/competitors:** Side Link Preview (MIT, 2026) as behavior/privacy evidence only; its manifest uses broad matching but explicitly excludes many sensitive contexts. Chrome `chrome.scripting` documentation confirms runtime-targeted injection plus dynamic `registerContentScripts`/`unregisterContentScripts`; official documentation is CC BY 4.0 and samples Apache-2.0. AppTower implementation should be clean-room and need not copy competitor code or exclusion lists.

### TASK 13 — Restorable split layout metadata — 79/100 — BLOCKED
**Score:** 21+12+14+12+7+5+4+4 = **79**.
**Rationale:** layout ratios are durable workflow state; AppTower can gain repeatability without going beyond two panes.
**Acceptance criteria:** bounded ratio in template; legacy default; restore without unnecessary pane reload; rebalance/reset; restart/export-import; exactly two panes.
**Automated test plan:** schema bounds/defaults; non-default ratio with stable document tokens; reset/save; restart/export-import; pane isolation.
**Dependencies:** TASK 2, TASK 4 preferred, stable split lifecycle.
**Sources/competitors:** Chromium Split View/session restore and persisted side-panel resizing; Split View; SideSplit; Split Workspace (Chrome Web Store, updated 2026-08-11) as current behavior evidence for saved/restorable layouts and restart recovery using real browser windows. Split Workspace source/license is unverified, so only the behavior pattern is considered.

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
| 1 | 74 | Anchored Real Page/sidecar placement: remember monitor/window bounds, restore extension-owned sidecar geometry after restart and optionally reuse an existing sidecar | Tab Anchor (MIT), QuickPanel; Split Workspace and splitescreen Chrome Web Store releases as current behavior evidence | Recalculated 18+10+14+11+8+5+4+4 = 74 after fresh evidence that real-window split tools treat monitor placement and saved/restart-restored layouts as first-class UX. Promote after Real Page lifecycle is stable; normalize display changes; never reroute normal browsing globally. Split Workspace/splitescreen source/license is unverified, so behavior only. |
| 2 | 74 | Per-site sleep policy presets: default/aggressive/never sleep | Drowzy (MIT) | Promote after TASK 3 + measurable resource baseline |
| 3 | 74 | Panel navigation escape policy: keep intended same-app navigation in pane, offer/open unrelated cross-domain destinations in the main browser, with explicit authentication-flow exceptions | QuickPanel | Promote only after navigation telemetry proves accidental pane hijacking is a real AppTower pain; clean-room only because QuickPanel is PolyForm Noncommercial |
| 4 | 73 | Resource-pressure-aware emergency eviction using coarse system-memory pressure, LRU and pane safety guards | TabRest (MIT) | Promote after TASK 3 + TASK 6 baseline; justify `system.memory`; no per-pane heap polling/broad host access |
| 5 | 73 | Favorites/pinned mini-row independent of workspace ordering | ddSideBar (MIT), Lunma, TabTree, ThisPanel | Promote if rail overflow is recurring UX pain |
| 6 | 72 | Workspace/session import from other managers | VertiTab, Lunma, Tabwise | Promote after TASK 4 export/import schema; avoid mandatory history permission |
| 7 | 71 | Native browser Split View awareness/bridge: detect `splitViewId`, preserve existing split membership during tab moves/closes, and optionally route Real Page/reference opens into an already-existing sibling split pane | W3C WebExtensions split-tabs proposal; MDN; Chrome Web Store “Split View: Open Links in Other Pane” | Keep as IDEA until Chrome/Edge expose stable create/remove split-view APIs or AppTower has a concrete coexistence regression; no new permission; clean-room behavior only because the store extension source/license is unverified |
| 8 | 70 | Recently accessed smart view | VertiTab, TabDog | Promote after current Recent is stable/searchable |
| 9 | 68 | Optional browser-context actions over selected text/link | AI Side Panel / SuperchargeNavigation-style flows | Needs concrete non-AI use case and optional-permission review |
| 10 | 65 | Portable workspace export/mirror to native browser bookmarks | Mooring | Explicit optional `bookmarks` only; pattern only where license unclear |
| 11 | 65 | Focus mode: temporarily show only one group/workspace | TabTree, Tabwise | Promote if groups/templates overload rail |
| 12 | 62 | Automatic domain grouping suggestions | VertiTab, TabDog, SuperchargeNavigation | Opt-in shortcut organizer only; do not become tab manager |
| 13 | 58 | Optional AI organizer module | Leap/VertiTab-style products | Keep out of core until privacy-preserving provider/module contract and demand |
| 14 | 54 | Full vertical-tab manager | VertiTab, TabTOC, ddSideBar, TabTree, Tabwise | Deliberately low; conflicts with product boundary |