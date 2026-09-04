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

## Latest verified CI sample — validate run 149

Run 149 completed successfully on PR head `405a08c41cc5d4d2d4174c16d941cdd4438415c6` using Chromium `140.0.7339.16`. The validation workflow completed source checks, 22 unit tests, 14 headed Chromium E2E tests, fallback/package rebuild and artifact upload successfully.

Side Panel:

| Metric | Run 149 |
|---|---:|
| Startup minimum | 99.43 ms |
| Startup median | 103.16 ms |
| Startup p95/max | 156.58 ms |
| Search median | 52.51 ms |
| Search p95/max | 74.24 ms |
| Add dialog | 60.98 ms |
| Idle `TaskDuration` / 1 s | 6.078 ms |
| Idle `ScriptDuration` / 1 s | 0.026 ms |
| JS heap used | 4.371 MiB |
| JS heap total | 19.531 MiB |
| iframe count | 4 |
| visible iframe count | 0 |
| Long Tasks >50 ms | 0 |

New Tab:

| Metric | Run 149 |
|---|---:|
| First-interactive minimum | 71.28 ms |
| First-interactive median | 76.36 ms |
| First-interactive p95/max | 106.12 ms |

Run 149 remains inside every currently documented regression budget: Side Panel startup median 103.16 < 172.52 ms, startup p95 156.58 < 253.89 ms, Search median 52.51 < 72.90 ms, Search p95 74.24 < 112.04 ms, Add 60.98 < 82.31 ms, idle `TaskDuration` 6.078 < 9.090 ms/s, New Tab median 76.36 < 118.58 ms and New Tab p95 106.12 < 184.07 ms. Structural invariants remain unchanged at 4 iframes, 0 visible iframes in the fixture and 0 Long Tasks.

TASK 2 is still marked `ACTIVE` in the global backlog, so this remains a candidate post-change sample rather than a rebased baseline. Do not promote it to the stable baseline until TASK 2 completes and multiple post-TASK-2 jobs agree.

## Previous candidate sample — validate run 131

Run 131 completed successfully on head `0b564b0190abb32cb02d8f9846461d8e32a43db3` using Chromium `140.0.7339.16`.

Side Panel:

| Metric | Run 131 |
|---|---:|
| Startup minimum | 125.97 ms |
| Startup median | 132.22 ms |
| Startup p95/max | 199.52 ms |
| Search median | 52.74 ms |
| Search p95/max | 85.39 ms |
| Add dialog | 62.33 ms |
| Idle `TaskDuration` / 1 s | 6.425 ms |
| Idle `ScriptDuration` / 1 s | 0.120 ms |
| JS heap used | 4.384 MiB |
| JS heap total | 19.031 MiB |
| iframe count | 4 |
| visible iframe count | 0 |
| Long Tasks >50 ms | 0 |

New Tab:

| Metric | Run 131 |
|---|---:|
| First-interactive minimum | 93.53 ms |
| First-interactive median | 116.72 ms |
| First-interactive p95/max | 162.76 ms |

Run 131 remains inside every currently documented latency/CPU regression budget. The New Tab median is close to its provisional threshold, but this is one hosted-runner sample while TASK 2 is still `ACTIVE`; treat it as a watch signal rather than a regression.

## Previous candidate sample — validate run 119

Run 119 completed successfully on head `1f2e219c5c6124e07918e2625bae7947ddbb6ef9` using Chromium `140.0.7339.16`.

Side Panel:

| Metric | Run 119 |
|---|---:|
| Startup minimum | 74.57 ms |
| Startup median | 94.01 ms |
| Startup p95/max | 107.25 ms |
| Search median | 51.37 ms |
| Search p95/max | 65.02 ms |
| Add dialog | 43.89 ms |
| Idle `TaskDuration` / 1 s | 4.060 ms |
| Idle `ScriptDuration` / 1 s | 0.051 ms |
| JS heap used | 5.803 MiB |
| JS heap total | 19.531 MiB |
| iframe count | 4 |
| visible iframe count | 0 |
| Long Tasks >50 ms | 0 |

New Tab:

| Metric | Run 119 |
|---|---:|
| First-interactive minimum | 48.16 ms |
| First-interactive median | 58.16 ms |
| First-interactive p95/max | 135.05 ms |

