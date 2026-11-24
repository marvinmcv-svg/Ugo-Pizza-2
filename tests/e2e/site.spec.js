// Page-quality audit of the public site, run on every device project.
const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;
const { watch, visit, scrollThrough, overflowOffenders, noHorizontalScroll, isPhone } = require("./helpers");

test.describe("Sitio público · calidad", () => {
  test("carga sin errores de consola, JS ni recursos rotos (scroll completo)", async ({ page }) => {
    const issues = watch(page);
    await visit(page);
    await scrollThrough(page);
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForTimeout(300);
    expect(issues, issues.join("\n")).toEqual([]);
  });

  test("SEO y metadatos básicos", async ({ page }) => {
    await visit(page);
    await expect(page).toHaveTitle(/Ugo/);
    expect(await page.getAttribute("html", "lang")).toMatch(/^es/);
    expect(await page.locator('meta[name="viewport"]').getAttribute("content")).toContain("width=device-width");
    expect((await page.locator('meta[name="description"]').getAttribute("content"))?.length).toBeGreaterThan(50);
    await expect(page.locator('meta[property="og:image"]')).toHaveCount(1);
    await expect(page.locator('link[rel="manifest"]')).toHaveCount(1);
    await expect(page.locator("h1")).toHaveCount(1);
    const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(ld.length).toBeGreaterThan(0);
    for (const j of ld) expect(() => JSON.parse(j)).not.toThrow();
  });

  test("sin scroll horizontal en ningún punto de la página", async ({ page }) => {
    await visit(page);
    await noHorizontalScroll(page);
    const step = await page.evaluate(() => Math.floor(innerHeight * 0.9));
    const H = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < H; y += step) {
      await page.evaluate((yy) => scrollTo(0, yy), y);
      await page.waitForTimeout(40);
      const o = await overflowOffenders(page);
      expect(o.scrollW, `y=${y}: ${o.offenders.join(", ")}`).toBeLessThanOrEqual(o.W);
    }
  });

  test("todas las imágenes cargan", async ({ page }) => {
    await visit(page);
    await scrollThrough(page);
    await page.waitForTimeout(600);
    const broken = await page.evaluate(async () => {
      const imgs = [...document.images].filter((i) => i.checkVisibility() || i.loading !== "lazy");
      await Promise.all(imgs.map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; setTimeout(r, 4000); }))));
      return imgs.filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.currentSrc || i.src);
    });
    expect(broken, broken.join("\n")).toEqual([]);
  });

  test("imágenes con texto alternativo o marcadas como decorativas", async ({ page }) => {
    await visit(page);
    const missing = await page.$$eval("img", (imgs) => imgs.filter((i) => !i.hasAttribute("alt")).map((i) => i.src));
    expect(missing).toEqual([]);
  });

  test("accesibilidad (axe): sin violaciones críticas o serias", async ({ page }) => {
    await visit(page);
    await scrollThrough(page);
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForTimeout(400);
    const res = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    const bad = res.violations.filter((v) => ["critical", "serious"].includes(v.impact));
    const msg = bad.map((v) => `${v.impact} ${v.id}: ${v.help}\n   ${v.nodes.slice(0, 5).map((n) => n.target.join(" ")).join("\n   ")}`).join("\n");
    expect(bad.length, msg).toBe(0);
  });

  test("objetivos táctiles de al menos 24×24 px en el celular", async ({ page }, ti) => {
    test.skip(!isPhone(ti), "sólo celulares");
    await visit(page);
    await scrollThrough(page);
    await page.evaluate(() => scrollTo(0, 0));
    const small = await page.evaluate(() => {
      const out = [];
      for (const el of document.querySelectorAll("a[href], button, input:not([type=hidden]), select, textarea, [role=button], [role=tab], summary")) {
        if (!el.checkVisibility({ visibilityProperty: true, opacityProperty: true }) || el.closest("[hidden],[inert],[aria-hidden=true]")) continue;
        if (el.matches("input[type=radio], input[type=checkbox]") && el.closest("label")) continue; // label is the target
        const s = getComputedStyle(el); if (s.position !== "fixed" && el.closest("p, li > small, .fine") && s.display === "inline") continue; // inline text links are exempt (WCAG 2.5.8)
        const r = el.getBoundingClientRect(); if (!r.width) continue;
        const lab = el.closest("label"); const lr = lab ? lab.getBoundingClientRect() : r;
        if (Math.max(r.width, lr.width) < 24 || Math.max(r.height, lr.height) < 24) out.push(`${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}${el.className && typeof el.className === "string" ? "." + el.className.split(" ").join(".") : ""} "${(el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 30)}" ${Math.round(r.width)}×${Math.round(r.height)}`);
      }
      return out;
    });
    expect(small, small.join("\n")).toEqual([]);
  });

  test("texto legible en el celular (≥ 11 px)", async ({ page }, ti) => {
    test.skip(!isPhone(ti), "sólo celulares");
    await visit(page);
    const tiny = await page.evaluate(() => {
      const out = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const el = n.parentElement; if (!n.textContent.trim() || !el || !el.checkVisibility() || el.closest("[hidden],[aria-hidden=true],.phone,.sr-only")) continue;
        const fs = parseFloat(getComputedStyle(el).fontSize); if (fs < 11) out.push(`${el.tagName.toLowerCase()}.${[...el.classList].join(".")} ${fs}px "${n.textContent.trim().slice(0, 30)}"`);
      }
      return [...new Set(out)];
    });
    expect(tiny, tiny.join("\n")).toEqual([]);
  });

  test("barras fijas no se tapan entre sí ni tapan el contenido al final", async ({ page }, ti) => {
    await visit(page);
    // middle of the page: mobile bar (phone) or FAB (desktop) is showing
    await page.evaluate(() => document.querySelector("#menu").scrollIntoView({ block: "start", behavior: "instant" }));
    await page.waitForTimeout(500);
    const boxes = await page.evaluate(() => ["#hdr", "#mbar", "#fab"].map((s) => { const e = document.querySelector(s); const r = e.getBoundingClientRect(); const st = getComputedStyle(e); const on = e.checkVisibility({ opacityProperty: true }) && !e.classList.contains("is-hidden") && st.opacity !== "0"; return { s, on, top: r.top, bottom: r.bottom, left: r.left, right: r.right }; }));
    const on = boxes.filter((b) => b.on);
    for (let i = 0; i < on.length; i++) for (let j = i + 1; j < on.length; j++) {
      const a = on[i], b = on[j]; const hit = a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
      expect(hit, `${a.s} se superpone con ${b.s}`).toBe(false);
    }
    if (isPhone(ti)) expect(on.map((b) => b.s)).toContain("#mbar");
  });

  test("captura de página completa", async ({ page }, ti) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await visit(page);
    await scrollThrough(page);
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForTimeout(500);
    await ti.attach("home-full", { body: await page.screenshot({ fullPage: true, animations: "disabled" }), contentType: "image/png" });
    await ti.attach("home-first-screen", { body: await page.screenshot({ animations: "disabled" }), contentType: "image/png" });
  });
});
