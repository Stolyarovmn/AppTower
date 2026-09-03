# 09 — Acceptance criteria

These are product criteria, not just unit-test checks.

## P0 lifecycle

### Expand with empty workspace
Given:
- zero shortcuts
- collapsed App Tower rail visible

When:
- user clicks expand

Then:
- native Side Panel opens on Edge/Chrome
- onboarding is visible
- collapsed rail disappears
- no second rail remains outside the open Side Panel

Repeat after full browser restart.

### Collapse
Given open Side Panel:
- clicking App Tower collapse control must hide the Side Panel
- collapsed rail must become visible on the current normal web page
- next expand click must reopen the Side Panel
- repeat 5 cycles without requiring extension reload

### Global disable
- collapsed rail X disables App Tower across windows
- state survives restart
- extension toolbar action re-enables it
- re-enabled rails appear in existing normal pages without needing arbitrary
  state corruption/reinstall

## P0 current page capture

Empty onboarding behind a normal web tab:
- `Добавить текущую страницу` opens a prefilled form
- URL is the normal web tab behind Side Panel
- title is useful, not empty

Non-empty pane:
- pane quick-bookmark uses that pane URL/title
- navigating inside an ordinary framed page updates the candidate URL/title

Ambiguous split:
- source can be explicitly switched Upper / Lower / Browser tab

## Pane independence

With two sites loaded:
- navigate/reload bottom
- top iframe must not reload
- modify shortcut/group/workspace metadata
- neither visible pane should reload unless renderer source actually changed
- observe at least 10 minutes without spontaneous simultaneous reload

## Search

- mouse hover does not destroy/recreate result before click
- click activates result
- Up/Down changes selection
- Enter activates
- Esc closes
- visible Close button closes
- Add current page command opens populated add dialog when a web source exists

## Shortcuts and scrolling

With more shortcuts than rail height:
- wheel works
- touchpad works
- touch drag scrolling works
- Up arrow appears only when items exist above viewport
- Down arrow appears only when items exist below viewport
- arrows disappear/disable at boundaries

## Groups

- create named empty group
- initials are correct
- drag site into group
- site disappears from root and appears in group
- open a contained site in top or bottom pane from group actions
- ungroup restores items
- nested groups are rejected

## Templates

- site -> site center drop opens Template/Group choice
- selecting Template opens editor only once
- Save creates one template
- one click opens split, TOP in upper pane and BOTTOM in lower
- composite icon TOP is visually above
- overlap 20–80% persists
- swap TOP/BOTTOM updates both display and opening order
- decompose restores sites

## Recent

- opening App Tower sites records entries
- ordinary in-pane navigation records meaningful current URLs
- Options shows recent items across workspaces as designed
- Open from Recent opens/reveals App Tower and target site

## Resource management

Default:
- inactive visible/parked web resource sleeps after 5 minutes
- hidden pane releases immediately when policy requires
- live count never intentionally exceeds configured cap (max 6)
- Never sleep bypasses 5-minute idle timer but not hard cap
- worker suspension/restart does not reset all lease timestamps

## Notifications

With optional contentSettings permission granted:
- Allow one origin
- Block second origin
- return first to Default
- second origin remains Blocked

## Options

- gear opens Options
- contextual Site settings opens/focuses Sites and highlights matching origin
- Open App Tower from Options works via user gesture
- light/dark/system theme changes Options and App Tower UI consistently

## Cross-browser

Edge and Chrome:
- native Side Panel path

Yandex fallback:
- package installs without sidePanel manifest dependency
- managed sidecar opens and remains functional
- do not claim full parity without testing
