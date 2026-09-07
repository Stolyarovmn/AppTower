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

async function startFixtureServer() {
  const server = http.createServer((request,response) => {
    const name = String(request.url || "/").replace(/^\//,"") || "root";
    response.writeHead(200,{"content-type":"text/html; charset=utf-8","cache-control":"no-store"});
    response.end(`<!doctype html><html><head><title>${name}</title></head><body><h1>${name}</h1></body></html>`);
  });
  await new Promise(resolve => server.listen(0,"127.0.0.1",resolve));
  return {server,baseUrl:`http://127.0.0.1:${server.address().port}`};
}

async function isDialogOpen(page, selector) {
  return page.locator(selector).evaluate(element => element.open === true);
}

async function openPanel(context) {
  const page = await context.newPage();
  await page.goto(extensionUrl("sidepanel/sidepanel.html"));
  await page.waitForLoadState("domcontentloaded");
  await expect(page.locator("#panel-sites")).toBeAttached();
  await expect(page.locator("html")).toHaveAttribute("data-panel-ready","1");
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

async function stableRect(locator) {
  await expect(locator).toBeVisible();
  return locator.evaluate(element => {
    const rect=element.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    return {x:rect.x,y:rect.y,width:rect.width,height:rect.height};
  });
}

test("ATN-E2E-021 drag proxy is unique, stays left of the pointer, and remains in bounds", async () => {
  const {server,baseUrl} = await startFixtureServer();
  const profile = fs.mkdtempSync(path.join(os.tmpdir(),"app-tower-drag-left-"));
  const context = await launch(profile);
  try {
    const web = context.pages()[0] || await context.newPage();
    await web.goto(`${baseUrl}/host`);
    const panel = await openPanel(context);
    await addCustomSite(panel,"Drag A",`${baseUrl}/a`,{fromHome:true});
    await addCustomSite(panel,"Drag B",`${baseUrl}/b`);

    const source = panel.locator("#panel-sites .rail-site").nth(0);
    await expect.poll(async () => Boolean(await stableRect(source))).toBe(true);
    const box = await stableRect(source);
    if (!box) throw new Error("shortcut geometry unavailable after stable visible read");
    const startX = box.x + box.width/2;
    const startY = box.y + box.height/2;
    const pointerX = Math.min(1270,startX + 18);
    const pointerY = startY + 12;

    await panel.mouse.move(startX,startY);
    await panel.mouse.down();
    await panel.mouse.move(pointerX,pointerY,{steps:5});
    await panel.mouse.move(Math.min(1274,pointerX + 2),pointerY,{steps:2});

    const proxy = panel.locator(".atn-drag-proxy");
    await expect(proxy).toHaveCount(1);
    await expect(proxy).toBeVisible();
    const proxyBox = await stableRect(proxy);
    expect(proxyBox).toBeTruthy();
    expect(proxyBox.x + proxyBox.width).toBeLessThan(pointerX - 10);
    expect(proxyBox.x).toBeGreaterThanOrEqual(0);
    const proxyCenterY = proxyBox.y + proxyBox.height/2;
    expect(Math.abs(proxyCenterY - pointerY)).toBeLessThan(5);
    await panel.mouse.up();
    await expect(proxy).toHaveCount(0);
  } finally {
    await context.close().catch(()=>{});
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(profile,{recursive:true,force:true});
  }
});

test("ATN-E2E-022 secondary pane focus action lives in overflow and still changes layout", async () => {
  const {server,baseUrl} = await startFixtureServer();
  const profile = fs.mkdtempSync(path.join(os.tmpdir(),"app-tower-focus-control-"));
  const context = await launch(profile);
  try {
    const web = context.pages()[0] || await context.newPage();
    await web.goto(`${baseUrl}/host`);
    const panel = await openPanel(context);
    await addCustomSite(panel,"Focus layout",`${baseUrl}/focus`,{fromHome:true});

    const topPane = panel.locator('.pane[data-pane="top"]');
    const topFocus = topPane.locator('[data-action="focus"]');
    const more = topPane.locator('.atn-pane-more');
    await expect(topFocus).toBeHidden();
    await expect(more).toBeVisible();

    await panel.locator("#toggle-split").click();
    await expect(panel.locator("#workspace")).toHaveAttribute("data-layout","split");
    await expect(topFocus).toBeHidden();

    await more.click();
    const menu = panel.locator('.atn-pane-menu').filter({has:panel.locator('[data-proxy-action="focus"]')}).first();
    await expect(menu).toBeVisible();
    const focusItem = menu.locator('[data-proxy-action="focus"]');
    await expect(focusItem).toBeEnabled();
    await focusItem.click();
    await expect(panel.locator("#workspace")).toHaveAttribute("data-layout","focus-top");

    await more.click();
    await expect(menu).toBeVisible();
    await menu.locator('[data-proxy-action="focus"]').click();
    await expect(panel.locator("#workspace")).toHaveAttribute("data-layout","split");
  } finally {
    await context.close().catch(()=>{});
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(profile,{recursive:true,force:true});
  }
});

test("ATN-E2E-023 empty group context menu never starts with a separator", async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(),"app-tower-group-menu-"));
  const context = await launch(profile);
  try {
    const panel = await openPanel(context);
    await panel.locator("#rail-new-group").click();
    await expect.poll(() => isDialogOpen(panel,"#organize-dialog")).toBe(true);
    await panel.locator("#organize-group").click();
    await expect.poll(() => isDialogOpen(panel,"#group-dialog")).toBe(true);
    await panel.locator("#group-name").fill("Пустая группа");
    await panel.locator("#group-save").click();
    await expect.poll(() => isDialogOpen(panel,"#group-dialog")).toBe(false);

    const group = panel.locator('.rail-site[data-shortcut-kind="group"]');
    await group.click({button:"right"});
    const menu = panel.locator("#shortcut-menu");
    await expect(menu).toBeVisible();
    await expect.poll(() => menu.evaluate(element => {
      const first = element.firstElementChild;
      return Boolean(first && !first.classList.contains("separator"));
    })).toBe(true);
    const separators = await menu.evaluate(element => [...element.children].map(child => child.classList.contains("separator")));
    expect(separators[0]).not.toBe(true);
    expect(separators.at(-1)).not.toBe(true);
    expect(separators.some((value,index) => value && separators[index-1])).toBe(false);
  } finally {
    await context.close().catch(()=>{});
    fs.rmSync(profile,{recursive:true,force:true});
  }
});

