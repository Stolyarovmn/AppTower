import { MODULE_STORAGE_KEY, loadInstalledModules, installBundledModule, resolveModuleRenderer, validateModuleManifest } from "./modules/module-registry.js";
import { browserCapabilities, openTowerContainer, closeTowerContainer, openOptions, repairNativeSidePanelOptions } from "./shared/browser-adapter.js";
import { WORKSPACES_KEY, DEFAULT_WORKSPACE_KEY, WINDOW_WORKSPACES_KEY, normalizeWorkspace, workspaceSummary } from "./shared/workspaces.js";
import { MEDIA_STATE_KEY, normalizeMediaState } from "./shared/media-contract.js";
import { createBackgroundStateCoordinator } from "./shared/background-state-coordinator.js";
import { createPanelStateStore } from "./shared/panel-state-store.js";
import { createPanelLifecycleController } from "./shared/panel-lifecycle-controller.js";
import {
  SHORTCUT_SITE, SHORTCUT_GROUP, SHORTCUT_TEMPLATE,
  normalizeShortcut, normalizeShortcutList, firstLaunchableSite,
  isSite, isGroup, isTemplate, cloneSite, clampOverlap
} from "./shared/shortcuts.js";

const RENDER_MODES = new Set(["auto", "secure", "compat", "real"]);
const SIDE_PANEL_PATH = "sidepanel/sidepanel.html";
const SESSION_RULE_BASE = 30000;
const PANEL_SESSION_KEY = "atnPanelOpenWindowsV025";
const COLLAPSED_SESSION_KEY = "atnCollapsedWindowsV037";
const GLOBAL_ENABLED_KEY = "atnEnabled";
const SYNC_ENABLED_KEY = "atnSyncEnabled";
const SYNC_PAYLOAD_KEY = "atnSyncPayload";
const SYNC_UPDATED_AT_KEY = "atnSyncUpdatedAt";
const PWA_CACHE_KEY = "atnPwaCacheV1";
const PWA_PREFS_KEY = "atnPwaPreferencesV1";
const PWA_SIDECARS_KEY = "atnPwaSidecarsV1";
const STATE_SCHEMA_VERSION = 15;
const RECENT_KEY = "atnRecentV1";
const SITE_SETTINGS_KEY = "atnSiteSettingsV1";
const PERFORMANCE_KEY = "atnPerformanceV1";
const RESOURCE_ALARM = "atn-resource-budget";
const RESOURCE_IDLE_MS = 5 * 60 * 1000;
const RESOURCE_MAX_LIVE = 6;
const RESOURCE_LEASES_KEY = "atnResourceLeasesV1";
const SIDECAR_REGISTRY_KEY = "atnSidecarRegistryV1";

const LEGACY_DEFAULT_SITES = [
  { id:"yandex-translate", title:"Яндекс Переводчик", url:"https://translate.yandex.ru/" },
  { id:"google", title:"Google", url:"https://www.google.com/" },
  { id:"github", title:"GitHub", url:"https://github.com/" },
  { id:"youtube", title:"YouTube", url:"https://www.youtube.com/" }
];
const LEGACY_DEFAULT_IDS = new Set(LEGACY_DEFAULT_SITES.map(site => site.id));

const EMPTY_PANE = { url:"", title:"", mode:"auto", compatDomains:[], sourceSiteId:null };
const DEFAULT_STATE = {
  sites: [],
  panes: { top:structuredClone(EMPTY_PANE), bottom:structuredClone(EMPTY_PANE) },
  layout: { split:false, ratio:0.58, activePane:"top" }
};

let globallyEnabled = true;
const globalEnabledReady = chrome.storage.local.get(GLOBAL_ENABLED_KEY).then(data => {
  globallyEnabled = data[GLOBAL_ENABLED_KEY] !== false;
}).catch(() => {
  globallyEnabled = true;
});

let syncEnabled = false;
let applyingRemoteSync = false;

const openWindows = new Set();
const collapsedWindows = new Set();
const collapsedSessionReady = chrome.storage.session.get(COLLAPSED_SESSION_KEY).then(data => {
  for (const value of data[COLLAPSED_SESSION_KEY] || []) {
    const id = Number(value);
    if (Number.isInteger(id)) collapsedWindows.add(id);
  }
}).catch(() => {});
// A side-panel document can remain alive for a short time while Chromium is
// closing it. Its runtime Port must not immediately mark the window open again.
const panelSessionReady = chrome.storage.session.get(PANEL_SESSION_KEY).then(data => {
  for (const value of data[PANEL_SESSION_KEY] || []) {
    const id = Number(value);
    if (Number.isInteger(id)) openWindows.add(id);
  }
}).catch(() => {});
const railPorts = new Map();
const panelPorts = new Map();
const panelDisconnectTimers = new Map();
let panelLifecycleController = null;

// All shared panel/workspace mutations pass through one FIFO coordinator.
// User-activation-sensitive browser APIs (sidePanel.open/close) are still
// started immediately by their callers; only our own state mutation/persist
// phases are serialized here.
const backgroundStateCoordinator = createBackgroundStateCoordinator();
const panelStateStore = createPanelStateStore({
  coordinator:backgroundStateCoordinator,
  openWindows,
  collapsedWindows,
  persistOpen:async () => {
    try { await chrome.storage.session.set({[PANEL_SESSION_KEY]:[...openWindows]}); } catch {}
  },
  persistCollapsed:async () => {
    try { await chrome.storage.session.set({[COLLAPSED_SESSION_KEY]:[...collapsedWindows]}); } catch {}
  },
  broadcastRail:async (windowId,visible) => { broadcastRail(windowId,visible); },
  clearWindowResources,
  cancelPendingDisconnect:windowId => panelLifecycleController?.cancelPendingDisconnect(windowId)
});

function serializeWorkspaceMutation(windowId, action, operation) {
  return backgroundStateCoordinator.workspace(windowId,action,operation);
}
function serializeWorkspaceRead(windowId, action, reader) {
  return backgroundStateCoordinator.workspaceRead(windowId,action,reader);
}
function serializeStorageMutation(action, operation) {
  return backgroundStateCoordinator.storage(action,operation);
}

const pwaSidecars = new Map();
const pwaSidecarsReady = chrome.storage.session.get(PWA_SIDECARS_KEY).then(data => {
  const raw = data[PWA_SIDECARS_KEY];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return;
  for (const [origin, windowId] of Object.entries(raw)) {
    const id = Number(windowId);
    if (safeOrigin(origin) && Number.isInteger(id)) pwaSidecars.set(origin, id);
  }
}).catch(() => {});

const pwaFetches = new Map();

chrome.runtime.onInstalled.addListener(() => {
  void serializeStorageMutation("initialize-install",() => initialize(true)).catch(() => {});
  void initializeNativeContextMenus();
  chrome.alarms?.create?.(RESOURCE_ALARM,{periodInMinutes:1});
});
chrome.runtime.onStartup.addListener(() => {
  // Static document_start content scripts are the primary path. This recovery
  // pass covers tabs restored before the MV3 worker finished waking up.
  void serializeStorageMutation("initialize-startup",() => initialize(true)).catch(() => {});
  void initializeNativeContextMenus();
  chrome.alarms?.create?.(RESOURCE_ALARM,{periodInMinutes:1});
});
chrome.alarms?.onAlarm?.addListener(alarm => {
  if (alarm?.name === RESOURCE_ALARM) void enforceResourceBudget();
});
chrome.commands?.onCommand?.addListener(async command => {
  if (command !== "open-search") return;
  let win = null;
  try { win = await chrome.windows.getLastFocused(); } catch {}
  const windowId = Number(win?.id);
  if (!Number.isInteger(windowId)) return;

  globallyEnabled = true;
  const action = panelActionFromMessage({intent:"search"},windowId);
  if (hasLivePanel(windowId)) {
    void markPanelOpen(windowId,{authoritative:true}).catch(() => {});
    await serializeStorageMutation("pending-panel-action",() =>
      chrome.storage.local.set({[GLOBAL_ENABLED_KEY]:true,pendingAction:action})
    );
    return;
  }

  // Keep sidePanel.open() in the command user-activation chain; persistence is
  // deliberately not awaited before starting the browser-owned open.
  const openPromise = openTowerContainer(windowId,{intent:"search"});
  void markPanelOpen(windowId,{authoritative:true}).catch(() => {});
  await chrome.storage.local.set({
    [GLOBAL_ENABLED_KEY]:true,
    pendingAction:action
  });

  try {
    await openPromise;
  } catch {
    await markPanelClosed(windowId,{collapsed:true}).catch(() => {});
  }
});
if (browserCapabilities().nativeSidePanel) {
  try { chrome.sidePanel?.setPanelBehavior?.({ openPanelOnActionClick:false })?.catch?.(() => {}); } catch {}
}

chrome.action.onClicked.addListener((tab) => {
  const windowId = tab?.windowId;
  globallyEnabled = true;
  chrome.storage.local.set({ [GLOBAL_ENABLED_KEY]: true }).catch(() => {});

  if (!Number.isInteger(windowId)) return;

  // The browser-action click is a direct user gesture, so open immediately.
  void markPanelOpen(windowId,{authoritative:true}).catch(() => {});
  openTowerContainer(windowId).catch(() => {
    void markPanelClosed(windowId,{collapsed:true}).catch(() => {});
  });
});

const hasNativePanelOpenedEvent = Boolean(
  browserCapabilities().nativeSidePanel && chrome.sidePanel?.onOpened?.addListener
);
const hasNativePanelClosedEvent = Boolean(
  browserCapabilities().nativeSidePanel && chrome.sidePanel?.onClosed?.addListener
);
panelLifecycleController = createPanelLifecycleController({
  panelStateStore,
  panelPorts,
  disconnectTimers:panelDisconnectTimers,
  hasNativePanelClosedEvent
});

if (hasNativePanelOpenedEvent) {
  chrome.sidePanel.onOpened.addListener(({path, windowId}) => {
    if (!Number.isInteger(windowId) || !matchesPanelPath(path)) return;
    // Browser event is authoritative: the panel is visibly open right now.
    void markPanelOpen(windowId, { authoritative:true }).catch(() => {});
  });
}
if (hasNativePanelClosedEvent) {
  chrome.sidePanel.onClosed.addListener(({path, windowId}) => {
    if (!Number.isInteger(windowId) || !matchesPanelPath(path)) return;
    // Browser event is authoritative: only now may the collapsed rail appear.
    void markPanelClosed(windowId, { collapsed:true }).catch(() => {});
  });
}

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "ATN_RAIL") {
    const windowId = port.sender?.tab?.windowId;
    if (!Number.isInteger(windowId)) return;
    addPort(railPorts, windowId, port);
    Promise.all([panelSessionReady, collapsedSessionReady, globalEnabledReady]).then(() => {
      safePost(port, {
        type:"ATN_RAIL_VISIBILITY",
        visible:globallyEnabled && !openWindows.has(windowId)
      });
    });
    return;
  }

  const match = /^ATN_SIDE_PANEL:(\d+)$/.exec(port.name || "");
  if (match) {
    const windowId = Number(match[1]);
    if (!Number.isInteger(windowId)) return;

    addPort(panelPorts, windowId, port);
    void panelLifecycleController.connected(windowId).catch(() => {});

    port.onDisconnect.addListener(() => {
      panelLifecycleController.disconnected(windowId);
    });
  }
});

