import test from "node:test";
import assert from "node:assert/strict";
import {createBackgroundStateCoordinator} from "../../app/shared/background-state-coordinator.js";

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

test("panel and workspace mutations for the same window share FIFO ordering", async () => {
  const coordinator = createBackgroundStateCoordinator();
  const trace = [];

  const panel = coordinator.panel(7,"close",async () => {
    trace.push("panel:start");
    await delay(20);
    trace.push("panel:end");
  });
  const workspace = coordinator.workspace(7,"save",async () => {
    trace.push("workspace:start");
    trace.push("workspace:end");
  });

  await Promise.all([panel,workspace]);
  assert.deepEqual(trace,["panel:start","panel:end","workspace:start","workspace:end"]);
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

test("a stalled browser window cannot freeze another window", async () => {
  const coordinator = createBackgroundStateCoordinator();
  let release;
  const stalled = new Promise(resolve => { release = resolve; });

  const first = coordinator.workspace(1,"stalled-save",async () => stalled);
  let windowTwoFinished = false;
  const second = coordinator.workspace(2,"save",async () => {
    windowTwoFinished = true;
    return "ok";
  });

  assert.equal(await Promise.race([second,delay(100).then(() => "timeout")]),"ok");
  assert.equal(windowTwoFinished,true);
  release();
  await first;
});

test("stalled bootstrap work cannot block shortcut state or panel actions", async () => {
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
  const second=coordinator.storage("apply-remote-sync",async()=>{
    trace.push("apply");
  });
  await Promise.all([first,second]);
  assert.deepEqual(trace,["push:start","push:end","apply"]);
});

test("diagnostics expose scoped labels and lane snapshots", async () => {
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
  assert.ok(snapshot.windows[11]);
  assert.ok(snapshot.storage["panel-action"]);
});
