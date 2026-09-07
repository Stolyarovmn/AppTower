import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
test('rail reserves 48px, moves fixed right control, and restores original site styles',()=>{
 const dom=new JSDOM('<html style="width:100%"><body><button id="fixed" style="position:fixed;right:8px">Menu</button></body></html>',{runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;Object.defineProperty(w,'innerWidth',{value:1000});const b=w.document.getElementById('fixed');b.getBoundingClientRect=()=>({left:952,right:992,width:40,height:40});
 const original=w.getComputedStyle.bind(w);w.getComputedStyle=node=>{const s=original(node);return new Proxy(s,{get(target,key){if(['transform','filter','perspective'].includes(key))return target[key]||'none';return target[key];}});};
 w.eval(fs.readFileSync(new URL('../page-space.js',import.meta.url),'utf8'));w.__atv2PageSpace.setVisible(true);
 assert.equal(w.document.documentElement.style.width,'calc(100% - 48px)');assert.equal(b.style.right,'56px');
 w.__atv2PageSpace.setVisible(true);assert.equal(b.style.right,'56px','repeated show is not cumulative');
 w.__atv2PageSpace.setVisible(false);assert.equal(w.document.documentElement.style.width,'100%');assert.equal(b.style.right,'8px');assert.equal(w.document.body.style.maxWidth,'');dom.window.close();
});