function addPort(map, windowId, port) {
  let set = map.get(windowId);
  if (!set) { set = new Set(); map.set(windowId, set); }
  set.add(port);
  port.onDisconnect.addListener(() => {
    set.delete(port);
    if (!set.size) map.delete(windowId);
  });
}
function safePost(port, message) { try { port.postMessage(message); } catch {} }
function broadcastRail(windowId, visible) {
  const effectiveVisible = globallyEnabled && Boolean(visible);
  for (const port of railPorts.get(windowId) || []) {
    safePost(port, { type:"ATN_RAIL_VISIBILITY", visible:effectiveVisible });
  }
  chrome.tabs.query({ windowId }).then(tabs => Promise.allSettled(
    tabs
      .filter(t => Number.isInteger(t.id))
      .map(t => chrome.tabs.sendMessage(t.id, {
        type:"ATN_SET_RAIL_VISIBLE",
        visible:effectiveVisible
      }))
  )).catch(() => {});
}
function markPanelOpen(windowId, { authoritative=false } = {}) {
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

function panelActionFromMessage(message, windowId) {
  if (!["add","new-group","organize","group","combine","edit-template","search"].includes(message?.intent)) return null;
  return {
    intent:message.intent,
    groupId:message.groupId ? String(message.groupId) : null,
    sourceId:message.sourceId ? String(message.sourceId) : null,
    targetId:message.targetId ? String(message.targetId) : null,
    templateId:message.templateId ? String(message.templateId) : null,
    sourceUrl:normalizeUrl(message.sourceUrl) || null,
    sourceTitle:message.sourceTitle ? String(message.sourceTitle).slice(0,240) : null,
    windowId:Number.isInteger(Number(windowId)) ? Number(windowId) : null,
    nonce:Date.now()
  };
}

function hasLivePanel(windowId) {
  return Number.isInteger(Number(windowId)) && Boolean(panelPorts.get(Number(windowId))?.size);
}

function matchesPanelPath(path) {
  return !path || String(path).endsWith(SIDE_PANEL_PATH);
}

chrome.windows.onRemoved.addListener((windowId) => {
  railPorts.delete(windowId);
  panelPorts.delete(windowId);

  void (async () => {
    await Promise.all([panelSessionReady,collapsedSessionReady]);
    await panelLifecycleController.removed(windowId);

    let changed = false;
    for (const [origin, id] of pwaSidecars.entries()) {
      if (id === windowId) {
        pwaSidecars.delete(origin);
        changed = true;
      }
    }
    if (changed) persistPwaSidecars();
    await removeSidecar(windowId).catch(() => {});

    await serializeWorkspaceMutation(windowId,"remove-window-binding",async () => {
      const map = await windowWorkspaceMap();
      if (!map[windowId]) return;
      delete map[windowId];
      await chrome.storage.session.set({[WINDOW_WORKSPACES_KEY]:map});
    });
  })().catch(() => {});
});

chrome.contextMenus?.onClicked?.addListener(async (info, tab) => {
  const windowId = Number(tab?.windowId);
  try {
    if (info.menuItemId === "atn-options") return openOptions();
    if (!Number.isInteger(windowId)) return;

    globallyEnabled = true;
    let intent = null;
    if (info.menuItemId === "atn-add") intent = "add";
    const action = intent ? panelActionFromMessage({
      intent,
      sourceUrl:tab?.url,
      sourceTitle:tab?.title
    },windowId) : null;

    // Native context-menu handlers carry a user gesture. Start the browser
    // container operation before awaiting our own storage/state work.
    const alreadyLive = hasLivePanel(windowId);
    const openPromise = ["atn-open","atn-bottom","atn-add"].includes(info.menuItemId) && !alreadyLive
      ? openTowerContainer(windowId,{intent,tabId:tab?.id})
      : Promise.resolve();
    void markPanelOpen(windowId,{authoritative:true}).catch(() => {});
    await chrome.storage.local.set({[GLOBAL_ENABLED_KEY]:true});

    if (info.menuItemId === "atn-open") {
      await openPromise;
      return;
    }

    if (info.menuItemId === "atn-bottom" && info.linkUrl) {
      await serializeWorkspaceMutation(windowId,"context-open-bottom",async () => {
        const state = await getWindowWorkspaceState(windowId);
        const url = normalizeUrl(info.linkUrl);
        if (!url) return;
        state.workspace.panes.bottom = {
          url,title:url,mode:"auto",compatDomains:[],sourceSiteId:null
        };
        state.workspace.layout.split = true;
        state.workspace.layout.activePane = "bottom";
        await saveWindowWorkspaceState(windowId,{
          panes:state.workspace.panes,
          layout:state.workspace.layout
        });
        await recordRecent({
          windowId,
          workspaceId:state.workspace.id,
          url,
          title:url,
          kind:"site"
        });
        await syncCompatibilityRules(state.workspace.panes);
      });
      await openPromise;
      return;
    }

    if (info.menuItemId === "atn-add" && action) {
      await serializeStorageMutation("pending-panel-action",() =>
        chrome.storage.local.set({pendingAction:action})
      );
      await openPromise;
      return;
    }

    // A native context-menu item that did not result in an App Tower action
    // must not leave the rail hidden.
    await markPanelClosed(windowId,{collapsed:true});
  } catch {
    if (Number.isInteger(windowId)) await markPanelClosed(windowId,{collapsed:true}).catch(() => {});
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local") {
    if (changes[GLOBAL_ENABLED_KEY]) globallyEnabled = changes[GLOBAL_ENABLED_KEY].newValue !== false;
    if (changes[MODULE_STORAGE_KEY] || changes[PWA_PREFS_KEY] || changes[PWA_CACHE_KEY]) {
      void enforceResourceBudget();
    }
    if (changes[SYNC_ENABLED_KEY]) syncEnabled = changes[SYNC_ENABLED_KEY].newValue === true;
    if ((changes[WORKSPACES_KEY] || changes[MODULE_STORAGE_KEY]) && syncEnabled && !applyingRemoteSync) {
      void serializeStorageMutation("push-sync",() => pushSyncPayload()).catch(() => {});
    }
  }

  if (area === "sync" && changes[SYNC_PAYLOAD_KEY] && syncEnabled) {
    void serializeStorageMutation("apply-remote-sync",() =>
      applyRemoteSyncPayload(changes[SYNC_PAYLOAD_KEY].newValue)
    ).catch(() => {});
  }
});


const resourceLeases = new Map();
const resourceLeasesReady = chrome.storage.session.get(RESOURCE_LEASES_KEY).then(data => {
  const raw = data[RESOURCE_LEASES_KEY];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return;
  for (const [key, lease] of Object.entries(raw)) {
    if (!lease || typeof lease !== "object") continue;
    const windowId = Number(lease.windowId);
    const pane = lease.pane === "bottom" ? "bottom" : "top";
    const url = normalizeUrl(lease.url);
    if (!Number.isInteger(windowId) || !url) continue;
    resourceLeases.set(key,{
      windowId,pane,url,
      renderer:String(lease.renderer || "iframe"),
      keepAlive:lease.keepAlive === true,
      neverSleep:lease.neverSleep === true,
      lastActivity:Number(lease.lastActivity) || Date.now(),
      registeredAt:Number(lease.registeredAt) || Date.now()
    });
  }
}).catch(() => {});

function persistResourceLeases() {
  chrome.storage.session.set({
    [RESOURCE_LEASES_KEY]:Object.fromEntries(resourceLeases)
  }).catch(() => {});
}

async function performanceSettings() {
  const raw = (await chrome.storage.local.get(PERFORMANCE_KEY))[PERFORMANCE_KEY] || {};
  return {
    idleMinutes:5,
    maxLive:Math.min(6,Math.max(1,Number(raw.maxLive) || RESOURCE_MAX_LIVE))
  };
}

async function siteSettingsMap() {
  const raw = (await chrome.storage.local.get(SITE_SETTINGS_KEY))[SITE_SETTINGS_KEY];
  return raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
}

function normalizeSiteSettings(raw = {}) {
  return {
    zoom:Math.min(150,Math.max(60,Math.round(Number(raw.zoom) || 100))),
    sleepPolicy:raw.sleepPolicy === "never" ? "never" : "default",
    notifications:["allow","block"].includes(raw.notifications) ? raw.notifications : "default",
    notificationCategories:Array.isArray(raw.notificationCategories) ? raw.notificationCategories.map(String).slice(0,30) : []
  };
}

async function getSiteSettings(value) {
  const origin = safeOrigin(value);
  const map = await siteSettingsMap();
  return normalizeSiteSettings(origin ? map[origin] : {});
}

async function setSiteSettings(value, patch = {}) {
  const origin = safeOrigin(value);
  if (!origin) throw new Error("Invalid site origin");
  const map = await siteSettingsMap();
  map[origin] = normalizeSiteSettings({...map[origin],...patch});
  await chrome.storage.local.set({[SITE_SETTINGS_KEY]:map});
  return map[origin];
}

async function rebuildNotificationContentSettings(settingsMap = null) {
  if (!chrome.contentSettings?.notifications) {
    throw new Error("Browser contentSettings API is unavailable");
  }

  const map = settingsMap || await siteSettingsMap();

  // contentSettings.clear() clears every rule created by this extension.
  // Rebuild all of our per-origin rules so returning one site to Default never
  // silently removes notification choices for the other sites.
  await chrome.contentSettings.notifications.clear({scope:"regular"});

  for (const [origin, raw] of Object.entries(map)) {
    const notificationSetting = normalizeSiteSettings(raw).notifications;
    if (notificationSetting !== "allow" && notificationSetting !== "block") continue;
    if (!safeOrigin(origin)) continue;

    await chrome.contentSettings.notifications.set({
      primaryPattern:`${origin}/*`,
      setting:notificationSetting,
      scope:"regular"
    });
  }
}

async function applyNotificationSetting(value, setting) {
  const origin = safeOrigin(value);
  if (!origin) throw new Error("Invalid site origin");

  const normalized = ["allow","block"].includes(setting) ? setting : "default";
  const map = await siteSettingsMap();
  map[origin] = normalizeSiteSettings({
    ...(map[origin] || {}),
    notifications:normalized
  });

  await chrome.storage.local.set({[SITE_SETTINGS_KEY]:map});
  await rebuildNotificationContentSettings(map);
  return map[origin];
}

function clearWindowResources(windowId) {
  resourceLeasesReady.then(() => {
    let changed = false;
    for (const [key, lease] of resourceLeases.entries()) {
      if (lease.windowId === windowId) {
        resourceLeases.delete(key);
        changed = true;
      }
    }
    if (changed) persistResourceLeases();
  }).catch(() => {});
  clearWindowMediaStates(windowId).catch(() => {});
}

async function clearWindowMediaStates(windowId) {
  const states = await getMediaStates();
  let changed = false;
  for (const [key, state] of Object.entries(states)) {
    if (Number(state?.windowId) === Number(windowId) || key.startsWith(`${windowId}:`)) {
      delete states[key];
      changed = true;
    }
  }
  if (changed) await chrome.storage.session.set({[MEDIA_STATE_KEY]:states});
}

function resourceKey(windowId,pane) {
  return `${windowId}:${pane === "bottom" ? "bottom" : "top"}`;
}

async function registerPaneResource(message) {
  await resourceLeasesReady;
  const windowId = Number(message.windowId);
  if (!Number.isInteger(windowId)) return;
  const pane = message.pane === "bottom" ? "bottom" : "top";
  const url = normalizeUrl(message.url);
  if (!url) return;
  const settings = await getSiteSettings(url);
  const key = resourceKey(windowId,pane);
  const previous = resourceLeases.get(key);
  resourceLeases.set(key,{
    windowId,pane,url,
    renderer:String(message.renderer || "iframe"),
    keepAlive:message.keepAlive === true,
    neverSleep:settings.sleepPolicy === "never",
    lastActivity:previous?.url === url ? previous.lastActivity : Date.now(),
    registeredAt:previous?.url === url ? previous.registeredAt : Date.now()
  });
  persistResourceLeases();
  await enforceResourceBudget();
}

function touchPaneResource(message) {
  const key = resourceKey(Number(message.windowId),message.pane);
  const lease = resourceLeases.get(key);
  if (lease) {
    lease.lastActivity = Date.now();
    persistResourceLeases();
  }
}

function releasePaneResource(message) {
  if (resourceLeases.delete(resourceKey(Number(message.windowId),message.pane))) {
    persistResourceLeases();
  }
}

function sleepPaneLease(lease, reason) {
  resourceLeases.delete(resourceKey(lease.windowId,lease.pane));
  persistResourceLeases();
  for (const port of panelPorts.get(lease.windowId) || []) {
    safePost(port,{type:"ATN_SLEEP_PANE",pane:lease.pane,reason});
  }
}

async function enforceResourceBudget() {
  await resourceLeasesReady;
  if (!resourceLeases.size) return;
  const cfg = await performanceSettings();
  const now = Date.now();
  const leases = [...resourceLeases.values()];

  // Normal web surfaces are definitely unloaded after five idle minutes unless
  // the site is explicitly pinned or a media renderer currently needs continuity.
  for (const lease of leases) {
    if (now - lease.lastActivity < RESOURCE_IDLE_MS) continue;
    if (lease.neverSleep || lease.keepAlive) continue;
    sleepPaneLease(lease,"idle-5m");
  }

  const stillLive = [...resourceLeases.values()];
  if (stillLive.length <= cfg.maxLive) return;
  stillLive.sort((a,b) => {
    const aPinned = a.keepAlive || a.neverSleep ? 1 : 0;
    const bPinned = b.keepAlive || b.neverSleep ? 1 : 0;
    return aPinned - bPinned || a.lastActivity - b.lastActivity;
  });
  while (resourceLeases.size > cfg.maxLive && stillLive.length) {
    const lease = stillLive.shift();
    if (resourceLeases.has(resourceKey(lease.windowId,lease.pane))) sleepPaneLease(lease,"hard-cap");
  }
}

async function recordRecent(entry) {
  const url = normalizeUrl(entry?.url);
  if (!url) return;
  const raw = (await chrome.storage.local.get(RECENT_KEY))[RECENT_KEY];
  const list = Array.isArray(raw) ? raw : [];
  const item = {
    id:crypto.randomUUID(),
    workspaceId:String(entry.workspaceId || ""),
    windowId:Number.isInteger(Number(entry.windowId)) ? Number(entry.windowId) : null,
    kind:entry.kind === "template" ? "template" : "site",
    title:String(entry.title || url).slice(0,160),
    url,
    template:entry.template && isTemplate(upgradeShortcut(entry.template)) ? upgradeShortcut(entry.template) : null,
    openedAt:Date.now()
  };
  const deduped = [item,...list.filter(old => !(old?.workspaceId === item.workspaceId && old?.url === item.url && old?.kind === item.kind))].slice(0,60);
  await chrome.storage.local.set({[RECENT_KEY]:deduped});
}

async function getRecent(windowId, {all=false} = {}) {
  const state = await getWindowWorkspaceState(windowId);
  const raw = (await chrome.storage.local.get(RECENT_KEY))[RECENT_KEY];
  const list = Array.isArray(raw) ? raw : [];
  const workspacesById = new Map((state.workspaces || []).map(w => [w.id,w.name]));
  let result = all
    ? list
    : list.filter(item => !item.workspaceId || item.workspaceId === state.activeWorkspaceId);

  // On a fresh upgrade Recent should still be useful immediately: current
  // loaded pane URLs are legitimate recent App Tower activity even if older
  // builds did not persist history yet.
  if (!result.length) {
    for (const [paneName,pane] of Object.entries(state.workspace?.panes || {})) {
      const url = normalizeUrl(pane?.url);
      if (!url) continue;
      result.push({
        id:`current-${paneName}`,workspaceId:state.activeWorkspaceId,windowId,kind:"site",
        title:String(pane.title || url).slice(0,160),url,template:null,openedAt:Date.now(),synthetic:true
      });
    }
  }
  return result.slice(0,50).map(item => ({
    ...item,
    workspaceName:workspacesById.get(item.workspaceId) || ""
  }));
}

async function sidecarRegistry() {
  const raw = (await chrome.storage.session.get(SIDECAR_REGISTRY_KEY))[SIDECAR_REGISTRY_KEY];
  return raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
}

async function registerSidecar(windowId, data = {}) {
  if (!Number.isInteger(Number(windowId))) return;
  const registry = await sidecarRegistry();
  registry[windowId] = {
    windowId:Number(windowId),
    kind:String(data.kind || "web"),
    title:String(data.title || data.url || "Sidecar").slice(0,160),
    url:normalizeUrl(data.url) || "",
    parentWindowId:Number.isInteger(Number(data.parentWindowId)) ? Number(data.parentWindowId) : null,
    updatedAt:Date.now()
  };
  await chrome.storage.session.set({[SIDECAR_REGISTRY_KEY]:registry});
}

async function removeSidecar(windowId) {
  const registry = await sidecarRegistry();
  if (registry[windowId]) {
    delete registry[windowId];
    await chrome.storage.session.set({[SIDECAR_REGISTRY_KEY]:registry});
  }
}

async function openRealSidecar({url,title,parentWindowId}) {
  const target = normalizeUrl(url);
  if (!target) throw new Error("Invalid sidecar URL");
  let parent = null;
  if (Number.isInteger(Number(parentWindowId))) {
    try { parent = await chrome.windows.get(Number(parentWindowId)); } catch {}
  }
  if (!parent) {
    try { parent = await chrome.windows.getLastFocused(); } catch {}
  }
  const baseWidth = Number(parent?.width) || 1280;
  const baseHeight = Number(parent?.height) || 800;
  const width = Math.min(560,Math.max(380,Math.round(baseWidth*.31)));
  const createData = {url:target,type:"popup",focused:true,width,height:Math.max(560,baseHeight)};
  if (Number.isFinite(Number(parent?.left))) createData.left = Math.round(Number(parent.left)+baseWidth-width);
  if (Number.isFinite(Number(parent?.top))) createData.top = Math.round(Number(parent.top));
  const win = await chrome.windows.create(createData);
  if (!Number.isInteger(win?.id)) throw new Error("Could not create sidecar");
  await registerSidecar(win.id,{kind:"real",title,url:target,parentWindowId});
  return {windowId:win.id};
}

async function getMediaStates() {
  const raw = (await chrome.storage.session.get(MEDIA_STATE_KEY))[MEDIA_STATE_KEY];
  return raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
}

async function setMediaState(raw) {
  const state = normalizeMediaState(raw);
  if (!state) return null;
  const states = await getMediaStates();
  states[`${state.windowId}:${state.pane}`] = state;
  await chrome.storage.session.set({[MEDIA_STATE_KEY]:states});
  return state;
}

async function clearMediaState(windowId,pane) {
  const states = await getMediaStates();
  delete states[resourceKey(windowId,pane)];
  await chrome.storage.session.set({[MEDIA_STATE_KEY]:states});
}

async function initializeNativeContextMenus() {
  if (!chrome.contextMenus) return;
  try { await chrome.contextMenus.removeAll(); } catch {}
  chrome.contextMenus.create({id:"atn-root",title:"App Tower",contexts:["page","link","selection"]});
  chrome.contextMenus.create({id:"atn-open",parentId:"atn-root",title:"Открыть App Tower",contexts:["page","link","selection"]});
  chrome.contextMenus.create({id:"atn-add",parentId:"atn-root",title:"Добавить текущую страницу",contexts:["page"]});
  chrome.contextMenus.create({id:"atn-bottom",parentId:"atn-root",title:"Открыть ссылку снизу",contexts:["link"]});
  chrome.contextMenus.create({id:"atn-sep",parentId:"atn-root",type:"separator",contexts:["page","link","selection"]});
  chrome.contextMenus.create({id:"atn-options",parentId:"atn-root",title:"Настройки",contexts:["page","link","selection"]});
}


async function bestWebTabForWindow(windowId) {
  const validWindowId = Number.isInteger(Number(windowId)) ? Number(windowId) : null;
  let tabs = [];
  try {
    tabs = await chrome.tabs.query(validWindowId != null ? {windowId:validWindowId} : {lastFocusedWindow:true});
  } catch {}

  const webTabs = tabs
    .map(tab => ({
      tab,
      url:normalizeUrl(tab?.url),
      lastAccessed:Number(tab?.lastAccessed) || 0
    }))
    .filter(item => Boolean(item.url));

  const active = webTabs.find(item => item.tab?.active);
  if (active) return {tab:active.tab,url:active.url,source:'active'};

  webTabs.sort((a,b) => b.lastAccessed - a.lastAccessed);
  if (webTabs[0]) return {tab:webTabs[0].tab,url:webTabs[0].url,source:'recent-window'};

  // If the supplied window currently contains only App Tower New Tab or a
  // privileged browser page, use the most recently focused normal web tab.
  try {
    const fallback = await chrome.tabs.query({active:true,lastFocusedWindow:true});
    const tab = fallback.find(candidate => normalizeUrl(candidate?.url));
    const url = normalizeUrl(tab?.url);
    if (url) return {tab,url,source:'last-focused'};
  } catch {}

  return null;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message !== "object") return;

  if (message.type === "OPEN_SITE") {
    globallyEnabled = true;
    chrome.storage.local.set({ [GLOBAL_ENABLED_KEY]: true }).catch(() => {});
    const windowId = messageWindowId(message, sender);
    let openPromise = Promise.resolve();
    if (Number.isInteger(windowId)) {
      void markPanelOpen(windowId,{authoritative:true}).catch(() => {});
      if (message.containerOpened !== true) {
        openPromise = openTowerContainer(windowId,{tabId:sender?.tab?.id});
      }
    }
    (async () => {
      try {
        await serializeWorkspaceMutation(windowId,"open-site",async () => {
          const state = await getWindowWorkspaceState(windowId);
          const current = state.workspace;
          const url = normalizeUrl(message.url);
          if (!url) throw new Error("Invalid URL");
          const explicitBottom = message.targetPane === "bottom";
          const existingPane = explicitBottom ? null : findPaneForUrl(current.panes, url);
          const targetPane = explicitBottom ? "bottom" : (existingPane || current.layout.activePane);
          if (!existingPane || explicitBottom) {
            const inferred = inferDefaultsForUrl(url);
            current.panes[targetPane] = {
              url,
              title:String(message.title || url),
              mode:resolveAutoMode(url, normalizeMode(message.mode || inferred.mode)),
              compatDomains:normalizeCompatDomains(Array.isArray(message.compatDomains) && message.compatDomains.length ? message.compatDomains : inferred.compatDomains),
              sourceSiteId:message.siteId ? String(message.siteId) : null
            };
          }
          if (explicitBottom) current.layout.split = true;
          current.layout.activePane = targetPane;
          await saveWindowWorkspaceState(windowId,{panes:current.panes,layout:current.layout});
          await recordRecent({windowId,workspaceId:current.id,url,title:String(message.title || url),kind:"site"});
          await syncCompatibilityRules(current.panes);
        });
        await openPromise;
        sendResponse({ok:true});
      } catch (error) {
        if (Number.isInteger(windowId)) await markPanelClosed(windowId,{collapsed:true}).catch(() => {});
        sendResponse({ok:false, error:String(error?.message || error)});
      }
    })();
    return true;
  }

  if (message.type === "OPEN_TEMPLATE") {
    globallyEnabled = true;
    chrome.storage.local.set({ [GLOBAL_ENABLED_KEY]: true }).catch(() => {});
    const windowId = messageWindowId(message, sender);
    let openPromise = Promise.resolve();
    if (Number.isInteger(windowId)) {
      void markPanelOpen(windowId,{authoritative:true}).catch(() => {});
      if (message.containerOpened !== true) {
        openPromise = openTowerContainer(windowId,{tabId:sender?.tab?.id});
      }
    }
    (async () => {
      try {
        await serializeWorkspaceMutation(windowId,"open-template",async () => {
          const template = upgradeShortcut(message.template);
          if (!isTemplate(template)) throw new Error("Invalid two-pane template");
          const state = await getWindowWorkspaceState(windowId);
          const current = state.workspace;
          current.panes.top = paneFromSite(template.top, template.id);
          current.panes.bottom = paneFromSite(template.bottom, template.id);
          current.layout.split = true;
          current.layout.activePane = "top";
          await saveWindowWorkspaceState(windowId,{panes:current.panes,layout:current.layout});
          await recordRecent({windowId,workspaceId:current.id,url:template.top.url,title:template.title,kind:"template",template});
          await syncCompatibilityRules(current.panes);
        });
        await openPromise;
        sendResponse({ok:true});
      } catch (error) {
        if (Number.isInteger(windowId)) await markPanelClosed(windowId,{collapsed:true}).catch(() => {});
        sendResponse({ok:false, error:String(error?.message || error)});
      }
    })();
    return true;
  }

  if (message.type === "MUTATE_SHORTCUTS") {
    (async () => {
      try {
        const windowId = messageWindowId(message, sender);
        const result = await serializeWorkspaceMutation(windowId,"mutate-shortcuts",() =>
          mutateShortcuts(message, windowId)
        );
        sendResponse({ok:true, ...result});
      } catch (error) {
        sendResponse({ok:false, error:String(error?.message || error)});
      }
    })();
    return true;
  }

  if (message.type === "OPEN_PANEL") {
    globallyEnabled = true;
    chrome.storage.local.set({ [GLOBAL_ENABLED_KEY]: true }).catch(() => {});
    const windowId = messageWindowId(message, sender);
    const action = panelActionFromMessage(message,windowId);

    if (message.intent === "settings") {
      openOptions()
        .then(() => sendResponse({ok:true,options:true}))
        .catch(error => sendResponse({ok:false,error:String(error?.message || error)}));
      return true;
    }

    const panelLikelyOpen = Number.isInteger(windowId) && (
      hasLivePanel(windowId) ||
      (openWindows.has(windowId) && !collapsedWindows.has(windowId))
    );

    if (panelLikelyOpen) {
      void markPanelOpen(windowId,{authoritative:true}).catch(() => {});
      (async () => {
        try {
          if (action) {
            await serializeStorageMutation("pending-panel-action",() =>
              chrome.storage.local.set({pendingAction:action})
            );
          }
          await ensureWorkspaceSystem();
          sendResponse({ok:true,reusedPanel:true});
        } catch (error) {
          sendResponse({ok:false,error:String(error?.message || error)});
        }
      })();
      return true;
    }

    const openPromise = Number.isInteger(windowId)
      ? openTowerContainer(windowId,{intent:message.intent,tabId:sender?.tab?.id})
      : Promise.resolve();
    if (Number.isInteger(windowId)) {
      void markPanelOpen(windowId,{authoritative:true}).catch(() => {});
    }
    const pendingPromise = action
      ? serializeStorageMutation("pending-panel-action",() =>
          chrome.storage.local.set({pendingAction:action})
        )
      : Promise.resolve();

    (async () => {
      try {
        await Promise.all([ensureWorkspaceSystem(),pendingPromise,openPromise]);
        sendResponse({ok:true});
      } catch (error) {
        if (Number.isInteger(windowId)) await markPanelClosed(windowId,{collapsed:true}).catch(() => {});
        sendResponse({ok:false,error:String(error?.message || error)});
      }
    })();
    return true;
  }

  if (message.type === "COLLAPSE_PANEL") {
    const windowId = Number(message.windowId);
    (async () => {
      try {
        if (!Number.isInteger(windowId)) throw new Error("Invalid windowId");
        await closeTowerContainer(windowId);
        await markPanelClosed(windowId,{collapsed:true});
        sendResponse({ok:true});
      } catch (error) {
        sendResponse({ok:false,error:String(error?.message || error)});
      }
    })();
    return true;
  }

  if (message.type === "PANEL_COLLAPSED") {
    const windowId = messageWindowId(message,sender);
    (async () => {
      if (Number.isInteger(windowId)) await markPanelClosed(windowId,{collapsed:true});
      sendResponse({ok:true});
    })().catch(error => sendResponse({ok:false,error:String(error?.message || error)}));
    return true;
  }

  if (message.type === "DISABLE_GLOBAL") {
    (async () => {
      globallyEnabled = false;
      await chrome.storage.local.set({ [GLOBAL_ENABLED_KEY]: false });

      const tabs = await chrome.tabs.query({ url:["http://*/*","https://*/*"] });
      await Promise.allSettled(
        tabs
          .filter(tab => Number.isInteger(tab.id))
          .map(tab => chrome.tabs.sendMessage(tab.id, {
            type:"ATN_SET_RAIL_VISIBLE",
            visible:false
          }))
      );

      const windowIds = [...new Set([...openWindows,...collapsedWindows])];
      await Promise.allSettled(windowIds.map(async windowId => {
        if (openWindows.has(windowId)) await closeTowerContainer(windowId).catch(() => {});
        await markPanelClosed(windowId,{collapsed:false});
      }));

      sendResponse({ ok:true });
    })().catch(error => {
      sendResponse({ ok:false, error:String(error?.message || error) });
    });
    return true;
  }

  if (message.type === "ATN_PWA_MANIFEST_LINK_V060") {
    const pageUrl = normalizeUrl(message.pageUrl);
    const manifestUrl = normalizeUrl(message.manifestUrl);
    if (!pageUrl || !manifestUrl) return false;

    // Discovery is fire-and-forget. The sanitized cache change wakes the Side
    // Panel UI through chrome.storage.onChanged.
    void fetchAndCachePwaManifest(pageUrl, manifestUrl);
    return false;
  }

  if (message.type === "GET_PWA_FOR_URL") {
    (async () => {
      const pwa = await getCachedPwaForUrl(message.url);
      const prefs = await getPwaPreferences();
      const origin = safeOrigin(message.url);
      sendResponse({
        ok:true,
        pwa,
        preference:origin ? (prefs[origin] || "pane") : "pane"
      });
    })().catch(error => sendResponse({ok:false, error:String(error?.message || error)}));
    return true;
  }

  if (message.type === "SET_PWA_PREFERENCE") {
    (async () => {
      const origin = safeOrigin(message.url);
      if (!origin) throw new Error("Invalid PWA origin");
      const prefs = await getPwaPreferences();
      if (message.preference === "sidecar") prefs[origin] = "sidecar";
      else delete prefs[origin];
      await chrome.storage.local.set({ [PWA_PREFS_KEY]:prefs });
      sendResponse({ok:true, preference:prefs[origin] || "pane"});
    })().catch(error => sendResponse({ok:false, error:String(error?.message || error)}));
    return true;
  }

  if (message.type === "FORGET_PWA") {
    (async () => {
      const origin = safeOrigin(message.url || message.origin);
      if (!origin) throw new Error("Invalid PWA origin");
      const cache = await getPwaCache();
      const prefs = await getPwaPreferences();
      delete cache[origin];
      delete prefs[origin];
      await chrome.storage.local.set({[PWA_CACHE_KEY]:cache,[PWA_PREFS_KEY]:prefs});
      sendResponse({ok:true});
    })().catch(error => sendResponse({ok:false,error:String(error?.message || error)}));
    return true;
  }

  if (message.type === "OPEN_PWA_SIDECAR") {
    (async () => {
      const result = await openPwaSidecar({
        pageUrl:message.pageUrl,
        targetUrl:message.targetUrl,
        parentWindowId:Number(message.windowId)
      });
      sendResponse({ok:true, ...result});
    })().catch(error => sendResponse({ok:false, error:String(error?.message || error)}));
    return true;
  }

  if (message.type === "GET_RAIL_VISIBILITY") {
    const windowId = sender?.tab?.windowId;
    Promise.all([panelSessionReady, globalEnabledReady]).then(() => {
      sendResponse({
        visible:globallyEnabled &&
          (Number.isInteger(windowId) ? !openWindows.has(windowId) : true),
        enabled:globallyEnabled
      });
    });
    return true;
  }

  if (message.type === "SET_SYNC_ENABLED") {
    (async () => {
      const enabled = message.enabled === true;
      await serializeStorageMutation("set-sync-enabled",async () => {
        syncEnabled = enabled;
        await chrome.storage.local.set({ [SYNC_ENABLED_KEY]: enabled });
        if (enabled) await enableBrowserSync();
      });
      sendResponse({ ok:true, enabled });
    })().catch(error => sendResponse({ok:false, error:String(error?.message || error)}));
    return true;
  }

  if (message.type === "GET_CURRENT_TAB") {
    (async () => {
      const result = await bestWebTabForWindow(Number(message.windowId));
      const tab = result?.tab;
      sendResponse({
        ok:true,
        tab:result?.url ? {
          id:Number.isInteger(tab?.id) ? tab.id : null,
          title:String(tab?.title || result.url),
          url:result.url,
          source:result.source
        } : null
      });
    })().catch(error => sendResponse({ok:false, error:String(error?.message || error)}));
    return true;
  }

  if (message.type === "OPEN_OPTIONS") {
    openOptions().then(() => sendResponse({ok:true})).catch(error => sendResponse({ok:false,error:String(error?.message || error)}));
    return true;
  }

  if (message.type === "GET_BROWSER_CAPABILITIES") {
    sendResponse({ok:true,...browserCapabilities()});
    return false;
  }

  if (message.type === "GET_STATE_COORDINATOR_DIAGNOSTICS") {
    sendResponse({ok:true,...backgroundStateCoordinator.snapshot()});
    return false;
  }

  if (message.type === "GET_WINDOW_STATE" || message.type === "GET_SHORTCUTS") {
    (async () => {
      const windowId = messageWindowId(message,sender);
      const result = await serializeWorkspaceRead(windowId,"get-window-state",async () => {
        const state = await getWindowWorkspaceState(windowId);
        const extra = await chrome.storage.local.get([SYNC_ENABLED_KEY]);
        return {state,extra};
      });
      const {state,extra} = result;
      sendResponse({
        ok:true,
        sites:state.workspace.sites,
        panes:state.workspace.panes,
        layout:state.workspace.layout,
        workspaceId:state.activeWorkspaceId,
        workspaceName:state.workspace.name,
        workspaces:state.workspaces,
        defaultWorkspaceId:state.defaultWorkspaceId,
        syncEnabled:extra[SYNC_ENABLED_KEY] === true
      });
    })().catch(error => sendResponse({ok:false,error:String(error?.message || error)}));
    return true;
  }

  if (message.type === "UPDATE_WORKSPACE_STATE") {
    (async () => {
      const windowId = messageWindowId(message,sender);
      const workspace = await serializeWorkspaceMutation(windowId,"update-workspace-state",async () => {
        const saved = await saveWindowWorkspaceState(windowId,{
          sites:message.sites,
          panes:message.panes,
          layout:message.layout
        });
        if (message.panes) await syncCompatibilityRules(saved.panes);
        return saved;
      });
      sendResponse({ok:true,workspace});
    })().catch(error => sendResponse({ok:false,error:String(error?.message || error)}));
    return true;
  }

  if (message.type === "LIST_WORKSPACES") {
    (async () => {
      const windowId = messageWindowId(message,sender);
      const state = await serializeWorkspaceRead(windowId,"list-workspaces",() => getWindowWorkspaceState(windowId));
      sendResponse({ok:true,workspaces:state.workspaces,activeWorkspaceId:state.activeWorkspaceId,defaultWorkspaceId:state.defaultWorkspaceId,nativeWorkspaceBinding:false,binding:"browser-window"});
    })().catch(error => sendResponse({ok:false,error:String(error?.message || error)}));
    return true;
  }

  if (message.type === "CREATE_WORKSPACE") {
    (async () => {
      const windowId = messageWindowId(message,sender);
      const result = await serializeWorkspaceMutation(windowId,"create-workspace",async () => {
        const workspace = await createWorkspace(message.name,{copyFromWindowId:message.copyCurrent === true ? windowId : null});
        if (message.activate !== false && Number.isInteger(windowId)) await setWindowWorkspace(windowId,workspace.id);
        return {workspace,state:await getWindowWorkspaceState(windowId)};
      });
      sendResponse({ok:true,...result});
    })().catch(error => sendResponse({ok:false,error:String(error?.message || error)}));
    return true;
  }

  if (message.type === "RENAME_WORKSPACE") {
    serializeWorkspaceMutation(null,"rename-workspace",() => renameWorkspace(message.workspaceId,message.name))
      .then(workspace => sendResponse({ok:true,workspace}))
      .catch(error => sendResponse({ok:false,error:String(error?.message || error)}));
    return true;
  }

  if (message.type === "DELETE_WORKSPACE") {
    serializeWorkspaceMutation(null,"delete-workspace",() => deleteWorkspace(message.workspaceId))
      .then(result => sendResponse({ok:true,...result}))
      .catch(error => sendResponse({ok:false,error:String(error?.message || error)}));
    return true;
  }

  if (message.type === "SET_ACTIVE_WORKSPACE") {
    (async () => {
      const windowId = messageWindowId(message,sender);
      const state = await serializeWorkspaceMutation(windowId,"set-active-workspace",() =>
        setWindowWorkspace(windowId,message.workspaceId)
      );
      sendResponse({ok:true,...state});
    })().catch(error => sendResponse({ok:false,error:String(error?.message || error)}));
    return true;
  }

  if (message.type === "SET_DEFAULT_WORKSPACE") {
    (async () => {
      const id = await serializeWorkspaceMutation(null,"set-default-workspace",async () => {
        const {workspaces} = await ensureWorkspaceSystem();
        const nextId = String(message.workspaceId || "");
        if (!workspaces.some(w => w.id === nextId)) throw new Error("Workspace not found");
        await chrome.storage.local.set({[DEFAULT_WORKSPACE_KEY]:nextId});
        return nextId;
      });
      sendResponse({ok:true,defaultWorkspaceId:id});
    })().catch(error => sendResponse({ok:false,error:String(error?.message || error)}));
    return true;
  }

  if (message.type === "GET_RECENT") {
    const windowId = messageWindowId(message,sender);
    serializeWorkspaceRead(windowId,"get-recent",() => getRecent(windowId,{all:message.all === true}))
      .then(recent => sendResponse({ok:true,recent}))
      .catch(error => sendResponse({ok:false,error:String(error?.message || error)}));
    return true;
  }

  if (message.type === "RECORD_RECENT") {
    (async () => {
      const windowId = messageWindowId(message,sender);
      await serializeWorkspaceMutation(windowId,"record-recent",async () => {
        const state = await getWindowWorkspaceState(windowId);
        await recordRecent({...message,windowId,workspaceId:state.activeWorkspaceId});
      });
      sendResponse({ok:true});
    })().catch(error => sendResponse({ok:false,error:String(error?.message || error)}));
    return true;
  }

  if (message.type === "GET_SITE_SETTINGS") {
    getSiteSettings(message.url).then(settings => sendResponse({ok:true,settings})).catch(error => sendResponse({ok:false,error:String(error?.message || error)}));
    return true;
  }

  if (message.type === "SET_SITE_SETTINGS") {
    serializeStorageMutation("set-site-settings",() => setSiteSettings(message.url,message.patch || {}))
      .then(settings => sendResponse({ok:true,settings}))
      .catch(error => sendResponse({ok:false,error:String(error?.message || error)}));
    return true;
  }

  if (message.type === "APPLY_NOTIFICATION_SETTING") {
    serializeStorageMutation("apply-notification-setting",() => applyNotificationSetting(message.url,message.setting))
      .then(settings => sendResponse({ok:true,settings}))
      .catch(error => sendResponse({ok:false,error:String(error?.message || error)}));
    return true;
  }

  if (message.type === "GET_ALL_SITE_SETTINGS") {
    (async () => sendResponse({ok:true,settings:await siteSettingsMap(),sites:await allWorkspaceSites()}))().catch(error => sendResponse({ok:false,error:String(error?.message || error)}));
    return true;
  }

  if (message.type === "PANE_LIVE") {
    registerPaneResource({...message,windowId:messageWindowId(message,sender)}).then(() => sendResponse({ok:true})).catch(error => sendResponse({ok:false,error:String(error?.message || error)}));
    return true;
  }

  if (message.type === "PANE_ACTIVITY") {
    touchPaneResource({...message,windowId:messageWindowId(message,sender)});
    sendResponse({ok:true});
    return false;
  }

  if (message.type === "PANE_RELEASE") {
    releasePaneResource({...message,windowId:messageWindowId(message,sender)});
    clearMediaState(messageWindowId(message,sender),message.pane).catch(() => {});
    sendResponse({ok:true});
    return false;
  }

  if (message.type === "GET_RESOURCE_STATUS") {
    (async () => {
      await resourceLeasesReady;
      sendResponse({ok:true,performance:await performanceSettings(),live:[...resourceLeases.values()]});
    })().catch(error => sendResponse({ok:false,error:String(error?.message || error)}));
    return true;
  }

  if (message.type === "SET_PERFORMANCE") {
    (async () => {
      const maxLive = Math.min(6,Math.max(1,Number(message.maxLive) || 6));
      await chrome.storage.local.set({[PERFORMANCE_KEY]:{idleMinutes:5,maxLive}});
      await enforceResourceBudget();
      sendResponse({ok:true,performance:{idleMinutes:5,maxLive}});
    })().catch(error => sendResponse({ok:false,error:String(error?.message || error)}));
    return true;
  }

  if (message.type === "OPEN_REAL_SIDECAR") {
    openRealSidecar({url:message.url,title:message.title,parentWindowId:messageWindowId(message,sender)}).then(result => sendResponse({ok:true,...result})).catch(error => sendResponse({ok:false,error:String(error?.message || error)}));
    return true;
  }

  if (message.type === "GET_SIDECARS") {
    (async () => sendResponse({ok:true,sidecars:Object.values(await sidecarRegistry())}))().catch(error => sendResponse({ok:false,error:String(error?.message || error)}));
    return true;
  }

  if (message.type === "FOCUS_SIDECAR") {
    chrome.windows.update(Number(message.sidecarWindowId),{focused:true}).then(() => sendResponse({ok:true})).catch(error => sendResponse({ok:false,error:String(error?.message || error)}));
    return true;
  }

  if (message.type === "CLOSE_SIDECAR") {
    (async () => {
      const id=Number(message.sidecarWindowId);
      if (!Number.isInteger(id)) throw new Error("Invalid sidecar window");
      try { await chrome.windows.remove(id); } catch {}
      await removeSidecar(id);
      sendResponse({ok:true});
    })().catch(error => sendResponse({ok:false,error:String(error?.message || error)}));
    return true;
  }

  if (message.type === "MEDIA_STATE") {
    setMediaState({...message.state,windowId:messageWindowId(message,sender)}).then(state => sendResponse({ok:true,state})).catch(error => sendResponse({ok:false,error:String(error?.message || error)}));
    return true;
  }

  if (message.type === "MEDIA_CLEAR") {
    clearMediaState(messageWindowId(message,sender),message.pane).then(() => sendResponse({ok:true})).catch(error => sendResponse({ok:false,error:String(error?.message || error)}));
    return true;
  }

  if (message.type === "GET_MEDIA_STATE") {
    getMediaStates().then(states => sendResponse({ok:true,states:Object.values(states)})).catch(error => sendResponse({ok:false,error:String(error?.message || error)}));
    return true;
  }

  if (message.type === "SYNC_COMPAT_RULES") {
    (async () => {
      const windowId = messageWindowId(message,sender);
      const panes = message.panes || (await getWindowWorkspaceState(windowId)).workspace.panes;
      const result = await syncCompatibilityRules(panes);
      sendResponse({ok:true, ...result});
    })().catch(error => sendResponse({ok:false, error:String(error?.message || error)}));
    return true;
  }

  if (message.type === "GET_STATE") {
    (async () => {
      const windowId = messageWindowId(message,sender);
      const state = await getWindowWorkspaceState(windowId);
      const extra = await chrome.storage.local.get(["pendingAction",SYNC_ENABLED_KEY]);
      sendResponse({
        sites:state.workspace.sites,
        panes:state.workspace.panes,
        layout:state.workspace.layout,
        workspaceId:state.activeWorkspaceId,
        workspaceName:state.workspace.name,
        workspaces:state.workspaces,
        defaultWorkspaceId:state.defaultWorkspaceId,
        syncEnabled:extra[SYNC_ENABLED_KEY] === true,
        pendingAction:extra.pendingAction
      });
    })().catch(error => sendResponse({ok:false, error:String(error?.message || error)}));
    return true;
  }
});


