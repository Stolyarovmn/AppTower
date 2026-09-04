# AppTower Performance / Energy Baseline

Last updated: 2026-09-04.

## Purpose

This document tracks runtime performance and energy budgets for AppTower. Runtime changes are accepted only when they preserve functional E2E behavior and have a measurable benefit or remove a demonstrated source of waste.

## Measurement policy

- Functional CI must be green before starting an unrelated optimization.
- One functional TASK may be `ACTIVE` at a time across the project.
- Timing values from hosted CI are noisy; use multiple comparable samples, median-of-runs and relative thresholds.
- A budget is not a target to consume. It is a regression guard above a measured baseline.
- Performance work must not weaken privacy, compatibility or functional regression coverage.
- Runtime code is not changed while another functional TASK owns the global WIP lock unless the performance change is required by that TASK or fixes an existing regression.
- A single hosted-runner outlier is evidence to inspect, not by itself a regression. Noisy counters require repeated breaches across comparable jobs before blocking CI.

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

Three comparable green jobs on Chromium `140.0.7339.16` are now available:

| Metric | Run 99 | Run 106 | Run 107 | Median of runs | Observed range |
|---|---:|---:|---:|---:|---:|
| New Tab first-interactive minimum | 78.76 ms | 79.52 ms | 85.82 ms | **79.52 ms** | 78.76–85.82 ms |
| New Tab first-interactive median | 92.17 ms | 84.35 ms | 87.84 ms | **87.84 ms** | 84.35–92.17 ms |
| New Tab first-interactive p95/max | 155.13 ms | 114.87 ms | 136.35 ms | **136.35 ms** | 114.87–155.13 ms |

This metric still needs at least two more independent comparable green jobs before a tight relative budget is promoted.

## Corrected seven-job Side Panel baseline

The idle-counter bug in the original probe was corrected by reading both ends of the idle interval through the same CDP session. Seven independent corrected green jobs are now available: validate runs **88, 89, 96, 97, 99, 106 and 107**, all using Chromium `140.0.7339.16` and the same benchmark semantics.

| Metric | Run 88 | Run 89 | Run 96 | Run 97 | Run 99 | Run 106 | Run 107 | Median of runs | Observed range |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Side Panel startup median | 129.20 ms | 123.31 ms | 123.70 ms | 128.32 ms | 154.56 ms | 127.26 ms | 127.14 ms | **127.26 ms** | 123.31–154.56 ms |
| Side Panel startup p95 | 188.63 ms | 172.74 ms | 197.12 ms | 191.43 ms | 185.17 ms | 179.13 ms | 187.51 ms | **187.51 ms** | 172.74–197.12 ms |
| Search median | 52.43 ms | 52.25 ms | 52.35 ms | 60.41 ms | 56.57 ms | 54.61 ms | 54.81 ms | **54.61 ms** | 52.25–60.41 ms |
| Search p95 | 82.03 ms | 75.35 ms | 83.94 ms | 85.86 ms | 80.92 ms | 79.54 ms | 90.14 ms | **82.03 ms** | 75.35–90.14 ms |
| Add dialog | 59.60 ms | 63.07 ms | 59.54 ms | 60.07 ms | 63.16 ms | 65.93 ms | 57.01 ms | **60.07 ms** | 57.01–65.93 ms |
| Idle TaskDuration / 1 s | 7.010 ms | 5.700 ms | 6.646 ms | 6.820 ms | 5.462 ms | 6.493 ms | 6.871 ms | **6.646 ms** | 5.462–7.010 ms |
| Idle ScriptDuration / 1 s | 0.049 ms | 0.026 ms | 0.070 ms | 0 ms | 0 ms | 0.038 ms | 0.148 ms | **0.038 ms** | 0–0.148 ms |
| JS heap used | 4.720 MiB | 6.188 MiB | 6.530 MiB | 4.382 MiB | 6.519 MiB | 4.367 MiB | 4.717 MiB | **4.720 MiB** | 4.367–6.530 MiB |
| iframe count | 4 | 4 | 4 | 4 | 4 | 4 | 4 | **4** | invariant |
| visible iframe count | 0 | 0 | 0 | 0 | 0 | 0 | 0 | **0** | invariant |
| Long Tasks >50 ms | 0 | 0 | 0 | 0 | 0 | 0 | 0 | **0** | invariant |

