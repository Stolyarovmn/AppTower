import {test, expect, chromium} from "@playwright/test";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const extensionPath = path.join(repoRoot, "app");
const manifest = JSON.parse(fs.readFileSync(path.join(extensionPath, "manifest.json"), "utf8"));

function extensionIdFromManifestKey(key) {
  const digest = crypto.createHash("sha256").update(Buffer.from(key, "base64")).digest().subarray(0, 16);
  const alphabet = "abcdefghijklmnop";
  return [...digest].map(byte => alphabet[byte >> 4] + alphabet[byte & 15]).join("");
}

const extensionId = extensionIdFromManifestKey(manifest.key);

test("ATN-E2E-000 background resolves a normal current web tab", async () => {
  const server = http.createServer((request, response) => {
    response.writeHead(200, {"content-type":"text/html; charset=utf-8","cache-control":"no-store"});
    response.end("<!doctype html><title>Current Tab Fixture</title><h1>fixture</h1>");
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const fixtureUrl = `http://127.0.0.1:${address.port}/current`;
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "app-tower-tab-source-"));

  const context = await chromium.launchPersistentContext(profile, {
    headless:false,
    args:[
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      "--disable-features=Translate"
    ]
  });

  try {
    const web = context.pages()[0] || await context.newPage();
    await web.goto(fixtureUrl);
    await expect(web.locator("h1")).toHaveText("fixture");

    const extension = await context.newPage();
    await extension.goto(`chrome-extension://${extensionId}/sidepanel/sidepanel.html`);
    await extension.waitForLoadState("domcontentloaded");

    const diagnostics = await extension.evaluate(async expectedUrl => {
      const currentWindow = await chrome.windows.getCurrent({populate:true});
      const allTabs = await chrome.tabs.query({});
      const response = await chrome.runtime.sendMessage({
        type:"GET_CURRENT_TAB",
        windowId:currentWindow.id
      });
      return {
        expectedUrl,
        currentWindowId:currentWindow.id,
        windowTabs:(currentWindow.tabs || []).map(tab => ({
          id:tab.id,
          windowId:tab.windowId,
          active:tab.active,
          url:tab.url || null,
          title:tab.title || null,
          lastAccessed:tab.lastAccessed || 0
        })),
        allTabs:allTabs.map(tab => ({
          id:tab.id,
          windowId:tab.windowId,
          active:tab.active,
          url:tab.url || null,
          title:tab.title || null,
          lastAccessed:tab.lastAccessed || 0
        })),
        response
      };
    }, fixtureUrl);

    console.log("ATN current-tab diagnostics:", JSON.stringify(diagnostics));
    expect(
      diagnostics.response?.tab?.url,
      `GET_CURRENT_TAB diagnostics: ${JSON.stringify(diagnostics)}`
    ).toBe(fixtureUrl);
  } finally {
    await context.close().catch(() => {});
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(profile, {recursive:true,force:true});
  }
});
