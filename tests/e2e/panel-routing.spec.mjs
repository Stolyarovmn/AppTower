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
  return {
    server,
    baseUrl:`http://127.0.0.1:${address.port}`
  };
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
  // Give the Side Panel document time to establish ATN_SIDE_PANEL:<windowId>.
  await panel.waitForTimeout(150);
  return panel;
}

async function isDialogOpen(page, selector) {
  return page.locator(selector).evaluate(element => element.open === true);
}

async function documentToken(panel) {
  return panel.evaluate(() => {
    if (!window.__atnE2eDocumentToken) {
      window.__atnE2eDocumentToken = crypto.randomUUID();
    }
    return window.__atnE2eDocumentToken;
  });
}

async function sendPanelIntent(panel, intent, extra={}) {
  return panel.evaluate(async ({intent,extra}) => {
    const currentWindow = await chrome.windows.getCurrent();
    return chrome.runtime.sendMessage({
      type:"OPEN_PANEL",
      windowId:currentWindow.id,
      intent,
      ...extra
    });
  }, {intent,extra});
}

test("ATN-E2E-009 live panel commands do not recreate the Side Panel document", async () => {
  const {server,baseUrl} = await startFixtureServer();
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "app-tower-panel-routing-"));
  const context = await launch(profile);

  try {
    const web = context.pages()[0] || await context.newPage();
    await web.goto(`${baseUrl}/routing`);
    await expect(web.locator("h1")).toHaveText("Fixture routing");

    const panel = await openPanelDocument(context);
    const token = await documentToken(panel);

    const searchResponse = await sendPanelIntent(panel, "search");
    expect(searchResponse?.ok).toBe(true);
    expect(searchResponse?.reusedPanel).toBe(true);
    await expect.poll(() => isDialogOpen(panel, "#search-dialog")).toBe(true);
    expect(await documentToken(panel)).toBe(token);
    await panel.locator("#search-close").click();
    await expect.poll(() => isDialogOpen(panel, "#search-dialog")).toBe(false);

    const organizeResponse = await sendPanelIntent(panel, "organize");
    expect(organizeResponse?.ok).toBe(true);
    expect(organizeResponse?.reusedPanel).toBe(true);
    await expect.poll(() => isDialogOpen(panel, "#organize-dialog")).toBe(true);
    expect(await documentToken(panel)).toBe(token);
    await panel.locator("#organize-dialog button[value=cancel]").click();
    await expect.poll(() => isDialogOpen(panel, "#organize-dialog")).toBe(false);

    const addResponse = await sendPanelIntent(panel, "add", {
      sourceUrl:`${baseUrl}/routing`,
      sourceTitle:"Fixture routing"
    });
    expect(addResponse?.ok).toBe(true);
    expect(addResponse?.reusedPanel).toBe(true);
    await expect.poll(() => isDialogOpen(panel, "#site-dialog")).toBe(true);
    await expect(panel.locator("#site-url")).toHaveValue(`${baseUrl}/routing`);
    expect(await documentToken(panel)).toBe(token);
    await panel.locator("#site-dialog button[value=cancel]").click();
    await expect.poll(() => isDialogOpen(panel, "#site-dialog")).toBe(false);
  } finally {
    await context.close().catch(() => {});
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(profile, {recursive:true,force:true});
  }
});

test("ATN-E2E-010 empty workspace remains usable after browser restart", async () => {
  const {server,baseUrl} = await startFixtureServer();
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "app-tower-empty-restart-"));
  let context = await launch(profile);

  try {
    let web = context.pages()[0] || await context.newPage();
    await web.goto(`${baseUrl}/before-restart`);
    let panel = await openPanelDocument(context);
    await expect(panel.locator("#home-view")).toBeVisible();
    await expect(panel.locator("#panel-sites .rail-site")).toHaveCount(0);

    await panel.close();
    await context.close();
    context = null;

    context = await launch(profile);
    web = context.pages()[0] || await context.newPage();
    await web.goto(`${baseUrl}/after-restart`);
    await expect(web.locator("h1")).toHaveText("Fixture after-restart");

    panel = await openPanelDocument(context);
    await expect(panel.locator("#home-view")).toBeVisible();
    await expect(panel.locator("#panel-sites .rail-site")).toHaveCount(0);

    await panel.locator("#home-add-current").click();
    await expect.poll(() => isDialogOpen(panel, "#site-dialog")).toBe(true);
    await expect(panel.locator("#site-url")).toHaveValue(`${baseUrl}/after-restart`);
    await panel.locator("#site-title").fill("After restart");
    await panel.locator("#save-site").click();
    await expect.poll(() => isDialogOpen(panel, "#site-dialog")).toBe(false);
    await expect(panel.locator("#panel-sites .rail-site")).toHaveCount(1);
  } finally {
    await context?.close().catch(() => {});
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(profile, {recursive:true,force:true});
  }
});
