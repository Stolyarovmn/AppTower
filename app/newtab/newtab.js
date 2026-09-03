import { applyBrowserSkin } from "../shared/browser-adapter.js";
import {
  THEME_MODE_KEY,
  ACCENT_MODE_KEY,
  ACCENT_COLOR_KEY,
  readThemeSettings,
  applyThemeToDocument,
  watchSystemTheme
} from "../shared/theme.js";
import {
  normalizeShortcutList,
  groupInitials,
  isSite,
  isGroup,
  isTemplate,
  clampOverlap
} from "../shared/shortcuts.js";

applyBrowserSkin(document);
const currentWindow = await chrome.windows.getCurrent();
const currentWindowId = currentWindow.id;

let railPort=null;
function connectRailPort(){
  if(railPort)return;
  try{
    const port=chrome.runtime.connect({name:"ATN_RAIL"});
    railPort=port;
    port.onMessage.addListener(message=>{
      if(message?.type==="ATN_WORKSPACE_CHANGED")renderSites().catch(()=>{});
      if(message?.type==="ATN_RAIL_VISIBILITY")rail.classList.toggle("hidden",message.visible===false);
    });
    port.onDisconnect.addListener(()=>{
      if(railPort===port)railPort=null;
      setTimeout(connectRailPort,250);
    });
  }catch{
    setTimeout(connectRailPort,500);
  }
}
connectRailPort();

const rail = document.getElementById("nt-rail");
const sitesHost = document.getElementById("nt-sites");
const sitesScroll = document.getElementById("nt-sites-scroll");
const scrollUp = document.getElementById("nt-scroll-up");
const scrollDown = document.getElementById("nt-scroll-down");
let shortcuts = [];
let suppressShortcutClickUntil = 0;
let drag = null;

let themeSettings = await readThemeSettings();
applyThemeToDocument(themeSettings);
watchSystemTheme(() => {
  if (themeSettings.themeMode === "system" || themeSettings.accentMode === "system") {
    applyThemeToDocument(themeSettings);
  }
});

function faviconURL(url) {
  const u = new URL("/_favicon/", chrome.runtime.getURL("/"));
  u.searchParams.set("pageUrl", url);
  u.searchParams.set("size", "32");
  return u.href;
}
function fallback(title, className="fallback") {
  const e=document.createElement("span");e.className=className;e.textContent=(title||"?").trim().slice(0,1).toUpperCase();return e;
}
function templateStack(item) {
  const stack=document.createElement("span");stack.className="template-stack";
  const overlap=clampOverlap(item.overlap),size=20,offset=Math.max(2,Math.round(size*(1-overlap/100)));
  stack.style.width=`${size+offset}px`;stack.style.height=`${size+offset}px`;
  const make=(site,cls,left,top)=>{const img=document.createElement("img");img.className=cls;img.alt="";img.draggable=false;img.src=faviconURL(site.url);img.style.left=`${left}px`;img.style.top=`${top}px`;img.addEventListener("error",()=>{const r=fallback(site.title,`template-fallback ${cls}`);r.style.cssText=img.style.cssText;img.replaceWith(r)},{once:true});return img};
  stack.append(make(item.bottom,"template-bottom",offset,offset),make(item.top,"template-top",0,0));return stack;
}
function visual(item) {
  if (isGroup(item)) { const e=document.createElement("span");e.className="group-badge";e.textContent=groupInitials(item.title);return e; }
  if (isTemplate(item)) return templateStack(item);
  const img=document.createElement("img");img.src=faviconURL(item.url);img.alt="";img.draggable=false;img.addEventListener("error",()=>img.replaceWith(fallback(item.title)),{once:true});return img;
}
async function openPanel(intent, extra={}) {
  return chrome.runtime.sendMessage({type:"OPEN_PANEL",windowId:currentWindowId,intent,...extra});
}
async function activate(item,event) {
  if (isGroup(item)) return openPanel("group",{groupId:item.id});
  if (isTemplate(item)) return chrome.runtime.sendMessage({type:"OPEN_TEMPLATE",windowId:currentWindowId,template:item});
  return chrome.runtime.sendMessage({
    type:"OPEN_SITE",windowId:currentWindowId,url:item.url,title:item.title,
    mode:item.mode,compatDomains:item.compatDomains,siteId:item.id,
    targetPane:event?.shiftKey?"bottom":undefined
  });
}
function buttonFor(item) {
  const b=document.createElement("button");b.className="site";b.type="button";b.dataset.shortcutId=item.id;
  b.title=isGroup(item)?`${item.title}\nГруппа · ${item.items.length} ярл.`:isTemplate(item)?`${item.title}\nШаблон двух панелей`:(item.title||item.url);
  b.append(visual(item));
  b.addEventListener("click",e=>{if(Date.now()<suppressShortcutClickUntil)return;activate(item,e).catch(()=>{})});
  b.addEventListener("contextmenu",e=>{e.preventDefault();if(isTemplate(item))openPanel("edit-template",{templateId:item.id}).catch(()=>{});else if(isGroup(item))openPanel("group",{groupId:item.id}).catch(()=>{})});
  return b;
}
function updateScrollControls() {
  const overflow=sitesScroll.scrollHeight>sitesScroll.clientHeight+2;
  scrollUp.classList.toggle("hidden",!overflow);scrollDown.classList.toggle("hidden",!overflow);
  if(!overflow)return;
  scrollUp.disabled=sitesScroll.scrollTop<=1;
  scrollDown.disabled=sitesScroll.scrollTop+sitesScroll.clientHeight>=sitesScroll.scrollHeight-1;
}
scrollUp.addEventListener("click",()=>sitesScroll.scrollBy({top:-120,behavior:"smooth"}));
scrollDown.addEventListener("click",()=>sitesScroll.scrollBy({top:120,behavior:"smooth"}));
sitesScroll.addEventListener("scroll",updateScrollControls,{passive:true});
new ResizeObserver(updateScrollControls).observe(sitesScroll);

