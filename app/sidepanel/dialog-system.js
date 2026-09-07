import "./manual-gate-fixes.js";
import "./pane-ui-contract.js";

const currentWindow = await chrome.windows.getCurrent();
const params = new URLSearchParams(location.search);

function parseWindowId(value) {
  if (value == null || value === "") return null;
  const id = Number(value);
  return Number.isInteger(id) && id >= 0 ? id : null;
}

const hostWindowId = parseWindowId(params.get("hostWindowId")) ?? currentWindow.id;

function makeCloseButton(dialog) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "dialog-close";
  button.setAttribute("aria-label", "Закрыть");
  button.title = "Закрыть";
  button.innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4.5 4.5 15.5 15.5M15.5 4.5 4.5 15.5"/></svg>';
  button.addEventListener("click", () => {
    if (dialog.open) dialog.close("cancel");
  });
  return button;
}

function markLegacyCloseOnlyRows(form) {
  for (const row of form.querySelectorAll(".dialog-actions")) {
    const buttons = [...row.querySelectorAll(":scope > button")];
    if (buttons.length !== 1) continue;
    const value = String(buttons[0].value || "").toLowerCase();
    if (value === "close") {
      row.classList.add("dialog-close-only");
      row.setAttribute("aria-hidden", "true");
    }
  }
}

function installDialogShell(dialog) {
  const form = dialog.querySelector("form");
  if (!form || form.dataset.atnDialogShell === "1") return;
  form.dataset.atnDialogShell = "1";
  form.prepend(makeCloseButton(dialog));
  markLegacyCloseOnlyRows(form);
  dialog.addEventListener("pointerdown", event => {
    if (event.target === dialog && dialog.open) dialog.close("backdrop");
  });
}

for (const dialog of document.querySelectorAll("dialog")) installDialogShell(dialog);
const dialogObserver = new MutationObserver(records => {
  for (const record of records) {
    for (const node of record.addedNodes) {
      if (!(node instanceof Element)) continue;
      if (node.matches?.("dialog")) installDialogShell(node);
      for (const dialog of node.querySelectorAll?.("dialog") || []) installDialogShell(dialog);
    }
  }
});
dialogObserver.observe(document.documentElement, {childList:true, subtree:true});

const ICONS = {
  go:'<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h10M10.5 6.5 14 10l-3.5 3.5"/></svg>',
  reload:'<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M15.4 7.2A6 6 0 1 0 16 11"/><path d="M15.4 3.8v3.9h-3.9"/></svg>',
  external:'<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M11 4h5v5M16 4l-7 7"/><path d="M14 11v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4"/></svg>',
  focus:'<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 8V4h4M12 4h4v4M16 12v4h-4M8 16H4v-4"/></svg>',
  restore:'<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 4H4v2M14 4h2v2M16 14v2h-2M4 14v2h2"/><path d="M7 7h6v6H7z"/></svg>',
  settings:'<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="2.6"/><path d="M10 2.8v1.5M10 15.7v1.5M2.8 10h1.5M15.7 10h1.5M4.9 4.9 6 6M14 14l1.1 1.1M15.1 4.9 14 6M6 14l-1.1 1.1"/><circle cx="10" cy="10" r="6"/></svg>'
};

function installToolbarIcons() {
  for (const [action, icon] of Object.entries({go:ICONS.go,reload:ICONS.reload,external:ICONS.external,focus:ICONS.focus})) {
    for (const button of document.querySelectorAll(`[data-action="${action}"]`)) {
      button.classList.add("atn-icon-control");
      button.innerHTML = icon;
    }
  }
  const settings = document.getElementById("rail-settings");
  if (settings) {
    settings.classList.add("atn-icon-control");
    settings.innerHTML = ICONS.settings;
  }
}
installToolbarIcons();

const workspace = document.getElementById("workspace");
function syncFocusButtons() {
  if (!workspace) return;
  const layout = String(workspace.dataset.layout || "");
  for (const pane of document.querySelectorAll(".pane[data-pane]")) {
    const name = pane.dataset.pane;
    const button = pane.querySelector('[data-action="focus"]');
    if (!button) continue;
    const focused = layout === `focus-${name}`;
    const ordinarySingle = layout === `single-${name}`;
    button.hidden = ordinarySingle;
    button.title = focused ? "Вернуть две области" : "Развернуть эту область";
    button.setAttribute("aria-label", button.title);
    button.innerHTML = focused ? ICONS.restore : ICONS.focus;
  }
}
syncFocusButtons();
if (workspace) {
  new MutationObserver(syncFocusButtons).observe(workspace,{attributes:true,attributeFilter:["data-layout"]});
}

const shortcutMenu = document.getElementById("shortcut-menu");
let contextShortcut = null;
let menuSyncQueued = false;

document.addEventListener("contextmenu", event => {
  const shortcut = event.target?.closest?.(".rail-site[data-shortcut-id]");
  contextShortcut = shortcut ? { id:shortcut.dataset.shortcutId || "", kind:shortcut.dataset.shortcutKind || "" } : null;
}, true);

