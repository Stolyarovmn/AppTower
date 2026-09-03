import { applyBrowserSkin } from "../shared/browser-adapter.js";

import {
  THEME_MODE_KEY,
  ACCENT_MODE_KEY,
  ACCENT_COLOR_KEY,
  DEFAULT_ACCENT,
  normalizeThemeSettings,
  normalizeHexColor,
  readThemeSettings,
  applyThemeToDocument,
  watchSystemTheme
} from "../shared/theme.js";

import {
  SHORTCUT_SITE,
  SHORTCUT_GROUP,
  SHORTCUT_TEMPLATE,
  DEFAULT_TEMPLATE_OVERLAP,
  normalizeShortcut,
  normalizeShortcutList,
  groupInitials,
  isSite,
  isGroup,
  isTemplate,
  clampOverlap,
  findShortcutDeep,
  firstLaunchableSite,
  collectLaunchSites
} from "../shared/shortcuts.js";

import {
  MODULE_STORAGE_KEY,
  loadModuleCatalog,
  loadInstalledModules,
  installBundledModule,
  installModuleManifest,
  uninstallModule,
  validateModuleManifest,
  resolveModuleRenderer,
  findCatalogCandidates
} from "../modules/module-registry.js";

applyBrowserSkin(document);
const __atnWindow = await chrome.windows.getCurrent();
const __atnParams = new URLSearchParams(location.search);
const __atnHostWindowId = Number.isInteger(Number(__atnParams.get("hostWindowId")))
  ? Number(__atnParams.get("hostWindowId"))
  : __atnWindow.id;
let __atnPanelPort = null;
let __atnPanelReconnectTimer = null;
function __atnConnectPanelPort() {
  clearTimeout(__atnPanelReconnectTimer);
  if (__atnPanelPort) return;
  try {
    const port = chrome.runtime.connect({ name: `ATN_SIDE_PANEL:${__atnHostWindowId}` });
    __atnPanelPort = port;
    port.onMessage.addListener(message => {
      if (message?.type === "ATN_WORKSPACE_CHANGED") {
        const switched = Boolean(message.workspaceId && message.workspaceId !== state.workspaceId);
        loadState().then(() => {
          if (switched) state.sleepingPanes.clear();
          renderAll(false);
        }).catch(() => {});
      }
      if (message?.type === "ATN_SLEEP_PANE" && ["top","bottom"].includes(message.pane)) {
        sleepPane(message.pane,message.reason || "idle");
      }
    });
    port.onDisconnect.addListener(() => {
      if (__atnPanelPort === port) __atnPanelPort = null;
      __atnPanelReconnectTimer = setTimeout(__atnConnectPanelPort, 120);
    });
  } catch {
    __atnPanelReconnectTimer = setTimeout(__atnConnectPanelPort, 300);
  }
}
__atnConnectPanelPort();

const MODE_ORDER = ["auto", "secure", "compat", "real"];
const MODE_META = {
  auto: { label: "A", title: "Auto: default mode; chooses a compact media renderer when available, otherwise scoped Compatibility" },
  secure: { label: "S", title: "Secure: normal iframe, security headers unchanged" },
  compat: { label: "C", title: "Compatibility: remove frame-blocking headers for configured domains" },
  real: { label: "R", title: "Real Page: top-level page in separate browser window/tab" }
};

const state = {
  sites: [],
  panes: {
    top: { url:"", title:"", mode:"auto", compatDomains:[], sourceSiteId:null },
    bottom: { url:"", title:"", mode:"auto", compatDomains:[], sourceSiteId:null }
  },
  layout: { split:false, ratio:0.58, activePane:"top" },
  focus: null,
  syncEnabled: false,
  moduleCatalog: [],
  installedModules: {},
  pwaCache: {},
  pwaPreferences: {},
  workspaceId:null,
  workspaceName:"",
  workspaces:[],
  recent:[],
  sleepingPanes:new Set(),
  mediaStates:[],
  siteSettings:{},
  lastInteractedPane:"top",
  theme: {
    themeMode:"system",
    accentMode:"system",
    accentColor:DEFAULT_ACCENT
  }
};

const workspace = document.getElementById("workspace");
const homeView = document.getElementById("home-view");
const homeAddCurrent = document.getElementById("home-add-current");
const homeAddCustom = document.getElementById("home-add-custom");
const homeImport = document.getElementById("home-import");
const homeSync = document.getElementById("home-sync");
const splitter = document.getElementById("splitter");
const collapsePanelButton = document.getElementById("collapse-panel");
const toggleSplit = document.getElementById("toggle-split");
const workspaceSelect = document.getElementById("workspace-select");
const panelSites = document.getElementById("panel-sites");
const panelSitesScroll = document.getElementById("panel-sites-scroll");
const railScrollUp = document.getElementById("rail-scroll-up");
const railScrollDown = document.getElementById("rail-scroll-down");
const railAdd = document.getElementById("rail-add");
const railNewGroup = document.getElementById("rail-new-group");
const railSettings = document.getElementById("rail-settings");
const railSearch = document.getElementById("rail-search");
const railMedia = document.getElementById("rail-media");
const searchDialog = document.getElementById("search-dialog");
const searchInput = document.getElementById("search-input");
const searchResults = document.getElementById("search-results");
const searchClose = document.getElementById("search-close");
const shortcutMenu = document.getElementById("shortcut-menu");
const siteDialog = document.getElementById("site-dialog");
const siteForm = document.getElementById("site-form");
const titleInput = document.getElementById("site-title");
const siteUrlInput = document.getElementById("site-url");
const siteSourceHint = document.getElementById("site-source-hint");
const siteSourceSwitch = document.getElementById("site-source-switch");
const siteSourceButtons = [...siteSourceSwitch.querySelectorAll("button[data-source]")];
const siteMode = document.getElementById("site-mode");
const compatDomainsRow = document.getElementById("compat-domains-row");
const siteCompatDomains = document.getElementById("site-compat-domains");
const settingsDialog = document.getElementById("settings-dialog");
const settingsThemeMode = document.getElementById("settings-theme-mode");
const settingsAccentMode = document.getElementById("settings-accent-mode");
const settingsAccentColor = document.getElementById("settings-accent-color");
const settingsThemeReset = document.getElementById("settings-theme-reset");
const settingsSingle = document.getElementById("settings-single");
const settingsResetSplit = document.getElementById("settings-reset-split");
const settingsCollapse = document.getElementById("settings-collapse");
const cancelSite = document.getElementById("cancel-site");
const clearSite = document.getElementById("clear-site");
const settingsSync = document.getElementById("settings-sync");
const settingsExport = document.getElementById("settings-export");
const settingsImport = document.getElementById("settings-import");
const settingsModules = document.getElementById("settings-modules");
const settingsModuleImport = document.getElementById("settings-module-import");
const settingsPwaList = document.getElementById("settings-pwa-list");
const settingsPwaClear = document.getElementById("settings-pwa-clear");
const pwaDialog = document.getElementById("pwa-dialog");
const pwaDialogIcon = document.getElementById("pwa-dialog-icon");
const pwaDialogName = document.getElementById("pwa-dialog-name");
const pwaDialogMeta = document.getElementById("pwa-dialog-meta");
const pwaSidecarDefault = document.getElementById("pwa-sidecar-default");
const pwaDialogShortcuts = document.getElementById("pwa-dialog-shortcuts");
const pwaOpenApp = document.getElementById("pwa-open-app");
let pwaDialogPane = null;
const shortcutChooserDialog = document.getElementById("shortcut-chooser-dialog");
const shortcutChooserTitle = document.getElementById("shortcut-chooser-title");
const shortcutChooserCopy = document.getElementById("shortcut-chooser-copy");
const shortcutChooserList = document.getElementById("shortcut-chooser-list");
let shortcutChooserResolve = null;
const organizeDialog = document.getElementById("organize-dialog");
const organizeGroupButton = document.getElementById("organize-group");
const organizeTemplateButton = document.getElementById("organize-template");
const combineDialog = document.getElementById("combine-dialog");
const combineSummary = document.getElementById("combine-summary");
const combineTemplateButton = document.getElementById("combine-template");
const combineGroupButton = document.getElementById("combine-group");
const groupDialog = document.getElementById("group-dialog");
const groupDialogTitle = document.getElementById("group-dialog-title");
const groupDialogIcon = document.getElementById("group-dialog-icon");
const groupNameInput = document.getElementById("group-name");
const groupItemsHost = document.getElementById("group-items");
const groupSaveButton = document.getElementById("group-save");
const groupDissolveButton = document.getElementById("group-dissolve");
const templateDialog = document.getElementById("template-dialog");
const templatePreview = document.getElementById("template-preview");
const templateTopName = document.getElementById("template-top-name");
const templateBottomName = document.getElementById("template-bottom-name");
const templateNameInput = document.getElementById("template-name");
const templateOverlapInput = document.getElementById("template-overlap");
const templateOverlapValue = document.getElementById("template-overlap-value");
const templateSwapButton = document.getElementById("template-swap");
const templateSaveButton = document.getElementById("template-save");
const templateDissolveButton = document.getElementById("template-dissolve");
let pendingCombine = null;
let groupCombineDraft = null;
let activeGroupId = null;
let activeTemplateId = null;
let draftTemplate = null;
const moduleFile = document.getElementById("module-file");
const siteModuleSuggestion = document.getElementById("site-module-suggestion");
const importFile = document.getElementById("import-file");
const importDialog = document.getElementById("import-dialog");
const importSummary = document.getElementById("import-summary");
const importMerge = document.getElementById("import-merge");
const importReplace = document.getElementById("import-replace");
let pendingImport = null;

const paneEls = {
  top: document.querySelector('.pane[data-pane="top"]'),
  bottom: document.querySelector('.pane[data-pane="bottom"]')
};
const paneMetaPersistTimers = new Map();

const hasFluentIcons = Boolean(document.fonts?.check?.('16px "Segoe Fluent Icons"') || document.fonts?.check?.('16px "Segoe MDL2 Assets"'));
document.documentElement.classList.toggle("no-fluent-icons", !hasFluentIcons);

const EMBED_INIT_MESSAGE = "ATN_EMBED_INIT_V025";
const EMBED_INTERACTION_MESSAGE = "ATN_EMBED_INTERACTION_V027";
const EMBED_META_MESSAGE = "ATN_EMBED_META_V082";
const PWA_DISCOVERY_MESSAGE = "ATN_PWA_MANIFEST_LINK_V060";
const PWA_CACHE_KEY = "atnPwaCacheV1";
const PWA_PREFS_KEY = "atnPwaPreferencesV1";

// Pointer/focus events inside a cross-origin iframe do not bubble into the
// extension page. The all-frames content script bridges those interactions via
// postMessage so clicking/typing in a website selects the pane naturally.
window.addEventListener("message", (event) => {
  if (event.data?.type === EMBED_INTERACTION_MESSAGE) {
    for (const [name, pane] of Object.entries(paneEls)) {
      const frames = pane.querySelectorAll('iframe[data-role="frame"], iframe[data-role="media-frame"]');
      for (const frame of frames) {
        if (event.source === frame?.contentWindow) {
          activatePane(name).catch(() => {});
          return;
        }
      }
    }
    return;
  }

  if (event.data?.type === EMBED_META_MESSAGE) {
    for (const [name,paneEl] of Object.entries(paneEls)) {
      const frame = paneEl.querySelector('iframe[data-role="frame"]');
      if (event.source !== frame?.contentWindow) continue;

      const url = normalizeUrl(event.data.href);
      if (!url) return;
      const pane = state.panes[name];
      if (!pane) return;

      const oldUrl = normalizeUrl(pane.url);
      const title = titleForUrl(url,event.data.title || pane.title);
      const changed = oldUrl !== url || pane.title !== title;
      if (!changed) return;

      pane.url = url;
      pane.title = title;
      if (oldUrl !== url) pane.sourceSiteId = null;

      const input = paneEl.querySelector('[data-role="url"]');
      if (document.activeElement !== input) input.value = url;
      updatePaneShortcutButton(paneEl,pane);

      const oldTimer = paneMetaPersistTimers.get(name);
      if (oldTimer) clearTimeout(oldTimer);
      const timer = setTimeout(async () => {
        paneMetaPersistTimers.delete(name);
        try {
          await persistWorkspaceState({panes:state.panes});
          await syncCompatRules();
          await chrome.runtime.sendMessage({
            type:"RECORD_RECENT",windowId:__atnHostWindowId,url,title,kind:"site"
          }).catch(()=>{});
        } catch {}
      },250);
      paneMetaPersistTimers.set(name,timer);
      return;
    }
  }

  if (event.data?.type === PWA_DISCOVERY_MESSAGE) {
    setTimeout(() => {
      loadPwaState().then(() => renderAll(false)).catch(() => {});
    }, 120);
  }
});
for (const pane of Object.values(paneEls)) {
  for (const frame of pane.querySelectorAll('iframe[data-role="frame"], iframe[data-role="media-frame"]')) {
    frame.addEventListener("load", () => {
      try { frame.contentWindow?.postMessage({ type:EMBED_INIT_MESSAGE }, "*"); } catch {}
      setTimeout(() => {
        try { frame.contentWindow?.postMessage({ type:EMBED_INIT_MESSAGE }, "*"); } catch {}
      }, 250);
    });
  }
}

// A blocked iframe (X-Frame-Options/CSP error document) never runs our
// all-frames content script, so the postMessage bridge above cannot fire.
// Chromium still focuses the <iframe> element itself when the user clicks that
// error surface. Detect that focus transition and activate the pane normally.
function activatePaneFromFocusedFrame() {
  const active = document.activeElement;
  for (const [name, pane] of Object.entries(paneEls)) {
    for (const frame of pane.querySelectorAll('iframe[data-role="frame"], iframe[data-role="media-frame"]')) {
      if (active === frame) {
        activatePane(name).catch(() => {});
        return true;
      }
    }
  }
  return false;
}

window.addEventListener("blur", () => {
  // activeElement is updated just after the blur event in Chromium.
  queueMicrotask(activatePaneFromFocusedFrame);
  setTimeout(activatePaneFromFocusedFrame, 0);
}, true);

