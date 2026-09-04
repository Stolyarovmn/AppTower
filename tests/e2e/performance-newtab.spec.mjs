import {test, expect, chromium} from "@playwright/test";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {performance as nodePerformance} from "node:perf_hooks";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const extensionPath = path.join(repoRoot, "app");
const manifest = JSON.parse(fs.readFileSync(path.join(extensionPath, "manifest.json"), "utf8"));
const performanceBudget = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, "performance-budget.json"), "utf8"));

function extensionIdFromManifestKey(key) {
  const digest = crypto.createHash("sha256").update(Buffer.from(key, "base64")).digest().subarray(0, 16);
  const alphabet = "abcdefghijklmnop";
  return [...digest].map(byte => alphabet[byte >> 4] + alphabet[byte & 15]).join("");
}

function percentile(values, fraction) {
  const sorted = [...values].sort((a,b) => a-b);
  const index = Math.max(0, Math.ceil(sorted.length * fraction) - 1);
  return sorted[index];
}

function summarize(values) {
  const sorted = [...values].sort((a,b) => a-b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return {
    samples:values.length,
    minMs:Number(sorted[0].toFixed(2)),
    medianMs:Number(median.toFixed(2)),
    p95Ms:Number(percentile(sorted, 0.95).toFixed(2)),
    maxMs:Number(sorted.at(-1).toFixed(2))
  };
}

function relativeLimit(value) {
  return value * (1 + performanceBudget.relativeTolerance);
}

const extensionId = extensionIdFromManifestKey(manifest.key);
const newTabUrl = `chrome-extension://${extensionId}/newtab/newtab.html`;

test("ATN-PERF-002 collect New Tab first-interactive baseline", async ({}, testInfo) => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "app-tower-perf-newtab-"));
  const context = await chromium.launchPersistentContext(profile, {
    headless:false,
    viewport:{width:1440,height:1000},
    args:[
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      "--disable-features=Translate"
    ]
  });

  try {
    const samples = [];
    for (let i = 0; i < 7; i += 1) {
      const page = await context.newPage();
      const started = nodePerformance.now();
      await page.goto(newTabUrl);
      await expect(page.locator("#nt-rail")).toBeVisible({timeout:5_000});
      await expect(page.locator("#nt-search")).toBeEnabled({timeout:5_000});
      samples.push(nodePerformance.now() - started);
      await page.close();
    }

    const result = {
      capturedAt:new Date().toISOString(),
      chromiumVersion:await context.browser()?.version?.() || "unknown",
      newTabFirstInteractive:summarize(samples)
    };

    const outputPath = testInfo.outputPath("performance-newtab-baseline.json");
    fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`);
    await testInfo.attach("performance-newtab-baseline", {path:outputPath,contentType:"application/json"});
    console.log(`ATN New Tab performance baseline: ${JSON.stringify(result)}`);

    const baseline = performanceBudget.baseline.newTab;
    expect(result.newTabFirstInteractive.medianMs).toBeLessThanOrEqual(relativeLimit(baseline.firstInteractiveMedianMs));
    expect(result.newTabFirstInteractive.p95Ms).toBeLessThanOrEqual(relativeLimit(baseline.firstInteractiveP95Ms));
  } finally {
    await context.close().catch(() => {});
    fs.rmSync(profile, {recursive:true,force:true,maxRetries:5,retryDelay:100});
  }
});
