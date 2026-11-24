// End-to-end user journeys on the public site, run on every device project.
const { test, expect } = require("@playwright/test");
const { watch, visit, noHorizontalScroll, isMobile, settleSpin } = require("./helpers");

const count = (page) => page.locator("#cartCount");

let issues = [];
test.beforeEach(async ({ page }) => {
  issues = watch(page); // every journey must also finish with zero console/JS/network errors
  await visit(page);
});
test.afterEach(async () => {
  expect(issues, issues.join("\n")).toEqual([]);
});

test("navegación: menú en píldora (desktop) o hamburguesa (celular)", async ({ page }, ti) => {
  if (isMobile(ti) || (ti.project.use.viewport?.width ?? 0) <= 860) {
    const burger = page.locator("#burger");
    if (!(await burger.isVisible())) test.skip(true, "sin hamburguesa en este ancho");
    await burger.click();
    await expect(page.locator("#mnav")).toBeVisible();
    await expect(burger).toHaveAttribute("aria-expanded", "true");
    expect(await page.evaluate(() => document.body.style.overflow)).toBe("hidden");
    await noHorizontalScroll(page);
    await page.locator("#mnav a[href='#carta']").click();
    await expect(page.locator("#mnav")).toBeHidden();
    expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
    // Esc also closes
    await burger.click(); await expect(page.locator("#mnav")).toBeVisible();
    await page.keyboard.press("Escape"); await expect(page.locator("#mnav")).toBeHidden();
  } else {
    await page.locator("#pillMain a[href='#carta']").click();
  }
  await expect(page).toHaveURL(/#carta$/);
  await expect.poll(async () => (await page.locator("#carta").boundingBox()).y, { message: "la sección queda arriba, bajo el header" }).toBeLessThan(160);
  expect((await page.locator("#carta").boundingBox()).y).toBeGreaterThan(-5);
});

test("hero: puntos cambian de promo y 'Sumar al pedido' suma al carrito", async ({ page }) => {
  const dots = page.locator("#dots button");
  expect(await dots.count()).toBeGreaterThan(1);
  await dots.nth(1).click();
  await expect(page.locator(".slide").nth(1)).toHaveClass(/is-active/);
  await expect(dots.nth(1)).toHaveAttribute("aria-selected", "true");
  await page.locator(".slide.is-active [data-add]").first().click();
  await expect(count(page)).toHaveText("1");
});

test("hero: deslizar con el dedo cambia de promo", async ({ page }, ti) => {
  test.skip(!ti.project.use.hasTouch, "sólo táctil");
  const stack = page.locator(".slide.is-active");
  const box = await stack.boundingBox();
  await page.evaluate(({ x, y }) => {
    const el = document.elementFromPoint(x, y); const mk = (cx) => new Touch({ identifier: 1, target: el, clientX: cx, clientY: y });
    el.dispatchEvent(new TouchEvent("touchstart", { bubbles: true, touches: [mk(x)], changedTouches: [mk(x)] }));
    el.dispatchEvent(new TouchEvent("touchend", { bubbles: true, touches: [], changedTouches: [mk(x - 150)] }));
  }, { x: box.x + box.width * 0.75, y: box.y + box.height * 0.3 });
  await expect(page.locator(".slide").nth(1)).toHaveClass(/is-active/);
});

test("'¿Dónde querés tu pedido?' lleva al paso 2 del embudo", async ({ page }) => {
  const box = page.locator("#orderbox");
  await box.scrollIntoViewIfNeeded();
  await box.locator("label:has(input[value=pickup])").click();
  await box.locator("button[type=submit], [type=submit]").first().click();
  await expect(page.locator('.fstep[data-step="2"]')).toBeVisible();
  await expect(page.locator('#funnel input[name=intent][value=pickup]')).toBeChecked();
});

test("la carta gira: flechas, detalle y añadir al pedido", async ({ page }) => {
  const name = await settleSpin(page);
  const first = await name.textContent();
  await page.locator("#spinNext").click();
  await expect(name).not.toHaveText(first);
  await page.locator("#spinPrev").click();
  await expect(name).toHaveText(first);

  await page.locator("#spinCopy [data-detail]").click();
  const pd = page.locator("#pdetail");
  await expect(pd).toBeVisible();
  await expect(page.locator("#pdName")).toHaveText(first);
  await expect(page.locator("#pdX")).toBeFocused();
  await noHorizontalScroll(page);
  await page.locator(".pd__cta").click();
  await expect(pd).toBeHidden();
  await expect(count(page)).toHaveText("1");

  // Esc closes the detail too
  await page.locator("#spinCopy [data-detail]").click();
  await expect(pd).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(pd).toBeHidden();
});

test("la carta gira: categorías y teclado", async ({ page }, ti) => {
  const name = await settleSpin(page);
  const cats = page.locator("#spinCats button");
  expect(await cats.count()).toBeGreaterThan(1);
  const before = await name.textContent();
  await cats.nth(1).click();
  await expect(cats.nth(1)).toHaveAttribute("aria-pressed", "true");
  await expect(name).not.toHaveText(before);
  if (!ti.project.use.hasTouch) {
    const now = await name.textContent();
    await page.locator("#spinTable").focus();
    await page.keyboard.press("ArrowRight");
    await expect(name).not.toHaveText(now);
  }
});

test("la carta gira: arrastrar la mesa cambia de pizza", async ({ page }) => {
  const name = await settleSpin(page);
  const before = await name.textContent();
  const b = await page.locator("#spinTable").boundingBox();
  const y = b.y + b.height * 0.5;
  await page.mouse.move(b.x + b.width * 0.8, y);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(b.x + b.width * (0.8 - i * 0.06), y, { steps: 2 });
  await page.mouse.up();
  await expect(name).not.toHaveText(before, { timeout: 5000 });
});

test("carta completa: pestañas y '+' suman", async ({ page }) => {
  await page.locator("#menu").scrollIntoViewIfNeeded();
  const tabs = page.locator("#tabs [role=tab]");
  expect(await tabs.count()).toBeGreaterThan(1);
  await tabs.nth(1).click();
  await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
  await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "false");
  await page.locator("#menuPanels [data-add]:visible").first().click();
  await expect(count(page)).toHaveText("1");
});

