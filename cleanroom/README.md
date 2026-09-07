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