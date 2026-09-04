import test from "node:test";
import assert from "node:assert/strict";
import {createBackgroundStateCoordinator} from "../../app/shared/background-state-coordinator.js";

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

test("workspace operations remain FIFO within one window", async () => {
  const coordinator = createBackgroundStateCoordinator();
  const trace = [];
  const first = coordinator.workspace(7,"first",async () => {
    trace.push("first:start");
    await delay(20);
    trace.push("first:end");
  });
  const second = coordinator.workspace(7,"second",async () => trace.push("second"));
  await Promise.all([first,second]);
  assert.deepEqual(trace,["first:start","first:end","second"]);
});

test("workspace reads wait for earlier writes in the same window", async () => {
  const coordinator = createBackgroundStateCoordinator();
  let state = "old";
  const write = coordinator.workspace(3,"update",async () => {
    await delay(15);
    state = "new";
  });
  const read = coordinator.workspaceRead(3,"get-state",async () => state);
  assert.equal(await read,"new");
  await write;
});

test("a stalled workspace save cannot freeze panel collapse in the same window", async () => {
  const coordinator = createBackgroundStateCoordinator();
  let release;
  const stalled = new Promise(resolve => { release = resolve; });
  const save = coordinator.workspace(5,"mutate-shortcuts",async () => stalled);
  const collapse = coordinator.panel(5,"close",async () => "closed");
  assert.equal(await Promise.race([collapse,delay(100).then(() => "timeout")]),"closed");
  release();
  await save;
});

test("a stalled browser window cannot freeze another window", async () => {
  const coordinator = createBackgroundStateCoordinator();
  let release;
  const stalled = new Promise(resolve => { release = resolve; });
  const first = coordinator.workspace(1,"stalled-save",async () => stalled);
  const second = coordinator.workspace(2,"save",async () => "ok");
  assert.equal(await Promise.race([second,delay(100).then(() => "timeout")]),"ok");
  release();
  await first;
});

test("stalled bootstrap work cannot block shortcut saves or panel actions", async () => {
  const coordinator = createBackgroundStateCoordinator();
  let release;
  const stalled = new Promise(resolve => { release = resolve; });
  const bootstrap = coordinator.storage("initialize-startup",async () => stalled);
  const shortcutSave = coordinator.workspace(9,"mutate-shortcuts",async () => "saved");
  const pendingAction = coordinator.storage("pending-panel-action",async () => "delivered");
  assert.equal(await Promise.race([shortcutSave,delay(100).then(() => "timeout")]),"saved");
  assert.equal(await Promise.race([pendingAction,delay(100).then(() => "timeout")]),"delivered");
  release();
  await bootstrap;
});

test("sync storage remains FIFO within its own conflict lane", async () => {
  const coordinator = createBackgroundStateCoordinator();
  const trace=[];
  const first=coordinator.storage("push-sync",async()=>{
    trace.push("push:start");
    await delay(10);
    trace.push("push:end");
  });
  const second=coordinator.storage("apply-remote-sync",async()=>trace.push("apply"));
  await Promise.all([first,second]);
  assert.deepEqual(trace,["push:start","push:end","apply"]);
});

test("diagnostics expose separate panel/workspace/storage lanes", async () => {
  const events = [];
  const coordinator = createBackgroundStateCoordinator({onEvent:event => events.push(event)});
  await coordinator.panel(11,"open",async () => undefined);
  await coordinator.workspaceRead(11,"get-state",async () => undefined);
  await coordinator.storage("pending-panel-action",async () => undefined);
  const starts = events.filter(event => event.phase === "start");
  assert.deepEqual(starts.map(event => [event.label,event.kind]),[
    ["panel:11:open","mutation"],
    ["workspace:11:get-state","read"],
    ["storage:panel-action:pending-panel-action","mutation"]
  ]);
  const snapshot=coordinator.snapshot();
  assert.equal(snapshot.pending,0);
  assert.ok(snapshot.panel[11]);
  assert.ok(snapshot.workspace[11]);
  assert.ok(snapshot.storage["panel-action"]);
});
