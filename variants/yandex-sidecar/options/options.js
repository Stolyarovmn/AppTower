import {applyBrowserSkin,browserCapabilities} from "../shared/browser-adapter.js";
import {readThemeSettings,applyThemeToDocument,watchSystemTheme,THEME_MODE_KEY,ACCENT_MODE_KEY,ACCENT_COLOR_KEY,DEFAULT_ACCENT,normalizeThemeSettings} from "../shared/theme.js";
import {loadModuleCatalog,loadInstalledModules,installBundledModule,uninstallModule,MODULE_STORAGE_KEY,modulesForUrl} from "../modules/module-registry.js";
import {isSite,isGroup,isTemplate,groupInitials} from "../shared/shortcuts.js";
import {WORKSPACES_KEY,DEFAULT_WORKSPACE_KEY} from "../shared/workspaces.js";

applyBrowserSkin(document);
let theme=await readThemeSettings();applyThemeToDocument(theme);
watchSystemTheme(()=>{if(theme.themeMode==="system"||theme.accentMode==="system")applyThemeToDocument(theme)});
const currentWindow=await chrome.windows.getCurrent();
const windowId=currentWindow.id;
const q=id=>document.getElementById(id);
const send=(type,payload={})=>chrome.runtime.sendMessage({type,windowId,...payload});

async function openTowerDirect(intent=null, extra={}) {
  const pendingWrite = intent
    ? chrome.storage.local.set({pendingAction:{intent,windowId,nonce:Date.now(),...extra}})
    : Promise.resolve();
  if (browserCapabilities().nativeSidePanel && chrome.sidePanel?.open) {
    chrome.storage.local.set({atnEnabled:true}).catch(()=>{});
    // Call open() before awaiting anything so the browser still sees the
    // original button click as the required user activation.
    const opening = chrome.sidePanel.open({windowId});
    await pendingWrite;
    await opening;
    return {ok:true,native:true};
  }
  await pendingWrite;
  return send("OPEN_PANEL",{intent,...extra});
}

async function ensureTowerOpenFromClick() {
  if (browserCapabilities().nativeSidePanel && chrome.sidePanel?.open) {
    chrome.storage.local.set({atnEnabled:true}).catch(()=>{});
    await chrome.sidePanel.open({windowId});
    return true;
  }
  const response = await send("OPEN_PANEL");
  if (!response?.ok) throw new Error(response?.error || "Не удалось открыть App Tower");
  return false;
}

async function openSiteDirect(payload) {
  const nativeOpened = await ensureTowerOpenFromClick();
  const response = await send("OPEN_SITE",{...payload,containerOpened:nativeOpened});
  if (!response?.ok) throw new Error(response?.error || "Не удалось открыть сайт");
  return response;
}

async function openTemplateDirect(template) {
  const nativeOpened = await ensureTowerOpenFromClick();
  const response = await send("OPEN_TEMPLATE",{template,containerOpened:nativeOpened});
  if (!response?.ok) throw new Error(response?.error || "Не удалось открыть шаблон");
  return response;
}

const nav=[...document.querySelectorAll("#settings-nav button")];
function showPage(id){for(const b of nav)b.classList.toggle("active",b.dataset.section===id);for(const p of document.querySelectorAll(".page"))p.classList.toggle("active",p.dataset.page===id);location.hash=id;void refreshSection(id)}
for(const b of nav)b.addEventListener("click",()=>showPage(b.dataset.section));

async function consumeOptionsRoute(){
  const {atnOptionsRoute}=await chrome.storage.local.get("atnOptionsRoute");
  if(!atnOptionsRoute||typeof atnOptionsRoute!=="object")return null;
  await chrome.storage.local.remove("atnOptionsRoute");
  return atnOptionsRoute;
}
let activeRoute=await consumeOptionsRoute();
const initialSection=activeRoute?.section||location.hash.slice(1)||"general";
showPage(initialSection);

chrome.storage.onChanged.addListener((changes,area)=>{
  if(area!=="local"||!changes.atnOptionsRoute?.newValue)return;
  const route=changes.atnOptionsRoute.newValue;
  activeRoute=route;
  chrome.storage.local.remove("atnOptionsRoute").catch(()=>{});
  showPage(route.section||"general");
});

