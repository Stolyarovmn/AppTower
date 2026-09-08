import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {shortcutIcon} from '../ui/icons.js';
test('transparent favicon has no fallback letters underneath; failed icon restores initials',()=>{
 const dom=new JSDOM('');globalThis.document=dom.window.document;globalThis.chrome={runtime:{getURL:p=>'chrome-extension://test'+p}};
 const tile=shortcutIcon({type:'site',title:'Example',url:'https://example.test'}).firstChild;
 const img=tile.querySelector('img');assert.equal(tile.textContent,'EX');img.dispatchEvent(new dom.window.Event('load'));assert.equal(tile.textContent,'');assert.equal(tile.style.background,'transparent');assert.equal(tile.querySelector('img'),img);
 img.dispatchEvent(new dom.window.Event('error'));assert.equal(tile.textContent,'EX');assert.equal(tile.querySelector('img'),null);dom.window.close();
});
