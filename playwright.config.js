// @ts-check
const { defineConfig, devices } = require("@playwright/test");

/* Every project runs on Chromium (the browser installed here); phones and tablets are emulated
   with their real viewport, pixel ratio, touch and user agent. */
const chromium = (d) => ({ ...d, browserName: "chromium", defaultBrowserType: "chromium" });

module.exports = defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  expect: { timeout: 7_000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL: "http://localhost:4173",
    trace: "off",
    screenshot: "only-on-failure",
    locale: "es-BO",
    timezoneId: "America/La_Paz",
  },
  webServer: { command: "node tests/e2e/server.js", url: "http://localhost:4173/", reuseExistingServer: !process.env.CI },
  projects: [
    { name: "desktop-1440", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "desktop-1920", use: { ...devices["Desktop Chrome"], viewport: { width: 1920, height: 1080 } } },
    { name: "laptop-1280", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 720 } } },
    { name: "ipad-mini", use: chromium(devices["iPad Mini"]) },
    { name: "iphone-se", use: chromium(devices["iPhone SE"]) },
    { name: "iphone-15-pro-max", use: chromium(devices["iPhone 15 Pro Max"]) },
    { name: "pixel-7", use: devices["Pixel 7"] },
    { name: "galaxy-s8", use: devices["Galaxy S8"] },
    { name: "iphone-landscape", use: chromium(devices["iPhone 13 landscape"]) },
  ],
});
