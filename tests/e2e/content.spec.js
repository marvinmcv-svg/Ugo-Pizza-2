// Content accuracy + layout alignment for the full site, run on every device project.
// The expected menu and branches below were copied from the official site
// (ugospizzas.com/menu and /ubicaciones, checked 2026-11-25): if js/data.js drifts, this fails.
const { test, expect } = require("@playwright/test");
const { watch, visit, isMobile } = require("./helpers");

const OFFICIAL_MENU = {
  "Ugo's": 65, Jamoneitor: 47, Napolitana: 44, Margarita: 44, Salchichona: 47, Chocluda: 49, "Brócoli Bacon": 48,
  "Bruto Tocino": 52, Salame: 52, Americana: 52, "Champiñón": 58, Hawaiana: 54, Cheeseburguer: 58, "Pollo Requesón": 58,
  "Strogonoff de Carne": 58, "Strogonoff de Pollo": 58, Mexicana: 60, "4 Quesos": 60,
};
const OFFICIAL_BRANCHES = {
  "Radial 27": "59176066200", Paragua: "59175662162", "Santos Dumont": "59176666551", Mechero: "59177030613", "Plan 3000": "59175657123",
  "Piraí": "59176046564", "Luján": "59175150007", "Doble Vía Km 6": "59169339933", "Villa 1ro de Mayo": "59176000301",
};

let issues;
test.beforeEach(async ({ page }) => { issues = watch(page); });
test.afterEach(async () => { expect(issues, issues.join("\n")).toEqual([]); });

test("carta: los 18 sabores con el precio oficial", async ({ page }) => {
  await visit(page);
  await page.locator("#tabs [role=tab]").first().click();
  const rows = await page.$$eval("#menuPanels .mitem", (els) => els.map((el) => [el.querySelector("h3").firstChild.textContent.trim(), Number(el.querySelector(".mitem__p").textContent.replace(/\D/g, ""))]));
  expect(Object.fromEntries(rows), "lo que se ve en la carta").toEqual(OFFICIAL_MENU);
  const data = await page.evaluate(() => Object.fromEntries(window.UGOS.menu.flatMap((c) => c.items).map((i) => [i.name, i.price])));
  expect(data).toEqual(OFFICIAL_MENU);
});

test("sucursales: las 9 con su WhatsApp oficial", async ({ page }) => {
  await visit(page);
  const data = await page.evaluate(() => Object.fromEntries(window.UGOS.branches.map((b) => [b.name, b.whatsapp])));
  expect(data).toEqual(OFFICIAL_BRANCHES);
  const cards = page.locator("#bgrid > *");
  await expect(cards).toHaveCount(9);
  for (const [name, wa] of Object.entries(OFFICIAL_BRANCHES)) {
    const card = cards.filter({ has: page.getByRole("heading", { name, exact: true }) });
    await expect(card).toHaveCount(1);
    await expect(card).toBeVisible();
    expect(await card.locator(`a[href*="wa.me/${wa}"]`).count(), name).toBeGreaterThan(0);
  }
});