async function renderSites(){
  const response = await chrome.runtime.sendMessage({type:"GET_SHORTCUTS",windowId:currentWindowId});
  shortcuts = normalizeShortcutList(response?.sites || []);
  sitesHost.replaceChildren();
  for (const item of shortcuts) sitesHost.append(buttonFor(item));
  queueMicrotask(updateScrollControls);
}
function clearDrop(){for(const el of sitesHost.querySelectorAll(".drop-before,.drop-after,.drop-combine"))el.classList.remove("drop-before","drop-after","drop-combine")}
function beginDrag(event,button){if(!drag||drag.dragging)return;drag.dragging=true;clearTimeout(drag.holdTimer);button.classList.add("dragging");try{button.setPointerCapture(event.pointerId)}catch{}}
function targetAt(event){const hit=document.elementFromPoint(event.clientX,event.clientY);const button=hit?.closest?.(".site[data-shortcut-id]");if(!button||button.dataset.shortcutId===drag?.sourceId)return null;const rect=button.getBoundingClientRect(),ratio=(event.clientY-rect.top)/Math.max(1,rect.height);let mode=ratio<.25?"before":ratio>.75?"after":"combine";const source=shortcuts.find(x=>x.id===drag.sourceId),target=shortcuts.find(x=>x.id===button.dataset.shortcutId);if(!source||!target)return null;if(isGroup(source)&&mode==="combine")mode=ratio<.5?"before":"after";return{button,target,mode}}
sitesHost.addEventListener("dragstart",event=>event.preventDefault());
sitesHost.addEventListener("pointerdown",event=>{if(event.button!==0)return;const button=event.target.closest(".site[data-shortcut-id]");if(!button)return;drag={sourceId:button.dataset.shortcutId,pointerId:event.pointerId,pointerType:event.pointerType,startX:event.clientX,startY:event.clientY,dragging:false,target:null,holdTimer:null};if(event.pointerType==="touch"||event.pointerType==="pen")drag.holdTimer=setTimeout(()=>{if(drag?.pointerId===event.pointerId&&!drag.dragging)beginDrag(event,button)},360)});
window.addEventListener("pointermove",event=>{if(!drag||drag.pointerId!==event.pointerId)return;const dist=Math.hypot(event.clientX-drag.startX,event.clientY-drag.startY),source=sitesHost.querySelector(`[data-shortcut-id="${CSS.escape(drag.sourceId)}"]`);if(!drag.dragging){if(drag.pointerType==="mouse"&&dist>=5&&source)beginDrag(event,source);else if(drag.pointerType!=="mouse"&&dist>=10){clearTimeout(drag.holdTimer);drag=null;return}}if(!drag?.dragging)return;event.preventDefault();const scrollRect=sitesScroll.getBoundingClientRect();if(event.clientY<scrollRect.top+26)sitesScroll.scrollBy({top:-10});else if(event.clientY>scrollRect.bottom-26)sitesScroll.scrollBy({top:10});clearDrop();drag.target=targetAt(event);if(drag.target)drag.target.button.classList.add(`drop-${drag.target.mode}`)},{passive:false});
async function finishDrag(event){if(!drag||drag.pointerId!==event.pointerId)return;clearTimeout(drag.holdTimer);const current=drag;drag=null;sitesHost.querySelector(`[data-shortcut-id="${CSS.escape(current.sourceId)}"]`)?.classList.remove("dragging");clearDrop();if(!current.dragging)return;suppressShortcutClickUntil=Date.now()+350;if(!current.target){if(current.pointerType!=="mouse"){const source=shortcuts.find(x=>x.id===current.sourceId);if(isTemplate(source))return openPanel("edit-template",{templateId:source.id});if(isGroup(source))return openPanel("group",{groupId:source.id})}return}const targetId=current.target.button.dataset.shortcutId;if(current.target.mode==="before"||current.target.mode==="after")return chrome.runtime.sendMessage({type:"MUTATE_SHORTCUTS",windowId:currentWindowId,action:"reorder",sourceId:current.sourceId,targetId,position:current.target.mode});if(isGroup(current.target.target))return chrome.runtime.sendMessage({type:"MUTATE_SHORTCUTS",windowId:currentWindowId,action:"add-to-group",sourceId:current.sourceId,groupId:targetId});return openPanel("combine",{sourceId:current.sourceId,targetId})}
window.addEventListener("pointerup",event=>finishDrag(event).catch(()=>{}));window.addEventListener("pointercancel",event=>{if(!drag||drag.pointerId!==event.pointerId)return;clearTimeout(drag.holdTimer);sitesHost.querySelector(`[data-shortcut-id="${CSS.escape(drag.sourceId)}"]`)?.classList.remove("dragging");drag=null;clearDrop()});