function safeOrigin(value) {
  try {
    const url = new URL(String(value || ""));
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    return url.origin;
  } catch {
    return "";
  }
}

function normalizeAbsoluteWebUrl(value, base) {
  try {
    const url = new URL(String(value || ""), base);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    return url.href;
  } catch {
    return "";
  }
}

function persistPwaSidecars() {
  chrome.storage.session.set({
    [PWA_SIDECARS_KEY]:Object.fromEntries(pwaSidecars)
  }).catch(() => {});
}

async function getPwaPreferences() {
  const raw = (await chrome.storage.local.get(PWA_PREFS_KEY))[PWA_PREFS_KEY];
  const result = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return result;
  for (const [origin, value] of Object.entries(raw)) {
    if (safeOrigin(origin) && value === "sidecar") result[origin] = "sidecar";
  }
  return result;
}

async function getPwaCache() {
  const raw = (await chrome.storage.local.get(PWA_CACHE_KEY))[PWA_CACHE_KEY];
  return raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
}

async function getCachedPwaForUrl(value) {
  const origin = safeOrigin(value);
  if (!origin) return null;
  const cache = await getPwaCache();
  const item = cache[origin];
  return item && item.origin === origin ? item : null;
}

async function fetchAndCachePwaManifest(pageUrl, manifestUrl) {
  const pageOrigin = safeOrigin(pageUrl);
  const manifestOrigin = safeOrigin(manifestUrl);
  if (!pageOrigin || !manifestOrigin) return null;

  const dedupeKey = `${pageOrigin}|${manifestUrl}`;
  if (pwaFetches.has(dedupeKey)) return pwaFetches.get(dedupeKey);

  const task = (async () => {
    const response = await fetch(manifestUrl, {
      method:"GET",
      redirect:"follow",
      credentials:"omit",
      cache:"no-store"
    });
    if (!response.ok) throw new Error(`Manifest HTTP ${response.status}`);

    const finalManifestUrl = normalizeAbsoluteWebUrl(response.url || manifestUrl, manifestUrl);
    if (!finalManifestUrl) throw new Error("Invalid manifest URL");

    const rawText = await response.text();
    if (rawText.length > 512 * 1024) throw new Error("Manifest is too large");

    const raw = JSON.parse(rawText);
    const pwa = sanitizePwaManifest(raw, {
      pageUrl,
      manifestUrl:finalManifestUrl,
      pageOrigin
    });
    if (!pwa) return null;

    const cache = await getPwaCache();
    cache[pageOrigin] = pwa;

    // Keep cache bounded. Web manifests are discovery metadata, not user data.
    const entries = Object.entries(cache)
      .sort((a,b) => Number(b[1]?.discoveredAt || 0) - Number(a[1]?.discoveredAt || 0))
      .slice(0, 80);
    await chrome.storage.local.set({ [PWA_CACHE_KEY]:Object.fromEntries(entries) });
    return pwa;
  })().finally(() => {
    pwaFetches.delete(dedupeKey);
  });

  pwaFetches.set(dedupeKey, task);
  return task;
}