document.addEventListener("focusin", () => {
  activatePaneFromFocusedFrame();
}, true);

for (const [name, pane] of Object.entries(paneEls)) {
  for (const frame of pane.querySelectorAll('iframe[data-role="frame"], iframe[data-role="media-frame"]')) {
    frame.addEventListener("focus", () => activatePane(name).catch(() => {}));
  }
}

await loadThemeState();
await loadState();
await loadModuleState();
await loadPwaState();
await syncCompatRules();
renderAll();
await consumePendingAction();

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  let rerender = false;
  if (changes.atnWorkspacesV1) {
    const list = Array.isArray(changes.atnWorkspacesV1.newValue) ? changes.atnWorkspacesV1.newValue : [];
    state.workspaces = list.map(item => ({id:item?.id,name:item?.name || "Workspace"})).filter(item => item.id);
    const current = list.find(item => item?.id === state.workspaceId);
    if (current) {
      state.workspaceName = current.name || state.workspaceName;
      state.sites = normalizeShortcutList(current.sites || []);
      updateWorkspaceControl();
      renderPanelRail();
    }
  }
  if (changes.atnSyncEnabled) { state.syncEnabled = changes.atnSyncEnabled.newValue === true; updateSyncControls(); }
  if (changes[THEME_MODE_KEY] || changes[ACCENT_MODE_KEY] || changes[ACCENT_COLOR_KEY]) {
    loadThemeState().catch(() => {});
  }
  if (changes[PWA_CACHE_KEY] || changes[PWA_PREFS_KEY]) {
    loadPwaState().then(() => {
      renderAll(false);
      renderPwaSettings();
      if (pwaDialog.open && pwaDialogPane) populatePwaDialog(pwaDialogPane);
    }).catch(() => {});
  }
  if (changes[MODULE_STORAGE_KEY]) {
    loadModuleState().then(async () => {
      await syncCompatRules();
      renderAll(true);
      renderModuleManager();
      renderSiteModuleSuggestion();
    }).catch(() => {});
  }
  if (changes.pendingAction?.newValue) handlePendingAction(changes.pendingAction.newValue).catch(() => {});
  if (rerender) renderAll();
});

async function loadThemeState() {
  state.theme = await readThemeSettings();
  applyThemeToDocument(state.theme);
  updateThemeControls();
}

function updateThemeControls() {
  if (!settingsThemeMode) return;
  settingsThemeMode.value = state.theme.themeMode;
  settingsAccentMode.value = state.theme.accentMode;
  settingsAccentColor.value = normalizeHexColor(state.theme.accentColor) || DEFAULT_ACCENT;
  settingsAccentColor.disabled = state.theme.accentMode !== "custom";
}

async function persistTheme(patch = {}) {
  const next = normalizeThemeSettings({
    [THEME_MODE_KEY]:patch.themeMode ?? state.theme.themeMode,
    [ACCENT_MODE_KEY]:patch.accentMode ?? state.theme.accentMode,
    [ACCENT_COLOR_KEY]:patch.accentColor ?? state.theme.accentColor
  });

  state.theme = next;
  applyThemeToDocument(next);
  updateThemeControls();

  await chrome.storage.local.set({
    [THEME_MODE_KEY]:next.themeMode,
    [ACCENT_MODE_KEY]:next.accentMode,
    [ACCENT_COLOR_KEY]:next.accentColor
  });
}

watchSystemTheme(() => {
  if (state.theme.themeMode === "system" || state.theme.accentMode === "system") {
    applyThemeToDocument(state.theme);
  }
});

async function loadState() {
  const response = await chrome.runtime.sendMessage({ type:"GET_STATE", windowId:__atnHostWindowId });
  if (response?.sites) state.sites = normalizeShortcutList(response.sites);
  if (response?.panes) state.panes = response.panes;
  if (response?.layout) state.layout = response.layout;
  state.workspaceId = response?.workspaceId || state.workspaceId;
  state.workspaceName = response?.workspaceName || "";
  state.workspaces = Array.isArray(response?.workspaces) ? response.workspaces : state.workspaces;
  state.syncEnabled = response?.syncEnabled === true;
  updateWorkspaceControl();
  updateSyncControls();
}

async function loadModuleState() {
  try {
    const [catalog, installed] = await Promise.all([
      loadModuleCatalog(),
      loadInstalledModules()
    ]);
    state.moduleCatalog = catalog;
    state.installedModules = installed;
  } catch {
    state.moduleCatalog = [];
    state.installedModules = await loadInstalledModules().catch(() => ({}));
  }
}

async function loadPwaState() {
  const data = await chrome.storage.local.get([PWA_CACHE_KEY, PWA_PREFS_KEY]);
  const rawCache = data[PWA_CACHE_KEY];
  const rawPrefs = data[PWA_PREFS_KEY];
  state.pwaCache = rawCache && typeof rawCache === "object" && !Array.isArray(rawCache)
    ? rawCache
    : {};
  state.pwaPreferences = rawPrefs && typeof rawPrefs === "object" && !Array.isArray(rawPrefs)
    ? rawPrefs
    : {};
}

function updateWorkspaceControl() {
  if (!workspaceSelect) return;
  const active = state.workspaceId;
  workspaceSelect.replaceChildren();
  for (const workspace of state.workspaces || []) {
    const option = document.createElement("option");
    option.value = workspace.id;
    option.textContent = workspace.name;
    option.selected = workspace.id === active;
    workspaceSelect.append(option);
  }
  workspaceSelect.title = state.workspaceName ? `Workspace: ${state.workspaceName}` : "Workspace";
}

workspaceSelect?.addEventListener("change", async () => {
  const id = workspaceSelect.value;
  const response = await chrome.runtime.sendMessage({type:"SET_ACTIVE_WORKSPACE",windowId:__atnHostWindowId,workspaceId:id});
  if (!response?.ok) return;
  state.sleepingPanes.clear();
  await loadState();
  await syncCompatRules();
  renderAll(false);
});

function renderAll(forceReload = false) {
  const onboarding = !firstLaunchableSite(state.sites);
  homeView.classList.toggle("hidden", !onboarding);
  workspace.classList.toggle("hidden", onboarding);
  toggleSplit.disabled = onboarding;

  state.layout.ratio = clamp(Number(state.layout.ratio) || 0.58, 0.20, 0.80);
  workspace.style.setProperty("--split-y", `${state.layout.ratio * 100}%`);
  workspace.dataset.layout = state.focus
    ? `focus-${state.focus}`
    : (state.layout.split ? "split" : `single-${state.layout.activePane === "bottom" ? "bottom" : "top"}`);

  updateLayoutButton();
  if (!onboarding) {
    const visiblePanes = state.focus
      ? new Set([state.focus])
      : (state.layout.split
          ? new Set(["top","bottom"])
          : new Set([state.layout.activePane === "bottom" ? "bottom" : "top"]));

    for (const name of ["top","bottom"]) {
      if (visiblePanes.has(name)) renderPane(name, forceReload);
      else parkHiddenPane(name);
    }
  }
  renderPanelRail();
  updateSyncControls();
}

function parkHiddenPane(name) {
  const el = paneEls[name];
  if (!el) return;
  const frame = el.querySelector('iframe[data-role="frame"]');
  const mediaView = el.querySelector('[data-role="media-view"]');
  const mediaFrame = el.querySelector('iframe[data-role="media-frame"]');
  const pwaView = el.querySelector('[data-role="pwa-view"]');
  const sleepView = el.querySelector('[data-role="sleep-view"]');
  const wrap = el.querySelector('.frame-wrap');

  frame?.removeAttribute("src");
  if (frame) frame.dataset.current = "";
  mediaFrame?.removeAttribute("src");
  if (mediaFrame) mediaFrame.dataset.current = "";
  if (mediaFrame) applyMediaLayout(mediaFrame,{});

  wrap?.classList.remove("is-real","is-media","is-pwa","is-sleep");
  mediaView?.setAttribute("aria-hidden","true");
  pwaView?.setAttribute("aria-hidden","true");
  sleepView?.setAttribute("aria-hidden","true");

  clearPaneMedia(name);
  releasePaneResource(name);
}

function updatePaneShortcutButton(el,pane) {
  const saveShortcutButton = el?.querySelector('[data-action="save-shortcut"]');
  if (!saveShortcutButton) return;

  const paneUrl = normalizeUrl(pane?.url);
  const paneAlreadySaved = paneUrl
    ? collectLaunchSites(state.sites).some(site => normalizeUrl(site.url) === paneUrl)
    : false;

  saveShortcutButton.classList.toggle("hidden", !paneUrl);
  saveShortcutButton.classList.toggle("saved", paneAlreadySaved);
  saveShortcutButton.disabled = false;
  saveShortcutButton.title = paneAlreadySaved
    ? "Этот сайт уже есть в ярлыках · добавить ещё один"
    : "Добавить текущий сайт в ярлыки";
}

function renderPane(name, forceReload = false) {
  const el = paneEls[name];
  const pane = state.panes[name] || { url:"", title:"", mode:"auto", compatDomains:[] };
  const input = el.querySelector('[data-role="url"]');
  const frame = el.querySelector('iframe[data-role="frame"]');
  const mediaView = el.querySelector('[data-role="media-view"]');
  const mediaFrame = el.querySelector('iframe[data-role="media-frame"]');
  const pwaView = el.querySelector('[data-role="pwa-view"]');
  const sleepView = el.querySelector('[data-role="sleep-view"]');
  const wrap = el.querySelector('.frame-wrap');
  const modeButton = el.querySelector('[data-action="mode"]');
  const pwaButton = el.querySelector('[data-action="pwa"]');

  el.classList.toggle("active", state.layout.activePane === name);
  if (document.activeElement !== input) input.value = pane.url || "";

  const mode = normalizeMode(pane.mode);
  const meta = MODE_META[mode];
  modeButton.textContent = meta.label;
  modeButton.title = `${meta.title}\nClick: next mode · Shift+Click: previous mode`;
  modeButton.className = `mode-button mode-${mode}`;

  updatePaneShortcutButton(el,pane);

  const pwa = getPwaForUrl(pane.url);
  const moduleRenderer = mode === "auto"
    ? resolveModuleRenderer(pane.url, state.installedModules)
    : null;
  const pwaActionAvailable = Boolean(pwa && !moduleRenderer);
  pwaButton.classList.toggle("hidden", !pwaActionAvailable);
  pwaButton.title = pwaActionAvailable
    ? `${pwa.name || pwa.shortName || "Web App"} · открыть параметры приложения`
    : "Web App Manifest не найден или URL обрабатывается установленным модулем";

  const sleeping = state.sleepingPanes.has(name) && Boolean(pane.url);
  wrap.classList.toggle("is-sleep", sleeping);
  if (sleeping) {
    wrap.classList.remove("is-real","is-media","is-pwa");
    frame.removeAttribute("src"); frame.dataset.current = "";
    mediaFrame.removeAttribute("src"); mediaFrame.dataset.current = "";
    sleepView?.setAttribute("aria-hidden","false");
    pwaView?.setAttribute("aria-hidden","true");
    mediaView?.setAttribute("aria-hidden","true");
    applyMediaLayout(mediaFrame,{});
    return;
  }
  sleepView?.setAttribute("aria-hidden","true");

  const renderer = resolveRenderer(pane);
  wrap.classList.toggle("is-real", renderer.type === "real");
  wrap.classList.toggle("is-media", renderer.type === "media");
  wrap.classList.toggle("is-pwa", renderer.type === "pwa");

  if (renderer.type === "real") {
    frame.removeAttribute("src"); frame.dataset.current = "";
    mediaFrame.removeAttribute("src"); mediaFrame.dataset.current = "";
    applyMediaLayout(mediaFrame, {});
    pwaView.setAttribute("aria-hidden", "true");
    clearPaneMedia(name);
    releasePaneResource(name);
    return;
  }

  if (renderer.type === "media") {
    frame.removeAttribute("src"); frame.dataset.current = "";
    pwaView.setAttribute("aria-hidden", "true");
    mediaView.dataset.service = renderer.serviceKey || renderer.moduleId || "module";
    mediaView.dataset.kind = renderer.kind || "media";
    mediaView.setAttribute("aria-hidden", "false");
    applyMediaLayout(mediaFrame, renderer.layout);
    if (forceReload || mediaFrame.dataset.current !== renderer.src) {
      mediaFrame.dataset.current = renderer.src;
      mediaFrame.src = renderer.src;
    }
    applySiteZoom(mediaFrame,pane.url);
    reportPaneResource(name,pane,renderer,true);
    reportPaneMedia(name,pane,renderer);
    return;
  }

  if (renderer.type === "pwa") {
    frame.removeAttribute("src"); frame.dataset.current = "";
    mediaView.setAttribute("aria-hidden", "true");
    mediaFrame.removeAttribute("src"); mediaFrame.dataset.current = "";
    applyMediaLayout(mediaFrame, {});
    renderPwaView(name, renderer.pwa);
    pwaView.setAttribute("aria-hidden", "false");
    clearPaneMedia(name);
    releasePaneResource(name);
    return;
  }

  pwaView.setAttribute("aria-hidden", "true");
  mediaView.setAttribute("aria-hidden", "true");
  applyMediaLayout(mediaFrame, {});
  mediaFrame.removeAttribute("src"); mediaFrame.dataset.current = "";
  if (forceReload || frame.dataset.current !== renderer.src) {
    frame.dataset.current = renderer.src;
    frame.src = renderer.src;
  }
  applySiteZoom(frame,pane.url);
  clearPaneMedia(name);
  reportPaneResource(name,pane,renderer,false);
}

function sleepPane(name, reason="idle-5m") {
  if (!["top","bottom"].includes(name)) return;
  state.sleepingPanes.add(name);
  const view = paneEls[name]?.querySelector('[data-role="sleep-view"]');
  const text = view?.querySelector('[data-role="sleep-reason"]');
  if (text) text.textContent = reason === "hard-cap"
    ? "Выгружена из-за лимита живых pane."
    : "Не использовалась 5 минут.";
  clearPaneMedia(name);
  renderPane(name,false);
}

