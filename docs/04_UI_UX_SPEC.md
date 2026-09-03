# 04 — UI / UX specification

## Visual principle

App Tower should look like it belongs to the host browser, without claiming
custom HTML is browser-native.

- Edge: Fluent-like density/geometry; use system Fluent glyphs where reliable.
- Chrome: Chromium/Material-like geometry.
- Yandex fallback: neutral Chromium/Yandex-like skin.
- Shared actions should use the same icon geometry in collapsed rail, expanded
  rail and New Tab.
- Extension icon must have a transparent background and remain readable in both
  light and dark browser chrome.

## Expanded Side Panel

Order:

```text
browser-owned Side Panel title bar
App Tower workspace row
┌─ top pane toolbar
│  top content
├─ split divider (when split)
├─ bottom pane toolbar
│  bottom content
└─ right App Tower rail
```

Workspace row:

- Workspace selector
- split/single control
- collapse chevron

Pane toolbar expected actions:

- active pane indicator
- URL
- navigate/go
- reload
- A/S/C/R mode
- quick bookmark/add current pane
- open externally
- focus/single-pane control as applicable

Changing the lower pane must not reload the upper pane and vice versa.

## Expanded right rail

Top:
- collapse/expand control as appropriate

Middle:
- scroll controls only when overflow actually exists
- site/group/template icons
- separator
- Add
- Groups/Templates organizer

Bottom:
- Media indicator when relevant
- Search magnifier
- Settings gear

## Collapsed rail

Top:
- global X (disable App Tower)
- expand chevron
- separator

Middle:
- overflow up arrow when content exists above viewport
- shortcuts
- overflow down arrow when content exists below viewport
- separator
- Add
- Groups/Templates

Bottom:
- Search
- Settings

The collapsed rail must reserve/handle layout consistently and must not coexist
with the open native Side Panel in the same window.

## Scrolling

Shortcut area:
- mouse wheel
- touchpad
- finger touch scrolling
- pen
- up/down buttons when overflow exists
- drag auto-scroll near top/bottom edges

Do not show disabled/irrelevant overflow arrows when all shortcuts fit.

## Drag/drop

Use Pointer Events. Prevent native favicon/image drag.

Desktop:
- pointer down + move begins drag

Touch/pen:
- short hold before drag so normal finger scrolling remains possible

Drop zones on a shortcut:

```text
top quarter       -> reorder before
center            -> combine / add to group
bottom quarter    -> reorder after
```

Dropping:
- site on group -> add directly
- site on site -> ask Template or Group
- do not create nested groups
- do not create template-of-template/group combinations

## Group icon

- 1–2 initials
- readable at rail size
- name editable
- group context menu must include useful open actions, not only settings

## Template icon

Two favicon tiles with configurable overlap.
TOP tile has higher z-order and corresponds to the upper pane.

## Theme

Theme:
- System
- Light
- Dark

Accent:
- System
- Custom

System theme updates live with `prefers-color-scheme`.
System accent uses CSS `AccentColor` when available; otherwise fallback accent.

## Options

Left navigation should be visually substantial enough to resemble browser
settings: consistent SVG/glyph size, hit target and spacing. Avoid tiny Unicode
symbols.

Contextual `Site settings...` should route/focus Options at that site.
