import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
test('options CSS separates label/control and standalone section actions',()=>{
 const css=fs.readFileSync(new URL('../options.css',import.meta.url),'utf8');
 const dom=new JSDOM(`<style>${css}</style><main class="options-main"><div id="content"><button>First</button><button>Second</button><div class="setting-row"><label>Theme<select><option>System</option></select></label></div></div></main>`);
 const style=selector=>dom.window.getComputedStyle(dom.window.document.querySelector(selector));
 assert.equal(style('#content').gap,'16px');assert.equal(style('#content').flexDirection,'column');
 assert.equal(style('.setting-row label').gap,'16px');assert.equal(style('.setting-row label').display,'flex');
 dom.window.close();
});
