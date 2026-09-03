# 07 — Modules, PWA and Media

## Declarative module principle

Provider-specific features should not inflate Core.

A module is validated data, not executable plugin code.

Allowed concepts include:
- metadata
- host hints
- URL regex matchers
- renderer type
- source URL templates using captures
- layout hints
- notification category metadata

Do not add:
- downloaded JavaScript
- remote WASM
- arbitrary commands/eval
- hidden executable payloads

## Current bundled modules

### YouTube

Current bundle uses YouTube module 1.2.x behavior (unchanged since v0.8.5):
- specific video/Shorts/live URLs -> official privacy-enhanced embed
- generic YouTube pages -> fall through to normal Auto/Compatibility path

Generic full-page YouTube remains service-dependent and is a known weakness.

### Yandex Music

The module originated around official/documented iframe URLs.

Intended supported shapes include:
- track
- album
- public/legacy playlist where a documented/public embed is available

Do not fabricate undocumented control endpoints.

## Future Module Store

Planned architecture:
- remote catalog of signed/validated declarative manifests
- install/update/remove without shipping provider logic in Core
- permissions/capability dashboard before install
- host scope clearly visible

A remote catalog must never turn into a remote-code execution channel.

## PWA-aware Auto

Discovery:
- page declares standard `<link rel="manifest">`
- content script reports manifest link
- background fetches/sanitizes metadata
- cache is bounded

Useful manifest metadata:
- name / short_name
- start_url
- scope
- display
- icons
- shortcuts

Do not depend on deprecated `edge_side_panel`.

## PWA App mode

When user prefers App mode:
- pane does not load that site in iframe
- pane becomes a launcher
- `Open as app` uses a top-level browser popup/sidecar
- one sidecar per origin can be reused
- manifest shortcuts can open in the same sidecar

This is not equivalent to controlling an OS-installed PWA shell.

## Media contract

Core has a provider-neutral contract in `shared/media-contract.js`.

Future modules may expose:
- provider
- title
- artist
- artwork
- playing
- position/duration
- capabilities such as play/pause/next/previous

Transport controls must be enabled only when the provider has a verified,
documented control path.

## Persistent playback idea

A Chromium `offscreen` document with `AUDIO_PLAYBACK` is a plausible future
architecture for services with a controllable player API.

This is **not currently implemented**. Do not scrape direct stream URLs or
pretend an iframe provides a documented transport API when it does not.
