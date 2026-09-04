from pathlib import Path

path = Path("app/background.js")
text = path.read_text(encoding="utf-8")


def replace_once(old: str, new: str, label: str):
    global text
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one block, found {count}")
    text = text.replace(old, new, 1)
    print(f"replaced {label}")


replace_once(
'import { createPanelStateStore } from "./shared/panel-state-store.js";\n',
'import { createPanelStateStore } from "./shared/panel-state-store.js";\nimport { createPanelLifecycleController } from "./shared/panel-lifecycle-controller.js";\n',
"panel lifecycle import",
)

replace_once(
'''const panelDisconnectTimers = new Map();
const panelClosedAt = new Map();
''',
'''const panelDisconnectTimers = new Map();
let panelLifecycleController = null;
''',
"lifecycle state declaration",
)

replace_once(
'''  broadcastRail:async (windowId,visible) => { broadcastRail(windowId,visible); },
  clearWindowResources
});
''',
'''  broadcastRail:async (windowId,visible) => { broadcastRail(windowId,visible); },
  clearWindowResources,
  cancelPendingDisconnect:windowId => panelLifecycleController?.cancelPendingDisconnect(windowId)
});
''',
"store disconnect cancellation hook",
)

replace_once(
'''const hasNativePanelClosedEvent = Boolean(
  browserCapabilities().nativeSidePanel && chrome.sidePanel?.onClosed?.addListener
);

if (hasNativePanelOpenedEvent) {
''',
'''const hasNativePanelClosedEvent = Boolean(
  browserCapabilities().nativeSidePanel && chrome.sidePanel?.onClosed?.addListener
);
panelLifecycleController = createPanelLifecycleController({
  panelStateStore,
  panelPorts,
  disconnectTimers:panelDisconnectTimers,
  hasNativePanelClosedEvent
});

if (hasNativePanelOpenedEvent) {
''',
"controller construction",
)

replace_once(
'''    const pending = panelDisconnectTimers.get(windowId);
    if (pending) {
      clearTimeout(pending);
      panelDisconnectTimers.delete(windowId);
    }

    addPort(panelPorts, windowId, port);

    // A live Side Panel document is also useful to recover from stale
    // collapsed state left by an older build/reload. Right after an actual
    // browser close we keep a short cooldown so a dying document cannot reopen
    // the rail state by reconnecting.
    if (hasNativePanelClosedEvent) {
      const closedAgo = Date.now() - Number(panelClosedAt.get(windowId) || 0);
      if (closedAgo > 1200) void markPanelOpen(windowId,{authoritative:true}).catch(() => {});
    } else if (!collapsedWindows.has(windowId)) {
      void markPanelOpen(windowId).catch(() => {});
    }

    port.onDisconnect.addListener(() => {
      // Edge/Chrome with onClosed: never infer panel visibility from a Port.
      // MV3 workers and extension documents can reconnect while the native
      // Side Panel is still plainly visible.
      if (hasNativePanelClosedEvent) return;

      // Legacy/fallback Chromium: wait for a reconnect before declaring the
      // container closed. This also covers our sidecar fallback.
      const oldTimer = panelDisconnectTimers.get(windowId);
      if (oldTimer) clearTimeout(oldTimer);
      const timer = setTimeout(() => {
        panelDisconnectTimers.delete(windowId);
        if (!panelPorts.get(windowId)?.size) {
          void markPanelClosed(windowId, { collapsed:true }).catch(() => {});
        }
      }, 900);
      panelDisconnectTimers.set(windowId, timer);
    });
''',
'''    addPort(panelPorts, windowId, port);
    void panelLifecycleController.connected(windowId).catch(() => {});

    port.onDisconnect.addListener(() => {
      panelLifecycleController.disconnected(windowId);
    });
''',
"live port lifecycle routing",
)

