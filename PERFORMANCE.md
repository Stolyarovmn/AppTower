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

### Initial green timing samples

Two independent GitHub Actions jobs on commit `a11a8f5c1daae45adf7833a58b7664f79dcae546` produced comparable Chromium 140 timing/heap measurements:

| Metric | Run 76 | Run 77 | Two-run observation |
|---|---:|---:|---:|
| Startup median | 135.04 ms | 136.65 ms | 135.85 ms median-of-runs |
| Startup p95 | 196.49 ms | 179.05 ms | 196.49 ms worst observed |
| Search median | 50.91 ms | 52.18 ms | 51.55 ms median-of-runs |
| Search p95 | 88.89 ms | 87.25 ms | 88.89 ms worst observed |
| Add dialog | 64.70 ms | 62.68 ms | 63.69 ms median-of-runs |
| JS heap used | 6.503 MiB | 4.745 MiB | 4.745–6.503 MiB observed range |
| iframe count | 4 | 4 | invariant in this fixture |
| visible iframe count | 0 | 0 | invariant in this fixture |
| long tasks >50 ms | 0 | 0 | none observed |

The original idle CPU readings from these two runs were invalid because the two ends of the interval were read through separate CDP sessions. They are intentionally excluded from the idle baseline.

### Corrected green samples

The corrected probe keeps both idle-counter reads on one CDP session and rejects negative deltas. Two independent green jobs on commit `694d498cbeb34c1c13ed4ff32f900a9105b0e419` produced these Chromium `140.0.7339.16` samples:

| Metric | Run 88 | Run 89 | Current corrected observation |
|---|---:|---:|---:|
| Startup median | 129.20 ms | 123.31 ms | 126.26 ms median-of-runs |
| Startup p95 | 188.63 ms | 172.74 ms | 188.63 ms worst observed |
| Search median | 52.43 ms | 52.25 ms | 52.34 ms median-of-runs |
| Search p95 | 82.03 ms | 75.35 ms | 82.03 ms worst observed |
| Add dialog | 59.60 ms | 63.07 ms | 61.34 ms median-of-runs |
| Idle renderer TaskDuration / 1 s | 7.010 ms | 5.700 ms | 6.355 ms median-of-runs |
| Idle renderer ScriptDuration / 1 s | 0.049 ms | 0.026 ms | 0.038 ms median-of-runs |
| JS heap used | 4.720 MiB | 6.188 MiB | 4.720–6.188 MiB observed range |
| iframe count | 4 | 4 | invariant in this fixture |
| visible iframe count | 0 | 0 | invariant in this fixture |
| long tasks >50 ms | 0 | 0 | none observed |

The corrected samples are now the preferred idle-CPU baseline evidence. Timing/heap budgets remain provisional because hosted-runner variance is still based on too few independent corrected jobs. The next promotion point is at least five comparable corrected green jobs on the same benchmark semantics; then use a relative regression threshold rather than a brittle single-number limit.

## Baseline table

| Metric | Current baseline | Budget | Collection status |
|---|---:|---:|---|
| Side Panel startup median | 123.31–129.20 ms across 2 corrected green jobs | pending relative budget | automated; target >=5 corrected jobs |
| Side Panel startup p95 | 172.74–188.63 ms across 2 corrected green jobs | safety guard < 5000 ms | automated; target >=5 corrected jobs |
| Search dialog median | 52.25–52.43 ms across 2 corrected green jobs | pending relative budget | automated; target >=5 corrected jobs |
| Search dialog p95 | 75.35–82.03 ms across 2 corrected green jobs | safety guard < 2000 ms | automated; target >=5 corrected jobs |
| Add dialog latency | 59.60–63.07 ms across 2 corrected green jobs | safety guard < 3000 ms | automated; target >=5 corrected jobs |
| Idle renderer TaskDuration / 1 s | 5.700–7.010 ms | pending relative budget | corrected automated measurement |
| Idle renderer ScriptDuration / 1 s | 0.026–0.049 ms | pending relative budget | corrected automated measurement |
| Side Panel JS heap used | 4.720–6.188 MiB across 2 corrected green jobs | pending relative budget | automated; target >=5 corrected jobs |
| Live iframe count | 4 total / 0 visible in baseline fixture | scenario-specific invariant | automated |
| Long tasks >50 ms | 0 in 2 corrected green jobs | pending | automated |
| Runtime/storage messages per minute | not instrumented | pending | planned |
| Storage writes per minute | not instrumented | pending | planned |
| Service-worker wakeups | static source evidence available; runtime counter pending | pending | planned |
| Pane sleep/wake memory delta | not instrumented | pending | planned |
| Extension-originated network requests | not instrumented | pending | planned |

## First confirmed bottleneck candidate

The MV3 service worker currently creates the `atn-resource-budget` alarm with `periodInMinutes: 1` on both install and browser startup. The alarm handler calls `enforceResourceBudget()`, which returns immediately when there are no resource leases. This is a deterministic periodic wake source in AppTower's own code even when the resource-budget subsystem has no work to perform.

This is not changed while the Serialized state coordinator TASK holds the global WIP lock. It should first receive a dedicated regression/performance test, then be replaced by an event-driven/nearest-deadline schedule if the change preserves the 5-minute idle-sleep and max-live-resource semantics.

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

The probe does not yet measure background service-worker CPU directly, runtime/storage message rate, storage-write rate, pane sleep/wake memory recovery, or extension-originated network request count. These need explicit test instrumentation rather than inference from wall-clock timing.
