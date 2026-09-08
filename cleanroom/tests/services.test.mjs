import test from 'node:test';
import assert from 'node:assert/strict';
import { installFeatures } from '../core/services.js';
import { defaults, KEY } from '../core/model.js';
import { createStore } from '../core/store.js';
const event=()=>({listeners:[],addListener(fn){this.listeners.push(fn);}});
const area=(data={})=>({data,async get(){return structuredClone(data);},async set(v){Object.assign(data,structuredClone(v));}});
test('fresh reads retain workspace identity before first edit',async()=>{
 const store=createStore({local:area()});assert.equal((await store.read()).workspaces[0].id,(await store.read()).workspaces[0].id);
});
test('feature service rebuilds notifications and disables all windows',async()=>{
 const slept=[],closed=[],permissions=[],enabled=[]; const state=defaults();
 globalThis.chrome={storage:{local:area({[KEY]:state}),session:area(),sync:area(),onChanged:event()},
 runtime:{id:'test',onMessage:event(),onInstalled:event(),async sendMessage(m){if(m.type==='APP_SLEEP')slept.push(m.key);return {ok:true};}},
 declarativeNetRequest:{async getSessionRules(){return [];},async updateSessionRules(){}},
 contextMenus:{onClicked:event()},permissions:{async contains(){return true;}},
 contentSettings:{notifications:{async clear(){permissions.length=0;},async set(v){permissions.push(v);}}},
 windows:{async getAll(){return [{id:1},{id:2}];}},sidePanel:{async close(v){closed.push(v.windowId);}}};
 installFeatures({setEnabled(v){enabled.push(v);},openWindowPanel(){},log(){}});
 const listener=chrome.runtime.onMessage.listeners[0];
 const call=m=>new Promise(resolve=>listener(m,{},resolve));
 for(const [url,notifications] of [['https://a.test','block'],['https://b.test','allow'],['https://a.test','ask']]){
 const result=await call({type:'APP_MUTATE',action:{type:'site-settings',url,value:{notifications}}});assert.equal(result.ok,true);
 }
 assert.equal(permissions.length,1);assert.equal(permissions[0].primaryPattern,'https://b.test/*');
 assert.equal((await call({type:'APP_DISABLE'})).ok,true);assert.deepEqual(closed,[1,2]);assert.equal(enabled.at(-1),false);assert.equal(chrome.storage.local.data[KEY].enabled,false);
});

test('separate window opens once, reloads in place and returns to AppTower',async()=>{
 const updates=[],reloads=[],removed=[],createdTabs=[];
 globalThis.chrome={storage:{local:area({[KEY]:defaults()}),session:area(),sync:area(),onChanged:event()},
 runtime:{id:'test',onMessage:event(),onInstalled:event(),getURL:p=>'chrome-extension://test/'+p,async sendMessage(){return {ok:true};}},
 declarativeNetRequest:{async getSessionRules(){return [];},async updateSessionRules(){}},
 contextMenus:{onClicked:event()},permissions:{async contains(){return false;}},contentSettings:{notifications:{}},
 windows:{async create(){return {id:91};},async update(id,value){updates.push([id,value]);},async remove(id){removed.push(id);},async getAll(){return [];},},
 tabs:{async query({windowId}){return windowId===91?[{id:701,url:'https://app.test/'}]:[];},async update(id,value){createdTabs.push(['update',id,value]);},async reload(id){reloads.push(id);},async create(value){createdTabs.push(['create',value]);}},
 sidePanel:{}};
 installFeatures({setEnabled(){},openWindowPanel(){},log(){}});
 const listener=chrome.runtime.onMessage.listeners[0];
 const call=m=>new Promise(resolve=>listener(m,{},resolve));
 assert.equal((await call({type:'APP_SIDECAR',url:'https://app.test/'})).ok,true);
 assert.equal(chrome.storage.session.data['atv2.sidecars']['https://app.test'],91);
 assert.equal((await call({type:'APP_SIDECAR',url:'https://app.test/',reload:true})).ok,true);
 assert.deepEqual(updates,[[91,{focused:true}]]);assert.deepEqual(reloads,[701]);
 assert.equal((await call({type:'APP_SIDECAR_RETURN',url:'https://app.test/'})).ok,true);
 assert.deepEqual(removed,[91]);assert.deepEqual(chrome.storage.session.data['atv2.sidecars'],{});
 assert.equal((await call({type:'APP_OPTIONS',section:'workspaces'})).ok,true);
 assert.deepEqual(createdTabs.at(-1),['create',{url:'chrome-extension://test/options.html#workspaces'}]);
});
