(() => {
  if (window !== window.top) return;

  const INSTANCE = "__appTowerNextRail";
  for (const key of ["__appTowerNextRailV011","__appTowerNextRailV021","__appTowerNextRailV022","__appTowerNextRailV023","__appTowerNextRailV024","__appTowerNextRailV025",INSTANCE]) {
    try { globalThis[key]?.dispose?.(); } catch {}
  }

  const HOST_ID="app-tower-next-host";
  const RESERVED_CLASS="app-tower-next-reserved";
  const HIDDEN_CLASS="app-tower-next-hidden";
  const FIXED_CLASS="app-tower-next-fixed";
  const FIXED_ANCHORED="app-tower-next-fixed-anchored";
  const FIXED_SHIFTED="app-tower-next-fixed-shifted";
  const NATIVE_SCROLLBAR_VAR="--atn-native-scrollbar-width";
  const FIXED_RIGHT_VAR="--atn-original-fixed-right";
  const RAIL_WIDTH=46;
  const THEME_MODE_KEY="atnThemeMode";
  const ACCENT_MODE_KEY="atnAccentMode";
  const ACCENT_COLOR_KEY="atnAccentColor";
  const DEFAULT_ACCENT="#45c9bc";

  let themeSettings={themeMode:"system",accentMode:"system",accentColor:DEFAULT_ACCENT};
  let currentShortcuts=[];
  let suppressShortcutClickUntil=0;
  let shortcutDrag=null;
  let disposed=false, visible=false, adjustmentFrame=null, geometryFrame=null,
      railPort=null, reconnectTimer=null;
  const adjustedFixed=new Set();

  // Remove stale DOM/CSS state left by a previous unpacked build in this tab.
  document.getElementById(HOST_ID)?.remove();
  document.documentElement.classList.remove(RESERVED_CLASS,"app-tower-next-scrollbar-relocated");
  document.documentElement.style.removeProperty(NATIVE_SCROLLBAR_VAR);
  for (const el of document.querySelectorAll(`.${FIXED_CLASS}`)) {
    el.classList.remove(FIXED_CLASS,FIXED_ANCHORED,FIXED_SHIFTED);
    el.style.removeProperty(FIXED_RIGHT_VAR);
  }

  const host=document.createElement("aside");
  host.id=HOST_ID; host.className=HIDDEN_CLASS; host.setAttribute("aria-label","App Tower");
  const shadow=host.attachShadow({mode:"closed"});
  shadow.innerHTML=`<style>
    :host,*{box-sizing:border-box}
    .rail{
      --atn-bg:#202020;
      --atn-text:#ededed;
      --atn-border:rgba(255,255,255,.12);
      --atn-hover:rgba(255,255,255,.11);
      --atn-accent:#45c9bc;
      --atn-accent-contrast:#fff;
      width:46px;height:100%;display:flex;flex-direction:column;align-items:center;
      padding:0 4px 7px;overflow:hidden;color:var(--atn-text);background:var(--atn-bg);
      border-left:1px solid var(--atn-border);
      box-shadow:-3px 0 10px rgba(0,0,0,.20);
      pointer-events:auto;font-family:system-ui,-apple-system,"Segoe UI",sans-serif
    }
    @media(prefers-color-scheme:light){
      .rail:not([data-theme]){
        --atn-bg:#f2f2f2;
        --atn-text:#222;
        --atn-border:rgba(0,0,0,.13);
        --atn-hover:rgba(0,0,0,.06)
      }
    }
    .rail[data-theme="dark"]{
      --atn-bg:#202020;
      --atn-text:#ededed;
      --atn-border:rgba(255,255,255,.12);
      --atn-hover:rgba(255,255,255,.11)
    }
    .rail[data-theme="light"]{
      --atn-bg:#f2f2f2;
      --atn-text:#222;
      --atn-border:rgba(0,0,0,.13);
      --atn-hover:rgba(0,0,0,.06)
    }
    button{all:unset;box-sizing:border-box}

    /*
     * Mirrors the native Side Panel title row. This keeps the collapsed rail
     * from jumping upward when the native panel is closed.
     */
    .rail-chrome{
      width:100%;height:56px;flex:0 0 56px;display:grid;place-items:center;
      border-bottom:1px solid var(--atn-border)
    }

    /*
     * Same 44 px control row as the expanded side panel. The short separator
     * is drawn INSIDE the row at bottom:0, so it aligns with the main header
     * without adding extra vertical margin.
     */
    .rail-head{
      width:100%;height:44px;flex:0 0 44px;display:grid;place-items:center;
      position:relative
    }
    .rail-head::after{
      content:"";position:absolute;left:50%;bottom:0;transform:translateX(-50%);
      width:28px;height:1px;background:var(--atn-border)
    }

    .rail-primary{
      width:100%;min-height:0;flex:1 1 auto;display:flex;flex-direction:column;
      align-items:center;gap:3px;overflow:hidden
    }
    .sites-scroll{
      width:100%;min-height:0;flex:1 1 auto;overflow-y:auto;overflow-x:hidden;
      scrollbar-width:none;overscroll-behavior:contain;touch-action:pan-y;scroll-behavior:smooth
    }
    .sites-scroll::-webkit-scrollbar{display:none}
    .sites{width:100%;min-height:min-content;display:flex;flex-direction:column;align-items:center;gap:8px;padding:4px 0;flex:0 0 auto}
    .scroll-arrow{
      width:32px;height:20px;flex:0 0 20px;display:grid;place-items:center;border-radius:6px;
      cursor:pointer;color:var(--atn-text);opacity:.72
    }
    .scroll-arrow:hover:not(:disabled){background:var(--atn-hover);opacity:1}
    .scroll-arrow:disabled{opacity:.24;cursor:default}
    .scroll-arrow.hidden{display:none}
    .scroll-arrow svg{width:13px;height:13px}
    .scroll-arrow path{fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
    .rail-footer{width:100%;display:flex;flex-direction:column;align-items:center;gap:8px;flex:0 0 auto}
    .site,.tool{
      width:36px;height:36px;flex:0 0 36px;display:grid;place-items:center;
      border-radius:8px;cursor:pointer;color:var(--atn-text)
    }
    .site:hover,.tool:hover,.site:focus-visible,.tool:focus-visible{background:var(--atn-hover)}
    .site:focus-visible,.tool:focus-visible{outline:2px solid var(--atn-accent);outline-offset:1px}
    .site img{width:25px;height:25px;object-fit:contain;border-radius:6px}
    .fallback{
      width:25px;height:25px;display:grid;place-items:center;border-radius:50%;
      background:color-mix(in srgb,var(--atn-accent) 68%,#000 32%);color:var(--atn-accent-contrast);font:700 12px/1 system-ui,sans-serif
    }

    /* Bottom separator: last shortcut -> Add. */
    .sep{width:28px;height:1px;flex:0 0 1px;margin:4px 0;background:var(--atn-border)}

    .native-icon{
      font-family:"Segoe Fluent Icons","Segoe MDL2 Assets";
      font-size:20px;line-height:1;font-weight:400
    }
    .toggle-svg{width:16px;height:16px;display:block;overflow:visible;margin:auto}
    .toggle-svg path{fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
    .close-tool{
      position:relative;color:var(--atn-text)
    }
    .close-tool::before,.close-tool::after{
      content:"";position:absolute;left:50%;top:50%;
      width:14px;height:1.5px;border-radius:1px;background:currentColor;
      transform-origin:center
    }
    .close-tool::before{transform:translate(-50%,-50%) rotate(45deg)}
    .close-tool::after{transform:translate(-50%,-50%) rotate(-45deg)}
    .fallback-icon{
      font-family:system-ui,-apple-system,"Segoe UI",sans-serif;font-size:21px;line-height:1
    }
    .site{position:relative;touch-action:pan-y;user-select:none;-webkit-user-select:none}
    .site.dragging{opacity:.48;transform:scale(.94)}
    .site.drop-before::before,.site.drop-after::after{
      content:"";position:absolute;left:5px;right:5px;height:2px;border-radius:2px;
      background:var(--atn-accent);z-index:5
    }
    .site.drop-before::before{top:-3px}.site.drop-after::after{bottom:-3px}
    .site.drop-combine{outline:2px solid var(--atn-accent);outline-offset:1px;background:color-mix(in srgb,var(--atn-accent) 18%,transparent)}
    .group-badge{
      width:25px;height:25px;display:grid;place-items:center;border-radius:7px;
      background:color-mix(in srgb,var(--atn-accent) 18%,transparent);
      border:1px solid color-mix(in srgb,var(--atn-accent) 52%,var(--atn-border));
      color:var(--atn-accent);font:800 10px/1 system-ui,sans-serif;letter-spacing:-.3px
    }
    .template-stack{position:relative;display:block}
    .template-stack img,.template-stack .template-fallback{
      position:absolute;width:20px;height:20px;object-fit:contain;border-radius:5px;
      border:1px solid var(--atn-border);box-shadow:0 1px 4px rgba(0,0,0,.22);background:var(--atn-bg)
    }
    .template-stack .template-bottom{z-index:1}.template-stack .template-top{z-index:2;left:0;top:0}
    .template-fallback{display:grid;place-items:center;background:color-mix(in srgb,var(--atn-accent) 68%,#000 32%)!important;color:var(--atn-accent-contrast);font:800 9px/1 system-ui,sans-serif}
    .group-tool svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.45}
    .tool-icon-svg{
      width:20px;height:20px;display:block;overflow:visible;
      fill:none;stroke:currentColor;stroke-width:1.55;
      stroke-linecap:round;stroke-linejoin:round
    }
    @media(prefers-reduced-motion:reduce){.sites-scroll{scroll-behavior:auto}}
  </style>
  <nav class="rail" aria-label="App Tower sites">
    <div class="rail-chrome"><div class="close-slot"></div></div>
    <div class="rail-head"><div class="expand-slot"></div></div>
    <div class="rail-primary">
      <button class="scroll-arrow scroll-up hidden" type="button" aria-label="Прокрутить ярлыки вверх"><svg viewBox="0 0 16 16"><path d="M3.5 10.25 8 5.75l4.5 4.5"/></svg></button>
      <div class="sites-scroll"><div class="sites"></div></div>
      <button class="scroll-arrow scroll-down hidden" type="button" aria-label="Прокрутить ярлыки вниз"><svg viewBox="0 0 16 16"><path d="m3.5 5.75 4.5 4.5 4.5-4.5"/></svg></button>
      <div class="sep"></div>
      <div class="add-slot"></div>
      <div class="group-slot"></div>
    </div>
    <div class="rail-footer"></div>
  </nav>`;
  document.documentElement.appendChild(host);
  const rail=shadow.querySelector(".rail");
  const closeSlot=shadow.querySelector(".close-slot");
  const expandSlot=shadow.querySelector(".expand-slot");
  const sitesHost=shadow.querySelector(".sites");
  const sitesScroll=shadow.querySelector(".sites-scroll");
  const scrollUp=shadow.querySelector(".scroll-up");
  const scrollDown=shadow.querySelector(".scroll-down");
  const addSlot=shadow.querySelector(".add-slot");
  const groupSlot=shadow.querySelector(".group-slot");
  const footer=shadow.querySelector(".rail-footer");

  function normalizeTheme(raw={}){
    const themeMode=["system","light","dark"].includes(raw[THEME_MODE_KEY])
      ? raw[THEME_MODE_KEY]
      : "system";
    const accentMode=["system","custom"].includes(raw[ACCENT_MODE_KEY])
      ? raw[ACCENT_MODE_KEY]
      : "system";
    const accentColor=/^#[0-9a-f]{6}$/i.test(String(raw[ACCENT_COLOR_KEY]||""))
      ? String(raw[ACCENT_COLOR_KEY]).toLowerCase()
      : DEFAULT_ACCENT;
    return {themeMode,accentMode,accentColor};
  }

  function systemAccent(){
    try{
      const probe=document.createElement("span");
      probe.style.cssText="position:fixed;left:-9999px;top:-9999px;color:AccentColor;pointer-events:none";
      if(!probe.style.color)return DEFAULT_ACCENT;
      document.documentElement.appendChild(probe);
      const color=getComputedStyle(probe).color||DEFAULT_ACCENT;
      probe.remove();
      return color;
    }catch{return DEFAULT_ACCENT}
  }

  function accentContrast(value){
    const text=String(value||"").trim();
    let rgb=null;
    const hex=/^#([0-9a-f]{6})$/i.exec(text);
    if(hex){
      const n=Number.parseInt(hex[1],16);
      rgb=[(n>>16)&255,(n>>8)&255,n&255];
    }else{
      const match=/^rgba?\(\s*(\d+(?:\.\d+)?)\s*[, ]\s*(\d+(?:\.\d+)?)\s*[, ]\s*(\d+(?:\.\d+)?)/i.exec(text);
      if(match)rgb=[Number(match[1]),Number(match[2]),Number(match[3])];
    }
    if(!rgb)return "#fff";
    const [red,green,blue]=rgb.map(c=>Math.max(0,Math.min(255,c))/255);
    return (0.2126*red+0.7152*green+0.0722*blue)>0.62?"#111":"#fff";
  }

  function applyRailTheme(settings=themeSettings){
    themeSettings=settings;
    const dark=window.matchMedia?.("(prefers-color-scheme: dark)")?.matches===true;
    rail.dataset.theme=settings.themeMode==="system"
      ? (dark?"dark":"light")
      : settings.themeMode;
    const accent=settings.accentMode==="custom"
      ? settings.accentColor
      : systemAccent();
    const resolvedAccent=accent||DEFAULT_ACCENT;
    rail.style.setProperty("--atn-accent",resolvedAccent);
    rail.style.setProperty("--atn-accent-contrast",accentContrast(resolvedAccent));
  }

  async function loadRailTheme(){
    const raw=await chrome.storage.local.get([THEME_MODE_KEY,ACCENT_MODE_KEY,ACCENT_COLOR_KEY]);
    if(disposed)return;
    applyRailTheme(normalizeTheme(raw));
  }

  const systemThemeMedia=window.matchMedia?.("(prefers-color-scheme: dark)");
  systemThemeMedia?.addEventListener?.("change",()=>{
    if(disposed)return;
    if(themeSettings.themeMode==="system"||themeSettings.accentMode==="system"){
      applyRailTheme(themeSettings);
    }
  });

  function faviconURL(url){const u=new URL("/_favicon/",chrome.runtime.getURL("/"));u.searchParams.set("pageUrl",url);u.searchParams.set("size","32");return u.href;}
  function shortcutKind(item){return item?.kind==="group"||item?.kind==="template"?item.kind:"site";}
  function isGroup(item){return shortcutKind(item)==="group"&&Array.isArray(item?.items);}
  function isTemplate(item){return shortcutKind(item)==="template"&&item?.top?.url&&item?.bottom?.url;}
  function isSite(item){return shortcutKind(item)==="site"&&Boolean(item?.url);}
  function groupInitials(title){
    const text=String(title||"").trim();if(!text)return "Г";
    const words=text.split(/\s+/).filter(Boolean);
    if(words.length>1)return `${Array.from(words[0])[0]||""}${Array.from(words[1])[0]||""}`.toUpperCase();
    return Array.from(words[0]||text).slice(0,2).join("").toUpperCase();
  }
  function fallback(title,className="fallback"){
    const e=document.createElement("span");e.className=className;e.textContent=(title||"?").trim().slice(0,1).toUpperCase();return e;
  }
  function templateStack(item){
    const stack=document.createElement("span");stack.className="template-stack";
    const overlap=Math.min(80,Math.max(20,Number(item.overlap)||50));
    const size=20,offset=Math.max(2,Math.round(size*(1-overlap/100)));
    stack.style.width=`${size+offset}px`;stack.style.height=`${size+offset}px`;
    const make=(site,cls,left,top)=>{
      const img=document.createElement("img");img.className=cls;img.alt="";img.draggable=false;img.src=faviconURL(site.url);img.style.left=`${left}px`;img.style.top=`${top}px`;
      img.addEventListener("error",()=>{const replacement=fallback(site.title,`template-fallback ${cls}`);replacement.style.cssText=img.style.cssText;img.replaceWith(replacement)},{once:true});return img;
    };
    stack.append(make(item.bottom,"template-bottom",offset,offset),make(item.top,"template-top",0,0));
    return stack;
  }
  function shortcutVisual(item){
    if(isGroup(item)){const e=document.createElement("span");e.className="group-badge";e.textContent=groupInitials(item.title);return e;}
    if(isTemplate(item))return templateStack(item);
    const img=document.createElement("img");img.alt="";img.draggable=false;img.src=faviconURL(item.url);img.addEventListener("error",()=>img.replaceWith(fallback(item.title)),{once:true});return img;
  }
  function shortcutButton(item){
    const b=document.createElement("button");b.type="button";b.className="site";b.dataset.shortcutId=item.id;b.dataset.shortcutKind=shortcutKind(item);
    b.title=isGroup(item)?`${item.title}\nГруппа · ${item.items.length} ярл.`:isTemplate(item)?`${item.title}\nШаблон двух панелей\nClick → открыть · Right click → настроить`:`${item.title}\nClick → active pane\nShift+Click → bottom pane`;
    b.append(shortcutVisual(item));
    b.addEventListener("click",e=>{
      e.preventDefault();e.stopPropagation();
      if(Date.now()<suppressShortcutClickUntil)return;
      if(isGroup(item)){
        chrome.runtime.sendMessage({type:"OPEN_PANEL",intent:"group",groupId:item.id}).catch(()=>{});return;
      }
      if(isTemplate(item)){
        chrome.runtime.sendMessage({type:"OPEN_TEMPLATE",template:item}).catch(()=>{});return;
      }
      chrome.runtime.sendMessage({type:"OPEN_SITE",url:item.url,title:item.title,mode:item.mode,compatDomains:item.compatDomains,siteId:item.id,targetPane:e.shiftKey?"bottom":undefined}).catch(()=>{});
    });
    b.addEventListener("contextmenu",e=>{
      e.preventDefault();e.stopPropagation();
      if(isTemplate(item))chrome.runtime.sendMessage({type:"OPEN_PANEL",intent:"edit-template",templateId:item.id}).catch(()=>{});
      else if(isGroup(item))chrome.runtime.sendMessage({type:"OPEN_PANEL",intent:"group",groupId:item.id}).catch(()=>{});
    });
    return b;
  }
  function toolButton(kind,title,intent){
    const b=document.createElement("button");
    b.type="button";b.className="tool";b.title=title;
    if(kind==="expand")b.innerHTML='<svg class="toggle-svg" viewBox="0 0 16 16" aria-hidden="true"><path d="M10.25 3.5 5.75 8l4.5 4.5"/></svg>';
    else if(kind==="close"){b.textContent="";b.classList.add("close-tool");}
    else if(kind==="group"){
      b.classList.add("group-tool");
      b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="10" height="10" rx="2"/><rect x="10" y="9" width="10" height="10" rx="2"/></svg>';
    }else if(kind==="plus")b.innerHTML='<svg class="tool-icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
    else if(kind==="search")b.innerHTML='<svg class="tool-icon-svg" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="5.5"/><path d="m14.5 14.5 4.5 4.5"/></svg>';
    else if(kind==="settings"){
      if(/Edg\//i.test(navigator.userAgent)) b.innerHTML='<span class="native-icon" aria-hidden="true">\uE713</span>';
      else b.innerHTML='<svg class="tool-icon-svg settings-svg" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.2"/><circle cx="12" cy="12" r="7.1"/><path d="M12 2.8v2M12 19.2v2M2.8 12h2M19.2 12h2M5.5 5.5l1.4 1.4M17.1 17.1l1.4 1.4M18.5 5.5l-1.4 1.4M6.9 17.1l-1.4 1.4"/></svg>';
    }
    b.addEventListener("click",e=>{
      e.preventDefault();e.stopPropagation();
      if(kind==="close"){chrome.runtime.sendMessage({type:"DISABLE_GLOBAL"}).catch(()=>{});return;}
      if(kind==="settings"){chrome.runtime.sendMessage({type:"OPEN_OPTIONS"}).catch(()=>{});return;}
      const payload={type:"OPEN_PANEL",intent};
      if(kind==="plus" && /^https?:$/i.test(location.protocol)){
        payload.sourceUrl=location.href;
        payload.sourceTitle=document.title || location.hostname;
      }
      chrome.runtime.sendMessage(payload).catch(()=>{});
    });
    return b;
  }
  function updateScrollControls(){
    if(disposed)return;
    const overflow=sitesScroll.scrollHeight>sitesScroll.clientHeight+2;
    scrollUp.classList.toggle("hidden",!overflow);scrollDown.classList.toggle("hidden",!overflow);
    if(!overflow)return;
    scrollUp.disabled=sitesScroll.scrollTop<=1;
    scrollDown.disabled=sitesScroll.scrollTop+sitesScroll.clientHeight>=sitesScroll.scrollHeight-1;
  }
  scrollUp.addEventListener("click",()=>sitesScroll.scrollBy({top:-120,behavior:"smooth"}));
  scrollDown.addEventListener("click",()=>sitesScroll.scrollBy({top:120,behavior:"smooth"}));
  sitesScroll.addEventListener("scroll",updateScrollControls,{passive:true});
  const scrollResizeObserver=new ResizeObserver(updateScrollControls);
  scrollResizeObserver.observe(sitesScroll);

  async function renderSites(){
    const response=await chrome.runtime.sendMessage({type:"GET_SHORTCUTS"}).catch(()=>null);
    const sites=Array.isArray(response?.sites)?response.sites:[];
    if(disposed)return;
    currentShortcuts=sites;
    closeSlot.replaceChildren(toolButton("close","Отключить App Tower",null));
    expandSlot.replaceChildren(toolButton("expand","Развернуть последнее состояние",null));
    sitesHost.replaceChildren();
    for(const item of currentShortcuts)if(item?.id)sitesHost.append(shortcutButton(item));
    addSlot.replaceChildren(toolButton("plus","Добавить текущую страницу","add"));
    groupSlot.replaceChildren(toolButton("group","Группы и шаблоны","organize"));
    footer.replaceChildren(toolButton("search","Поиск","search"),toolButton("settings","Настройки · App Tower v1.0.0","settings"));
    queueMicrotask(updateScrollControls);
  }

  function clearDropMarks(){for(const el of sitesHost.querySelectorAll(".drop-before,.drop-after,.drop-combine"))el.classList.remove("drop-before","drop-after","drop-combine");}
  function beginDrag(event,button){
    if(!shortcutDrag||shortcutDrag.dragging)return;shortcutDrag.dragging=true;clearTimeout(shortcutDrag.holdTimer);button.classList.add("dragging");
    try{button.setPointerCapture(event.pointerId)}catch{}
  }
  function dropTarget(event){
    const hit=shadow.elementFromPoint?.(event.clientX,event.clientY)||document.elementFromPoint(event.clientX,event.clientY);
    const button=hit?.closest?.(".site[data-shortcut-id]");if(!button||button.dataset.shortcutId===shortcutDrag?.sourceId)return null;
    const rect=button.getBoundingClientRect(),ratio=(event.clientY-rect.top)/Math.max(1,rect.height);
    let mode=ratio<.25?"before":ratio>.75?"after":"combine";
    const source=currentShortcuts.find(x=>x?.id===shortcutDrag.sourceId),target=currentShortcuts.find(x=>x?.id===button.dataset.shortcutId);
    if(!source||!target)return null;if(isGroup(source)&&mode==="combine")mode=ratio<.5?"before":"after";
    return {button,target,mode};
  }
  sitesHost.addEventListener("dragstart",event=>event.preventDefault());
  sitesHost.addEventListener("pointerdown",event=>{
    if(event.button!==0)return;const button=event.target.closest(".site[data-shortcut-id]");if(!button)return;
    shortcutDrag={sourceId:button.dataset.shortcutId,pointerId:event.pointerId,pointerType:event.pointerType,startX:event.clientX,startY:event.clientY,dragging:false,target:null,holdTimer:null};
    if(event.pointerType==="touch"||event.pointerType==="pen")shortcutDrag.holdTimer=setTimeout(()=>{if(shortcutDrag?.pointerId===event.pointerId&&!shortcutDrag.dragging)beginDrag(event,button)},360);
  });
  window.addEventListener("pointermove",event=>{
    if(!shortcutDrag||shortcutDrag.pointerId!==event.pointerId)return;
    const distance=Math.hypot(event.clientX-shortcutDrag.startX,event.clientY-shortcutDrag.startY);
    const sourceButton=sitesHost.querySelector(`[data-shortcut-id="${CSS.escape(shortcutDrag.sourceId)}"]`);
    if(!shortcutDrag.dragging){
      if(shortcutDrag.pointerType==="mouse"&&distance>=5&&sourceButton)beginDrag(event,sourceButton);
      else if(shortcutDrag.pointerType!=="mouse"&&distance>=10){clearTimeout(shortcutDrag.holdTimer);shortcutDrag=null;return;}
    }
    if(!shortcutDrag?.dragging)return;event.preventDefault();const scrollRect=sitesScroll.getBoundingClientRect();if(event.clientY<scrollRect.top+26)sitesScroll.scrollBy({top:-10});else if(event.clientY>scrollRect.bottom-26)sitesScroll.scrollBy({top:10});clearDropMarks();shortcutDrag.target=dropTarget(event);if(shortcutDrag.target)shortcutDrag.target.button.classList.add(`drop-${shortcutDrag.target.mode}`);
  },{passive:false});
  async function finishDrag(event){
    if(!shortcutDrag||shortcutDrag.pointerId!==event.pointerId)return;clearTimeout(shortcutDrag.holdTimer);const current=shortcutDrag;shortcutDrag=null;
    sitesHost.querySelector(`[data-shortcut-id="${CSS.escape(current.sourceId)}"]`)?.classList.remove("dragging");clearDropMarks();if(!current.dragging)return;
    suppressShortcutClickUntil=Date.now()+350;
    if(!current.target){
      if(current.pointerType!=="mouse"){
        const source=currentShortcuts.find(x=>x?.id===current.sourceId);
        if(isTemplate(source))await chrome.runtime.sendMessage({type:"OPEN_PANEL",intent:"edit-template",templateId:source.id});
        else if(isGroup(source))await chrome.runtime.sendMessage({type:"OPEN_PANEL",intent:"group",groupId:source.id});
      }
      return;
    }
    const targetId=current.target.button.dataset.shortcutId,target=currentShortcuts.find(x=>x?.id===targetId);
    if(current.target.mode==="before"||current.target.mode==="after"){
      await chrome.runtime.sendMessage({type:"MUTATE_SHORTCUTS",action:"reorder",sourceId:current.sourceId,targetId,position:current.target.mode});return;
    }
    if(isGroup(target)){
      await chrome.runtime.sendMessage({type:"MUTATE_SHORTCUTS",action:"add-to-group",sourceId:current.sourceId,groupId:targetId});return;
    }
    await chrome.runtime.sendMessage({type:"OPEN_PANEL",intent:"combine",sourceId:current.sourceId,targetId});
  }
  window.addEventListener("pointerup",event=>{finishDrag(event).catch(()=>{})});
  window.addEventListener("pointercancel",event=>{
    if(!shortcutDrag||shortcutDrag.pointerId!==event.pointerId)return;clearTimeout(shortcutDrag.holdTimer);sitesHost.querySelector(`[data-shortcut-id="${CSS.escape(shortcutDrag.sourceId)}"]`)?.classList.remove("dragging");shortcutDrag=null;clearDropMarks();
  });

  function clearFixedAdjustments(){
    for(const el of adjustedFixed){
      el.classList.remove(FIXED_CLASS,FIXED_ANCHORED,FIXED_SHIFTED);
      el.style.removeProperty(FIXED_RIGHT_VAR);
    }
    adjustedFixed.clear();
  }

  function fixedAncestor(element){
    for(let node=element;node&&node!==document.documentElement;node=node.parentElement){
      if(node===host)return null;
      const position=getComputedStyle(node).position;
      if(position==="fixed"||position==="sticky")return node;
    }
    return null;
  }

  function collectFixedAtRightEdge(){
    const found=new Set();
    const vw=document.documentElement.clientWidth || window.innerWidth;
    const vh=window.innerHeight;
    const xs=[Math.max(0,vw-2),Math.max(0,vw-RAIL_WIDTH-2)];
    const ys=[1,Math.max(1,vh-2)];

    for(const el of adjustedFixed){
      const rect=el.getBoundingClientRect();
      const position=el.isConnected?getComputedStyle(el).position:"";
      if(el.isConnected&&(position==="fixed"||position==="sticky")&&rect.width>0&&rect.height>0){
        found.add(el);
      }
    }

    for(let y=24;y<vh;y+=40)ys.push(y);
    for(const x of xs)for(const y of ys)for(const hit of document.elementsFromPoint(x,y)){
      const f=fixedAncestor(hit);
      if(!f)continue;
      const rect=f.getBoundingClientRect();
      if(rect.width>0&&rect.height>0&&rect.right>vw-RAIL_WIDTH&&rect.left<vw)found.add(f);
    }
    return found;
  }

  function adjustRightFixedElements(){
    adjustmentFrame=null;
    if(!visible){clearFixedAdjustments();return;}

    const vw=document.documentElement.clientWidth || window.innerWidth;
    const next=collectFixedAtRightEdge();
    for(const old of adjustedFixed){
      if(!next.has(old)){
        old.classList.remove(FIXED_CLASS,FIXED_ANCHORED,FIXED_SHIFTED);
        old.style.removeProperty(FIXED_RIGHT_VAR);
      }
    }

    for(const el of next){
      if(adjustedFixed.has(el))continue;
      const cs=getComputedStyle(el);
      const right=cs.right;
      el.classList.add(FIXED_CLASS);
      if(right==="auto"){
        const rect=el.getBoundingClientRect();
        if(rect.width<vw-RAIL_WIDTH){
          el.classList.add(FIXED_SHIFTED);
        }else{
          el.style.setProperty(FIXED_RIGHT_VAR,"0px");
          el.classList.add(FIXED_ANCHORED);
        }
      }else{
        el.style.setProperty(FIXED_RIGHT_VAR,right);
        el.classList.add(FIXED_ANCHORED);
      }
    }
    adjustedFixed.clear();
    for(const el of next)adjustedFixed.add(el);
  }

  function scheduleFixedAdjustment(){
    if(adjustmentFrame!==null)return;
    adjustmentFrame=requestAnimationFrame(adjustRightFixedElements);
  }


  function nativeScrollbarWidth(){
    const client=document.documentElement.clientWidth;
    if(!client) return 0;
    return Math.max(0, window.innerWidth-client);
  }

  function updateRailGeometry(){
    geometryFrame=null;
    if(disposed||!visible)return;
    document.documentElement.style.setProperty(
      NATIVE_SCROLLBAR_VAR,
      `${nativeScrollbarWidth()}px`
    );
    scheduleFixedAdjustment();
  }

  function scheduleGeometry(){
    if(geometryFrame!==null)return;
    geometryFrame=requestAnimationFrame(updateRailGeometry);
  }

  function setVisible(next){
    if(disposed)return;
    next=Boolean(next);


    if(next===visible)return;


    visible=next;
    host.classList.toggle(HIDDEN_CLASS,!visible);

    if(visible){
      document.documentElement.classList.add(RESERVED_CLASS);
      updateRailGeometry();
      scheduleGeometry();
      setTimeout(scheduleGeometry, 80);
      setTimeout(scheduleGeometry, 300);
    }else{
      document.documentElement.classList.remove(RESERVED_CLASS);
          document.documentElement.style.removeProperty(NATIVE_SCROLLBAR_VAR);
      if(adjustmentFrame!==null){cancelAnimationFrame(adjustmentFrame);adjustmentFrame=null;}
      if(geometryFrame!==null){cancelAnimationFrame(geometryFrame);geometryFrame=null;}
      clearFixedAdjustments();
    }
  }

  chrome.storage.onChanged.addListener((changes,area)=>{
    if(area!=="local"||disposed)return;
    if(changes.atnWorkspacesV1)renderSites().catch(()=>{});
    if(changes[THEME_MODE_KEY]||changes[ACCENT_MODE_KEY]||changes[ACCENT_COLOR_KEY]){
      loadRailTheme().catch(()=>{});
    }
    if(changes.atnEnabled){
      setVisible(changes.atnEnabled.newValue!==false);
    }
  });
  chrome.runtime.onMessage.addListener(message=>{
    if(disposed||message?.type!=="ATN_SET_RAIL_VISIBLE")return;
    setVisible(message.visible);
  });
  window.addEventListener("resize",scheduleGeometry,{passive:true});
  window.addEventListener("scroll",scheduleFixedAdjustment,{passive:true});
  document.addEventListener("DOMContentLoaded",()=>{
    if(visible){
      scheduleGeometry();
      scheduleFixedAdjustment();
    }
  },{once:true});
  // Watch structural changes only. Watching class/style attributes here creates a
  // self-observation loop because our own rail-adjustment classes/styles are mutations.
  // Scroll/resize already covers sticky-header state changes; childList covers new UI.
  const observer=new MutationObserver(()=>{
    scheduleGeometry();
    scheduleFixedAdjustment();
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});

  function connectPort(){
    if(disposed||railPort)return;clearTimeout(reconnectTimer);
    try{
      const p=chrome.runtime.connect({name:"ATN_RAIL"});railPort=p;
      p.onMessage.addListener(m=>{
        if(m?.type==="ATN_RAIL_VISIBILITY")setVisible(m.visible);
        if(m?.type==="ATN_WORKSPACE_CHANGED")renderSites().catch(()=>{});
      });p.onDisconnect.addListener(()=>{if(railPort===p)railPort=null;if(!disposed)reconnectTimer=setTimeout(connectPort,250);});
    }catch{reconnectTimer=setTimeout(connectPort,500);}
  }

  globalThis[INSTANCE]={dispose(){
    disposed=true;
    clearTimeout(reconnectTimer);
    try{railPort?.disconnect();}catch{}
    railPort=null;
    observer.disconnect();
    scrollResizeObserver.disconnect();
    if(adjustmentFrame!==null)cancelAnimationFrame(adjustmentFrame);
    if(geometryFrame!==null)cancelAnimationFrame(geometryFrame);
    visible=false;
    clearFixedAdjustments();
    document.documentElement.classList.remove(RESERVED_CLASS,"app-tower-next-scrollbar-relocated");
      document.documentElement.style.removeProperty(NATIVE_SCROLLBAR_VAR);
    host.remove();
  }};

  // Fast path: static document_start is the earliest extension hook Chromium
  // exposes for normal pages. Paint/reserve the rail immediately, then reconcile
  // the persistent global X state asynchronously.
  document.documentElement.style.setProperty(
    NATIVE_SCROLLBAR_VAR,
    `${nativeScrollbarWidth()}px`
  );
  setVisible(true);

  chrome.storage.local.get("atnEnabled").then(({atnEnabled}) => {
    if(disposed) return;
    if(atnEnabled === false) setVisible(false);
  }).catch(()=>{});

  loadRailTheme().catch(()=>{});
  renderSites().catch(()=>{});
  connectPort();

  chrome.runtime.sendMessage({type:"GET_RAIL_VISIBILITY"}).then(r=>{
    if(!disposed) setVisible(r?.visible!==false);
  }).catch(()=>{});
})();