function normalizeMenuSeparators() {
  if (!shortcutMenu) return;
  let previousWasSeparator = true;
  for (const child of [...shortcutMenu.children]) {
    const separator = child.classList.contains("separator");
    if (separator && previousWasSeparator) { child.remove(); continue; }
    previousWasSeparator = separator;
  }
  const last = shortcutMenu.lastElementChild;
  if (last?.classList.contains("separator")) last.remove();
}

function injectTemplateDissolveAction() {
  if (!shortcutMenu || shortcutMenu.classList.contains("hidden")) return;
  if (contextShortcut?.kind !== "template" || !contextShortcut.id) return;
  if (shortcutMenu.querySelector('[data-ui-action="dissolve-template"]')) return;
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.uiAction = "dissolve-template";
  button.textContent = "Разобрать шаблон";
  button.addEventListener("click", async () => {
    const templateId = contextShortcut?.id;
    shortcutMenu.classList.add("hidden");
    if (!templateId) return;
    button.disabled = true;
    try {
      const response = await chrome.runtime.sendMessage({ type:"MUTATE_SHORTCUTS", windowId:hostWindowId, action:"dissolve", id:templateId });
      if (!response?.ok) throw new Error(response?.error || "Не удалось разобрать шаблон");
    } catch (error) {
      alert(`Не удалось разобрать шаблон: ${String(error?.message || error)}`);
    } finally { button.disabled = false; }
  });
  const duplicate = [...shortcutMenu.querySelectorAll("button")].find(item => item.textContent.trim() === "Дублировать");
  const divider = duplicate?.previousElementSibling?.classList?.contains("separator") ? duplicate.previousElementSibling : duplicate;
  if (divider) shortcutMenu.insertBefore(button, divider); else shortcutMenu.append(button);
}

function syncShortcutMenu() {
  menuSyncQueued = false;
  if (!shortcutMenu || shortcutMenu.classList.contains("hidden")) return;
  injectTemplateDissolveAction();
  normalizeMenuSeparators();
}
function queueShortcutMenuSync() {
  if (menuSyncQueued) return;
  menuSyncQueued = true;
  queueMicrotask(syncShortcutMenu);
}
if (shortcutMenu) {
  new MutationObserver(queueShortcutMenuSync).observe(shortcutMenu,{ childList:true, attributes:true, attributeFilter:["class"] });
}

async function activeHostTab() {
  const [tab] = await chrome.tabs.query({active:true,windowId:hostWindowId});
  return tab || null;
}

async function ensureCompactRailReady() {
  const tab = await activeHostTab();
  if (!Number.isInteger(tab?.id)) return {ok:false,reason:"no-active-tab"};
  const url = String(tab.url || "");
  const ownNewTab = chrome.runtime.getURL("newtab/newtab.html");
  if (url.startsWith(ownNewTab)) return {ok:true,kind:"newtab"};
  if (/^https?:\/\//i.test(url)) {
    try {
      await chrome.tabs.sendMessage(tab.id,{type:"ATN_SET_RAIL_VISIBLE",visible:false});
      return {ok:true,kind:"web",injected:false};
    } catch {}
    try {
      await chrome.scripting.insertCSS({target:{tabId:tab.id},files:["content/rail.css"]}).catch(()=>{});
      await chrome.scripting.executeScript({target:{tabId:tab.id},files:["content/rail.js"]});
      await chrome.tabs.sendMessage(tab.id,{type:"ATN_SET_RAIL_VISIBLE",visible:false}).catch(()=>{});
      return {ok:true,kind:"web",injected:true};
    } catch (error) {
      return {ok:false,reason:String(error?.message || error)};
    }
  }
  return {ok:false,reason:"restricted-page",url};
}

async function collapseWithRail() {
  const ready = await ensureCompactRailReady();
  if (!ready.ok) {
    const restricted = ready.reason === "restricted-page";
    alert(restricted
      ? "На служебной странице Edge компактную App Tower rail показать нельзя. App Tower оставлен открытым; перейдите на обычную http/https страницу и сверните снова."
      : `Не удалось подготовить компактную App Tower rail: ${ready.reason || "неизвестная ошибка"}`);
    return;
  }
  const response = await chrome.runtime.sendMessage({type:"COLLAPSE_PANEL",windowId:hostWindowId})
    .catch(error => ({ok:false,error:String(error?.message || error)}));
  if (!response?.ok) alert(response?.error || "Не удалось свернуть App Tower");
}

document.addEventListener("click", event => {
  const button = event.target?.closest?.("#collapse-panel,#settings-collapse");
  if (!button) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  void collapseWithRail();
}, true);

for (const selector of [".home-sync-row small", "#settings-sync + span small"]) {
  const copy = document.querySelector(selector);
  if (copy) copy.textContent = "Синхронизируются ярлыки, модули и основные настройки. Открытые страницы и текущая раскладка остаются локальными.";
}
