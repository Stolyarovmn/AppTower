import {PHASE,createWindowLifecycle,railVisible,reduceLifecycle} from "./lifecycle.js";

const windows=new Map();
const panelPorts=new Map();
const railPorts=new Map();
const UNKNOWN_SETTLE_MS=250;

function lifecycle(windowId){
  if(!windows.has(windowId)) windows.set(windowId,createWindowLifecycle());
  return windows.get(windowId);
}

function setLifecycle(windowId,event){
  const next=reduceLifecycle(lifecycle(windowId),event);
  windows.set(windowId,next);
  syncRail(windowId);
  return next;
}

function addPort(map,windowId,port){
  if(!map.has(windowId)) map.set(windowId,new Set());
  map.get(windowId).add(port);
  port.onDisconnect.addListener(()=>{
    const set=map.get(windowId);
    set?.delete(port);
    if(set && !set.size) map.delete(windowId);
  });
}

function safePost(port,message){try{port.postMessage(message);}catch{}}

function syncRail(windowId){
  const visible=railVisible(lifecycle(windowId));
  for(const port of railPorts.get(windowId)||[]) safePost(port,{type:"RAIL_VISIBILITY",visible});
}

async function settleUnknown(windowId){
  await new Promise(resolve=>setTimeout(resolve,UNKNOWN_SETTLE_MS));
  if(lifecycle(windowId).phase===PHASE.UNKNOWN && !panelPorts.get(windowId)?.size){
    setLifecycle(windowId,{type:"ASSUME_COLLAPSED"});
  }
}

function queueCommand(windowId,command){
  setLifecycle(windowId,{type:"QUEUE_COMMAND",command});
}

function deliverPending(windowId){
  const state=lifecycle(windowId);
  if(!state.pendingCommand) return;
  const ports=[...(panelPorts.get(windowId)||[])];
  if(!ports.length) return;
  for(const port of ports) safePost(port,{type:"COMMAND",command:state.pendingCommand});
  setLifecycle(windowId,{type:"CONSUME_COMMAND"});
}

async function openWindowPanel(windowId,command=null){
  if(command) queueCommand(windowId,command);
  const state=lifecycle(windowId);
  if(state.phase===PHASE.EXPANDED && panelPorts.get(windowId)?.size){
    deliverPending(windowId);
    return {ok:true,reused:true};
  }

  setLifecycle(windowId,{type:"OPEN_REQUEST",command:command||state.pendingCommand});
  try{
    // Window-scoped only. No tab-specific options or open calls exist in v2.
    await chrome.sidePanel.open({windowId});
    return {ok:true,reused:false};
  }catch(error){
    setLifecycle(windowId,{type:"OPEN_FAILED"});
    return {ok:false,error:String(error?.message||error)};
  }
}

async function prepareRailForCollapse(windowId){
  const [tab]=await chrome.tabs.query({active:true,windowId});
  if(!Number.isInteger(tab?.id) || !/^https?:/i.test(tab?.url||"")){
    throw new Error("Collapse доступен только на обычной HTTP(S) вкладке, где может жить компактная панель AppTower.");
  }
  const response=await chrome.tabs.sendMessage(tab.id,{type:"RAIL_PREPARE_COLLAPSE"});
  if(!response?.ok) throw new Error("Компактная панель AppTower не подтвердила готовность.");
}

async function collapseWindowPanel(windowId){
  if(!chrome.sidePanel?.close){
    return {ok:false,error:"Этот Edge не предоставляет безопасный window-scoped sidePanel.close(). AppTower не будет использовать tab-specific workaround."};
  }
  try{
    await prepareRailForCollapse(windowId);
    setLifecycle(windowId,{type:"CLOSE_REQUEST"});
    await chrome.sidePanel.close({windowId});
    if(!chrome.sidePanel?.onClosed) setLifecycle(windowId,{type:"PANEL_CLOSED"});
    return {ok:true};
  }catch(error){
    setLifecycle(windowId,{type:"CLOSE_FAILED"});
    return {ok:false,error:String(error?.message||error)};
  }
}

chrome.runtime.onConnect.addListener(port=>{
  if(port.name==="ATV2_RAIL"){
    const windowId=port.sender?.tab?.windowId;
    if(!Number.isInteger(windowId)) return;
    addPort(railPorts,windowId,port);
    const state=lifecycle(windowId);
    if(state.phase===PHASE.UNKNOWN) void settleUnknown(windowId);
    else syncRail(windowId);
    return;
  }

  const match=/^ATV2_PANEL:(\d+)$/.exec(port.name||"");
  if(match){
    const windowId=Number(match[1]);
    addPort(panelPorts,windowId,port);
    setLifecycle(windowId,{type:"PANEL_CONNECTED"});
    deliverPending(windowId);
  }
});

chrome.runtime.onMessage.addListener((message,sender,sendResponse)=>{
  if(!message||typeof message!=="object") return;
  const senderWindowId=sender?.tab?.windowId;

  if(message.type==="OPEN_PANEL"){
    const windowId=Number.isInteger(Number(message.windowId))?Number(message.windowId):senderWindowId;
    if(!Number.isInteger(windowId)) return;
    void openWindowPanel(windowId,message.command||null).then(sendResponse);
    return true;
  }

  if(message.type==="COLLAPSE_PANEL"){
    const windowId=Number(message.windowId);
    if(!Number.isInteger(windowId)) return;
    void collapseWindowPanel(windowId).then(sendResponse);
    return true;
  }

  if(message.type==="GET_ACTIVE_TAB"){
    const windowId=Number(message.windowId);
    if(!Number.isInteger(windowId)) return;
    void chrome.tabs.query({active:true,windowId}).then(([tab])=>sendResponse({ok:true,tab:tab?{id:tab.id,title:tab.title||"",url:tab.url||""}:null})).catch(error=>sendResponse({ok:false,error:String(error)}));
    return true;
  }
});

chrome.action.onClicked.addListener(tab=>{
  if(Number.isInteger(tab?.windowId)) void openWindowPanel(tab.windowId);
});

chrome.commands?.onCommand?.addListener(async command=>{
  if(command!=="open-search") return;
  const win=await chrome.windows.getLastFocused().catch(()=>null);
  if(Number.isInteger(win?.id)) void openWindowPanel(win.id,{type:"search"});
});

chrome.sidePanel?.onOpened?.addListener(info=>{
  if(Number.isInteger(info?.windowId)){
    setLifecycle(info.windowId,{type:"PANEL_OPENED"});
    deliverPending(info.windowId);
  }
});

chrome.sidePanel?.onClosed?.addListener(info=>{
  if(Number.isInteger(info?.windowId)) setLifecycle(info.windowId,{type:"PANEL_CLOSED"});
});

chrome.windows.onRemoved.addListener(windowId=>{
  windows.delete(windowId);
  panelPorts.delete(windowId);
  railPorts.delete(windowId);
});
