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

The current regression PR #2 head observed during this scan is `3ab8d31abd42335440e57b98bee02c5e23e061cb`. Its `validate` workflow run `34107440635` completed with conclusion **`success`**. READY TASKS are therefore not globally blocked by CI, while TASKS with unresolved functional dependencies remain `BLOCKED`. The previous backlog head `c92c46c14d3e94138a94007d7d1e3300f1e4598b` also completed PR validation successfully in run `34128608335`.

## Fresh research notes

- `SwajanJain/tabwise` is a current MV3 Chrome/Edge workspace implementation whose background code uses an explicit durable `state.v1` storage key plus a monotonic `migrationVersion` and sequential migration function before normal runtime use. This is independent evidence for TASK 4's versioned/append-only persistence direction. The repository README says MIT, but there is no LICENSE file in the repository root observed in this scan, so AppTower treats it as **license-unverified behavior/architecture evidence only** and copies no code.
- The same Tabwise manifest is a useful permission counterexample: it requires `history`, `bookmarks`, `downloads`, `offscreen`, `scripting`, `activeTab`, `tabs`, `sidePanel`, `storage`, `favicon`, `clipboardWrite`, plus `<all_urls>`. AppTower should not inherit that broad footprint merely to obtain workspace switching/search/migrations; TASK 10 and TASK 12 remain the guardrails.
- TabTOC's current Chrome Web Store listing (retrieved 2026-09-07) now advertises three control surfaces (floating overlay, native Side Panel, New Tab), native tab-group sync, search/drag, tab suspend + auto-suspend, trash/recovery, saved URL groups, bookmark export/integration and history search. This strengthens behavior-level evidence for TASK 3, TASK 7, TASK 14 and TASK 17, but current source/license for the shipping build remains unverified and adoption is still small, so no maturity score increase is justified.
- Tab Tiles 9.0 (Chrome Web Store, updated 2026-02-03) uses a native Chrome tab group as the visible workspace surface, supports manual snapshots/export/import, keeps pinned tabs visible across workspaces, and stores workspace data locally. This independently supports explicit native-group interoperability for TASK 14 and the existing pinned/favorites IDEA. No public source repository/license was verified in this scan, so it is behavior-only evidence and no code is reused.
- WorkTab's current store listing exposes periodic workspace auto-save intervals down to 15 seconds alongside session restore, custom templates, suspension and performance features. The listing claims open-source transparency, but no source repository/license for the shipping build was verified in this scan. AppTower records the periodic autosave model as an **energy/write-amplification anti-pattern** for TASK 7: snapshots remain event-driven, with zero periodic writes/wakeups during read-only activity.
- `Sid-1819/tab-wise` is an actively maintained Chrome Side Panel tab/workspace manager under **MIT** (repository push observed 2026-09-06). Version 2.4.0 declares required `tabs`, `tabGroups`, `storage`, `sidePanel`, `contextMenus`, `sessions`, `favicon`, optional `system.memory`, and broad `<all_urls>` host access. It is useful clean-room evidence that `system.memory` can be made optional and that sessions/recent UX can avoid a `history` permission, while its `<all_urls>` footprint is not copied into AppTower.
- `touyou/sidepanel-fallback` is an **MIT** library that cleanly separates browser detection, mode persistence and panel launching, with an automatic side-panel→popup/window fallback and a large test suite claimed by the project. It is older/low-adoption evidence rather than a mature competitor, but it independently supports capability-based surface fallback and explicit per-browser mode persistence; no score increase is justified from it alone.
- `aminought/firefox-second-sidebar` is a mature adjacent web-panel implementation (583 GitHub stars observed in this scan, latest release v2.0.1 dated 2026-05-19) under **MPL-2.0**. Its per-panel loading controls include load-at-startup, restore-last-page and unload-after-close. This independently validates per-panel memory lifecycle as a user-facing web-panel concept rather than a tab-suspender-only concept. AppTower does not copy MPL-covered code; only the clean-room behavior pattern is used.
- This new evidence promotes the former IDEA “Per-site sleep policy presets” from 74 to **TASK 20 — 76/100**. The AppTower version remains narrower: per-AppTower-site `default/aggressive/never` policy modifies existing lease deadlines only, must respect TASK 3 safety guards, must not add polling or broad host permissions, and must be measured against the resource baseline.
- Portals Sidebar 16.26.92 was updated in the Chrome Web Store on 2026-09-06 and independently combines a native side-panel portal hub, floating overlay rail, groups, drag/drop, search, quick-add and floating windows. Its store description explicitly says it modifies `X-Frame-Options` so sites load in the panel. No current public source repository/license or exact manifest permission set was verified in this scan, so it is behavior-only evidence; header-stripping is recorded as an anti-pattern and is not copied.
- Benjamin410/chrome-tab-manager is a 2026 Chrome Side Panel tab manager under the **ISC License**. Its manifest uses `tabs`, `tabGroups`, `sidePanel`, `storage`, and `sessions`, but not `history`; it nevertheless offers recency sorting and recently-closed history. The project does statically inject banner/page-metadata scripts on `<all_urls>`, so that injection pattern is an anti-pattern for AppTower and is not copied.
- Chromium exposes `tabs.Tab.lastAccessed` as the timestamp when a tab last became active in its window. The WebExtensions `sessions` API separately exposes recently closed tabs/windows through `sessions.getRecentlyClosed()` and requires the narrow `sessions` permission rather than full browsing-history access.
- This resolves the main privacy concern behind the former IDEA “Recently accessed smart view”. It is promoted to **TASK 19 — 80/100**. AppTower should prefer its own pane/shortcut recency for AppTower entities and may use the narrowly scoped `sessions` capability only for an explicitly labelled “Recently closed browser tabs” subsection. No `history`, `idle`, `<all_urls>`, or new content-script injection is justified.
- TabRest (`lamngockhuong/tabrest`) is a current MIT-licensed MV3 tab suspender/resource manager. Its coarse `system.memory` + LRU pattern remains clean-room evidence for TASK 18; AppTower keeps `system.memory` optional and does not add polling.
- Drowzy 1.5.0 remains strong MIT evidence for native `tabs.discard()` and narrow blocker checks; its fixed 60-second alarm is not evidence of optimal energy behavior.
- TabZen remains behavior-only evidence because the repository has no LICENSE file despite an MIT statement in README; its `<all_urls>`/all-page script footprint is not copied.
- TabTOC and Nest remain behavior-only evidence for restricted-page fallback because current source/license could not be verified. AppTower uses its existing native Side Panel on browser-owned pages instead of trying to inject there.
- Microsoft Edge documentation updated in July 2026 marks PWA `edge_side_panel` integration deprecated; AppTower compatibility therefore stays capability-driven and independent of that vendor-specific surface.
- Tab Pilot / Tab Radar is MIT and useful UX evidence for fuzzy search/command palette/recent, but its broad permission/injection set remains an anti-pattern for AppTower core.
- All existing TASKS and IDEAS were rescored after this scan. **No numeric score changed in this pass**: the new migration/native-group/snapshot evidence is either low-adoption or license-unverified, so it strengthens rationale without justifying a maturity point; WorkTab's periodic autosave is negative energy evidence rather than a reason to reward the snapshot score.