function sanitizePwaManifest(raw, { pageUrl, manifestUrl, pageOrigin }) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;

  const fallbackStart = normalizeAbsoluteWebUrl(pageUrl, pageUrl);
  let startUrl = normalizeAbsoluteWebUrl(raw.start_url || fallbackStart, manifestUrl) || fallbackStart;
  if (safeOrigin(startUrl) !== pageOrigin) startUrl = fallbackStart;

  const defaultScope = normalizeAbsoluteWebUrl("./", startUrl) || pageOrigin + "/";
  let scope = raw.scope
    ? (normalizeAbsoluteWebUrl(raw.scope, manifestUrl) || defaultScope)
    : defaultScope;
  if (safeOrigin(scope) !== pageOrigin || !urlWithinScope(startUrl, scope)) {
    scope = defaultScope;
  }

  const name = cleanPwaText(raw.name || raw.short_name || new URL(pageUrl).hostname, 120);
  const shortName = cleanPwaText(raw.short_name || raw.name || name, 60);
  const display = cleanPwaToken(raw.display || "browser", [
    "browser","standalone","minimal-ui","fullscreen",
    "window-controls-overlay","borderless","tabbed"
  ]) || "browser";

  const icons = [];
  for (const icon of Array.isArray(raw.icons) ? raw.icons.slice(0, 12) : []) {
    const src = normalizeAbsoluteWebUrl(icon?.src, manifestUrl);
    if (!src) continue;
    icons.push({
      src,
      sizes:cleanPwaText(icon?.sizes || "", 80),
      type:cleanPwaText(icon?.type || "", 80),
      purpose:cleanPwaText(icon?.purpose || "", 80)
    });
  }

  const shortcuts = [];
  for (const shortcut of Array.isArray(raw.shortcuts) ? raw.shortcuts.slice(0, 12) : []) {
    const url = normalizeAbsoluteWebUrl(shortcut?.url, startUrl);
    if (!url || safeOrigin(url) !== pageOrigin || !urlWithinScope(url, scope)) continue;
    shortcuts.push({
      name:cleanPwaText(shortcut?.name || shortcut?.short_name || url, 80),
      shortName:cleanPwaText(shortcut?.short_name || shortcut?.name || "", 50),
      description:cleanPwaText(shortcut?.description || "", 160),
      url
    });
  }

  return {
    origin:pageOrigin,
    manifestUrl,
    startUrl,
    scope,
    name,
    shortName,
    display,
    id:cleanPwaText(raw.id || "", 180),
    icons,
    shortcuts,
    discoveredAt:Date.now()
  };
}

