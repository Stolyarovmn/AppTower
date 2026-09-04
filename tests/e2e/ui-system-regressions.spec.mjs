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
  const server = http.createServer((request,response) => {
    const name = String(request.url || "/").replace(/^\//,"") || "root";
    response.writeHead(200,{"content-type":"text/html; charset=utf-8","cache-control":"no-store"});
    response.end(`<!doctype html><html><head><title>${name}</title></head><body><h1>${name}</h1></body></html>`);
  });
  await new Promise(resolve => server.listen(0,"127.0.0.1",resolve));
  return {server,baseUrl:`http://127.0.0.1:${server.address().port}`};
}

async function launch(profile) {
  return chromium.launchPersistentContext(profile,{
    headless:false,
    viewport:{width:1280,height:900},
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

async function openPanel(context) {
  const page = await context.newPage();
  await page.goto(extensionUrl("sidepanel/sidepanel.html"));
  await page.waitForLoadState("domcontentloaded");
  await expect(page.locator("#panel-sites")).toBeAttached();
  return page;
}

async function addCustomSite(panel,title,url,{fromHome=false}={}) {
  if (fromHome) await panel.locator("#home-add-custom").click();
  else await panel.locator("#rail-add").click();
  await expect.poll(() => isDialogOpen(panel,"#site-dialog")).toBe(true);
  await panel.locator("#clear-site").click();
  await panel.locator("#site-title").fill(title);
  await panel.locator("#site-url").fill(url);
  await panel.locator("#save-site").click();
  await expect.poll(() => isDialogOpen(panel,"#site-dialog")).toBe(false);
}

test("ATN-E2E-017 drag shows a pointer-following shortcut proxy before drop", async () => {
  const {server,baseUrl} = await startFixtureServer();
  const profile = fs.mkdtempSync(path.join(os.tmpdir(),"app-tower-ui-drag-"));
  const context = await launch(profile);

  try {
    const web = context.pages()[0] || await context.newPage();
    await web.goto(`${baseUrl}/host`);
    const panel = await openPanel(context);

    await addCustomSite(panel,"Drag A",`${baseUrl}/a`,{fromHome:true});
    await addCustomSite(panel,"Drag B",`${baseUrl}/b`);

    const sites = panel.locator("#panel-sites .rail-site");
    await expect(sites).toHaveCount(2);
    const source = sites.nth(0);
    const target = sites.nth(1);
    const sourceId = await source.getAttribute("data-shortcut-id");
    const from = await source.boundingBox();
    const to = await target.boundingBox();
    if (!from || !to) throw new Error("rail shortcut geometry unavailable");

    const startX = from.x + from.width/2;
    const startY = from.y + from.height/2;
    await panel.mouse.move(startX,startY);
    await panel.mouse.down();
    await panel.mouse.move(startX + 12,startY + 12,{steps:4});

    const proxy = panel.locator(".atn-drag-proxy");
    await expect(proxy).toBeVisible();
    await expect(proxy).toHaveAttribute("data-shortcut-id",sourceId || "");
    await expect(source).toHaveClass(/dragging/);

    const proxyBefore = await proxy.boundingBox();
    await panel.mouse.move(to.x + to.width/2,to.y + to.height/2,{steps:8});
    const proxyAfter = await proxy.boundingBox();
    expect(proxyBefore).toBeTruthy();
    expect(proxyAfter).toBeTruthy();
    expect(Math.abs((proxyAfter?.y || 0) - (proxyBefore?.y || 0))).toBeGreaterThan(10);
    await expect(target).toHaveClass(/drop-combine/);

    await panel.mouse.up();
    await expect(proxy).toHaveCount(0);
    await expect.poll(() => isDialogOpen(panel,"#combine-dialog")).toBe(true);
  } finally {
    await context.close().catch(()=>{});
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(profile,{recursive:true,force:true});
  }
});

test("ATN-E2E-018 chooser focus ring is inset and cannot be clipped", async () => {
  const {server,baseUrl} = await startFixtureServer();
  const profile = fs.mkdtempSync(path.join(os.tmpdir(),"app-tower-ui-focus-"));
  const context = await launch(profile);

  try {
    const web = context.pages()[0] || await context.newPage();
    await web.goto(`${baseUrl}/host`);
    const panel = await openPanel(context);
    await addCustomSite(panel,"Focus A",`${baseUrl}/a`,{fromHome:true});
    await addCustomSite(panel,"Focus B",`${baseUrl}/b`);

    await panel.locator("#rail-new-group").click();
    await expect.poll(() => isDialogOpen(panel,"#organize-dialog")).toBe(true);
    await panel.locator("#organize-template").click();
    await expect.poll(() => isDialogOpen(panel,"#shortcut-chooser-dialog")).toBe(true);

    const item = panel.locator(".shortcut-chooser-item").last();
    await item.focus();
    const style = await item.evaluate(element => {
      const computed = getComputedStyle(element);
      return {
        outlineStyle:computed.outlineStyle,
        outlineWidth:computed.outlineWidth,
        boxShadow:computed.boxShadow
      };
    });
    expect(style.outlineStyle === "none" || style.outlineWidth === "0px").toBe(true);
    expect(style.boxShadow).toContain("inset");
  } finally {
    await context.close().catch(()=>{});
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(profile,{recursive:true,force:true});
  }
});

test("ATN-E2E-019 Settings typography uses shared semantic font roles", async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(),"app-tower-ui-type-"));
  const context = await launch(profile);

  try {
    const options = context.pages()[0] || await context.newPage();
    await options.goto(extensionUrl("options/options.html#data"));
    await options.locator('#settings-nav button[data-section="data"]').click();
    await expect(options.locator('.page[data-page="data"]')).toHaveClass(/active/);

    const typography = await options.evaluate(() => {
      const style = selector => getComputedStyle(document.querySelector(selector));
      return {
        shell:style(".settings-shell").fontSize,
        pageTitle:style('.page[data-page="data"] h1').fontSize,
        syncTitle:style('.page[data-page="data"] .toggle b').fontSize,
        syncCopy:style('.page[data-page="data"] .toggle small').fontSize,
        generalMuted:style('.page[data-page="general"] .muted').fontSize,
        button:style('#export-data').fontSize,
        bodyToken:getComputedStyle(document.documentElement).getPropertyValue("--atn-font-body").trim(),
        secondaryToken:getComputedStyle(document.documentElement).getPropertyValue("--atn-font-secondary").trim()
      };
    });

    expect(typography.shell).toBe("14px");
    expect(typography.pageTitle).toBe("28px");
    expect(typography.syncTitle).toBe("14px");
    expect(typography.button).toBe("14px");
    expect(typography.syncCopy).toBe("13px");
    expect(typography.generalMuted).toBe("13px");
    expect(typography.bodyToken).toBe("14px");
    expect(typography.secondaryToken).toBe("13px");
  } finally {
    await context.close().catch(()=>{});
    fs.rmSync(profile,{recursive:true,force:true});
  }
});
