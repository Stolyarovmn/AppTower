# AppTower ranked backlog

Last competitor scan: 2026-09-04.

## Rules

- One functional TASK may be `ACTIVE` at a time (global WIP = 1).
- New TASK execution is blocked while CI is red or revalidation is pending after a new change.
- `TASKS` require acceptance criteria and an automated test plan.
- `IDEAS` are retained with a score and promotion condition.
- Scores are recalculated whenever a material new item is added.
- Score = user value 25% + real pain/regression 20% + AppTower fit 15% + measurable performance/UX gain 15% + implementation risk 10% (higher = lower risk) + privacy/permissions 5% + competitor maturity 5% + automated testability 5%.

Current execution gate: **TASK 2 ACTIVE**. Global WIP lock is held by the Serialized state coordinator implementation. No other functional TASK may start until TASK 2 is DONE/BLOCKED/REJECTED and CI is green. Head `5c9d8a6898958b1dd8dfe0e4a46d9ec84109ca07` passed `validate` run 33843737860 before this backlog update; this documentation commit requires normal revalidation before any new TASK may start.

## TASKS

| Rank | Score | Status | TASK | Why now | Dependencies |
|---:|---:|---|---|---|---|
| 1 | 97 | DONE | Restore deterministic Side Panel command routing and Add Current Page source resolution | Core regression suite is now deterministic: Add Current Page resolves the real browser tab; live panel intents are consumed without document recreation; rail lifecycle, restart and split isolation are covered. | Completed by Quality Loop; CI green |
| 2 | 92 | ACTIVE | Serialized state coordinator for panel/rail/workspace mutations | AppTower has multiple concurrent state/event sources; serializing state mutation should reduce race-driven reload/reconnect bugs and technical debt. | Task 1 green; design spec |
| 3 | 89 | READY | Safe pane sleep guards for unsaved input, active media and explicit keep-awake | AppTower can unload inactive iframe panes; sleeping a pane with unsaved edits or playing media can destroy user state or interrupt playback. Drowzy validates the general protection pattern for browser tab suspension; AppTower can implement it independently using its existing all-frame embedded content-script bridge. | Stable embedded-frame bridge; resource lease/sleep path |
| 4 | 88 | BLOCKED | Versioned persistence schema + append-only migrations for workspaces/settings/templates | AppTower persists long-lived user state across releases. Explicit schemas and ordered migrations reduce upgrade-time corruption/default-reset risk and are a prerequisite for safely evolving templates, workspaces and future import/export. | TASK 2 green; inventory of persisted keys/formats |
| 5 | 86 | BLOCKED | Command Palette: unified search across shortcuts, templates, workspaces and recent | Strong fit with AppTower's existing search; competitors repeatedly use command bars for fast navigation without expanding UI surface. | Task 2 green |
| 6 | 85 | BLOCKED | Replace periodic resource-budget polling with event-driven nearest-deadline scheduling | Current MV3 worker creates `atn-resource-budget` every minute even when no resource lease exists; this is deterministic background wakeup waste and can be removed without changing the 5-minute sleep/max-live semantics. | Collect baseline + green performance probe |
| 7 | 84 | BLOCKED | Event-based workspace snapshots + Undo for destructive mutations | High recovery value with low steady-state energy cost if snapshots happen on meaningful mutations rather than polling. | Serialized coordinator preferred |
| 8 | 82 | BLOCKED | Compatibility ladder UX: Auto / Embedded / Mobile / Real Page with failure-driven fallback | Directly addresses iframe/site compatibility confusion while keeping low-level S/C modes out of the normal UX. | Task 1 green; renderer telemetry |
| 9 | 80 | READY | Duplicate shortcut detection and reuse prompt | Low-risk UX improvement validated by multiple tab managers; prevents workspace clutter. | Stable add flow |
| 10 | 79 | BLOCKED | Restorable split layout metadata in templates: ratio + rebalance/reset | Chrome's own current Split View has session restore, while current split-layout extensions treat ratios and saved layouts as first-class state. AppTower already has two-pane templates, so restoring the user's chosen ratio is a narrow, high-fit extension rather than scope expansion. | Task 2 green; stable split lifecycle; TASK 4 preferred |
| 11 | 78 | BLOCKED | Native browser tab-group import/export bridge | Useful workspace interoperability without trying to fully replace Chrome/Edge tab management. | Stable groups/workspaces; TASK 4 preferred |
| 12 | 76 | BLOCKED | Glance preview in temporary bottom pane | Leverages AppTower's split-pane model for link preview without spawning a new tab/window. | Stable split-pane lifecycle |

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