## TASKS

| Rank | Score | Status | TASK | Dependencies |
|---:|---:|---|---|---|
| 1 | 97 | DONE | Deterministic Side Panel command routing and Add Current Page source resolution | Completed; regression suite green at completion |
| 2 | 92 | DONE | Serialized state coordinator for panel/rail/workspace mutations | TASK 1; completed on green CI |
| 3 | 90 | BLOCKED | Deterministic drag/drop interaction model for reorder, groups and two-pane templates | TASK 2; stable pointer/drag lifecycle |
| 4 | 89 | READY | Safe pane sleep guards for unsaved input, active media and explicit keep-awake | Embedded-frame bridge; resource lease/sleep path |
| 5 | 88 | BLOCKED | Versioned persistence schema + append-only migrations | TASK 2; persisted-state inventory |
| 6 | 86 | BLOCKED | Restricted-page control-surface fallback to native Side Panel | TASK 1; stable rail/panel ownership and browser-page capability detection |
| 7 | 86 | BLOCKED | Command Palette across shortcuts/templates/workspaces/recent | TASK 2 |
| 8 | 85 | BLOCKED | Event-driven nearest-deadline resource scheduling | Performance baseline |
| 9 | 84 | BLOCKED | Event-based workspace snapshots + Undo | TASK 2; TASK 4 preferred |
| 10 | 83 | BLOCKED | Installed-extension lifecycle E2E harness using browser-managed install/action/inspection | Reproducible package; Chrome toolchain availability |
| 11 | 82 | BLOCKED | Compatibility ladder UX: Auto / Embedded / Mobile / Real Page | Stable renderer telemetry; TASK 1 |
| 12 | 81 | BLOCKED | Manifest permission budget + CI regression gate | Current manifest/variant inventory |
| 13 | 80 | READY | Duplicate shortcut detection and reuse prompt | Stable add flow |
| 14 | 80 | BLOCKED | Privacy-scoped Recently accessed / Recently closed smart view | TASK 2; current Recent/search surface stable; TASK 10 preferred before adding `sessions` |
| 15 | 79 | BLOCKED | Context-scoped pane bridge/PWA content-script injection instead of all-page/all-frame injection | Current script-role inventory; TASK 1 |
| 16 | 79 | BLOCKED | Restorable split layout metadata in templates | TASK 2; TASK 4 preferred; stable split lifecycle |
| 17 | 78 | BLOCKED | Native browser tab-group import/export bridge | Stable groups/workspaces; TASK 4 preferred |
| 18 | 76 | BLOCKED | Per-site pane sleep policy presets: default / aggressive / never | TASK 3; measured resource baseline; coordinate with TASK 6 |
| 19 | 76 | BLOCKED | Glance preview in temporary bottom pane | Stable split-pane lifecycle |
| 20 | 75 | BLOCKED | Optional resource-pressure-aware emergency pane eviction | TASK 3 + TASK 6; optional `system.memory`; measured baseline |

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
**Automated test plan/result:** delayed-async ordering/read barriers; coordinator/store/controller unit coverage; static wiring regression; headed Chromium rapid Search/Organize/Add + reconnect.
**Dependencies:** TASK 1.
**Sources/competitors:** Lunma (Apache-2.0) as architectural evidence only; AppTower implementation clean-room.

