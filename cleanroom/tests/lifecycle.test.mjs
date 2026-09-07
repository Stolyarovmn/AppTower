import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {PHASE,createWindowLifecycle,railVisible,reduceLifecycle} from "../lifecycle.js";

const root=path.resolve(import.meta.dirname,"..");
const background=fs.readFileSync(path.join(root,"background.js"),"utf8");
const html=fs.readFileSync(path.join(root,"sidepanel.html"),"utf8");
const css=fs.readFileSync(path.join(root,"sidepanel.css"),"utf8");
const manifest=JSON.parse(fs.readFileSync(path.join(root,"manifest.json"),"utf8"));

test("unknown settles to collapsed and rail visibility is derived from lifecycle",()=>{
  let state=createWindowLifecycle();
  assert.equal(state.phase,PHASE.UNKNOWN);
  assert.equal(railVisible(state),false);
  state=reduceLifecycle(state,{type:"ASSUME_COLLAPSED"});
  assert.equal(state.phase,PHASE.COLLAPSED);
  assert.equal(railVisible(state),true);
  state=reduceLifecycle(state,{type:"OPEN_REQUEST"});
  assert.equal(state.phase,PHASE.OPENING);
  assert.equal(railVisible(state),false);
  state=reduceLifecycle(state,{type:"PANEL_OPENED"});
  assert.equal(state.phase,PHASE.EXPANDED);
  assert.equal(railVisible(state),false);
  state=reduceLifecycle(state,{type:"CLOSE_REQUEST"});
  assert.equal(state.phase,PHASE.CLOSING);
  assert.equal(railVisible(state),false);
  state=reduceLifecycle(state,{type:"PANEL_CLOSED"});
  assert.equal(state.phase,PHASE.COLLAPSED);
  assert.equal(railVisible(state),true);
});

test("search/add are pending commands, never lifecycle phases",()=>{
  let state=reduceLifecycle(createWindowLifecycle(),{type:"QUEUE_COMMAND",command:{type:"search"}});
  assert.equal(state.phase,PHASE.UNKNOWN);
  assert.deepEqual(state.pendingCommand,{type:"search"});
  state=reduceLifecycle(state,{type:"OPEN_REQUEST",command:state.pendingCommand});
  assert.equal(state.phase,PHASE.OPENING);
  assert.deepEqual(state.pendingCommand,{type:"search"});
  state=reduceLifecycle(state,{type:"PANEL_CONNECTED"});
  state=reduceLifecycle(state,{type:"CONSUME_COMMAND"});
  assert.equal(state.phase,PHASE.EXPANDED);
  assert.equal(state.pendingCommand,null);
});

test("cleanroom native Side Panel is window-scoped only",()=>{
  assert.match(background,/sidePanel\.open\(\{windowId\}\)/);
  assert.match(background,/sidePanel\.close\(\{windowId\}\)/);
  assert.doesNotMatch(background,/sidePanel\.setOptions/);
  assert.doesNotMatch(background,/sidePanel\.open\(\{tabId/);
  assert.doesNotMatch(background,/sidePanel\.close\(\{tabId/);
});

test("cleanroom manifest cannot inherit the fixed legacy extension id",()=>{
  assert.equal(Object.hasOwn(manifest,"key"),false);
});

test("single-pane UI has no active-dot control and close X is split-only",()=>{
  assert.doesNotMatch(html,/pane-select/);
  assert.doesNotMatch(html,/class="dot"/);
  assert.match(css,/\.pane\.active \.pane-toolbar::before/);
  assert.match(css,/\.pane-close\{display:none\}/);
  assert.match(css,/\.panes\[data-layout="split"\] \.pane-close\{display:grid\}/);
});

test("pane toolbar has one compact icon language",()=>{
  assert.match(css,/\.icon-button\{width:30px;height:30px/);
  assert.match(css,/stroke-width:1\.55/);
  assert.doesNotMatch(css,/Segoe Fluent Icons|Segoe MDL2 Assets/);
});