document.getElementById("nt-expand").addEventListener("click",()=>openPanel());
document.getElementById("nt-add").addEventListener("click",()=>openPanel("add"));
document.getElementById("nt-group").addEventListener("click",()=>openPanel("organize"));
document.getElementById("nt-search").addEventListener("click",()=>openPanel("search"));
document.getElementById("nt-settings").addEventListener("click",()=>chrome.runtime.sendMessage({type:"OPEN_OPTIONS",windowId:currentWindowId}));
document.getElementById("nt-close").addEventListener("click",()=>chrome.runtime.sendMessage({type:"DISABLE_GLOBAL"}).catch(()=>{}));
chrome.storage.local.get(["atnEnabled"]).then(({atnEnabled})=>rail.classList.toggle("hidden",atnEnabled===false));
chrome.storage.onChanged.addListener((changes,area)=>{
  if(area!=="local")return;
  if(changes.atnWorkspacesV1)renderSites().catch(()=>{});
  if(changes.atnEnabled)rail.classList.toggle("hidden",changes.atnEnabled.newValue===false);
  if(changes[THEME_MODE_KEY]||changes[ACCENT_MODE_KEY]||changes[ACCENT_COLOR_KEY]) {
    readThemeSettings().then(settings=>{themeSettings=settings;applyThemeToDocument(settings)}).catch(()=>{});
  }
});
renderSites();