function urlWithinScope(value, scopeValue) {
  try {
    const url = new URL(value);
    const scope = new URL(scopeValue);
    if (url.origin !== scope.origin) return false;
    const scopePath = scope.pathname.endsWith("/")
      ? scope.pathname
      : scope.pathname + "/";
    if (url.pathname === scope.pathname) return true;
    return url.pathname.startsWith(scopePath);
  } catch {
    return false;
  }
}

function cleanPwaText(value, maxLength) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function cleanPwaToken(value, allowed) {
  const token = String(value || "").trim().toLowerCase();
  return allowed.includes(token) ? token : "";
}

function pwaTargetAllowed(pwa, targetUrl) {
  const target = normalizeAbsoluteWebUrl(targetUrl || pwa.startUrl, pwa.startUrl);
  if (!target || safeOrigin(target) !== pwa.origin) return "";
  if (pwa.scope && !urlWithinScope(target, pwa.scope)) return "";
  return target;
}

async function openPwaSidecar({ pageUrl, targetUrl, parentWindowId }) {
  await pwaSidecarsReady;
  const pwa = await getCachedPwaForUrl(pageUrl);
  if (!pwa) throw new Error("Web App Manifest has not been discovered yet");

  const target = pwaTargetAllowed(pwa, targetUrl);
  if (!target) throw new Error("PWA target is outside the app origin");

  const existingId = pwaSidecars.get(pwa.origin);
  if (Number.isInteger(existingId)) {
    try {
      const win = await chrome.windows.get(existingId, { populate:true });
      const tab = win.tabs?.[0];
      if (Number.isInteger(tab?.id)) await chrome.tabs.update(tab.id, { url:target, active:true });
      await chrome.windows.update(existingId, { focused:true });
      await registerSidecar(existingId,{kind:"pwa",title:pwa.name || pwa.shortName,url:target,parentWindowId});
      return {windowId:existingId, reused:true};
    } catch {
      pwaSidecars.delete(pwa.origin);
      persistPwaSidecars();
    }
  }

  let parent = null;
  if (Number.isInteger(parentWindowId)) {
    try { parent = await chrome.windows.get(parentWindowId); } catch {}
  }
  if (!parent) {
    try { parent = await chrome.windows.getLastFocused(); } catch {}
  }

  const baseWidth = Math.round(Number(parent?.width) || 1280);
  const baseHeight = Math.round(Number(parent?.height) || 800);
  const width = Math.min(560, Math.max(360, Math.round(baseWidth * 0.34)));
  const height = Math.max(480, baseHeight - 16);
  const left = Number.isFinite(Number(parent?.left))
    ? Math.round(Number(parent.left) + baseWidth - width - 8)
    : undefined;
  const top = Number.isFinite(Number(parent?.top))
    ? Math.round(Number(parent.top) + 8)
    : undefined;

  const createData = {
    url:target,
    type:"popup",
    focused:true,
    width,
    height
  };
  if (Number.isInteger(left)) createData.left = left;
  if (Number.isInteger(top)) createData.top = top;

  const win = await chrome.windows.create(createData);
  if (!Number.isInteger(win?.id)) throw new Error("Could not create PWA sidecar window");

  pwaSidecars.set(pwa.origin, win.id);
  persistPwaSidecars();
  await registerSidecar(win.id,{kind:"pwa",title:pwa.name || pwa.shortName,url:target,parentWindowId});
  return {windowId:win.id, reused:false};
}

