// Core Web Vitals-style checks on the first load: LCP, CLS and how much the first screen downloads.
// Phones run on an emulated 4G connection with a 4× slower CPU (Chromium only, via CDP).
const { test, expect } = require("@playwright/test");

const FOUR_G = { offline: false, latency: 85, downloadThroughput: (9 * 1024 * 1024) / 8, uploadThroughput: (1.5 * 1024 * 1024) / 8 };

test("Web Vitals de la primera carga", async ({ page, browserName }, ti) => {
  test.skip(browserName !== "chromium", "usa CDP");
  const phone = !!ti.project.use.isMobile;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  if (phone) {
    await cdp.send("Network.emulateNetworkConditions", FOUR_G);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  }
  let bytes = 0;
  cdp.on("Network.loadingFinished", (e) => { bytes += e.encodedDataLength; });

  await page.addInitScript(() => {
    window.__lcp = 0; window.__cls = 0;
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lcp = e.startTime; }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: "layout-shift", buffered: true });
  });
  const t0 = Date.now();
  await page.goto("/", { waitUntil: "load" });
  const loadMs = Date.now() - t0;
  await page.waitForTimeout(2500); // let late shifts / LCP candidates land
  const { lcp, cls, fcp } = await page.evaluate(() => ({ lcp: window.__lcp, cls: window.__cls, fcp: performance.getEntriesByName("first-contentful-paint")[0]?.startTime || 0 }));
  const mb = bytes / 1024 / 1024;
  const summary = `${ti.project.name}: FCP ${Math.round(fcp)} ms · LCP ${Math.round(lcp)} ms · CLS ${cls.toFixed(3)} · load ${loadMs} ms · ${mb.toFixed(2)} MB`;
  console.log(summary);
  await ti.attach("web-vitals", { body: summary, contentType: "text/plain" });

  // "good" thresholds from web.dev; phones get the throttled budget
  expect(cls, summary).toBeLessThan(0.1);
  expect(lcp, summary).toBeLessThan(phone ? 4000 : 2500);
  expect(mb, summary).toBeLessThan(phone ? 4 : 6);
});
