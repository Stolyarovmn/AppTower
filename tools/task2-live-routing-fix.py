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
'''  if (hasLivePanel(windowId) && postPanelAction(windowId,action)) {
    void markPanelOpen(windowId,{authoritative:true}).catch(() => {});
    await chrome.storage.local.set({[GLOBAL_ENABLED_KEY]:true});
    return;
  }
''',
'''  if (hasLivePanel(windowId)) {
    void markPanelOpen(windowId,{authoritative:true}).catch(() => {});
    await serializeStorageMutation("pending-panel-action",() =>
      chrome.storage.local.set({[GLOBAL_ENABLED_KEY]:true,pendingAction:action})
    );
    return;
  }
''',
"command live-panel action delivery",
)

replace_once(
'''    if (info.menuItemId === "atn-add" && action) {
      if (hasLivePanel(windowId) && postPanelAction(windowId,action)) {
        await openPromise.catch(() => {});
        return;
      }
      await serializeStorageMutation("pending-panel-action",() =>
        chrome.storage.local.set({pendingAction:action})
      );
      await openPromise;
      return;
    }
''',
'''    if (info.menuItemId === "atn-add" && action) {
      await serializeStorageMutation("pending-panel-action",() =>
        chrome.storage.local.set({pendingAction:action})
      );
      await openPromise;
      return;
    }
''',
"context-menu live-panel action delivery",
)

replace_once(
'''function postPanelAction(windowId, action) {
  if (!action || !Number.isInteger(Number(windowId))) return false;
  const ports = [...(panelPorts.get(Number(windowId)) || [])];
  if (!ports.length) return false;
  for (const port of ports) safePost(port,{type:"ATN_PANEL_ACTION",action});
  return true;
}
''',
'''',
"dead ATN_PANEL_ACTION sender",
)

if "ATN_PANEL_ACTION" in text or "postPanelAction(" in text:
    raise RuntimeError("dead live Port action path still remains")

path.write_text(text, encoding="utf-8")
print("TASK2 live action routing fixed")
