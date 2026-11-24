// Back office (/crm): every screen renders cleanly on every device, plus the core order flows.
const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;
const { watch, overflowOffenders, isMobile } = require("./helpers");

const ROUTES = ["panel", "pedidos", "cocina", "delivery", "clientes", "personal", "leads", "sucursales", "inventario", "marketing", "reportes", "ajustes"];

let issues = [];
test.beforeEach(async ({ page }) => { issues = watch(page); });
test.afterEach(async () => { expect(issues, issues.join("\n")).toEqual([]); });

async function open(page, route) {
  await page.goto(`/crm#/${route}`);
  await expect(page.locator("#view")).not.toBeEmpty();
}

test("todas las pantallas cargan, sin scroll horizontal de página", async ({ page }, ti) => {
  for (const r of ROUTES) {
    await open(page, r);
    await expect(page.locator(`#nav a[href="#/${r}"]`)).toHaveClass(/is-on/);
    expect((await page.locator("#title").textContent()).trim().length, r).toBeGreaterThan(0);
    await page.waitForTimeout(150);
    const o = await overflowOffenders(page);
    expect(o.scrollW, `${r}: ${o.offenders.join(", ")}`).toBeLessThanOrEqual(o.W);
    await ti.attach(`crm-${r}`, { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
  }
});

test("menú lateral en el celular", async ({ page }, ti) => {
  test.skip(!isMobile(ti), "sólo celular");
  await open(page, "panel");
  const side = page.locator("#side");
  await expect(page.locator("#menuBtn")).toBeVisible();
  await page.locator("#menuBtn").click();
  await expect(side).toHaveClass(/is-open/);
  await page.locator('#nav a[href="#/clientes"]').click();
  await expect(side).not.toHaveClass(/is-open/);
  await expect(page).toHaveURL(/#\/clientes$/);
  await expect(page.locator("#title")).toContainText("Clientes");
});

test("pedidos: abrir detalle, avanzar estado y cerrar", async ({ page }) => {
  await open(page, "pedidos");
  const card = page.locator("#view .ocard").first();
  await expect(card).toBeVisible();
  const id = await card.getAttribute("data-id");
  await card.locator(".ocard__c").click();
  const drawer = page.locator("#drawer");
  await expect(drawer).toBeVisible();
  await expect(page.locator("#drawerT")).toHaveText(id);
  await page.waitForTimeout(400); // slide-in animation
  const box = await page.locator(".drawer__panel").boundingBox(); const vp = page.viewportSize();
  expect(box.x).toBeGreaterThanOrEqual(-1); expect(box.x + box.width).toBeLessThanOrEqual(vp.width + 1);
  const adv = drawer.locator("[data-adv]");
  if (await adv.count()) {
    const label = await adv.textContent();
    await adv.click();
    await expect(page.locator("#toast")).toContainText(id);
    if (/Camino/i.test(label)) await page.keyboard.press("Escape");
  }
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
  // keyboard users can open a card too
  await page.locator("#view .ocard").first().focus();
  await page.keyboard.press("Enter");
  await expect(drawer).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
});

test("nuevo pedido desde el punto de venta", async ({ page }) => {
  await open(page, "panel");
  if (!(await page.locator("#newOrderBtn").isVisible())) await page.locator("#menuBtn").click();
  await page.locator("#newOrderBtn").click();
  const modal = page.locator("#modal");
  await expect(modal).toBeVisible();
  await expect(page.locator("#posGo")).toBeDisabled();
  await modal.locator("[data-pi]").first().click();
  await modal.locator("[data-pi]").nth(1).click();
  await page.locator("#ncName").fill("Cliente QA");
  await page.locator("#ncPhone").fill("70011223");
  await modal.locator('[data-ps="pickup"]').click();
  await expect(page.locator("#posAddr")).toHaveCount(0);
  await expect(page.locator("#posGo")).toBeEnabled();
  await page.locator("#posGo").click();
  await expect(page.locator("#toast")).toContainText(/Pedido .* creado/);
  await expect(page).toHaveURL(/#\/pedidos$/);
  await expect(modal).toBeHidden();
});

test("los pedidos de la web entran solos al CRM", async ({ page }) => {
  await page.goto("/crm#/panel");
  await page.evaluate(() => {
    localStorage.setItem("ugos_crm_inbox", JSON.stringify([{ webId: "WQA1", at: Date.now(), name: "Pedido Web QA", address: "Av. QA", reference: "", pin: "", note: "", when: "asap", service: "delivery", branch: UGOS.branches[0].id, cart: { [Object.keys(UGOS.catalog())[0]]: 1 } }]));
  });
  await page.reload();
  await page.locator("#q").fill("Pedido Web");
  await expect(page.locator("#qres")).toContainText("Pedido Web QA");
});

test("búsqueda global", async ({ page }) => {
  await open(page, "panel");
  if (!(await page.locator("#q").isVisible())) test.skip(true, "buscador oculto en este ancho");
  await page.locator("#q").fill("zz-no-existe");
  await expect(page.locator("#qres")).toContainText("Sin resultados");
});

test("accesibilidad (axe) del panel y pedidos", async ({ page }) => {
  for (const r of ["panel", "pedidos"]) {
    await open(page, r);
    const res = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const bad = res.violations.filter((v) => ["critical", "serious"].includes(v.impact));
    const msg = bad.map((v) => `${r} ${v.impact} ${v.id}: ${v.help}\n   ${v.nodes.slice(0, 6).map((n) => n.target.join(" ")).join("\n   ")}`).join("\n");
    expect(bad.length, msg).toBe(0);
  }
});
