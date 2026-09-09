import test from "node:test";
import assert from "node:assert/strict";
import {createBackgroundStateCoordinator} from "../../app/shared/background-state-coordinator.js";

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

test("panel and workspace mutations share one FIFO queue", async () => {
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

test("workspace reads wait for earlier writes", async () => {
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

test("different windows still serialize through the global coordinator", async () => {
  const coordinator = createBackgroundStateCoordinator();
  const trace = [];

  const first = coordinator.workspace(1,"save",async () => {
    trace.push("w1:start");
    await delay(15);
    trace.push("w1:end");
  });
  const second = coordinator.workspace(2,"save",async () => {
    trace.push("w2:start");
    trace.push("w2:end");
  });

  await Promise.all([first,second]);
  assert.deepEqual(trace,["w1:start","w1:end","w2:start","w2:end"]);
});

test("diagnostics expose scoped labels for future background wiring", async () => {
  const events = [];
  const coordinator = createBackgroundStateCoordinator({onEvent:event => events.push(event)});

  await coordinator.panel(11,"open",async () => undefined);
  await coordinator.workspaceRead(11,"get-state",async () => undefined);
  await coordinator.storage("remote-sync",async () => undefined);

  const starts = events.filter(event => event.phase === "start");
  assert.deepEqual(starts.map(event => [event.label,event.kind]),[
    ["panel:11:open","mutation"],
    ["workspace:11:get-state","read"],
    ["storage:remote-sync","mutation"]
  ]);
});