### TASK 16 — Deterministic drag/drop interaction model — 90/100 — BLOCKED
**Rationale:** fixes the known prohibited-drop/group/template interaction regression and removes race-prone implicit drop semantics.
**Acceptance criteria:** deterministic reorder/group/template targets; deterministic insertion into existing groups; explicit top/bottom template target; invalid/self/cross-workspace drop never mutates state; Esc/pointercancel/lost capture rolls back; mouse/pointer semantics agree; unrelated pane does not reload.
**Automated test plan:** hit-test boundary fixtures; reorder; site→group; site→site→Group; site→site→Template; invalid/self/cross-workspace rejection; cancellation; race with storage/render/browser event; headed Chromium real drag/pointer E2E.
**Dependencies:** TASK 2 completed; stable pointer/drag lifecycle; coordinate with split metadata so there is one interaction model.
**Sources/competitors:** AppTower known P0; SuperSplit (MIT); Tab Canopy (MIT, alpha), behavior/architecture only.

### TASK 3 — Safe pane sleep guards — 89/100 — READY
**Rationale:** automatic sleep must not destroy unsaved edits or interrupt active media while retaining resource savings.
**Acceptance criteria:** dirty form/contenteditable and active media block auto-sleep; `Keep awake` persists without polling; blockers clear after submit/reset/pause/end; pane-scoped cleanup on navigation/removal; no broad permission.
**Automated test plan:** dirty text/checkbox/contenteditable; playing/paused media; keep-awake restart; blocker cleanup; unchanged idle/max-live semantics.
**Dependencies:** embedded-frame bridge and resource lease/sleep path.
**Sources/competitors:** Drowzy 1.5.0 (MIT); QuickPanel behavior only (PolyForm Noncommercial); TabZen behavior only (license incomplete/ambiguous).