replace_once(
'''function markPanelOpen(windowId, { authoritative=false } = {}) {
  if (!Number.isInteger(Number(windowId))) return Promise.resolve({changed:false,reason:"invalid-window"});
  if (authoritative) panelClosedAt.delete(Number(windowId));

  const pending = panelDisconnectTimers.get(Number(windowId));
  if (pending) {
    clearTimeout(pending);
    panelDisconnectTimers.delete(Number(windowId));
  }

  return Promise.all([panelSessionReady,collapsedSessionReady]).then(() =>
    panelStateStore.open(Number(windowId),{authoritative})
  );
}

function markPanelClosed(windowId, { collapsed=true } = {}) {
  if (!Number.isInteger(Number(windowId))) return Promise.resolve({changed:false,reason:"invalid-window"});
  panelClosedAt.set(Number(windowId),Date.now());
  const pending = panelDisconnectTimers.get(Number(windowId));
  if (pending) {
    clearTimeout(pending);
    panelDisconnectTimers.delete(Number(windowId));
  }

  return Promise.all([panelSessionReady,collapsedSessionReady]).then(() =>
    panelStateStore.close(Number(windowId),{collapsed})
  );
}
''',
'''function markPanelOpen(windowId, { authoritative=false } = {}) {
  if (!Number.isInteger(Number(windowId))) return Promise.resolve({changed:false,reason:"invalid-window"});
  return Promise.all([panelSessionReady,collapsedSessionReady]).then(() =>
    panelStateStore.open(Number(windowId),{authoritative})
  );
}

function markPanelClosed(windowId, { collapsed=true } = {}) {
  if (!Number.isInteger(Number(windowId))) return Promise.resolve({changed:false,reason:"invalid-window"});
  return Promise.all([panelSessionReady,collapsedSessionReady]).then(() =>
    panelStateStore.close(Number(windowId),{collapsed})
  );
}
''',
"mark open close timer routing",
)

replace_once(
'''  panelPorts.delete(windowId);
  panelClosedAt.delete(windowId);
  const disconnectTimer = panelDisconnectTimers.get(windowId);
  if (disconnectTimer) clearTimeout(disconnectTimer);
  panelDisconnectTimers.delete(windowId);

  void (async () => {
    await Promise.all([panelSessionReady,collapsedSessionReady]);
    await panelStateStore.removeWindow(windowId);
''',
'''  panelPorts.delete(windowId);

  void (async () => {
    await Promise.all([panelSessionReady,collapsedSessionReady]);
    await panelLifecycleController.removed(windowId);
''',
"window removal lifecycle routing",
)

if "panelClosedAt" in text:
    raise RuntimeError("legacy panelClosedAt state still remains")
if "const oldTimer = panelDisconnectTimers.get(windowId)" in text:
    raise RuntimeError("legacy disconnect timer routing still remains")
if "panelStateStore.removeWindow(windowId)" in text:
    raise RuntimeError("window removal still bypasses lifecycle controller")

path.write_text(text, encoding="utf-8")

unit = Path("tests/unit/background-panel-lifecycle-wiring.test.mjs")
unit.write_text('''import test from "node:test";\nimport assert from "node:assert/strict";\nimport fs from "node:fs";\nimport path from "node:path";\n\nconst root = path.resolve(import.meta.dirname,"../..");\nconst source = fs.readFileSync(path.join(root,"app/background.js"),"utf8");\n\ntest("background routes Side Panel port lifecycle through the shared lifecycle controller", () => {\n  assert.match(source,/createPanelLifecycleController/);\n  assert.match(source,/panelLifecycleController\\.connected\\(windowId\\)/);\n  assert.match(source,/panelLifecycleController\\.disconnected\\(windowId\\)/);\n  assert.match(source,/panelLifecycleController\\.removed\\(windowId\\)/);\n  assert.doesNotMatch(source,/panelClosedAt/);\n  assert.doesNotMatch(source,/const oldTimer = panelDisconnectTimers\\.get\\(windowId\\)/);\n  assert.doesNotMatch(source,/panelStateStore\\.removeWindow\\(windowId\\)/);\n});\n''', encoding="utf-8")
print("TASK2 panel lifecycle wiring prepared")
