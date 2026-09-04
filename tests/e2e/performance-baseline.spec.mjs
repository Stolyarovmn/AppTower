import {test, expect, chromium} from "@playwright/test";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import {performance as nodePerformance} from "node:perf_hooks";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const extensionPath = path.join(repoRoot, "app");
const manifest = JSON.parse(fs.readFileSync(path.join(extensionPath, "manifest.json"), "utf8"));

function extensionIdFromManifestKey(key) {
  const digest = crypto.createHash("sha256").update(Buffer.from(key, "base64")).digest().subarray(0, 16);
  const alphabet = "abcdefghijklmnop";
  return [...digest].map(byte => alphabet[byte >> 4] + alphabet[byte & 15]).join("");
}

const extensionId = extensionIdFromManifestKey(manifest.key);
const panelUrl = `chrome-extension://${extensionId}/sidepanel/sidepanel.html`;

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

async function startFixtureServer() {
  const server = http.createServer((request, response) => {
    response.writeHead(200, {
      "content-type":"text/html; charset=utf-8",
      "cache-control":"no-store"
    });
    response.end("<!doctype html><title>Performance Fixture</title><h1>fixture</h1>");
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  return {server, url:`http://127.0.0.1:${address.port}/fixture`};
}

function metricsMap(result) {
  return Object.fromEntries(result.metrics.map(item => [item.name, item.value]));
}

test("ATN-PERF-001 collect Side Panel startup, interaction, idle CPU and heap baseline", async ({}, testInfo) => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "app-tower-perf-"));
  const {server,url:fixtureUrl} = await startFixtureServer();
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
    const web = context.pages()[0] || await context.newPage();
    await web.goto(fixtureUrl);
    await expect(web.locator("h1")).toHaveText("fixture");

    const startupSamples = [];
    let panel = null;
    for (let i = 0; i < 5; i += 1) {
      panel = await context.newPage();
      const started = nodePerformance.now();
      await panel.goto(panelUrl);
      await expect(panel.locator("#panel-sites")).toBeAttached({timeout:5_000});
      startupSamples.push(nodePerformance.now() - started);
      if (i < 4) await panel.close();
    }

    await panel.evaluate(() => {
      window.__atnPerfLongTasks = [];
      if (typeof PerformanceObserver === "function") {
        try {
          const observer = new PerformanceObserver(list => {
            for (const entry of list.getEntries()) {
              window.__atnPerfLongTasks.push({startTime:entry.startTime,duration:entry.duration});
            }
          });
          observer.observe({entryTypes:["longtask"]});
          window.__atnPerfLongTaskObserver = observer;
        } catch {}
      }
    });

    const searchSamples = [];
    for (let i = 0; i < 7; i += 1) {
      const started = nodePerformance.now();
      await panel.locator("#rail-search").click();
      await expect.poll(() => panel.locator("#search-dialog").evaluate(element => element.open === true)).toBe(true);
      searchSamples.push(nodePerformance.now() - started);
      await panel.locator("#search-close").click();
      await expect.poll(() => panel.locator("#search-dialog").evaluate(element => element.open === true)).toBe(false);
    }

    await web.bringToFront();
    await panel.bringToFront();
    const addStarted = nodePerformance.now();
    await panel.locator("#rail-add").click();
    await expect.poll(() => panel.locator("#site-dialog").evaluate(element => element.open === true)).toBe(true);
    const addDialogMs = nodePerformance.now() - addStarted;
    await panel.locator("#cancel-site").click();

    // Performance counters are process/session cumulative. Read both ends of
    // the idle interval through the same CDP session so the delta is valid.
    const perfSession = await context.newCDPSession(panel);
    let beforeIdle;
    let afterIdle;
    try {
      await perfSession.send("Performance.enable");
      beforeIdle = metricsMap(await perfSession.send("Performance.getMetrics"));
      await panel.waitForTimeout(1_000);
      afterIdle = metricsMap(await perfSession.send("Performance.getMetrics"));
    } finally {
      await perfSession.detach();
    }

    const runtime = await panel.evaluate(() => ({
      iframeCount:document.querySelectorAll("iframe").length,
      visibleIframeCount:[...document.querySelectorAll("iframe")].filter(frame => {
        const style = getComputedStyle(frame);
        const rect = frame.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
      }).length,
      longTasks:Array.isArray(window.__atnPerfLongTasks) ? window.__atnPerfLongTasks : [],
      navigation:performance.getEntriesByType("navigation")[0]?.toJSON?.() || null
    }));

    const taskDurationMs = ((afterIdle.TaskDuration || 0) - (beforeIdle.TaskDuration || 0)) * 1000;
    const scriptDurationMs = ((afterIdle.ScriptDuration || 0) - (beforeIdle.ScriptDuration || 0)) * 1000;

    const result = {
      capturedAt:new Date().toISOString(),
      chromiumVersion:await context.browser()?.version?.() || "unknown",
      startup:summarize(startupSamples),
      searchDialog:summarize(searchSamples),
      addDialogMs:Number(addDialogMs.toFixed(2)),
      idleOneSecond:{
        taskDurationMs:Number(taskDurationMs.toFixed(3)),
        scriptDurationMs:Number(scriptDurationMs.toFixed(3))
      },
      heap:{
        usedMiB:Number(((afterIdle.JSHeapUsedSize || 0) / 1024 / 1024).toFixed(3)),
        totalMiB:Number(((afterIdle.JSHeapTotalSize || 0) / 1024 / 1024).toFixed(3))
      },
      iframeCount:runtime.iframeCount,
      visibleIframeCount:runtime.visibleIframeCount,
      longTaskCount:runtime.longTasks.length,
      longestLongTaskMs:Number(Math.max(0, ...runtime.longTasks.map(item => item.duration || 0)).toFixed(2))
    };

    const outputPath = testInfo.outputPath("performance-baseline.json");
    fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`);
    await testInfo.attach("performance-baseline", {path:outputPath,contentType:"application/json"});
    console.log(`ATN performance baseline: ${JSON.stringify(result)}`);

    // These are hang/safety guards, not optimization budgets. Stable budgets
    // are set in PERFORMANCE.md only after several CI samples exist.
    expect(result.startup.p95Ms).toBeLessThan(5_000);
    expect(result.searchDialog.p95Ms).toBeLessThan(2_000);
    expect(result.addDialogMs).toBeLessThan(3_000);
    expect(result.idleOneSecond.taskDurationMs).toBeGreaterThanOrEqual(0);
    expect(result.idleOneSecond.scriptDurationMs).toBeGreaterThanOrEqual(0);
    expect(result.longestLongTaskMs).toBeLessThan(1_000);
  } finally {
    await context.close().catch(() => {});
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(profile, {recursive:true,force:true});
  }
});
