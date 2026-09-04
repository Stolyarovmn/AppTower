import test from "node:test";
import assert from "node:assert/strict";
import {createPanelLifecycleController} from "../../app/shared/panel-lifecycle-controller.js";

function createHarness({native=false, lastClosedAt=0, now=5000} = {}) {
  const calls = [];
  const panelPorts = new Map();
  const disconnectTimers = new Map();
  const scheduled = [];
  const cleared = [];
  let nextTimer = 1;

  const panelStateStore = {
    lastClosedAt: () => lastClosedAt,
    async open(windowId, options) {
      calls.push(["open", windowId, options || {}]);
      return {changed:true};
    },
    async close(windowId, options) {
      calls.push(["close", windowId, options || {}]);
      return {changed:true};
    },
    async removeWindow(windowId) {
      calls.push(["remove", windowId]);
      return {changed:true};
    }
  };

  const controller = createPanelLifecycleController({
    panelStateStore,
    panelPorts,
    disconnectTimers,
    hasNativePanelClosedEvent:native,
    now:() => now,
    setTimer(fn, delay) {
      const handle = nextTimer++;
      scheduled.push({handle, fn, delay});
      return handle;
    },
    clearTimer(handle) { cleared.push(handle); }
  });

  return {controller, panelPorts, disconnectTimers, calls, scheduled, cleared};
}

test("legacy disconnect waits for reconnect window before serialized close", async () => {
  const h = createHarness();
  assert.equal(h.controller.disconnected(7), true);
  assert.equal(h.scheduled.length, 1);
  assert.equal(h.scheduled[0].delay, 900);
  assert.equal(h.calls.length, 0);

  await h.scheduled[0].fn();
  await Promise.resolve();
  assert.deepEqual(h.calls, [["close", 7, {collapsed:true}]]);
  assert.equal(h.disconnectTimers.has(7), false);
});

test("reconnect cancels pending disconnect before opening panel state", async () => {
  const h = createHarness();
  h.controller.disconnected(4);
  const handle = h.scheduled[0].handle;

  await h.controller.connected(4);
  assert.deepEqual(h.cleared, [handle]);
  assert.equal(h.disconnectTimers.has(4), false);
  assert.deepEqual(h.calls, [["open", 4, {}]]);
});

test("native onClosed mode never infers close from Port disconnect", () => {
  const h = createHarness({native:true});
  assert.equal(h.controller.disconnected(3), false);
  assert.equal(h.scheduled.length, 0);
  assert.equal(h.calls.length, 0);
});

test("native reconnect inside close cooldown cannot reopen panel", async () => {
  const h = createHarness({native:true, lastClosedAt:4500, now:5000});
  const result = await h.controller.connected(8);
  assert.deepEqual(result, {changed:false, reason:"close-cooldown"});
  assert.equal(h.calls.length, 0);
});

test("native reconnect after cooldown performs authoritative open", async () => {
  const h = createHarness({native:true, lastClosedAt:3000, now:5000});
  await h.controller.connected(8);
  assert.deepEqual(h.calls, [["open", 8, {authoritative:true}]]);
});

test("window removal cancels pending disconnect before serialized removal", async () => {
  const h = createHarness();
  h.controller.disconnected(12);
  const handle = h.scheduled[0].handle;

  await h.controller.removed(12);
  assert.deepEqual(h.cleared, [handle]);
  assert.deepEqual(h.calls, [["remove", 12]]);
  assert.equal(h.disconnectTimers.has(12), false);
});