test("carrito: abrir, sumar, quitar y seguir al embudo", async ({ page }) => {
  await page.locator("#menu").scrollIntoViewIfNeeded();
  await page.locator("#menuPanels [data-add]:visible").first().click();
  await expect(count(page)).toHaveText("1");
  await page.locator("#cartBtn").click(); // the docked header keeps the cart reachable while scrolled
  const drawer = page.locator("#drawer");
  await expect(drawer).toBeVisible();
  await expect(page.locator("#drawerX")).toBeFocused();
  await noHorizontalScroll(page);
  await drawer.locator("[data-q='1']").first().click();
  await expect(drawer.locator(".qty span").first()).toHaveText("2");
  await expect(count(page)).toHaveText("2");
  const total = await page.locator("#drawerTotal").textContent();
  expect(total).toMatch(/\d/);
  await page.locator("#drawerGo").click();
  await expect(drawer).toBeHidden();
  await expect(page.locator('.fstep[data-step="2"]')).toBeVisible();
  await expect(page.locator("#fCart")).toContainText(total.trim());

  // empty it again from the drawer
  await page.locator("#cartBtn").click();
  await drawer.locator("[data-q='-1']").first().click();
  await drawer.locator("[data-q='-1']").first().click();
  await expect(drawer.locator(".empty")).toBeVisible();
  await expect(count(page)).toBeHidden();
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
});

test("carrito persiste al recargar", async ({ page }) => {
  await page.locator("#menu").scrollIntoViewIfNeeded();
  await page.locator("#menuPanels [data-add]:visible").first().click();
  await page.locator("#menuPanels [data-add]:visible").nth(1).click();
  await expect(count(page)).toHaveText("2");
  await page.reload();
  await expect(count(page)).toHaveText("2");
});

test("embudo: validaciones guían al usuario", async ({ page }) => {
  const F = page.locator("#funnel");
  await F.scrollIntoViewIfNeeded();
  await F.locator('.fstep[data-step="1"] [data-next]').click();
  await expect(F.locator('.fstep[data-step="2"]')).toBeVisible();
  await F.locator('.fstep[data-step="2"] [data-next]').click();
  await expect(page.locator("#fMsg")).toHaveText(/al menos una/);
  await F.locator("#fPicker .pk__add").first().click();
  await expect(page.locator("#fMsg")).toHaveText("");
  await F.locator('.fstep[data-step="2"] [data-next]').click();
  await expect(F.locator('.fstep[data-step="3"]')).toBeVisible();
  await F.locator('.fstep[data-step="3"] [data-next]').click();
  await expect(page.locator("#fMsg")).toHaveText(/llamás/);
  await expect(F.locator("[name=name]")).toBeFocused();
});

