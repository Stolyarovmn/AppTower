import { chromium, expect, test } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const extensionPath = path.resolve(process.cwd());

test('installed AppTower side panel boots and opens search in headed Chromium', async () => {
  const userDataDir = await mkdtemp(path.join(tmpdir(), 'apptower-e2e-'));
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });

  try {
    let worker = context.serviceWorkers()[0];
    if (!worker) {
      worker = await context.waitForEvent('serviceworker', { timeout: 15_000 });
    }

    const extensionId = new URL(worker.url()).host;
    expect(extensionId).toBeTruthy();

    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/sidepanel.html`);

    await expect(page).toHaveTitle('AppTower');
    await expect(page.locator('#collapse')).toBeVisible();
    await expect(page.locator('#add')).toBeVisible();
    await expect(page.locator('#search')).toBeVisible();

    await page.locator('#search').click();
    await expect(page.locator('#search-input')).toBeVisible();
    expect(await page.locator('#search-dialog').evaluate((dialog) => dialog.open)).toBe(true);
  } finally {
    await context.close();
    await rm(userDataDir, { recursive: true, force: true });
  }
});
