const STORAGE_KEY="atv2.data.v1";
const DEFAULT_DATA={
  shortcuts:[],
  split:false,
  activePane:"top",
  panes:{top:{url:"",title:""},bottom:{url:"",title:""}}
};

const currentWindow=await chrome.windows.getCurrent();
const windowId=currentWindow.id;
let port=null;

const panes=document.getElementById("panes");
const splitToggle=document.getElementById("split-toggle");
const shortcutList=document.getElementById("shortcut-list");
const collapse=document.getElementById("collapse");
const add=document.getElementById("add");
const search=document.getElementById("search");
const settings=document.getElementById("settings");
const addDialog=document.getElementById("add-dialog");
const addForm=document.getElementById("add-form");
const addTitle=document.getElementById("add-title");
const addUrl=document.getElementById("add-url");
const searchDialog=document.getElementById("search-dialog");
const searchInput=document.getElementById("search-input");
const searchResults=document.getElementById("search-results");
const moreMenu=document.getElementById("more-menu");
const toast=document.getElementById("toast");

let data=structuredClone(DEFAULT_DATA);
let menuPane=null;
let toastTimer=null;

function normalizeUrl(value){
  let text=String(value||"").trim();
  if(!text) return "";
  if(!/^[a-z][a-z0-9+.-]*:/i.test(text)) text=`https://${text}`;
  try{
    const url=new URL(text);
    if(!/^https?:$/.test(url.protocol)) return "";
    return url.href;
  }catch{return "";}
}

function paneEl(name){return document.querySelector(`.pane[data-pane="${name}"]`);}
function paneState(name){return data.panes[name];}

async function load(){
  const saved=(await chrome.storage.local.get(STORAGE_KEY))[STORAGE_KEY];
  if(saved&&typeof saved==="object"){
    data={
      shortcuts:Array.isArray(saved.shortcuts)?saved.shortcuts.filter(item=>item&&typeof item.url==="string"):[],
      split:Boolean(saved.split),
      activePane:saved.activePane==="bottom"?"bottom":"top",
      panes:{
        top:{...DEFAULT_DATA.panes.top,...(saved.panes?.top||{})},
        bottom:{...DEFAULT_DATA.panes.bottom,...(saved.panes?.bottom||{})}
      }
    };
  }
}

function save(){return chrome.storage.local.set({[STORAGE_KEY]:data});}

function setActivePane(name){
  if(name==="bottom"&&!data.split) name="top";
  data.activePane=name;
  for(const pane of document.querySelectorAll(".pane")) pane.classList.toggle("active",pane.dataset.pane===name);
  void save();
}

function loadFrame(name,{force=false}={}){
  const pane=paneEl(name);
  const input=pane.querySelector('[data-role="url"]');
  const frame=pane.querySelector('[data-role="frame"]');
  const url=normalizeUrl(input.value||paneState(name).url);
  if(!url) return;
  input.value=url;
  paneState(name).url=url;
  if(force||frame.src!==url) frame.src=url;
  void save();
  renderShortcuts();
}

function renderLayout(){
  panes.dataset.layout=data.split?"split":"single";
  splitToggle.setAttribute("aria-pressed",String(data.split));
  if(!data.split&&data.activePane==="bottom") data.activePane="top";
  setActivePane(data.activePane);
}

function renderPanes(){
  for(const name of ["top","bottom"]){
    const pane=paneEl(name);
    const input=pane.querySelector('[data-role="url"]');
    const frame=pane.querySelector('[data-role="frame"]');
    input.value=paneState(name).url||"";
    if(paneState(name).url&&frame.src!==paneState(name).url) frame.src=paneState(name).url;
  }
}

function titleForShortcut(item){
  if(item.title) return item.title;
  try{return new URL(item.url).hostname;}catch{return item.url;}
}