test("embudo completo: delivery → WhatsApp con el pedido correcto", async ({ page }) => {
  const F = page.locator("#funnel");
  await F.scrollIntoViewIfNeeded();
  await F.locator('.fstep[data-step="1"] [data-next]').click();
  const add = F.locator("#fPicker .pk__add").first();
  const itemLabel = await add.getAttribute("aria-label"); // "Sumar X, Bs N"
  const itemName = itemLabel.replace(/^Sumar /, "").replace(/, Bs.*$/, "");
  await add.click();
  await F.locator("#fPicker [data-q='1']").first().click();
  await expect(F.locator("#fPicker .stepper span")).toHaveText("2");
  await F.locator('.fstep[data-step="2"] [data-next]').click();

  await F.locator("[name=name]").fill("Marta QA");
  await F.locator("[name=address]").fill("Av. Banzer 4to anillo #123");
  await F.locator("[name=reference]").fill("Portón negro");
  await F.locator(".fseg label:has(input[value=later])").click();
  await F.locator("[name=time]").fill("20:30");
  await F.locator("[name=note]").fill("Sin orégano");
  await F.locator('.fstep[data-step="3"] [data-next]').click();

  const review = page.locator("#review");
  await expect(review).toBeVisible();
  await expect(review).toContainText("Marta QA");
  await expect(review).toContainText(itemName);
  await expect(review).toContainText("20:30");
  await noHorizontalScroll(page);

  const href = await page.locator("#sendWa").getAttribute("href");
  expect(href).toMatch(/^https:\/\/wa\.me\/\d+\?text=/);
  const text = decodeURIComponent(href.split("text=")[1]);
  for (const s of ["Marta QA", "Av. Banzer 4to anillo #123", "Portón negro", "Sin orégano", "20:30", itemName]) expect(text).toContain(s);
  expect(text).toMatch(/2\s*[×x]/);

  // Edit jumps back and keeps the data
  await review.locator("[data-goto='3']").first().click();
  await expect(F.locator("[name=name]")).toHaveValue("Marta QA");

  // sending hands the order to the CRM inbox
  await F.locator('.fstep[data-step="3"] [data-next]').click();
  await page.context().route(/wa\.me/, (r) => r.fulfill({ body: "ok" })); // never leave the test box
  page.context().on("page", (p) => p.close().catch(() => {}));
  await page.locator("#sendWa").click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("ugos_crm_inbox") || "[]").length)).toBe(1);
  const inbox = await page.evaluate(() => JSON.parse(localStorage.getItem("ugos_crm_inbox") || "[]"));
  expect(inbox[0].name).toBe("Marta QA");
});

test("embudo: recoger exige elegir sucursal", async ({ page }) => {
  const F = page.locator("#funnel");
  await F.scrollIntoViewIfNeeded();
  await F.locator(".icard:has(input[value=pickup])").click();
  await expect(F.locator('.fstep[data-step="2"]')).toBeVisible();
  await F.locator("#fPicker .pk__add").first().click();
  await F.locator('.fstep[data-step="2"] [data-next]').click();
  await F.locator("[name=name]").fill("Leo");
  await expect(F.locator("[name=address]")).toBeHidden();
  const cards = F.locator("#fBranchCards label");
  expect(await cards.count()).toBeGreaterThan(2);
  await cards.nth(1).click();
  await F.locator('.fstep[data-step="3"] [data-next]').click();
  await expect(page.locator("#review")).toBeVisible();
  await expect(page.locator("#sendWaT")).toContainText("Enviar a");
});

test("embudo: evento y consulta", async ({ page }) => {
  const F = page.locator("#funnel");
  await F.scrollIntoViewIfNeeded();
  await F.locator(".icard:has(input[value=event])").click();
  await expect(F.locator("[name=evPeople]")).toBeVisible();
  await F.locator("[name=evPeople]").fill("30");
  await F.locator("[name=evOcc]").fill("Cumple");
  await F.locator('.fstep[data-step="2"] [data-next]').click();
  await F.locator("[name=name]").fill("Ana");
  await F.locator('.fstep[data-step="3"] [data-next]').click();
  await expect(page.locator("#review")).toContainText("Cumple");
  const text = decodeURIComponent((await page.locator("#sendWa").getAttribute("href")).split("text=")[1]);
  expect(text).toContain("30");

  await page.locator("#stepsBar [data-goto='1']").click();
  await F.locator(".icard:has(input[value=question])").click();
  await expect(F.locator("[name=qTopic]")).toBeVisible();
  await F.locator("[data-open-chat]").click();
  await expect(page.locator("#chat")).toBeVisible();
});