function wakePane(name) {
  state.sleepingPanes.delete(name);
  touchPaneResource(name);
  renderPane(name,true);
}

async function applySiteZoom(frame,url) {
  if (!url || !frame) return;
  try {
    const response = await chrome.runtime.sendMessage({type:"GET_SITE_SETTINGS",windowId:__atnHostWindowId,url});
    const zoom = Math.min(150,Math.max(60,Number(response?.settings?.zoom)||100));
    const scale = zoom / 100;
    frame.style.zoom = `${zoom}%`;
    frame.style.width = scale === 1 ? "100%" : `${100/scale}%`;
    frame.style.height = scale === 1 ? "100%" : `${100/scale}%`;
  } catch {}
}

function reportPaneResource(name,pane,renderer,keepAlive=false) {
  if (!pane?.url) return;
  chrome.runtime.sendMessage({
    type:"PANE_LIVE",windowId:__atnHostWindowId,pane:name,url:pane.url,
    renderer:renderer?.type || "iframe",keepAlive:Boolean(keepAlive)
  }).catch(()=>{});
}

function touchPaneResource(name) {
  chrome.runtime.sendMessage({type:"PANE_ACTIVITY",windowId:__atnHostWindowId,pane:name}).catch(()=>{});
}

function releasePaneResource(name) {
  chrome.runtime.sendMessage({type:"PANE_RELEASE",windowId:__atnHostWindowId,pane:name}).catch(()=>{});
}

function reportPaneMedia(name,pane,renderer) {
  const provider = renderer?.serviceKey || renderer?.moduleId || "media";
  state.mediaStates = state.mediaStates.filter(item => item.pane !== name);
  state.mediaStates.push({pane:name,provider,title:pane.title || pane.url,controllable:false,playing:false});
  railMedia?.classList.remove("hidden");
  railMedia.title = `${provider}: ${pane.title || pane.url}`;
  chrome.runtime.sendMessage({type:"MEDIA_STATE",windowId:__atnHostWindowId,state:{pane:name,provider,title:pane.title || pane.url,playing:false,controllable:false,capabilities:[]}}).catch(()=>{});
}

function clearPaneMedia(name) {
  const had = state.mediaStates.some(item => item.pane === name);
  state.mediaStates = state.mediaStates.filter(item => item.pane !== name);
  if (!state.mediaStates.length) railMedia?.classList.add("hidden");
  if (had) chrome.runtime.sendMessage({type:"MEDIA_CLEAR",windowId:__atnHostWindowId,pane:name}).catch(()=>{});
}

function resolveRenderer(pane) {
  const mode = normalizeMode(pane.mode);
  const url = pane.url || "about:blank";

  if (mode === "real") return { type:"real", note:"" };

  if (mode === "auto") {
    // Specialized modules win over generic PWA handling.
    const moduleRenderer = resolveModuleRenderer(url, state.installedModules);
    if (moduleRenderer) return moduleRenderer;

    const pwa = getPwaForUrl(url);
    if (pwa && getPwaPreference(url) === "sidecar") {
      return { type:"pwa", pwa };
    }
  }

  return { type:"iframe", src:url };
}

function originForUrl(value) {
  try {
    const url = new URL(String(value || ""));
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    return url.origin;
  } catch {
    return "";
  }
}

function getPwaForUrl(value) {
  const origin = originForUrl(value);
  if (!origin) return null;
  const pwa = state.pwaCache?.[origin];
  return pwa && pwa.origin === origin ? pwa : null;
}

function getPwaPreference(value) {
  const origin = originForUrl(value);
  return origin && state.pwaPreferences?.[origin] === "sidecar"
    ? "sidecar"
    : "pane";
}

function bestPwaIcon(pwa) {
  const icons = Array.isArray(pwa?.icons) ? pwa.icons : [];
  if (!icons.length) return "";
  const scored = icons.map(icon => {
    let score = 0;
    for (const part of String(icon.sizes || "").split(/\s+/)) {
      const match = /^(\d+)x(\d+)$/.exec(part);
      if (match) score = Math.max(score, Math.min(Number(match[1]), Number(match[2])));
    }
    return {src:icon.src, score};
  });
  scored.sort((a,b) => b.score - a.score);
  return scored[0]?.src || icons[0]?.src || "";
}

function renderPwaView(name, pwa) {
  const el = paneEls[name];
  const view = el.querySelector('[data-role="pwa-view"]');
  const icon = view.querySelector('[data-role="pwa-icon"]');
  const title = view.querySelector('[data-role="pwa-name"]');
  const meta = view.querySelector('[data-role="pwa-meta"]');
  const shortcuts = view.querySelector('[data-role="pwa-shortcuts"]');

  title.textContent = pwa.name || pwa.shortName || "Web App";
  meta.textContent = `Web App Manifest · ${pwa.display || "browser"} · top-level sidecar`;

  const iconUrl = bestPwaIcon(pwa);
  icon.classList.toggle("hidden", !iconUrl);
  if (iconUrl && icon.src !== iconUrl) icon.src = iconUrl;

  shortcuts.replaceChildren();
  for (const shortcut of (pwa.shortcuts || []).slice(0, 5)) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "pwa-shortcut";
    button.textContent = shortcut.name || shortcut.shortName || "Shortcut";
    button.title = shortcut.description || shortcut.url;
    button.addEventListener("click", () => {
      openPwaSidecar(name, shortcut.url).catch(error => alert(String(error?.message || error)));
    });
    shortcuts.append(button);
  }
}

function applyMediaLayout(frame, layout = {}) {
  frame.style.height = "";
  frame.style.minHeight = "";
  frame.style.maxHeight = "";
  frame.style.aspectRatio = "";

  if (layout.height === "fill") {
    frame.style.height = "100%";
  } else if (Number.isFinite(Number(layout.height))) {
    frame.style.height = `${Math.round(Number(layout.height))}px`;
  }

  if (layout.aspectRatio) {
    frame.style.height = "auto";
    frame.style.aspectRatio = layout.aspectRatio;
  }
}

function updateLayoutButton() {
  let layout = "split";
  if (!state.layout.split) layout = state.layout.activePane === "bottom" ? "single-bottom" : "single-top";
  toggleSplit.dataset.layout = layout;
  toggleSplit.setAttribute("aria-pressed", String(Boolean(state.layout.split)));
  toggleSplit.title = state.layout.split
    ? "Показаны две области · нажмите для одной"
    : "Показана одна область · нажмите для двух";
}

function faviconURL(url) {
  const favicon = new URL("/_favicon/", chrome.runtime.getURL("/"));
  favicon.searchParams.set("pageUrl", url);
  favicon.searchParams.set("size", "32");
  return favicon.href;
}

function fallback(title, className = "rail-fallback") {
  const el = document.createElement("span");
  el.className = className;
  el.textContent = (title || "?").trim().slice(0,1).toUpperCase();
  return el;
}

function faviconElement(site, className = "") {
  const img = document.createElement("img");
  if (className) img.className = className;
  img.alt = "";
  img.draggable = false;
  img.src = faviconURL(site.url);
  img.addEventListener("error", () => {
    const replacement = fallback(site.title, `template-fallback ${className}`.trim());
    img.replaceWith(replacement);
  }, { once:true });
  return img;
}

function templateStackElement(template, large = false) {
  const stack = document.createElement("span");
  stack.className = `template-stack${large ? " large" : ""}`;
  const overlap = clampOverlap(template.overlap);
  const size = large ? 36 : 20;
  const offset = Math.max(2, Math.round(size * (1 - overlap / 100)));
  stack.style.width = `${size + offset}px`;
  stack.style.height = `${size + offset}px`;
  stack.style.setProperty("--template-overlap", String(overlap));

  const bottom = faviconElement(template.bottom, "template-bottom");
  bottom.style.left = `${offset}px`;
  bottom.style.top = `${offset}px`;
  bottom.style.right = "auto";
  bottom.style.bottom = "auto";

  const top = faviconElement(template.top, "template-top");
  top.style.left = "0";
  top.style.top = "0";

  stack.append(bottom, top);
  return stack;
}

function shortcutActive(item, activeUrl) {
  if (isSite(item)) return sameOriginOrUrl(activeUrl, item.url);
  if (isTemplate(item)) {
    return sameOriginOrUrl(state.panes.top?.url, item.top.url) &&
      sameOriginOrUrl(state.panes.bottom?.url, item.bottom.url);
  }
  if (isGroup(item)) return item.items.some(child => shortcutActive(child, activeUrl));
  return false;
}

function shortcutVisual(item) {
  if (isGroup(item)) {
    const badge = document.createElement("span");
    badge.className = "group-badge";
    badge.textContent = groupInitials(item.title);
    return badge;
  }
  if (isTemplate(item)) return templateStackElement(item, false);

  const img = document.createElement("img");
  img.alt = "";
  img.draggable = false;
  img.src = faviconURL(item.url);
  img.addEventListener("error", () => img.replaceWith(fallback(item.title)), { once:true });
  return img;
}

function shortcutTitle(item) {
  if (isGroup(item)) return `${item.title}\nГруппа · ${item.items.length} ярл.`;
  if (isTemplate(item)) return `${item.title}\nШаблон: верх — ${item.top.title}; низ — ${item.bottom.title}\nClick → открыть обе панели · Right click → настроить`;
  return `${item.title}\n${MODE_META[normalizeMode(item.mode)].title}\nClick → active pane · Shift+Click → bottom pane`;
}

function renderPanelRail() {
  panelSites.replaceChildren();
  const activeUrl = state.panes[state.layout.activePane]?.url || "";

  for (const item of state.sites) {
    const button = document.createElement("button");
    button.type = "button";
    button.draggable = false;
    button.className = "rail-site";
    button.dataset.shortcutId = item.id;
    button.dataset.shortcutKind = item.kind || SHORTCUT_SITE;
    button.title = shortcutTitle(item);
    if (shortcutActive(item, activeUrl)) button.classList.add("active");
    button.append(shortcutVisual(item));

    button.addEventListener("click", async (event) => {
      if (Date.now() < suppressShortcutClickUntil) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (isGroup(item)) openGroupDialog(item.id);
      else if (isTemplate(item)) await openTemplate(item);
      else await openSite(item, event.shiftKey ? "bottom" : null);
    });

    button.addEventListener("contextmenu", event => {
      event.preventDefault();
      event.stopPropagation();
      openShortcutMenu(item,event.clientX,event.clientY);
    });

    panelSites.append(button);
  }

  queueMicrotask(updateRailScrollControls);
}


function flattenSearchShortcuts(items, groupName = "") {
  const out=[];
  for (const item of items || []) {
    if (isGroup(item)) {
      out.push({kind:"group",id:item.id,title:item.title,subtitle:`Группа · ${item.items.length} ярл.`,item});
      out.push(...flattenSearchShortcuts(item.items,item.title));
    } else if (isTemplate(item)) {
      out.push({kind:"template",id:item.id,title:item.title,subtitle:`Шаблон · ${item.top.title} + ${item.bottom.title}${groupName?` · ${groupName}`:""}`,item});
    } else if (isSite(item)) {
      out.push({kind:"site",id:item.id,title:item.title,subtitle:`${new URL(item.url).hostname}${groupName?` · ${groupName}`:""}`,item});
    }
  }
  return out;
}

let searchSelection=0;
let searchItems=[];

async function openSearchDialog(initial="") {
  const recentResponse = await chrome.runtime.sendMessage({type:"GET_RECENT",windowId:__atnHostWindowId}).catch(()=>null);
  state.recent = Array.isArray(recentResponse?.recent) ? recentResponse.recent : [];
  searchInput.value=initial;
  searchSelection=0;
  renderSearchResults();
  if (!searchDialog.open) searchDialog.showModal();
  queueMicrotask(()=>searchInput.focus());
}

async function openAddCurrentSite() {
  if (searchDialog.open) searchDialog.close();
  const paneName = focusedPaneName() || state.lastInteractedPane || state.layout.activePane || "top";
  try {
    // If App Tower is still on the empty onboarding screen, "current page"
    // unambiguously means the browser tab behind the Side Panel.
    const hasPanePage = Boolean(addDialogSourceFromPane("top") || addDialogSourceFromPane("bottom"));
    if (!hasPanePage) {
      const browserSource = await browserTabAddSource();
      await openAddSiteDialog({source:browserSource});
      return;
    }
    await openAddSiteDialog({paneName});
  } catch (error) {
    try {
      await openAddSiteDialog({blank:true});
    } catch {
      alert(`Не удалось открыть добавление сайта: ${String(error?.message || error)}`);
    }
  }
}

function collectSearchItems(query="") {
  const shortcuts=flattenSearchShortcuts(state.sites);
  const recent=(state.recent||[]).map(item=>({kind:"recent",id:item.id,title:item.title,subtitle:`Недавнее · ${safeHost(item.url)}`,recent:item}));
  const workspaces=(state.workspaces||[]).map(item=>({kind:"workspace",id:item.id,title:item.name,subtitle:item.id===state.workspaceId?"Текущий workspace":"Переключить workspace",workspace:item}));
  const commands=[
    {kind:"command",id:"add",title:"Добавить текущую страницу",subtitle:"Команда",run:()=>openAddCurrentSite()},
    {kind:"command",id:"group",title:"Группа или шаблон",subtitle:"Команда",run:()=>openOrganizeDialog()},
    {kind:"command",id:"split",title:state.layout.split?"Оставить одну pane":"Показать две pane",subtitle:"Раскладка",run:async()=>{state.layout.split=!state.layout.split;await persistLayout();renderAll()}},
    {kind:"command",id:"options",title:"Настройки App Tower",subtitle:"Команда",run:()=>chrome.runtime.sendMessage({type:"OPEN_OPTIONS",windowId:__atnHostWindowId})},
    {kind:"command",id:"collapse",title:"Свернуть App Tower",subtitle:"Команда",run:()=>collapseToRail()}
  ];
  const all=[...shortcuts,...workspaces,...recent,...commands];
  const q=String(query||"").trim().toLocaleLowerCase();
  if (!q) return [...recent.slice(0,8),...shortcuts.slice(0,12),...commands.slice(0,5)];
  return all.filter(item=>`${item.title} ${item.subtitle}`.toLocaleLowerCase().includes(q)).slice(0,50);
}

