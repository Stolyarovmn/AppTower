const COLLAPSE_MARKER_KEY = "atnCollapseHandoffWindowsV1";

function nativeSidePanelAvailable() {
  try {
    return Boolean(chrome?.sidePanel?.open && chrome.runtime.getManifest()?.permissions?.includes("sidePanel"));
  } catch {
    return false;
  }
}

async function enableNativeActionOpen() {
  if (!nativeSidePanelAvailable() || !chrome.sidePanel?.setPanelBehavior) return;
  try {
    await chrome.sidePanel.setPanelBehavior({openPanelOnActionClick:true});
  } catch {}
}

function reinforceNativeActionOpen() {
  void enableNativeActionOpen();
  setTimeout(enableNativeActionOpen, 60);
  setTimeout(enableNativeActionOpen, 250);
  setTimeout(enableNativeActionOpen, 800);
}

async function activeTab(windowId) {
  if (!Number.isInteger(Number(windowId))) return null;
  try {
    const [tab] = await chrome.tabs.query({active:true,windowId:Number(windowId)});
    return Number.isInteger(tab?.id) ? tab : null;
  } catch {
    return null;
  }
}

async function showCompactRail(windowId) {
  const tab = await activeTab(windowId);
  if (!Number.isInteger(tab?.id) || !/^https?:\/\//i.test(String(tab.url || ""))) return false;
  try {
    const response = await chrome.tabs.sendMessage(tab.id, {
      type:"ATN_SET_RAIL_VISIBLE",
      visible:true,
      reason:"manual-gate-collapse-handoff"
    });
    return response?.ok === true;
  } catch {
    return false;
  }
}

async function rememberCollapse(windowId) {
  const id = Number(windowId);
  if (!Number.isInteger(id)) return;
  try {
    const data = await chrome.storage.session.get(COLLAPSE_MARKER_KEY);
    const ids = new Set((data[COLLAPSE_MARKER_KEY] || []).map(Number).filter(Number.isInteger));
    ids.add(id);
    await chrome.storage.session.set({[COLLAPSE_MARKER_KEY]:[...ids]});
  } catch {}
}

async function consumeCollapse(windowId) {
  const id = Number(windowId);
  if (!Number.isInteger(id)) return false;
  try {
    const data = await chrome.storage.session.get(COLLAPSE_MARKER_KEY);
    const ids = new Set((data[COLLAPSE_MARKER_KEY] || []).map(Number).filter(Number.isInteger));
    if (!ids.delete(id)) return false;
    if (ids.size) await chrome.storage.session.set({[COLLAPSE_MARKER_KEY]:[...ids]});
    else await chrome.storage.session.remove(COLLAPSE_MARKER_KEY);
    return true;
  } catch {
    return false;
  }
}

reinforceNativeActionOpen();
chrome.runtime.onInstalled?.addListener?.(reinforceNativeActionOpen);
chrome.runtime.onStartup?.addListener?.(reinforceNativeActionOpen);

chrome.runtime.onMessage.addListener((message,sender) => {
  if (!message || typeof message !== "object") return false;

  if (message.type === "OPEN_PANEL" && message.intent !== "settings" && Number.isInteger(sender?.tab?.id)) {
    try { chrome.sidePanel?.open?.({tabId:sender.tab.id})?.catch?.(() => {}); } catch {}
    return false;
  }

  if (message.type === "COLLAPSE_PANEL") {
    const windowId = Number(message.windowId);
    if (!Number.isInteger(windowId)) return false;
    void rememberCollapse(windowId);
    void showCompactRail(windowId);
    setTimeout(() => { void showCompactRail(windowId); }, 120);
    setTimeout(() => { void showCompactRail(windowId); }, 420);
  }
  return false;
});

chrome.sidePanel?.onClosed?.addListener?.(({windowId}) => {
  void (async () => {
    if (!await consumeCollapse(windowId)) return;
    await showCompactRail(windowId);
    setTimeout(() => { void showCompactRail(windowId); }, 180);
  })();
});
