# Changelog

The authoritative historical source packages are in `archive/releases/`.
Historical README text is preserved in `archive/release-notes/`.

## 1.0.0 — store candidate

Prepared as the first public-store candidate for Microsoft Edge and Google Chrome (2026-09-03).

- Renamed from "App Tower Next" to "App Tower" across the app, generated Yandex sidecar variant, docs and tooling.
- Version 0.8.5 -> 1.0.0 as the first public-store candidate.
- Added store listing/privacy/submission documentation.
- Added an explicit independence statement: App Tower is not affiliated with Microsoft or the retired Edge Sidebar app-list feature.
- Runtime behavior remains **awaiting live verification** for the P0 queue in `docs/10_KNOWN_ISSUES.md`; 1.0.0 must not be described as production-verified until those checks pass.

### Store-readiness audit follow-up

- Shortened `manifest.description` to the Chrome Web Store metadata limit.
- Removed manifest permissions without a confirmed runtime use (`declarativeNetRequestFeedback`, optional `notifications`).
- Added public `PRIVACY.md`, `SECURITY.md`, `CONTRIBUTING.md` and `SUPPORT.md`.
- Clarified broad host/content-script disclosures versus user-scoped Compatibility/DNR rules.
- Added validator coverage for manifest description length.
- Reworked public/developer README files so release history has a single source of truth.

## 0.8.5

Previous handoff baseline (superseded by 1.0.0).

Focus:
- current-page capture from browser tab / pane
- collapsed/native Side Panel recovery
- restart recovery for disabled side-panel tabs
- Edge Fluent settings glyph path
- cleanup of malformed CSS newline escapes

Live Edge verification is still required for the P0 paths listed in
`docs/10_KNOWN_ISSUES.md`.

## 0.8.4

- search click/Close fixes
- Add current helper
- Options/Recent user-gesture path
- collapse adapter changes
- generic YouTube mobile fallback removed

## 0.8.3

- workspace-change reload regression work
- organizer for group/template
- drag suppression
- actionable Options pages
- Recent/resource/Web Apps/Sidecar UX pass

## 0.8.2

- Add Site / bookmark source improvements
- group/template dialog-state fixes
- chooser dialogs replacing JavaScript prompts

## 0.8.1

- Side Panel event authority over transient Port disconnect
- consistent rail icon set

## 0.8.0

- BrowserAdapter
- Workspaces
- search / Recent
- resource sleeping
- per-site settings
- notifications
- Sidecar Manager
- Media contract
- Permissions dashboard
- dedicated Options page

## 0.7.0

- scrollable rail
- groups
- two-pane templates
- pointer drag/drop
- adjustable template favicon overlap

## 0.6.x

- PWA-aware Auto
- system/manual theme and accent

## 0.5.0

- declarative optional module registry

## 0.4.x

- canonical Auto
- media experiments
- custom New Tab/startup rail behavior

## 0.3.x and earlier

- collapsed rail lifecycle
- split pane foundation
- Secure/Compatibility/Real Page experiments
- initial Edge Side Panel replacement prototype

For exact source snapshots and historical notes, use the archives instead of inferring behavior from this summary.
