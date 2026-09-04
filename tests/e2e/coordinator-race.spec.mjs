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
    const name = String(request.url || "/").replace(/^\//, "") || "root";
    response.writeHead(200, {
      "content-type":"text/html; charset=utf-8",
      "cache-control":"no-store"
    });
    response.end(`<!doctype html><html><head><title>Fixture ${name}</title></head><body><h1>Fixture ${name}</h1></body></html>`);
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  return {server, baseUrl:`http://127.0.0.1:${address.port}`};
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

async function openPanelDocument(context) {
  const panel = await context.newPage();
  await panel.goto(extensionUrl("sidepanel/sidepanel.html"));
  await panel.waitForLoadState("domcontentloaded");
  await expect(panel.locator("#panel-sites")).toBeAttached();
  await panel.waitForTimeout(150);
  return panel;
}

async function isDialogOpen(page, selector) {
  return page.locator(selector).evaluate(element => element.open === true);
}

async function documentToken(panel) {
  return panel.evaluate(() => {
    if (!window.__atnCoordinatorRaceDocumentToken) {
      window.__atnCoordinatorRaceDocumentToken = crypto.randomUUID();
    }
    return window.__atnCoordinatorRaceDocumentToken;
  });
}

async function deliverIntent(panel, intent, extra={}) {
  const response = await panel.evaluate(async ({intent,extra}) => {
    const currentWindow = await chrome.windows.getCurrent();
    return chrome.runtime.sendMessage({
      type:"OPEN_PANEL",
      windowId:currentWindow.id,
      intent,
      ...extra
    });
  }, {intent,extra});
  expect(response?.ok).toBe(true);
  expect(response?.reusedPanel).toBe(true);
  return response;
}

async function railHidden(web) {
  return web.evaluate(() => {
    const host = document.getElementById("app-tower-next-host");
    return Boolean(host?.classList.contains("app-tower-next-hidden"));
  });
}

test("ATN-E2E-012 rapid intents and panel reconnect keep one logical state", async () => {
  const {server,baseUrl} = await startFixtureServer();
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "app-tower-coordinator-race-"));
  const context = await launch(profile);

  try {
    const web = context.pages()[0] || await context.newPage();
    await web.goto(`${baseUrl}/race`);
    await expect(web.locator("h1")).toHaveText("Fixture race");

    const panel = await openPanelDocument(context);
    await expect.poll(() => railHidden(web)).toBe(true);
    const tokenBeforeReconnect = await documentToken(panel);

    for (let iteration = 0; iteration < 3; iteration += 1) {
      await deliverIntent(panel, "search");
      await expect.poll(() => isDialogOpen(panel, "#search-dialog")).toBe(true);
      await panel.locator("#search-close").click();
      await expect.poll(() => isDialogOpen(panel, "#search-dialog")).toBe(false);

      await deliverIntent(panel, "organize");
      await expect.poll(() => isDialogOpen(panel, "#organize-dialog")).toBe(true);
      await panel.locator("#organize-dialog button[value=cancel]").click();
      await expect.poll(() => isDialogOpen(panel, "#organize-dialog")).toBe(false);
    }

    await deliverIntent(panel, "add", {
      sourceUrl:`${baseUrl}/race`,
      sourceTitle:"Fixture race"
    });
    await expect.poll(() => isDialogOpen(panel, "#site-dialog")).toBe(true);
    await expect(panel.locator("#site-url")).toHaveValue(`${baseUrl}/race`);
    await panel.locator("#site-title").fill("Race fixture");
    await panel.locator("#save-site").click();
    await expect.poll(() => isDialogOpen(panel, "#site-dialog")).toBe(false);
    await expect(panel.locator("#panel-sites .rail-site")).toHaveCount(1);

    // Reloading the live panel recreates its document and runtime Port without
    // pretending that an ordinary extension tab can synthesize Chromium's
    // native sidePanel.onClosed/onOpened lifecycle events. The rail must stay
    // hidden throughout this reconnect and persisted logical state must survive.
    await panel.reload();
    await panel.waitForLoadState("domcontentloaded");
    await expect(panel.locator("#panel-sites")).toBeAttached();
    await expect.poll(() => railHidden(web)).toBe(true);
    await panel.waitForTimeout(200);
    const tokenAfterReconnect = await documentToken(panel);
    expect(tokenAfterReconnect).not.toBe(tokenBeforeReconnect);
    await expect(panel.locator("#panel-sites .rail-site")).toHaveCount(1);

    await deliverIntent(panel, "search");
    await expect.poll(() => isDialogOpen(panel, "#search-dialog")).toBe(true);
    await panel.locator("#search-close").click();
    await expect.poll(() => isDialogOpen(panel, "#search-dialog")).toBe(false);
    await expect(panel.locator("#panel-sites .rail-site")).toHaveCount(1);
  } finally {
    await context.close().catch(() => {});
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(profile, {recursive:true,force:true});
  }
});