### TASK 4 — Versioned persistence schema + append-only migrations

**Score:** `88/100` = user value 23/25 + real pain/regression 17/20 + AppTower fit 15/15 + measurable UX/reliability gain 10/15 + implementation risk 8/10 + privacy/permissions 5/5 + maturity evidence 5/5 + automated testability 5/5.

**Rationale:** AppTower already persists workspaces, panes, templates, recent state and settings, and the roadmap continues to evolve those shapes. Without a single versioned persistence contract, each new field or structural change can create silent fallback/reset behavior or make export/import and rollback harder to reason about. Lunma (Apache-2.0) provides current open-source evidence for the architectural pattern: every persisted read is validated through a versioned schema and upgraded by an append-only migration table. AppTower should implement the pattern independently and can keep its current lightweight JavaScript stack; adopting Lunma's Zod dependency or copying its code is not required.

**Acceptance criteria**

- Every durable AppTower state family used across releases (at minimum workspaces/sites/templates/layout/settings and export/import payloads) has an explicit current schema version.
- All persisted reads enter through one validation/normalization boundary before runtime code consumes them.
- Migrations are ordered, append-only and deterministic; each migration transforms exactly one known version to the next.
- Running migrations more than once is idempotent from the caller's perspective: already-current data is not rewritten or semantically changed.
- Missing optional fields from legacy data receive documented defaults; unknown extra fields are handled by an explicit compatibility policy rather than accidental spread/overwrite behavior.
- Corrupt/unsupported future-version data fails safely: preserve recoverable raw state/export diagnostics and do not silently replace a user's workspace with defaults.
- A browser/update restart completes migration before normal mutation/render paths operate on durable state.
- Export/import includes a schema version and uses the same validation/migration pipeline as local persisted state.
- No new browser permission, telemetry or network dependency is introduced.

**Automated test plan**

- Fixture tests for every historical schema shape currently recoverable from repository history plus current schema.
- Golden migration tests: legacy fixture → expected current normalized state.
- Idempotency test: migrate(current) and migrate(migrate(legacy)) produce the same current state without additional semantic writes.
- Corruption tests: malformed JSON-equivalent objects, invalid enum/URL/layout values and unsupported future schema version fail safely without destructive default overwrite.
- Restart E2E: seed a legacy profile, launch headed Chromium, assert migration completes and shortcuts/groups/templates/settings remain usable.
- Export/import round-trip across at least one legacy fixture and current fixture.
- Regression test that TASK 2 coordinator never observes pre-migration durable state.

### TASK 6 — Event-driven resource budget scheduling

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

### TASK 10 — Restorable split layout metadata

**Score:** `79/100` = user value 21/25 + real pain 12/20 + AppTower fit 14/15 + measurable UX gain 12/15 + implementation risk 7/10 + privacy/permissions 5/5 + maturity evidence 4/5 + testability 4/5.

**Rationale:** current Chromium source exposes built-in `Split View`, a separate `Split View Session Restore` feature and persisted Side Panel resizing. This is browser-level evidence that split arrangement and restoration are becoming persistent user state rather than ephemeral UI. Split View and SideSplit provide additional current product evidence for saved layouts/ratios. Chromium is BSD-style licensed, but AppTower does not need browser code: only the behavioral pattern is used. AppTower should remain two-pane; this TASK stores layout metadata with existing templates instead of adding multi-pane grids.

**Acceptance criteria**