function searchMark(kind) {
  return kind==="group"?"GR":kind==="template"?"2":kind==="workspace"?"WS":kind==="recent"?"↶":kind==="command"?">":"•";
}

function renderSearchResults() {
  searchItems=collectSearchItems(searchInput.value);
  searchSelection=Math.min(Math.max(0,searchSelection),Math.max(0,searchItems.length-1));
  searchResults.replaceChildren();
  for (const [index,item] of searchItems.entries()) {
    const button=document.createElement("button");
    button.type="button";
    button.className=`search-result${index===searchSelection?" active":""}`;
    const mark=document.createElement("span");mark.className="mark";mark.textContent=searchMark(item.kind);
    const copy=document.createElement("span");copy.className="copy";
    const strong=document.createElement("strong");strong.textContent=item.title;
    const small=document.createElement("small");small.textContent=item.subtitle||"";
    copy.append(strong,small);
    const kind=document.createElement("span");kind.className="kind";kind.textContent=item.kind;
    button.append(mark,copy,kind);
    button.dataset.searchIndex = String(index);
    button.addEventListener("mouseenter",()=>setSearchSelection(index));
    button.addEventListener("click",event=>{
      event.preventDefault();
      event.stopPropagation();
      activateSearchItem(item).catch(error=>alert(String(error?.message || error)));
    });
    searchResults.append(button);
  }
  if (!searchItems.length) {
    const empty=document.createElement("div");empty.className="module-empty";empty.textContent="Ничего не найдено";searchResults.append(empty);
  }
}

function setSearchSelection(index) {
  searchSelection = Math.min(
    Math.max(0, Number(index) || 0),
    Math.max(0, searchItems.length - 1)
  );
  for (const button of searchResults.querySelectorAll(".search-result")) {
    button.classList.toggle(
      "active",
      Number(button.dataset.searchIndex) === searchSelection
    );
  }
}

async function activateSearchItem(entry) {
  if (!entry) return;
  searchDialog.close();
  if (entry.kind==="site") return openSite(entry.item);
  if (entry.kind==="template") return openTemplate(entry.item);
  if (entry.kind==="group") return openGroupDialog(entry.item.id);
  if (entry.kind==="recent") {
    if (entry.recent?.kind==="template" && entry.recent.template) return openTemplate(entry.recent.template);
    return openSite({kind:SHORTCUT_SITE,id:crypto.randomUUID(),title:entry.recent.title,url:entry.recent.url,mode:"auto",compatDomains:[]});
  }
  if (entry.kind==="workspace") {
    const response=await chrome.runtime.sendMessage({type:"SET_ACTIVE_WORKSPACE",windowId:__atnHostWindowId,workspaceId:entry.workspace.id});
    if (response?.ok) { state.sleepingPanes.clear(); await loadState(); renderAll(false); }
    return;
  }
  if (entry.kind==="command") return entry.run?.();
}

searchInput?.addEventListener("input",()=>{searchSelection=0;renderSearchResults()});
searchInput?.addEventListener("keydown",event=>{
  if (event.key==="ArrowDown") {event.preventDefault();setSearchSelection(searchSelection+1);}
  if (event.key==="ArrowUp") {event.preventDefault();setSearchSelection(searchSelection-1);}
  if (event.key==="Enter") {
    event.preventDefault();
    activateSearchItem(searchItems[searchSelection]).catch(error=>alert(String(error?.message || error)));
  }
  if (event.key==="Escape") {
    event.preventDefault();
    searchDialog.close();
  }
});
searchClose?.addEventListener("click",event=>{
  event.preventDefault();
  searchDialog.close();
});
document.getElementById("search-form")?.addEventListener("submit",event=>event.preventDefault());

function safeHost(url){try{return new URL(url).hostname}catch{return ""}}

function chooserIconFor(item) {
  const host = document.createElement("span");
  host.className = "shortcut-chooser-icon";

  if (isSite(item)) {
    const img = document.createElement("img");
    img.alt = "";
    img.src = faviconURL(item.url);
    img.addEventListener("error", () => img.replaceWith(fallback(item.title)), {once:true});
    host.append(img);
  } else if (isGroup(item)) {
    host.textContent = groupInitials(item.title);
  } else if (isTemplate(item)) {
    host.append(templateStackElement(item,false));
  }
  return host;
}

function chooseShortcut({title="Выберите ярлык",copy="",items=[]} = {}) {
  if (!items.length) return Promise.resolve(null);

  if (shortcutChooserResolve) {
    shortcutChooserResolve(null);
    shortcutChooserResolve = null;
  }

  shortcutChooserTitle.textContent = title;
  shortcutChooserCopy.textContent = copy;
  shortcutChooserCopy.classList.toggle("hidden", !copy);
  shortcutChooserList.replaceChildren();

  return new Promise(resolve => {
    shortcutChooserResolve = resolve;

    for (const item of items) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "shortcut-chooser-item";

      const text = document.createElement("span");
      text.className = "shortcut-chooser-copy";
      const strong = document.createElement("strong");
      strong.textContent = item.title || item.url || "Без названия";
      const small = document.createElement("small");
      small.textContent = isGroup(item)
        ? `${item.items.length} элементов`
        : (isTemplate(item) ? "Шаблон двух панелей" : safeHost(item.url));
      text.append(strong,small);

      button.append(chooserIconFor(item),text);
      button.addEventListener("click", () => {
        const done = shortcutChooserResolve;
        shortcutChooserResolve = null;
        shortcutChooserDialog.close("selected");
        done?.(item);
      });
      shortcutChooserList.append(button);
    }

    if (!shortcutChooserDialog.open) shortcutChooserDialog.showModal();
  });
}

shortcutChooserDialog.addEventListener("close", () => {
  if (!shortcutChooserResolve) return;
  const done = shortcutChooserResolve;
  shortcutChooserResolve = null;
  done(null);
});

async function addShortcutToGroupFromMenu(item) {
  const groups=state.sites.filter(isGroup);
  if(!groups.length){
    alert("Сначала создайте группу.");
    return;
  }

  const group = groups.length === 1
    ? groups[0]
    : await chooseShortcut({
        title:"Добавить в группу",
        copy:`Куда переместить «${item.title}»?`,
        items:groups
      });
  if(!group)return;
  await mutateShortcutState({action:"add-to-group",sourceId:item.id,groupId:group.id});
}

async function createTemplateFromMenu(item) {
  const candidates=state.sites.filter(candidate=>isSite(candidate)&&candidate.id!==item.id);
  if(!candidates.length){
    alert("Для шаблона нужен ещё один обычный ярлык верхнего уровня.");
    return;
  }

  const target = candidates.length === 1
    ? candidates[0]
    : await chooseShortcut({
        title:"Шаблон двух панелей",
        copy:`Выберите нижний сайт. «${item.title}» будет открыт сверху.`,
        items:candidates
      });
  if(!target)return;

  openTemplateDraft(item,target);
}

async function setShortcutModeFromMenu(item,mode) {
  await mutateShortcutState({
    action:"update-site",
    id:item.id,
    mode
  });
}

function openShortcutMenu(item,x,y) {
  shortcutMenu.replaceChildren();
  const add=(label,action)=>{const b=document.createElement("button");b.type="button";b.textContent=label;b.addEventListener("click",async()=>{closeShortcutMenu();try{await action()}catch(error){alert(String(error?.message||error))}});shortcutMenu.append(b)};
  const sep=()=>{const div=document.createElement("div");div.className="separator";shortcutMenu.append(div)};

  if (isSite(item)) {
    add("Открыть",()=>openSite(item));
    add("Открыть снизу",()=>openSite(item,"bottom"));
    add("Открыть отдельно",()=>chrome.runtime.sendMessage({type:"OPEN_REAL_SIDECAR",windowId:__atnHostWindowId,url:item.url,title:item.title}));
    sep();
    add("Добавить в группу…",()=>addShortcutToGroupFromMenu(item));
    add("Создать шаблон…",()=>createTemplateFromMenu(item));
    sep();
    add(`${item.mode==="auto"?"✓ ":""}Режим Auto`,()=>setShortcutModeFromMenu(item,"auto"));
    add(`${item.mode==="secure"?"✓ ":""}Режим Secure`,()=>setShortcutModeFromMenu(item,"secure"));
    add(`${item.mode==="compat"?"✓ ":""}Режим Compatibility`,()=>setShortcutModeFromMenu(item,"compat"));
    add(`${item.mode==="real"?"✓ ":""}Режим Real Page`,()=>setShortcutModeFromMenu(item,"real"));
    sep();
    add("Настройки сайта…",async()=>{
      await chrome.storage.local.set({atnOptionsRoute:{section:"sites",url:item.url,nonce:Date.now()}});
      await chrome.runtime.sendMessage({type:"OPEN_OPTIONS",windowId:__atnHostWindowId});
    });
  } else if (isGroup(item)) {
    const groupSites = item.items.filter(isSite);
    const groupTemplates = item.items.filter(isTemplate);
    if (groupSites.length) {
      add("Открыть сайт сверху…",async()=>{
        const site = groupSites.length===1 ? groupSites[0] : await chooseShortcut({title:item.title,copy:"Какой сайт открыть в верхней pane?",items:groupSites});
        if(site) await openSite(site,"top");
      });
      add("Открыть сайт снизу…",async()=>{
        const site = groupSites.length===1 ? groupSites[0] : await chooseShortcut({title:item.title,copy:"Какой сайт открыть в нижней pane?",items:groupSites});
        if(site) await openSite(site,"bottom");
      });
    }
    if (groupTemplates.length) add("Открыть шаблон…",async()=>{
      const template = groupTemplates.length===1 ? groupTemplates[0] : await chooseShortcut({title:item.title,copy:"Какой шаблон открыть?",items:groupTemplates});
      if(template) await openTemplate(template);
    });
    sep();
    add("Переименовать / содержимое",()=>openGroupDialog(item.id));
    add("Разгруппировать",()=>mutateShortcutState({action:"dissolve",id:item.id}));
  } else if (isTemplate(item)) {
    add("Открыть шаблон",()=>openTemplate(item));
    add("Настроить шаблон",()=>openTemplateEditor(item.id));
  }
  sep();
  if (!isGroup(item)) add("Дублировать",()=>mutateShortcutState({action:"duplicate",id:item.id}));
  add("Удалить",async()=>{if(confirm(`Удалить «${item.title}»?`))await mutateShortcutState({action:"remove",id:item.id})});

  shortcutMenu.classList.remove("hidden");
  const rect=shortcutMenu.getBoundingClientRect();
  shortcutMenu.style.left=`${Math.max(4,Math.min(x,innerWidth-rect.width-4))}px`;
  shortcutMenu.style.top=`${Math.max(4,Math.min(y,innerHeight-rect.height-4))}px`;
}

function closeShortcutMenu(){shortcutMenu.classList.add("hidden")}
document.addEventListener("pointerdown",event=>{if(!shortcutMenu.classList.contains("hidden")&&!shortcutMenu.contains(event.target))closeShortcutMenu()},true);
window.addEventListener("blur",closeShortcutMenu);

function updateRailScrollControls() {
  const overflow = panelSitesScroll.scrollHeight > panelSitesScroll.clientHeight + 2;
  railScrollUp.classList.toggle("hidden", !overflow);
  railScrollDown.classList.toggle("hidden", !overflow);
  if (!overflow) return;
  railScrollUp.disabled = panelSitesScroll.scrollTop <= 1;
  railScrollDown.disabled = panelSitesScroll.scrollTop + panelSitesScroll.clientHeight >= panelSitesScroll.scrollHeight - 1;
}

railScrollUp.addEventListener("click", () => panelSitesScroll.scrollBy({top:-120, behavior:"smooth"}));
railScrollDown.addEventListener("click", () => panelSitesScroll.scrollBy({top:120, behavior:"smooth"}));
panelSitesScroll.addEventListener("scroll", updateRailScrollControls, {passive:true});
new ResizeObserver(updateRailScrollControls).observe(panelSitesScroll);

let suppressShortcutClickUntil = 0;
let railDrag = null;

function clearRailDropMarks() {
  for (const el of panelSites.querySelectorAll(".drop-before,.drop-after,.drop-combine")) {
    el.classList.remove("drop-before","drop-after","drop-combine");
  }
}

function beginRailDrag(event, button) {
  if (!railDrag || railDrag.dragging) return;
  railDrag.dragging = true;
  clearTimeout(railDrag.holdTimer);
  button.classList.add("dragging");
  try { button.setPointerCapture(event.pointerId); } catch {}
}

function railDropTarget(event) {
  const hit = document.elementFromPoint(event.clientX, event.clientY);
  const button = hit?.closest?.(".rail-site[data-shortcut-id]");
  if (!button || button.dataset.shortcutId === railDrag?.sourceId) return null;
  const rect = button.getBoundingClientRect();
  const ratio = (event.clientY - rect.top) / Math.max(1, rect.height);
  let mode = ratio < .25 ? "before" : (ratio > .75 ? "after" : "combine");

  const source = state.sites.find(item => item.id === railDrag.sourceId);
  const target = state.sites.find(item => item.id === button.dataset.shortcutId);
  if (!source || !target) return null;
  if (isGroup(source) && mode === "combine") mode = ratio < .5 ? "before" : "after";

  return {button, target, mode};
}

panelSites.addEventListener("dragstart", event => event.preventDefault());

panelSites.addEventListener("pointerdown", event => {
  if (event.button !== 0) return;
  const button = event.target.closest(".rail-site[data-shortcut-id]");
  if (!button) return;

  railDrag = {
    sourceId:button.dataset.shortcutId,
    pointerId:event.pointerId,
    pointerType:event.pointerType,
    startX:event.clientX,
    startY:event.clientY,
    dragging:false,
    target:null,
    holdTimer:null
  };

  if (event.pointerType === "touch" || event.pointerType === "pen") {
    railDrag.holdTimer = setTimeout(() => {
      if (railDrag?.pointerId === event.pointerId && !railDrag.dragging) beginRailDrag(event, button);
    }, 360);
  }
});

