# AppTower Performance / Energy Baseline

Last updated: 2026-09-04.

## Purpose

This document tracks runtime performance and energy budgets for AppTower. Runtime changes are accepted only when they preserve functional E2E behavior and have a measurable benefit or remove a demonstrated source of waste.

## Measurement policy

- Functional CI must be green before starting an unrelated optimization.
- One functional TASK may be `ACTIVE` at a time across the project.
- Runtime code is not changed while another functional TASK owns the global WIP lock unless the performance change is required by that TASK or fixes an existing regression.
- Hosted-runner timings and very small CPU counters are noisy; use multiple comparable samples, median-of-runs and relative thresholds.
- A budget is a regression guard, not a target to consume.
- A single outlier is evidence to inspect, not by itself a regression.
- Very small `ScriptDuration` deltas are diagnostic only. Even a repeated absolute threshold can be false-positive on identical runtime code; blocking decisions must prefer `TaskDuration`, wall-clock latency, stable structural counters and before/after same-scenario comparisons.

## Automated probes

### ATN-PERF-001 — Side Panel

`tests/e2e/performance-baseline.spec.mjs` runs the unpacked extension in headed Chromium/Xvfb and records:

- Side Panel startup-to-interactive latency: 5 samples, median and p95;
- Search-dialog command latency: 7 samples, median and p95;
- Add-current dialog latency;
- one-second idle renderer `TaskDuration` and `ScriptDuration` through one CDP session;
- Side Panel JS heap used/total;
- iframe count and visible iframe count;
- Long Task count and longest Long Task.

### ATN-PERF-002 — New Tab

`tests/e2e/performance-newtab.spec.mjs` measures AppTower New Tab first-interactive latency in headed Chromium/Xvfb. Readiness requires the App Tower rail to be visible and the search control to be enabled. Seven samples are recorded to a dedicated JSON artifact.

## Latest verified CI sample — validate run 113

Run 113 completed successfully on head `480d630659a6d83e890a927c75db03d4ed44ba86` using Chromium `140.0.7339.16`.

Side Panel:

| Metric | Run 113 |
|---|---:|
| Startup minimum | 125.76 ms |
| Startup median | 136.35 ms |
| Startup p95/max | 198.43 ms |
| Search median | 53.38 ms |
| Search p95/max | 91.25 ms |
| Add dialog | 61.86 ms |
| Idle `TaskDuration` / 1 s | 7.092 ms |
| Idle `ScriptDuration` / 1 s | 0.132 ms |
| JS heap used | 4.725 MiB |
| JS heap total | 18.281 MiB |
| iframe count | 4 |
| visible iframe count | 0 |
| Long Tasks >50 ms | 0 |

New Tab:

| Metric | Run 113 |
|---|---:|
| First-interactive minimum | 87.55 ms |
| First-interactive median | 90.72 ms |
| First-interactive p95/max | 142.90 ms |

## Corrected eight-job Side Panel baseline

The idle-counter bug in the original probe was corrected by reading both ends of the idle interval through one CDP session. Eight comparable corrected green jobs are now available: validate runs **88, 89, 96, 97, 99, 106, 107 and 113**, all on Chromium `140.0.7339.16` with the same benchmark semantics.

| Metric | Median of runs | Observed range |
|---|---:|---:|
| Side Panel startup median | **127.79 ms** | 123.31–154.56 ms |
| Side Panel startup p95 | **188.07 ms** | 172.74–198.43 ms |
| Search median | **54.00 ms** | 52.25–60.41 ms |
| Search p95 | **82.99 ms** | 75.35–91.25 ms |
| Add dialog | **60.97 ms** | 57.01–65.93 ms |
| Idle `TaskDuration` / 1 s | **6.733 ms** | 5.462–7.092 ms |
| Idle `ScriptDuration` / 1 s | **0.0435 ms** | 0–0.148 ms |
| JS heap used | **4.723 MiB** | 4.367–6.530 MiB |
| iframe count | **4** | invariant |
| visible iframe count | **0** | invariant |
| Long Tasks >50 ms | **0** | invariant |

### ScriptDuration noise finding

Runs 106 and 107 were separate hosted jobs for runtime-equivalent head `844c64fae14dbcf525fcf3ba1e95a9f49747c52a`; run 113 is three commits later, but the compare from `844c64f...` to `480d630...` changes only `PERFORMANCE.md` and `tests/e2e/coordinator-race.spec.mjs`, not AppTower runtime code. Their idle `ScriptDuration` samples are **0.038**, **0.148** and **0.132 ms/s** respectively.

That means the previous diagnostic rule `2 of 3 comparable jobs >0.10 ms/s` can trigger on identical runtime code. It is therefore rejected as a blocking budget. `ScriptDuration` remains a diagnostic signal only until we can measure a larger, scenario-stable interval or collect extension/service-worker CPU directly.