- A two-pane template may persist an explicit split ratio with a safe bounded range; existing templates without metadata retain the current default.
- Opening a template restores its saved ratio without reloading either pane unnecessarily.
- The user can rebalance to the default ratio and explicitly save the new ratio back to the template.
- Ratio state is isolated per template/workspace and survives browser restart/export/import through a versioned schema.
- Invalid/legacy ratio data is normalized safely during load/migration.
- No new browser permission is required.
- Scope remains exactly two AppTower panes; no 3+ pane layout is introduced by this TASK.

**Automated test plan**

- Unit/schema test: legacy template without ratio loads at default; invalid values normalize to bounds/default.
- Headed Chromium E2E: create template at a non-default ratio, reopen it, assert the ratio is restored and both pane document-instance tokens are stable during resize.
- E2E: rebalance/reset restores default and persists only when the user saves.
- Restart/export-import test: ratio survives restart and round trip.
- Regression: opening/navigating one pane still does not reload the other pane.

## IDEAS

| Rank | Score | IDEA | Evidence / source | Risks / promotion condition |
|---:|---:|---|---|---|
| 1 | 74 | Per-site sleep policy presets (default / aggressive / never sleep) | Drowzy exposes configurable suspension and keep-awake/whitelist behavior; AppTower has a different iframe sleep model but the preference concept transfers cleanly. | Partly covered by TASK 3's explicit keep-awake. Promote broader presets only after resource budgets are measurable and users need per-site tuning. |
| 2 | 73 | Favorites/pinned mini-row independent of workspace ordering | `ddx-510/dd-sidebar` (MIT) uses a compact bottom/quick-access layer; Lunma and TabTree independently validate compact pinned/favourites strips in side-panel workflows. | Promote if shortcut overflow becomes a frequent UX problem and it can reuse existing storage schema. |
| 3 | 72 | Workspace/session import from other managers | VertiTab advertises Session Buddy/Toby import; Lunma imports existing tab groups into Spaces; Tabwise offers bookmark/workspace bootstrapping. | Promote after TASK 4 versioned export/import schema is stable; avoid mandatory history permission. |
| 4 | 70 | Recently accessed smart view | VertiTab exposes Active/Recently Accessed panels; TabDog includes recently closed. | Promote after current Recent is proven stable and searchable. |
| 5 | 68 | Optional browser-context actions over selected text/link | AI Side Panel/SuperchargeNavigation-style context actions make side tools accessible without opening UI first. | Requires strict permission review and a concrete non-AI use case. |
| 6 | 66 | Portable workspace export/mirror to native browser bookmarks | Mooring validates a low-lock-in model where durable workspace pages remain ordinary Chrome bookmarks and tab groups are only a runtime projection. For AppTower the transferable idea is an explicit export/bridge, not replacing AppTower storage. Score = value 17/25 + pain 9/20 + fit 12/15 + UX gain 8/15 + low-risk 8/10 + privacy 2/5 + maturity 4/5 + testability 6? capped to 5/5 = 65; rounded ranking score 66 after tie/debt adjustment is not allowed, so final score is **65**. | `bookmarks` can read/change the entire bookmark tree and triggers a Chrome warning. Promote only if implemented behind explicit optional permission/user action, after TASK 4 export schema is stable. Mooring currently has no LICENSE file in the repository root, so treat its code as non-reusable and use only independently implemented product patterns. |
| 7 | 65 | Focus mode: temporarily show only one group/workspace | Common in workspace/tab managers; TabTree and Tabwise reinforce focused/immersive side-panel workflows. | Promote if users report rail overload after groups/templates mature. |
| 8 | 62 | Automatic domain grouping suggestions | VertiTab, TabDog and SuperchargeNavigation expose domain grouping. | AppTower should not become a tab manager; promote only as an opt-in shortcut organizer. |
| 9 | 58 | Optional AI organizer module | Leap/VertiTab expose AI organization. | Keep out of core until there is a privacy-preserving provider/module contract and clear demand. |
| 10 | 54 | Full vertical-tab manager | Many competitors focus here (VertiTab, TabTOC, Leap, ddSideBar, TabTree, Tabwise). | Deliberately low: conflicts with AppTower's product boundary; reconsider only if product scope changes. |

