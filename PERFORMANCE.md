# AppTower Performance / Energy Baseline

Last updated: 2026-09-04.

## Purpose

This document tracks runtime performance and energy budgets for AppTower. Runtime changes are accepted only when they preserve functional E2E behavior and have a measurable benefit or remove a clearly demonstrated source of waste.

## Measurement policy

- Functional CI must be green before starting an unrelated optimization.
- One functional TASK may be `ACTIVE` at a time across the project.
- Timing values from hosted CI are treated as noisy. Baselines use multiple samples and record median + p95.
- Initial timing limits in the benchmark are **hang/safety guards**, not optimization budgets. A real budget is set only after several comparable CI samples exist.
- Performance changes must not weaken privacy, compatibility, or existing regression coverage.

## Automated runtime probe

`tests/e2e/performance-baseline.spec.mjs` runs a real unpacked AppTower build in headed Chromium/Xvfb and records a JSON attachment with:

- Side Panel startup-to-interactive latency: 5 samples, median and p95;
- Search-dialog command latency: 7 samples, median and p95;
- Add-current dialog latency;
- one-second idle renderer `TaskDuration` and `ScriptDuration` from Chromium DevTools Protocol;
- Side Panel JS heap used/total from Chromium DevTools Protocol;
- total and visible iframe count;
- Long Task count and longest observed Long Task.

The benchmark deliberately does not enforce tight absolute timing thresholds yet. The first several green CI runs establish a reproducible baseline before budgets are promoted to regression gates.

## Baseline table

| Metric | Current baseline | Budget | Collection status |
|---|---:|---:|---|
| Side Panel startup median | pending CI samples | pending | automated |
| Side Panel startup p95 | pending CI samples | safety guard < 5000 ms | automated |
| Search dialog median | pending CI samples | pending | automated |
| Search dialog p95 | pending CI samples | safety guard < 2000 ms | automated |
| Add dialog latency | pending CI samples | safety guard < 3000 ms | automated |
| Idle renderer TaskDuration / 1 s | pending CI samples | pending | automated |
| Idle renderer ScriptDuration / 1 s | pending CI samples | pending | automated |
| Side Panel JS heap used | pending CI samples | pending | automated |
| Live iframe count | pending CI samples | scenario-specific invariant | automated |
| Long tasks >50 ms | pending CI samples | pending | automated |
| Runtime/storage messages per minute | not instrumented | pending | planned |
| Storage writes per minute | not instrumented | pending | planned |
| Service-worker wakeups | static source evidence available; runtime counter pending | pending | planned |
| Pane sleep/wake memory delta | not instrumented | pending | planned |
| Extension-originated network requests | not instrumented | pending | planned |

## First confirmed bottleneck candidate

The MV3 service worker currently creates the `atn-resource-budget` alarm with `periodInMinutes: 1` on both install and browser startup. The alarm handler calls `enforceResourceBudget()`, which returns immediately when there are no resource leases. This is a deterministic periodic wake source in AppTower's own code even when the resource-budget subsystem has no work to perform.

This is not changed in the initial baseline commit. It should first receive a dedicated regression/performance test, then be replaced by an event-driven/nearest-deadline schedule if the change preserves the 5-minute idle-sleep and max-live-resource semantics.

### Proposed acceptance criteria for the follow-up TASK

- No periodic resource-budget alarm remains while there are zero live resource leases.
- When leases exist, the next check is scheduled for the earliest meaningful deadline rather than unconditional one-minute polling.
- Creating/touching/removing a lease reschedules or clears the alarm deterministically.
- The existing idle timeout (`RESOURCE_IDLE_MS = 5 minutes`) and max-live limit (`RESOURCE_MAX_LIVE = 6`) keep their current behavior.
- Browser restart restores the correct next resource-budget check from persisted leases.
- Functional E2E remains green.

### Proposed automated test plan

- Unit/static test around alarm scheduling with zero leases, one lease and multiple leases.
- Assert no recurring alarm is created when no lease exists.
- Assert nearest-deadline scheduling and rescheduling when a lease is touched/removed.
- E2E resource-sleep scenario to ensure pane sleep still occurs and does not reload unrelated panes.

## Priority order

1. Eliminate unnecessary iframe reload/recreation.
2. Replace background polling/timers with event-driven scheduling.
3. Batch/debounce redundant storage/runtime traffic and persistence.
4. Ensure observer/timer cleanup on dispose and pane sleep.
5. Reduce live renderer/resource count.
6. Reduce full DOM rerender/layout thrash.
7. Lazy-load expensive optional modules/settings.
8. Reduce MV3 service-worker wakeups.
9. Improve startup and command latency.
10. Optimize package/assets only after runtime bottlenecks are measured.

## Known measurement gaps

The initial probe does not yet measure background service-worker CPU directly, runtime/storage message rate, storage-write rate, pane sleep/wake memory recovery, or extension-originated network request count. These need explicit test instrumentation rather than inference from wall-clock timing.