### TASK 4 — Versioned persistence schema + append-only migrations — 88/100 — BLOCKED
**Rationale:** durable workspaces/settings/templates/layout/export state needs explicit evolution rather than silent reset/defaulting.
**Acceptance criteria:** explicit version per durable family; one validation/normalization boundary; deterministic append-only migrations; safe corrupt/future handling; migration before runtime mutation; export/import uses same pipeline.
**Automated test plan:** historical fixtures; golden/idempotent migrations; malformed/future cases; legacy-profile restart; export/import round trip; coordinator never sees pre-migration state.
**Dependencies:** TASK 2; persisted-state inventory.
**Sources/competitors:** Lunma (Apache-2.0), pattern only; SwajanJain/tabwise (license-unverified behavior evidence for explicit storage version + monotonic migrations, no code reuse).

### TASK 17 — Restricted-page control-surface fallback — 86/100 — BLOCKED
**Rationale:** injected rail cannot exist on browser-owned/restricted pages; AppTower still needs a coherent control surface there.
**Acceptance criteria:** eligible HTTP(S) pages keep exactly one rail; restricted pages do not receive injection attempts and action/toggle opens or focuses the existing native Side Panel; eligible↔restricted transitions preserve collapse/expand/close state; no `chrome_url_overrides`, broad host permission, or browser-page scripting workaround.
**Automated test plan:** HTTP(S) → New Tab/`chrome://` → HTTP(S); zero restricted-page injection errors; action→Side Panel; duplicate-surface checks; restart on restricted page; unsupported schemes; Edge parity gate when automation is reliable.
**Dependencies:** TASK 1; stable surface ownership; one shared eligibility predicate with TASK 12.
**Sources/competitors:** TabTOC current store behavior and Nest 1.5.3 behavior only; source/license unverified; sidepanel-fallback (MIT) as low-adoption capability-fallback evidence.

### TASK 5 — Command Palette — 86/100 — BLOCKED
**Rationale:** keyboard-first command/search improves reach without permanent UI density.
**Acceptance criteria:** unified search over shortcuts/templates/workspaces/recent; keyboard execution; deterministic ranking; no history permission for core results; `/` remains compatible or migrates cleanly.
**Automated test plan:** keyboard-only E2E; ranking fixtures; empty/no-match; execute each entity type; no panel-document reload on open/close.
**Dependencies:** TASK 2.
**Sources/competitors:** ArchTabs, SuperchargeBrowser, Tab Manager v2, Tablio, Tab Pilot/Tab Radar (MIT); broad competitor permissions are not copied.

### TASK 6 — Event-driven resource budget scheduling — 85/100 — BLOCKED
**Rationale:** fixed periodic alarms wake the MV3 worker when no work exists; nearest-deadline scheduling should reduce idle wakeups.
**Acceptance criteria:** no recurring alarm with zero leases; next check is earliest meaningful deadline; create/touch/remove reschedules deterministically; current idle/max-live behavior preserved; restart restores deadline.
**Automated test plan:** zero/one/many lease scheduler; touch/remove; pane-isolation E2E; instrument worker wakeups before/after.
**Dependencies:** performance baseline.
**Sources/competitors:** AppTower implementation; MV3 event-driven guidance; QuickPanel behavior evidence; fixed 60s Drowzy alarm is comparison only.

