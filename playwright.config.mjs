import {defineConfig} from "@playwright/test";

export default defineConfig({
  testDir:"./tests/e2e",
  fullyParallel:false,
  workers:1,
  timeout:45_000,
  expect:{timeout:7_500},
  retries:process.env.CI ? 1 : 0,
  reporter:process.env.CI
    ? [["line"],["html",{outputFolder:"playwright-report",open:"never"}]]
    : [["line"]],
  outputDir:"test-results",
  use:{
    trace:"retain-on-failure",
    screenshot:"only-on-failure",
    video:"off"
  }
});
