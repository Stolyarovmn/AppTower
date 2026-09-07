import test from "node:test";
import assert from "node:assert/strict";
import {resolvePanelHostWindowId} from "../../app/shared/panel-host.js";

test("native Side Panel without hostWindowId uses the real current window", () => {
  assert.equal(resolvePanelHostWindowId({search:"",currentWindowId:73}),73);
  assert.equal(resolvePanelHostWindowId({search:"?foo=bar",currentWindowId:73}),73);
});

test("sidecar may provide an explicit host window", () => {
  assert.equal(resolvePanelHostWindowId({search:"?sidecar=1&hostWindowId=91",currentWindowId:73}),91);
});

test("empty or malformed hostWindowId never becomes window 0", () => {
  assert.equal(resolvePanelHostWindowId({search:"?hostWindowId=",currentWindowId:73}),73);
  assert.equal(resolvePanelHostWindowId({search:"?hostWindowId=current",currentWindowId:73}),73);
  assert.equal(resolvePanelHostWindowId({search:"?hostWindowId=nope",currentWindowId:73}),73);
});