async function refreshSection(id){
  if(id==="general")return renderGeneral();
  if(id==="workspaces"||id==="shortcuts")return renderWorkspaces();
  if(id==="recent")return renderRecent();
  if(id==="sites"||id==="notifications")return renderSites();
  if(id==="performance")return renderPerformance();
  if(id==="modules"||id==="permissions")return renderModules();
  if(id==="webapps")return renderWebApps();
  if(id==="sidecars")return renderSidecars();
  if(id==="media")return renderMedia();
  if(id==="data")return renderData();
}

async function renderGeneral(){const caps=await send("GET_BROWSER_CAPABILITIES");q("browser-card").innerHTML=`<h2>${escape(caps.browser?.name||"Chromium")}</h2><div class="cap-grid"><span class="pill">${caps.nativeSidePanel?"Native Side Panel":"Sidecar fallback"}</span><span class="pill">UI: ${escape(caps.browser?.style||"chromium")}</span><span class="pill">Workspace binding: browser window</span></div><p class="muted">Публичного API идентификатора Edge/Chrome browser Workspace расширениям не предоставлено; App Tower поэтому привязывает свой workspace к текущему окну браузера.</p>`}
q("open-tower").addEventListener("click",()=>openTowerDirect().catch(e=>alert(String(e.message||e))));
q("open-search").addEventListener("click",()=>openTowerDirect("search").catch(e=>alert(String(e.message||e))));

const themeMode=q("theme-mode"),accentMode=q("accent-mode"),accentColor=q("accent-color");
function themeControls(){themeMode.value=theme.themeMode;accentMode.value=theme.accentMode;accentColor.value=theme.accentColor||DEFAULT_ACCENT;accentColor.disabled=theme.accentMode!=="custom"}
themeControls();
async function saveTheme(patch){theme=normalizeThemeSettings({[THEME_MODE_KEY]:patch.themeMode??theme.themeMode,[ACCENT_MODE_KEY]:patch.accentMode??theme.accentMode,[ACCENT_COLOR_KEY]:patch.accentColor??theme.accentColor});applyThemeToDocument(theme);themeControls();await chrome.storage.local.set({[THEME_MODE_KEY]:theme.themeMode,[ACCENT_MODE_KEY]:theme.accentMode,[ACCENT_COLOR_KEY]:theme.accentColor})}
themeMode.addEventListener("change",()=>saveTheme({themeMode:themeMode.value}));accentMode.addEventListener("change",()=>saveTheme({accentMode:accentMode.value}));accentColor.addEventListener("input",()=>saveTheme({accentMode:"custom",accentColor:accentColor.value}));q("theme-reset").addEventListener("click",()=>saveTheme({themeMode:"system",accentMode:"system",accentColor:DEFAULT_ACCENT}));

let workspaceState=null;
async function renderWorkspaces(){workspaceState=await send("LIST_WORKSPACES");if(!workspaceState?.ok)return;const caps=browserCapabilities();q("workspace-binding").textContent=caps.nativeBrowserWorkspace?"Доступна нативная привязка browser Workspace.":"У браузера нет публичного Extensions API для ID нативного Workspace. App Tower автоматически хранит привязку workspace → текущее окно браузера на время сессии.";const host=q("workspace-list");host.replaceChildren();for(const ws of workspaceState.workspaces){const row=document.createElement("div");row.className="row";row.innerHTML=`<div class="row-main"><strong>${escape(ws.name)}</strong><small>${ws.id===workspaceState.activeWorkspaceId?"Активен в этом окне":""} ${ws.id===workspaceState.defaultWorkspaceId?"· По умолчанию":""}</small></div><div class="workspace-actions"></div>`;const a=row.querySelector(".workspace-actions");a.append(button("Открыть",()=>send("SET_ACTIVE_WORKSPACE",{workspaceId:ws.id}).then(()=>renderWorkspaces())),button("Переименовать",async()=>{const name=prompt("Название workspace",ws.name);if(name)await send("RENAME_WORKSPACE",{workspaceId:ws.id,name});renderWorkspaces()}),button("По умолчанию",()=>send("SET_DEFAULT_WORKSPACE",{workspaceId:ws.id}).then(()=>renderWorkspaces())));if(workspaceState.workspaces.length>1)a.append(button("Удалить",async()=>{if(confirm(`Удалить workspace «${ws.name}»?`))await send("DELETE_WORKSPACE",{workspaceId:ws.id});renderWorkspaces()},"danger"));host.append(row)}await renderShortcutTree()}
q("workspace-create").addEventListener("click",async()=>{const name=q("workspace-name").value.trim();if(!name)return;await send("CREATE_WORKSPACE",{name,copyCurrent:false,activate:true});q("workspace-name").value="";renderWorkspaces()});
q("shortcut-organize").addEventListener("click",()=>openTowerDirect("organize").catch(e=>alert(String(e.message||e))));
q("shortcut-search").addEventListener("click",()=>openTowerDirect("search").catch(e=>alert(String(e.message||e))));

