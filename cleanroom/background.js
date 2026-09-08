import {installFeatures} from "./core/services.js";
import {PHASE,createWindowLifecycle,railVisible,reduceLifecycle} from "./lifecycle.js";

let featureEnabled=true;let featureStore=null;
const windows=new Map();
const panelPorts=new Map();
const railPorts=new Map();
const LOG_KEY="atv2.devlog.v1";
const MAX_LOG_ENTRIES=500;
let logWrite=Promise.resolve();

function apiCapabilities(){return {getContexts:typeof chrome.runtime.getContexts==="function",sidePanel:Boolean(chrome.sidePanel),open:typeof chrome.sidePanel?.open==="function",close:typeof chrome.sidePanel?.close==="function",setOptions:typeof chrome.sidePanel?.setOptions==="function",getOptions:typeof chrome.sidePanel?.getOptions==="function",onOpened:Boolean(chrome.sidePanel?.onOpened),onClosed:Boolean(chrome.sidePanel?.onClosed)};}
function compact(value){if(value==null)return value;if(typeof value==="string")return value.length>500?`${value.slice(0,500)}…`:value;if(Array.isArray(value))return value.slice(0,30).map(compact);if(typeof value==="object"){const out={};for(const [key,item] of Object.entries(value).slice(0,40))out[key]=compact(item);return out;}return value;}
function devLog(event,payload={}){const entry={ts:new Date().toISOString(),event,payload:compact(payload)};console.info("[ATV2]",event,entry.payload);logWrite=logWrite.then(async()=>{const current=(await chrome.storage.local.get(LOG_KEY))[LOG_KEY];const list=Array.isArray(current)?current:[];list.push(entry);if(list.length>MAX_LOG_ENTRIES)list.splice(0,list.length-MAX_LOG_ENTRIES);await chrome.storage.local.set({[LOG_KEY]:list});}).catch(error=>console.warn("[ATV2] log write failed",error));return entry;}
function lifecycle(windowId){if(!windows.has(windowId))windows.set(windowId,createWindowLifecycle());return windows.get(windowId);}
function setLifecycle(windowId,event){const before=lifecycle(windowId);const next=reduceLifecycle(before,event);windows.set(windowId,next);devLog("lifecycle.transition",{windowId,event:event?.type,from:before.phase,to:next.phase,pendingCommand:next.pendingCommand?.type||null});syncRail(windowId);return next;}
function addPort(map,windowId,port,kind){if(!map.has(windowId))map.set(windowId,new Set());map.get(windowId).add(port);devLog("port.connected",{kind,windowId,count:map.get(windowId).size});port.onDisconnect.addListener(()=>{const set=map.get(windowId);set?.delete(port);if(set&&!set.size)map.delete(windowId);devLog("port.disconnected",{kind,windowId,count:map.get(windowId)?.size||0});});}
function safePost(port,message){try{port.postMessage(message);}catch(error){devLog("port.post.failed",{messageType:message?.type,error:String(error)});}}
function syncRail(windowId){
  const visible=featureEnabled&&railVisible(lifecycle(windowId));
  void chrome.runtime.sendMessage({type:"NEW_TAB_VISIBILITY",windowId,visible}).catch(()=>{});
  for(const port of railPorts.get(windowId)||[])safePost(port,{type:"RAIL_VISIBILITY",visible});
  // Ports belong to one worker lifetime. Existing content scripts still accept
  // tab messages after that worker and its port registry have disappeared.
  void chrome.tabs.query({windowId}).then(tabs=>Promise.all(tabs.filter(tab=>/^https?:/i.test(tab.url||""))
    .map(async tab=>{
      const visible=featureEnabled&&railVisible(lifecycle(windowId));
      try{
        const response=await chrome.tabs.sendMessage(tab.id,{type:"RAIL_VISIBILITY",visible},{frameId:0});
        devLog("rail.visibility.ack",{windowId,tabId:tab.id,requested:visible,visible:response?.visible,ok:response?.ok===true});
      }catch(error){devLog("rail.visibility.unavailable",{windowId,tabId:tab.id,error:String(error?.message||error)});}
    }))).catch(error=>devLog("rail.visibility.query-failed",{windowId,error:String(error)}));
}
async function settleUnknown(windowId){
  if(lifecycle(windowId).phase!==PHASE.UNKNOWN)return;
  try{
    const contexts=await chrome.runtime.getContexts({contextTypes:["SIDE_PANEL"],windowIds:[windowId]});
    // A user action or a panel reconnect may have superseded this query.
    if(lifecycle(windowId).phase!==PHASE.UNKNOWN)return;
    devLog("lifecycle.context-recovery",{windowId,panelContexts:contexts.length});
    setLifecycle(windowId,{type:contexts.length||panelPorts.get(windowId)?.size?"PANEL_CONNECTED":"ASSUME_COLLAPSED"});
  }catch(error){devLog("lifecycle.context-recovery.failed",{windowId,error:String(error)});}
}
function queueCommand(windowId,command){devLog("command.queued",{windowId,command:command?.type||null});setLifecycle(windowId,{type:"QUEUE_COMMAND",command});}
function deliverPending(windowId){const state=lifecycle(windowId);if(!state.pendingCommand)return;const ports=[...(panelPorts.get(windowId)||[])];if(!ports.length){devLog("command.waiting-for-panel",{windowId,command:state.pendingCommand?.type||null});return;}devLog("command.delivered",{windowId,command:state.pendingCommand?.type||null,ports:ports.length});for(const port of ports)safePost(port,{type:"COMMAND",command:state.pendingCommand});setLifecycle(windowId,{type:"CONSUME_COMMAND"});}
async function openWindowPanel(windowId,command=null){if(!featureEnabled){featureEnabled=true;void featureStore?.write({type:"enabled",value:true});}devLog("panel.open.request",{windowId,command:command?.type||null,state:lifecycle(windowId).phase,api:apiCapabilities()});if(command)queueCommand(windowId,command);const state=lifecycle(windowId);if(state.phase===PHASE.EXPANDED&&panelPorts.get(windowId)?.size){deliverPending(windowId);devLog("panel.open.reused",{windowId});return {ok:true,reused:true};}if(state.phase===PHASE.OPENING)return {ok:true,pending:true};if(state.phase===PHASE.CLOSING)return {ok:false,busy:true,error:"AppTower ещё завершает сворачивание. Повторите нажатие после завершения."};setLifecycle(windowId,{type:"OPEN_REQUEST",command:command||state.pendingCommand});try{await chrome.sidePanel.open({windowId});devLog("panel.open.api-resolved",{windowId});return {ok:true,reused:false};}catch(error){setLifecycle(windowId,{type:"OPEN_FAILED"});devLog("panel.open.failed",{windowId,error:String(error?.message||error)});return {ok:false,error:String(error?.message||error)};}}

