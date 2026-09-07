import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname,"../..");
const backgroundEntry = fs.readFileSync(path.join(root,"app/background-entry.js"),"utf8");
const background = fs.readFileSync(path.join(root,"app/background.js"),"utf8");
const adapter = fs.readFileSync(path.join(root,"app/shared/browser-adapter.js"),"utf8");
const dialogSystem = fs.readFileSync(path.join(root,"app/sidepanel/dialog-system.js"),"utf8");
const sidepanelFixes = fs.readFileSync(path.join(root,"app/sidepanel/manual-gate-fixes.js"),"utf8");

test("native Edge lifecycle has one owner and remains window scoped", () => {
  assert.doesNotMatch(backgroundEntry,/edge-manual-gate-fixes\.js/);
  assert.match(background,/chrome\.sidePanel\.onOpened/);
  assert.match(background,/chrome\.sidePanel\.onClosed/);
  assert.match(background,/broadcastRail\(windowId, visible\)/);
  assert.match(adapter,/sidePanel\.open\(\{windowId:numericWindowId\}\)/);
  assert.doesNotMatch(adapter,/sidePanel\.open\(\{tabId:/);
  assert.doesNotMatch(adapter,/setOptions\(\{tabId:/);
});

test("expanded Add Current Page uses the active browser tab", () => {
  assert.match(dialogSystem,/manual-gate-fixes\.js/);
  assert.match(sidepanelFixes,/GET_CURRENT_TAB/);
  assert.match(sidepanelFixes,/#rail-add,#home-add-current/);
  assert.match(sidepanelFixes,/sourceUrl:url/);
  assert.match(sidepanelFixes,/sourceTitle:String\(response\?\.tab\?\.title/);
});

test("visible panes are foreground resources and cannot idle-sleep", () => {
  assert.match(sidepanelFixes,/message\?\.type === "PANE_LIVE"/);
  assert.match(sidepanelFixes,/keepAlive:true,foreground:true/);
  assert.match(sidepanelFixes,/reprotectVisiblePanes/);
  assert.match(sidepanelFixes,/getClientRects\(\)\.length === 0/);
});

test("drag preview is forced to the left of the pointer", () => {
  assert.match(sidepanelFixes,/translate\(calc\(-100% - 16px\),-50%\)/);
});