test("Ugo·IA: abre, responde con aviso amable sin clave y se cierra", async ({ page }, ti) => {
  if (isMobile(ti)) {
    await page.locator("#menu").scrollIntoViewIfNeeded();
    await expect(page.locator("#mbar")).not.toHaveClass(/is-hidden/);
    await page.locator(".mbar__ai").click();
  } else {
    await page.locator("#fab").click();
  }
  const chat = page.locator("#chat");
  await expect(chat).toBeVisible();
  await expect(page.locator("#chatIn")).toBeFocused();
  await expect(page.locator("#chatLog .msg--bot").first()).toContainText("Ugo·IA");
  await expect(page.locator("#chatChips button").first()).toBeVisible();
  await noHorizontalScroll(page);
  const cb = await chat.boundingBox(); const vp = page.viewportSize();
  expect(cb.x).toBeGreaterThanOrEqual(0); expect(cb.x + cb.width).toBeLessThanOrEqual(vp.width + 1);
  expect(cb.y + cb.height).toBeLessThanOrEqual(vp.height + 1);
  await page.locator("#chatIn").fill("Quiero una pizza");
  await page.locator("#chatIn").press("Enter");
  await expect(page.locator("#chatLog .msg--me").last()).toHaveText("Quiero una pizza");
  await expect(page.locator("#chatLog .msg--bot").last()).toContainText("preparando");
  await page.locator("#chatX").click();
  await expect(chat).toBeHidden();
});

test("lightbox de promos: abre, avanza y cierra", async ({ page }) => {
  await page.locator("#promos").scrollIntoViewIfNeeded();
  await page.locator("#offersRail a").first().click();
  const box = page.locator("#lbox");
  await expect(box).toBeVisible();
  await expect(page.locator("#lboxX")).toBeFocused();
  const src1 = await page.locator("#lboxMedia img, #lboxMedia video").first().getAttribute("src");
  await page.locator("#lboxNext").click();
  await expect(page.locator("#lboxMedia img, #lboxMedia video").first()).not.toHaveAttribute("src", src1);
  await noHorizontalScroll(page);
  await page.keyboard.press("Escape");
  await expect(box).toBeHidden();
});

test("reels y combos abren en el lightbox", async ({ page }) => {
  for (const sel of ["#reelsRail a", "#ccards [data-lb]"]) {
    await page.locator(sel).first().scrollIntoViewIfNeeded();
    await page.locator(sel).first().click();
    await expect(page.locator("#lbox")).toBeVisible();
    await page.locator("#lboxX").click();
    await expect(page.locator("#lbox")).toBeHidden();
  }
});

test("franquicias: valida y abre WhatsApp con los datos", async ({ page }) => {
  await page.evaluate(() => { window.__opened = []; window.open = (u) => { window.__opened.push(u); return null; }; });
  const f = page.locator("#frForm");
  await f.scrollIntoViewIfNeeded();
  await f.locator("[type=submit]").click();
  await expect(page.locator("#frMsg")).toContainText("nombre");
  await f.locator("[name=name]").fill("Carlos");
  await f.locator("[name=phone]").fill("70000000");
  await f.locator("[name=city]").fill("Tarija");
  await f.locator("[type=submit]").click();
  await expect(page.locator("#frMsg")).toContainText("Listo");
  const opened = await page.evaluate(() => window.__opened);
  expect(opened.length).toBe(1);
  expect(opened[0]).toMatch(/^https:\/\/wa\.me\//);
  expect(decodeURIComponent(opened[0])).toContain("Tarija");
});

test("sucursales: horario en vivo y enlaces válidos", async ({ page }) => {
  await page.locator("#sucursales").scrollIntoViewIfNeeded();
  const cards = page.locator("#bgrid .bcard");
  expect(await cards.count()).toBeGreaterThanOrEqual(9);
  const links = await page.$$eval("#bgrid a", (as) => as.map((a) => a.href));
  for (const h of links) expect(h).toMatch(/^(https:\/\/(wa\.me|www\.google\.com\/maps|maps\.app\.goo\.gl|goo\.gl\/maps|maps\.google\.com)|tel:)/);
});

test("pie de página: grupos desplegables y enlaces", async ({ page }) => {
  await page.locator("#footer").scrollIntoViewIfNeeded();
  const groups = page.locator("#fgroups details");
  if ((await groups.count()) > 0) {
    await groups.first().locator("summary").click();
    await expect(groups.first()).toHaveAttribute("open", "");
  }
  expect(await page.locator("#ftrWa").getAttribute("href")).toMatch(/^https:\/\/wa\.me\//);
  expect(await page.locator("#ftrPhone").getAttribute("href")).toMatch(/^tel:/);
});