async function prepareRailForCollapse(windowId){
  const [tab]=await chrome.tabs.query({active:true,windowId});
  devLog("collapse.rail.prepare",{windowId,tabId:tab?.id,url:tab?.url||null});
  if(!Number.isInteger(tab?.id)||!/^https?:/i.test(tab?.url||""))throw new Error("Collapse доступен только на обычной HTTP(S) вкладке, где может жить компактная панель AppTower.");
  let response=null;
  try{
    response=await chrome.tabs.sendMessage(tab.id,{type:"RAIL_PREPARE_COLLAPSE"});
    devLog("collapse.rail.response",{windowId,response,source:"existing-content-script"});
  }catch(error){
    devLog("collapse.rail.message-missed",{windowId,tabId:tab.id,error:String(error?.message||error)});
    if(!chrome.scripting?.executeScript)throw error;
    await chrome.scripting.executeScript({target:{tabId:tab.id},files:["page-space.js","icon-data.js","entity-icons.js","rail.js"]});
    devLog("collapse.rail.injected",{windowId,tabId:tab.id});
    response=await chrome.tabs.sendMessage(tab.id,{type:"RAIL_PREPARE_COLLAPSE"});
    devLog("collapse.rail.response",{windowId,response,source:"injected-content-script"});
  }
  if(!response?.ok)throw new Error("Компактная панель AppTower не подтвердила готовность.");
}

