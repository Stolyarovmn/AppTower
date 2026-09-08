import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
import {defaults,reduce} from '../core/model.js';
test('settings sections render semantic icons and module switch saves enabled state',async()=>{
 const d=new JSDOM(fs.readFileSync(new URL('../options.html',import.meta.url),'utf8'),{url:'chrome-extension://test/options.html#modules'});
 Object.assign(globalThis,{document:d.window.document,window:d.window,location:d.window.location});let state=defaults();
 globalThis.chrome={runtime:{getURL:p=>'chrome-extension://test'+p,sendMessage:async m=>{if(m.type==='APP_MUTATE')state=reduce(state,m.action);return {ok:true,state};}},storage:{onChanged:{addListener(){}}}};
 await import('../options.js');
 assert.equal(document.querySelectorAll('.nav-group').length,4);
 const toggle=document.querySelector('[role="switch"]');assert.ok(toggle);assert.equal(toggle.checked,false);toggle.checked=true;toggle.dispatchEvent(new d.window.Event('change'));
 for(let i=0;i<6;i++)await Promise.resolve();assert.equal(state.modules.find(m=>m.type==='youtube').enabled,true);assert.ok(document.querySelector('[data-section="data"] svg'));d.window.close();
});
