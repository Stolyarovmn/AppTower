# AppTower ranked backlog

Last competitor scan: 2026-09-04.

## Rules

- One functional TASK may be `ACTIVE` at a time (global WIP = 1).
- New TASK execution is blocked while CI is red or revalidation is pending after a new change.
- `TASKS` require acceptance criteria and an automated test plan.
- `IDEAS` are retained with a score and promotion condition.
- Scores are recalculated whenever a material new item is added.
- Score = user value 25% + real pain/regression 20% + AppTower fit 15% + measurable performance/UX gain 15% + implementation risk 10% (higher = lower risk) + privacy/permissions 5% + competitor maturity 5% + automated testability 5%.

Current execution gate: **TASK 2 ACTIVE**. Global WIP lock is held by the Serialized state coordinator implementation. No other functional TASK may start until TASK 2 is DONE/BLOCKED/REJECTED and CI is green.

## TASKS

| Rank | Score | Status | TASK | Why now | Dependencies |
|---:|---:|---|---|---|---|
| 1 | 97 | DONE | Restore deterministic Side Panel command routing and Add Current Page source resolution | Core regression suite is now deterministic: Add Current Page resolves the real browser tab; live panel intents are consumed without document recreation; rail lifecycle, restart and split isolation are covered. | Completed by Quality Loop; CI green |
| 2 | 92 | ACTIVE | Serialized state coordinator for panel/rail/workspace mutations | AppTower has multiple concurrent state/event sources; serializing state mutation should reduce race-driven reload/reconnect bugs and technical debt. | Task 1 green; design spec |
| 3 | 89 | READY | Safe pane sleep guards for unsaved input, active media and explicit keep-awake | AppTower can unload inactive iframe panes; sleeping a pane with unsaved edits or playing media can destroy user state or interrupt playback. Drowzy validates the general protection pattern for browser tab suspension; AppTower can implement it independently using its existing all-frame embedded content-script bridge. | Stable embedded-frame bridge; resource lease/sleep path |
| 4 | 86 | BLOCKED | Command Palette: unified search across shortcuts, templates, workspaces and recent | Strong fit with AppTower's existing search; competitors repeatedly use command bars for fast navigation without expanding UI surface. | Task 2 green |
| 5 | 85 | BLOCKED | Replace periodic resource-budget polling with event-driven nearest-deadline scheduling | Current MV3 worker creates `atn-resource-budget` every minute even when no resource lease exists; this is deterministic background wakeup waste and can be removed without changing the 5-minute sleep/max-live semantics. | Collect baseline + green performance probe |
| 6 | 84 | BLOCKED | Event-based workspace snapshots + Undo for destructive mutations | High recovery value with low steady-state energy cost if snapshots happen on meaningful mutations rather than polling. | Serialized coordinator preferred |
| 7 | 82 | BLOCKED | Compatibility ladder UX: Auto / Embedded / Mobile / Real Page with failure-driven fallback | Directly addresses iframe/site compatibility confusion while keeping low-level S/C modes out of the normal UX. | Task 1 green; renderer telemetry |
| 8 | 80 | READY | Duplicate shortcut detection and reuse prompt | Low-risk UX improvement validated by multiple tab managers; prevents workspace clutter. | Stable add flow |
| 9 | 78 | BLOCKED | Native browser tab-group import/export bridge | Useful workspace interoperability without trying to fully replace Chrome/Edge tab management. | Stable groups/workspaces |
| 10 | 76 | BLOCKED | Glance preview in temporary bottom pane | Leverages AppTower's split-pane model for link preview without spawning a new tab/window. | Stable split-pane lifecycle |

> Ordering is by score; status/dependency gates can keep a higher-scored TASK blocked while a lower-scored TASK is READY. Only the Task Executor may switch a TASK to `ACTIVE`.

### TASK 1 — Deterministic panel command routing and Add Current Page

**Status:** `DONE` on 2026-09-04 after `validate` run 33816441146 passed the complete Chromium E2E suite.

**Rationale:** this was an observed regression/test-hardening task, not a competitor-inspired feature. Investigation separated real product invariants from two invalid E2E assumptions: a closed Shadow DOM cannot be counted through `element.shadowRoot`, and a normal extension tab cannot be treated as a browser-owned active native Side Panel. The corrected tests now exercise the real invariants without adding a product workaround for synthetic browser state.

**Acceptance criteria**

- `+` from the rail and Home always pre-fills the current HTTP(S) browser tab URL/title when no pane source is selected. — covered by `ATN-E2E-000/001`.
- Search, Add and Organize commands delivered to an already-live panel do not recreate/reload the panel document. — covered by `ATN-E2E-009` document-token invariant and live pending-action delivery.
- Empty workspace remains usable after Chromium restart. — covered by `ATN-E2E-010`.
- No duplicate injected rail is created after reload/reconnect. — covered by `ATN-E2E-006` using the unique light-DOM host `#app-tower-next-host`; the rail Shadow DOM is intentionally closed.
- Existing split-pane isolation remains intact. — covered by `ATN-E2E-003`.

**Automated test result**