## New Tab baseline

Four comparable green jobs are now available: runs **99, 106, 107 and 113**.

| Metric | Run 99 | Run 106 | Run 107 | Run 113 | Median of runs | Observed range |
|---|---:|---:|---:|---:|---:|---:|
| First-interactive minimum | 78.76 ms | 79.52 ms | 85.82 ms | 87.55 ms | **82.67 ms** | 78.76–87.55 ms |
| First-interactive median | 92.17 ms | 84.35 ms | 87.84 ms | 90.72 ms | **89.28 ms** | 84.35–92.17 ms |
| First-interactive p95/max | 155.13 ms | 114.87 ms | 136.35 ms | 142.90 ms | **139.63 ms** | 114.87–155.13 ms |

One more independent comparable green job is required before promoting a tight New Tab relative budget.

## Baselines and provisional budgets

| Metric | Baseline | Provisional regression budget | Enforcement state |
|---|---:|---:|---|
| Side Panel startup median | 127.79 ms median-of-runs | +35% = **172.52 ms** | documented; automate after Task 2 |
| Side Panel startup p95 | 188.07 ms median-of-runs | +35% = **253.89 ms** | documented; automate after Task 2 |
| Search median | 54.00 ms median-of-runs | +35% = **72.90 ms** | documented; automate after Task 2 |
| Search p95 | 82.99 ms median-of-runs | +35% = **112.04 ms** | documented; automate after Task 2 |
| Add dialog latency | 60.97 ms median-of-runs | +35% = **82.31 ms** | documented; automate after Task 2 |
| Idle renderer `TaskDuration` / 1 s | 6.733 ms median-of-runs | +35% = **9.090 ms** | documented; automate after Task 2 |
| Idle renderer `ScriptDuration` / 1 s | 0.0435 ms median-of-runs | **diagnostic only** | repeated absolute threshold rejected as noisy |
| Side Panel JS heap used | 4.723 MiB median-of-runs; observed 4.367–6.530 MiB | no tight gate yet | scenario variance too large |
| Live iframe count | 4 total / 0 visible in fixture | no increase in identical fixture | structural invariant |
| Long Tasks >50 ms | 0 | no repeated Long Task in idle/command fixture | safety signal |
| New Tab first-interactive median | 89.28 ms median-of-runs, 4 green jobs | pending >=5 jobs | collecting |
| New Tab first-interactive p95 | 139.63 ms median-of-runs, 4 green jobs | safety guard <5000 ms until >=5 jobs | collecting |
| Runtime/storage messages per minute | not instrumented | pending | planned |
| Storage writes per minute | not instrumented | pending | planned |
| Service-worker wakeups | static source evidence available; runtime counter pending | pending | planned |
| Pane sleep/wake memory delta | not instrumented | pending | planned |
| Extension-originated network requests | not instrumented | pending | planned |
| Observer callback rate | not instrumented | pending | planned |
| Duplicate work after storage/Port reconnect | not instrumented | pending | planned |

Budget automation should compare against a versioned baseline artifact rather than hard-code values into UI behavior tests.

## First confirmed bottleneck candidate — TASK 6

The MV3 service worker currently creates the `atn-resource-budget` alarm with `periodInMinutes: 1` on install and browser startup. The alarm handler calls `enforceResourceBudget()`, which returns immediately when there are no resource leases. This is deterministic periodic AppTower-owned service-worker wakeup work even when the subsystem has nothing to do.

TASK 6 remains blocked while TASK 2 (Serialized state coordinator) owns the global WIP lock.

### Acceptance criteria

- No periodic resource-budget alarm while there are zero live resource leases.
- With leases present, schedule the next check for the earliest meaningful deadline instead of unconditional one-minute polling.
- Creating/touching/removing a lease deterministically reschedules or clears the alarm.
- Existing `RESOURCE_IDLE_MS = 5 minutes` and `RESOURCE_MAX_LIVE = 6` semantics remain unchanged.
- Browser restart restores the correct next resource-budget check from persisted leases.
- Existing pane-isolation/resource-sleep E2E remains green.

### Automated test plan

- Alarm scheduling tests with zero, one and multiple leases.
- Assert no recurring alarm when no leases exist.
- Assert nearest-deadline rescheduling after touch/remove.
- E2E verify pane sleep does not reload an unrelated pane.
- Compare measured service-worker wakeups before/after once the wakeup counter exists.

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

The probes still do not measure background service-worker CPU directly, runtime/storage message rate, storage-write rate, pane sleep/wake memory recovery, extension-originated network request count, service-worker wakeup count, observer callback rate or duplicate work after storage/Port reconnect. These require explicit instrumentation rather than inference from wall-clock timings.
