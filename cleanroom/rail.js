(()=>{
  if(window.top!==window) return;
  if(document.documentElement.dataset.atv2RailInstalled==="1") return;
  document.documentElement.dataset.atv2RailInstalled="1";

  let host=null;
  let root=null;
  let port=null;
  let windowId=null;

  const svg=(path,viewBox="0 0 20 20")=>`<svg viewBox="${viewBox}" aria-hidden="true">${path}</svg>`;
  const icons={
    expand:svg('<path d="M7 4.5 12.5 10 7 15.5"/>'),
    add:svg('<path d="M10 4v12M4 10h12"/>'),
    search:svg('<circle cx="8.5" cy="8.5" r="4.5"/><path d="m12 12 4 4"/>'),
    settings:svg('<circle cx="10" cy="10" r="3"/><path d="M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M15.3 4.7l-1.4 1.4M6.1 13.9l-1.4 1.4"/>')
  };

  function button(label,icon,handler){
    const b=document.createElement("button");
    b.type="button";
    b.className="atv2-rail-button";
    b.setAttribute("aria-label",label);
    b.title=label;
    b.innerHTML=icon;
    b.addEventListener("click",handler);
    return b;
  }

  async function sendOpen(command=null){
    if(!Number.isInteger(windowId)) return;
    await chrome.runtime.sendMessage({type:"OPEN_PANEL",windowId,command}).catch(()=>{});
  }

  function ensure(){
    if(host?.isConnected) return;
    host=document.createElement("div");
    host.id="atv2-rail-host";
    root=host.attachShadow({mode:"closed"});
    const style=document.createElement("style");
    style.textContent=`
      :host{all:initial}
      .rail{position:fixed;z-index:2147483647;top:0;right:0;width:48px;height:100vh;display:flex;flex-direction:column;align-items:center;padding:8px 5px;box-sizing:border-box;background:#202020;border-left:1px solid rgba(255,255,255,.10);font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:#f2f2f2}
      .spacer{flex:1}
      button{width:36px;height:36px;padding:0;border:0;border-radius:8px;background:transparent;color:inherit;display:grid;place-items:center;cursor:pointer}
      button:hover{background:rgba(255,255,255,.08)}
      button:focus-visible{outline:1px solid #5aa2ff;outline-offset:-2px}
      svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
      .sep{width:28px;height:1px;background:rgba(255,255,255,.11);margin:6px 0}
    `;
    const rail=document.createElement("div");
    rail.className="rail";
    rail.append(
      button("Развернуть AppTower",icons.expand,()=>sendOpen()),
      document.createElement("div")
    );
    rail.lastElementChild.className="sep";
    const spacer=document.createElement("div");spacer.className="spacer";rail.append(spacer);
    rail.append(
      button("Добавить текущую страницу",icons.add,()=>sendOpen({type:"add-current"})),
      button("Поиск",icons.search,()=>sendOpen({type:"search"})),
      button("Настройки",icons.settings,()=>sendOpen({type:"settings"}))
    );
    root.append(style,rail);
    (document.documentElement||document).append(host);
  }

  function setVisible(visible){
    if(visible){ensure();host.style.display="block";}
    else if(host) host.style.display="none";
  }

  chrome.runtime.onMessage.addListener((message,_sender,sendResponse)=>{
    if(message?.type==="RAIL_PREPARE_COLLAPSE"){
      ensure();
      setVisible(true);
      sendResponse({ok:true});
      return;
    }
  });

  chrome.windows.getCurrent?.().catch?.(()=>null);
  chrome.runtime.sendMessage({type:"ATV2_IDENTIFY_WINDOW"}).catch(()=>{});

  // Content scripts have their browser window directly on sender.tab in the
  // background, so ask background to open once to discover nothing is needed.
  // We obtain the id from chrome.runtime.connect sender metadata by creating a
  // temporary port name after querying through a small message roundtrip.
  chrome.runtime.sendMessage({type:"GET_WINDOW_ID"}).then(response=>{
    if(!Number.isInteger(response?.windowId)) return;
    windowId=response.windowId;
    port=chrome.runtime.connect({name:`ATV2_RAIL:${windowId}`});
    port.onMessage.addListener(message=>{
      if(message?.type==="RAIL_VISIBILITY") setVisible(Boolean(message.visible));
    });
  }).catch(()=>{});
})();