window.addEventListener("pointermove", event => {
  if (!railDrag || railDrag.pointerId !== event.pointerId) return;
  const dx = event.clientX - railDrag.startX;
  const dy = event.clientY - railDrag.startY;
  const distance = Math.hypot(dx,dy);
  const sourceButton = panelSites.querySelector(`[data-shortcut-id="${CSS.escape(railDrag.sourceId)}"]`);

  if (!railDrag.dragging) {
    if (railDrag.pointerType === "mouse" && distance >= 5 && sourceButton) beginRailDrag(event, sourceButton);
    else if (railDrag.pointerType !== "mouse" && distance >= 10) {
      clearTimeout(railDrag.holdTimer);
      railDrag = null;
      return;
    }
  }

  if (!railDrag?.dragging) return;
  event.preventDefault();
  const scrollRect = panelSitesScroll.getBoundingClientRect();
  if (event.clientY < scrollRect.top + 26) panelSitesScroll.scrollBy({top:-10});
  else if (event.clientY > scrollRect.bottom - 26) panelSitesScroll.scrollBy({top:10});
  clearRailDropMarks();
  railDrag.target = railDropTarget(event);
  if (railDrag.target) railDrag.target.button.classList.add(`drop-${railDrag.target.mode}`);
}, {passive:false});

async function finishRailDrag(event) {
  if (!railDrag || railDrag.pointerId !== event.pointerId) return;
  clearTimeout(railDrag.holdTimer);
  const current = railDrag;
  railDrag = null;
  const sourceButton = panelSites.querySelector(`[data-shortcut-id="${CSS.escape(current.sourceId)}"]`);
  sourceButton?.classList.remove("dragging");
  clearRailDropMarks();
  if (!current.dragging) return;
  suppressShortcutClickUntil = Date.now() + 350;
  if (!current.target) {
    if (current.pointerType !== "mouse") {
      const source = state.sites.find(item => item.id === current.sourceId);
      if (isTemplate(source)) openTemplateEditor(source.id);
      else if (isGroup(source)) openGroupDialog(source.id);
    }
    return;
  }

  const targetId = current.target.button.dataset.shortcutId;
  const target = state.sites.find(item => item.id === targetId);

  if (current.target.mode === "before" || current.target.mode === "after") {
    await mutateShortcutState({action:"reorder", sourceId:current.sourceId, targetId, position:current.target.mode});
    return;
  }

  if (isGroup(target)) {
    await mutateShortcutState({action:"add-to-group", sourceId:current.sourceId, groupId:targetId});
    return;
  }

  startCombine(current.sourceId, targetId);
}

document.addEventListener("dragstart", event => {
  if (event.target?.closest?.(".panel-rail,.shortcut-chooser-list,.group-items,.template-stack")) event.preventDefault();
});
window.addEventListener("pointerup", event => { finishRailDrag(event).catch(error => alert(String(error?.message || error))); });
window.addEventListener("pointercancel", event => {
  if (!railDrag || railDrag.pointerId !== event.pointerId) return;
  clearTimeout(railDrag.holdTimer);
  panelSites.querySelector(`[data-shortcut-id="${CSS.escape(railDrag.sourceId)}"]`)?.classList.remove("dragging");
  railDrag = null;
  clearRailDropMarks();
});

async function mutateShortcutState(payload) {
  const response = await chrome.runtime.sendMessage({type:"MUTATE_SHORTCUTS", windowId:__atnHostWindowId, ...payload});
  if (!response?.ok) throw new Error(response?.error || "Не удалось изменить ярлыки");
  state.sites = normalizeShortcutList(response.sites || []);
  renderAll(false);
  return response;
}

async function openSite(site, targetPane = null) {
  const normalized = normalizeShortcut(site);
  if (!isSite(normalized)) return;
  const url = normalizeUrl(normalized.url);
  if (!url) return;

  const explicitPane = targetPane === "bottom" ? "bottom" : (targetPane === "top" ? "top" : null);
  const existing = explicitPane ? null : findPaneForUrl(url);
  const name = explicitPane || existing || state.layout.activePane;

  if (!existing || explicitPane) {
    const inferred = inferDefaultsForUrl(url);
    const requestedMode = normalizeMode(normalized.mode || inferred.mode);
    state.panes[name] = {
      url,
      title:normalized.title || url,
      mode:requestedMode,
      compatDomains:normalizeCompatDomains((normalized.compatDomains || []).length ? normalized.compatDomains : inferred.compatDomains),
      sourceSiteId:normalized.id || null
    };
  }

  state.layout.activePane = name;
  state.lastInteractedPane = name;
  if (explicitPane) state.layout.split = true;
  state.focus = null;

  state.sleepingPanes.delete(name);
  await syncCompatRules();
  await persistWorkspaceState({panes:state.panes,layout:state.layout});
  await chrome.runtime.sendMessage({type:"RECORD_RECENT",windowId:__atnHostWindowId,url,title:normalized.title || url,kind:"site"}).catch(()=>{});
  renderAll(false);
}

async function openTemplate(template) {
  const normalized = normalizeShortcut(template);
  if (!isTemplate(normalized)) return;
  const top = normalized.top;
  const bottom = normalized.bottom;
  const topDefaults = inferDefaultsForUrl(top.url);
  const bottomDefaults = inferDefaultsForUrl(bottom.url);

  state.panes.top = {
    url:top.url,
    title:top.title || top.url,
    mode:normalizeMode(top.mode || "auto"),
    compatDomains:normalizeCompatDomains((top.compatDomains || []).length ? top.compatDomains : topDefaults.compatDomains),
    sourceSiteId:normalized.id
  };
  state.panes.bottom = {
    url:bottom.url,
    title:bottom.title || bottom.url,
    mode:normalizeMode(bottom.mode || "auto"),
    compatDomains:normalizeCompatDomains((bottom.compatDomains || []).length ? bottom.compatDomains : bottomDefaults.compatDomains),
    sourceSiteId:normalized.id
  };
  state.layout.split = true;
  state.layout.activePane = "top";
  state.lastInteractedPane = "top";
  state.focus = null;
  state.sleepingPanes.delete("top");
  state.sleepingPanes.delete("bottom");
  await syncCompatRules();
  await persistWorkspaceState({panes:state.panes,layout:state.layout});
  await chrome.runtime.sendMessage({type:"RECORD_RECENT",windowId:__atnHostWindowId,url:top.url,title:normalized.title,kind:"template",template:normalized}).catch(()=>{});
  renderAll(false);
}

async function setPwaPreference(url, preference) {
  const origin = originForUrl(url);
  if (!origin) return "pane";

  const response = await chrome.runtime.sendMessage({
    type:"SET_PWA_PREFERENCE",
    url,
    preference:preference === "sidecar" ? "sidecar" : "pane"
  });
  if (!response?.ok) throw new Error(response?.error || "Failed to save PWA preference");

  await loadPwaState();
  await syncCompatRules();
  renderAll(false);
  renderPwaSettings();
  return response.preference || "pane";
}

async function openPwaSidecar(name, targetUrl = null) {
  const pane = state.panes[name];
  if (!pane?.url) return;
  const pwa = getPwaForUrl(pane.url);
  if (!pwa) return;

  const response = await chrome.runtime.sendMessage({
    type:"OPEN_PWA_SIDECAR",
    windowId:__atnHostWindowId,
    pageUrl:pane.url,
    targetUrl:targetUrl || pwa.startUrl
  });
  if (!response?.ok) throw new Error(response?.error || "Failed to open PWA sidecar");
}

function populatePwaDialog(name) {
  const pane = state.panes[name];
  const pwa = getPwaForUrl(pane?.url);
  if (!pwa) {
    if (pwaDialog.open) pwaDialog.close();
    return;
  }

  pwaDialogPane = name;
  pwaDialogName.textContent = pwa.name || pwa.shortName || "Web App";
  pwaDialogMeta.textContent =
    `${pwa.display || "browser"} · ${pwa.startUrl || pane.url}`;

  const iconUrl = bestPwaIcon(pwa);
  pwaDialogIcon.classList.toggle("hidden", !iconUrl);
  if (iconUrl) pwaDialogIcon.src = iconUrl;

  pwaSidecarDefault.checked = getPwaPreference(pane.url) === "sidecar";
  pwaDialogShortcuts.replaceChildren();

  if (pwa.shortcuts?.length) {
    const title = document.createElement("strong");
    title.textContent = "Shortcuts";
    pwaDialogShortcuts.append(title);

    for (const shortcut of pwa.shortcuts.slice(0, 8)) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = shortcut.name || shortcut.shortName || "Shortcut";
      button.title = shortcut.description || shortcut.url;
      button.addEventListener("click", () => openPwaSidecar(name, shortcut.url).catch(error => {
        alert(String(error?.message || error));
      }));
      pwaDialogShortcuts.append(button);
    }
  }
}

function openPwaDialog(name) {
  if (!getPwaForUrl(state.panes[name]?.url)) return;
  populatePwaDialog(name);
  if (!pwaDialog.open) pwaDialog.showModal();
}

function renderPwaSettings() {
  if (!settingsPwaList) return;
  settingsPwaList.replaceChildren();

  const apps = Object.values(state.pwaCache || {})
    .filter(item => item?.origin && item?.startUrl)
    .sort((a,b) => String(a.name || a.origin).localeCompare(String(b.name || b.origin), "ru"));

  if (!apps.length) {
    const empty = document.createElement("div");
    empty.className = "module-empty";
    empty.textContent = "Web App Manifest пока не обнаружены. Они появятся здесь после открытия поддерживающего сайта.";
    settingsPwaList.append(empty);
    return;
  }

  for (const pwa of apps.slice(0, 24)) {
    const row = document.createElement("div");
    row.className = "pwa-settings-row";

    const icon = document.createElement("img");
    icon.className = "pwa-settings-icon";
    const iconUrl = bestPwaIcon(pwa);
    if (iconUrl) icon.src = iconUrl;
    else icon.classList.add("hidden");

    const copy = document.createElement("div");
    copy.className = "pwa-settings-copy";
    const name = document.createElement("strong");
    name.textContent = pwa.name || pwa.shortName || pwa.origin;
    const meta = document.createElement("small");
    meta.textContent = `${pwa.origin} · ${pwa.display || "browser"}`;
    copy.append(name, meta);

    const label = document.createElement("label");
    label.className = "pwa-settings-toggle";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = state.pwaPreferences?.[pwa.origin] === "sidecar";
    const span = document.createElement("span");
    span.textContent = "App";
    label.append(checkbox, span);
    checkbox.addEventListener("change", () => {
      setPwaPreference(pwa.startUrl, checkbox.checked ? "sidecar" : "pane")
        .catch(() => { checkbox.checked = !checkbox.checked; });
    });

    row.append(icon, copy, label);
    settingsPwaList.append(row);
  }
}

for (const [name, el] of Object.entries(paneEls)) {
  el.addEventListener("pointerdown", () => { activatePane(name); touchPaneResource(name); }, { passive:true });
  el.querySelector('[data-action="activate"]').addEventListener("click", () => activatePane(name));
  el.querySelector('[data-action="go"]').addEventListener("click", () => navigateFromInput(name));
  el.querySelector('[data-role="url"]').addEventListener("keydown", (event) => {
    if (event.key === "Enter") navigateFromInput(name);
  });
  el.querySelector('[data-action="reload"]').addEventListener("click", () => { state.sleepingPanes.delete(name); renderPane(name, true); });
  el.querySelector('[data-action="save-shortcut"]').addEventListener("click", () => openAddSiteDialog({paneName:name}));
  el.querySelector('[data-action="external"]').addEventListener("click", () => openTab(name));
  el.querySelector('[data-action="focus"]').addEventListener("click", () => {
    state.focus = state.focus === name ? null : name;
    renderAll();
  });
  el.querySelector('[data-action="mode"]').addEventListener("click", async (event) => {
    await cycleMode(name, event.shiftKey ? -1 : 1);
  });
  el.querySelector('[data-action="pwa"]').addEventListener("click", () => openPwaDialog(name));
  el.querySelector('[data-action="pwa-launch"]').addEventListener("click", () => {
    openPwaSidecar(name).catch(error => alert(String(error?.message || error)));
  });
  el.querySelector('[data-action="pwa-embed"]').addEventListener("click", () => {
    setPwaPreference(state.panes[name]?.url, "pane").catch(error => alert(String(error?.message || error)));
  });
  el.querySelector('[data-action="wake"]').addEventListener("click", () => wakePane(name));
  el.querySelector('[data-action="real-window"]').addEventListener("click", () => openRealWindow(name));
  el.querySelector('[data-action="real-tab"]').addEventListener("click", () => openTab(name));
}

async function activatePane(name) {
  if (!["top","bottom"].includes(name)) return;
  state.lastInteractedPane = name;
  touchPaneResource(name);
  if (state.layout.activePane === name) return;
  state.layout.activePane = name;
  await persistLayout();
  renderAll();
}

async function navigateFromInput(name) {
  const input = paneEls[name].querySelector('[data-role="url"]');
  const url = normalizeUrl(input.value);
  if (!url) { input.select(); return; }

  const previous = state.panes[name] || {};
  const inferred = inferDefaultsForUrl(url);

  // Typing a new URL is a new navigation intent, so it always begins in Auto.
  // If the user wants S/C/R for this URL they can choose it afterwards.
  state.panes[name] = {
    ...previous,
    url,
    title:url,
    mode:"auto",
    compatDomains:normalizeCompatDomains(inferred.compatDomains),
    sourceSiteId:null
  };
  state.layout.activePane = name;
  state.lastInteractedPane = name;
  state.focus = null;

  state.sleepingPanes.delete(name);
  await syncCompatRules();
  await persistWorkspaceState({panes:state.panes,layout:state.layout});
  await chrome.runtime.sendMessage({type:"RECORD_RECENT",windowId:__atnHostWindowId,url,title:url,kind:"site"}).catch(()=>{});
  // URL changed only in this pane. A normal render reloads only frames whose src changed.
  renderAll(false);
}

