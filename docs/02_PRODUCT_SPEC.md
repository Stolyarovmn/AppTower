# 02 — Product specification

## Product statement

App Tower is a persistent browser workspace layer for quickly opening,
organizing and operating web applications/sites beside the current browser tab.

It is not intended to become a replacement browser. It provides a stable
right-side workspace with controlled web surfaces and service-specific adapters
only when needed.

## Core entities

### Site shortcut

Fields conceptually include:

- id
- title
- URL
- default renderer mode: Auto / Secure / Compatibility / Real Page
- compatibility domains
- optional per-site settings

### Group

A named container of shortcuts/templates.

Visual rule:

- group icon shows 1–2 initials derived from its name
- examples: `Работа -> РА`, `AI -> AI`, `Я -> Я`
- no nested groups for now
- groups may contain sites and templates

### Two-pane template

Stores exactly two site shortcuts:

```text
Template
├── TOP    -> upper pane
└── BOTTOM -> lower pane
```

Rules:

- one click opens split view
- dragged/source shortcut becomes TOP by default
- TOP favicon visually overlaps above BOTTOM favicon
- overlap default: 50%
- adjustable range: 20–80%
- user can swap TOP/BOTTOM
- template can be decomposed back to two normal shortcuts

### Workspace

Owns:

- shortcut tree
- upper/lower pane state
- split state and ratio
- active pane

The user's browser window is bound to an App Tower workspace for the session.
Do not assume access to Edge/Chrome native Workspace identity.

## Pane modes

`Auto` is canonical and is what manually typed URLs start with.

- **A — Auto**: module -> PWA preference -> ordinary compatibility renderer.
- **S — Secure**: least invasive normal web framing path.
- **C — Compatibility**: scoped header removal / compatibility behavior.
- **R — Real Page**: top-level sidecar/app window, not iframe.

Persist explicit user overrides. Do not silently turn an explicitly selected
mode into another stored mode.

## Empty state

Fresh install/reset:

- no default site shortcuts
- Home/onboarding is authoritative
- actions:
  - Add current page
  - Add arbitrary site
  - Import settings
  - Browser Sync toggle

The collapsed rail must still expand even when the shortcut list is empty.

## Add current page

Expected source priority depends on context:

1. explicit pane source if user clicked that pane's bookmark action
2. currently/factually focused App Tower pane
3. last interacted pane
4. App Tower active pane
5. another non-empty pane
6. active normal HTTP(S) browser tab
7. most recently accessed normal web tab in the same window
8. blank form only if no web source exists

The dialog must show/allow source switching when ambiguity exists.

## Search

Search is a command palette, not a filter-only popup.

Searches:

- sites
- groups
- templates
- workspaces
- Recent
- App Tower commands

Keyboard:

- Ctrl+Shift+Space / Command+Shift+Space
- Up/Down changes selection
- Enter activates
- Esc closes
- mouse click must activate without DOM being recreated between hover/click

## Recent

Separate from the persistent rail.

Record meaningful App Tower opens/navigations, including in-pane navigation.
Options can show all workspaces; in-panel search prioritizes current workspace.

## Resource policy

- idle web/media pane unload after 5 minutes
- hidden pane can release immediately
- per-site "Never sleep" bypasses idle timer
- global configured hard cap is 1–6, default 6
- hard cap wins over Never sleep/media keepalive when required to honor the cap
- resource bookkeeping should survive MV3 service-worker suspension via
  `chrome.storage.session`

## Settings/control plane

Use an extension Options Page with a browser-settings-like left navigation.
Do not attempt unsupported injection into `edge://settings` or
`chrome://settings`.

Sections:

- General
- Appearance
- Workspaces
- Shortcuts
- Recent
- Sites
- Notifications
- Performance
- Modules
- Web Apps
- Sidecars
- Media
- Permissions
- Sync and data