- Headed Chromium/Xvfb Playwright suite: **11/11 passed**.
- Static source validation: passed.
- Package rebuild and test-package artifact upload: passed.

### TASK 2 — Serialized state coordinator

**Status:** `ACTIVE` since 2026-09-04. Global WIP lock held by Task Executor.

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

### TASK 3 — Safe pane sleep guards

**Rationale:** Drowzy is an active MIT-licensed MV3 tab suspender that protects suspension when a page contains unsaved form state and offers an explicit keep-awake path. AppTower does not use `chrome.tabs.discard()` for embedded panes, so that implementation is not reusable directly. The transferable product pattern is to query pane-local blockers immediately before iframe sleep. AppTower already injects `embedded-frame.js` into all HTTP(S) frames and has a parent-frame message bridge for interaction/meta events, so a clean-room blocker protocol can be implemented without new host permissions.

**Acceptance criteria**

- Automatic resource sleep must not unload a pane whose directly hosted document reports dirty user-editable state (changed form controls or edited `contenteditable`).
- Automatic resource sleep must not unload a pane while audible/playing media is detected in that pane.
- A user can mark an app/pane as `Keep awake`; this is persisted as AppTower state and does not require a periodic polling loop.
- After a dirty form is submitted/reset or media stops, the blocker clears and normal idle sleep eligibility resumes.
- Blocker state is scoped to the owning pane/site instance and is cleaned up on navigation, iframe replacement, pane removal and extension dispose.
- Failure to query blocker state must fail safe for a currently interactive pane, but must not create an immortal leaked lease.
- No new broad permission is introduced; use the existing embedded-frame content-script capability.

**Automated test plan**

- Fixture E2E: edit text/checkbox/contenteditable, advance/trigger resource-budget enforcement, assert iframe instance is preserved.
- Fixture E2E: submit/reset dirty fields, trigger enforcement, assert pane becomes sleep-eligible.
- Fixture E2E: playing `<audio>`/`<video>` blocks sleep; paused/ended media releases the block.
- Persistence test: explicit `Keep awake` survives browser restart and can be disabled.
- Cleanup test: navigation/removal clears stale blocker state; no unrelated pane is kept alive.
- Regression assertion: the normal 5-minute idle and max-live=6 policy remains unchanged for unprotected panes.

### TASK 5 — Event-driven resource budget scheduling

**Rationale:** `app/background.js` creates `atn-resource-budget` with `periodInMinutes:1` on both install and browser startup. Its handler invokes `enforceResourceBudget()`, which immediately returns if `resourceLeases` is empty. This guarantees periodic AppTower-owned service-worker wakeups even when the resource-budget subsystem has no work.

**Acceptance criteria**

- No periodic resource-budget alarm exists while there are zero live resource leases.
- With leases present, schedule the next check for the earliest meaningful deadline rather than fixed one-minute polling.
- Creating/touching/removing a lease deterministically reschedules or clears the next alarm.
- Existing `RESOURCE_IDLE_MS = 5 minutes` and `RESOURCE_MAX_LIVE = 6` semantics remain unchanged.
- Browser restart restores the correct next resource-budget check from persisted leases.
- Existing pane-isolation/resource-sleep E2E behavior remains green.

**Automated test plan**

- Test alarm scheduling with zero, one and multiple leases.
- Assert no recurring alarm when no leases exist.
- Assert nearest-deadline rescheduling after touch/remove.
- E2E verify pane sleep still does not reload an unrelated pane.
- Compare service-worker wakeup count before/after once instrumentation is available.

## IDEAS

| Rank | Score | IDEA | Evidence / source | Risks / promotion condition |
|---:|---:|---|---|---|
| 1 | 74 | Per-site sleep policy presets (default / aggressive / never sleep) | Drowzy exposes configurable suspension and keep-awake/whitelist behavior; AppTower has a different iframe sleep model but the preference concept transfers cleanly. | Partly covered by TASK 3's explicit keep-awake. Promote broader presets only after resource budgets are measurable and users need per-site tuning. |
| 2 | 74 | Template layout metadata: saved split ratio/orientation with rebalance/reset | Current Split View and SideSplit both treat reusable split layouts and width ratios as first-class workflow data. AppTower already has two-pane templates, so the transferable idea is to persist layout metadata with a template rather than add more panes or copy window-management code. | Closed-source/store evidence only; clean-room implementation required. Promote after split lifecycle is stable and user value of restoring 30/70, 50/50 or horizontal/vertical layouts is demonstrated. |
| 3 | 73 | Favorites/pinned mini-row independent of workspace ordering | `ddx-510/dd-sidebar` (MIT) uses a compact bottom/quick-access layer. | Promote if shortcut overflow becomes a frequent UX problem and it can reuse existing storage schema. |
| 4 | 72 | Workspace/session import from other managers | VertiTab advertises Session Buddy/Toby import; Leap and Workona-like products emphasize reusable contexts. | Promote when AppTower export schema is versioned and stable. |
| 5 | 70 | Recently accessed smart view | VertiTab exposes Active/Recently Accessed panels; TabDog includes recently closed. | Promote after current Recent is proven stable and searchable. |
| 6 | 68 | Optional browser-context actions over selected text/link | AI Side Panel/SuperchargeNavigation-style context actions make side tools accessible without opening UI first. | Requires strict permission review and a concrete non-AI use case. |
| 7 | 65 | Focus mode: temporarily show only one group/workspace | Common in workspace/tab managers. | Promote if users report rail overload after groups/templates mature. |
| 8 | 62 | Automatic domain grouping suggestions | VertiTab, TabDog and SuperchargeNavigation expose domain grouping. | AppTower should not become a tab manager; promote only as an opt-in shortcut organizer. |
| 9 | 58 | Optional AI organizer module | Leap/VertiTab expose AI organization. | Keep out of core until there is a privacy-preserving provider/module contract and clear demand. |
| 10 | 54 | Full vertical-tab manager | Many competitors focus here (VertiTab, TabTOC, Leap, ddSideBar). | Deliberately low: conflicts with AppTower's product boundary; reconsider only if product scope changes. |

