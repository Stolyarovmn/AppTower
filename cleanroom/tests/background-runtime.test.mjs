import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as lifecycle from '../lifecycle.js';

const source=fs.readFileSync(new URL('../background.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
const event=()=>({listeners:[],addListener(fn){this.listeners.push(fn);},emit(...args){for(const fn of this.listeners)fn(...args);}});
function harness({connectPorts=true,panelContexts=[]}={}){
  let resolveClose,rejectClose;
  const closing=new Promise((resolve,reject)=>{resolveClose=resolve;rejectClose=reject;});
  const stored={};
  const chrome={
    storage:{local:{async get(){return stored;},async set(value){Object.assign(stored,value);}}},
    runtime:{onConnect:event(),onMessage:event(),sendMessage:async()=>{},getContexts:async()=>panelContexts},
    tabs:{async query(){return [{id:7,url:'https://example.com'}];},async sendMessage(){return {ok:true,ready:true,visible:false};}},
    sidePanel:{onOpened:event(),onClosed:event(),open:async()=>{},close:()=>closing},
    action:{onClicked:event()},commands:{onCommand:event()},windows:{onRemoved:event()}
  };
  const context=vm.createContext({...lifecycle,installFeatures:()=>null,chrome,console:{info(){},warn(){}},navigator:{userAgent:'test'},setTimeout});
  vm.runInContext(source+'\nthis.api={collapseWindowPanel,openWindowPanel,lifecycle,settleUnknown,syncRail};',context);
  function port(name){const p={name,sender:{tab:{windowId:1}},messages:[],onDisconnect:event(),postMessage(m){this.messages.push(m);}};chrome.runtime.onConnect.emit(p);return p;}
  const panel=connectPorts?port('ATV2_PANEL:1'):null;
  const rail=connectPorts?port('ATV2_RAIL'):null;
  return {...context.api,chrome,panel,rail,port,resolveClose,rejectClose};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));

test('successful close leaves closing even when advertised onClosed never fires',async()=>{
  const h=harness();const close=h.collapseWindowPanel(1);await tick();
  h.panel.onDisconnect.emit();h.resolveClose();await close;
  assert.equal(h.lifecycle(1).phase,'collapsed');
});

test('close without onClosed: rail hidden until API completion; Search delivered once',async()=>{
  const h=harness();const close=h.collapseWindowPanel(1);await tick();
  assert.equal(h.lifecycle(1).phase,'closing');
  assert.equal(h.rail.messages.some(m=>m.visible),false);
  h.panel.onDisconnect.emit();
  assert.equal(h.lifecycle(1).phase,'closing','port disconnect alone is not closure');
  h.resolveClose();await close;
  assert.equal(h.lifecycle(1).phase,'collapsed');
  assert.equal(h.rail.messages.at(-1).visible,true);
  await h.openWindowPanel(1,{type:'search'});
  assert.equal(h.rail.messages.at(-1).visible,false);
  const panel=h.port('ATV2_PANEL:1');
  assert.equal(panel.messages.filter(m=>m.type==='COMMAND').length,1);
  assert.equal(panel.messages[0].command.type,'search');
  assert.equal(h.lifecycle(1).pendingCommand,null);
});

test('failed close never reveals a second rail',async()=>{
  const h=harness();const close=h.collapseWindowPanel(1);await tick();
  h.rejectClose(new Error('close failed'));assert.equal((await close).ok,false);
  assert.equal(h.lifecycle(1).phase,'expanded');
  assert.equal(h.rail.messages.some(m=>m.visible),false);
});

test('onClosed then reopen: old promise cannot collapse new panel',async()=>{
  const h=harness();const close=h.collapseWindowPanel(1);await tick();
  h.panel.onDisconnect.emit();h.chrome.sidePanel.onClosed.emit({windowId:1});
  await h.openWindowPanel(1);h.port('ATV2_PANEL:1');
  h.resolveClose();await close;
  assert.equal(h.lifecycle(1).phase,'expanded');
  assert.equal(h.rail.messages.at(-1).visible,false);
});

// A minimal DOM runs the actual content script; it does not model native Edge UI.
function survivingRail(){
  const elements=[];
  function element(){return {style:{},children:[],isConnected:false,setAttribute(){},addEventListener(){},append(...nodes){this.children.push(...nodes);for(const n of nodes)n.isConnected=true;},attachShadow(){return element();},remove(){this.isConnected=false;}};}
  const root=element();
  const document={querySelector(){return null;},documentElement:root,createElement(){const n=element();elements.push(n);return n;},getElementById(id){return elements.find(n=>n.id===id&&n.isConnected);}};
  const window={addEventListener(){}};window.top=window;
  const onMessage=event();
  const oldPort={onMessage:event(),onDisconnect:event()};
  const chrome={runtime:{connect:()=>oldPort,onMessage,sendMessage:async()=>({ok:true})}};
  vm.runInNewContext(fs.readFileSync(new URL('../rail.js',import.meta.url),'utf8'),{window,document,chrome});
  const receive=(message)=>{let reply;onMessage.emit(message,{},value=>{reply=value;});return reply;};
  oldPort.onMessage.emit({type:'RAIL_VISIBILITY',visible:true});
  return {receive,visible:()=>document.getElementById('atv2-rail-host')?.style.display==='block',hosts:()=>elements.filter(n=>n.id==='atv2-rail-host'&&n.isConnected).length};
}

test('worker restart loses all rail ports: actual surviving rail hides on open and returns on close',async()=>{
  const rail=survivingRail();assert.equal(rail.visible(),true);
  const h=harness({connectPorts:false});
  h.chrome.tabs.sendMessage=async(_tabId,message)=>rail.receive(message);
  await h.openWindowPanel(1);await tick();
  assert.equal(rail.visible(),false);
  const panel=h.port('ATV2_PANEL:1');
  const close=h.collapseWindowPanel(1);await tick();
  assert.equal(rail.visible(),false);
  panel.onDisconnect.emit();h.resolveClose();await close;await tick();
  assert.equal(rail.visible(),true);
  assert.equal(rail.hosts(),1);
  await h.openWindowPanel(1);await tick();assert.equal(rail.visible(),false);
});

test('startup recovers existing Side Panel context instead of assuming collapsed',async()=>{
  const h=harness({connectPorts:false,panelContexts:[{contextType:'SIDE_PANEL',windowId:1}]});
  await h.settleUnknown(1);assert.equal(h.lifecycle(1).phase,'expanded');
});

test('startup with no Side Panel recovers collapsed',async()=>{
  const h=harness({connectPorts:false});
  await h.settleUnknown(1);assert.equal(h.lifecycle(1).phase,'collapsed');
});

test('context recovery cannot overwrite an intervening user open',async()=>{
  const h=harness({connectPorts:false});let reply;
  h.chrome.runtime.getContexts=()=>new Promise(resolve=>{reply=resolve;});
  const recovery=h.settleUnknown(1);await h.openWindowPanel(1);reply([]);await recovery;
  assert.equal(h.lifecycle(1).phase,'opening');
});