async function initialize(injectOpenTabs) {
  // Repair any tab-specific `enabled:false` state left by the v0.8.4 collapse
  // workaround before normal startup state is reconstructed.
  try { await repairNativeSidePanelOptions(); } catch {}
  let legacy = await ensureDefaults();
  await ensureWorkspaceSystem();
  if (legacy.syncEnabled) {
    await pullSyncOnStartup();
    await ensureWorkspaceSystem();
  }
  try { await chrome.sidePanel?.setPanelBehavior?.({openPanelOnActionClick:false}); } catch {}
  // v0.2.1 used dynamic rules. Clear any rules left by a same-ID development update.
  const oldDynamic = await chrome.declarativeNetRequest.getDynamicRules();
  if (oldDynamic.length) {
    await chrome.declarativeNetRequest.updateDynamicRules({removeRuleIds:oldDynamic.map(r => r.id)});
  }
  const {workspaces} = await ensureWorkspaceSystem();
  const domainsPanes = workspaces.flatMap(workspace => Object.values(workspace.panes || {}));
  await syncCompatibilityRules(Object.fromEntries(domainsPanes.map((pane,index)=>[`p${index}`,pane])));
  if (injectOpenTabs) await injectIntoOpenTabs();
}

async function injectIntoOpenTabs() {
  const tabs = await chrome.tabs.query({url:["http://*/*","https://*/*"]});
  for (const tab of tabs) {
    if (!Number.isInteger(tab.id)) continue;
    try {
      await chrome.scripting.insertCSS({target:{tabId:tab.id}, files:["content/rail.css"]});
      await chrome.scripting.executeScript({target:{tabId:tab.id}, files:["content/rail.js"]});
      await chrome.scripting.executeScript({
        target:{tabId:tab.id, allFrames:true},
        files:["content/pwa-discovery.js"]
      });
    } catch {}
  }
}


function messageWindowId(message, sender) {
  const explicit = Number(message?.windowId);
  if (Number.isInteger(explicit)) return explicit;
  const senderWindow = Number(sender?.tab?.windowId);
  return Number.isInteger(senderWindow) ? senderWindow : null;
}

async function ensureWorkspaceSystem() {
  const legacy = await ensureDefaults();
  const data = await chrome.storage.local.get([WORKSPACES_KEY, DEFAULT_WORKSPACE_KEY]);
  let workspaces = Array.isArray(data[WORKSPACES_KEY])
    ? data[WORKSPACES_KEY].map(item => normalizeWorkspace(item)).filter(Boolean)
    : [];

  if (!workspaces.length) {
    const workspace = normalizeWorkspace({
      id:crypto.randomUUID(),
      name:"Основной",
      sites:legacy.sites,
      panes:legacy.panes,
      layout:legacy.layout,
      createdAt:Date.now(),
      updatedAt:Date.now()
    });
    workspaces = [workspace];
    await chrome.storage.local.set({
      [WORKSPACES_KEY]:workspaces,
      [DEFAULT_WORKSPACE_KEY]:workspace.id
    });
    return {workspaces,defaultId:workspace.id};
  }

  let defaultId = String(data[DEFAULT_WORKSPACE_KEY] || "");
  if (!workspaces.some(w => w.id === defaultId)) defaultId = workspaces[0].id;
  if (defaultId !== data[DEFAULT_WORKSPACE_KEY]) {
    await chrome.storage.local.set({[DEFAULT_WORKSPACE_KEY]:defaultId});
  }
  return {workspaces,defaultId};
}

async function windowWorkspaceMap() {
  const raw = (await chrome.storage.session.get(WINDOW_WORKSPACES_KEY))[WINDOW_WORKSPACES_KEY];
  return raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
}

async function workspaceIdForWindow(windowId) {
  const {workspaces,defaultId} = await ensureWorkspaceSystem();
  if (!Number.isInteger(Number(windowId))) return defaultId;
  const map = await windowWorkspaceMap();
  const id = String(map[windowId] || "");
  return workspaces.some(w => w.id === id) ? id : defaultId;
}

async function getWindowWorkspaceState(windowId) {
  const {workspaces,defaultId} = await ensureWorkspaceSystem();
  const map = await windowWorkspaceMap();
  const requested = Number.isInteger(Number(windowId)) ? String(map[windowId] || "") : "";
  const activeId = workspaces.some(w => w.id === requested) ? requested : defaultId;
  const workspace = workspaces.find(w => w.id === activeId) || workspaces[0];
  return {
    workspace:structuredClone(workspace),
    activeWorkspaceId:workspace.id,
    defaultWorkspaceId:defaultId,
    workspaces:workspaces.map(workspaceSummary)
  };
}

async function saveWindowWorkspaceState(windowId, patch = {}) {
  const state = await getWindowWorkspaceState(windowId);
  const data = await chrome.storage.local.get(WORKSPACES_KEY);
  const workspaces = Array.isArray(data[WORKSPACES_KEY])
    ? data[WORKSPACES_KEY].map(item => normalizeWorkspace(item)).filter(Boolean)
    : [];
  const index = workspaces.findIndex(w => w.id === state.activeWorkspaceId);
  if (index < 0) throw new Error("Workspace not found");
  const current = workspaces[index];

  if (patch.sites) current.sites = normalizeShortcutList(patch.sites);
  if (patch.panes) current.panes = {
    top:upgradePane(patch.panes.top),
    bottom:upgradePane(patch.panes.bottom)
  };
  if (patch.layout) current.layout = {
    split:patch.layout.split === true,
    ratio:clamp(Number(patch.layout.ratio) || .58,.20,.80),
    activePane:patch.layout.activePane === "bottom" ? "bottom" : "top"
  };
  current.updatedAt = Date.now();
  workspaces[index] = normalizeWorkspace(current);
  await chrome.storage.local.set({[WORKSPACES_KEY]:workspaces});
  notifyWorkspaceChanged(Number(windowId), workspaces[index]);
  return structuredClone(workspaces[index]);
}

async function setWindowWorkspace(windowId, workspaceId) {
  const id = String(workspaceId || "");
  const {workspaces} = await ensureWorkspaceSystem();
  const workspace = workspaces.find(item => item.id === id);
  if (!workspace) throw new Error("Workspace not found");
  if (Number.isInteger(Number(windowId))) {
    const map = await windowWorkspaceMap();
    map[windowId] = id;
    await chrome.storage.session.set({[WINDOW_WORKSPACES_KEY]:map});
    notifyWorkspaceChanged(Number(windowId), workspace, "switch");
  }
  await syncCompatibilityRules(workspace.panes);
  return getWindowWorkspaceState(windowId);
}

async function createWorkspace(name, {copyFromWindowId=null} = {}) {
  const data = await ensureWorkspaceSystem();
  let base = null;
  if (Number.isInteger(Number(copyFromWindowId))) {
    base = (await getWindowWorkspaceState(Number(copyFromWindowId))).workspace;
  }
  const workspace = normalizeWorkspace({
    id:crypto.randomUUID(),
    name:String(name || "Новый workspace").trim().slice(0,80) || "Новый workspace",
    sites:base?.sites || [],
    panes:base?.panes || DEFAULT_STATE.panes,
    layout:base?.layout || DEFAULT_STATE.layout,
    createdAt:Date.now(),
    updatedAt:Date.now()
  });
  const workspaces = [...data.workspaces,workspace];
  await chrome.storage.local.set({[WORKSPACES_KEY]:workspaces});
  return workspace;
}

async function renameWorkspace(id, name) {
  const data = await ensureWorkspaceSystem();
  const workspace = data.workspaces.find(item => item.id === String(id));
  if (!workspace) throw new Error("Workspace not found");
  workspace.name = String(name || workspace.name).replace(/\s+/g," ").trim().slice(0,80) || workspace.name;
  workspace.updatedAt = Date.now();
  await chrome.storage.local.set({[WORKSPACES_KEY]:data.workspaces});
  return workspace;
}

async function deleteWorkspace(id) {
  const data = await ensureWorkspaceSystem();
  if (data.workspaces.length <= 1) throw new Error("At least one workspace must remain");
  const next = data.workspaces.filter(item => item.id !== String(id));
  if (next.length === data.workspaces.length) throw new Error("Workspace not found");
  const defaultId = data.defaultId === String(id) ? next[0].id : data.defaultId;
  const map = await windowWorkspaceMap();
  for (const [windowId,workspaceId] of Object.entries(map)) {
    if (workspaceId === String(id)) map[windowId] = defaultId;
  }
  await Promise.all([
    chrome.storage.local.set({[WORKSPACES_KEY]:next,[DEFAULT_WORKSPACE_KEY]:defaultId}),
    chrome.storage.session.set({[WINDOW_WORKSPACES_KEY]:map})
  ]);
  return {workspaces:next.map(workspaceSummary),defaultWorkspaceId:defaultId};
}

function notifyWorkspaceChanged(windowId, workspace, reason="state") {
  if (!Number.isInteger(windowId)) return;
  const message={type:"ATN_WORKSPACE_CHANGED",workspaceId:workspace?.id,workspace:workspace ? structuredClone(workspace) : null,reason};
  for (const port of railPorts.get(windowId) || []) safePost(port,message);
  for (const port of panelPorts.get(windowId) || []) safePost(port,message);
}

async function allWorkspaceSites() {
  const {workspaces} = await ensureWorkspaceSystem();
  return workspaces.flatMap(w => collectWorkspaceSites(w).map(site => ({...site,workspaceId:w.id,workspaceName:w.name})));
}

function collectWorkspaceSites(workspace) {
  const result=[];
  const visit = item => {
    if (isSite(item)) result.push(item);
    else if (isTemplate(item)) { result.push(item.top,item.bottom); }
    else if (isGroup(item)) for (const child of item.items) visit(child);
  };
  for (const item of workspace?.sites || []) visit(item);
  return result;
}

