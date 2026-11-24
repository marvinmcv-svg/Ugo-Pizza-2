const { expect } = require("@playwright/test");

/* Collects console errors, page errors and failed same-origin requests for a page. */
function watch(page) {
  const issues = [];
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    // the assistant endpoint answers 503 on purpose when no API key is configured; the UI handles it
    if (/\/api\/ugoia/.test(m.location()?.url || "") && /503/.test(m.text())) return;
    issues.push(`console: ${m.text()} (${m.location()?.url || ""})`);
  });
  page.on("pageerror", (e) => issues.push(`pageerror: ${e.message}`));
  page.on("response", (r) => {
    const u = new URL(r.url());
    if (u.hostname === "localhost" && r.status() >= 400 && !u.pathname.startsWith("/api/")) issues.push(`http ${r.status()}: ${u.pathname}`);
  });
  page.on("requestfailed", (r) => {
    const u = new URL(r.url()); const err = r.failure()?.errorText || "";
    // media aborted by the browser when a video is paused / swapped is normal
    if (u.hostname === "localhost" && !/ERR_ABORTED/.test(err)) issues.push(`requestfailed: ${u.pathname} ${err}`);
  });
  return issues;
}

/* Fresh visit with storage cleared and the auto-advancing carousel/animations kept deterministic where needed. */
async function visit(page, path = "/") {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("load");
}

/* Scroll the whole page in viewport steps so lazy content, observers and reveals all fire. */
async function scrollThrough(page) {
  await page.evaluate(async () => {
    const step = Math.max(200, Math.floor(innerHeight * 0.8));
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); }
    scrollTo(0, document.documentElement.scrollHeight); await new Promise((r) => setTimeout(r, 300));
  });
}

/* Elements whose box sticks out past the right/left edge of the viewport (ignoring ones inside clipping or scroll containers). */
async function overflowOffenders(page) {
  return page.evaluate(() => {
    const W = document.documentElement.clientWidth; const out = [];
    const clipped = (el) => { for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) { const s = getComputedStyle(p); if (/(hidden|auto|scroll|clip)/.test(s.overflowX + s.overflow)) return true; } return false; };
    for (const el of document.querySelectorAll("body *")) {
      const s = getComputedStyle(el); if (s.display === "none" || s.visibility === "hidden" || s.position === "fixed") continue;
      const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
      if ((r.right > W + 1 || r.left < -1) && !clipped(el) && !el.closest("[hidden],[aria-hidden=true]")) out.push(`${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}.${[...el.classList].join(".")} [${Math.round(r.left)}..${Math.round(r.right)} / ${W}]`);
    }
    return { scrollW: document.documentElement.scrollWidth, W, offenders: out.slice(0, 15) };
  });
}

async function noHorizontalScroll(page) {
  const o = await overflowOffenders(page);
  expect(o.scrollW, `page scrolls sideways; offenders: ${o.offenders.join(", ")}`).toBeLessThanOrEqual(o.W);
}

/* The spinning table does one showcase lap the first time it is on screen; wait for it to come to rest. */
async function settleSpin(page) {
  await page.locator("#spinTable").scrollIntoViewIfNeeded();
  const name = page.locator("#spinCopy .spin__name");
  await expect(name).toBeVisible();
  await page.waitForTimeout(3900); // lap: 250 ms delay + 3.4 s eased turn
  let prev = ""; let same = 0;
  for (let i = 0; i < 60 && same < 4; i++) { const t = await name.textContent(); same = t === prev ? same + 1 : 0; prev = t; await page.waitForTimeout(250); }
  return name;
}

const isMobile = (testInfo) => (testInfo.project.use.viewport?.width ?? 1280) <= 760;
const isPhone = (testInfo) => !!testInfo.project.use.isMobile && (testInfo.project.use.viewport?.width ?? 1280) <= 760;

module.exports = { settleSpin, watch, visit, scrollThrough, overflowOffenders, noHorizontalScroll, isMobile, isPhone };
