/* Ugo's Pizza — site behaviour + Ugo·IA chat/voice UI. Vanilla, no build. */
(function () {
  "use strict";
  const U = window.UGOS;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = U.money;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const now = () => U.localNow();
  const today = now();
  const CAT = U.catalog(today.date);
  const yapaOn = U.yapaActive(today.date);
  const allPizzas = U.menu.flatMap((c) => c.items.map((it) => ({ ...it, cat: c.id })));
  const store = {
    get(k, d, s = localStorage) { try { const v = s.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v, s = localStorage) { try { s.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
  };
  const SLICE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l9 17H3z"/><circle cx="10" cy="13" r="1.2"/><circle cx="14" cy="16" r="1.2"/></svg>';

  /* ====================== CART ====================== */
  let cart = sanitizeCart(store.get("ugos_cart", {}));
  function sanitizeCart(c) { const o = {}; for (const [id, q] of Object.entries(c || {})) { const n = Math.min(50, Math.floor(Number(q) || 0)); if (CAT[id] && n > 0) o[id] = n; } return o; }
  function setCart(next, { silent } = {}) {
    cart = sanitizeCart(next); store.set("ugos_cart", cart); renderCart(); if (!silent) bumpCount();
  }
  function addToCart(id, qty = 1) {
    const it = CAT[id]; if (!it) return;
    const c = { ...cart }; c[id] = (c[id] || 0) + qty; setCart(c);
    toast(`${it.name} sumada al pedido 🍕`);
  }
  function bumpCount() { const el = $("#cartCount"); el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); }
  function renderCart() {
    const { lines, total } = U.priceCart(cart, today.date);
    const n = lines.reduce((a, l) => a + l.qty, 0);
    const cc = $("#cartCount"); cc.textContent = n; cc.hidden = !n;
    $("#drawerTotal").textContent = money(total);
    $("#drawerBody").innerHTML = lines.length ? lines.map((l) => `
      <div class="line"><div><b>${esc(l.name)}</b><small>${money(l.price)} c/u</small></div>
      <div class="qty"><button data-q="-1" data-id="${esc(l.id)}" aria-label="Quitar uno de ${esc(l.name)}">−</button><span>${l.qty}</span><button data-q="1" data-id="${esc(l.id)}" aria-label="Agregar uno de ${esc(l.name)}">+</button></div></div>`).join("")
      : `<div class="empty"><img src="assets/img/ugo-espiando.webp" width="1100" height="638" alt=""><p>Tu pedido está vacío.<br>¡Girá la carta y elegí, hermoso!</p><a class="btn btn--red" href="#carta" data-close-drawer>Ver la carta</a></div>`;
    $("#drawerGo").hidden = !lines.length;
    const mc = $("#mbarCart"); mc.hidden = !n; mc.textContent = `🛒 ${n} · ${money(total)}`;
    renderFunnelCart();
  }
  document.addEventListener("click", (e) => {
    const add = e.target.closest("[data-add]"); if (add) { e.preventDefault(); addToCart(add.dataset.add); }
    const q = e.target.closest("[data-q]");
    if (q) { const c = { ...cart }; c[q.dataset.id] = (c[q.dataset.id] || 0) + Number(q.dataset.q); if (c[q.dataset.id] <= 0) delete c[q.dataset.id]; setCart(c, { silent: true }); }
    if (e.target.closest("[data-open-chat]")) { e.preventDefault(); openChat(); }
    if (e.target.closest("[data-close-drawer]")) closeDrawer();
  });

  /* drawer */
  let lastFocus = null;
  function openDrawer() { lastFocus = document.activeElement; $("#drawer").hidden = false; $("#scrim").hidden = false; $("#drawerX").focus(); updateBars(); }
  function closeDrawer() { $("#drawer").hidden = true; $("#scrim").hidden = true; if (lastFocus) lastFocus.focus(); updateBars(); }
  $("#cartBtn").addEventListener("click", openDrawer);
  $("#mbarCart").addEventListener("click", openDrawer);
  $("#drawerX").addEventListener("click", closeDrawer);
  $("#scrim").addEventListener("click", closeDrawer);
  $("#drawerGo").addEventListener("click", () => { closeDrawer(); gotoStep(2); });

  /* toast */
  let toastT;
  function toast(t) { const el = $("#toast"); el.textContent = t; el.classList.add("is-on"); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove("is-on"), 2600); }

  /* reveal */
  const ro = "IntersectionObserver" in window && !reduced ? new IntersectionObserver((ens) => ens.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("is-in"); ro.unobserve(en.target); } }), { threshold: .12 }) : null;
  function observeReveal() { $$(".reveal:not(.is-in)").forEach((el) => (ro ? ro.observe(el) : el.classList.add("is-in"))); }

  /* ====================== TICKER ====================== */
  (function ticker() {
    const cheapest = U.combos.reduce((a, c) => (c.price < a.price ? c : a), U.combos[0]);
    const items = [
      `Combos familiares <b>desde ${money(cheapest.price)}</b> · pizza + gaseosa`,
      yapaOn ? `Jamoneitor a <b>${money(U.yapa.price)}</b> por La Scoobyneta todo ${esc(U.yapa.month)}` : `La más vendida: <b>Cheeseburguer</b>`,
      todayPromo() || `La más vendida de Ugo's: <b>Cheeseburguer</b> 🍔🍕`,
      `Pedí por WhatsApp al <b>${esc(U.config.callCenter.slice(3))}</b> o en tu sucursal`,
    ];
    const one = items.map((t) => `<span class="ticker__item">${t}${SLICE}</span>`).join("");
    $("#tickerTrack").innerHTML = one + one;
  })();
  function todayPromo() { const w = (U.weekly || []).find((x) => x.day === today.dow); return w ? `Hoy ${esc(w.name)}: <b>${esc(w.title)}</b>` : ""; }

  /* ====================== NAV ====================== */
  const NAV = [["Promos", "#promos"], ["La carta", "#carta"], ["Combos", "#combos"], ["Pedir", "#pedir"], ["Sucursales", "#sucursales"], ["Historia", "#historia"]];
  const navHtml = NAV.map(([t, h]) => `<a href="${h}">${t}</a>`).join("") + `<a href="#" class="pill__ai" data-open-chat>Ugo·IA ✨</a>`;
  $("#pillMain").innerHTML = navHtml; $("#pillInline").innerHTML = navHtml; $("#mnavList").innerHTML = navHtml;
  const burger = $("#burger");
  burger.addEventListener("click", () => { const open = burger.getAttribute("aria-expanded") !== "true"; burger.setAttribute("aria-expanded", open); $("#mnav").hidden = !open; document.body.style.overflow = open ? "hidden" : ""; });
  $("#mnav").addEventListener("click", (e) => { if (e.target.closest("a")) { burger.setAttribute("aria-expanded", "false"); $("#mnav").hidden = true; document.body.style.overflow = ""; } });
  const hdr = $("#hdr");
  const onScroll = () => { hdr.classList.toggle("is-solid", scrollY > parseInt(getComputedStyle(document.documentElement).getPropertyValue("--tick")) || scrollY > 48); };
  addEventListener("scroll", onScroll, { passive: true }); onScroll();

  /* ====================== HERO ====================== */
  const star = U.combos.find((c) => c.star) || U.combos[0];
  const best = CAT.cheeseburguer;
  const slides = [
    { cls: "red", kicker: "Combo para compartir", t1: "2 Jamoneitor", t2: "+ Pepsi 2 L", price: star.price, desc: "Dos pizzas familiares de 8 porciones y la Pepsi de 2 litros.", add: star.id,
      media: `<img class="photo" src="assets/hero/slide-2-jamoneitor.webp" width="1000" height="750" alt="Dos pizzas Jamoneitor con Pepsi de 2 litros, 100 Bs" fetchpriority="high">
        <div class="sticker" aria-hidden="true"><svg viewBox="0 0 128 128"><defs><path id="stk" d="M64,64 m-50,0 a50,50 0 1,1 100,0 a50,50 0 1,1 -100,0"/></defs><circle cx="64" cy="64" r="63"/><text><textPath href="#stk">SÓLO PARA HERMOSOS · UGO'S PIZZA ·</textPath></text></svg><b>8<small>PORCIONES</small></b></div>`,
      terms: "Combos publicados en ugospizzas.com · en sucursal o por WhatsApp" },
    yapaOn && { cls: "cream", light: true, kicker: `Promo de ${U.yapa.month}`, t1: "Jamoneitor", t2: "por La Scoobyneta", price: U.yapa.price, desc: `<s>${money(U.yapa.regular)}</s> · sólo pidiendo por La Scoobyneta, primeras 100 pizzas del día.`, add: U.yapa.id,
      media: `<img class="photo" src="assets/img/pizza-jamoneitor.webp" width="760" height="543" alt="Pizza Jamoneitor"><span class="pricetag">¡Ahorrá ${money(U.yapa.regular - U.yapa.price)}!</span>`,
      terms: `Válido todo ${U.yapa.month} pidiendo por La Scoobyneta (76066200)` },
    { cls: "wine", kicker: "La más vendida", t1: "Cheese", t2: "burguer", price: best.price, desc: "Carne molida, tocino y cheddar sobre masa madre. Familiar de 8 porciones.", add: "cheeseburguer",
      bg: `<img src="assets/hero/cheeseburguer-hd.webp" alt="" width="576" height="1024">`,
      media: `<div class="reelcard"><video muted playsinline loop preload="none" poster="assets/hero/cheeseburguer-hd.webp" data-src="assets/hero/cheeseburguer-hd.mp4" width="576" height="1024"></video></div><div class="blob">¡Probá la más pedida!</div>`,
      terms: "Precio de carta · ugospizzas.com/menu" },
  ].filter(Boolean);
  $("#slides").innerHTML = slides.map((s, i) => `
    <article class="slide slide--${s.cls}${i === 0 ? " is-active" : ""}" ${i ? "inert" : ""} aria-roledescription="diapositiva" aria-label="${i + 1} de ${slides.length}" data-light="${s.light ? 1 : 0}">
      <div class="slide__bg">${s.bg || ""}</div>
      <div class="slide__in wrap">
        <div class="slide__copy">
          <span class="kicker">${esc(s.kicker)}</span>
          <h2 class="slide__t">${esc(s.t1)}<span>${esc(s.t2)}</span></h2>
          <div class="price"><span class="price__cur">Bs</span><span class="price__n">${s.price}</span><span class="price__d">${s.desc}</span></div>
          <div class="ctas"><button class="btn btn--mustard btn--lg" data-add="${esc(s.add)}">Sumar al pedido</button><a class="btn ${s.light ? "btn--outline" : "btn--ghost"} btn--lg" href="#carta">Ver la carta</a></div>
        </div>
        <div class="slide__media">${s.media}</div>
      </div>
    </article>`).join("");
  const slideEls = $$(".slide"); const dotsEl = $("#dots"); const hero = $(".hero");
  dotsEl.innerHTML = slides.map((s, i) => `<button role="tab" aria-selected="${i === 0}" aria-label="Promo ${i + 1}: ${esc(s.t1)}"></button>`).join("");
  let cur = 0, timer = null, paused = false, heroVisible = true;
  function go(i) {
    cur = (i + slides.length) % slides.length;
    slideEls.forEach((el, k) => { const on = k === cur; el.classList.toggle("is-active", on); el.inert = !on; });
    $$("button", dotsEl).forEach((d, k) => d.setAttribute("aria-selected", k === cur));
    $("#terms").textContent = slides[cur].terms;
    const light = !!slides[cur].light; hdr.classList.toggle("on-light", light); hero.classList.toggle("on-light", light);
    syncHeroVideo();
  }
  function syncHeroVideo() {
    slideEls.forEach((el, k) => { const v = $("video", el); if (!v) return; if (k === cur && heroVisible) { if (!v.src) v.src = v.dataset.src; v.play().catch(() => {}); } else v.pause(); });
  }
  function auto() { clearInterval(timer); if (reduced) return; timer = setInterval(() => { if (!paused && !document.hidden) go(cur + 1); }, 6500); }
  dotsEl.addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) { go($$("button", dotsEl).indexOf(b)); auto(); } });
  dotsEl.addEventListener("keydown", (e) => { if (e.key === "ArrowRight" || e.key === "ArrowLeft") { go(cur + (e.key === "ArrowRight" ? 1 : -1)); $$("button", dotsEl)[cur].focus(); auto(); } });
  const stack = $("#slides");
  stack.addEventListener("mouseenter", () => (paused = true)); stack.addEventListener("mouseleave", () => (paused = false));
  hero.addEventListener("focusin", () => (paused = true)); hero.addEventListener("focusout", () => (paused = false));
  let tx = null;
  stack.addEventListener("touchstart", (e) => (tx = e.touches[0].clientX), { passive: true });
  stack.addEventListener("touchend", (e) => { if (tx == null) return; const dx = e.changedTouches[0].clientX - tx; if (Math.abs(dx) > 50) { go(cur + (dx < 0 ? 1 : -1)); auto(); } tx = null; });
  new IntersectionObserver(([en]) => { heroVisible = en.isIntersecting; syncHeroVideo(); }, { threshold: .2 }).observe(hero);
  go(0); auto();
  if (!store.get("ugos_qr_hidden", false, sessionStorage)) $("#qrCard").hidden = false; else $("#qrCard").hidden = true;
  $("#qrX").addEventListener("click", () => { $("#qrCard").hidden = true; store.set("ugos_qr_hidden", true, sessionStorage); });

  /* ====================== BRANCH STATUS ====================== */
  function statusLine() {
    const st = U.branchStatus(now()); const n = U.branches.length;
    if (st.open) return { open: true, html: `<span class="dot"></span><span><b>${n} de ${n}</b> sucursales abiertas ahora</span>`, short: `${n} de ${n} abiertas` };
    return { open: false, html: `<span class="dot is-off"></span><span>${st.today ? `Abrimos hoy a las ${st.opens}` : `Volvemos mañana desde las ${st.opens}`}</span>`, short: st.today ? `Abrimos ${st.opens}` : "Cerrado ahora" };
  }
  function stLabel(st) {
    return { open: ["open", "Abierto"], closing: ["closing", `Cierra ${st.closes}`], opens: ["opens", `Abre ${st.opens}`], closed: ["closed", "Cerrado"] }[st.state];
  }
  function branchOptions(withExtras) {
    const st = U.branchStatus(now()); const [, lbl] = stLabel(st);
    let o = U.branches.map((b) => `<option value="${esc(b.id)}">${esc(b.name)} · ${esc(lbl)}</option>`).join("");
    if (withExtras) o += `<option value="${esc(U.delivery.id)}">${esc(U.delivery.name)} · delivery</option><option value="callcenter">Call center · consultas generales</option>`;
    return o;
  }
  function renderStatus() {
    const s = statusLine();
    $("#openNowTxt").textContent = s.short; $("#openNow .dot").classList.toggle("is-off", !s.open);
    $("#obStatus").innerHTML = s.html;
    const st = U.branchStatus(now()); const [cls, lbl] = stLabel(st);
    $("#nowPill").innerHTML = `<span class="dot ${st.open ? "" : "is-off"}"></span>${esc(now().hhmm)} en Santa Cruz · <b>${st.open ? U.branches.length : 0} de ${U.branches.length}</b> abiertas`;
    $("#bgrid").innerHTML = U.branches.map((b) => `
      <article class="bcard reveal">
        <span class="st st--${cls}"><span class="dot"></span>${esc(lbl)}</span>
        <h3>${esc(b.name)}</h3>
        <p>${esc(b.address)}</p>
        <p><small>${esc(U.hoursText())}</small></p>
        <div class="bcard__links"><a href="${esc(b.maps)}" target="_blank" rel="noopener">Cómo llegar ↗</a><a href="${esc(U.waUrl(b.whatsapp, `¡Hola Ugo's ${b.name}! 😎`))}" target="_blank" rel="noopener">WhatsApp ${esc(b.whatsapp.slice(3))}</a></div>
      </article>`).join("");
    const keep = (sel) => { const el = $(sel); const v = el.value; el.innerHTML = branchOptions(sel === "#fBranch"); if (v) el.value = v; };
    keep("#obBranch"); keep("#fBranch");
    observeReveal();
  }
  renderStatus(); setInterval(renderStatus, 60000);
  $("#scoobyLink").href = U.waUrl(U.delivery.whatsapp, "¡Hola Scoobyneta! 🚌 Quiero hacer un pedido");

  /* order box → funnel */
  $("#orderbox").addEventListener("submit", (e) => {
    e.preventDefault();
    const intent = $("input[name=ob-intent]:checked").value;
    $(`#funnel input[name=intent][value=${intent}]`).checked = true;
    $("#fBranch").value = $("#obBranch").value;
    gotoStep(2); $("#pedir").scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
  });

  /* ====================== RAILS ====================== */
  $("#offersRail").innerHTML = U.offers.map((o) => `<a href="${esc(o.href)}" target="_blank" rel="noopener"><img src="${esc(o.img)}" width="900" height="1125" alt="${esc(o.alt)}" loading="lazy"></a>`).join("");
  $$("[data-rail]").forEach((b) => b.addEventListener("click", () => { const r = $("#" + b.dataset.rail); r.scrollBy({ left: Number(b.dataset.dir) * r.clientWidth * .8, behavior: reduced ? "auto" : "smooth" }); }));
  function railArrows() { const r = $("#offersRail"); $(".rail-btn--l").classList.toggle("is-off", r.scrollLeft < 10); $(".rail-btn--r").classList.toggle("is-off", r.scrollLeft + r.clientWidth >= r.scrollWidth - 10); }
  $("#offersRail").addEventListener("scroll", railArrows, { passive: true }); addEventListener("resize", railArrows); railArrows();

  /* ====================== WEEKLY (only if data has it) ====================== */
  if (U.weekly && U.weekly.length) {
    const w = $("#semana"); w.hidden = false;
    const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const list = [...U.weekly].sort((a, b) => (a.day === today.dow ? -1 : b.day === today.dow ? 1 : 0));
    w.innerHTML = `<div class="wrap"><div class="shead"><p class="eyebrow">Promos de la semana</p><h2 class="display">Cada día, <span class="hl">su promo</span></h2></div><div class="wgrid">${list.map((p) => `<article class="wcard${p.day === today.dow ? " is-today" : ""}"><b>${days[p.day]}</b><h3>${esc(p.title)}</h3><p>${esc(p.desc)}</p><span>${money(p.price)}</span></article>`).join("")}</div></div>`;
  }

  /* ====================== SPIN: la carta gira ====================== */
  const Spin = (function () {
    const table = $("#spinTable"), wrap = $("#spinPizzas"), disc = $("#boardDisc"), copy = $("#spinCopy");
    const N = allPizzas.length; const STEP = 46 * Math.PI / 180; const TILT = 64 * Math.PI / 180;
    let pos = 0, target = 0, raf = 0, shown = -1, geo = {};
    wrap.innerHTML = allPizzas.map((p, i) => `<button class="pz" data-i="${i}" tabindex="-1" aria-label="${esc(p.name)}"><img src="${esc(p.img)}" width="760" height="543" alt="" ${i > 2 && i < N - 2 ? 'loading="lazy"' : ""} draggable="false"></button>`).join("");
    const els = $$(".pz", wrap);
    els.forEach((el) => { const img = $("img", el); const set = () => { el._ar = img.naturalHeight / img.naturalWidth || .71; render(); }; img.complete ? set() : img.addEventListener("load", set); });
    function measure() {
      const W = table.clientWidth, H = table.clientHeight, m = W < 640;
      const R = m ? W * .62 : Math.min(W * .5, H * .95);
      geo = { W, H, R, ry: R * Math.cos(TILT), cx: W / 2, cy: H * (m ? .36 : .38), pw: m ? W * .66 : Math.min(W * .58, H * 1.0) };
      const bd = R * 2.15;
      disc.style.setProperty("--bd", bd + "px"); disc.parentElement.style.top = geo.cy + geo.ry * .18 + "px";
      wrap.style.setProperty("--pw", geo.pw + "px");
      render();
    }
    const wrapD = (d) => { d = ((d % N) + N) % N; return d > N / 2 ? d - N : d; };
    function render() {
      const { R, ry, cx, cy, pw } = geo;
      els.forEach((el, i) => {
        const th = wrapD(i - pos) * STEP; const a = Math.abs(th);
        if (a > 2.1) { el.style.visibility = "hidden"; return; }
        el.style.visibility = "visible";
        const c = Math.cos(th), depth = (1 + c) / 2, s = .34 + .66 * Math.pow(depth, 1.7);
        const x = cx + R * Math.sin(th), y = cy + ry * c; const h = pw * (el._ar || .71);
        el.style.transform = `translate(${x - pw / 2}px, ${y - h * .8}px) scale(${s})`;
        el.style.zIndex = 100 + Math.round(depth * 100);
        el.style.filter = `brightness(${.3 + .7 * depth * depth})`;
        el.style.opacity = Math.max(0, Math.min(1, (2.1 - a) / .45));
        el.classList.toggle("is-front", a < STEP / 2);
      });
      disc.style.setProperty("--rot", (-pos * 46) + "deg");
      const idx = ((Math.round(pos) % N) + N) % N;
      if (idx !== shown) { shown = idx; showCopy(idx); }
    }
    function tick() {
      const d = target - pos;
      if (Math.abs(d) < .001 || reduced) { pos = target; render(); raf = 0; return; }
      pos += d * .12; render(); raf = requestAnimationFrame(tick);
    }
    function to(t) { target = t; if (!raf) raf = requestAnimationFrame(tick); }
    function step(n) { to(Math.round(target) + n); }
    function current() { return ((Math.round(target) % N) + N) % N; }
    function goTo(i) { const d = wrapD(i - Math.round(target)); to(Math.round(target) + d); }

    function ingredients(desc) {
      return desc.replace(/\.$/, "").split(/,\s*|\s+y\s+/).map((s) => s.trim()).filter(Boolean)
        .filter((s) => !/^(masa madre|salsa de tomate a la leña|mozzarella)$/i.test(s));
    }
    function badges(p) {
      return [p.star && `<span class="badge badge--star">La más vendida</span>`, p.signature && `<span class="badge">De la casa</span>`, p.veg && `<span class="badge badge--veg">Sin carne</span>`, p.hot && `<span class="badge">Nueva</span>`,
        yapaOn && p.id === U.yapa.ref && `<span class="badge">${money(U.yapa.price)} por Scoobyneta</span>`].filter(Boolean).join("");
    }
    function showCopy(i) {
      const p = allPizzas[i]; const ing = ingredients(p.desc);
      copy.innerHTML = `
        <p class="spin__n anim">${String(i + 1).padStart(2, "0")} <i></i> ${String(N).padStart(2, "0")}</p>
        <div class="spin__badges anim">${badges(p)}</div>
        <h3 class="spin__name anim">${esc(p.name)}</h3>
        <p class="spin__desc anim">${esc(p.desc)}</p>
        <ul class="ichips anim">${ing.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
        <div class="spin__buy anim"><span class="spin__price"><small>Bs</small>${p.price}</span><button class="btn btn--red" data-detail="${i}">Ver y pedir</button><button class="plus" data-add="${esc(p.id)}" aria-label="Sumar ${esc(p.name)} al pedido">+</button></div>`;
      $("#spinCount").textContent = `${String(i + 1).padStart(2, "0")} / ${N}`;
    }

    /* detail panel */
    let pdLast = null;
    function openDetail(i) {
      const p = allPizzas[i]; const ing = ingredients(p.desc);
      const combo = U.combos.find((c) => c.parts.length === 1 && c.parts[0] === p.id) || U.combos.find((c) => c.parts.includes(p.id));
      const promo = yapaOn && U.yapa.ref === p.id;
      $("#pdBody").innerHTML = `
        <img class="pd__img" src="${esc(p.img)}" width="760" height="543" alt="Pizza ${esc(p.name)}">
        <p class="pd__n">${String(i + 1).padStart(2, "0")} / ${N}</p>
        <h3 id="pdName">${esc(p.name)}</h3>
        <p class="pd__note">${esc(p.desc)}</p>
        <p class="pd__lbl">Ingredientes</p>
        <ul class="ichips">${["Masa madre", "Salsa de tomate a la leña", "Mozzarella", ...ing].map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
        <p class="pd__lbl">Alérgenos</p>
        <p class="pd__note">No tenemos la información de alérgenos publicada. Si tenés alguna alergia, consultá en tu sucursal antes de pedir.</p>
        <p class="pd__lbl">Tamaño</p>
        <div class="sizes"><button aria-pressed="true">${esc(U.sizes.familiar)}<span>${money(p.price)}</span></button></div>
        ${promo ? `<div class="pd__combo"><div><b>${money(U.yapa.price)} por La Scoobyneta</b><br><small>${esc(U.yapa.note)}</small></div><button class="btn btn--mustard" data-add="${esc(U.yapa.id)}">Sumar</button></div>` : ""}
        ${combo ? `<div class="pd__combo"><img src="${esc(combo.img)}" width="720" height="540" alt=""><div><small>Combo</small><br><b>${esc(combo.name)}</b> · ${money(combo.price)}</div><button class="btn btn--mustard" data-add="${esc(combo.id)}">Sumar</button></div>` : ""}
        <button class="btn btn--red btn--lg btn--block pd__cta" data-add="${esc(p.id)}" data-close-pd>Añadir al pedido · ${money(p.price)}</button>`;
      pdLast = document.activeElement;
      $("#pdetail").hidden = false; $("#pdScrim").hidden = false; $("#pdX").focus(); updateBars();
    }
    function closeDetail() { $("#pdetail").hidden = true; $("#pdScrim").hidden = true; if (pdLast) pdLast.focus(); updateBars(); }
    $("#pdX").addEventListener("click", closeDetail); $("#pdScrim").addEventListener("click", closeDetail);
    $("#pdetail").addEventListener("click", (e) => { if (e.target.closest("[data-close-pd]") || e.target.closest("[data-add]")) setTimeout(closeDetail, 50); });
    copy.addEventListener("click", (e) => { const d = e.target.closest("[data-detail]"); if (d) openDetail(Number(d.dataset.detail)); });

    /* input: drag / swipe / keys */
    let drag = null;
    table.addEventListener("pointerdown", (e) => {
      if (e.button) return;
      drag = { x: e.clientX, y: e.clientY, p: pos, t: performance.now(), v: 0, lx: e.clientX, moved: false, id: e.pointerId, tgt: e.target.closest(".pz") };
      cancelAnimationFrame(raf); raf = 0; target = pos;
    });
    addEventListener("pointermove", (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x;
      if (!drag.moved && Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(e.clientY - drag.y)) { drag.moved = true; table.classList.add("is-drag"); try { table.setPointerCapture(e.pointerId); } catch (er) { /* */ } }
      if (!drag.moved) return;
      const per = geo.R * Math.sin(STEP) || 200;
      pos = drag.p - dx / per; target = pos; render();
      const t = performance.now(); drag.v = (e.clientX - drag.lx) / Math.max(1, t - drag.t); drag.lx = e.clientX; drag.t = t;
    });
    const end = (e) => {
      if (!drag || (e && e.pointerId !== drag.id)) return;
      table.classList.remove("is-drag");
      if (drag.moved) { const per = geo.R * Math.sin(STEP) || 200; to(Math.round(pos - drag.v * 160 / per)); }
      else if (drag.tgt) { const i = Number(drag.tgt.dataset.i); if (drag.tgt.classList.contains("is-front")) openDetail(i); else goTo(i); }
      drag = null;
    };
    addEventListener("pointerup", end); addEventListener("pointercancel", end);
    table.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") { e.preventDefault(); step(1); } else if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
      else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDetail(current()); }
    });
    $("#spinPrev").addEventListener("click", () => step(-1));
    $("#spinNext").addEventListener("click", () => step(1));
    addEventListener("resize", measure);
    measure();
    return { goTo: (id) => { const i = allPizzas.findIndex((p) => p.id === id); if (i >= 0) goTo(i); }, closeDetail, isOpen: () => !$("#pdetail").hidden };
  })();

  /* ====================== MONTHLY SPECIAL ====================== */
  if (yapaOn) {
    const y = U.yapa; const el = $("#yapa"); el.hidden = false;
    el.innerHTML = `<div class="wrap yapa__grid">
      <img class="yapa__img reveal" src="${esc(y.post)}" width="900" height="1125" alt="Llegó La Scoobyneta: Jamoneitor a 35 Bs" loading="lazy">
      <div class="reveal">
        <p class="eyebrow">Promo de ${esc(y.month)} · La Scoobyneta 🚌</p>
        <h2>Tu Jamoneitor a ${money(y.price)}</h2>
        <p class="lede">En vez de ${money(y.regular)}, si la pedís por La Scoobyneta, el delivery de Ugo's. Aplica para las primeras 100 pizzas del día, todos los días de ${esc(y.month)}.</p>
        <p class="bigprice"><small>Bs</small>${y.price}<s>${money(y.regular)}</s></p>
        <div class="ctas"><button class="btn btn--mustard btn--lg" data-add="${esc(y.id)}">Sumar al pedido</button><a class="btn btn--ghost btn--lg" href="${esc(U.waUrl(U.delivery.whatsapp, "¡Hola Scoobyneta! 🚌 Quiero mi Jamoneitor a 35 Bs"))}" target="_blank" rel="noopener">Llamar a La Scoobyneta</a></div>
        <p class="fine">Fuente: <a href="${esc(y.url)}" target="_blank" rel="noopener">post de @ugos_pizza</a> · válido hasta el 30 de ${esc(y.month)}.</p>
      </div></div>`;
  }

  /* ====================== MENU LIST ====================== */
  $("#menuSub").textContent = `Todas tamaño familiar de 8 porciones, con ${U.base}.`;
  $("#coins").innerHTML = `<div class="coin"><b>8</b><span>porciones<small>Tamaño familiar</small></span></div><div class="coin"><b>${allPizzas.length}</b><span>sabores en carta<small>ugospizzas.com/menu</small></span></div>`;
  const tabs = [{ id: "all", name: "Todas" }, ...U.menu.map((c) => ({ id: c.id, name: c.name })), { id: "veg", name: "Sin carne" }];
  $("#tabs").innerHTML = tabs.map((t, i) => `<button role="tab" aria-selected="${i === 0}" data-tab="${t.id}">${esc(t.name)}</button>`).join("");
  function renderMenu(tab) {
    const list = tab === "all" ? allPizzas : tab === "veg" ? allPizzas.filter((p) => p.veg) : allPizzas.filter((p) => p.cat === tab);
    $("#menuPanels").innerHTML = `<ul class="mlist" id="mlist">${list.map((p, i) => `
      <li class="mitem${i >= 6 ? " is-extra" : ""}">
        <img src="${esc(p.img)}" width="760" height="543" alt="" loading="lazy">
        <div><h3>${esc(p.name)}${p.star ? '<span class="badge badge--star">La más vendida</span>' : ""}${p.signature ? '<span class="badge">De la casa</span>' : ""}${p.veg ? '<span class="badge badge--veg">Sin carne</span>' : ""}</h3><p>${esc(p.desc)}</p></div>
        <div class="mitem__r"><span class="mitem__p">${money(p.price)}</span><button class="plus" data-add="${esc(p.id)}" aria-label="Sumar ${esc(p.name)}">+</button></div>
      </li>`).join("")}</ul>${list.length > 6 ? `<button class="btn btn--ghost more" id="moreBtn">Ver las ${list.length} ↓</button>` : ""}`;
    const mb = $("#moreBtn"); if (mb) { mb.addEventListener("click", () => { $("#mlist").classList.add("is-all"); mb.remove(); }); if (innerWidth > 760) mb.hidden = true; }
  }
  $("#tabs").addEventListener("click", (e) => { const b = e.target.closest("[data-tab]"); if (!b) return; $$("#tabs button").forEach((x) => x.setAttribute("aria-selected", x === b)); renderMenu(b.dataset.tab); });
  renderMenu("all");

  /* ====================== COMBOS + FEATURED ====================== */
  const comboShow = [...U.combos].sort((a, b) => (b.star ? 1 : 0) - (a.star ? 1 : 0));
  $("#ccards").innerHTML = comboShow.map((c, i) => `
    <article class="ccard${c.star ? " ccard--star" : ""} reveal"${i >= 4 ? ' data-more hidden' : ""}>
      <div class="ccard__ph"><img src="${esc(c.img)}" width="720" height="540" alt="${esc(c.name)}" loading="lazy">${c.tag ? `<span class="badge ccard__tag">${esc(c.tag)}</span>` : ""}</div>
      <div class="ccard__b"><h3>${esc(c.name)}</h3><p>${esc(c.note)}</p>
        <div class="ccard__f"><span class="ccard__p"><small>Bs</small>${c.price}</span><button class="plus" data-add="${esc(c.id)}" aria-label="Sumar ${esc(c.name)}">+</button></div></div>
    </article>`).join("") + `<button class="btn btn--ghost ccards-more" id="combosMore">Ver los ${U.combos.length} combos ↓</button>`;
  $("#combosMore").addEventListener("click", (e) => { $$("[data-more]").forEach((x) => (x.hidden = false)); e.currentTarget.remove(); });
  $("#featured").innerHTML = U.featured.filter((f) => CAT[f.ref]).map((f) => { const it = CAT[f.ref]; return `
    <article class="fcard reveal">
      <div class="fcard__m">${f.video ? `<video muted playsinline loop autoplay preload="none" poster="${esc(f.img)}" data-src="${esc(f.video)}.mp4" width="540" height="960"></video>` : `<img class="${/pizza-/.test(f.img) ? "cut" : ""}" src="${esc(f.img)}" width="760" height="543" alt="" loading="lazy">`}</div>
      <div class="fcard__b"><p class="eyebrow">${esc(f.tag)}</p><h3>${esc(f.name)}</h3><p>${esc(f.desc)}</p>
        <div class="ccard__f"><span class="ccard__p"><small>Bs</small>${it.price}</span><button class="plus" data-add="${esc(it.id)}" aria-label="Sumar ${esc(f.name)}">+</button></div></div>
    </article>`; }).join("");

  /* ====================== REELS + lazy videos ====================== */
  $("#reelsRail").innerHTML = U.reels.map((r) => `<a href="${esc(r.url)}" target="_blank" rel="noopener" aria-label="${esc(r.caption)} (abre Instagram)"><video muted playsinline loop preload="none" poster="${esc(r.src)}.webp" data-src="${esc(r.src)}.mp4" width="540" height="960"></video><span>${esc(r.caption)}</span></a>`).join("");
  const vio = new IntersectionObserver((ens) => ens.forEach((en) => {
    const v = en.target;
    if (en.isIntersecting && en.intersectionRatio >= .35 && !reduced) { if (!v.src) v.src = v.dataset.src; v.play().catch(() => {}); } else v.pause();
  }), { threshold: [0, .35, .6] });
  $$("#reelsRail video, .story video, .fcard video").forEach((v) => vio.observe(v));

  /* ====================== STORY / FEED / JOBS / FOOTER ====================== */
  const S = U.story;
  $("#storyCopy").innerHTML = `<p class="eyebrow">${esc(S.eyebrow)}</p><h2 class="display" id="storyT">${esc(S.title.split(" ").slice(0, 2).join(" "))} <span class="hl">${esc(S.title.split(" ").slice(2).join(" "))}</span></h2>
    <p>${esc(S.p1)}</p><p>${esc(S.p2)}</p><ul class="tline">${S.timeline.map((t) => `<li><b>${esc(t.k)}</b><span>${esc(t.v)}</span></li>`).join("")}</ul>
    <img class="story__seal" src="assets/img/hecho-bolivia.webp" width="400" height="400" alt="Sello: Hecho en Bolivia, consume lo nuestro" loading="lazy">`;
  $("#fgrid").innerHTML = U.feed.map((f) => `<a href="${esc(f.url)}" target="_blank" rel="noopener"><img src="${esc(f.img)}" width="900" height="1125" alt="${esc(f.alt)}" loading="lazy"></a>`).join("");
  $("#jobsT").textContent = U.jobs.title; $("#jobsP").textContent = U.jobs.text;
  $("#jobsBtn").href = U.waUrl(U.config.callCenter, U.jobs.wa);
  const groups = [
    ["Productos", [["La carta gira", "#carta"], ["Carta completa", "#menu"], ["Combos", "#combos"], ["La más vendida", "#combos"]]],
    ["Promos", [["Promos vigentes", "#promos"], ...(yapaOn ? [[`Jamoneitor ${money(U.yapa.price)}`, "#yapa"]] : []), ["Instagram", U.config.instagram]]],
    ["Pedidos", [["Pedí en 4 pasos", "#pedir"], ["La Scoobyneta", U.waUrl(U.delivery.whatsapp, "¡Hola Scoobyneta! 🚌")], ["Call center 60007071", U.waUrl(U.config.callCenter, "¡Hola Ugo's! 😎")], ["Franquicias", U.config.franchises]]],
    ["Sucursales", U.branches.map((b) => [b.name, b.maps])],
  ];
  $("#fgroups").innerHTML = groups.map(([t, ls]) => `<details><summary>${esc(t)}</summary><ul>${ls.map(([n, h]) => `<li><a href="${esc(h)}"${/^http/.test(h) ? ' target="_blank" rel="noopener"' : ""}>${esc(n)}</a></li>`).join("")}</ul></details>`).join("");
  const fdet = $$("#fgroups details");
  fdet.forEach((d) => d.addEventListener("toggle", () => { if (d.open && innerWidth > 860) fdet.forEach((o) => o !== d && (o.open = false)); }));
  document.addEventListener("click", (e) => { if (innerWidth > 860 && !e.target.closest("#fgroups")) fdet.forEach((d) => (d.open = false)); });
  $("#ftrMeta").textContent = `${U.hoursText()} · ${U.config.city}, ${U.config.country} · © ${new Date().getFullYear()} Ugo's Pizza · Cadena de restaurantes 100% boliviana`;
  $("#ftrTel").href = `tel:+${U.config.callCenter}`; $("#ftrPhone").href = `tel:+${U.config.callCenter}`;
  $("#ftrWa").href = U.waUrl(U.config.callCenter, "¡Hola Ugo's! 😎 Quiero hacer un pedido");

  /* ====================== FUNNEL ====================== */
  const F = $("#funnel"); let fstep = 1;
  $("#stepsBar").innerHTML = "<li></li><li></li><li></li><li></li>";
  $("#fPicker").innerHTML = Object.values(CAT).map((it) => `<button type="button" data-add="${esc(it.id)}">${esc(it.name)}<b>${money(it.price)}</b></button>`).join("");
  const val = (n) => { const el = F.elements[n]; return el ? (el.value || "").trim() : ""; };
  const intent = () => F.querySelector("input[name=intent]:checked").value;
  function renderFunnelCart() {
    const { lines, total } = U.priceCart(cart, today.date);
    $("#fCart").innerHTML = lines.length ? lines.map((l) => `<div class="fcart__row"><span>${l.qty}× ${esc(l.name)}</span><span class="qty"><button type="button" data-q="-1" data-id="${esc(l.id)}" aria-label="Quitar uno">−</button><b>${money(l.sub)}</b><button type="button" data-q="1" data-id="${esc(l.id)}" aria-label="Agregar uno">+</button></span></div>`).join("") + `<div class="fcart__row"><b>Total</b><b>${money(total)}</b></div>`
      : `<p class="fcart__empty">Todavía no elegiste nada. Sumá pizzas o combos abajo 👇</p>`;
    if (cart[U.yapa && U.yapa.id] && intent() === "delivery" && $("#fBranch").value !== U.delivery.id) $("#fBranch").value = U.delivery.id;
    updatePreview();
  }
  function details() {
    const dest = U.destination(val("branch"));
    return { intent: intent(), cart: ["delivery", "pickup"].includes(intent()) ? cart : {}, branchName: dest.name, name: val("name"), address: val("address"), reference: val("reference"),
      when: F.querySelector("input[name=when]:checked").value === "later" && val("time") ? val("time") : "asap", note: val("note"), topic: val("qTopic"),
      event: { date: val("evDate"), people: val("evPeople"), occasion: val("evOcc") }, dest, date: today.date };
  }
  function updatePreview() { const d = details(); const msg = U.buildMessage(d); $("#phoneOut").textContent = msg; $("#phoneTo").textContent = d.dest.name; return { d, msg }; }
  function syncFor() {
    const it = intent(); const order = it === "delivery" || it === "pickup";
    $$("[data-for]", F).forEach((el) => { const f = el.dataset.for; el.hidden = !(f === "order" ? order : f === "later" ? F.querySelector("input[name=when]:checked").value === "later" : f === it); });
  }
  function validate(n) {
    const it = intent();
    if (n === 2 && (it === "delivery" || it === "pickup") && !Object.keys(cart).length) return "Sumá al menos una pizza o combo.";
    if (n === 3) {
      if (!val("name")) return "¿Cómo te llamás?";
      if (it === "delivery" && !val("address") && val("branch") !== "callcenter") return "Necesitamos tu dirección para el delivery.";
      if (it === "pickup" && val("branch") === U.delivery.id) return "La Scoobyneta es sólo delivery: elegí una sucursal para recoger.";
      if (cart[U.yapa && U.yapa.id] && val("branch") !== U.delivery.id) return `La Jamoneitor a ${money(U.yapa.price)} es sólo por La Scoobyneta (delivery).`;
    }
    return "";
  }
  function gotoStep(n) {
    fstep = Math.max(1, Math.min(4, n)); syncFor();
    $$(".fstep", F).forEach((fs) => (fs.hidden = Number(fs.dataset.step) !== fstep));
    $$("#stepsBar li").forEach((li, i) => li.classList.toggle("is-on", i < fstep));
    if (fstep === 4) { const { d, msg } = updatePreview(); $("#review").textContent = msg; $("#sendWa").href = U.waUrl(d.dest.whatsapp, msg); $("#sendWa").textContent = `Enviar a ${d.dest.name} por WhatsApp`; }
    $("#fMsg").textContent = "";
  }
  F.addEventListener("click", (e) => {
    if (e.target.closest("[data-next]")) { const err = validate(fstep); if (err) { $("#fMsg").textContent = err; toast(err); return; } gotoStep(fstep + 1); }
    if (e.target.closest("[data-prev]")) gotoStep(fstep - 1);
  });
  F.addEventListener("input", () => { syncFor(); updatePreview(); });
  F.addEventListener("change", () => { syncFor(); updatePreview(); });
  F.addEventListener("submit", (e) => e.preventDefault());
  $("#sendWa").addEventListener("click", () => {
    const d = details(); if (Object.keys(d.cart).length) saveOrder({ id: null, at: Date.now(), branch: d.dest.id, service: d.intent, cart: { ...cart } });
  });
  gotoStep(1);

  /* ====================== MOBILE BAR / FAB visibility ====================== */
  const vis = { hero: true, funnel: false, footer: false };
  const vo = new IntersectionObserver((ens) => { ens.forEach((en) => { vis[en.target.dataset.v] = en.isIntersecting; }); updateBars(); }, { threshold: .05 });
  [["hero", ".hero"], ["funnel", "#pedir"], ["footer", "#footer"]].forEach(([k, s]) => { const el = $(s); el.dataset.v = k; vo.observe(el); });
  function updateBars() {
    const overlay = !$("#chat").hidden || !$("#drawer").hidden || !$("#pdetail").hidden;
    $("#mbar").classList.toggle("is-hidden", overlay || vis.hero || vis.funnel || vis.footer);
    $("#fab").classList.toggle("is-hidden", overlay || vis.footer);
  }

  /* ====================== Mi Pedido (local history) ====================== */
  function saveOrder(entry) { const h = store.get("ugos_orders", []); h.unshift(entry); store.set("ugos_orders", h.slice(0, 3)); }

  /* ====================== UGO·IA CHAT ====================== */
  const chat = $("#chat"), log = $("#chatLog"), input = $("#chatIn");
  let msgs = store.get("ugoia_msgs", [], sessionStorage);
  let aState = store.get("ugoia_state", {}, sessionStorage);
  let busy = false;
  const STARTERS = ["¿Qué promos hay hoy?", "Quiero una pizza", "¿Qué sucursales están abiertas?", "Opciones sin carne"];

  function md(t) {
    const lines = esc(t).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").split(/\n/);
    let html = "", inList = false;
    for (const l of lines) {
      const m = l.match(/^\s*(?:[-•*]|\d+\.)\s+(.*)/);
      if (m) { if (!inList) { html += "<ul>"; inList = true; } html += `<li>${m[1]}</li>`; continue; }
      if (inList) { html += "</ul>"; inList = false; }
      if (l.trim()) html += `<p>${l}</p>`;
    }
    return html + (inList ? "</ul>" : "");
  }
  function bubble(role, text) { const d = document.createElement("div"); d.className = `msg msg--${role === "user" ? "me" : "bot"}`; d.innerHTML = role === "user" ? esc(text) : md(text); log.appendChild(d); log.scrollTop = log.scrollHeight; return d; }
  function chips(list, into = $("#chatChips")) {
    into.innerHTML = list.map((t) => `<button type="button">${esc(t)}</button>`).join("");
    $$("button", into).forEach((b) => b.addEventListener("click", () => send(b.textContent)));
  }
  function starters() { const h = store.get("ugos_orders", []); chips(h.length ? ["🍕 Lo de siempre", ...STARTERS] : STARTERS); }
  function renderHistory() {
    log.innerHTML = "";
    if (!msgs.length) bubble("assistant", "¡Hola, hermoso! 😎 Soy **Ugo·IA**, el asistente de pedidos de Ugo's. ¿Qué pizza te armo hoy?");
    msgs.forEach((m) => bubble(m.role, m.content));
    starters();
  }
  let chatLast = null;
  function openChat() { if (!chat.hidden) return; chatLast = document.activeElement; chat.hidden = false; document.body.classList.add("chat-open"); if (!log.children.length) renderHistory(); input.focus(); updateBars(); }
  function closeChat() { chat.hidden = true; document.body.classList.remove("chat-open"); Voice.stop(); if (chatLast) chatLast.focus(); updateBars(); }
  $("#chatX").addEventListener("click", closeChat);
  $("#chatForm").addEventListener("submit", (e) => { e.preventDefault(); const t = input.value.trim(); if (t) { input.value = ""; send(t); } });

  const safeWa = (u) => typeof u === "string" && u.startsWith("https://wa.me/");
  function cartCard(c) {
    const { lines, total } = U.priceCart(c, today.date);
    return `<h4>Tu pedido</h4>${lines.map((l) => `<div class="row"><span>${l.qty}× ${esc(l.name)}</span><span>${money(l.sub)}</span></div>`).join("") || "<div class='row'>Vacío</div>"}<div class="row tot"><span>Total</span><span>${money(total)}</span></div><button class="btn btn--cream" type="button" data-view-cart>Ver pedido</button>`;
  }
  log.addEventListener("click", (e) => {
    if (e.target.closest("[data-view-cart]")) openDrawer();
    const c = e.target.closest("[data-say]"); if (c) send(c.dataset.say);
    const loc = e.target.closest("[data-loc]"); if (loc) shareLocation(loc);
  });
  function shareLocation(btn) {
    if (!navigator.geolocation) { bubble("assistant", "Tu navegador no me deja ver la ubicación. Escribime la dirección y una referencia 🙏"); return; }
    btn.disabled = true; btn.textContent = "Buscando…";
    navigator.geolocation.getCurrentPosition((p) => {
      aState.order = { ...(aState.order || {}), location: { lat: +p.coords.latitude.toFixed(6), lng: +p.coords.longitude.toFixed(6) } };
      store.set("ugoia_state", aState, sessionStorage); btn.textContent = "📍 Ubicación compartida"; send("📍 Ubicación compartida");
    }, () => { btn.disabled = false; btn.textContent = "📍 Compartir mi ubicación"; bubble("assistant", "No pude acceder a tu ubicación. Escribime la dirección y una referencia, porfa."); }, { timeout: 12000 });
  }

  async function send(text, { channel = Voice.active ? "voice" : "text" } = {}) {
    if (busy) return;
    openChat();
    busy = true; $("#chatChips").innerHTML = "";
    msgs.push({ role: "user", content: text.slice(0, 1200) }); bubble("user", text);
    const typing = document.createElement("div"); typing.className = "msg msg--bot typing"; typing.innerHTML = "<i></i><i></i><i></i>"; log.appendChild(typing); log.scrollTop = log.scrollHeight;
    Voice.setState("thinking");
    aState.cart = { ...cart }; aState.history = store.get("ugos_orders", []);
    let botEl = null, botText = "", cartEl = null, spoken = "";
    try {
      const res = await fetch("/api/ugoia", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: msgs.slice(-16), state: aState, channel }) });
      if (!res.ok || !res.body) throw Object.assign(new Error("http"), { status: res.status });
      const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = "";
      for (;;) {
        const { value, done } = await reader.read(); if (done) break;
        buf += dec.decode(value, { stream: true }); let nl;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).trim(); buf = buf.slice(nl + 1); if (!line) continue;
          let ev; try { ev = JSON.parse(line); } catch (e) { continue; }
          typing.remove();
          if (ev.type === "text") { if (!botEl) botEl = bubble("assistant", ""); botText += ev.text; spoken += ev.text; botEl.innerHTML = md(botText); }
          else if (ev.type === "cart") { setCart(ev.cart, { silent: false }); if (!cartEl) { cartEl = document.createElement("div"); cartEl.className = "card"; log.appendChild(cartEl); } cartEl.innerHTML = cartCard(ev.cart); botEl = null; botText = ""; }
          else if (ev.type === "options") { chips(ev.options || []); }
          else if (ev.type === "readback") { const s = ev.summary || {}; const d = document.createElement("div"); d.className = "card card--receipt"; d.innerHTML = `<h4>Revisá tu pedido</h4>${(s.lines || []).map((l) => `<div class="row"><span>${l.qty}× ${esc(l.name)}</span><span>${money(l.sub)}</span></div>`).join("")}<div class="row tot"><span>Total</span><span>${money(s.total || 0)}</span></div><div class="row"><span>${esc(s.service_label || "")}</span><span>${esc(s.branch || "")}</span></div>${s.address ? `<div class="row"><span>📍 ${esc(s.address)}</span></div>` : ""}<div class="row"><span>🕒 ${esc(s.when || "")}</span><span>👤 ${esc(s.name || "")}</span></div><div class="chipsrow" style="margin-top:8px"><button type="button" data-say="Sí, confirmar">Sí, confirmar</button><button type="button" data-say="Cambiar algo">Cambiar algo</button></div>`; log.appendChild(d); botEl = null; botText = ""; }
          else if (ev.type === "location") { const d = document.createElement("div"); d.className = "card"; d.innerHTML = `<button class="btn btn--red btn--block" type="button" data-loc>📍 Compartir mi ubicación</button>`; log.appendChild(d); }
          else if (ev.type === "order" && safeWa(ev.url)) { const d = document.createElement("div"); d.className = "card card--order"; d.innerHTML = `<h4>Pedido ${esc(ev.id)} listo ✅</h4><div class="row"><span>${esc(ev.branch)}</span><b>${money(ev.total)}</b></div><a class="btn btn--wa btn--block btn--lg" href="${esc(ev.url)}" target="_blank" rel="noopener">Enviar pedido por WhatsApp</a>`; log.appendChild(d); if (ev.entry) saveOrder(ev.entry); botEl = null; botText = ""; }
          else if (ev.type === "handoff" && safeWa(ev.url)) { const d = document.createElement("div"); d.className = "card"; d.innerHTML = `<a class="btn btn--wa btn--block" href="${esc(ev.url)}" target="_blank" rel="noopener">💬 Hablar con ${esc(ev.to || "una persona")}</a>`; log.appendChild(d); }
          else if (ev.type === "state") { aState = ev.state || {}; store.set("ugoia_state", aState, sessionStorage); }
          else if (ev.type === "error") throw Object.assign(new Error("model"), { status: ev.kind === "rate" ? 429 : 500, kind: ev.kind });
          log.scrollTop = log.scrollHeight;
        }
      }
      typing.remove();
      const finalText = log.lastElementChild && botText ? botText : spoken;
      msgs.push({ role: "assistant", content: (finalText || spoken || "…").slice(0, 1200) });
      msgs = msgs.slice(-20); store.set("ugoia_msgs", msgs, sessionStorage);
      if (!$("#chatChips").children.length) starters();
      Voice.speak(spoken);
    } catch (err) {
      typing.remove(); msgs.pop(); store.set("ugoia_msgs", msgs, sessionStorage);
      const s = err.status;
      const t = [503, 404, 501, 405].includes(s) ? "Ugo·IA se está preparando 🛠️ ¡Muy pronto vas a poder pedirme todo por acá!"
        : s === 429 ? "Uy, muchas preguntas seguidas 😅 Esperá un minutito y seguimos."
        : s ? "Algo salió mal de mi lado. Probá de nuevo en un rato." : "Se cortó la conexión 📶 Revisá tu internet y probá otra vez.";
      const d = bubble("assistant", t); d.insertAdjacentHTML("beforeend", `<p><a href="#carta">Ver la carta</a> · <a href="#pedir">Pedir por WhatsApp</a></p>`);
      $$("a", d).forEach((a) => a.addEventListener("click", () => innerWidth <= 760 && closeChat()));
      Voice.setState("idle"); starters();
    } finally { busy = false; }
  }

  /* ---------- Voice (Web Speech API) ---------- */
  const Voice = (function () {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const mic = $("#micBtn"), bar = $("#vbar"), status = $("#vStatus"), hf = $("#handsFree");
    const api = { active: false, stop() {}, speak() {}, setState() {} };
    if (!SR) return api;
    mic.hidden = false; bar.hidden = false;
    let rec = null, lock = null, idleT = null;
    const LABEL = { idle: "Tocá el micrófono y hablá", listening: "Escuchando…", thinking: "Pensando…", speaking: "Hablando… tocá para interrumpir" };
    api.setState = (s) => { mic.dataset.state = s; status.textContent = LABEL[s] || ""; };
    function voice() {
      const vs = speechSynthesis.getVoices();
      return vs.find((v) => /es-BO/i.test(v.lang)) || vs.find((v) => /es-(419|US|MX|AR)/i.test(v.lang)) || vs.find((v) => /^es/i.test(v.lang));
    }
    function clean(t) {
      return t.replace(/\*\*/g, "").replace(/https?:\/\/\S+/g, "").replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, "")
        .replace(/Bs\.?\s?(\d+)/g, "$1 bolivianos").replace(/(\d{1,2}):00/g, "$1 en punto").replace(/^\s*[-•]\s*/gm, "").replace(/\s+/g, " ").trim();
    }
    async function wake() { try { if ("wakeLock" in navigator && !lock) lock = await navigator.wakeLock.request("screen"); } catch (e) { /* */ } }
    function release() { if (lock) { lock.release().catch(() => {}); lock = null; } }
    function listen() {
      speechSynthesis.cancel();
      try { rec && rec.abort(); } catch (e) { /* */ }
      rec = new SR(); rec.lang = "es-BO"; rec.interimResults = true; rec.maxAlternatives = 1;
      let final = "";
      rec.onresult = (e) => { let t = ""; for (const r of e.results) { t += r[0].transcript; if (r.isFinal) final = t; } input.value = t; };
      rec.onerror = (e) => { if (e.error === "language-not-supported") { rec.lang = "es-419"; } if (e.error === "not-allowed" || e.error === "service-not-allowed") { bubble("assistant", "No tengo permiso para el micrófono 🎙️ Podés escribirme igual, hermoso."); api.active = false; release(); } api.setState("idle"); };
      rec.onend = () => { if (final.trim()) { input.value = ""; send(final.trim(), { channel: "voice" }); } else if (mic.dataset.state === "listening") api.setState("idle"); };
      api.active = true; wake(); api.setState("listening");
      clearTimeout(idleT); idleT = setTimeout(() => { if (mic.dataset.state === "idle") { api.active = false; release(); } }, 120000);
      try { rec.start(); } catch (e) { api.setState("idle"); }
    }
    mic.addEventListener("click", () => {
      if (mic.dataset.state === "listening") { try { rec.stop(); } catch (e) { /* */ } return; }
      listen(); // barge-in: cancels any speech
    });
    api.speak = (text) => {
      if (!api.active) { api.setState("idle"); return; }
      const t = clean(text); if (!t || !("speechSynthesis" in window)) { api.setState("idle"); return; }
      const u = new SpeechSynthesisUtterance(t); const v = voice(); if (v) u.voice = v; u.lang = (v && v.lang) || "es-419"; u.rate = 1.05;
      u.onend = () => { api.setState("idle"); if (hf.checked && !chat.hidden) listen(); };
      api.setState("speaking"); speechSynthesis.cancel(); speechSynthesis.speak(u);
    };
    api.stop = () => { speechSynthesis.cancel(); try { rec && rec.abort(); } catch (e) { /* */ } api.active = false; api.setState("idle"); release(); };
    status.addEventListener("click", () => { if (mic.dataset.state === "speaking") { speechSynthesis.cancel(); api.setState("idle"); } });
    api.setState("idle");
    return api;
  })();

  /* ====================== keyboard: Esc ====================== */
  addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (Spin.isOpen()) Spin.closeDetail();
    else if (!$("#drawer").hidden) closeDrawer();
    else if (!chat.hidden) closeChat();
    else if (!$("#mnav").hidden) burger.click();
  });

  /* ====================== REVEAL ====================== */
  $$(".shead, .offers__t, .pale__grid > *, .story__grid > *, .feed__head, .dband").forEach((el) => el.classList.add("reveal"));
  observeReveal();

  renderCart();
  updateBars();
})();