test("ATN-E2E-024 pane primary toolbar stays compact and close appears only for split layout", async () => {
  const {server,baseUrl} = await startFixtureServer();
  const profile = fs.mkdtempSync(path.join(os.tmpdir(),"app-tower-pane-icons-"));
  const context = await launch(profile);
  try {
    const web = context.pages()[0] || await context.newPage();
    await web.goto(`${baseUrl}/host`);
    const panel = await openPanel(context);
    await addCustomSite(panel,"Toolbar fixture",`${baseUrl}/toolbar`,{fromHome:true});
    const topPane = panel.locator('.pane[data-pane="top"]');
    for (const action of ["go","reload"]) {
      const button = topPane.locator(`[data-action="${action}"]`);
      await expect(button.locator("svg").first()).toBeAttached();
      await expect(button).toBeVisible();
    }
    await expect(topPane.locator('[data-action="save-shortcut"]')).toBeVisible();
    await expect(topPane.locator('[data-action="mode"]')).toBeHidden();
    await expect(topPane.locator('[data-action="pwa"]')).toBeHidden();
    await expect(topPane.locator('[data-action="external"]')).toBeHidden();
    await expect(topPane.locator('[data-action="focus"]')).toBeHidden();

    const more=topPane.locator('.atn-pane-more');
    const close=topPane.locator('.atn-pane-close');
    await expect(more).toBeVisible();
    await expect(close).toBeHidden();

    const moreBox=await more.boundingBox();
    expect(moreBox).toBeTruthy();
    expect(moreBox.width).toBeLessThanOrEqual(31);
    expect(moreBox.height).toBeLessThanOrEqual(31);

    await panel.locator("#toggle-split").click();
    await expect(panel.locator("#workspace")).toHaveAttribute("data-layout","split");
    await expect(close).toBeVisible();
    const closeBox=await close.boundingBox();
    expect(closeBox).toBeTruthy();
    expect(closeBox.width).toBeLessThanOrEqual(31);
    expect(closeBox.height).toBeLessThanOrEqual(31);

    await close.click();
    await expect(panel.locator("#workspace")).not.toHaveAttribute("data-layout","split");
  } finally {
    await context.close().catch(()=>{});
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(profile,{recursive:true,force:true});
  }
});