async function cycleMode(name, direction) {
  const pane = state.panes[name];
  const current = MODE_ORDER.indexOf(normalizeMode(pane.mode));
  const next = (current + direction + MODE_ORDER.length) % MODE_ORDER.length;
  pane.mode = MODE_ORDER[next];

  if (pane.mode === "compat" && (!pane.compatDomains || !pane.compatDomains.length)) {
    pane.compatDomains = inferDefaultsForUrl(pane.url).compatDomains;
    if (!pane.compatDomains.length) {
      try { pane.compatDomains = [new URL(pane.url).hostname]; } catch { pane.compatDomains = []; }
    }
  }

  await syncCompatRules();
  await persistWorkspaceState({panes:state.panes});
  // Changing renderer/header rules must refresh only the pane the user changed.
  // Reloading both panes is disruptive (video/forms/scroll position in the other pane).
  renderAll(false);
  renderPane(name, true);
}

async function syncCompatRules() {
  const response = await chrome.runtime.sendMessage({ type:"SYNC_COMPAT_RULES", windowId:__atnHostWindowId, panes:state.panes });
  if (!response?.ok) console.warn("Failed to sync compatibility rules", response?.error);
}

async function openTab(name) {
  const url = state.panes[name]?.url;
  if (isHttpUrl(url)) await chrome.tabs.create({ url });
}

async function openRealWindow(name) {
  const url = state.panes[name]?.url;
  if (!isHttpUrl(url)) return;
  const response = await chrome.runtime.sendMessage({
    type:"OPEN_REAL_SIDECAR",
    windowId:__atnHostWindowId,
    url,
    title:state.panes[name]?.title || url
  });
  if (!response?.ok) throw new Error(response?.error || "Не удалось открыть sidecar");
}

async function collapseToRail() {
  if (__atnParams.get("sidecar") === "1") {
    window.close();
    return;
  }

  const response = await chrome.runtime.sendMessage({
    type:"COLLAPSE_PANEL",
    windowId:__atnHostWindowId
  }).catch(error => ({ok:false,error:String(error?.message || error)}));

  if (!response?.ok) {
    alert(response?.error || "Не удалось свернуть App Tower");
  }
}

collapsePanelButton.addEventListener("click", collapseToRail);
settingsCollapse?.addEventListener("click", async () => {
  settingsDialog.close();
  await collapseToRail();
});

toggleSplit.addEventListener("click", async () => {
  state.focus = null;
  state.layout.split = !state.layout.split;
  await persistLayout();
  renderAll();
});

function titleForUrl(url, currentTitle="") {
  const title = String(currentTitle || "").trim();
  if (title && title !== url) return title;
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./,"") || url;
  } catch {
    return title || url;
  }
}

function addDialogSourceFromPane(name) {
  const pane = state.panes[name];
  const url = normalizeUrl(pane?.url);
  if (!url) return null;
  return {
    kind:"pane",
    pane:name,
    title:titleForUrl(url,pane?.title),
    url,
    mode:normalizeMode(pane?.mode || "auto"),
    compatDomains:normalizeCompatDomains(pane?.compatDomains || [])
  };
}

async function browserTabAddSource() {
  try {
    const response = await chrome.runtime.sendMessage({type:"GET_CURRENT_TAB",windowId:__atnHostWindowId});
    const url = normalizeUrl(response?.tab?.url);
    if (!url) return null;
    return {
      kind:"browser-tab",pane:null,title:titleForUrl(url,response?.tab?.title),url,mode:"auto",
      compatDomains:inferDefaultsForUrl(url).compatDomains
    };
  } catch { return null; }
}

function focusedPaneName() {
  const active = document.activeElement;
  for (const [name,paneEl] of Object.entries(paneEls)) {
    for (const frame of paneEl.querySelectorAll('iframe[data-role="frame"], iframe[data-role="media-frame"]')) {
      if (active === frame) return name;
    }
  }
  return null;
}

async function currentAddDialogSource({paneName=null, blank=false, sourceKind=null} = {}) {
  if (blank) return null;
  if (sourceKind === "browser") return browserTabAddSource();
  if (sourceKind === "top" || sourceKind === "bottom") return addDialogSourceFromPane(sourceKind);

  const preferred = paneName === "top" || paneName === "bottom"
    ? paneName
    : (focusedPaneName() || state.lastInteractedPane || state.layout.activePane);
  const fromPane = addDialogSourceFromPane(preferred);
  if (fromPane) return fromPane;
  const other = preferred === "top" ? "bottom" : "top";
  return addDialogSourceFromPane(other) || await browserTabAddSource();
}

function populateAddDialogSource(source) {
  titleInput.value = source?.title || "";
  siteUrlInput.value = source?.url || "";
  siteMode.value = normalizeMode(source?.mode || "auto");
  siteCompatDomains.value = normalizeCompatDomains(
    source?.compatDomains?.length ? source.compatDomains : inferDefaultsForUrl(source?.url || "").compatDomains
  ).join(", ");

  siteSourceHint.textContent = source?.kind === "pane"
    ? `Из ${source.pane === "bottom" ? "нижней" : "верхней"} pane: ${source.url}`
    : (source?.kind === "browser-tab" ? `Из текущей вкладки браузера: ${source.url}` : "");
  siteSourceHint.classList.toggle("hidden", !source);
  for (const button of siteSourceButtons) {
    const key = source?.kind === "browser-tab" ? "browser" : source?.pane;
    button.classList.toggle("active", button.dataset.source === key);
  }
  updateCompatDomainsVisibility();
  renderSiteModuleSuggestion();
}

async function updateAddSourceSwitch() {
  const sources = {
    top:addDialogSourceFromPane("top"),
    bottom:addDialogSourceFromPane("bottom"),
    browser:await browserTabAddSource()
  };
  const available = Object.entries(sources).filter(([,source]) => Boolean(source));
  siteSourceSwitch.classList.toggle("hidden", available.length < 2);
  for (const button of siteSourceButtons) button.disabled = !sources[button.dataset.source];
  return sources;
}

async function openAddSiteDialog({ blank=false, paneName=null, source:explicitSource=null } = {}) {
  titleInput.value = "";
  siteUrlInput.value = "";
  siteMode.value = "auto";
  siteCompatDomains.value = "";
  siteSourceHint.textContent = "";
  siteSourceHint.classList.add("hidden");

  let source = explicitSource;
  if (!source) {
    try {
      source = await currentAddDialogSource({paneName,blank});
    } catch {}
  }
  populateAddDialogSource(source);
  try { await updateAddSourceSwitch(); } catch {
    siteSourceSwitch.classList.add("hidden");
  }
  if (!siteDialog.open) siteDialog.showModal();

  setTimeout(() => {
    if (!siteUrlInput.value) titleInput.focus();
    else if (!titleInput.value) titleInput.focus();
    else titleInput.select();
  }, 0);
}

function renderModuleManager() {
  if (!settingsModules) return;
  settingsModules.replaceChildren();

  const byId = new Map(state.moduleCatalog.map(entry => [entry.id, entry]));
  for (const manifest of Object.values(state.installedModules)) {
    if (!byId.has(manifest.id)) {
      byId.set(manifest.id, {
        id:manifest.id,
        name:manifest.name,
        version:manifest.version,
        description:manifest.description || "Установленный пользовательский декларативный модуль.",
        hosts:manifest.hosts || [],
        external:true
      });
    }
  }

  if (!byId.size) {
    const empty = document.createElement("div");
    empty.className = "module-empty";
    empty.textContent = "Каталог модулей пуст.";
    settingsModules.append(empty);
    return;
  }

  for (const entry of [...byId.values()].sort((a,b) => a.name.localeCompare(b.name, "ru"))) {
    const installed = Boolean(state.installedModules[entry.id]);
    const row = document.createElement("div");
    row.className = "module-row";

    const copy = document.createElement("div");
    copy.className = "module-row-copy";

    const head = document.createElement("div");
    head.className = "module-row-head";
    const name = document.createElement("strong");
    name.textContent = entry.name;
    const badge = document.createElement("span");
    badge.className = installed ? "module-status installed" : "module-status";
    badge.textContent = installed ? "Установлен" : "Доступен";
    head.append(name, badge);

    const description = document.createElement("small");
    description.textContent = entry.description || "";
    copy.append(head, description);

    const action = document.createElement("button");
    action.type = "button";
    action.className = installed ? "module-action remove" : "module-action";
    action.textContent = installed ? "Удалить" : "Установить";
    action.addEventListener("click", async () => {
      action.disabled = true;
      try {
        if (installed) await uninstallModule(entry.id);
        else if (entry.manifest) await installBundledModule(entry.id);
        else throw new Error("Для этого модуля нет источника установки");
        await loadModuleState();
        await syncCompatRules();
        renderModuleManager();
        renderAll(true);
      } catch (error) {
        alert(String(error?.message || error));
      } finally {
        action.disabled = false;
      }
    });

    row.append(copy, action);
    settingsModules.append(row);
  }
}

function renderSiteModuleSuggestion() {
  if (!siteModuleSuggestion) return;
  siteModuleSuggestion.replaceChildren();

  const url = normalizeUrl(siteUrlInput.value);
  if (!url) {
    siteModuleSuggestion.classList.add("hidden");
    return;
  }

  const candidates = findCatalogCandidates(url, state.moduleCatalog, state.installedModules);
  if (candidates.length) {
    const candidate = candidates[0];
    const text = document.createElement("span");
    text.textContent = `Для ${candidate.name} доступен Auto-модуль.`;

    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Установить";
    button.addEventListener("click", async () => {
      button.disabled = true;
      try {
        await installBundledModule(candidate.id);
        await loadModuleState();
        siteMode.value = "auto";
        renderSiteModuleSuggestion();
        renderModuleManager();
      } catch (error) {
        alert(String(error?.message || error));
      } finally {
        button.disabled = false;
      }
    });

    siteModuleSuggestion.append(text, button);
    siteModuleSuggestion.classList.remove("hidden");
    return;
  }

  // A specialized installed module has priority, so don't advertise a generic
  // PWA sidecar for the same URL.
  if (resolveModuleRenderer(url, state.installedModules)) {
    siteModuleSuggestion.classList.add("hidden");
    return;
  }

  const pwa = getPwaForUrl(url);
  if (pwa) {
    const text = document.createElement("span");
    text.textContent = `Найден Web App Manifest: ${pwa.name || pwa.shortName || pwa.origin}.`;

    const button = document.createElement("button");
    button.type = "button";
    const sidecar = getPwaPreference(url) === "sidecar";
    button.textContent = sidecar ? "App ✓" : "Использовать App";
    button.addEventListener("click", async () => {
      button.disabled = true;
      try {
        await setPwaPreference(url, sidecar ? "pane" : "sidecar");
        siteMode.value = "auto";
        renderSiteModuleSuggestion();
      } catch (error) {
        alert(String(error?.message || error));
      } finally {
        button.disabled = false;
      }
    });

    siteModuleSuggestion.append(text, button);
    siteModuleSuggestion.classList.remove("hidden");
    return;
  }

  siteModuleSuggestion.classList.add("hidden");
}

function topLevelShortcut(id) {
  return state.sites.find(item => item?.id === id) || null;
}

function findTemplateParent(templateId) {
  for (const item of state.sites) {
    if (isTemplate(item) && item.id === templateId) return {template:item, group:null};
    if (isGroup(item)) {
      const template = item.items.find(child => isTemplate(child) && child.id === templateId);
      if (template) return {template, group:item};
    }
  }
  return null;
}

function startCombine(sourceId, targetId) {
  const source = topLevelShortcut(sourceId);
  const target = topLevelShortcut(targetId);
  if (!source || !target || source.id === target.id || isGroup(source) || isGroup(target)) return;

  pendingCombine = {sourceId, targetId};
  combineSummary.textContent = `«${source.title}» + «${target.title}». Что создать?`;
  combineTemplateButton.disabled = !(isSite(source) && isSite(target));
  combineTemplateButton.title = combineTemplateButton.disabled
    ? "Шаблон можно создать только из двух обычных сайтов"
    : "Создать ярлык, который открывает обе pane";
  if (!combineDialog.open) combineDialog.showModal();
}

function openOrganizeDialog() {
  if (!organizeDialog.open) organizeDialog.showModal();
}

async function createTemplateFromOrganizer() {
  const sites = state.sites.filter(isSite);
  if (sites.length < 2) {
    alert("Для шаблона нужны как минимум два обычных ярлыка верхнего уровня.");
    return;
  }
  organizeDialog.close();
  const top = await chooseShortcut({title:"Шаблон двух панелей",copy:"Выберите сайт для верхней pane.",items:sites});
  if (!top) return;
  const bottomCandidates = sites.filter(item => item.id !== top.id);
  const bottom = bottomCandidates.length === 1 ? bottomCandidates[0] : await chooseShortcut({
    title:"Шаблон двух панелей",copy:`Верх: «${top.title}». Выберите сайт для нижней pane.`,items:bottomCandidates
  });
  if (!bottom) return;
  openTemplateDraft(top,bottom);
}

function openNewGroupDialog() {
  activeGroupId = null;
  groupDialog.dataset.mode = "create";
  groupDialogTitle.textContent = "Новая группа";
  groupNameInput.value = "";
  groupDialogIcon.textContent = "Г";
  groupItemsHost.replaceChildren();
  groupDissolveButton.classList.add("hidden");
  groupSaveButton.textContent = "Создать";
  if (!groupDialog.open) groupDialog.showModal();
  queueMicrotask(() => groupNameInput.focus());
}

function openGroupFromCombine() {
  if (!pendingCombine) return;
  const source = topLevelShortcut(pendingCombine.sourceId);
  const target = topLevelShortcut(pendingCombine.targetId);
  if (!source || !target) return;

  groupCombineDraft = {
    sourceId:pendingCombine.sourceId,
    targetId:pendingCombine.targetId
  };
  pendingCombine = null;

  activeGroupId = null;
  groupDialog.dataset.mode = "combine";
  groupDialogTitle.textContent = "Создать группу";
  groupNameInput.value = "";
  groupDialogIcon.textContent = "Г";
  groupItemsHost.replaceChildren();

  for (const item of [source,target]) {
    groupItemsHost.append(groupItemRow(item, {preview:true}));
  }

  groupDissolveButton.classList.add("hidden");
  groupSaveButton.textContent = "Создать группу";
  combineDialog.close();
  if (!groupDialog.open) groupDialog.showModal();
  queueMicrotask(() => groupNameInput.focus());
}