## Competitor evidence used in this ranking

- Lunma — Apache-2.0, local/open-source vertical tabs + Spaces, Playwright E2E; local-only data model and no analytics/network calls claimed by project site: https://github.com/lunma-app/lunma and https://lunma.app/
- Drowzy — MIT, active MV3 tab suspender using native `chrome.tabs.discard()`, unsaved-form protection, keep-awake and minimal/optional host access for form protection: https://github.com/ml3dev/drowzy
- ddSideBar — MIT, injected iframe or Chrome SidePanel, Spaces/bookmarks: https://github.com/ddx-510/dd-sidebar
- SuperchargeBrowser — open-source navigation/performance extensions; workspaces, command palette, Glance, dedup, snapshots: https://github.com/SuperchargeBrowser/supercharge-browser
- Tab Wise — open-source side-panel tab manager with duplicate detection, sessions, activity/memory UI: https://github.com/Sid-1819/tab-wise
- TabDog — open-source search, domain grouping, workspaces, recent/history: https://github.com/sung01299/tabdog
- AI Sidebar (`randgua/ai-sidebar`) — MIT, Side Panel + custom sites + selection bridge + DNR-based cross-domain embedding. Its DOM-selector fragility reinforces keeping site-specific automation in optional modules, not AppTower core: https://github.com/randgua/ai-sidebar
- Universal Split View — current Chrome Web Store listing (v1.0.0, updated 2026-04-26) demonstrates a minimal persistent arbitrary-URL Side Panel and explicitly treats blocked embedding as a compatibility/permission problem: https://chromewebstore.google.com/detail/universal-split-view/gobpljfpndmgomngdgchmmmaaigbjljp
- SplitView — current Chrome Web Store listing uses real browser windows instead of iframes to avoid embed restrictions, supporting AppTower's existing Real Page/sidecar fallback direction: https://chromewebstore.google.com/detail/splitview-%E2%80%94-split-screen/mjgdhcclienjmjmhbodeikfmgmhabhnk
- Split View — current Chrome Web Store listing (updated 2026) supports 2/3/4-pane real-window layouts, saved layouts, multiple ratios, undo and link-to-pane actions. It is closed-source, so only the product pattern is relevant: https://chromewebstore.google.com/detail/split-view/cefhclcgocfoinfghjfihclcahbplagh
- SideSplit — Chrome Web Store listing (v1.0, updated 2025-12-29) manages named URL workspaces and explicit width ratios from a persistent Side Panel. It is not treated as a code source: https://chromewebstore.google.com/detail/sidesplit-split-screen-la/gagifnhcbbnglagibgmgaocifdapmfac
- VertiTab — current Chrome Web Store listing advertises workspaces, snapshots, suspend, universal search, split view and rich context actions: https://chromewebstore.google.com/detail/vertitab-%E2%80%93-vertical-tab-m/chejfhdknideagdnddjpgamkchefjhoi
- TabTOC — current Chrome Web Store listing advertises native side panel/overlay/new-tab modes, tab-group sync and auto suspend: https://chromewebstore.google.com/detail/tabtoc-vertical-tab-sideb/gpoeknemdldoghgbljpgndafaieffalj
- ArchTabs — current Chrome Web Store listing advertises Spaces, command bar, snapshots and optional permissions for history/bookmarks: https://chromewebstore.google.com/detail/archtabs-%E2%80%94-ultra-compact/iibohhagdapncaofncjmphehlaajoecd

## Product guardrails from this scan

- Do not turn AppTower into a general vertical-tab manager while the differentiator remains persistent web applications/panes beside the current page.
- Do not expand AppTower beyond two panes merely because window tilers support larger grids; template layout metadata should improve repeatability without scope creep.
- Never auto-sleep a pane in a way that can silently destroy unsaved user state or interrupt active media; resource saving must be correctness-safe first.
- Prefer event-driven snapshots and lifecycle handling over periodic polling.
- Prefer optional permissions for optional integrations.
- Specialized adapters/modules are preferable to broad core permissions or forcing every site through the same iframe renderer.
- Every promoted competitor-inspired feature must first prove fit through acceptance criteria and automated tests.