async function renderShortcutTree(){const state=await send("GET_WINDOW_STATE");const host=q("shortcut-tree");host.replaceChildren();if(!state?.sites?.length){host.innerHTML='<div class="empty">Ярлыков пока нет.</div>';return}for(const item of state.sites)host.append(renderShortcut(item))}
function renderShortcut(item,depth=0){
  const row=document.createElement("div");
  row.className="row";if(depth)row.classList.add("tree-indent");
  const label=isGroup(item)?`Группа ${groupInitials(item.title)}`:isTemplate(item)?"Шаблон 2 pane":"Сайт";
  row.innerHTML=`<div class="row-main"><strong>${escape(item.title||item.url)}</strong><small>${label}${item.url?` · ${escape(item.url)}`:""}</small></div>`;
  const actions=document.createElement("div");actions.className="row-actions";
  if(isSite(item)){
    actions.append(
      button("Открыть",()=>openSiteDirect({url:item.url,title:item.title,mode:item.mode,compatDomains:item.compatDomains,siteId:item.id}).catch(e=>alert(String(e.message||e)))),
      button("Снизу",()=>openSiteDirect({url:item.url,title:item.title,mode:item.mode,compatDomains:item.compatDomains,siteId:item.id,targetPane:"bottom"}).catch(e=>alert(String(e.message||e)))),
      button("Настройки",async()=>{await chrome.storage.local.set({atnOptionsRoute:{section:"sites",url:item.url,nonce:Date.now()}});showPage("sites")})
    );
  } else if(isTemplate(item)){
    actions.append(button("Открыть",()=>openTemplateDirect(item).catch(e=>alert(String(e.message||e)))),button("Настроить",()=>openTowerDirect("edit-template",{templateId:item.id})));
  } else if(isGroup(item)){
    actions.append(button("Открыть / настроить",()=>openTowerDirect("group",{groupId:item.id})));
  }
  row.append(actions);
  if(isGroup(item)){const wrap=document.createElement("div");wrap.style.gridColumn="1/-1";for(const child of item.items)wrap.append(renderShortcut(child,depth+1));row.append(wrap)}
  return row;
}

async function renderRecent(){
  const response=await send("GET_RECENT",{all:true});
  const host=q("recent-list");
  host.replaceChildren();
  const recent=Array.isArray(response?.recent)?response.recent:[];

  for(const item of recent){
    const row=document.createElement("div");
    row.className="row";
    const when=Number(item.openedAt)?new Date(item.openedAt).toLocaleString():"";
    row.innerHTML=`<div class="row-main"><strong>${escape(item.title||item.url)}</strong><small>${escape(item.url||"")} ${item.workspaceName?`· ${escape(item.workspaceName)}`:""} ${when?`· ${escape(when)}`:""}</small></div>`;
    const actions=document.createElement("div");
    actions.className="workspace-actions";
    actions.append(button("Открыть",()=>{
      if(item.kind==="template"&&item.template){
        return openTemplateDirect(item.template).catch(e=>alert(String(e.message||e)));
      }
      return openSiteDirect({
        url:item.url,
        title:item.title||item.url,
        mode:"auto"
      }).catch(e=>alert(String(e.message||e)));
    }));
    row.append(actions);
    host.append(row);
  }

  if(!host.children.length)host.innerHTML='<div class="empty">История App Tower пока пуста.</div>';
}