test("hero: cada promo entra completa, debajo del header y sin taparse", async ({ page }) => {
  await visit(page);
  const n = await page.locator("#dots button").count();
  expect(n).toBeGreaterThanOrEqual(5);
  for (let i = 0; i < n; i++) {
    await page.locator("#dots button").nth(i).click();
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForTimeout(1200);
    const r = await page.evaluate(() => {
      const s = document.querySelector(".slide.is-active"); const W = document.documentElement.clientWidth;
      const hdr = document.querySelector("#hdr").getBoundingClientRect();
      const box = (e) => e.getBoundingClientRect();
      const imgs = [...s.querySelectorAll(".slide__media img")].map((im) => ({ src: im.getAttribute("src"), ok: im.complete && im.naturalWidth > 0, r: box(im) }));
      const copy = box(s.querySelector(".slide__copy")); const title = box(s.querySelector(".slide__t"));
      const terms = s.querySelector(".slide__terms"); const fab = document.querySelector("#fab");
      const fabOn = fab && fab.checkVisibility() && getComputedStyle(fab).display !== "none";
      return { W, hdrBottom: hdr.bottom, title, copy, imgs, terms: terms && box(terms), fab: fabOn ? box(fab) : null, termsText: terms?.textContent };
    });
    expect(r.title.top, `slide ${i}: el título queda debajo del header`).toBeGreaterThanOrEqual(r.hdrBottom - 1);
    expect(r.termsText?.length, `slide ${i}: letra chica`).toBeGreaterThan(5);
    for (const im of r.imgs.filter((x) => !/promo-/.test(x.src))) { // the poster fan is decorative and tilted on purpose
      expect(im.ok, `slide ${i}: ${im.src} cargó`).toBe(true);
      expect(im.r.left, `slide ${i}: ${im.src} no se corta a la izquierda`).toBeGreaterThanOrEqual(-1);
      expect(im.r.right, `slide ${i}: ${im.src} no se corta a la derecha`).toBeLessThanOrEqual(r.W + 1);
      expect(im.r.top, `slide ${i}: ${im.src} no queda bajo el header`).toBeGreaterThanOrEqual(r.hdrBottom - 1);
    }
    if (r.fab && r.terms) {
      const hit = r.terms.left < r.fab.right && r.fab.left < r.terms.right && r.terms.top < r.fab.bottom && r.fab.top < r.terms.bottom;
      expect(hit, `slide ${i}: la letra chica queda bajo el botón de Ugo·IA`).toBe(false);
    }
  }
});

test("el sabor único y la Caja Transformer", async ({ page }) => {
  await visit(page);
  await page.locator("#sabor").scrollIntoViewIfNeeded();
  await expect(page.locator("#sabor img")).toBeVisible();
  await expect(page.locator("#saborList li")).toHaveText([/Masa madre/, /Urucú/, /Salsa a la leña/]);
  await page.locator("#caja").scrollIntoViewIfNeeded();
  await expect(page.locator("#caja .caja__img")).toBeVisible();
  await expect.poll(() => page.locator("#caja .caja__img").evaluate((i) => i.complete && i.naturalWidth), { timeout: 10_000 }).toBeGreaterThan(0);
  await expect(page.locator("#cajaSteps li")).toHaveCount(3);
});

test("preguntas frecuentes: abren, cierran y llevan datos estructurados", async ({ page }) => {
  await visit(page);
  const qa = page.locator("#faqList details");
  await expect(qa).toHaveCount(8);
  const second = qa.nth(1);
  await second.locator("summary").scrollIntoViewIfNeeded();
  await expect(second.locator("p")).toBeHidden();
  await second.locator("summary").click();
  await expect(second.locator("p")).toBeVisible();
  await expect(second.locator("p")).toContainText("12:00 a 01:00");
  await second.locator("summary").click();
  await expect(second.locator("p")).toBeHidden();
  const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
  const faq = ld.map((j) => JSON.parse(j)).find((j) => j["@type"] === "FAQPage");
  expect(faq?.mainEntity).toHaveLength(8);
  await expect(page.locator("#faqWa")).toHaveAttribute("href", /wa\.me\/59160007071/);
});

test("redes: Instagram, TikTok y Facebook oficiales", async ({ page }) => {
  await visit(page);
  for (const href of ["https://www.instagram.com/ugos_pizza/", "https://www.tiktok.com/@ugospizza", "https://www.facebook.com/PizzaUgos"]) {
    const a = page.locator(`.socials a[href="${href}"]`);
    await expect(a).toHaveCount(1);
    await expect(a).toHaveAttribute("rel", /noopener/);
    await expect(page.locator(`.feed__social a[href="${href}"]`)).toHaveCount(1);
  }
});

test("todos los enlaces internos (#) apuntan a una sección que existe", async ({ page }) => {
  await visit(page);
  const missing = await page.evaluate(() => [...new Set([...document.querySelectorAll('a[href^="#"]')].map((a) => a.getAttribute("href")))]
    .filter((h) => h.length > 1 && !document.getElementById(h.slice(1))));
  expect(missing).toEqual([]);
});