### TASK 7 — Event-based workspace snapshots + Undo — 84/100 — BLOCKED
**Rationale:** recovery from destructive workspace/group/template mutations has high value without periodic background work.
**Acceptance criteria:** snapshot only meaningful destructive mutations; bounded retention; one-step Undo without unrelated pane reload; versioned snapshot schema; no polling.
**Automated test plan:** mutation fixtures; undo per destructive operation; retention; restart; zero snapshot writes during read-only activity.
**Dependencies:** TASK 2; TASK 4 preferred.
**Sources/competitors:** VertiTab, ArchTabs, SuperchargeBrowser, SnapTabs (MIT); TabTOC trash/recovery and Tab Tiles manual snapshots as behavior-only evidence; WorkTab periodic autosave is an energy/write-amplification counterexample, source/license unverified.

### TASK 8 — Installed-extension lifecycle E2E harness — 83/100 — BLOCKED
**Rationale:** several AppTower failures only reproduce after loading the real extension; browser-managed install/action/inspection closes that test gap.
**Acceptance criteria:** install exact package in clean profile; verify id/version; trigger real action; smoke open/collapse/expand/Add/Search/Organize; detect duplicate panel/rail; capture deterministic diagnostics; dispose profile.
**Automated test plan:** clean install/action; reload/reinstall; restart persistence; native side panel; Add Current Page; collapse/expand; stale/wrong package negative case.
**Dependencies:** reproducible exact-head package/provenance; supported Chrome toolchain.
**Sources/competitors:** Chrome for Developers extension-debugging documentation/samples; independent AppTower harness.

### TASK 9 — Compatibility ladder — 82/100 — BLOCKED
**Rationale:** explainable fallback is better than exposing renderer internals; deprecated vendor-specific PWA sidebars must not become a dependency.
**Acceptance criteria:** Auto/Embedded/Mobile/Real Page; deterministic failure reason; diagnostics only on explicit action; site/pane-scoped fallback; unrelated pane remains live; no required `edge_side_panel` dependency.
**Automated test plan:** successful embed/frame denial/navigation failure/Real Page fixtures; per-site persistence; two-window rule collision; permission prompts; capability-negative Edge PWA-sidebar fixture.
**Dependencies:** stable renderer telemetry; TASK 1.
**Sources/competitors:** Universal Split View; SplitView; SidePilot (Apache-2.0); QuickPanel behavior only; Portals Sidebar 16.26.92 behavior-only/header-stripping anti-pattern; Microsoft Edge PWA-sidebar deprecation docs; sidepanel-fallback (MIT) as capability/popup-fallback evidence only.

### TASK 10 — Manifest permission budget + CI regression gate — 81/100 — BLOCKED
**Rationale:** a CI allowlist prevents permission creep, unexpected warnings and store-review regressions.
**Acceptance criteria:** reviewed required/optional/host sets per variant; fail on unreviewed addition or optional→required promotion; rationale per permission; generated fallback has narrower budget; removals remain allowed.
**Automated test plan:** allowed/new required/new optional/new host/required↔optional/fallback-drift fixtures; package validation runs same gate.
**Dependencies:** current manifest/variant inventory.
**Sources/competitors:** Benjamin410/chrome-tab-manager (ISC); Drowzy (MIT); Tab Wise 2.4.0 (MIT; optional `system.memory` but broad `<all_urls>` host access); Tab Pilot/Tab Radar (MIT) and SwajanJain/tabwise (license-unverified) as broad-footprint counterexamples; Chrome Web Store minimum-permission guidance.