function openGroupDialog(groupId) {
  const group = topLevelShortcut(groupId);
  if (!isGroup(group)) return;
  activeGroupId = group.id;
  groupDialog.dataset.mode = "edit";
  groupDialogTitle.textContent = group.title;
  groupNameInput.value = group.title;
  groupDialogIcon.textContent = groupInitials(group.title);
  groupItemsHost.replaceChildren();
  for (const item of group.items) groupItemsHost.append(groupItemRow(item));
  groupDissolveButton.classList.remove("hidden");
  groupSaveButton.textContent = "Сохранить название";
  if (!groupDialog.open) groupDialog.showModal();
}

function groupItemRow(item, {preview=false} = {}) {
  const row = document.createElement("div");
  row.className = "group-item-row";

  const icon = document.createElement("div");
  icon.className = "group-item-icon";
  if (isTemplate(item)) icon.append(templateStackElement(item, false));
  else if (isSite(item)) {
    const img = document.createElement("img");
    img.alt = "";
    img.src = faviconURL(item.url);
    img.addEventListener("error", () => img.replaceWith(fallback(item.title)), {once:true});
    icon.append(img);
  }

  const title = document.createElement("span");
  title.className = "group-item-title";
  title.textContent = item.title || "Без названия";
  row.append(icon, title);

  if (!preview) {
    const actions = document.createElement("div");
    actions.className = "group-item-actions";
    if (isTemplate(item)) {
      const edit = document.createElement("button");
      edit.type = "button";
      edit.title = "Настроить шаблон";
      edit.textContent = "✎";
      edit.addEventListener("click", () => {
        groupDialog.close();
        openTemplateEditor(item.id);
      });
      actions.append(edit);
    }
    if (isSite(item)) {
      const top = document.createElement("button");
      top.type="button"; top.title="Открыть сверху"; top.textContent="↑";
      top.addEventListener("click",async()=>{groupDialog.close();await openSite(item,"top")});
      const bottom = document.createElement("button");
      bottom.type="button"; bottom.title="Открыть снизу"; bottom.textContent="↓";
      bottom.addEventListener("click",async()=>{groupDialog.close();await openSite(item,"bottom")});
      actions.append(top,bottom);
    } else {
      const open = document.createElement("button");
      open.type = "button"; open.title = "Открыть шаблон"; open.textContent = "↗";
      open.addEventListener("click", async () => {groupDialog.close();await openTemplate(item)});
      actions.append(open);
    }
    row.append(actions);
  }
  return row;
}

groupNameInput.addEventListener("input", () => {
  groupDialogIcon.textContent = groupInitials(groupNameInput.value);
});

groupSaveButton.addEventListener("click", async () => {
  const title = groupNameInput.value.trim();
  if (!title) { groupNameInput.focus(); return; }

  const mode = groupDialog.dataset.mode;
  groupSaveButton.disabled = true;
  try {
    if (mode === "create") {
      await mutateShortcutState({action:"create-group", title});
    } else if (mode === "combine") {
      if (!groupCombineDraft) throw new Error("Не удалось сохранить исходные ярлыки для группы");
      await mutateShortcutState({
        action:"combine",
        combineKind:"group",
        sourceId:groupCombineDraft.sourceId,
        targetId:groupCombineDraft.targetId,
        title
      });
      groupCombineDraft = null;
    } else if (mode === "edit" && activeGroupId) {
      await mutateShortcutState({action:"rename-group", groupId:activeGroupId, title});
    } else {
      throw new Error("Неизвестный режим сохранения группы");
    }
    groupDialog.close();
  } catch (error) {
    alert(`Не удалось сохранить группу: ${String(error?.message || error)}`);
  } finally {
    groupSaveButton.disabled = false;
  }
});

groupDissolveButton.addEventListener("click", async () => {
  if (!activeGroupId) return;
  await mutateShortcutState({action:"dissolve", id:activeGroupId});
  groupDialog.close();
});

groupDialog.addEventListener("close", () => {
  groupCombineDraft = null;
  activeGroupId = null;
  groupDialog.dataset.mode = "";
});

function openTemplateDraft(source,target) {
  if (!isSite(source) || !isSite(target) || source.id === target.id) return;

  activeTemplateId = null;
  draftTemplate = {
    kind:SHORTCUT_TEMPLATE,
    id:"draft",
    title:`${source.title} + ${target.title}`,
    top:structuredClone(source),
    bottom:structuredClone(target),
    overlap:DEFAULT_TEMPLATE_OVERLAP,
    _swapped:false,
    _combine:{
      sourceId:source.id,
      targetId:target.id
    }
  };

  renderTemplateDialog();
  templateDissolveButton.classList.add("hidden");
  if (!templateDialog.open) templateDialog.showModal();
}

function openTemplateFromCombine() {
  if (!pendingCombine) return;
  const source = topLevelShortcut(pendingCombine.sourceId);
  const target = topLevelShortcut(pendingCombine.targetId);
  pendingCombine = null;
  combineDialog.close();
  openTemplateDraft(source,target);
}

function openTemplateEditor(templateId) {
  const found = findTemplateParent(templateId);
  if (!found) return;
  activeTemplateId = templateId;
  draftTemplate = structuredClone(found.template);
  draftTemplate._swapped = false;
  renderTemplateDialog();
  templateDissolveButton.classList.toggle("hidden", Boolean(found.group));
  if (!templateDialog.open) templateDialog.showModal();
}

function renderTemplateDialog() {
  if (!draftTemplate) return;
  draftTemplate.overlap = clampOverlap(draftTemplate.overlap);
  templateNameInput.value = draftTemplate.title || `${draftTemplate.top.title} + ${draftTemplate.bottom.title}`;
  templateOverlapInput.value = String(draftTemplate.overlap);
  templateOverlapValue.value = `${draftTemplate.overlap}%`;
  templateOverlapValue.textContent = `${draftTemplate.overlap}%`;
  templateTopName.textContent = draftTemplate.top.title;
  templateBottomName.textContent = draftTemplate.bottom.title;
  templatePreview.replaceChildren(templateStackElement(draftTemplate, true));
}

templateOverlapInput.addEventListener("input", () => {
  if (!draftTemplate) return;
  draftTemplate.overlap = clampOverlap(templateOverlapInput.value);
  templateOverlapValue.value = `${draftTemplate.overlap}%`;
  templateOverlapValue.textContent = `${draftTemplate.overlap}%`;
  templatePreview.replaceChildren(templateStackElement(draftTemplate, true));
});

templateSwapButton.addEventListener("click", () => {
  if (!draftTemplate) return;
  const top = draftTemplate.top;
  draftTemplate.top = draftTemplate.bottom;
  draftTemplate.bottom = top;
  draftTemplate._swapped = !draftTemplate._swapped;
  templateTopName.textContent = draftTemplate.top.title;
  templateBottomName.textContent = draftTemplate.bottom.title;
  templatePreview.replaceChildren(templateStackElement(draftTemplate, true));
});

templateSaveButton.addEventListener("click", async () => {
  if (!draftTemplate) return;
  const title = templateNameInput.value.trim() || `${draftTemplate.top.title} + ${draftTemplate.bottom.title}`;
  const overlap = clampOverlap(templateOverlapInput.value);

  templateSaveButton.disabled = true;
  try {
    if (!activeTemplateId) {
      const combine = draftTemplate._combine;
      if (!combine?.sourceId || !combine?.targetId) {
        throw new Error("Не удалось сохранить исходные ярлыки шаблона");
      }
      await mutateShortcutState({
        action:"combine",
        combineKind:"template",
        sourceId:combine.sourceId,
        targetId:combine.targetId,
        topId:draftTemplate.top.id,
        title,
        overlap
      });
    } else {
      await mutateShortcutState({
        action:"update-template",
        templateId:activeTemplateId,
        title,
        overlap,
        swap:draftTemplate._swapped === true
      });
    }
    templateDialog.close();
  } catch (error) {
    alert(`Не удалось сохранить шаблон: ${String(error?.message || error)}`);
  } finally {
    templateSaveButton.disabled = false;
  }
});

templateDissolveButton.addEventListener("click", async () => {
  if (!activeTemplateId) return;
  await mutateShortcutState({action:"dissolve", id:activeTemplateId});
  templateDialog.close();
});

templateDialog.addEventListener("close", () => {
  activeTemplateId = null;
  draftTemplate = null;
});

combineTemplateButton.addEventListener("click", openTemplateFromCombine);
combineGroupButton.addEventListener("click", openGroupFromCombine);
combineDialog.addEventListener("close", () => {
  pendingCombine = null;
});

railNewGroup.addEventListener("click", openOrganizeDialog);
organizeGroupButton.addEventListener("click", () => { organizeDialog.close(); openNewGroupDialog(); });
organizeTemplateButton.addEventListener("click", () => { createTemplateFromOrganizer().catch(error => alert(String(error?.message || error))); });

settingsPwaClear.addEventListener("click", async () => {
  await chrome.storage.local.remove(PWA_CACHE_KEY);
  state.pwaCache = {};
  renderPwaSettings();
  renderAll(false);
});

pwaSidecarDefault.addEventListener("change", async () => {
  if (!pwaDialogPane) return;
  const url = state.panes[pwaDialogPane]?.url;
  try {
    await setPwaPreference(url, pwaSidecarDefault.checked ? "sidecar" : "pane");
    populatePwaDialog(pwaDialogPane);
  } catch (error) {
    pwaSidecarDefault.checked = !pwaSidecarDefault.checked;
    alert(String(error?.message || error));
  }
});

pwaOpenApp.addEventListener("click", () => {
  if (!pwaDialogPane) return;
  openPwaSidecar(pwaDialogPane).catch(error => alert(String(error?.message || error)));
});

pwaDialog.addEventListener("close", () => {
  pwaDialogPane = null;
});

function openSettingsDialog() {
  updateThemeControls();
  renderModuleManager();
  renderPwaSettings();
  if (!settingsDialog.open) settingsDialog.showModal();
}

railAdd.addEventListener("click", () => openAddCurrentSite());
railSettings.addEventListener("click", () => chrome.runtime.sendMessage({type:"OPEN_OPTIONS",windowId:__atnHostWindowId}).catch(()=>{}));
railSearch.addEventListener("click", () => openSearchDialog());
railMedia.addEventListener("click", () => {
  const first = state.mediaStates[0];
  if (first?.pane) { state.layout.activePane = first.pane; renderAll(false); }
});
homeAddCurrent.addEventListener("click", () => openAddCurrentSite());
homeAddCustom.addEventListener("click", () => openAddSiteDialog({blank:true}));
homeImport.addEventListener("click", openImportPicker);
for (const button of siteSourceButtons) {
  button.addEventListener("click", async () => {
    const source = await currentAddDialogSource({sourceKind:button.dataset.source});
    if (source) populateAddDialogSource(source);
  });
}
siteMode.addEventListener("change", updateCompatDomainsVisibility);
cancelSite.addEventListener("click", () => siteDialog.close());
clearSite.addEventListener("click", () => {
  titleInput.value = "";
  siteUrlInput.value = "";
  siteMode.value = "auto";
  siteCompatDomains.value = "";
  siteSourceHint.textContent = "";
  siteSourceHint.classList.add("hidden");
  updateCompatDomainsVisibility();
  titleInput.focus();
});
siteUrlInput.addEventListener("input", renderSiteModuleSuggestion);
siteUrlInput.addEventListener("blur", () => {
  renderSiteModuleSuggestion();
  if (siteMode.value !== "compat" || siteCompatDomains.value.trim()) return;
  const inferred = inferDefaultsForUrl(normalizeUrl(siteUrlInput.value));
  siteCompatDomains.value = inferred.compatDomains.join(", ");
});

function updateCompatDomainsVisibility() {
  compatDomainsRow.classList.toggle("hidden", siteMode.value !== "compat");
}

siteForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const url = normalizeUrl(siteUrlInput.value);
  if (!url) {
    siteUrlInput.focus();
    siteUrlInput.select();
    return;
  }

  const title = titleForUrl(url,titleInput.value);
  titleInput.value = title;

  const mode = normalizeMode(siteMode.value);
  const compatDomains = mode === "compat"
    ? normalizeCompatDomains(siteCompatDomains.value.split(/[,\s]+/))
    : [];

  const saveButton = document.getElementById("save-site");
  saveButton.disabled = true;

  const previousSites = structuredClone(state.sites);
  const previousPanes = structuredClone(state.panes);
  const previousLayout = structuredClone(state.layout);

  try {
    const site = { kind:SHORTCUT_SITE, id:crypto.randomUUID(), title, url, mode, compatDomains };
    const hadNoLaunchable = !firstLaunchableSite(state.sites);
    state.sites = [...state.sites, site];

    const patch = { sites:state.sites };
    if (hadNoLaunchable) {
      const inferred = inferDefaultsForUrl(url);
      state.panes.top = {
        url, title,
        mode,
        compatDomains:normalizeCompatDomains(compatDomains.length ? compatDomains : inferred.compatDomains),
        sourceSiteId:site.id
      };
      state.panes.bottom = { url:"", title:"", mode:"auto", compatDomains:[], sourceSiteId:null };
      state.layout.split = false;
      state.layout.activePane = "top";
      patch.panes = state.panes;
      patch.layout = state.layout;
    }

    await persistWorkspaceState(patch);
    await syncCompatRules();
    siteDialog.close();
    renderAll(false);
  } catch (error) {
    state.sites = previousSites;
    state.panes = previousPanes;
    state.layout = previousLayout;
    renderAll(false);
    alert(`Не удалось добавить сайт: ${String(error?.message || error)}`);
  } finally {
    saveButton.disabled = false;
  }
});

settingsThemeMode.addEventListener("change", () => {
  persistTheme({themeMode:settingsThemeMode.value}).catch(() => {});
});

settingsAccentMode.addEventListener("change", () => {
  persistTheme({accentMode:settingsAccentMode.value}).catch(() => {});
});

