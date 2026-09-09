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
const extensionUrl = file => `chrome-extension://${extensionId}/${file}`;

async function startFixtureServer() {
  const server = http.createServer((request, response) => {
    response.writeHead(200, {"content-type":"text/html; charset=utf-8","cache-control":"no-store"});
    response.end("<!doctype html><html><head><title>TASK2 routing fixture</title></head><body><h1>TASK2</h1></body></html>");
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  return {server,baseUrl:`http://127.0.0.1:${server.address().port}`};
}

async function launch(profile) {
  return chromium.launchPersistentContext(profile, {
    headless:false,
    viewport:{width:1440,height:1000},
    args:[
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      "--disable-features=Translate"
    ]
  });
}

async function isDialogOpen(page, selector) {
  return page.locator(selector).evaluate(element => element.open === true);
}

test("ATN-E2E-013 background routes live panel actions without reopening the panel document", async () => {
  const {server,baseUrl} = await startFixtureServer();
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "app-tower-task2-routing-"));
  const context = await launch(profile);

  try {
    const web = context.pages()[0] || await context.newPage();
    await web.goto(`${baseUrl}/current`);

    const panel = await context.newPage();
    await panel.goto(extensionUrl("sidepanel/sidepanel.html"));
    await panel.waitForLoadState("domcontentloaded");
    await expect(panel.locator("#panel-sites")).toBeAttached();
    await panel.waitForTimeout(200);

    const token = await panel.evaluate(() => {
      window.__atnTask2DocumentToken = crypto.randomUUID();
      return window.__atnTask2DocumentToken;
    });

    const searchResponse = await panel.evaluate(async () => {
      const currentWindow = await chrome.windows.getCurrent();
      return chrome.runtime.sendMessage({
        type:"OPEN_PANEL",
        windowId:currentWindow.id,
        intent:"search"
      });
    });
    expect(searchResponse?.ok).toBe(true);
    expect(searchResponse?.reusedPanel).toBe(true);
    await expect.poll(() => isDialogOpen(panel,"#search-dialog")).toBe(true);
    expect(await panel.evaluate(() => window.__atnTask2DocumentToken)).toBe(token);
    await panel.locator("#search-close").click();

    const addResponse = await panel.evaluate(async ({url}) => {
      const currentWindow = await chrome.windows.getCurrent();
      return chrome.runtime.sendMessage({
        type:"OPEN_PANEL",
        windowId:currentWindow.id,
        intent:"add",
        sourceUrl:url,
        sourceTitle:"TASK2 routing fixture"
      });
    }, {url:`${baseUrl}/current`});
    expect(addResponse?.ok).toBe(true);
    expect(addResponse?.reusedPanel).toBe(true);
    await expect.poll(() => isDialogOpen(panel,"#site-dialog")).toBe(true);
    await expect(panel.locator("#site-url")).toHaveValue(`${baseUrl}/current`);
    expect(await panel.evaluate(() => window.__atnTask2DocumentToken)).toBe(token);
    await panel.locator("#cancel-site").click();

    const diagnostics = await panel.evaluate(() =>
      chrome.runtime.sendMessage({type:"GET_STATE_COORDINATOR_DIAGNOSTICS"})
    );
    expect(diagnostics?.ok).toBe(true);
    expect(diagnostics?.pending).toBe(0);
    expect(diagnostics?.active).toBeNull();
  } finally {
    await context.close().catch(() => {});
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(profile,{recursive:true,force:true});
  }
});
