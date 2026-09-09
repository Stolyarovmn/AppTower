import test from "node:test";
import assert from "node:assert/strict";
import {createBackgroundStateCoordinator} from "../../app/shared/background-state-coordinator.js";
import {createPanelStateStore} from "../../app/shared/panel-state-store.js";

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

function fixture() {
  const coordinator = createBackgroundStateCoordinator();
  const openWindows = new Set();
  const collapsedWindows = new Set();
  const trace = [];
  const store = createPanelStateStore({
    coordinator,
    openWindows,
    collapsedWindows,
    persistOpen:async () => { trace.push(`persist-open:${[...openWindows].join(",")}`); await delay(5); },
    persistCollapsed:async () => { trace.push(`persist-collapsed:${[...collapsedWindows].join(",")}`); await delay(5); },
    broadcastRail:async (windowId, visible) => { trace.push(`rail:${windowId}:${visible}`); },
    clearWindowResources:async windowId => { trace.push(`clear:${windowId}`); },
    cancelPendingDisconnect:async windowId => { trace.push(`cancel-disconnect:${windowId}`); }
  });
  return {store,openWindows,collapsedWindows,trace};
}

test("rapid open/close transitions commit in FIFO order", async () => {
  const {store,openWindows,collapsedWindows,trace} = fixture();

  await Promise.all([
    store.open(7,{authoritative:true}),
    store.close(7,{collapsed:true}),
    store.open(7,{authoritative:true})
  ]);

  assert.equal(openWindows.has(7),true);
  assert.equal(collapsedWindows.has(7),false);
  assert.deepEqual(trace,[
    "cancel-disconnect:7",
    "persist-open:7",
    "rail:7:false",
    "cancel-disconnect:7",
    "clear:7",
    "persist-open:",
    "persist-collapsed:7",
    "rail:7:true",
    "persist-collapsed:",
    "cancel-disconnect:7",
    "persist-open:7",
    "rail:7:false"
  ]);
});

test("non-authoritative open cannot override collapsed state", async () => {
  const {store,openWindows,collapsedWindows,trace} = fixture();
  collapsedWindows.add(9);

  const result = await store.open(9);

  assert.deepEqual(result,{changed:false,reason:"collapsed"});
  assert.equal(openWindows.has(9),false);
  assert.equal(collapsedWindows.has(9),true);
  assert.deepEqual(trace,[]);
});

test("duplicate open avoids duplicate persistence but still repairs rail visibility", async () => {
  const {store,openWindows,trace} = fixture();
  openWindows.add(3);

  const result = await store.open(3,{authoritative:true});

  assert.equal(result.changed,false);
  assert.deepEqual(trace,["cancel-disconnect:3","rail:3:false"]);
});

test("window removal clears both state sets inside one serialized mutation", async () => {
  const {store,openWindows,collapsedWindows,trace} = fixture();
  openWindows.add(4);
  collapsedWindows.add(4);

  const result = await store.removeWindow(4);

  assert.equal(result.changed,true);
  assert.equal(openWindows.has(4),false);
  assert.equal(collapsedWindows.has(4),false);
  assert.deepEqual(trace,["cancel-disconnect:4","clear:4","persist-open:","persist-collapsed:"]);
});

test("close cancels pending reconnect inference before mutating visible state", async () => {
  const {store,openWindows,collapsedWindows,trace} = fixture();
  openWindows.add(12);

  await store.close(12,{collapsed:true});

  assert.deepEqual(trace,[
    "cancel-disconnect:12",
    "clear:12",
    "persist-open:",
    "persist-collapsed:12",
    "rail:12:true"
  ]);
  assert.equal(openWindows.has(12),false);
  assert.equal(collapsedWindows.has(12),true);
});
