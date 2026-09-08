import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
import {defaults} from '../core/model.js';
import {createPanes} from '../ui/panes.js';

test('open panes survive idle; parked frames reuse their document and obey LRU/idle limits',async()=>{
 const dom = new JSDOM(fs.readFileSync(new URL('../sidepanel.html',import.meta.url),'utf8'),{url:'chrome-extension://test/sidepanel.html'});
 Object.assign(globalThis,{window:dom.window,document:dom.window.document});
 globalThis.chrome={runtime:{sendMessage:async()=>({ok:true})}};
 const originalInterval=globalThis.setInterval, originalNow=Date.now;
 let sweep, now=1000; globalThis.setInterval=fn=>{sweep=fn;return 1;}; Date.now=()=>now;
 const writes=[];const descriptor=Object.getOwnPropertyDescriptor(dom.window.HTMLIFrameElement.prototype,'src');
 Object.defineProperty(dom.window.HTMLIFrameElement.prototype,'src',{get:descriptor.get,set(v){writes.push([this,v]);descriptor.set.call(this,v);}});
 try {
  const panes=createPanes(1,e=>{throw e;}),state=defaults(),w=state.workspaces[0];state.settings.backgroundLimit=2;
  const navigate=async href=>{w.panes.top.url=href;await panes.render(state,w);};
  await navigate('https://a.test/');const a=document.querySelector('.pane[data-pane="top"] iframe');
  now+=600000;sweep();assert.equal(a.src,'https://a.test/','open pane never expires');
  await navigate('https://b.test/');assert.equal(a.hidden,true);const before=writes.filter(([f])=>f===a).length;
  await navigate('https://a.test/');assert.equal(a.hidden,false);assert.equal(writes.filter(([f])=>f===a).length,before,'cache hit does not navigate');
  now++;await navigate('https://c.test/');now++;await navigate('https://d.test/');
  assert.equal(document.querySelectorAll('iframe[src]:not([src="about:blank"])').length,3,'two parked plus one protected current');
  assert.equal([...document.querySelectorAll('iframe')].some(f=>f.src==='https://b.test/'),false,'least recently used was removed');
  now+=300001;sweep();assert.equal(a.isConnected,false,'parked page expires');
  const active=document.querySelector('.pane[data-pane="top"] iframe:not([hidden])');assert.equal(active.src,'https://d.test/');
  await panes.render(state,w);assert.equal(active.src,'https://d.test/');
  state.settings.backgroundLimit=0;await navigate('https://e.test/');assert.equal(active.isConnected,false,'zero cache immediately evicts old page');
 } finally {globalThis.setInterval=originalInterval;Date.now=originalNow;dom.window.close();}
});
