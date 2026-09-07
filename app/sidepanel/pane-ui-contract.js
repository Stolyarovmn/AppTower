const ICONS={
  more:'<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="4" cy="10" r="1.2"/><circle cx="10" cy="10" r="1.2"/><circle cx="16" cy="10" r="1.2"/></svg>',
  close:'<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 5l10 10M15 5 5 15"/></svg>'
};

function installStyle(){
  if(document.getElementById("atn-pane-ui-contract-style"))return;
  const style=document.createElement("style");
  style.id="atn-pane-ui-contract-style";
  style.textContent=`
    .pane-toolbar{gap:6px!important;padding-inline:10px!important}
    .pane-toolbar .url-input{min-width:92px!important;flex:1 1 140px!important}
    .pane-toolbar>[data-action="mode"],
    .pane-toolbar>[data-action="pwa"],
    .pane-toolbar>[data-action="external"],
    .pane-toolbar>[data-action="focus"]{display:none!important}
    .pane-toolbar .atn-pane-more,.pane-toolbar .atn-pane-close{flex:0 0 36px;width:36px;height:36px;display:grid;place-items:center;border-radius:8px}
    .pane-toolbar .atn-pane-more svg,.pane-toolbar .atn-pane-close svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
    .pane-toolbar .atn-pane-more svg circle{fill:currentColor;stroke:none}
    .atn-pane-menu{position:fixed;z-index:2147483646;min-width:210px;padding:6px;border-radius:10px;border:1px solid var(--atn-border,rgba(255,255,255,.14));background:var(--atn-surface,#292929);box-shadow:0 8px 28px rgba(0,0,0,.32)}
    .atn-pane-menu[hidden]{display:none}
    .atn-pane-menu button{width:100%;min-height:34px;padding:7px 10px;border:0;border-radius:7px;background:transparent;color:inherit;text-align:left;font:inherit;cursor:pointer}
    .atn-pane-menu button:hover,.atn-pane-menu button:focus-visible{background:var(--atn-hover,rgba(255,255,255,.10));outline:none}
    .atn-pane-menu button[disabled]{opacity:.42;cursor:default}
    html.atn-drag-invalid,html.atn-drag-invalid *{cursor:not-allowed!important}
    html.atn-drag-valid,html.atn-drag-valid *{cursor:grabbing!important}
  `;
  document.head.append(style);
}

function isSplit(){return document.getElementById("workspace")?.dataset.layout==="split";}

function proxyAction(pane,action){
  const original=pane.querySelector(`[data-action="${action}"]`);
  if(!original||original.disabled||original.hidden)return false;
  original.click();
  return true;
}

function closePane(pane){
  if(!isSplit())return;
  const name=pane.dataset.pane;
  const other=document.querySelector(`.pane[data-pane="${name==="top"?"bottom":"top"}"]`);
  other?.querySelector('[data-action="activate"]')?.click();
  document.getElementById("toggle-split")?.click();
}

function positionMenu(menu,button){
  const r=button.getBoundingClientRect();
  menu.hidden=false;
  const mr=menu.getBoundingClientRect();
  const gutter=8;
  const left=Math.max(gutter,Math.min(window.innerWidth-mr.width-gutter,r.right-mr.width));
  const top=Math.max(gutter,Math.min(window.innerHeight-mr.height-gutter,r.bottom+6));
  menu.style.left=`${Math.round(left)}px`;
  menu.style.top=`${Math.round(top)}px`;
}

function installPane(pane){
  const toolbar=pane.querySelector(".pane-toolbar");
  if(!toolbar||toolbar.dataset.atnCompactContract==="1")return;
  toolbar.dataset.atnCompactContract="1";

  const more=document.createElement("button");
  more.type="button";more.className="atn-pane-more";more.title="Ещё";more.setAttribute("aria-label","Ещё действия");more.innerHTML=ICONS.more;
  const close=document.createElement("button");
  close.type="button";close.className="atn-pane-close";close.title="Закрыть эту область";close.setAttribute("aria-label","Закрыть эту область");close.innerHTML=ICONS.close;
  toolbar.append(more,close);

  const menu=document.createElement("div");
  menu.className="atn-pane-menu";menu.hidden=true;menu.setAttribute("role","menu");
  const actions=[
    ["mode","Режим отображения"],
    ["pwa","Параметры веб-приложения"],
    ["external","Открыть в обычной вкладке"],
    ["focus","Развернуть / вернуть область"]
  ];
  for(const [action,label] of actions){
    const item=document.createElement("button");item.type="button";item.dataset.proxyAction=action;item.textContent=label;
    item.addEventListener("click",()=>{menu.hidden=true;proxyAction(pane,action);});
    menu.append(item);
  }
  document.body.append(menu);

  const sync=()=>{
    close.disabled=!isSplit();
    close.title=isSplit()?"Закрыть эту область":"Открыта единственная область";
    for(const item of menu.querySelectorAll("[data-proxy-action]")){
      const original=pane.querySelector(`[data-action="${item.dataset.proxyAction}"]`);
      item.disabled=!original||original.disabled||original.hidden||original.classList.contains("hidden");
    }
  };
  more.addEventListener("click",event=>{event.stopPropagation();sync();if(menu.hidden)positionMenu(menu,more);else menu.hidden=true;});
  close.addEventListener("click",()=>closePane(pane));
  document.addEventListener("pointerdown",event=>{if(!menu.hidden&&!menu.contains(event.target)&&event.target!==more)menu.hidden=true;},true);
  new MutationObserver(sync).observe(document.getElementById("workspace")||pane,{attributes:true,subtree:true,attributeFilter:["class","hidden","data-layout"]});
  sync();
}

function syncDragCursor(){
  const proxy=document.querySelector(".atn-drag-proxy");
  const root=document.documentElement;
  if(!proxy){root.classList.remove("atn-drag-invalid","atn-drag-valid");return;}
  const valid=Boolean(document.querySelector("#panel-sites .drop-before,#panel-sites .drop-after,#panel-sites .drop-combine"));
  root.classList.toggle("atn-drag-valid",valid);
  root.classList.toggle("atn-drag-invalid",!valid);
}

installStyle();
for(const pane of document.querySelectorAll(".pane[data-pane]"))installPane(pane);
window.addEventListener("pointermove",()=>queueMicrotask(syncDragCursor),{passive:true});
window.addEventListener("pointerup",()=>queueMicrotask(syncDragCursor),{passive:true});
window.addEventListener("pointercancel",()=>queueMicrotask(syncDragCursor),{passive:true});