let allSites=[];
async function renderSites(){
  const data=await send("GET_ALL_SITE_SETTINGS");
  if(!data?.ok)return;
  allSites=uniqueByOrigin(data.sites||[]);
  const installedModules=await loadInstalledModules();
  renderSiteRows(q("site-list"),allSites,false,installedModules);
  renderSiteRows(q("notification-list"),allSites,true,installedModules);
}
function uniqueByOrigin(list){
  const m=new Map();
  for(const s of list){
    try{
      const origin=new URL(s.url).origin;
      if(!m.has(origin))m.set(origin,{...s,origin});
    }catch{}
  }
  return [...m.values()];
}
function renderSiteRows(host,sites,notificationsOnly,installedModules={}){
  host.replaceChildren();
  if(!sites.length){
    host.innerHTML='<div class="empty">Сайтов пока нет.</div>';
    return;
  }

  for(const site of sites){
    const row=document.createElement("div");
    row.className="row";
    if(activeRoute?.url&&site.url&&sameOrigin(initialRoute.url,site.url))row.classList.add("route-highlight");

    const controls=document.createElement("div");
    controls.className="site-controls";
    row.innerHTML=`<div class="row-main"><strong>${escape(site.title||site.origin)}</strong><small>${escape(site.origin)} · ${escape(site.workspaceName||"")}</small></div>`;
    row.append(controls);

    if(notificationsOnly){
      const sel=select([['default','По умолчанию'],['allow','Разрешить'],['block','Блокировать']]);
      let currentSettings=null;

      send("GET_SITE_SETTINGS",{url:site.url}).then(r=>{
        if(!r?.settings)return;
        currentSettings=r.settings;
        sel.value=r.settings.notifications;
        renderNotificationCategories(row,site,r.settings,installedModules);
      });

      sel.addEventListener("change",async()=>{
        if(!(await ensureOptionalPermission("contentSettings"))){
          sel.value=currentSettings?.notifications||"default";
          return;
        }
        const r=await send("APPLY_NOTIFICATION_SETTING",{url:site.url,setting:sel.value});
        if(!r?.ok){
          alert(r?.error||"Не удалось изменить уведомления");
          sel.value=currentSettings?.notifications||"default";
          return;
        }
        currentSettings=r.settings;
      });
      controls.append(wrapControl("Уведомления",sel));
    }else{
      const zoom=document.createElement("input");
      zoom.type="number";
      zoom.min="60";
      zoom.max="150";
      zoom.step="5";
      const sleep=select([['default','5 мин'],['never','Не усыплять*']]);

      send("GET_SITE_SETTINGS",{url:site.url}).then(r=>{
        if(r?.settings){
          zoom.value=r.settings.zoom;
          sleep.value=r.settings.sleepPolicy;
        }
      });
      zoom.addEventListener("change",()=>send("SET_SITE_SETTINGS",{url:site.url,patch:{zoom:Number(zoom.value)}}));
      sleep.addEventListener("change",()=>send("SET_SITE_SETTINGS",{url:site.url,patch:{sleepPolicy:sleep.value}}));
      controls.append(wrapControl("Zoom %",zoom),wrapControl("Sleep",sleep));
    }

    host.append(row);
  }
}

function renderNotificationCategories(row,site,settings,installedModules){
  const categories=modulesForUrl(site.url,installedModules)
    .flatMap(mod=>(mod.notificationCategories||[]).map(category=>({...category,moduleName:mod.name})));
  if(!categories.length)return;

  const box=document.createElement("div");
  box.className="notification-categories";
  const title=document.createElement("strong");
  title.textContent="Типы уведомлений модулей";
  box.append(title);

  const selected=new Set(settings.notificationCategories||[]);
  for(const category of categories){
    const label=document.createElement("label");
    label.className="category-toggle";
    const input=document.createElement("input");
    input.type="checkbox";
    input.checked=selected.has(category.id);

    const text=document.createElement("span");
    text.textContent=`${category.name} · ${category.moduleName}`;
    label.append(input,text);
    if(category.description)label.title=category.description;

    input.addEventListener("change",async()=>{
      if(input.checked)selected.add(category.id);else selected.delete(category.id);
      const response=await send("SET_SITE_SETTINGS",{
        url:site.url,
        patch:{notificationCategories:[...selected]}
      });
      if(!response?.ok){
        input.checked=!input.checked;
        alert(response?.error||"Не удалось сохранить категории");
      }
    });
    box.append(label);
  }
  row.append(box);
}

async function renderPerformance(){
  const r=await send("GET_RESOURCE_STATUS");
  q("max-live").value=String(r.performance?.maxLive||6);
  const host=q("resource-status");host.replaceChildren();
  const live=r.live||[];
  q("resource-summary").textContent=`Диагностика загруженных pane (${live.length})`;
  for(const lease of live){
    const row=document.createElement("div");row.className="row";
    const idle=Math.max(0,Math.round((Date.now()-Number(lease.lastActivity||Date.now()))/1000));
    let hostName=lease.url;try{hostName=new URL(lease.url).hostname}catch{}
    row.innerHTML=`<div class="row-main"><strong>${escape(hostName)}</strong><small>${escape(lease.pane)} pane · ${escape(lease.renderer||"web")} · без активности ${idle} с${lease.keepAlive?" · media":""}${lease.neverSleep?" · не усыплять":""}</small></div>`;
    host.append(row);
  }
  if(!live.length)host.innerHTML='<div class="empty">Сейчас ни одна web/media pane не зарегистрирована как загруженная.</div>';
}
q("max-live").addEventListener("change",()=>send("SET_PERFORMANCE",{maxLive:Number(q("max-live").value)}).then(()=>renderPerformance()));