async function ensureDefaults() {
  const current = await chrome.storage.local.get([
    "sites","panes","layout","schemaVersion",
    GLOBAL_ENABLED_KEY,SYNC_ENABLED_KEY,SYNC_UPDATED_AT_KEY
  ]);

  const previousSchema = Number(current.schemaVersion) || 0;
  let sites = Array.isArray(current.sites)
    ? current.sites.map(upgradeShortcut).filter(Boolean)
    : [];

  // v0.3.6 removes the four development shortcuts. Remove only the original
  // built-in IDs during migration; user-created shortcuts are untouched.
  if (previousSchema < 7) {
    sites = sites.filter(site => !LEGACY_DEFAULT_IDS.has(site.id));
  }

  let panes = current.panes
    ? { top:upgradePane(current.panes.top), bottom:upgradePane(current.panes.bottom) }
    : structuredClone(DEFAULT_STATE.panes);

  if (previousSchema < 7) {
    for (const name of ["top","bottom"]) {
      if (LEGACY_DEFAULT_IDS.has(panes[name]?.sourceSiteId)) panes[name] = structuredClone(EMPTY_PANE);
    }
  }

  // v0.3.8 makes Auto the canonical default. Earlier builds could silently
  // persist S/C for a URL typed directly into a pane even though the user never
  // selected that mode. Treat only unsourced/manual panes as implicit and move
  // them back to Auto. Saved site shortcuts keep their explicitly configured mode.
  if (previousSchema < 8) {
    for (const name of ["top","bottom"]) {
      const pane = panes[name];
      if (pane?.url && !pane.sourceSiteId && (pane.mode === "secure" || pane.mode === "compat")) {
        pane.mode = "auto";
      }
      if (!pane?.url) panes[name] = structuredClone(EMPTY_PANE);
    }
  }

  if (previousSchema < 9) {
    // v0.4.0 changes renderer selection only; persisted pane/site data stays compatible.
  }

  if (previousSchema > 0 && previousSchema < 10) {
    // v0.5.0 moves the former built-in YouTube/Yandex Music adapters into the
    // declarative module registry. Existing users keep the behavior they had;
    // a completely fresh install starts with no optional modules enabled.
    const installed = await loadInstalledModules();
    for (const moduleId of ["youtube","yandex-music"]) {
      if (!installed[moduleId]) {
        try { await installBundledModule(moduleId); } catch {}
      }
    }
  }

  if (previousSchema < 11) {
    // v0.6.0 adds only rediscoverable PWA metadata and local launch preferences;
    // pane/site schema stays compatible.
  }

  if (previousSchema < 12) {
    // v0.7.0 promotes the old flat `sites` array to a backwards-compatible
    // shortcut tree. Legacy URL entries are normalized as kind=site.
    sites = sites.map(upgradeShortcut).filter(Boolean);
  }

  if (previousSchema > 0 && previousSchema < 14) {
    // v0.8.3 refreshed the bundled YouTube adapter for existing users.
    const installed = await loadInstalledModules();
    if (installed.youtube) {
      try { await installBundledModule("youtube"); } catch {}
    }
  }

  if (previousSchema > 0 && previousSchema < 15) {
    // v0.8.4 removes the failed generic m.youtube.com iframe adapter.
    // Specific videos still use the official embed; generic YouTube pages fall
    // back to the ordinary Auto/Compatibility path that previously worked
    // better in Edge. Refresh only when YouTube was already installed.
    const installed = await loadInstalledModules();
    if (installed.youtube) {
      try { await installBundledModule("youtube"); } catch {}
    }
  }

  // If migration leaves no saved sites, Home onboarding is authoritative.
  if (!sites.length) {
    panes = structuredClone(DEFAULT_STATE.panes);
  } else if (!panes.top?.url && !panes.bottom?.url) {
    const first = firstLaunchableSite(sites);
    if (first) panes.top = paneFromSite(first);
  }

  const layout = current.layout && typeof current.layout === "object" ? {
    split:current.layout.split === true,
    ratio:clamp(Number(current.layout.ratio) || .58,.20,.80),
    activePane:current.layout.activePane === "bottom" ? "bottom" : "top"
  } : structuredClone(DEFAULT_STATE.layout);

  if (previousSchema < 7) {
    const topReady = Boolean(panes.top?.url);
    const bottomReady = Boolean(panes.bottom?.url);
    if (topReady !== bottomReady) {
      layout.split = false;
      layout.activePane = bottomReady ? "bottom" : "top";
    }
  }

  const enabled = typeof current[GLOBAL_ENABLED_KEY] === "boolean"
    ? current[GLOBAL_ENABLED_KEY]
    : true;
  const sync = current[SYNC_ENABLED_KEY] === true;

  const patch = {
    sites, panes, layout,
    schemaVersion:STATE_SCHEMA_VERSION,
    [GLOBAL_ENABLED_KEY]:enabled,
    [SYNC_ENABLED_KEY]:sync,
    [SYNC_UPDATED_AT_KEY]:Number(current[SYNC_UPDATED_AT_KEY]) || 0
  };
  await chrome.storage.local.set(patch);
  globallyEnabled = enabled;
  syncEnabled = sync;
  return {sites,panes,layout,syncEnabled:sync};
}

function upgradeShortcut(item) {
  const normalized = normalizeShortcut(item);
  if (!normalized) return null;

  if (isGroup(normalized)) {
    return {
      kind:SHORTCUT_GROUP,
      id:normalized.id,
      title:normalized.title,
      items:normalized.items.map(upgradeShortcut).filter(child => child && !isGroup(child))
    };
  }

  if (isTemplate(normalized)) {
    return {
      kind:SHORTCUT_TEMPLATE,
      id:normalized.id,
      title:normalized.title,
      top:upgradeLaunchSite(normalized.top),
      bottom:upgradeLaunchSite(normalized.bottom),
      overlap:clampOverlap(normalized.overlap)
    };
  }

  return upgradeLaunchSite(normalized);
}

function upgradeLaunchSite(site) {
  if (!site?.url) return null;
  const url = normalizeUrl(site.url);
  if (!url) return null;
  const inferred = inferDefaultsForUrl(url);
  const requestedMode = normalizeMode(site.mode || "auto");
  const requestedDomains = Array.isArray(site.compatDomains) && site.compatDomains.length
    ? site.compatDomains
    : inferred.compatDomains;
  return {
    kind:SHORTCUT_SITE,
    id:String(site.id || crypto.randomUUID()),
    title:String(site.title || url),
    url,
    mode:requestedMode,
    compatDomains:normalizeCompatDomains(requestedDomains)
  };
}

async function mutateShortcuts(message, windowId) {
  const workspaceState = await getWindowWorkspaceState(windowId);
  const sites = Array.isArray(workspaceState.workspace.sites)
    ? workspaceState.workspace.sites.map(upgradeShortcut).filter(Boolean)
    : [];
  const action = String(message.action || "");

  if (action === "reorder") {
    const sourceId = String(message.sourceId || "");
    const targetId = String(message.targetId || "");
    const sourceIndex = sites.findIndex(item => item.id === sourceId);
    if (sourceIndex < 0) throw new Error("Shortcut to move was not found");
    if (!targetId || targetId === sourceId) return saveShortcutsForWindow(windowId,sites);

    const [source] = sites.splice(sourceIndex, 1);
    let targetIndex = sites.findIndex(item => item.id === targetId);
    if (targetIndex < 0) throw new Error("Drop target was not found");
    if (message.position === "after") targetIndex += 1;
    sites.splice(targetIndex, 0, source);
    return saveShortcutsForWindow(windowId,sites);
  }

  if (action === "add-to-group") {
    const sourceId = String(message.sourceId || "");
    const groupId = String(message.groupId || "");
    const sourceIndex = sites.findIndex(item => item.id === sourceId);
    const group = sites.find(item => item.id === groupId);
    if (sourceIndex < 0 || !isGroup(group)) throw new Error("Group or shortcut was not found");
    const source = sites[sourceIndex];
    if (isGroup(source) || source.id === group.id) throw new Error("Nested groups are not supported");
    sites.splice(sourceIndex, 1);
    group.items = [...group.items, source];
    return saveShortcutsForWindow(windowId,sites);
  }

  if (action === "combine") {
    const sourceId = String(message.sourceId || "");
    const targetId = String(message.targetId || "");
    const sourceIndex = sites.findIndex(item => item.id === sourceId);
    const targetIndex = sites.findIndex(item => item.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
      throw new Error("Two different top-level shortcuts are required");
    }
    const source = sites[sourceIndex];
    const target = sites[targetIndex];
    if (isGroup(source) || isGroup(target)) throw new Error("Drop a shortcut onto a group to add it instead");

    const insertAt = Math.min(sourceIndex, targetIndex);
    const keep = sites.filter(item => item.id !== sourceId && item.id !== targetId);
    const kind = message.combineKind === "template" ? "template" : "group";
    let combined;

    if (kind === "template") {
      if (!isSite(source) || !isSite(target)) throw new Error("A template can contain exactly two normal site shortcuts");
      const topIsSource = message.topId ? String(message.topId) === sourceId : true;
      const top = cloneSite(topIsSource ? source : target);
      const bottom = cloneSite(topIsSource ? target : source);
      combined = {
        kind:SHORTCUT_TEMPLATE,
        id:crypto.randomUUID(),
        title:cleanShortcutTitle(message.title || `${top.title} + ${bottom.title}`, 100),
        top,
        bottom,
        overlap:clampOverlap(message.overlap)
      };
    } else {
      const ordered = sourceIndex < targetIndex ? [source,target] : [target,source];
      combined = {
        kind:SHORTCUT_GROUP,
        id:crypto.randomUUID(),
        title:cleanShortcutTitle(message.title || "Группа", 80),
        items:ordered
      };
    }

    keep.splice(insertAt, 0, combined);
    return saveShortcutsForWindow(windowId,keep, {createdId:combined.id});
  }

  if (action === "create-group") {
    const group = {
      kind:SHORTCUT_GROUP,
      id:crypto.randomUUID(),
      title:cleanShortcutTitle(message.title || "Группа", 80),
      items:[]
    };
    sites.push(group);
    return saveShortcutsForWindow(windowId,sites, {createdId:group.id});
  }

  if (action === "rename-group") {
    const group = sites.find(item => item.id === String(message.groupId || ""));
    if (!isGroup(group)) throw new Error("Group not found");
    group.title = cleanShortcutTitle(message.title || group.title, 80);
    return saveShortcutsForWindow(windowId,sites);
  }

  if (action === "update-site") {
    const id = String(message.id || "");
    const site = findSiteMutable(sites,id);
    if (!site) throw new Error("Site shortcut not found");
    if (message.title != null) site.title = cleanShortcutTitle(message.title || site.title,120);
    if (message.mode != null) site.mode = normalizeMode(message.mode);
    if (Array.isArray(message.compatDomains)) site.compatDomains = normalizeCompatDomains(message.compatDomains);
    return saveShortcutsForWindow(windowId,sites);
  }

  if (action === "update-template") {
    const templateId = String(message.templateId || "");
    const template = findTemplateMutable(sites, templateId);
    if (!template) throw new Error("Template not found");
    if (message.title != null) template.title = cleanShortcutTitle(message.title || template.title, 100);
    if (message.overlap != null) template.overlap = clampOverlap(message.overlap);
    if (message.swap === true) {
      const oldTop = template.top;
      template.top = template.bottom;
      template.bottom = oldTop;
    }
    return saveShortcutsForWindow(windowId,sites);
  }

  if (action === "duplicate") {
    const id = String(message.id || "");
    const index = sites.findIndex(item => item.id === id);
    if (index < 0) throw new Error("Shortcut not found");
    const copy = structuredClone(sites[index]);
    copy.id = crypto.randomUUID();
    copy.title = cleanShortcutTitle(`${copy.title} копия`, isTemplate(copy) ? 100 : 120);
    if (isTemplate(copy)) {
      copy.top.id = crypto.randomUUID();
      copy.bottom.id = crypto.randomUUID();
    }
    sites.splice(index + 1,0,copy);
    return saveShortcutsForWindow(windowId,sites,{createdId:copy.id});
  }

  if (action === "remove") {
    const id = String(message.id || "");
    const index = sites.findIndex(item => item.id === id);
    if (index < 0) throw new Error("Shortcut not found");
    sites.splice(index,1);
    return saveShortcutsForWindow(windowId,sites);
  }

  if (action === "dissolve") {
    const id = String(message.id || "");
    const index = sites.findIndex(item => item.id === id);
    if (index < 0) throw new Error("Shortcut not found");
    const item = sites[index];
    if (isGroup(item)) sites.splice(index, 1, ...item.items);
    else if (isTemplate(item)) sites.splice(index, 1, item.top, item.bottom);
    else throw new Error("Only groups and templates can be dissolved");
    return saveShortcutsForWindow(windowId,sites);
  }

  throw new Error(`Unknown shortcut action: ${action}`);
}

