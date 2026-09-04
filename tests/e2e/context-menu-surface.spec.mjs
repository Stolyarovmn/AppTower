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

async function isDialogOpen(page, selector) {
  return page.locator(selector).evaluate(element => element.open === true);
}

async function openPanel(context) {
  const page = context.pages()[0] || await context.newPage();
  await page.goto(extensionUrl("sidepanel/sidepanel.html"));
  await page.waitForLoadState("domcontentloaded");
  await expect(page.locator("#panel-sites")).toBeAttached();
  return page;
}

test("ATN-E2E-020 shortcut context menu uses the shared floating-surface style and spacing", async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "app-tower-context-surface-"));
  const context = await launch(profile);

  try {
    const panel = await openPanel(context);

    await panel.locator("#rail-new-group").click();
    await expect.poll(() => isDialogOpen(panel,"#organize-dialog")).toBe(true);
    await panel.locator("#organize-group").click();
    await expect.poll(() => isDialogOpen(panel,"#group-dialog")).toBe(true);
    await panel.locator("#group-name").fill("Контекстная группа");
    await panel.locator("#group-save").click();
    await expect.poll(() => isDialogOpen(panel,"#group-dialog")).toBe(false);

    const group = panel.locator('.rail-site[data-shortcut-kind="group"]');
    await expect(group).toHaveCount(1);
    await group.click({button:"right"});

    const menu = panel.locator("#shortcut-menu");
    await expect(menu).toBeVisible();
    const rename = menu.getByRole("button",{name:"Переименовать / содержимое"});
    await expect(rename).toBeVisible();

    const menuMetrics = await menu.evaluate(element => {
      const rect = element.getBoundingClientRect();
      const button = [...element.querySelectorAll("button")]
        .find(node => node.textContent?.includes("Переименовать / содержимое"));
      if (!button) throw new Error("rename action not found");
      const buttonRect = button.getBoundingClientRect();
      const style = getComputedStyle(element);
      const buttonStyle = getComputedStyle(button);
      const rootStyle = getComputedStyle(document.documentElement);
      return {
        background:style.backgroundColor,
        borderColor:style.borderColor,
        borderRadius:style.borderRadius,
        width:rect.width,
        maxAllowedWidth:innerWidth - 16,
        contentInset:buttonRect.left - rect.left,
        buttonPaddingLeft:buttonStyle.paddingLeft,
        buttonWhiteSpace:buttonStyle.whiteSpace,
        buttonScrollWidth:button.scrollWidth,
        buttonClientWidth:button.clientWidth,
        menuPaddingToken:rootStyle.getPropertyValue("--atn-menu-padding").trim(),
        surfaceRadiusToken:rootStyle.getPropertyValue("--atn-surface-radius").trim()
      };
    });

    expect(menuMetrics.menuPaddingToken).toBe("6px");
    expect(menuMetrics.surfaceRadiusToken).toBe("8px");
    expect(menuMetrics.width).toBeGreaterThanOrEqual(209);
    expect(menuMetrics.width).toBeLessThanOrEqual(menuMetrics.maxAllowedWidth + 1);
    expect(menuMetrics.contentInset).toBeGreaterThanOrEqual(5);
    expect(parseFloat(menuMetrics.buttonPaddingLeft)).toBeGreaterThanOrEqual(8);
    expect(menuMetrics.buttonWhiteSpace).toBe("nowrap");
    expect(menuMetrics.buttonScrollWidth).toBeLessThanOrEqual(menuMetrics.buttonClientWidth + 1);

    await rename.click();
    await expect.poll(() => isDialogOpen(panel,"#group-dialog")).toBe(true);

    const dialogMetrics = await panel.locator("#group-dialog").evaluate(element => {
      const style = getComputedStyle(element);
      return {
        background:style.backgroundColor,
        borderColor:style.borderColor,
        borderRadius:style.borderRadius
      };
    });

    expect(menuMetrics.background).toBe(dialogMetrics.background);
    expect(menuMetrics.borderColor).toBe(dialogMetrics.borderColor);
    expect(menuMetrics.borderRadius).toBe(dialogMetrics.borderRadius);
  } finally {
    await context.close().catch(() => {});
    fs.rmSync(profile,{recursive:true,force:true});
  }
});
