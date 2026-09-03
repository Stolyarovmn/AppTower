# 00 — Start here

## Goal

Build a reliable, compact browser-side workspace that feels native in Edge and
Chrome, remains usable in Chromium-family browsers via fallback, and replaces
the removed/changed browser sidebar/App Tower workflow without becoming a
provider-specific monolith.

The core experience is:

```text
browser page
    │
    ├── collapsed App Tower rail
    │
    └── native Side Panel / fallback sidecar
           ├── workspace selector
           ├── upper pane
           ├── lower pane
           └── right shortcut rail
```

The rail stores sites, groups and two-pane templates. The content area can show
one pane or a horizontal split. `Auto` decides whether a URL uses an optional
declarative media module, PWA/app launcher, or ordinary web compatibility path.

## What to trust

- `app/` is the current Edge/Chrome source at v1.0.0.
- `variants/yandex-sidecar/` is the current fallback variant.
- `archive/releases/` is historical evidence only.
- `docs/01_PROJECT_STATUS.md` separates implemented code from live-verified
  behavior.
- `docs/10_KNOWN_ISSUES.md` is the first place to look before fixing anything.

## Immediate live-test priority

v0.8.5 was specifically built to fix three regressions (carried into v1.0.0) that still require a
real Edge test:

1. Empty workspace -> **Add current page** must prefill the browser web tab.
2. Collapse/expand must work with zero shortcuts and after browser restart.
3. Edge settings glyph should look native/readable in both themes.

Do not start broad feature work until these P0 paths are confirmed or repaired.