function renderShortcuts(){
  shortcutList.replaceChildren();
  for(const item of data.shortcuts){
    const button=document.createElement("button");
    button.type="button";
    button.className="shortcut";
    button.title=titleForShortcut(item);
    button.dataset.id=item.id;
    const active=Object.values(data.panes).some(p=>p.url===item.url);
    button.classList.toggle("active",active);
    const fallback=document.createElement("span");
    fallback.className="fallback";
    fallback.textContent=titleForShortcut(item).trim().slice(0,2).toUpperCase()||"•";
    button.append(fallback);
    button.addEventListener("click",()=>{
      const name=data.activePane;
      paneEl(name).querySelector('[data-role="url"]').value=item.url;
      paneState(name).title=item.title||"";
      loadFrame(name,{force:false});
    });
    shortcutList.append(button);
  }
}

function showToast(message){
  clearTimeout(toastTimer);
  toast.textContent=message;
  toast.hidden=false;
  toastTimer=setTimeout(()=>{toast.hidden=true;},4200);
}

async function openAddCurrent(){
  const response=await chrome.runtime.sendMessage({type:"GET_ACTIVE_TAB",windowId}).catch(()=>null);
  const tab=response?.tab;
  const url=normalizeUrl(tab?.url);
  addTitle.value=tab?.title||"";
  addUrl.value=url||"";
  addDialog.showModal();
  queueMicrotask(()=>addTitle.focus());
}

function saveShortcut(title,url){
  const normalized=normalizeUrl(url);
  if(!normalized) return false;
  const existing=data.shortcuts.find(item=>item.url===normalized);
  if(existing){existing.title=String(title||existing.title||"").trim();}
  else data.shortcuts.push({id:crypto.randomUUID(),title:String(title||"").trim(),url:normalized});
  renderShortcuts();
  void save();
  return true;
}

function openSearch(){
  searchDialog.showModal();
  searchInput.value="";
  renderSearch("");
  queueMicrotask(()=>searchInput.focus());
}

function renderSearch(query){
  const q=String(query||"").trim().toLocaleLowerCase();
  searchResults.replaceChildren();
  const items=data.shortcuts.filter(item=>!q||`${item.title} ${item.url}`.toLocaleLowerCase().includes(q));
  for(const item of items){
    const b=document.createElement("button");
    b.type="button";
    b.textContent=`${titleForShortcut(item)}  —  ${item.url}`;
    b.addEventListener("click",()=>{
      searchDialog.close();
      paneEl(data.activePane).querySelector('[data-role="url"]').value=item.url;
      loadFrame(data.activePane);
    });
    searchResults.append(b);
  }
  const commands=[
    {label:"Добавить текущую страницу",run:()=>openAddCurrent()},
    {label:data.split?"Одна область":"Две области",run:()=>toggleSplit()}
  ];
  for(const command of commands){
    if(q&&!command.label.toLocaleLowerCase().includes(q)) continue;
    const b=document.createElement("button");b.type="button";b.textContent=command.label;
    b.addEventListener("click",()=>{searchDialog.close();command.run();});
    searchResults.append(b);
  }
}

function toggleSplit(){
  data.split=!data.split;
  if(!data.split) data.activePane="top";
  renderLayout();
  void save();
}

function closePane(name){
  if(!data.split) return;
  const keep=name==="top"?"bottom":"top";
  data.panes.top={...data.panes[keep]};
  data.panes.bottom={url:"",title:""};
  data.split=false;
  data.activePane="top";
  renderLayout();
  renderPanes();
  void save();
}

function positionMenu(button){
  const r=button.getBoundingClientRect();
  moreMenu.hidden=false;
  const mr=moreMenu.getBoundingClientRect();
  moreMenu.style.left=`${Math.max(8,Math.min(innerWidth-mr.width-8,r.right-mr.width))}px`;
  moreMenu.style.top=`${Math.max(8,Math.min(innerHeight-mr.height-8,r.bottom+5))}px`;
}