### TASK 11 — Duplicate shortcut detection — 80/100 — READY
**Rationale:** prevents rail/workspace clutter with low implementation and permission risk.
**Acceptance criteria:** canonical URL matching; reuse/open existing or intentionally duplicate; group/template identity not merged accidentally; no network lookup.
**Automated test plan:** canonical URL/query/hash fixtures; same URL across workspaces/groups; Add Current Page E2E; keyboard confirmation.
**Dependencies:** stable add flow.
**Sources/competitors:** Tab Wise (MIT), Tabwise, TabDog, Tab Manager v2, Tablio.

### TASK 19 — Privacy-scoped Recently accessed / Recently closed smart view — 80/100 — BLOCKED
**Score:** 20/25 user value + 13/20 real pain/regression + 15/15 AppTower fit + 10/15 measurable UX + 8/10 low implementation risk + 5/5 privacy/permissions + 4/5 competitor maturity + 5/5 automated testability = **80**.
**Rationale:** Recent is a requested navigation surface, but the earlier IDEA was held back because competitor implementations often pull full browser history/activity. Chromium now provides enough narrower primitives to implement the useful part without that expansion: AppTower can rank its own sites/templates by AppTower-owned `lastUsedAt`, while open browser tabs expose native `Tab.lastAccessed`; recently closed browser tabs/windows can be an explicitly labelled optional subsection via `sessions.getRecentlyClosed()`. Benjamin410/chrome-tab-manager provides current ISC-licensed evidence for a side-panel recency + recently-closed UX without `history` permission.
**Acceptance criteria:** primary Recent list uses AppTower-owned recency only; opening/activating a shortcut/template updates recency deterministically without polling; stable tie-break is preserved; optional “Recently closed browser tabs” requests/uses only `sessions` and is clearly separated from AppTower Recent; no `history`, `idle`, `<all_urls>`, or content-script expansion; turning the optional browser subsection off removes the need to query sessions; search can filter Recent without changing ranking state; restoring a closed browser session is explicit and never silently imports it into an AppTower workspace.
**Automated test plan:** deterministic `lastUsedAt` ordering/ties; open/activate updates; restart persistence; same entity in group/template; search filtering; optional sessions denied/unavailable/empty; recently closed tab and window restore fixtures; ensure manifest/permission gate rejects accidental `history`/`idle` additions; E2E confirms opening Recent does not reload pane documents or wake unrelated resources.
**Dependencies:** TASK 2 completed; current Recent/search surface stable; TASK 10 preferred before introducing optional `sessions`; coordinate with TASK 5 so Command Palette consumes the same recency model rather than maintaining a second index.
**Sources/competitors:** Chromium `tabs.Tab.lastAccessed`; WebExtensions `sessions.getRecentlyClosed()`; Benjamin410/chrome-tab-manager (ISC, 2026) and Tab Wise 2.4.0 (MIT) for recency/recently-closed side-panel UX. Broad host access in Tab Wise and `<all_urls>` content scripts in chrome-tab-manager are explicitly not copied. Side Tab Manager and Vertical SidePanel Tab Group Manager are additional store-level behavior evidence only.

### TASK 12 — Context-scoped pane bridge/PWA content-script injection — 79/100 — BLOCKED
**Rationale:** pane bridge/PWA discovery currently run too broadly; narrowing execution reduces injection surface and avoidable work.
**Acceptance criteria:** inventory rail/pane/PWA roles; pane bridge only in AppTower-owned pane contexts; PWA discovery on-demand/bounded; no new permission; no required `edge_side_panel`; measure helper initializations before/after.
**Automated test plan:** static manifest assertion; ordinary page has no pane/PWA helper initialization; top/bottom isolation; on-demand PWA fixture; auth/payment fixtures; restart/reconnect/fallback; capability-negative Edge fixture; initialization count.
**Dependencies:** current content-script inventory; TASK 1; coordinate with TASK 9/17.
**Sources/competitors:** Side Link Preview (MIT); Chrome `scripting` docs; Microsoft Edge PWA-sidebar deprecation; Drowzy as narrow-injection evidence; Tab Pilot and Tab Wise as broad-access counterexamples.