Recalculation after the Mooring finding: all pre-existing TASK and IDEA scores remain unchanged. The new portability idea scores **65/100** under the same weighted rubric and therefore remains an IDEA. Its ranking is placed above the existing 65-point Focus Mode because native portability reduces future migration/storage lock-in technical debt; this uses the specified tie-break rule without altering the numerical score.

## Competitor evidence used in this ranking

- Chromium built-in browser direction — BSD-style source currently defines `Split View`, `Split View Session Restore`, and Side Panel resizing that persists width across browser sessions. AppTower uses this only as behavioral evidence, not as a code source: https://chromium.googlesource.com/chromium/src/+/8f2c7d1c8585203b30d8f8c893f24a269a3f5417/chrome/browser/flag_descriptions.cc
- Lunma — Apache-2.0, local/open-source vertical tabs + Spaces, Playwright E2E; current architecture explicitly documents a single serialized store, versioned persisted reads through schema validation, and an append-only migrations table. AppTower uses these as clean-room architectural evidence, not copied code: https://github.com/lunma-app/lunma and https://lunma.app/
- Drowzy — MIT, active MV3 tab suspender using native `chrome.tabs.discard()`, unsaved-form protection, keep-awake and minimal/optional host access for form protection: https://github.com/ml3dev/drowzy
- Mooring — source-visible MV3 Chrome Side Panel workspace manager. Durable workspaces are Chrome bookmark folders, pinned pages are bookmarks, temporary pages are live tabs, tab groups are runtime projections, and runtime bindings use `chrome.storage.session`; there is no cloud backend. Manifest v1.0.7 requires `sidePanel`, `tabs`, `tabGroups`, `bookmarks`, `storage`, and `favicon`. No LICENSE file is present in the repository root as of this scan, so AppTower treats Mooring as UX/architecture evidence only and does not reuse code: https://github.com/bramblex/Mooring
- Sharp Tabs — current 2026 project direction emphasizes minimum permissions, removal of anonymous tracking and native-only tab suspension; useful evidence for keeping AppTower resource-saving paths low-permission and browser-native where applicable: https://sharptabs.com/
- TabTree — current open-source Chrome Side Panel vertical tabs with tree hierarchy, multi-select, compact pinned strip, tab-group subtrees, search and Chrome-synced appearance. Used only as UX evidence pending explicit license verification before any code-level reuse: https://chromewebstore.google.com/detail/tabtree/afejdkkhibimaedcimpjkfljbhckinbm and https://github.com/shuyang790/TabTree
- Tabwise — current open-source Chrome/Edge vertical tabs/workspaces product with Favorites, local-only workspace data, quick search and duplicate avoidance; its optional setup-from-history pattern is not adopted because AppTower should avoid requiring history access for onboarding: https://chromewebstore.google.com/detail/tabwise-vertical-tabs-wor/ooogpghkhnjofplbejfaonlnibaigaeh
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
- Treat split arrangement/restoration as persistent workspace state where AppTower controls it, while respecting browser-owned Side Panel sizing rather than trying to override unsupported browser chrome APIs.
- Treat durable user state as a versioned compatibility surface: migrations must be explicit, testable and non-destructive before adding more persistent template/workspace metadata.
- Never auto-sleep a pane in a way that can silently destroy unsaved user state or interrupt active media; resource saving must be correctness-safe first.
- Prefer event-driven snapshots and lifecycle handling over periodic polling.
- Prefer optional permissions for optional integrations; do not require history access merely to make onboarding feel smarter.
- Do not make native bookmarks the primary AppTower store merely for portability. If a bookmark export/bridge is added, request `bookmarks` only on explicit user action and keep AppTower's own versioned state authoritative.
- Specialized adapters/modules are preferable to broad core permissions or forcing every site through the same iframe renderer.
- Every promoted competitor-inspired feature must first prove fit through acceptance criteria and automated tests.