for(const pane of document.querySelectorAll(".pane")){
  const name=pane.dataset.pane;
  const input=pane.querySelector('[data-role="url"]');
  pane.querySelector(".pane-toolbar").addEventListener("pointerdown",()=>setActivePane(name));
  input.addEventListener("focus",()=>setActivePane(name));
  input.addEventListener("keydown",event=>{if(event.key==="Enter") loadFrame(name);});
  pane.querySelector('[data-action="go"]').addEventListener("click",()=>loadFrame(name));
  pane.querySelector('[data-action="reload"]').addEventListener("click",()=>{
    const frame=pane.querySelector('[data-role="frame"]');
    const url=paneState(name).url;
    if(url) frame.src=url;
  });
  pane.querySelector('[data-action="save"]').addEventListener("click",()=>{
    const url=normalizeUrl(input.value||paneState(name).url);
    if(!url) return;
    saveShortcut(paneState(name).title||"",url);
  });
  pane.querySelector('[data-action="more"]').addEventListener("click",event=>{
    event.stopPropagation();
    menuPane=name;
    if(moreMenu.hidden) positionMenu(event.currentTarget); else moreMenu.hidden=true;
  });
  pane.querySelector('[data-action="close"]').addEventListener("click",()=>closePane(name));
}

moreMenu.querySelector('[data-menu="external"]').addEventListener("click",()=>{
  const url=normalizeUrl(paneState(menuPane||data.activePane).url);
  moreMenu.hidden=true;
  if(url) chrome.tabs.create({url});
});
moreMenu.querySelector('[data-menu="clear"]').addEventListener("click",()=>{
  const name=menuPane||data.activePane;
  data.panes[name]={url:"",title:""};
  const pane=paneEl(name);
  pane.querySelector('[data-role="url"]').value="";
  pane.querySelector('[data-role="frame"]').src="about:blank";
  moreMenu.hidden=true;
  renderShortcuts();
  void save();
});
document.addEventListener("pointerdown",event=>{if(!moreMenu.hidden&&!moreMenu.contains(event.target)&&!event.target.closest?.('[data-action="more"]')) moreMenu.hidden=true;},true);

splitToggle.addEventListener("click",toggleSplit);
collapse.addEventListener("click",async()=>{
  const response=await chrome.runtime.sendMessage({type:"COLLAPSE_PANEL",windowId}).catch(error=>({ok:false,error:String(error)}));
  if(!response?.ok) showToast(response?.error||"Не удалось свернуть AppTower");
});
add.addEventListener("click",openAddCurrent);
search.addEventListener("click",openSearch);
settings.addEventListener("click",()=>showToast("Настройки v2 будут возвращены после стабилизации lifecycle. Сейчас здесь намеренно нет legacy-кода."));

for(const button of document.querySelectorAll(".dialog-close")) button.addEventListener("click",()=>button.closest("dialog")?.close());
addForm.addEventListener("submit",event=>{
  if(event.submitter?.value==="cancel") return;
  event.preventDefault();
  if(saveShortcut(addTitle.value,addUrl.value)) addDialog.close();
});
searchInput.addEventListener("input",()=>renderSearch(searchInput.value));

function handleCommand(message){
  if(message?.type!=="COMMAND") return;
  const command=message.command;
  if(command?.type==="search") openSearch();
  else if(command?.type==="add-current") void openAddCurrent();
  else if(command?.type==="settings") showToast("Настройки v2 пока не перенесены намеренно.");
}

function reconnectPanel(){
  const previous=port;
  port=chrome.runtime.connect({name:`ATV2_PANEL:${windowId}`});
  port.onMessage.addListener(handleCommand);
  previous?.disconnect();
}
chrome.runtime.onMessage.addListener(message=>{if(message?.type==="PANEL_RECONNECT")reconnectPanel();});

await load();
renderLayout();
renderPanes();
renderShortcuts();

reconnectPanel();
