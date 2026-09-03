# 12 — Roadmap and idea backlog

## Stage 0 — stabilize v0.8.5 first

Do not add major surface area until P0 lifecycle/current-page paths pass live
Edge tests.

Instrumentation mode should be added if any lifecycle bug reproduces:
timestamp all open/close/connect/disconnect/state-write/render events.

## Stage 1 — reliability/UX completion

- finish drag/drop regression tests for mouse/touch/pen
- make organizer/group context actions fully coherent
- make every Options list actionable
- standardized icon component for all internal UI
- obvious failed-frame recovery: `Open as Real Page`
- per-site zoom verification
- improve source selection in Add Site
- test Browser Sync conflict behavior
- accessibility: keyboard focus, aria labels, contrast, reduced motion

## Stage 2 — dynamic/linked templates

Idea discussed but not yet specified enough.

Potential model:

```text
Template rule
TOP:    current GitHub PR URL
BOTTOM: derive CI/pipeline/log URL from TOP context
```

Examples:
- repository/PR -> CI pipeline
- Grafana panel -> logs
- Kubernetes workload -> pod logs
- ticket -> related documentation

Before implementation define:
- variable/capture model
- trusted declarative transform schema
- what context modules can expose
- what happens when derivation fails
- security boundary so transforms cannot become arbitrary scripts

## Stage 3 — module ecosystem

- remote module catalog
- metadata signatures/checksums
- capability/host permission preview
- install/update/remove
- compatibility version constraints
- provider adapters: Spotify/Twitch/Vimeo/etc only after verifying supported
  public embedding/control contracts
- service-specific compact UI stays optional

## Stage 4 — media shelf

Global small media affordance in rail driven by media contract:
- artwork/service icon
- title
- playing state
- play/pause only when verified
- next/previous only when verified

Possible offscreen playback only for providers with documented transport API.

## Stage 5 — sidecar improvements

- remember width/height per app/site
- focus/close/reopen
- optional "follow browser window" geometry
- distinguish PWA App sidecars from Real Page sidecars
- recovery after browser restart

## Stage 6 — browser platform expansion

- live-test Yandex variant
- create explicit Firefox BrowserAdapter if justified
- investigate browser-native Workspace APIs only if public/stable

## Additional ideas captured

- site notification categories controlled by modules
- recent/closed state recovery
- workspace-aware search
- command palette commands
- module-level badges instead of Core scraping site DOM
- optional plugin-driven music players so users do not download unused provider
  logic
- Web App Manifest shortcuts surfaced in App Tower context menus
- remote catalog without bloating Core
