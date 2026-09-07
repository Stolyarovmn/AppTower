const FALLBACK_WINDOW_KEY = "atnTowerFallbackWindowsV1";
const NATIVE_SIDE_PANEL_DISABLED_KEY = "atnNativeSidePanelDisabledV2";
const LEGACY_DISABLED_SIDE_PANEL_TABS_KEY = "atnDisabledSidePanelTabsV1";

// Native chrome.sidePanel pages do not get our sidecar hostWindowId query
// parameter. Put an explicitly non-numeric sentinel into native side-panel
// URLs so sidepanel.js resolves the real current browser window.
if (typeof document !== "undefined" && typeof history !== "undefined") {
  try {
    const url = new URL(location.href);
    if (url.pathname.endsWith("/sidepanel/sidepanel.html") && !url.searchParams.has("hostWindowId")) {
      url.searchParams.set("hostWindowId", "current");
      history.replaceState(history.state, "", url);
    }
  } catch {}
}

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

function installFloatingSurfaceGuard(documentRef) {
  const install = () => {
    const view = documentRef?.defaultView;
    const menu = documentRef?.getElementById?.("shortcut-menu");
    if (!view || !menu || menu.dataset.atnSurfaceGuard === "1") return false;
    menu.dataset.atnSurfaceGuard = "1";

    let frame = 0;
    const clamp = () => {
      frame = 0;
      if (!menu.isConnected || menu.classList.contains("hidden")) return;
      const style = view.getComputedStyle(documentRef.documentElement);
      const parsedGutter = Number.parseFloat(style.getPropertyValue("--atn-surface-gutter"));
      const gutter = Number.isFinite(parsedGutter) ? Math.max(0,parsedGutter) : 8;
      const rect = menu.getBoundingClientRect();
      const maxLeft = Math.max(gutter, view.innerWidth - rect.width - gutter);
      const maxTop = Math.max(gutter, view.innerHeight - rect.height - gutter);
      const left = Math.max(gutter, Math.min(rect.left,maxLeft));
      const top = Math.max(gutter, Math.min(rect.top,maxTop));
      if (Math.abs(rect.left-left) > .5) menu.style.left = `${Math.round(left)}px`;
      if (Math.abs(rect.top-top) > .5) menu.style.top = `${Math.round(top)}px`;
    };
    const schedule = () => {
      if (frame) return;
      if (typeof view.requestAnimationFrame === "function") frame = view.requestAnimationFrame(clamp);
      else view.setTimeout(clamp,0);
    };
    const Observer = view.MutationObserver;
    if (Observer) {
      const observer = new Observer(schedule);
      observer.observe(menu,{attributes:true,attributeFilter:["class"],childList:true});
    }
    view.addEventListener?.("resize",schedule,{passive:true});
    return true;
  };
  if (install()) return;
  if (documentRef?.readyState === "loading") documentRef.addEventListener?.("DOMContentLoaded",install,{once:true});
}

export function applyBrowserSkin(documentRef = document) {
  const browser = detectBrowser();
  documentRef.documentElement.dataset.browser = browser.id;
  documentRef.documentElement.dataset.uiStyle = browser.style;
  installFloatingSurfaceGuard(documentRef);
  return browser;
}

async function nativePanelWasDisabled() {
  try {
    const data = await chrome.storage.session.get(NATIVE_SIDE_PANEL_DISABLED_KEY);
    return data[NATIVE_SIDE_PANEL_DISABLED_KEY] === true;
  } catch {
    return false;
  }
}

async function setNativePanelDisabled(value) {
  try {
    if (value) await chrome.storage.session.set({[NATIVE_SIDE_PANEL_DISABLED_KEY]:true});
    else await chrome.storage.session.remove(NATIVE_SIDE_PANEL_DISABLED_KEY);
  } catch {}
}

export async function openTowerContainer(windowId, {intent=null} = {}) {
  const numericWindowId = Number(windowId);
  if (sidePanelPermissionGrantedByManifest() && chrome.sidePanel?.open && Number.isInteger(numericWindowId)) {
    // Never use tabId here. A tab-scoped open makes Edge swap/recreate the
    // Side Panel document when the active browser tab changes, which reloads
    // every iframe inside App Tower. The panel is a browser-window workspace.
    if (chrome.sidePanel?.setOptions && await nativePanelWasDisabled()) {
      // Keep both calls in the original user-gesture turn. The global enabled
      // flag is only a compatibility close fallback; it does not create any
      // per-tab Side Panel state.
      const enablePromise = chrome.sidePanel.setOptions({enabled:true});
      const openPromise = chrome.sidePanel.open({windowId:numericWindowId});
      await Promise.all([enablePromise,openPromise]);
      await setNativePanelDisabled(false);
      return {kind:"sidePanel", windowId:numericWindowId, restored:true};
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

export async function repairNativeSidePanelOptions() {
  if (!sidePanelPermissionGrantedByManifest() || !chrome.sidePanel?.setOptions) return {repaired:0};

  // Old builds created tab-specific enabled/disabled overrides. Do not scan or
  // rewrite tabs anymore: doing so is exactly what made Edge treat App Tower as
  // tab-scoped. Those overrides disappear with the browser session. We only
  // clear our legacy bookkeeping and restore the one global compatibility flag.
  let repaired=0;
  if (await nativePanelWasDisabled()) {
    try {
      await chrome.sidePanel.setOptions({enabled:true});
      repaired=1;
    } catch {}
    await setNativePanelDisabled(false);
  }
  try { await chrome.storage.session.remove(LEGACY_DISABLED_SIDE_PANEL_TABS_KEY); } catch {}
  return {repaired};
}

export async function closeTowerContainer(windowId) {
  const id = Number(windowId);
  const native = sidePanelPermissionGrantedByManifest() && Number.isInteger(id);

  if (native) {
    if (chrome.sidePanel?.close) {
      try {
        await chrome.sidePanel.close({windowId:id});
        return {kind:"sidePanel",method:"close"};
      } catch {}
    }

    // Edge versions without sidePanel.close need a compatibility close. The
    // old implementation disabled the active tab; reopening then became
    // tab-scoped and caused iframe reloads on every tab switch. Disable only
    // the extension's global Side Panel option instead, then reopen by window.
    if (chrome.sidePanel?.setOptions) {
      try {
        await chrome.sidePanel.setOptions({enabled:false});
        await setNativePanelDisabled(true);
        return {kind:"sidePanel",method:"global-disable"};
      } catch {}
    }
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