test("al navegar a una sección, el header no tapa el título", async ({ page }) => {
  await visit(page);
  for (const id of ["menu", "combos", "sucursales", "preguntas", "caja"]) {
    await page.evaluate((i) => document.getElementById(i).scrollIntoView({ behavior: "instant" }), id);
    await page.waitForTimeout(350);
    const r = await page.evaluate((i) => {
      const h = document.querySelector(`#${i} h2`); const hdr = document.querySelector("#hdr").getBoundingClientRect();
      return { h: h.getBoundingClientRect().top, hdr: hdr.bottom };
    }, id);
    expect(r.h, `#${id}`).toBeGreaterThanOrEqual(r.hdr - 2);
  }
});

test("formulario de franquicias: campos alineados en cada fila", async ({ page }, ti) => {
  await visit(page);
  await page.locator("#frForm").scrollIntoViewIfNeeded();
  const rows = await page.$$eval("#frForm .frform__row", (rs) => rs.map((r) => [...r.querySelectorAll("input")].map((i) => Math.round(i.getBoundingClientRect().top))));
  if (!isMobile(ti)) for (const tops of rows) expect(Math.max(...tops) - Math.min(...tops), `inputs ${tops}`).toBeLessThanOrEqual(1);
  const widths = await page.$$eval("#frForm input", (is) => is.map((i) => Math.round(i.getBoundingClientRect().width)));
  expect(new Set(widths).size, `anchos ${widths}`).toBe(1);
});

test("combos: grilla sin huecos (el último queda centrado si sobra)", async ({ page }) => {
  await visit(page);
  await page.locator("#ccards").scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  const r = await page.evaluate(() => {
    const g = document.querySelector("#ccards").getBoundingClientRect(); const items = [...document.querySelectorAll("#ccards > .cposter")].map((e) => e.getBoundingClientRect());
    const rows = {}; for (const b of items) (rows[Math.round(b.top)] ||= []).push(b);
    const last = Object.values(rows).pop(); const full = Object.values(rows)[0].length;
    const mid = (Math.min(...last.map((b) => b.left)) + Math.max(...last.map((b) => b.right))) / 2;
    return { count: items.length, full, lastN: last.length, off: Math.abs(mid - (g.left + g.right) / 2) };
  });
  expect(r.count).toBe(9);
  if (r.lastN < r.full) expect(r.off, "la última fila incompleta va centrada").toBeLessThan(4);
});

test("página 404 propia, robots.txt y sitemap.xml", async ({ page, request }) => {
  issues.length = 0;
  const res = await page.goto("/esta-pagina-no-existe");
  expect(res.status()).toBe(404);
  await expect(page.locator("h1")).toContainText("404");
  await expect(page.locator('a[href="/"]')).toBeVisible();
  const robots = await request.get("/robots.txt"); expect(robots.ok()).toBe(true);
  expect(await robots.text()).toContain("Sitemap:");
  const sm = await request.get("/sitemap.xml"); expect(sm.ok()).toBe(true);
  expect(await sm.text()).toContain("<urlset");
  issues.length = 0; // the 404 response itself is the point of this test
});

test("todas las secciones visibles y con contenido después de hacer scroll", async ({ page }) => {
  await visit(page);
  // jump through the page in big instant steps, like a fast fling (smooth scrolling would still be travelling)
  await page.evaluate(async () => {
    document.documentElement.style.scrollBehavior = "auto";
    for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight * 2.5) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); }
    scrollTo(0, document.documentElement.scrollHeight); await new Promise((r) => setTimeout(r, 600));
  });
  const empty = await page.$$eval("main > section:not([hidden])", (ss) => ss.filter((s) => s.getBoundingClientRect().height < 80 || !s.textContent.trim()).map((s) => s.id));
  expect(empty).toEqual([]);
  const stuck = await page.$$eval(".reveal:not(.is-in)", (els) => els.map((e) => e.className));
  expect(stuck, "elementos que nunca aparecieron").toEqual([]);
});