### TASK 13 — Restorable split layout metadata — 79/100 — BLOCKED
**Rationale:** layout ratios are durable workflow state; AppTower can gain repeatability without arbitrary tiling.
**Acceptance criteria:** bounded ratio; legacy default; restore without unnecessary pane reload; rebalance/reset; restart/export-import; exactly two panes.
**Automated test plan:** schema bounds/defaults; non-default ratio with stable document tokens; reset/save; restart/export-import; pane isolation.
**Dependencies:** TASK 2; TASK 4 preferred; stable split lifecycle.
**Sources/competitors:** Chromium Split View/session restore; SideSplit; Split Workspace behavior only where source/license unverified.

### TASK 14 — Native tab-group import/export bridge — 78/100 — BLOCKED
**Rationale:** native interoperability without turning AppTower into a full tab manager.
**Acceptance criteria:** explicit import/export; preserve title/color/order where API supports; AppTower remains authoritative; no history/bookmarks permission for basic bridge.
**Automated test plan:** import/export native groups; duplicates; collapsed groups; restart; unsupported-browser fallback.
**Dependencies:** stable groups/workspaces; TASK 4 preferred.
**Sources/competitors:** Lunma, TabTOC, SnapTabs, Tab Manager v2; Tab Tiles 9.0 behavior only (native tab-group workspace surface, source/license unverified).

### TASK 20 — Per-site pane sleep policy presets — 76/100 — BLOCKED
**Score:** 18/25 user value + 12/20 real pain/regression + 14/15 AppTower fit + 11/15 measurable performance/UX + 8/10 low implementation risk + 5/5 privacy/permissions + 4/5 competitor maturity + 4/5 automated testability = **76**.
**Rationale:** users need different lifecycle behavior for different web apps: a disposable reference page can sleep aggressively while chat/music/editing surfaces may need to stay resident. Drowzy proves per-site protection is useful in a modern MV3 suspender; `firefox-second-sidebar` independently proves that per-web-panel load/unload lifecycle is mature enough to expose directly in web-panel UX. The latter is MPL-2.0 and Firefox/userChrome-specific, so AppTower reuses no code and implements the behavior independently.
**Acceptance criteria:** each AppTower site may select `default`, `aggressive`, or `never`; policy is stored against stable AppTower site identity rather than maintaining a browsing-history/domain profile; `default` exactly preserves the global policy; `aggressive` only shortens an existing eligible sleep deadline and never bypasses TASK 3 dirty-form/media/keep-awake guards; `never` suppresses automatic sleep but still allows explicit user close/unload; policy changes reschedule through the existing resource scheduler without adding periodic alarms; restart/export-import preserves policy through the versioned persistence pipeline when available; no new host permission, content script, telemetry, or network request is introduced.
**Automated test plan:** default/aggressive/never deadline fixtures; precedence with dirty form, active media and explicit keep-awake; switch policy while lease is live; zero-resource case proves no new worker wakeup; restart persistence; delete/recreate site identity does not leak stale policy; two-pane isolation; export/import fixture after TASK 4; instrumentation compares wakeup count and eligible-live duration against baseline.
**Dependencies:** TASK 3 safety guards; measured resource baseline; coordinate deadline semantics with TASK 6 and persistence with TASK 4 when implemented.
**Sources/competitors:** Drowzy 1.5.0 (MIT) for per-site protection; `aminought/firefox-second-sidebar` v2.0.1 (MPL-2.0, behavior only) for per-panel preload/restore/unload lifecycle. No MPL-covered code is reused.

### TASK 15 — Glance preview in temporary bottom pane — 76/100 — BLOCKED
**Rationale:** temporary reference preview reuses AppTower split model instead of spawning permanent tabs/windows.
**Acceptance criteria:** temporary bottom pane; top unchanged; explicit promote; close restores layout; compatibility fallback applies.
**Automated test plan:** preview/close/promote; repeated previews; blocked-embed fallback; stable top-pane document token.
**Dependencies:** stable split-pane lifecycle.
**Sources/competitors:** SuperchargeBrowser Glance-style preview.

