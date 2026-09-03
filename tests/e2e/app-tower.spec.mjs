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

let context;
let bootstrapPage;
let panel;
let webPage;
let server;
let baseUrl;
let userDataDir;

async function launchExtension() {
  context = await chromium.launchPersistentContext(userDataDir, {
    headless:false,
    viewport:{width:1440,height:1000},
    args:[
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      "--disable-features=Translate"
    ]
  });

  // A persistent Chromium context exits if its final browser tab is closed.
  // Keep the bootstrap tab alive and reuse it as the first fixture page.
  bootstrapPage = context.pages()[0] || await context.newPage();
}

function fixtureHtml(name) {
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Fixture ${name}</title></head>
<body>
  <h1 id="fixture-title">Fixture ${name}</h1>
  <script>
    window.__appTowerInstanceId = crypto.randomUUID();
    window.__appTowerLoadedAt = Date.now();
  </script>
</body></html>`;
}

async function startFixtureServer() {
  server = http.createServer((request, response) => {
    const name = String(request.url || "/").replace(/^\//, "") || "root";
    response.writeHead(200, {
      "content-type":"text/html; charset=utf-8",
      "cache-control":"no-store"
    });
    response.end(fixtureHtml(name));
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
}

async function openPanelDocument() {
  const page = await context.newPage();
  await page.goto(extensionUrl("sidepanel/sidepanel.html"));
  await page.waitForLoadState("domcontentloaded");
  await expect(page.locator("#panel-sites")).toBeAttached();
  return page;
}

async function isDialogOpen(page, selector) {
  return page.locator(selector).evaluate(element => element.open === true);
}

async function workspaceState(page = panel) {
  return page.evaluate(async () => {
    const data = await chrome.storage.local.get(["atnWorkspacesV1"]);
    const workspaces = Array.isArray(data.atnWorkspacesV1) ? data.atnWorkspacesV1 : [];
    return {workspaces, workspace:workspaces[0] || null};
  });
}

async function addCustomSite(title, url) {
  await panel.locator("#rail-add").click();
  await expect.poll(() => isDialogOpen(panel, "#site-dialog")).toBe(true);
  await panel.locator("#clear-site").click();
  await panel.locator("#site-title").fill(title);
  await panel.locator("#site-url").fill(url);
  await panel.locator("#site-mode").selectOption("auto");
  await panel.locator("#save-site").click();
  await expect.poll(() => isDialogOpen(panel, "#site-dialog")).toBe(false);
}

async function dragShortcut(sourceId, targetId) {
  const source = panel.locator(`[data-shortcut-id="${sourceId}"]`);
  const target = panel.locator(`[data-shortcut-id="${targetId}"]`);
  await expect(source).toBeVisible();
  await expect(target).toBeVisible();

  const from = await source.boundingBox();
  const to = await target.boundingBox();
  if (!from || !to) throw new Error("Shortcut drag boxes are unavailable");

  const fromX = from.x + from.width / 2;
  const fromY = from.y + from.height / 2;
  const toX = to.x + to.width / 2;
  const toY = to.y + to.height / 2;

  await panel.mouse.move(fromX, fromY);
  await panel.mouse.down();
  await panel.mouse.move(fromX + 10, fromY + 10, {steps:3});
  await panel.waitForTimeout(120);
  await panel.mouse.move(toX, toY, {steps:12});
  await panel.waitForTimeout(120);
  await panel.mouse.up();
}

async function paneFrame(name) {
  await expect.poll(() => {
    const frame = panel.frames().find(candidate => candidate.name() === `app-tower-pane-${name}`);
    return Boolean(frame && /^https?:/.test(frame.url()));
  }, {timeout:10_000}).toBe(true);
  return panel.frames().find(candidate => candidate.name() === `app-tower-pane-${name}`);
}

async function navigatePane(name, url) {
  const pane = panel.locator(`.pane[data-pane="${name}"]`);
  await pane.locator('[data-role="url"]').fill(url);
  await pane.locator('[data-action="go"]').click();
  await expect.poll(async () => (await pane.locator('[data-role="url"]').inputValue())).toContain(url);
  await expect.poll(() => panel.frames().find(frame => frame.name() === `app-tower-pane-${name}`)?.url() || "", {timeout:10_000}).toContain(url);
}

async function screenshotFailure(testInfo) {
  if (testInfo.status === testInfo.expectedStatus || !context) return;
  let index = 0;
  for (const page of context.pages()) {
    try {
      await page.screenshot({path:testInfo.outputPath(`page-${index++}.png`),fullPage:true});
    } catch {}
  }
}

test.describe.configure({mode:"serial"});

test.beforeAll(async () => {
  userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "app-tower-e2e-"));
  await startFixtureServer();
  await launchExtension();
});

test.afterEach(async ({}, testInfo) => {
  await screenshotFailure(testInfo);
});

test.afterAll(async () => {
  await context?.close().catch(() => {});
  await new Promise(resolve => server?.close(resolve));
  fs.rmSync(userDataDir, {recursive:true,force:true});
});

test("ATN-E2E-001 add current page pre-fills the real browser page", async () => {
  webPage = bootstrapPage;
  await webPage.goto(`${baseUrl}/a`);
  await expect(webPage.locator("#fixture-title")).toHaveText("Fixture a");

  panel = await openPanelDocument();
  await expect(panel.locator("#home-view")).toBeVisible();
  await panel.locator("#home-add-current").click();

  await expect.poll(() => isDialogOpen(panel, "#site-dialog")).toBe(true);
  await expect(panel.locator("#site-url")).toHaveValue(`${baseUrl}/a`);
  await panel.locator("#site-title").fill("Fixture A");
  await panel.locator("#save-site").click();

  await expect.poll(() => isDialogOpen(panel, "#site-dialog")).toBe(false);
  await expect(panel.locator("#panel-sites .rail-site")).toHaveCount(1);
});

test("ATN-E2E-002 search closes by button and mouse-click result works", async () => {
  await panel.locator("#rail-search").click();
  await expect.poll(() => isDialogOpen(panel, "#search-dialog")).toBe(true);
  await panel.locator("#search-close").click();
  await expect.poll(() => isDialogOpen(panel, "#search-dialog")).toBe(false);

  await panel.locator("#rail-search").click();
  await panel.locator("#search-input").fill("Fixture A");
  const result = panel.locator("#search-results .search-result").filter({hasText:"Fixture A"}).first();
  await expect(result).toBeVisible();
  await result.hover();
  await result.click();
  await expect.poll(() => isDialogOpen(panel, "#search-dialog")).toBe(false);
});

test("ATN-E2E-003 changing bottom pane does not reload top pane", async () => {
  await panel.locator("#toggle-split").click();
  await navigatePane("top", `${baseUrl}/top`);
  await navigatePane("bottom", `${baseUrl}/bottom-1`);

  const top = await paneFrame("top");
  const topInstanceBefore = await top.evaluate(() => window.__appTowerInstanceId);
  expect(topInstanceBefore).toBeTruthy();

  await navigatePane("bottom", `${baseUrl}/bottom-2`);
  await panel.waitForTimeout(500);

  const topAfter = await paneFrame("top");
  const topInstanceAfter = await topAfter.evaluate(() => window.__appTowerInstanceId);
  expect(topInstanceAfter).toBe(topInstanceBefore);
});

test("ATN-E2E-004 site can be dragged into a created group", async () => {
  await addCustomSite("Fixture B", `${baseUrl}/b`);
  await addCustomSite("Fixture C", `${baseUrl}/c`);

  await panel.locator("#rail-new-group").click();
  await expect.poll(() => isDialogOpen(panel, "#organize-dialog")).toBe(true);
  await panel.locator("#organize-group").click();
  await expect.poll(() => isDialogOpen(panel, "#group-dialog")).toBe(true);
  await panel.locator("#group-name").fill("E2E Group");
  await panel.locator("#group-save").click();
  await expect.poll(() => isDialogOpen(panel, "#group-dialog")).toBe(false);

  let state = await workspaceState();
  const group = state.workspace.sites.find(item => item.kind === "group" && item.title === "E2E Group");
  const siteC = state.workspace.sites.find(item => item.kind === "site" && item.title === "Fixture C");
  expect(group).toBeTruthy();
  expect(siteC).toBeTruthy();

  await dragShortcut(siteC.id, group.id);
  await expect.poll(async () => {
    state = await workspaceState();
    const updated = state.workspace.sites.find(item => item.id === group.id);
    return updated?.items?.some(item => item.id === siteC.id) === true;
  }, {timeout:7_500}).toBe(true);
});

test("ATN-E2E-005 site-to-site drag creates a two-pane template", async () => {
  let state = await workspaceState();
  const siteA = state.workspace.sites.find(item => item.kind === "site" && item.title === "Fixture A");
  const siteB = state.workspace.sites.find(item => item.kind === "site" && item.title === "Fixture B");
  expect(siteA).toBeTruthy();
  expect(siteB).toBeTruthy();

  await dragShortcut(siteA.id, siteB.id);
  await expect.poll(() => isDialogOpen(panel, "#combine-dialog")).toBe(true);
  await panel.locator("#combine-template").click();
  await expect.poll(() => isDialogOpen(panel, "#template-dialog")).toBe(true);
  await panel.locator("#template-name").fill("E2E Template");
  await panel.locator("#template-save").click();
  await expect.poll(() => isDialogOpen(panel, "#template-dialog")).toBe(false);

  await expect.poll(async () => {
    state = await workspaceState();
    return state.workspace.sites.some(item => item.kind === "template" && item.title === "E2E Template");
  }).toBe(true);
});

test("ATN-E2E-006 fixture page contains only one injected App Tower rail", async () => {
  await webPage.bringToFront();
  await expect.poll(() => webPage.evaluate(() =>
    document.querySelectorAll("#app-tower-next-host").length
  )).toBe(1);

  await webPage.reload();
  await expect(webPage.locator("#fixture-title")).toHaveText("Fixture a");
  await expect.poll(() => webPage.evaluate(() =>
    document.querySelectorAll("#app-tower-next-host").length
  )).toBe(1);
});

test("ATN-E2E-007 Recent is populated and Open mutates App Tower state", async () => {
  const options = await context.newPage();
  await options.goto(extensionUrl("options/options.html#recent"));
  await options.locator('#settings-nav button[data-section="recent"]').click();
  await expect(options.locator("#recent-list .row").first()).toBeVisible();

  let dialogMessage = null;
  options.on("dialog", async dialog => {
    dialogMessage = dialog.message();
    await dialog.dismiss();
  });
  await options.locator("#recent-list .row").first().getByRole("button", {name:"Открыть"}).click();
  await options.waitForTimeout(500);
  expect(dialogMessage).toBeNull();
  await options.close();
});

test("ATN-E2E-008 restart preserves shortcuts/groups/templates", async () => {
  const before = await workspaceState();
  const beforeSites = before.workspace.sites;
  expect(beforeSites.some(item => item.kind === "group")).toBe(true);
  expect(beforeSites.some(item => item.kind === "template")).toBe(true);

  await panel.close();
  await webPage.close();
  await context.close();
  context = null;

  await launchExtension();
  panel = await openPanelDocument();
  const after = await workspaceState();
  expect(after.workspace.sites.some(item => item.kind === "group")).toBe(true);
  expect(after.workspace.sites.some(item => item.kind === "template")).toBe(true);
});