async function renderModules(){const [catalog,installed]=await Promise.all([loadModuleCatalog(),loadInstalledModules()]);const host=q("module-list");const perm=q("permission-list");host.replaceChildren();perm.replaceChildren();for(const entry of catalog){const isInstalled=Boolean(installed[entry.id]);const row=document.createElement("div");row.className="row";row.innerHTML=`<div class="row-main"><strong>${escape(entry.name)}</strong><small>${escape(entry.description||"")} · ${escape((entry.hosts||[]).join(", "))}</small></div>`;row.append(button(isInstalled?"Удалить":"Установить",async()=>{if(isInstalled)await uninstallModule(entry.id);else await installBundledModule(entry.id);renderModules()}));host.append(row)}for(const mod of Object.values(installed)){
  const renderers=[...new Set((mod.adapters||[]).map(a=>a.renderer?.type).filter(Boolean))];
  const categories=(mod.notificationCategories||[]).map(c=>c.name||c.id).filter(Boolean);
  const capabilityText=[
    renderers.length?`renderers: ${renderers.join(", ")}`:"renderers: —",
    categories.length?`notifications: ${categories.join(", ")}`:"notifications: —"
  ].join(" · ");
  const row=document.createElement("div");
  row.className="row";
  row.innerHTML=`<div class="row-main"><strong>${escape(mod.name)}</strong><small>Declarative only · hosts: ${escape((mod.hosts||[]).join(", ")||"нет")} · ${escape(capabilityText)}</small></div><span class="pill">без удалённого JS</span>`;
  perm.append(row)
}const caps=browserCapabilities();const b=document.createElement("div");b.className="card";b.innerHTML=`<h2>BrowserAdapter</h2><div class="cap-grid"><span class="pill">sidePanel ${caps.nativeSidePanel?"✓":"fallback"}</span><span class="pill">contextMenus ${caps.contextMenus?"✓":"—"}</span><span class="pill">contentSettings ${caps.contentSettings?"✓":"optional"}</span><span class="pill">notifications ${caps.systemNotifications?"✓":"optional"}</span></div>`;perm.prepend(b)}

