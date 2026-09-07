import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root=path.resolve(import.meta.dirname,"../..");
const edge=fs.readFileSync(path.join(root,"app/shared/edge-manual-gate-fixes.js"),"utf8");
const pane=fs.readFileSync(path.join(root,"app/sidepanel/pane-ui-contract.js"),"utf8");
const manifest=JSON.parse(fs.readFileSync(path.join(root,"app/manifest.json"),"utf8"));
const railStyle=fs.readFileSync(path.join(root,"app/content/rail-style-contract.js"),"utf8");

test("rail open uses window-scoped native Side Panel and suppresses duplicate injected rails",()=>{
  assert.match(edge,/sidePanel\?\.open\?\.\(\{windowId\}\)/);
  assert.doesNotMatch(edge,/sidePanel\?\.open\?\.\(\{tabId:/);
  assert.match(edge,/sidePanel\?\.onOpened/);
  assert.match(edge,/setRailsVisible\(windowId,false\)/);
});

test("pane toolbar keeps primary navigation actions and moves secondary actions behind overflow",()=>{
  for(const action of ["mode","pwa","external","focus"]) assert.match(pane,new RegExp(`data-action=\\\"${action}`));
  assert.match(pane,/atn-pane-more/);
  assert.match(pane,/atn-pane-close/);
  assert.match(pane,/toggle-split/);
});

test("invalid shortcut drag exposes a native not-allowed cursor",()=>{
  assert.match(pane,/cursor:not-allowed/);
  assert.match(pane,/atn-drag-invalid/);
  assert.match(pane,/drop-before/);
  assert.match(pane,/drop-after/);
  assert.match(pane,/drop-combine/);
});

test("compact rail loads one post-render icon contract instead of Edge-only native gear",()=>{
  const railScript=manifest.content_scripts.find(item=>item.js?.includes("content/rail.js"));
  assert.deepEqual(railScript.js,["content/rail-prelude.js","content/rail.js","content/rail-style-contract.js"]);
  assert.match(railStyle,/atnUnifiedSettings/);
  assert.match(railStyle,/settings-svg/);
});