settingsAccentColor.addEventListener("input", () => {
  const color = normalizeHexColor(settingsAccentColor.value);
  if (!color) return;
  // Preview instantly while the native color picker is moving.
  state.theme = normalizeThemeSettings({
    [THEME_MODE_KEY]:state.theme.themeMode,
    [ACCENT_MODE_KEY]:"custom",
    [ACCENT_COLOR_KEY]:color
  });
  settingsAccentMode.value = "custom";
  settingsAccentColor.disabled = false;
  applyThemeToDocument(state.theme);
});

settingsAccentColor.addEventListener("change", () => {
  persistTheme({
    accentMode:"custom",
    accentColor:settingsAccentColor.value
  }).catch(() => {});
});

settingsThemeReset.addEventListener("click", () => {
  persistTheme({
    themeMode:"system",
    accentMode:"system",
    accentColor:DEFAULT_ACCENT
  }).catch(() => {});
});

function updateSyncControls() {
  if (settingsSync) settingsSync.checked = state.syncEnabled;
  if (homeSync) homeSync.checked = state.syncEnabled;
}

async function setSyncEnabled(enabled) {
  const response = await chrome.runtime.sendMessage({ type:"SET_SYNC_ENABLED", enabled:Boolean(enabled) });
  if (!response?.ok) throw new Error(response?.error || "Sync error");
  state.syncEnabled = response.enabled === true;
  updateSyncControls();
}

settingsSync.addEventListener("change", async () => {
  try { await setSyncEnabled(settingsSync.checked); }
  catch { settingsSync.checked = state.syncEnabled; }
});
homeSync.addEventListener("change", async () => {
  try { await setSyncEnabled(homeSync.checked); }
  catch { homeSync.checked = state.syncEnabled; }
});

async function exportSettings() {
  const data = await chrome.storage.local.get([
    MODULE_STORAGE_KEY,PWA_PREFS_KEY,
    THEME_MODE_KEY,ACCENT_MODE_KEY,ACCENT_COLOR_KEY
  ]);
  const exportedTheme = normalizeThemeSettings(data);
  const payload = {
    format:"app-tower-next",
    schemaVersion:5,
    exportedAt:new Date().toISOString(),
    workspace:{
      id:state.workspaceId,
      name:state.workspaceName || "Workspace"
    },
    sites:normalizeShortcutList(state.sites),
    panes:structuredClone(state.panes),
    layout:structuredClone(state.layout),
    modules:Object.values(data[MODULE_STORAGE_KEY] || {}),
    pwaPreferences:normalizePwaPreferences(data[PWA_PREFS_KEY]),
    theme:{
      mode:exportedTheme.themeMode,
      accentMode:exportedTheme.accentMode,
      accentColor:exportedTheme.accentColor
    }
  };
  const blob = new Blob([JSON.stringify(payload,null,2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const day = new Date().toISOString().slice(0,10);
  a.href = url;
  a.download = `app-tower-next-${day}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function normalizePwaPreferences(value) {
  const result = {};
  if (!value || typeof value !== "object" || Array.isArray(value)) return result;
  for (const [origin, preference] of Object.entries(value)) {
    try {
      const url = new URL(origin);
      if ((url.protocol === "http:" || url.protocol === "https:") &&
          url.origin === origin &&
          preference === "sidecar") {
        result[origin] = "sidecar";
      }
    } catch {}
  }
  return result;
}

function normalizeImportedTheme(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return normalizeThemeSettings({
    [THEME_MODE_KEY]:value.mode,
    [ACCENT_MODE_KEY]:value.accentMode,
    [ACCENT_COLOR_KEY]:value.accentColor
  });
}

function validateImport(value) {
  if (!value || value.format !== "app-tower-next" || !Array.isArray(value.sites)) return null;
  const sites = normalizeShortcutList(value.sites);
  const modules = [];
  for (const raw of Array.isArray(value.modules) ? value.modules : []) {
    try { modules.push(validateModuleManifest(raw)); } catch {}
  }
  return {
    sites,
    panes:value.panes || null,
    layout:value.layout || null,
    modules,
    pwaPreferences:normalizePwaPreferences(value.pwaPreferences),
    theme:normalizeImportedTheme(value.theme)
  };
}

function openImportPicker() {
  importFile.value = "";
  importFile.click();
}

settingsExport.addEventListener("click", exportSettings);
settingsImport.addEventListener("click", openImportPicker);

settingsModuleImport.addEventListener("click", () => {
  moduleFile.value = "";
  moduleFile.click();
});
moduleFile.addEventListener("change", async () => {
  const file = moduleFile.files?.[0];
  if (!file) return;
  try {
    await installModuleManifest(JSON.parse(await file.text()));
    await loadModuleState();
    await syncCompatRules();
    renderModuleManager();
    renderAll(true);
  } catch (error) {
    alert(`Не удалось установить модуль: ${String(error?.message || error)}`);
  }
});

importFile.addEventListener("change", async () => {
  const file = importFile.files?.[0];
  if (!file) return;
  try {
    const parsed = validateImport(JSON.parse(await file.text()));
    if (!parsed) throw new Error("Некорректный файл App Tower Next");
    pendingImport = parsed;
    importSummary.textContent = `Найдено ярлыков: ${parsed.sites.length}; модулей: ${parsed.modules.length}; PWA-настроек: ${Object.keys(parsed.pwaPreferences).length}. Можно объединить их с текущими или полностью заменить текущую конфигурацию.`;
    if (!importDialog.open) importDialog.showModal();
  } catch (error) {
    alert(String(error?.message || error));
  }
});

async function applyImport(mode) {
  if (!pendingImport) return;
  const incoming = pendingImport;
  pendingImport = null;

  const globalPatch = {};
  if (mode === "merge") {
    const mergedShortcuts = [...state.sites];
    const ids = new Set(mergedShortcuts.map(item => item.id));
    const siteUrls = new Set(
      mergedShortcuts.filter(isSite).map(item => normalizeUrl(item.url)).filter(Boolean)
    );

    for (const item of incoming.sites) {
      if (ids.has(item.id)) continue;
      if (isSite(item)) {
        const url = normalizeUrl(item.url);
        if (url && siteUrls.has(url)) continue;
        if (url) siteUrls.add(url);
      }
      mergedShortcuts.push(item);
      ids.add(item.id);
    }

    state.sites = mergedShortcuts;

    if ((!state.panes.top?.url && !state.panes.bottom?.url) && incoming.panes) {
      state.panes = incoming.panes;
    }

    const mergedModules = { ...state.installedModules };
    for (const manifest of incoming.modules || []) mergedModules[manifest.id] = manifest;

    globalPatch[MODULE_STORAGE_KEY] = mergedModules;
    globalPatch[PWA_PREFS_KEY] = {
      ...state.pwaPreferences,
      ...incoming.pwaPreferences
    };
  } else {
    state.sites = incoming.sites;
    const firstImported = firstLaunchableSite(incoming.sites);
    state.panes = incoming.panes || {
      top:firstImported ? {
        url:firstImported.url,
        title:firstImported.title,
        mode:normalizeMode(firstImported.mode || "auto"),
        compatDomains:firstImported.compatDomains || [],
        sourceSiteId:firstImported.id
      } : {url:"",title:"",mode:"auto",compatDomains:[],sourceSiteId:null},
      bottom:{url:"",title:"",mode:"auto",compatDomains:[],sourceSiteId:null}
    };
    state.layout = incoming.layout || { split:false, ratio:.58, activePane:"top" };

    const replacementModules = {};
    for (const manifest of incoming.modules || []) replacementModules[manifest.id] = manifest;

    globalPatch[MODULE_STORAGE_KEY] = replacementModules;
    globalPatch[PWA_PREFS_KEY] = incoming.pwaPreferences || {};
  }

  if (incoming.theme) {
    globalPatch[THEME_MODE_KEY] = incoming.theme.themeMode;
    globalPatch[ACCENT_MODE_KEY] = incoming.theme.accentMode;
    globalPatch[ACCENT_COLOR_KEY] = incoming.theme.accentColor;
  }

  await persistWorkspaceState({
    sites:state.sites,
    panes:state.panes,
    layout:state.layout
  });
  if (Object.keys(globalPatch).length) await chrome.storage.local.set(globalPatch);

  state.sleepingPanes.clear();
  await loadThemeState();
  await loadModuleState();
  await loadPwaState();
  importDialog.close();
  await syncCompatRules();
  renderAll(false);
  renderModuleManager();
}

importMerge.addEventListener("click", () => applyImport("merge"));
importReplace.addEventListener("click", () => applyImport("replace"));

settingsSingle.addEventListener("click", async () => {
  state.focus = null;
  state.layout.split = false;
  await persistLayout();
  renderAll();
  settingsDialog.close();
});

settingsResetSplit.addEventListener("click", async () => {
  state.focus = null;
  state.layout.split = true;
  state.layout.ratio = 0.58;
  await persistLayout();
  renderAll();
  settingsDialog.close();
});

let dragging = false;
splitter.addEventListener("pointerdown", (event) => {
  if (!state.layout.split) return;
  dragging = true;
  splitter.setPointerCapture(event.pointerId);
  document.body.style.userSelect = "none";
});
splitter.addEventListener("pointermove", (event) => {
  if (!dragging) return;
  const rect = workspace.getBoundingClientRect();
  state.layout.ratio = clamp((event.clientY - rect.top) / rect.height, 0.20, 0.80);
  workspace.style.setProperty("--split-y", `${state.layout.ratio * 100}%`);
});
splitter.addEventListener("pointerup", async (event) => {
  if (!dragging) return;
  dragging = false;
  document.body.style.userSelect = "";
  try { splitter.releasePointerCapture(event.pointerId); } catch {}
  await persistLayout();
});
splitter.addEventListener("dblclick", async () => {
  state.layout.ratio = 0.5;
  await persistLayout();
  renderAll();
});
splitter.addEventListener("keydown", async (event) => {
  if (!["ArrowUp","ArrowDown"].includes(event.key)) return;
  event.preventDefault();
  state.layout.ratio = clamp(state.layout.ratio + (event.key === "ArrowDown" ? 0.03 : -0.03), 0.20, 0.80);
  await persistLayout();
  renderAll();
});

async function persistWorkspaceState(patch={}) {
  const response = await chrome.runtime.sendMessage({type:"UPDATE_WORKSPACE_STATE",windowId:__atnHostWindowId,...patch});
  if (!response?.ok) throw new Error(response?.error || "Не удалось сохранить workspace");
  return response.workspace;
}
async function persistLayout() { await persistWorkspaceState({layout:state.layout}); }

async function consumePendingAction() {
  const { pendingAction } = await chrome.storage.local.get("pendingAction");
  if (pendingAction) await handlePendingAction(pendingAction);
}
async function handlePendingAction(action) {
  if (!action?.intent) return;
  if (Number.isInteger(Number(action.windowId)) && Number(action.windowId) !== __atnHostWindowId) return;
  if (action.intent === "add") {
    const sourceUrl = normalizeUrl(action.sourceUrl);
    if (sourceUrl) {
      openAddSiteDialog({source:{
        kind:"browser-tab",
        pane:null,
        title:titleForUrl(sourceUrl,action.sourceTitle || ""),
        url:sourceUrl,
        mode:"auto",
        compatDomains:inferDefaultsForUrl(sourceUrl).compatDomains
      }});
    } else {
      openAddCurrentSite();
    }
  }
  if (action.intent === "search") openSearchDialog();
  if (action.intent === "settings") chrome.runtime.sendMessage({type:"OPEN_OPTIONS",windowId:__atnHostWindowId}).catch(()=>{});
  if (action.intent === "new-group") openNewGroupDialog();
  if (action.intent === "organize") openOrganizeDialog();
  if (action.intent === "group" && action.groupId) openGroupDialog(String(action.groupId));
  if (action.intent === "combine" && action.sourceId && action.targetId) {
    startCombine(String(action.sourceId), String(action.targetId));
  }
  if (action.intent === "edit-template" && action.templateId) {
    openTemplateEditor(String(action.templateId));
  }
  await chrome.storage.local.remove("pendingAction");
}

function inferDefaultsForUrl(url) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host === "translate.yandex.ru" || host.endsWith(".translate.yandex.ru")) {
      return { mode:"auto", compatDomains:["yandex.ru","ya.ru"] };
    }
  } catch {}
  return { mode:"auto", compatDomains:[] };
}

function compatibilityDomainsForPane(pane) {
  const domains = normalizeCompatDomains(pane.compatDomains || []);
  try { domains.push(new URL(pane.url).hostname.toLowerCase()); } catch {}
  return [...new Set(domains.filter(Boolean))];
}

function normalizeCompatDomains(values) {
  const result = [];
  for (const raw of values || []) {
    const text = String(raw || "").trim().toLowerCase();
    if (!text) continue;
    try {
      const url = new URL(text.includes("://") ? text : `https://${text.replace(/^\.+/, "")}`);
      if (url.hostname && !result.includes(url.hostname)) result.push(url.hostname);
    } catch {}
    if (result.length >= 20) break;
  }
  return result;
}
function resolveAutoMode(url, mode) {
  return normalizeMode(mode);
}
function normalizeMode(mode) { return MODE_ORDER.includes(mode) ? mode : "auto"; }
function normalizeUrl(value) {
  let input = String(value || "").trim();
  if (!input) return null;
  if (!/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(input)) input = "https://" + input;
  try {
    const url = new URL(input);
    if (!['http:','https:'].includes(url.protocol)) return null;
    return url.href;
  } catch { return null; }
}
function isHttpUrl(value) { return Boolean(normalizeUrl(value)); }

function findPaneForUrl(url) {
  for (const name of ["top","bottom"]) {
    const current = state.panes[name]?.url;
    if (!current) continue;
    if (current === url) return name;
    try { if (new URL(current).origin === new URL(url).origin) return name; } catch {}
  }
  return null;
}
function sameOriginOrUrl(a,b) {
  if (!a || !b) return false;
  if (a === b) return true;
  try { return new URL(a).origin === new URL(b).origin; } catch { return false; }
}
function clamp(value,min,max) { return Math.min(max,Math.max(min,value)); }