Runs 106 and 107 are separate hosted jobs for the same head commit `844c64fae14dbcf525fcf3ba1e95a9f49747c52a`; both passed the complete validation suite. Their identical-code `ScriptDuration` samples differ by almost 4x (0.038 vs 0.148 ms/s), demonstrating that this low-magnitude counter is too noisy for a single-run absolute gate. No AppTower runtime code was changed by this performance pass.

## Baselines and budgets

Hosted-runner timing variance is material, so the first budgets are intentionally relative and conservative. A single noisy run should not block development; a repeated breach across comparable green jobs is a regression signal requiring investigation.

| Metric | Baseline | Provisional regression budget | Enforcement state |
|---|---:|---:|---|
| Side Panel startup median | 127.26 ms median-of-runs | +35% vs baseline = **171.80 ms** | documented; automate after Task 2 |
| Side Panel startup p95 | 187.51 ms median-of-runs | +35% = **253.14 ms** | documented; automate after Task 2 |
| Search median | 54.61 ms median-of-runs | +35% = **73.72 ms** | documented; automate after Task 2 |
| Search p95 | 82.03 ms median-of-runs | +35% = **110.74 ms** | documented; automate after Task 2 |
| Add dialog latency | 60.07 ms median-of-runs | +35% = **81.09 ms** | documented; automate after Task 2 |
| Idle renderer TaskDuration / 1 s | 6.646 ms median-of-runs | +35% = **8.972 ms** | documented; automate after Task 2 |
| Idle renderer ScriptDuration / 1 s | 0.038 ms median-of-runs | investigate only after **2 of 3 comparable jobs >0.10 ms/s** | documented; single-run absolute gate rejected as noisy |
| Side Panel JS heap used | 4.720 MiB median-of-runs; observed 4.367–6.530 MiB | no tight gate yet; require scenario-stable repeated regression | collecting; current variance is too large for +35% of median |
| Live iframe count | 4 total / 0 visible in fixture | no increase in identical fixture | automated scenario invariant |
| Long Tasks >50 ms | 0 | no repeated Long Task in idle/command fixture | probe records; threshold remains safety-oriented |
| New Tab first-interactive median | 87.84 ms median-of-runs, 3 green jobs | pending >=5 jobs | collecting |
| New Tab first-interactive p95 | 136.35 ms median-of-runs, 3 green jobs | safety guard <5000 ms until >=5 jobs | collecting |
| Runtime/storage messages per minute | not instrumented | pending | planned |
| Storage writes per minute | not instrumented | pending | planned |
| Service-worker wakeups | static source evidence available; runtime counter pending | pending | planned |
| Pane sleep/wake memory delta | not instrumented | pending | planned |
| Extension-originated network requests | not instrumented | pending | planned |

The +35% timing/idle guard is derived from the seven-job median-of-runs rather than the fastest job. It is deliberately wider than the observed current spread. Heap and very small ScriptDuration counters are explicitly excluded from naive single-run relative enforcement until their scenario variance is better controlled. Budget automation should compare against a versioned baseline artifact rather than hard-code values into UI behavior tests.

## First confirmed bottleneck candidate

The MV3 service worker currently creates the `atn-resource-budget` alarm with `periodInMinutes: 1` on install and browser startup. The alarm handler calls `enforceResourceBudget()`, which returns immediately when there are no resource leases. This is deterministic periodic AppTower-owned wakeup work even when the subsystem has nothing to do.

This remains TASK 6 in the ranked backlog and is not changed while TASK 2 (Serialized state coordinator) owns the global WIP lock.

### TASK 6 acceptance criteria

- No periodic resource-budget alarm while there are zero live resource leases.
- With leases present, schedule the next check for the earliest meaningful deadline instead of unconditional one-minute polling.
- Creating/touching/removing a lease deterministically reschedules or clears the alarm.
- Existing `RESOURCE_IDLE_MS = 5 minutes` and `RESOURCE_MAX_LIVE = 6` semantics remain unchanged.
- Browser restart restores the correct next resource-budget check from persisted leases.
- Existing pane-isolation/resource-sleep E2E remains green.

### TASK 6 automated test plan

- Alarm scheduling tests with zero, one and multiple leases.
- Assert no recurring alarm with zero leases.
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
