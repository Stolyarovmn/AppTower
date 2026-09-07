# AppTower Cleanroom v2

This directory is a from-scratch implementation.

Rules:
- no JavaScript/CSS/HTML is copied from legacy `app/`;
- the extension is loaded from `cleanroom/` only;
- manifest has no fixed `key`, so a clean unpacked install in a new folder gets a different extension identity and cannot inherit legacy extension storage;
- lifecycle is window-scoped only; `chrome.sidePanel.setOptions({tabId: ...})` and `chrome.sidePanel.open({tabId: ...})` are forbidden;
- panel lifecycle has exactly one state machine per browser window: `unknown | collapsed | opening | expanded | closing`;
- rail visibility is derived from that state, not persisted independently;
- browser restart starts collapsed unless an already-live Side Panel reconnect proves it is expanded;
- Search/Add are commands, not panel lifecycle states;
- pane documents are never rebuilt because a normal browser tab changed;
- single-pane toolbar has no close X;
- active pane is indicated only by the vertical accent line; there is no dot/select button.

The first milestone intentionally contains only the lifecycle/UI vertical slice needed to prove the P0 behaviors before more legacy features are reimplemented.

## 2.0.1 — close reconciliation (based on bec410bd)

- Compact rail is visible only in `collapsed`, never in `closing`.
- Successful window-scoped `sidePanel.close()` completion reconciles a still
  `closing` state even when the advertised `onClosed` event is absent in the log.
  A port disconnect alone still does not prove closure.
- Browser close/open events remain active. An old close Promise cannot overwrite
  a subsequent `opening` or `expanded` state.
- Runtime regression tests execute background.js with controlled API events and
  promises: missing close event, close failure, Search delivery, event-before-Promise.
- Reference: https://developer.chrome.com/docs/extensions/reference/api/sidePanel#method-close
  documents Promise completion after closure. Edge runtime still requires validation.
- No legacy implementation was imported; package only this directory.

Run tests: `node --test tests/*.test.mjs` (Node 22+).
Update the existing unpacked Cleanroom directory and reload that extension.
Do not load an additional copy alongside the old one. Diagnostics must show 2.0.1.


## 2.0.2 — worker restart and rail delivery

- Reproduced 2.0.1 failure with surviving content scripts and an empty worker port
  registry: open left the rail visible, collapse hid it without restoring it.
- Lifecycle visibility now also reaches HTTP(S) tabs via tabs.sendMessage and
  records rail.visibility.ack with requested and reported visibility.
- A fresh worker queries runtime.getContexts for SIDE_PANEL before deciding an
  unknown window is collapsed. A user action supersedes an outstanding query.
- Surviving panel documents can reconnect to the fresh worker without reloading
  their UI or iframe contents. Restored pages request rail state on pageshow.
- Expand points left; Collapse points right.
- Diagnostics includes active Side Panel contexts. Self-test explicitly reports
  that it checks API capabilities, not actual lifecycle behavior.
- Regression tests use actual background.js and rail.js with API/DOM doubles.
  Live browser restart and Edge UI remain unverified in this environment.
