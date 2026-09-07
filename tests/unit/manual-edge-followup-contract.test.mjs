import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root=path.resolve(import.meta.dirname,"../..");
const adapter=fs.readFileSync(path.join(root,"app/shared/browser-adapter.js"),"utf8");
const entry=fs.readFileSync(path.join(root,"app/background-entry.js"),"utf8");
const pane=fs.readFileSync(path.join(root,"app/sidepanel/pane-ui-contract.js"),"utf8");
const rail=fs.readFileSync(path.join(root,"app/content/rail.js"),"utf8");
const manifest=JSON.parse(fs.readFileSync(path.join(root,"app/manifest.json"),"utf8"));

test("native Side Panel lifecycle is window-scoped and never reopens by tab",()=>{
  assert.match(adapter,/sidePanel\.open\(\{windowId:numericWindowId\}\)/);
  assert.doesNotMatch(adapter,/sidePanel\.open\(\{tabId:/);
  assert.doesNotMatch(adapter,/setOptions\(\{tabId:/);
  assert.match(adapter,/setOptions\(\{enabled:false\}\)/);
  assert.doesNotMatch(entry,/edge-manual-gate-fixes/);
});

test("pane toolbar keeps secondary actions behind one compact overflow control",()=>{
  for(const action of ["mode","pwa","external","focus"]) assert.match(pane,new RegExp(`data-action=\\\"${action}`));
  assert.match(pane,/atn-pane-more/);
  assert.match(pane,/atn-pane-close/);
  assert.match(pane,/width:30px/);
  assert.match(pane,/#workspace\[data-layout="split"\]/);
  assert.match(pane,/background:transparent!important/);
});

test("invalid shortcut drag exposes a native not-allowed cursor",()=>{
  assert.match(pane,/cursor:not-allowed/);
  assert.match(pane,/atn-drag-invalid/);
  assert.match(pane,/drop-before/);
  assert.match(pane,/drop-after/);
  assert.match(pane,/drop-combine/);
});

test("compact rail has one source implementation and no post-render icon patch",()=>{
  const railScript=manifest.content_scripts.find(item=>item.js?.includes("content/rail.js"));
  assert.deepEqual(railScript.js,["content/rail.js"]);
  assert.match(rail,/kind===\"settings\"/);
  assert.match(rail,/Segoe Fluent Icons/);
  assert.doesNotMatch(JSON.stringify(manifest),/rail-style-contract|rail-prelude/);
});