### TASK 18 — Optional resource-pressure-aware emergency pane eviction — 75/100 — BLOCKED
**Rationale:** under genuine system-memory pressure AppTower may tighten eviction of otherwise sleep-eligible panes without continuous monitoring or bypassing safety.
**Acceptance criteria:** opt-in; `system.memory` requested only when enabled; no new polling; sampling only on TASK 6 check or explicit diagnostics; hysteresis; only TASK 3-safe panes; AppTower-owned LRU; denied/unavailable API degrades cleanly; no broad host permission/network dependency.
**Automated test plan:** low/normal/high pressure + hysteresis; denied API; zero-leases proves no extra wakeup; LRU order; all-protected case; enable/disable/restart; pane-isolation E2E; wakeup count before/after.
**Dependencies:** TASK 3; TASK 6; TASK 10 preferred; measured baseline.
**Sources/competitors:** TabRest (MIT, clean-room evidence); Tab Wise 2.4.0 (MIT; optional `system.memory` demonstrates narrow permission gating, but its broad host access is not copied); TabZen behavior only; Chrome `system.memory` capability boundary.

## IDEAS

| Rank | Score | IDEA | Evidence / source | Promotion condition / risk |
|---:|---:|---|---|---|
| 1 | 74 | Anchored Real Page/sidecar placement: remember monitor/window bounds, restore extension-owned sidecar geometry after restart and optionally reuse an existing sidecar | Tab Anchor (MIT), QuickPanel; Split Workspace/splitescreen store behavior | Promote after Real Page lifecycle is stable; normalize display changes; never reroute normal browsing globally; store-only source/license remains unverified where noted. |
| 2 | 74 | Panel navigation escape policy | QuickPanel | Promote after navigation telemetry proves accidental pane hijacking; clean-room only because QuickPanel is PolyForm Noncommercial. |
| 3 | 73 | Favorites/pinned mini-row independent of workspace ordering | ddSideBar (MIT), Lunma, TabTree, ThisPanel, Tab Tiles 9.0 behavior | Promote if rail overflow is recurring UX pain; Tab Tiles source/license unverified. |
| 4 | 72 | Workspace/session import from other managers | VertiTab, Lunma, Tabwise | Promote after TASK 4 export/import schema; avoid mandatory history permission. |
| 5 | 71 | Native browser Split View awareness/bridge | W3C WebExtensions split-tabs proposal; MDN; Chrome Web Store split-view behavior | Keep as IDEA until stable create/remove split-view APIs or a concrete coexistence regression. |
| 6 | 70 | Optional Document Picture-in-Picture companion mode | Chrome Document PiP; Super Pinned Windows (MIT) | Concrete compact-player/reference use case required; no CSP/XFO stripping or broad host access. |
| 7 | 68 | Optional browser-context actions over selected text/link | AI Side Panel / SuperchargeNavigation patterns | Needs concrete non-AI use case and optional-permission review. |
| 8 | 65 | Portable workspace export/mirror to native browser bookmarks | Mooring | Explicit optional `bookmarks` only; clean-room where license is unclear. |
| 9 | 65 | Focus mode: temporarily show only one group/workspace | TabTree, Tabwise | Promote if groups/templates overload rail. |
| 10 | 62 | Automatic domain grouping suggestions | VertiTab, TabDog, SuperchargeNavigation | Opt-in shortcut organizer only; do not become a tab manager. |
| 11 | 58 | Optional AI organizer module | Leap/VertiTab-style products | Keep out of core until privacy-preserving provider/module contract and demand. |
| 12 | 54 | Full vertical-tab manager | VertiTab, TabTOC, ddSideBar, TabTree, Tabwise | Deliberately low; conflicts with product boundary. |