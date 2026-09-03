const FALLBACK_WINDOW_KEY = "atnTowerFallbackWindowsV1";
const DISABLED_SIDE_PANEL_TABS_KEY = "atnDisabledSidePanelTabsV1";

export function detectBrowser() {
  const ua = globalThis.navigator?.userAgent || "";
  if (/YaBrowser\//i.test(ua)) return {id:"yandex", style:"yandex", name:"Yandex Browser"};
  if (/Edg\//i.test(ua)) return {id:"edge", style:"fluent", name:"Microsoft Edge"};
  if (/Chrome\//i.test(ua)) return {id:"chrome", style:"chromium", name:"Google Chrome"};
  return {id:"chromium", style:"chromium", name:"Chromium"};
}

function sidePanelPermissionGrantedByManifest() {
  try {
    return (chrome.runtime.getManifest()?.permissions || []).includes("sidePanel");
  } catch {
    return false;
  }
}

export function browserCapabilities() {
  const browser = detectBrowser();
  const nativeSidePanel = sidePanelPermissionGrantedByManifest() && Boolean(globalThis.chrome?.sidePanel?.open);
  return {
    browser,
    nativeSidePanel,
    sidePanelClose:nativeSidePanel && Boolean(globalThis.chrome?.sidePanel?.close),
    optionsPage:Boolean(globalThis.chrome?.runtime?.openOptionsPage),
    contextMenus:Boolean(globalThis.chrome?.contextMenus),
    contentSettings:Boolean(globalThis.chrome?.contentSettings?.notifications),
    systemNotifications:Boolean(globalThis.chrome?.notifications),
    pwaSidecar:Boolean(globalThis.chrome?.windows?.create),
    nativeBrowserWorkspace:false,
    workspaceBinding:"browser-window"
  };
}

export function applyBrowserSkin(documentRef = document) {
  const browser = detectBrowser();
  documentRef.documentElement.dataset.browser = browser.id;
  documentRef.documentElement.dataset.uiStyle = browser.style;
  return browser;
}

export async function openTowerContainer(windowId, {intent=null, tabId=null} = {}) {
  const numericWindowId = Number(windowId);
  const numericTabId = Number(tabId);
  if (sidePanelPermissionGrantedByManifest() && chrome.sidePanel?.open && Number.isInteger(numericWindowId)) {
    if (Number.isInteger(numericTabId) && chrome.sidePanel?.setOptions) {
      // Do not await between these calls. sidePanel.open() must stay inside the
      // original user-gesture chain. Chromium queues setOptions before open.
      const enablePromise = chrome.sidePanel.setOptions({tabId:numericTabId,enabled:true});
      const openPromise = chrome.sidePanel.open({tabId:numericTabId});
      await Promise.all([enablePromise,openPromise]);
      forgetDisabledSidePanelTab(numericTabId).catch(()=>{});
      return {kind:"sidePanel", windowId:numericWindowId, tabId:numericTabId};
    }
    await chrome.sidePanel.open({windowId:numericWindowId});
    return {kind:"sidePanel", windowId:numericWindowId};
  }

  const hostWindowId = Number.isInteger(Number(windowId)) ? Number(windowId) : null;
  const raw = (await chrome.storage.session.get(FALLBACK_WINDOW_KEY))[FALLBACK_WINDOW_KEY] || {};
  const existingId = hostWindowId != null ? Number(raw[hostWindowId]) : NaN;
  if (Number.isInteger(existingId)) {
    try {
      await chrome.windows.update(existingId,{focused:true});
      return {kind:"sidecar", windowId:existingId, reused:true};
    } catch {}
  }

  let parent = null;
  if (hostWindowId != null) {
    try { parent = await chrome.windows.get(hostWindowId); } catch {}
  }
  if (!parent) {
    try { parent = await chrome.windows.getLastFocused(); } catch {}
  }

  const baseWidth = Number(parent?.width) || 1280;
  const baseHeight = Number(parent?.height) || 800;
  const width = Math.max(360, Math.min(560, Math.round(baseWidth * .32)));
  const height = Math.max(520, baseHeight - 16);
  const left = Number.isFinite(Number(parent?.left)) ? Math.round(Number(parent.left) + baseWidth - width - 8) : undefined;
  const top = Number.isFinite(Number(parent?.top)) ? Math.round(Number(parent.top) + 8) : undefined;

  const params = new URLSearchParams();
  params.set("sidecar","1");
  if (hostWindowId != null) params.set("hostWindowId",String(hostWindowId));
  if (intent) params.set("intent",String(intent));
  const url = chrome.runtime.getURL(`sidepanel/sidepanel.html?${params}`);

  const createData = {url,type:"popup",focused:true,width,height};
  if (Number.isInteger(left)) createData.left = left;
  if (Number.isInteger(top)) createData.top = top;
  const win = await chrome.windows.create(createData);
  if (!Number.isInteger(win?.id)) throw new Error("Could not create App Tower sidecar");

  if (hostWindowId != null) {
    raw[hostWindowId] = win.id;
    await chrome.storage.session.set({[FALLBACK_WINDOW_KEY]:raw});
  }
  return {kind:"sidecar",windowId:win.id,reused:false};
}

async function rememberDisabledSidePanelTab(tabId) {
  const data = await chrome.storage.session.get(DISABLED_SIDE_PANEL_TABS_KEY);
  const ids = new Set((data[DISABLED_SIDE_PANEL_TABS_KEY] || []).map(Number).filter(Number.isInteger));
  ids.add(Number(tabId));
  await chrome.storage.session.set({[DISABLED_SIDE_PANEL_TABS_KEY]:[...ids]});
}

async function forgetDisabledSidePanelTab(tabId) {
  const data = await chrome.storage.session.get(DISABLED_SIDE_PANEL_TABS_KEY);
  const ids = new Set((data[DISABLED_SIDE_PANEL_TABS_KEY] || []).map(Number).filter(Number.isInteger));
  if (!ids.delete(Number(tabId))) return;
  await chrome.storage.session.set({[DISABLED_SIDE_PANEL_TABS_KEY]:[...ids]});
}

async function disableNativeSidePanelForActiveTab(windowId) {
  if (!chrome.sidePanel?.setOptions) return null;
  const [tab] = await chrome.tabs.query({active:true,windowId});
  if (!Number.isInteger(tab?.id)) return null;
  await chrome.sidePanel.setOptions({tabId:tab.id,enabled:false});
  await rememberDisabledSidePanelTab(tab.id);
  return tab.id;
}

export async function repairNativeSidePanelOptions() {
  if (!sidePanelPermissionGrantedByManifest() || !chrome.sidePanel?.getOptions || !chrome.sidePanel?.setOptions) {
    return {repaired:0};
  }
  let repaired=0;
  let tabs=[];
  try { tabs=await chrome.tabs.query({}); } catch { return {repaired}; }
  for (const tab of tabs) {
    if (!Number.isInteger(tab?.id)) continue;
    try {
      const options=await chrome.sidePanel.getOptions({tabId:tab.id});
      if (options?.enabled === false) {
        await chrome.sidePanel.setOptions({tabId:tab.id,enabled:true});
        repaired++;
      }
    } catch {}
  }
  try { await chrome.storage.session.remove(DISABLED_SIDE_PANEL_TABS_KEY); } catch {}
  return {repaired};
}

export async function closeTowerContainer(windowId) {
  const id = Number(windowId);
  const native = sidePanelPermissionGrantedByManifest() && Number.isInteger(id);

  if (native) {
    // Chrome 141+ exposes close(). Modern Edge builds may expose it too. Use
    // the real close operation first; unlike the old v0.8.4 toggle workaround
    // it cannot hide and immediately re-show the same panel.
    if (chrome.sidePanel?.close) {
      try {
        await chrome.sidePanel.close({windowId:id});
        return {kind:"sidePanel",method:"close"};
      } catch {}
    }

    // Compatibility fallback for Edge builds where close() isn't implemented:
    // disable the active tab and KEEP it disabled. The next explicit App Tower
    // open re-enables it in the same user-gesture chain.
    try {
      const tabId=await disableNativeSidePanelForActiveTab(id);
      if (Number.isInteger(tabId)) return {kind:"sidePanel",method:"tab-disable",tabId};
    } catch {}
  }

  const raw = (await chrome.storage.session.get(FALLBACK_WINDOW_KEY))[FALLBACK_WINDOW_KEY] || {};
  const fallbackId = Number(raw[id]);
  if (Number.isInteger(fallbackId)) {
    try { await chrome.windows.remove(fallbackId); } catch {}
    delete raw[id];
    await chrome.storage.session.set({[FALLBACK_WINDOW_KEY]:raw});
  }
  return {kind:"sidecar"};
}

export async function openOptions() {
  if (chrome.runtime?.openOptionsPage) return chrome.runtime.openOptionsPage();
  return chrome.tabs.create({url:chrome.runtime.getURL("options/options.html")});
}
