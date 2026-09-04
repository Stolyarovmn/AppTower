import {test, expect, chromium} from "@playwright/test";
import crypto from "node:crypto";
import fs from "node:fs";
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
  return chromium.launchPersistentContext(profile, {
    headless:false,
    viewport:{width:1280,height:900},
    args:[
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      "--disable-features=Translate"
    ]
  });
}

async function openPanel(context) {
  const page = context.pages()[0] || await context.newPage();
  await page.goto(extensionUrl("sidepanel/sidepanel.html"));
  await page.waitForLoadState("domcontentloaded");
  await expect(page.locator("#panel-sites")).toBeAttached();
  await expect(page.locator("#organize-dialog .dialog-close")).toBeAttached();
  return page;
}

async function isDialogOpen(page, selector) {
  return page.locator(selector).evaluate(element => element.open === true);
}

async function seedTemplate(panel) {
  const response = await panel.evaluate(async () => {
    const windowInfo = await chrome.windows.getCurrent();
    const top = {
      kind:"site",id:"ui-site-top",title:"UI Top",url:"https://example.com/",
      mode:"auto",compatDomains:[]
    };
    const bottom = {
      kind:"site",id:"ui-site-bottom",title:"UI Bottom",url:"https://example.org/",
      mode:"auto",compatDomains:[]
    };
    const template = {
      kind:"template",id:"ui-template",title:"UI Template",
      top,bottom,overlap:50
    };
    return chrome.runtime.sendMessage({
      type:"UPDATE_WORKSPACE_STATE",
      windowId:windowInfo.id,
      sites:[template]
    });
  });
  expect(response?.ok).toBe(true);
  await expect(panel.locator('.rail-site[data-shortcut-kind="template"]')).toHaveCount(1);
}

test("ATN-E2E-014 dialogs use one close affordance and safe backdrop cancellation", async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "app-tower-ui-dialogs-"));
  const context = await launch(profile);
  try {
    const panel = await openPanel(context);

    await panel.locator("#rail-new-group").click();
    await expect.poll(() => isDialogOpen(panel,"#organize-dialog")).toBe(true);

    const close = panel.locator("#organize-dialog .dialog-close");
    await expect(close).toBeVisible();
    await expect(panel.locator("#organize-dialog .dialog-close-only")).toBeHidden();

    const metrics = await panel.locator("#organize-dialog").evaluate(dialog => {
      const form = dialog.querySelector("form").getBoundingClientRect();
      const button = dialog.querySelector(".dialog-close").getBoundingClientRect();
      return {
        rightInset:Math.round(form.right - button.right),
        topInset:Math.round(button.top - form.top),
        size:Math.round(button.width)
      };
    });
    expect(metrics.rightInset).toBeGreaterThanOrEqual(8);
    expect(metrics.topInset).toBeGreaterThanOrEqual(8);
    expect(metrics.size).toBeGreaterThanOrEqual(30);

    await close.click();
    await expect.poll(() => isDialogOpen(panel,"#organize-dialog")).toBe(false);

    await panel.locator("#rail-new-group").click();
    await expect.poll(() => isDialogOpen(panel,"#organize-dialog")).toBe(true);
    await panel.mouse.click(2,2);
    await expect.poll(() => isDialogOpen(panel,"#organize-dialog")).toBe(false);
  } finally {
    await context.close().catch(() => {});
    fs.rmSync(profile,{recursive:true,force:true});
  }
});

test("ATN-E2E-015 template menu exposes dissolve and template action rows keep spacing", async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "app-tower-ui-template-"));
  const context = await launch(profile);
  try {
    const panel = await openPanel(context);
    await seedTemplate(panel);

    const template = panel.locator('.rail-site[data-shortcut-kind="template"]');
    await template.click({button:"right"});
    const menu = panel.locator("#shortcut-menu");
    await expect(menu).toBeVisible();
    await expect(menu.getByRole("button",{name:"Разобрать шаблон"})).toBeVisible();

    await menu.getByRole("button",{name:"Настроить шаблон"}).click();
    await expect.poll(() => isDialogOpen(panel,"#template-dialog")).toBe(true);
    await expect(panel.locator("#template-dialog .dialog-close")).toBeVisible();
    await expect(panel.locator("#template-dialog .dialog-close-only")).toBeHidden();

    const actionSpacing = await panel.locator("#template-dialog").evaluate(dialog => {
      const swap = dialog.querySelector("#template-swap").getBoundingClientRect();
      const save = dialog.querySelector("#template-save").getBoundingClientRect();
      const dissolve = dialog.querySelector("#template-dissolve").getBoundingClientRect();
      return {
        sameRow:Math.abs(swap.top-save.top),
        rowGap:dissolve.top-Math.max(swap.bottom,save.bottom)
      };
    });
    expect(actionSpacing.sameRow).toBeLessThanOrEqual(2);
    expect(actionSpacing.rowGap).toBeGreaterThanOrEqual(8);

    await panel.locator("#template-dialog .dialog-close").click();
    await expect.poll(() => isDialogOpen(panel,"#template-dialog")).toBe(false);

    await template.click({button:"right"});
    await expect(menu.getByRole("button",{name:"Разобрать шаблон"})).toBeVisible();
    await menu.getByRole("button",{name:"Разобрать шаблон"}).click();

    await expect(panel.locator('.rail-site[data-shortcut-kind="template"]')).toHaveCount(0);
    await expect(panel.locator('.rail-site[data-shortcut-kind="site"]')).toHaveCount(2);
  } finally {
    await context.close().catch(() => {});
    fs.rmSync(profile,{recursive:true,force:true});
  }
});

test("ATN-E2E-016 Sync and Data card follows shared spacing tokens", async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "app-tower-ui-options-"));
  const context = await launch(profile);
  try {
    const options = context.pages()[0] || await context.newPage();
    await options.goto(extensionUrl("options/options.html"));
    await options.locator('#settings-nav button[data-section="data"]').click();
    await expect(options.locator('.page[data-page="data"]')).toBeVisible();

    const metrics = await options.locator('.page[data-page="data"] .card').evaluate(card => {
      const cardRect = card.getBoundingClientRect();
      const toggle = card.querySelector(".toggle").getBoundingClientRect();
      const actions = card.querySelector(".actions-row").getBoundingClientRect();
      const css = getComputedStyle(document.documentElement);
      return {
        leftInset:Math.round(toggle.left-cardRect.left),
        actionLeftInset:Math.round(actions.left-cardRect.left),
        verticalGap:Math.round(actions.top-toggle.bottom),
        token:css.getPropertyValue("--atn-space-3").trim()
      };
    });

    expect(metrics.token).toBe("12px");
    expect(metrics.leftInset).toBeGreaterThanOrEqual(15);
    expect(Math.abs(metrics.actionLeftInset-metrics.leftInset)).toBeLessThanOrEqual(1);
    expect(metrics.verticalGap).toBeGreaterThanOrEqual(10);
  } finally {
    await context.close().catch(() => {});
    fs.rmSync(profile,{recursive:true,force:true});
  }
});
