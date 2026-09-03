# AGENTS.md — App Tower

These rules are mandatory for Codex or any coding agent working in this repo.

## Read before editing

1. `docs/01_PROJECT_STATUS.md`
2. `docs/02_PRODUCT_SPEC.md`
3. `docs/03_ARCHITECTURE.md`
4. `docs/09_ACCEPTANCE_CRITERIA.md`
5. `docs/10_KNOWN_ISSUES.md`
6. `docs/11_DECISIONS.md`

Treat `archive/releases/` as immutable history. Product code is under `app/`.
The Yandex/Chromium fallback is generated/maintained under
`variants/yandex-sidecar/`.

## Non-negotiable product decisions

- No default shortcuts on a fresh install.
- `Auto` is the canonical/default pane mode.
- Top and bottom panes are independent. A change in one pane must not reload
  the other pane unless a documented renderer migration requires it.
- Native browser Side Panel is preferred on Edge/Chrome. Browser-specific calls
  go through `shared/browser-adapter.js`.
- `sidePanel.open()` must remain in a direct user-gesture path. Do not insert
  asynchronous work before the open call when the browser requires activation.
- When browser `sidePanel.onOpened/onClosed` exists, browser events are the
  authority for visible/collapsed state. A runtime Port disconnect is not proof
  that the Side Panel closed.
- The collapsed rail must be available with zero shortcuts.
- Global X disables App Tower across windows and persists. Toolbar action
  re-enables it.
- Groups and two-pane templates are first-class shortcut entities.
- Pointer/touch drag must suppress native image/favicon drag.
- Template icon overlap defaults to 50%; the TOP site is visually above and
  opens in the upper pane.
- Search icon is at the bottom of the rail.
- Idle web panes sleep after 5 minutes; the configurable hard cap is at most 6
  live web/media pane resources.
- Optional service integrations belong in declarative modules, not hard-coded
  provider logic in the core.
- Imported module manifests must remain data-only. Do not add remote executable
  JS/WASM support.
- Do not depend on deprecated Edge PWA sidebar integration.
- PWA detection uses the standard Web App Manifest; top-level sidecar is the
  non-iframe mode.
- Do not promise iframe compatibility for sites that actively block embedding,
  anti-bot, DRM, OAuth or related flows.
- Native browser internal settings pages cannot be modified. Use Options Page.
- Never add or distribute private signing keys.

## Release discipline

For every user-visible release:

1. Bump `app/manifest.json` version.
2. Update migration/schema when persistent state semantics change.
3. Update `app/README.md` and the handoff status/changelog if present.
4. Keep Edge/Chrome and Yandex fallback variant consistent.
5. Run `node tools/validate.mjs`.
6. Run `python tools/package.py`.
7. Inspect generated ZIP contents.
8. Never state that Edge runtime behavior is confirmed unless it was actually
   tested in Edge. Use "implemented; awaiting live verification" when applicable.
9. Deliver a **full replacement ZIP**, not a patch archive.

## Bug-fix method

Do not stack speculative fixes. For lifecycle/reload bugs instrument timestamps
for:
- UI click
- background message
- sidePanel open/close event
- Port connect/disconnect
- workspace write/change notification
- iframe renderer/source change
- resource lease sleep/wake

For a regression, identify the owning subsystem and add a static/unit regression
check where possible.

## Style

- MV3, no framework unless explicitly approved.
- Prefer small pure helpers in `shared/`.
- Keep provider-specific match/renderer rules in `modules/`.
- Use browser-native APIs where possible; inside extension HTML use a browser
  skin rather than pretending custom HTML is truly native.
- UI text is currently primarily Russian.