Run 119 is materially faster than the prior Side Panel timing baseline while preserving the structural invariants. Because TASK 2 is still `ACTIVE`, this sample is recorded but the established Side Panel baseline is not rebased until the coordinator work is complete and multiple post-TASK-2 jobs agree.

## Corrected Side Panel baseline

The idle-counter bug in the original probe was corrected by reading both ends of the idle interval through one CDP session. The current stable pre-completion baseline is based on eight comparable corrected green jobs: validate runs **88, 89, 96, 97, 99, 106, 107 and 113**, all on Chromium `140.0.7339.16` with the same benchmark semantics.

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

Runs 119, 131 and 149 are retained as candidate post-change samples rather than folded into this baseline while TASK 2 owns the WIP lock.

### ScriptDuration noise finding

Runs 106 and 107 were separate hosted jobs for runtime-equivalent head `844c64fae14dbcf525fcf3ba1e95a9f49747c52a`; run 113 followed documentation and coordinator-race-test changes without AppTower runtime changes. Their idle `ScriptDuration` samples were **0.038**, **0.148** and **0.132 ms/s** respectively.

That demonstrates that a repeated small absolute `ScriptDuration` threshold can false-positive on hosted runners. `ScriptDuration` remains diagnostic only until a larger, scenario-stable interval or direct extension/service-worker CPU measurement exists.

## New Tab baseline

Five green jobs now exist with the same benchmark semantics and Chromium version: runs **99, 106, 107, 113 and 119**.

| Metric | Run 99 | Run 106 | Run 107 | Run 113 | Run 119 | Median of runs | Observed range |
|---|---:|---:|---:|---:|---:|---:|---:|
| First-interactive minimum | 78.76 ms | 79.52 ms | 85.82 ms | 87.55 ms | 48.16 ms | **79.52 ms** | 48.16–87.55 ms |
| First-interactive median | 92.17 ms | 84.35 ms | 87.84 ms | 90.72 ms | 58.16 ms | **87.84 ms** | 58.16–92.17 ms |
| First-interactive p95/max | 155.13 ms | 114.87 ms | 136.35 ms | 142.90 ms | 135.05 ms | **136.35 ms** | 114.87–155.13 ms |

Five samples are enough to promote a provisional relative New Tab budget. The budget remains deliberately loose because the hosted-runner spread is still material. Runs 131 and 149 are tracked separately as post-change/watch samples while TASK 2 is active.

## Baselines and provisional budgets

| Metric | Baseline | Provisional regression budget | Enforcement state |
|---|---:|---:|---|
| Side Panel startup median | 127.79 ms median-of-runs | +35% = **172.52 ms** | documented; automate after TASK 2 |
| Side Panel startup p95 | 188.07 ms median-of-runs | +35% = **253.89 ms** | documented; automate after TASK 2 |
| Search median | 54.00 ms median-of-runs | +35% = **72.90 ms** | documented; automate after TASK 2 |
| Search p95 | 82.99 ms median-of-runs | +35% = **112.04 ms** | documented; automate after TASK 2 |
| Add dialog latency | 60.97 ms median-of-runs | +35% = **82.31 ms** | documented; automate after TASK 2 |
| Idle renderer `TaskDuration` / 1 s | 6.733 ms median-of-runs | +35% = **9.090 ms** | documented; automate after TASK 2 |
| Idle renderer `ScriptDuration` / 1 s | 0.0435 ms median-of-runs | **diagnostic only** | repeated absolute threshold rejected as noisy |
| Side Panel JS heap used | 4.723 MiB median-of-runs; observed 4.367–6.530 MiB | no tight gate yet | scenario variance too large |
| Live iframe count | 4 total / 0 visible in fixture | no increase in identical fixture | structural invariant |
| Long Tasks >50 ms | 0 | no repeated Long Task in idle/command fixture | safety signal |
| New Tab first-interactive median | 87.84 ms median-of-runs, 5 green jobs | +35% = **118.58 ms** | documented provisional budget; run 149 = 76.36 ms |
| New Tab first-interactive p95 | 136.35 ms median-of-runs, 5 green jobs | +35% = **184.07 ms** | documented provisional budget; run 149 = 106.12 ms |
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
- Compare measured service-worker wakeup count before/after once instrumentation is available.

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
