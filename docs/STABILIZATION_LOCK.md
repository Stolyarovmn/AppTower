# Native Side Panel stabilization lock

This branch is under a temporary stabilization lock for the repeated Edge native Side Panel regressions.

Rules while this lock is active:

- no feature TASK starts;
- no performance enhancement starts unless required by the regression fix;
- the only authoritative evidence that an App Tower Side Panel document is alive is a live `ATN_SIDE_PANEL:<windowId>` runtime Port;
- persisted session flags must never suppress an explicit user open;
- workspace/storage mutations must not be head-of-line blocked by panel lifecycle work;
- the injected rail must be hidden whenever a live panel Port exists for its browser window;
- test ZIPs must come only from a successful GitHub Actions run for a named commit SHA;
- every package must contain build provenance with the exact commit SHA.

The lock is released only after automated regression coverage is green and the corresponding SHA-stamped build passes a real Microsoft Edge smoke test.
