(()=>{
  if(window.top!==window) return;
  if(globalThis.__atv2RailInstalled) return;
  globalThis.__atv2RailInstalled=true;

  let host=null,shortcutArea=null,config=null;
  const port=chrome.runtime.connect({name:"ATV2_RAIL"});

  const svg=path=>`<svg viewBox="0 0 20 20" aria-hidden="true">${path}</svg>`;
  const icons={
    expand:svg('<path d="M12.5 4.5 7 10 12.5 15.5"/>'),
    add:svg('<path d="M10 4v12M4 10h12"/>'),
    search:svg('<circle cx="8.5" cy="8.5" r="4.5"/><path d="m12 12 4 4"/>'),
    settings:svg(globalThis.__atv2IconPaths?.settings||'')
  };

  function open(command=null){chrome.runtime.sendMessage({type:"OPEN_PANEL",command}).catch(()=>{});}
  function button(label,icon,handler){const b=document.createElement("button");b.type="button";b.setAttribute("aria-label",label);b.title=label;b.innerHTML=icon;b.addEventListener("click",handler);return b;}

  function ensure(){
    if(host?.isConnected) return;
    document.getElementById("atv2-rail-host")?.remove();
    host=document.createElement("div");
    host.id="atv2-rail-host";
    host.style.display="none";
    const root=host.attachShadow({mode:"closed"});
    const style=document.createElement("style");
    style.textContent=`
      :host{all:initial}
      .rail{position:fixed;z-index:2147483647;top:0;right:0;width:48px;height:100vh;display:flex;flex-direction:column;align-items:center;padding:8px 5px;box-sizing:border-box;background:var(--rail-bg,#202020);border-left:1px solid rgba(255,255,255,.10);font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:var(--rail-text,#f2f2f2)}
      .spacer{flex:1}.shortcuts{display:flex;flex-direction:column;overflow:auto;gap:6px;min-height:0;scrollbar-width:thin}.shortcuts button{flex-shrink:0}.shortcuts span{width:26px;height:26px;display:grid;place-items:center;border-radius:6px;background:#ddd;color:#222;font-weight:650;font-size:11px}
      button{width:36px;height:36px;padding:0;border:0;border-radius:8px;background:transparent;color:inherit;display:grid;place-items:center;cursor:pointer}
      button:hover{background:rgba(255,255,255,.08)}
      button:focus-visible{outline:1px solid #5aa2ff;outline-offset:-2px}
      svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
      .sep{width:28px;height:1px;background:rgba(255,255,255,.11);margin:6px 0}
    `;
    const rail=document.createElement("div");rail.className="rail";
    const sep=document.createElement("div");sep.className="sep";
    const spacer=document.createElement("div");spacer.className="spacer";
    shortcutArea=document.createElement("div");shortcutArea.className="shortcuts";
    rail.append(button("Закрыть AppTower",svg(globalThis.__atv2IconPaths?.close||""),()=>chrome.runtime.sendMessage({type:"APP_DISABLE"})),button("Развернуть AppTower",icons.expand,()=>open()),sep,shortcutArea,spacer,button("Добавить текущую страницу",icons.add,()=>open({type:"add-current"})),button("Поиск",icons.search,()=>open({type:"search"})),button("Группы и шаблоны",svg(globalThis.__atv2IconPaths?.group||""),()=>open({type:"organize"})),button("Настройки",icons.settings,()=>chrome.runtime.sendMessage({type:"APP_OPTIONS"})));
    root.append(style,rail);
    document.documentElement.append(host);
    renderConfig();
  }

  function setVisible(visible){globalThis.__atv2PageSpace?.setVisible(visible);if(visible){ensure();host.style.display="block";}else if(host)host.style.display="none";}

  chrome.runtime.onMessage.addListener((message,_sender,sendResponse)=>{
    if(message?.type==="RAIL_VISIBILITY"){
      setVisible(Boolean(message.visible));
      sendResponse({ok:true,visible:host?.style.display==="block"});
      return;
    }
    if(message?.type!=="RAIL_PREPARE_COLLAPSE") return;
    ensure();
    setVisible(false);
    sendResponse({ok:true,ready:true,visible:false});
  });

  function renderConfig(){
    if(!shortcutArea||!config)return;
    shortcutArea.replaceChildren();
    const w=config.workspaces.find(w=>w.id===config.activeWorkspaceId)||config.workspaces[0];
    for(const x of w.items){const b=button(x.title,"",()=>open({type:"open-item",id:x.id}));const label=document.createElement("span");label.textContent=x.title.slice(0,2).toUpperCase();b.append(label);shortcutArea.append(b);}
    const theme=config.settings.theme;const light=theme==="light"||(theme==="system"&&matchMedia('(prefers-color-scheme: light)').matches);
    host.style.setProperty('--rail-bg',light?'#f5f5f5':'#202020');host.style.setProperty('--rail-text',light?'#222':'#f2f2f2');
  }
  function refreshConfig(){chrome.runtime.sendMessage({type:"APP_GET"}).then(r=>{if(r?.state){config={...r.state,activeWorkspaceId:r.workspaceId};renderConfig();}}).catch(()=>{});}
  chrome.storage?.onChanged?.addListener((changes,area)=>{if((area==="local"&&changes["atv2.workspace.v1"])||(area==="session"&&Object.keys(changes).some(k=>k.startsWith("atv2.workspace.window."))))refreshConfig();});
  refreshConfig();
  function discover(){const link=document.querySelector('link[rel~="manifest"]');if(link?.href)chrome.runtime.sendMessage({type:"APP_DISCOVER_PWA",url:link.href}).catch(()=>{});}
  if(document.readyState==="loading")document.addEventListener('DOMContentLoaded',discover,{once:true});else discover();
  function requestState(){chrome.runtime.sendMessage({type:"RAIL_STATE_REQUEST"}).catch(()=>{});}
  window.addEventListener("pageshow",requestState);
  port.onDisconnect.addListener(()=>{setVisible(false);try{requestState();}catch{}});
  requestState();

  port.onMessage.addListener(message=>{if(message?.type==="RAIL_VISIBILITY")setVisible(Boolean(message.visible));});
})();