async function renderWebApps(){
  const data=await chrome.storage.local.get(["atnPwaCacheV1","atnPwaPreferencesV1"]);
  const cache=data.atnPwaCacheV1||{};
  const prefs=data.atnPwaPreferencesV1||{};
  const host=q("webapp-list");host.replaceChildren();
  for(const pwa of Object.values(cache)){
    const row=document.createElement("div");row.className="row";
    row.innerHTML=`<div class="row-main"><strong>${escape(pwa.name||pwa.origin)}</strong><small>${escape(pwa.origin)} · ${escape(pwa.display||"browser")} · ${(pwa.shortcuts||[]).length} shortcuts</small></div>`;
    const actions=document.createElement("div");actions.className="webapp-actions";
    const appMode=prefs[pwa.origin]==="sidecar";
    actions.append(
      button("В App Tower",()=>openSiteDirect({url:pwa.startUrl,title:pwa.name||pwa.origin,mode:"auto"}).catch(e=>alert(String(e.message||e)))),
      button("Открыть как приложение",()=>send("OPEN_PWA_SIDECAR",{pageUrl:pwa.startUrl,targetUrl:pwa.startUrl})),
      button(appMode?"Auto: App ✓":"Auto: App",()=>send("SET_PWA_PREFERENCE",{url:pwa.startUrl,preference:appMode?"pane":"sidecar"}).then(()=>renderWebApps())),
      button("Забыть",()=>send("FORGET_PWA",{url:pwa.startUrl}).then(()=>renderWebApps()),"danger")
    );
    row.append(actions);host.append(row);
  }
  if(!host.children.length)host.innerHTML='<div class="empty">Web App Manifest пока не обнаружены. Откройте такой сайт в App Tower — запись появится автоматически.</div>';
}
async function renderSidecars(){const r=await send("GET_SIDECARS");const host=q("sidecar-list");host.replaceChildren();for(const sc of r.sidecars||[]){const row=document.createElement("div");row.className="row";row.innerHTML=`<div class="row-main"><strong>${escape(sc.title||sc.url)}</strong><small>${escape(sc.kind)} · ${escape(sc.url||"")}</small></div>`;const a=document.createElement("div");a.className="workspace-actions";a.append(button("Фокус",()=>send("FOCUS_SIDECAR",{sidecarWindowId:sc.windowId})),button("Закрыть",()=>send("CLOSE_SIDECAR",{sidecarWindowId:sc.windowId}).then(()=>renderSidecars())));row.append(a);host.append(row)}if(!host.children.length)host.innerHTML='<div class="empty">Отдельных sidecar-окон сейчас нет. Они появятся после «Открыть отдельно» / Real Page или «Открыть как приложение» у Web App.</div>'}
async function renderMedia(){const r=await send("GET_MEDIA_STATE");const host=q("media-list");host.replaceChildren();for(const m of r.states||[]){const row=document.createElement("div");row.className="row";row.innerHTML=`<div class="row-main"><strong>${escape(m.title||m.provider)}</strong><small>${escape(m.provider)} · ${m.playing?"playing":"attached"} · ${m.controllable?"controls available":"transport API unavailable"}</small></div><span class="pill">${escape(m.pane)}</span>`;host.append(row)}if(!host.children.length)host.innerHTML='<div class="empty">Активных media surface нет.</div>'}
async function renderData(){const state=await send("GET_STATE");q("sync-enabled").checked=state.syncEnabled===true}
q("sync-enabled").addEventListener("change",()=>send("SET_SYNC_ENABLED",{enabled:q("sync-enabled").checked}));

q("export-data").addEventListener("click",async()=>{const keys=[WORKSPACES_KEY,DEFAULT_WORKSPACE_KEY,MODULE_STORAGE_KEY,"atnPwaPreferencesV1","atnSiteSettingsV1",THEME_MODE_KEY,ACCENT_MODE_KEY,ACCENT_COLOR_KEY];const data=await chrome.storage.local.get(keys);const payload={format:"app-tower-next-backup",schemaVersion:5,exportedAt:new Date().toISOString(),data};downloadJson(payload,`app-tower-next-${new Date().toISOString().slice(0,10)}.json`)});
q("import-data").addEventListener("click",()=>q("import-file").click());
q("import-file").addEventListener("change",async()=>{
  const f=q("import-file").files?.[0];
  if(!f)return;
  try{
    const payload=JSON.parse(await f.text());
    if(payload?.format!=="app-tower-next-backup"||!payload.data||typeof payload.data!=="object"||Array.isArray(payload.data))throw new Error("Неверный формат backup");
    const allowed=new Set([WORKSPACES_KEY,DEFAULT_WORKSPACE_KEY,MODULE_STORAGE_KEY,"atnPwaPreferencesV1","atnSiteSettingsV1",THEME_MODE_KEY,ACCENT_MODE_KEY,ACCENT_COLOR_KEY]);
    const patch={};
    for(const [key,value] of Object.entries(payload.data))if(allowed.has(key))patch[key]=value;
    if(!Object.keys(patch).length)throw new Error("В backup нет поддерживаемых настроек");
    if(!confirm("Заменить соответствующие настройки данными из backup?"))return;
    await chrome.storage.local.set(patch);
    alert("Импорт завершён");
    location.reload();
  }catch(e){alert(String(e.message||e))}
});

function sameOrigin(a,b){try{return new URL(a).origin===new URL(b).origin}catch{return false}}
async function ensureOptionalPermission(permission){if(await chrome.permissions.contains({permissions:[permission]}))return true;return chrome.permissions.request({permissions:[permission]})}
function button(text,fn,cls=""){const b=document.createElement("button");b.textContent=text;if(cls)b.className=cls;b.addEventListener("click",fn);return b}function select(options){const s=document.createElement("select");for(const [v,t] of options){const o=document.createElement("option");o.value=v;o.textContent=t;s.append(o)}return s}function wrapControl(text,node){const l=document.createElement("label");l.textContent=text;l.append(node);return l}function escape(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}function downloadJson(data,name){const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});const u=URL.createObjectURL(blob);const a=document.createElement("a");a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}
