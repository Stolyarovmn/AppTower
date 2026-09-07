import test from "node:test";
import assert from "node:assert/strict";
import {collapseTargetForUrl} from "../../app/shared/collapse-handoff.js";

test("normal http pages can hand off to the injected compact rail", () => {
  assert.equal(collapseTargetForUrl("https://example.com/a","chrome-extension://id/newtab/newtab.html"),"content");
  assert.equal(collapseTargetForUrl("http://127.0.0.1:8080/","chrome-extension://id/newtab/newtab.html"),"content");
});

test("App Tower new tab can hand off to its built-in rail", () => {
  const newTab = "chrome-extension://id/newtab/newtab.html";
  assert.equal(collapseTargetForUrl(newTab,newTab),"newtab");
  assert.equal(collapseTargetForUrl(`${newTab}#home`,newTab),"newtab");
});

test("privileged browser pages are rejected instead of making App Tower disappear", () => {
  const newTab = "chrome-extension://id/newtab/newtab.html";
  assert.equal(collapseTargetForUrl("edge://settings/help",newTab),"unsupported");
  assert.equal(collapseTargetForUrl("chrome://extensions/",newTab),"unsupported");
  assert.equal(collapseTargetForUrl("chrome-extension://id/options/options.html",newTab),"unsupported");
});
