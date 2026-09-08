import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {checkPermissions} from '../tools/check-permissions.mjs';
const manifest=JSON.parse(fs.readFileSync(new URL('../manifest.json',import.meta.url)));
const budget=JSON.parse(fs.readFileSync(new URL('../tools/permission-budget.json',import.meta.url)));
test('current manifest fits documented permission budget',()=>assert.deepEqual(checkPermissions(manifest,budget),[]));
for(const [name,mutate] of [
 ['new required',m=>m.permissions.push('history')],
 ['new optional',m=>m.optional_permissions.push('bookmarks')],
 ['optional promoted to required',m=>m.permissions.push('contentSettings')],
 ['host scope broadened',m=>m.host_permissions.push('<all_urls>')],
 ['optional host added',m=>m.optional_host_permissions=['https://extra.test/*']],
 ['content script scope broadened',m=>m.content_scripts[0].matches.push('<all_urls>')],
 ['all frames enabled',m=>m.content_scripts[0].all_frames=true],
 ['inherited origin enabled',m=>m.content_scripts[0].match_origin_as_fallback=true],
 ['page main world enabled',m=>m.content_scripts[0].world='MAIN']
])test(`budget rejects ${name}`,()=>{const m=structuredClone(manifest);mutate(m);assert.ok(checkPermissions(m,budget).length);});
test('removing permissions is allowed',()=>{const m=structuredClone(manifest);m.permissions=[];m.host_permissions=[];assert.deepEqual(checkPermissions(m,budget),[]);});
test('budget requires a rationale',()=>{const b=structuredClone(budget);b.permissions.storage='';assert.ok(checkPermissions(manifest,b).length);});
