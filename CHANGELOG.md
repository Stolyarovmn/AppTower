# Changelog

The authoritative historical source packages are in `archive/releases/`.
Historical README text is preserved in `archive/release-notes/`.

## 1.0.0

Store launch release for Microsoft Edge and Google Chrome (2026-09-03).

- Renamed from "App Tower Next" to "App Tower" across the app, the
  generated Yandex sidecar variant, docs, and tooling.
- Version 0.8.5 -> 1.0.0 as the first public store release.
- Store listing, privacy text, and submission checklist:
  `docs/21_STORE_SUBMISSION.md`.
- Product context: Microsoft is retiring Edge's legacy "Sidebar app
  list (App Tower)"; App Tower is an independent extension with no
  affiliation with Microsoft or that legacy feature.
- The three v0.8.5 regression fixes carry over unchanged; live
  Edge/Chrome verification remains pending (`docs/21` section 7).

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

For exact source snapshots and historical notes, use the archives instead of
inferring behavior from this summary.