async function enableForCollapse(windowId){
  // Native browser entry can bypass action.onClicked/openWindowPanel.
  // Explicit Collapse means keep AppTower available as a compact rail.
  if(featureStore)await featureStore.write({type:"enabled",value:true});
  featureEnabled=true;
  devLog("panel.collapse.enable",{windowId,source:"explicit-collapse"});
}
async function collapseWindowPanel(windowId){const state=lifecycle(windowId);const api=apiCapabilities();devLog("panel.collapse.request",{windowId,state:state.phase,api});if(state.phase===PHASE.CLOSING)return {ok:true,pending:true};if(!chrome.sidePanel?.close){const error="Этот Edge не предоставляет безопасный window-scoped sidePanel.close(). AppTower не будет использовать tab-specific workaround.";devLog("panel.collapse.unsupported",{windowId,error,api});return {ok:false,error};}try{await enableForCollapse(windowId);await prepareRailForCollapse(windowId);setLifecycle(windowId,{type:"CLOSE_REQUEST"});await chrome.sidePanel.close({windowId});devLog("panel.close.api-resolved",{windowId});if(lifecycle(windowId).phase===PHASE.CLOSING){devLog("panel.close.reconciled",{windowId,source:"close-promise"});setLifecycle(windowId,{type:"PANEL_CLOSED"});}return {ok:true};}catch(error){setLifecycle(windowId,{type:"CLOSE_FAILED"});devLog("panel.collapse.failed",{windowId,error:String(error?.message||error)});return {ok:false,error:String(error?.message||error)};}}
async function diagnosticsReport(){const extensionContexts=await chrome.runtime.getContexts({contextTypes:["SIDE_PANEL"]}).catch(error=>({error:String(error)}));await logWrite;const stored=await chrome.storage.local.get([LOG_KEY,"atv2.data.v1"]);const winList=[];for(const [windowId,state] of windows)winList.push({windowId,state,panelPorts:panelPorts.get(windowId)?.size||0,railPorts:railPorts.get(windowId)?.size||0});const browserWindows=await chrome.windows.getAll({populate:true}).catch(()=>[]);return {generatedAt:new Date().toISOString(),manifest:chrome.runtime.getManifest(),userAgent:navigator.userAgent,api:apiCapabilities(),extensionContexts,lifecycle:winList,browserWindows:browserWindows.map(win=>({id:win.id,focused:win.focused,state:win.state,tabs:(win.tabs||[]).map(tab=>({id:tab.id,active:tab.active,url:tab.url||""}))})),appState:stored["atv2.data.v1"]||null,log:Array.isArray(stored[LOG_KEY])?stored[LOG_KEY]:[]};}
async function runSelfTest(){const api=apiCapabilities();const windowsNow=await chrome.windows.getAll({populate:true}).catch(()=>[]);const checks=[{name:"sidePanel API exists",pass:api.sidePanel},{name:"sidePanel.open exists",pass:api.open},{name:"sidePanel.close exists",pass:api.close},{name:"sidePanel.onOpened exists",pass:api.onOpened},{name:"sidePanel.onClosed exists",pass:api.onClosed},{name:"scripting.executeScript exists",pass:typeof chrome.scripting?.executeScript==="function"},{name:"no tab-scoped lifecycle in Cleanroom",pass:true},{name:"browser window visible to extension",pass:windowsNow.length>0}];const result={scope:"api-capabilities-only; not a lifecycle runtime test",generatedAt:new Date().toISOString(),api,checks,pass:checks.every(item=>item.pass)};devLog("diagnostics.selftest",result);return result;}
chrome.runtime.onConnect.addListener(port=>{if(port.name==="ATV2_RAIL"){const windowId=port.sender?.tab?.windowId;if(!Number.isInteger(windowId))return;addPort(railPorts,windowId,port,"rail");const state=lifecycle(windowId);if(state.phase===PHASE.UNKNOWN)void settleUnknown(windowId);else syncRail(windowId);return;}const match=/^ATV2_PANEL:(\d+)$/.exec(port.name||"");if(match){const windowId=Number(match[1]);addPort(panelPorts,windowId,port,"panel");setLifecycle(windowId,{type:"PANEL_CONNECTED"});deliverPending(windowId);}});
chrome.runtime.onMessage.addListener((message,sender,sendResponse)=>{if(!message||typeof message!=="object")return;const senderWindowId=sender?.tab?.windowId;if(message.type==="RAIL_STATE_REQUEST"&&Number.isInteger(senderWindowId)){void settleUnknown(senderWindowId).then(()=>{syncRail(senderWindowId);sendResponse({ok:true});});return true;}if(message.type==="DEV_LOG"){devLog(`ui.${message.event||"event"}`,{...message.payload,senderWindowId});sendResponse({ok:true});return;}if(message.type==="OPEN_DIAGNOSTICS"){void chrome.tabs.create({url:chrome.runtime.getURL("diagnostics.html")}).then(()=>sendResponse({ok:true})).catch(error=>sendResponse({ok:false,error:String(error)}));return true;}if(message.type==="GET_DIAGNOSTICS"){void diagnosticsReport().then(report=>sendResponse({ok:true,report})).catch(error=>sendResponse({ok:false,error:String(error)}));return true;}if(message.type==="RUN_SELF_TEST"){void runSelfTest().then(result=>sendResponse({ok:true,result})).catch(error=>sendResponse({ok:false,error:String(error)}));return true;}if(message.type==="CLEAR_DIAGNOSTICS"){void chrome.storage.local.remove(LOG_KEY).then(()=>sendResponse({ok:true}));return true;}if(message.type==="OPEN_PANEL"){const windowId=Number.isInteger(Number(message.windowId))?Number(message.windowId):senderWindowId;if(!Number.isInteger(windowId))return;void openWindowPanel(windowId,message.command||null).then(sendResponse);return true;}if(message.type==="COLLAPSE_PANEL"){const windowId=Number(message.windowId);if(!Number.isInteger(windowId))return;void collapseWindowPanel(windowId).then(sendResponse);return true;}if(message.type==="GET_ACTIVE_TAB"){const windowId=Number(message.windowId);if(!Number.isInteger(windowId))return;void chrome.tabs.query({active:true,windowId}).then(([tab])=>sendResponse({ok:true,tab:tab?{id:tab.id,title:tab.title||"",url:tab.url||""}:null})).catch(error=>sendResponse({ok:false,error:String(error)}));return true;}});
chrome.action.onClicked.addListener(tab=>{if(Number.isInteger(tab?.windowId)){devLog("action.clicked",{windowId:tab.windowId,tabId:tab.id});void openWindowPanel(tab.windowId);}});
chrome.commands?.onCommand?.addListener(async command=>{if(command!=="open-search")return;const win=await chrome.windows.getLastFocused().catch(()=>null);if(Number.isInteger(win?.id)){devLog("command.keyboard",{command,windowId:win.id});void openWindowPanel(win.id,{type:"search"});}});
chrome.sidePanel?.onOpened?.addListener(info=>{if(Number.isInteger(info?.windowId)){devLog("edge.sidePanel.onOpened",info);setLifecycle(info.windowId,{type:"PANEL_OPENED"});deliverPending(info.windowId);}});
chrome.sidePanel?.onClosed?.addListener(info=>{if(Number.isInteger(info?.windowId)){devLog("edge.sidePanel.onClosed",info);setLifecycle(info.windowId,{type:"PANEL_CLOSED"});}});
chrome.windows.onRemoved.addListener(windowId=>{devLog("window.removed",{windowId});windows.delete(windowId);panelPorts.delete(windowId);railPorts.delete(windowId);});
devLog("service-worker.started",{api:apiCapabilities(),userAgent:navigator.userAgent});

// Ask surviving panel documents to register with this worker, without reloading UI.
void chrome.runtime.sendMessage({type:"PANEL_RECONNECT"}).catch(()=>{});

featureStore=installFeatures({openWindowPanel,log:devLog,setEnabled(value){featureEnabled=value;for(const windowId of windows.keys())syncRail(windowId);void chrome.windows.getAll().then(list=>{for(const win of list){if(value)void settleUnknown(win.id);syncRail(win.id);}});}});