async function saveShortcutsForWindow(windowId, sites, extra = {}) {
  const normalized = sites.map(upgradeShortcut).filter(Boolean);
  await saveWindowWorkspaceState(windowId,{sites:normalized});
  return {sites:normalized, ...extra};
}

function findSiteMutable(items,id) {
  for (const item of items || []) {
    if (isSite(item) && item.id === id) return item;
    if (isGroup(item)) {
      const child = findSiteMutable(item.items,id);
      if (child) return child;
    }
  }
  return null;
}

function findTemplateMutable(sites, id) {
  for (const item of sites) {
    if (isTemplate(item) && item.id === id) return item;
    if (isGroup(item)) {
      const child = item.items.find(candidate => isTemplate(candidate) && candidate.id === id);
      if (child) return child;
    }
  }
  return null;
}

function cleanShortcutTitle(value, maxLength) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0,maxLength) || "Без названия";
}

function upgradePane(pane) {
  if (!pane?.url) return structuredClone(EMPTY_PANE);
  const url = normalizeUrl(pane.url);
  if (!url) return structuredClone(EMPTY_PANE);
  const inferred = inferDefaultsForUrl(url);
  return {
    url,
    title:String(pane.title || url),
    mode:resolveAutoMode(url, normalizeMode(pane.mode || inferred.mode)),
    compatDomains:normalizeCompatDomains(
      Array.isArray(pane.compatDomains) && pane.compatDomains.length
        ? pane.compatDomains
        : inferred.compatDomains
    ),
    sourceSiteId:pane.sourceSiteId ? String(pane.sourceSiteId) : null
  };
}

function paneFromSite(site, sourceId = null) {
  const inferred = inferDefaultsForUrl(site.url);
  return {
    url:site.url,
    title:site.title || site.url,
    mode:resolveAutoMode(site.url, normalizeMode(site.mode || inferred.mode)),
    compatDomains:normalizeCompatDomains(
      Array.isArray(site.compatDomains) && site.compatDomains.length
        ? site.compatDomains
        : inferred.compatDomains
    ),
    sourceSiteId:sourceId || site.id || null
  };
}

async function enableBrowserSync() {
  const local = await chrome.storage.local.get(SYNC_UPDATED_AT_KEY);
  const remote = (await chrome.storage.sync.get(SYNC_PAYLOAD_KEY))[SYNC_PAYLOAD_KEY];
  const {workspaces} = await ensureWorkspaceSystem();
  const hasLocalShortcuts = workspaces.some(workspace => workspace.sites?.length);

  if (!hasLocalShortcuts && validSyncPayload(remote)) {
    await applyRemoteSyncPayload(remote,true);
  } else {
    await pushSyncPayload();
  }
}

async function pullSyncOnStartup() {
  const remote = (await chrome.storage.sync.get(SYNC_PAYLOAD_KEY))[SYNC_PAYLOAD_KEY];
  if (!validSyncPayload(remote)) return;
  await applyRemoteSyncPayload(remote);
}

function validSyncPayload(payload) {
  return Boolean(
    payload && payload.format === "app-tower-next-sync" &&
    Number.isFinite(Number(payload.updatedAt)) &&
    (Array.isArray(payload.workspaces) || Array.isArray(payload.sites))
  );
}

function normalizeModuleMap(value) {
  const result = {};
  const candidates = Array.isArray(value)
    ? value
    : (value && typeof value === "object" ? Object.values(value) : []);
  for (const raw of candidates) {
    try {
      const manifest = validateModuleManifest(raw);
      result[manifest.id] = manifest;
    } catch {}
  }
  return result;
}

async function pushSyncPayload() {
  if (!syncEnabled || applyingRemoteSync) return;
  const [{workspaces,defaultId},local] = await Promise.all([
    ensureWorkspaceSystem(),
    chrome.storage.local.get(MODULE_STORAGE_KEY)
  ]);
  const modules = normalizeModuleMap(local[MODULE_STORAGE_KEY]);
  const updatedAt = Date.now();
  const payload = {
    format:"app-tower-next-sync",
    schemaVersion:4,
    updatedAt,
    defaultWorkspaceId:defaultId,
    workspaces:workspaces.map(workspace => ({
      id:workspace.id,
      name:workspace.name,
      sites:workspace.sites.map(upgradeShortcut).filter(Boolean),
      updatedAt:workspace.updatedAt
    })),
    modules:Object.values(modules)
  };
  await chrome.storage.local.set({[SYNC_UPDATED_AT_KEY]:updatedAt});
  await chrome.storage.sync.set({[SYNC_PAYLOAD_KEY]:payload});
}

async function applyRemoteSyncPayload(payload, force=false) {
  if (!syncEnabled || !validSyncPayload(payload)) return false;
  const localMeta = await chrome.storage.local.get(SYNC_UPDATED_AT_KEY);
  const localUpdatedAt = Number(localMeta[SYNC_UPDATED_AT_KEY]) || 0;
  if (!force && Number(payload.updatedAt) <= localUpdatedAt) return false;

  const workspaceData = await ensureWorkspaceSystem();
  const localById = new Map(workspaceData.workspaces.map(workspace => [workspace.id,workspace]));
  let nextWorkspaces = workspaceData.workspaces;

  if (Array.isArray(payload.workspaces)) {
    const remote = payload.workspaces.map(raw => {
      const id = String(raw?.id || "").slice(0,128);
      if (!id) return null;
      const local = localById.get(id);
      return normalizeWorkspace({
        id,
        name:String(raw.name || local?.name || "Workspace"),
        sites:Array.isArray(raw.sites) ? raw.sites.map(upgradeShortcut).filter(Boolean) : (local?.sites || []),
        panes:local?.panes || DEFAULT_STATE.panes,
        layout:local?.layout || DEFAULT_STATE.layout,
        createdAt:local?.createdAt || Date.now(),
        updatedAt:Number(raw.updatedAt) || Date.now()
      });
    }).filter(Boolean);
    if (remote.length) nextWorkspaces = remote;
  } else if (Array.isArray(payload.sites)) {
    // v0.7 and older sync payload: place the flat/tree shortcut list into the
    // current default workspace without losing its device-local pane state.
    const defaultId = workspaceData.defaultId;
    nextWorkspaces = workspaceData.workspaces.map(workspace => workspace.id === defaultId
      ? normalizeWorkspace({...workspace,sites:payload.sites.map(upgradeShortcut).filter(Boolean),updatedAt:Date.now()})
      : workspace);
  }

  const hasModulePayload = Array.isArray(payload.modules) || (payload.modules && typeof payload.modules === "object");
  const modules = hasModulePayload ? normalizeModuleMap(payload.modules) : null;
  const defaultWorkspaceId = nextWorkspaces.some(w => w.id === payload.defaultWorkspaceId)
    ? payload.defaultWorkspaceId
    : (nextWorkspaces.some(w => w.id === workspaceData.defaultId) ? workspaceData.defaultId : nextWorkspaces[0]?.id);

  applyingRemoteSync = true;
  try {
    const patch = {
      [WORKSPACES_KEY]:nextWorkspaces,
      [DEFAULT_WORKSPACE_KEY]:defaultWorkspaceId,
      [SYNC_UPDATED_AT_KEY]:Number(payload.updatedAt) || Date.now()
    };
    if (modules) patch[MODULE_STORAGE_KEY] = modules;
    await chrome.storage.local.set(patch);
  } finally {
    applyingRemoteSync = false;
  }
  return true;
}

async function syncCompatibilityRules(panes) {
  const [installedModules, pwaData] = await Promise.all([
    loadInstalledModules(),
    chrome.storage.local.get([PWA_PREFS_KEY, PWA_CACHE_KEY])
  ]);
  const pwaPreferences = pwaData[PWA_PREFS_KEY] || {};
  const pwaCache = pwaData[PWA_CACHE_KEY] || {};

  const domains = new Set();
  for (const pane of Object.values(panes || {})) {
    if (!paneNeedsCompatibility(pane, installedModules, pwaPreferences, pwaCache)) continue;
    for (const domain of compatibilityDomainsForPane(pane,installedModules)) domains.add(domain);
  }
  const existing = await chrome.declarativeNetRequest.getSessionRules();
  const removeRuleIds = existing.map(r => r.id);
  const addRules = [...domains].slice(0,100).map((domain,index) => ({
    id:SESSION_RULE_BASE + index,
    priority:10,
    action:{type:"modifyHeaders", responseHeaders:[
      {header:"x-frame-options",operation:"remove"},
      {header:"content-security-policy",operation:"remove"},
      {header:"content-security-policy-report-only",operation:"remove"}
    ]},
    condition:{
      initiatorDomains:[chrome.runtime.id],
      urlFilter:`||${domain}^`,
      resourceTypes:["sub_frame"]
    }
  }));
  await chrome.declarativeNetRequest.updateSessionRules({removeRuleIds,addRules});
  return {domains:[...domains], ruleIds:addRules.map(r=>r.id)};
}

function paneNeedsCompatibility(pane, installedModules, pwaPreferences = {}, pwaCache = {}) {
  const mode = normalizeMode(pane?.mode);
  if (mode === "compat") return true;
  if (mode !== "auto") return false;

  // Media embeds are already designed for framing. A declarative web renderer
  // (for example a mobile-site fallback) still needs normal Auto compatibility.
  const moduleRenderer = resolveModuleRenderer(pane?.url, installedModules);
  if (moduleRenderer?.type === "media") return false;

  const origin = safeOrigin(pane?.url);
  const pwa = origin ? pwaCache?.[origin] : null;
  if (pwa && pwaPreferences?.[origin] === "sidecar") {
    // In PWA sidecar preference the pane does not load the site iframe at all.
    return false;
  }

  try {
    const u = new URL(pane?.url || "");
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
function compatibilityDomainsForPane(pane, installedModules = {}) {
  const domains = normalizeCompatDomains(pane.compatDomains || []);
  try { const host = new URL(pane.url).hostname.toLowerCase(); if (host) domains.push(host); } catch {}
  try {
    const renderer = resolveModuleRenderer(pane?.url,installedModules);
    if (renderer?.type === "web" && renderer.src) {
      const host = new URL(renderer.src).hostname.toLowerCase();
      if (host) domains.push(host);
    }
  } catch {}
  return [...new Set(domains)];
}
function inferDefaultsForUrl(url) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host === "translate.yandex.ru" || host.endsWith(".translate.yandex.ru")) {
      return {mode:"auto",compatDomains:["yandex.ru","ya.ru"]};
    }
  } catch {}
  return {mode:"auto",compatDomains:[]};
}
function normalizeCompatDomains(values) {
  const result=[];
  for (const raw of values || []) {
    const text=String(raw||"").trim().toLowerCase(); if(!text) continue;
    try { const url=new URL(text.includes("://")?text:`https://${text.replace(/^\.+/,"")}`); const host=url.hostname.toLowerCase(); if(host && !result.includes(host)) result.push(host); } catch {}
    if(result.length>=20) break;
  }
  return result;
}
function resolveAutoMode(url, mode) {
  // Auto stays Auto in persisted/UI state. Renderer/header decisions happen at
  // runtime; they are no longer encoded by silently rewriting A into C.
  return normalizeMode(mode);
}
function normalizeMode(mode) { return RENDER_MODES.has(mode) ? mode : "auto"; }
function normalizeUrl(value) {
  let input=String(value||"").trim(); if(!input) return null;
  if(!/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(input)) input="https://"+input;
  try { const u=new URL(input); return ["http:","https:"].includes(u.protocol) ? u.href : null; } catch { return null; }
}

function findPaneForUrl(panes, url) {
  for (const name of ["top","bottom"]) {
    const current = panes?.[name]?.url;
    if (!current) continue;
    if (current === url) return name;
    try { if (new URL(current).origin === new URL(url).origin) return name; } catch {}
  }
  return null;
}
function clamp(v,min,max){return Math.min(max,Math.max(min,v));}
