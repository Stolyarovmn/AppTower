import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname,"../..");
const source = fs.readFileSync(path.join(root,"app/background.js"),"utf8");

test("background routes Side Panel port lifecycle through the shared lifecycle controller", () => {
  assert.match(source,/createPanelLifecycleController/);
  assert.match(source,/panelLifecycleController\.connected\(windowId\)/);
  assert.match(source,/panelLifecycleController\.disconnected\(windowId\)/);
  assert.match(source,/panelLifecycleController\.removed\(windowId\)/);
  assert.doesNotMatch(source,/panelClosedAt/);
  assert.doesNotMatch(source,/const oldTimer = panelDisconnectTimers\.get\(windowId\)/);
  assert.doesNotMatch(source,/panelStateStore\.removeWindow\(windowId\)/);
});
