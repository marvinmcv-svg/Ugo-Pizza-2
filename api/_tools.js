/* Ugo·IA deterministic tools. The model proposes calls; this file validates and executes them.
 * Every price, total, deal, opening hour and order comes from js/data.js (the same file the site uses). */
"use strict";
const crypto = require("crypto");
const U = require("../js/data.js");

const MAX_LINES = 30;
const norm = (s) => String(s == null ? "" : s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9ñ\s]/g, " ").replace(/\s+/g, " ").trim();
const clampQty = (q) => Math.max(1, Math.min(50, Math.floor(Number(q) || 1)));
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };

/* ---------------- synonyms ---------------- */
// single words → menu words (Spanish, English, local slang). A word with a synonym is REPLACED by it.
const SYN = {
  ham: "jamon", jamon: "jamon", bacon: "tocino", panceta: "tocino", corn: "choclo", maiz: "choclo", elote: "choclo",
  mushroom: "champinon", mushrooms: "champinon", hongos: "champinon", champinones: "champinon", champi: "champinon",
  pineapple: "pina", anana: "pina", sausage: "salchicha", salchichas: "salchicha", chorizo: "salchicha", chicken: "pollo",
  cheese: "queso", quesos: "queso", beef: "carne", meat: "carne", pepperoni: "salame", peperoni: "salame", salami: "salame",
  tomato: "tomate", tomatoes: "tomate", basil: "albahaca", broccoli: "brocoli", onion: "cebolla", jalapeno: "jalapenos", jalapenio: "jalapenos",
  picante: "jalapenos", spicy: "jalapenos", hawaiian: "hawaiana", mexican: "mexicana", american: "americana", napolitan: "napolitana",
  hamburguesa: "cheeseburguer", burger: "cheeseburguer", cheeseburger: "cheeseburguer", stroganoff: "strogonoff", estrogonof: "strogonoff",
  catupiri: "catupiry", requeson: "requeson", cheddar: "cheddar", roquefort: "roquefort", chocludo: "chocluda",
  gaseosa: "pepsi", gaseosas: "pepsi", soda: "pepsi", refresco: "pepsi", coca: "pepsi", cola: "pepsi", bebida: "pepsi", bebidas: "pepsi", drink: "pepsi", drinks: "pepsi", guarana: "guarana",
  jamoneitor: "jamoneitor", salchichona: "salchichona", ugos: "ugos", ugo: "ugos",
};
// two-word phrases (consume both words)
const SYN2 = { "sin carne": "@veg", "cuatro quesos": "4 queso", "four cheese": "4 queso", "4 quesos": "4 queso", "mas vendida": "cheeseburguer", "best seller": "cheeseburguer", "de la casa": "ugos", "la casa": "ugos" };
const VEG_WORDS = new Set(["vegetariana", "vegetariano", "veggie", "veg", "vegana", "vegano", "vegetarian"]);
const STOP = new Set(["una", "un", "uno", "la", "el", "los", "las", "de", "del", "con", "y", "quiero", "dame", "me", "pizza", "pizzas", "por", "favor", "que", "tienen", "hay", "algo", "alguna", "algun", "para", "a", "en", "o", "mi", "the", "a", "with", "and", "some", "i", "want", "tenes", "tiene", "lleva", "familiar", "grande", "porfa", "porfis"]);

function tokens(q) {
  const w = norm(q).split(" ").filter(Boolean); const out = { inc: [], exc: [], veg: false };
  for (let i = 0; i < w.length; i++) {
    const two = w[i] + " " + (w[i + 1] || "");
    if (SYN2[two]) { const s = SYN2[two]; if (s === "@veg") out.veg = true; else out.inc.push(...s.split(" ")); i++; continue; }
    if (w[i] === "sin" && w[i + 1]) { const x = SYN[w[i + 1]] || w[i + 1]; if (x === "carne") out.veg = true; else out.exc.push(x); i++; continue; }
    if (VEG_WORDS.has(w[i])) { out.veg = true; continue; }
    if (STOP.has(w[i]) || /^\d+$/.test(w[i]) && !["4"].includes(w[i])) continue;
    out.inc.push(SYN[w[i]] || w[i]);
  }
  return out;
}
const words = (s) => norm(s).split(" ");
const wordHit = (ws, t) => ws.some((w) => w === t || (t.length >= 3 && w.startsWith(t)) || (t.length >= 4 && t.startsWith(w) && w.length >= 4));
const KIND_ORDER = { pizza: 0, promo: 1, combo: 2 };

function search(cat, query, limit = 6) {
  const t = tokens(query);
  let items = Object.values(cat);
  if (t.veg) items = items.filter((it) => it.kind === "pizza" && it.veg);
  if (t.exc.length) items = items.filter((it) => !t.exc.some((x) => wordHit(words(it.name + " " + it.desc + " " + (it.drink || "")), x)));
  const scored = items.map((it) => {
    const nw = words(it.name), dw = words(it.desc + " " + (it.drink || ""));
    let s = 0;
    for (const x of t.inc) { if (wordHit(nw, x)) s += 3; else if (wordHit(dw, x)) s += 1; }
    if (t.inc.length && t.inc.every((x) => wordHit(nw, x))) s += 2;
    if (it.kind === "combo" && it.parts.length > 1) s -= .5; // single-pizza combo first
    return { it, s };
  });
  let res = t.inc.length ? scored.filter((x) => x.s > 0) : (t.veg || t.exc.length ? scored : []);
  res.sort((a, b) => b.s - a.s || KIND_ORDER[a.it.kind] - KIND_ORDER[b.it.kind] || a.it.price - b.it.price);
  return res.slice(0, limit).map((x) => x.it);
}

/* ---------------- state ---------------- */
function sanitizeCart(cat, c) {
  const out = {}; let n = 0;
  for (const [id, q] of Object.entries(c && typeof c === "object" ? c : {})) {
    if (!cat[id] || n >= MAX_LINES) continue;
    const qty = Math.floor(Number(q) || 0); if (qty <= 0) continue;
    out[id] = Math.min(50, qty); n++;
  }
  return out;
}
const str = (v, n) => (typeof v === "string" ? v.replace(/[\u0000-\u001f]/g, " ").trim().slice(0, n) : "");
function sanitizeState(raw, date) {
  const cat = U.catalog(date); const s = raw && typeof raw === "object" ? raw : {};
  const o = s.order && typeof s.order === "object" ? s.order : {};
  const order = {};
  if (["delivery", "pickup"].includes(o.service)) order.service = o.service;
  if (validDest(o.branch)) order.branch = o.branch;
  for (const [k, n] of [["address", 120], ["reference", 120], ["name", 40], ["payment", 40], ["notes", 200]]) { const v = str(o[k], n); if (v) order[k] = v; }
  if (o.when === "asap" || (typeof o.when === "string" && HHMM.test(o.when))) order.when = o.when;
  if (o.location && Number.isFinite(+o.location.lat) && Number.isFinite(+o.location.lng) && Math.abs(o.location.lat) <= 90 && Math.abs(o.location.lng) <= 180) order.location = { lat: +(+o.location.lat).toFixed(6), lng: +(+o.location.lng).toFixed(6) };
  const history = (Array.isArray(s.history) ? s.history : []).slice(0, 3).map((h) => ({ id: str(h && h.id, 12) || null, at: Number(h && h.at) || 0, branch: validDest(h && h.branch) ? h.branch : null, service: ["delivery", "pickup"].includes(h && h.service) ? h.service : null, cart: sanitizeCart(cat, h && h.cart) })).filter((h) => Object.keys(h.cart).length);
  const st = {
    cart: sanitizeCart(cat, s.cart), prevCart: s.prevCart ? sanitizeCart(cat, s.prevCart) : null, order,
    stage: ["browsing", "awaiting_confirmation", "placed"].includes(s.stage) ? s.stage : "browsing",
    token: str(s.token, 40) || null, upsold: !!s.upsold, newsShown: !!s.newsShown, history,
    lines: (Array.isArray(s.lines) ? s.lines : []).filter((x) => typeof x === "string").slice(-20),
    fails: Math.min(5, Math.max(0, Math.floor(Number(s.fails) || 0))),
  };
  if (s.placed && typeof s.placed === "object" && /^UG-[A-Z0-9]{5}$/.test(s.placed.id) && typeof s.placed.url === "string" && s.placed.url.startsWith("https://wa.me/")) {
    st.placed = { id: s.placed.id, token: str(s.placed.token, 40), url: s.placed.url.slice(0, 4000), branch: str(s.placed.branch, 60), dest: validDest(s.placed.dest) ? s.placed.dest : "callcenter", total: Number(s.placed.total) || 0, at: Number(s.placed.at) || 0 };
  }
  return st;
}
function validDest(id) { return typeof id === "string" && (id === U.delivery.id || U.branches.some((b) => b.id === id)); }

function tokenFor(state) {
  const o = state.order || {};
  const payload = JSON.stringify([Object.entries(state.cart).sort(), o.service, o.branch, o.address, o.reference, o.when, o.name, o.location ? [o.location.lat, o.location.lng] : null, o.payment, o.notes]);
  return crypto.createHash("sha256").update(payload).digest("hex").slice(0, 16);
}
function orderId(token) {
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; const h = crypto.createHash("sha256").update("ugos:" + token).digest();
  let s = ""; for (let i = 0; i < 5; i++) s += A[h[i] % A.length]; return "UG-" + s;
}

/* ---------------- helpers ---------------- */
function nowOf(ctx) { return U.localNow(ctx.now || new Date()); }
function catOf(ctx) { return U.catalog(nowOf(ctx).date); }
function priced(ctx, cart) { return U.priceCart(cart, nowOf(ctx).date); }
function cartView(ctx) { const { lines, total } = priced(ctx, ctx.state.cart); return { lines: lines.map((l) => ({ id: l.id, name: l.name, qty: l.qty, price: l.price, subtotal: l.sub })), total, total_text: U.money(total) }; }
function emitCart(ctx) { ctx.emit({ type: "cart", cart: { ...ctx.state.cart } }); }
/** Any change to cart or details invalidates a pending read-back. */
function touch(ctx) { ctx.state.stage = "browsing"; ctx.state.token = null; }

function resolve(ctx, ref) {
  const cat = catOf(ctx); const r = String(ref == null ? "" : ref).trim();
  if (cat[r]) return { item: cat[r] };
  const n = norm(r);
  const byName = Object.values(cat).filter((it) => norm(it.name) === n);
  if (byName.length === 1) return { item: byName[0] };
  const t = tokens(r);
  if (t.inc.includes("pepsi") || t.inc.includes("guarana")) {
    const combos = Object.values(cat).filter((it) => it.kind === "combo").filter((it) => {
      const want = norm(r); const litre = /\b2\b|2l|2 l|dos litros|2 litros/.test(want) ? "2 l" : /\b1\b|1l|1 l|un litro|1 litro/.test(want) ? "1 l" : null;
      return !litre || norm(it.drink).includes(norm(litre));
    });
    return { drink: true, options: combos.slice(0, 4).map((c) => ({ id: c.id, name: c.name, price: c.price })) };
  }
  const found = search(cat, r, 6);
  if (!found.length) return { none: true };
  const top = found[0]; const names = words(top.name);
  const strong = t.inc.length && t.inc.every((x) => wordHit(names, x));
  const pizzasStrong = found.filter((it) => t.inc.length && t.inc.every((x) => wordHit(words(it.name), x)));
  if (pizzasStrong.length === 1 || (strong && pizzasStrong[0] === top && pizzasStrong.filter((x) => x.kind === top.kind).length === 1)) return { item: top };
  const kindPref = t.inc.includes("combo") ? "combo" : t.inc.some((x) => /^(promo|scooby)/.test(x)) ? "promo" : "pizza";
  const nameHit = found.filter((it) => it.kind === kindPref && t.inc.some((x) => wordHit(words(it.name), x)));
  if (nameHit.length === 1) return { item: nameHit[0] };
  return { options: found.slice(0, 4).map((it) => ({ id: it.id, name: it.name, price: it.price })) };
}
const sizeWord = (s) => { const n = norm(s); if (!n) return null; if (/^(familiar|grande|8 porciones|normal)$/.test(n)) return "familiar"; if (/(jr|junior|chica|chico|personal|mediana|pequena|individual|small|medium)/.test(n)) return "other"; return null; };

/* ---------------- deals ---------------- */
function combosFor(ctx, cart) {
  const cat = catOf(ctx); const { total } = priced(ctx, cart); const hints = [];
  const left = { ...cart };
  const combos = U.combos.filter((c) => cat[c.id]).sort((a, b) => b.parts.length - a.parts.length);
  for (const c of combos) {
    const need = {}; c.parts.forEach((p) => (need[p] = (need[p] || 0) + 1));
    if (!Object.entries(need).every(([id, q]) => (left[id] || 0) >= q)) continue;
    const partsSum = c.parts.reduce((a, p) => a + cat[p].price, 0);
    Object.entries(need).forEach(([id, q]) => (left[id] -= q));
    hints.push({ type: "casi_combo", combo_id: c.id, combo: c.name, price: c.price, missing: c.drink, pizzas_now: partsSum, extra: c.price - partsSum,
      text: `Por ${U.money(c.price - partsSum)} más te llevás la ${c.drink} con el combo ${c.name}.`, total_si_acepta: total - partsSum + c.price });
  }
  return hints;
}
function yapaHint(ctx, cart) {
  const y = U.yapa; const cat = catOf(ctx);
  if (!y || !cat[y.id] || !(cart[y.ref] > 0)) return null;
  const { total } = priced(ctx, cart);
  return { type: "yapa", promo_id: y.id, text: `${cat[y.ref].name} a ${U.money(y.price)} en vez de ${U.money(y.regular)} pidiendo por La Scoobyneta (sólo delivery, primeras 100 del día).`, saving: y.regular - y.price, total_si_acepta: total - cat[y.ref].price + y.price, requires: "delivery por La Scoobyneta" };
}

/* ---------------- order details ---------------- */
function destByName(v) {
  if (validDest(v)) return v; const n = norm(v); if (!n) return null;
  if (/scooby/.test(n)) return U.delivery.id;
  const b = U.branches.find((x) => norm(x.name) === n || norm(x.id) === n || norm(x.name).includes(n) || n.includes(norm(x.name)) || (n.length >= 4 && norm(x.address).includes(n)));
  return b ? b.id : null;
}
function timeCheck(ctx, when) {
  const now = nowOf(ctx); const st = U.branchStatus(now);
  if (when === "asap") return st.open ? null : { error: "closed", message: st.today ? `Ahora estamos cerrados. Abrimos hoy a las ${st.opens}.` : `Ahora estamos cerrados. Volvemos desde las ${st.opens}.`, opens: st.opens };
  let m = toMin(when); let dow = now.dow;
  let wait = m - now.min; if (wait < 0 && m < 6 * 60 && now.min >= 12 * 60) { wait += 1440; dow = (dow + 1) % 7; }
  if (wait < 0) return { error: "past", message: `Las ${when} ya pasaron (son las ${now.hhmm}).` };
  if (!U.isOpenAt(dow, m)) return { error: "closed_at", message: `A las ${when} no estamos abiertos. Horario: ${U.hoursText()}.` };
  return null;
}
function missingFor(state) {
  const o = state.order || {}; const miss = [];
  if (!Object.keys(state.cart).length) miss.push("cart");
  if (!o.service) miss.push("service");
  if (!o.branch) miss.push("branch");
  if (o.service === "delivery" && !o.address && !o.location) miss.push("address");
  if (!o.when) miss.push("when");
  if (!o.name) miss.push("name");
  return miss;
}
const SERVICE_LABEL = { delivery: "🛵 Delivery", pickup: "🏪 Recojo en sucursal" };
function summary(ctx) {
  const s = ctx.state, o = s.order; const { lines, total } = priced(ctx, s.cart); const dest = U.destination(o.branch);
  return { lines: lines.map((l) => ({ id: l.id, name: l.name, qty: l.qty, sub: l.sub })), total, total_text: U.money(total), service: o.service, service_label: SERVICE_LABEL[o.service],
    branch: dest.name, address: o.service === "delivery" ? [o.address, o.reference && `ref: ${o.reference}`, o.location && "📌 pin compartido"].filter(Boolean).join(" · ") : "",
    when: o.when === "asap" ? "Lo antes posible" : `Para las ${o.when}`, name: o.name, payment: o.payment || null };
}
function mapsLink(loc) { return loc ? `https://maps.google.com/?q=${loc.lat},${loc.lng}` : null; }

/* ---------------- tool implementations ---------------- */
const impl = {
  search_menu(ctx, { query }) {
    const res = search(catOf(ctx), query);
    if (!res.length) { logMiss(query, "empty_search"); return { results: [], note: "No encontré eso en la carta. Ofrecé opciones parecidas con search_menu o mostrá las categorías." }; }
    return { results: res.map((it) => ({ id: it.id, name: it.name, price: it.price, kind: it.kind, desc: it.desc, veg: it.veg, ...(it.drink ? { drink: it.drink } : {}) })) };
  },
  get_item_details(ctx, { item }) {
    const r = resolve(ctx, item); if (!r.item) return r.options ? { ambiguous: true, options: r.options } : { error: "not_found" };
    const it = r.item; const cat = catOf(ctx);
    const combos = U.combos.filter((c) => cat[c.id] && (c.parts.includes(it.id) || c.id === it.id)).map((c) => ({ id: c.id, name: c.name, price: c.price }));
    const y = U.yapa && cat[U.yapa.id] && (U.yapa.ref === it.id || U.yapa.id === it.id) ? { id: U.yapa.id, price: U.yapa.price, note: U.yapa.note } : null;
    return { id: it.id, name: it.name, price: it.price, kind: it.kind, size: U.sizes.familiar, ingredients: it.kind === "pizza" ? it.desc : it.desc, base: U.base, veg: it.veg, combos, monthly_promo: y,
      allergens: "No tenemos información de alérgenos publicada. Si hay alguna alergia, consultá directamente con la sucursal antes de pedir." };
  },
  get_whats_new(ctx) {
    const cat = catOf(ctx); ctx.state.newsShown = true;
    return { new_items: Object.values(cat).filter((x) => x.hot && x.kind === "pizza").map((x) => ({ id: x.id, name: x.name, price: x.price })),
      monthly_promo: U.yapa && cat[U.yapa.id] ? { id: U.yapa.id, name: U.yapa.name, price: U.yapa.price, regular: U.yapa.regular, until: U.yapa.until, note: U.yapa.note } : null,
      combos: U.combos.map((c) => ({ id: c.id, name: c.name, price: c.price })), today_promo: todayPromo(ctx), coming_soon: "Una nueva pizza 'combinación carnívora' (todavía sin nombre ni precio)." };
  },
  get_branches(ctx, { name } = {}) {
    const st = U.branchStatus(nowOf(ctx)); let list = U.branches;
    if (name) { const id = destByName(name); list = id && id !== U.delivery.id ? U.branches.filter((b) => b.id === id) : list; }
    return { now: nowOf(ctx).hhmm, hours: U.hoursText(), status: st.state, open_now: st.open, closes: st.closes || null, opens: st.opens || null,
      branches: list.map((b) => ({ id: b.id, name: b.name, address: b.address, whatsapp: b.whatsapp })), delivery: { id: U.delivery.id, name: U.delivery.name, whatsapp: U.delivery.whatsapp, note: "Delivery de Ugo's" },
      note: "Los links de mapas y WhatsApp aparecen como botones en la web; no los escribas." };
  },
  get_deals(ctx) {
    const cat = catOf(ctx); const s = ctx.state; const { total } = priced(ctx, s.cart);
    const hints = [...combosFor(ctx, s.cart)]; const y = yapaHint(ctx, s.cart); if (y) hints.push(y);
    return { today_promo: todayPromo(ctx), monthly_promo: U.yapa && cat[U.yapa.id] ? { id: U.yapa.id, name: U.yapa.name, price: U.yapa.price, regular: U.yapa.regular, saving: U.yapa.regular - U.yapa.price, note: U.yapa.note, until: U.yapa.until } : null,
      combos: U.combos.map((c) => { const pz = c.parts.reduce((a, p) => a + cat[p].price, 0); return { id: c.id, name: c.name, price: c.price, includes: c.note, pizzas_alone: pz, drink_for: c.price - pz }; }),
      cart_total: total, cart_hints: hints, note: "Las gaseosas no se venden sueltas en la web: vienen en los combos. Citá total_si_acepta tal cual." };
  },
  cart_add(ctx, { items }) {
    const s = ctx.state; const added = [], problems = []; const before = { ...s.cart };
    for (const raw of (Array.isArray(items) ? items : []).slice(0, 10)) {
      const ref = raw && (raw.item || raw.id || raw.name); const sz = sizeWord(raw && raw.size) || sizeWord(ref);
      if (sz === "other") { problems.push({ item: ref, error: "size", message: "Todas nuestras pizzas son tamaño familiar de 8 porciones; no viene en otro tamaño." }); continue; }
      const r = resolve(ctx, String(ref || "").replace(/\b(jr|junior|chica|personal|familiar|grande)\b/gi, ""));
      if (r.drink) { problems.push({ item: ref, error: "drinks_in_combos", message: "Las gaseosas vienen en los combos (no sueltas).", options: r.options }); continue; }
      if (!r.item) { problems.push({ item: ref, error: r.options ? "ambiguous" : "not_found", options: r.options || [] }); if (!r.options) logMiss(ref, "cart_add_not_found"); continue; }
      if (!s.cart[r.item.id] && Object.keys(s.cart).length >= MAX_LINES) { problems.push({ item: ref, error: "too_many_lines" }); continue; }
      const q = clampQty(raw.qty); s.cart[r.item.id] = Math.min(50, (s.cart[r.item.id] || 0) + q); added.push({ id: r.item.id, name: r.item.name, qty: q, price: r.item.price });
    }
    if (added.length) { s.prevCart = before; touch(ctx); emitCart(ctx); }
    const opts = problems.flatMap((p) => p.options || []).slice(0, 4);
    if (opts.length) ctx.emit({ type: "options", options: opts.map((o) => o.name) });
    return { added, problems, cart: cartView(ctx) };
  },
  cart_remove(ctx, { item }) {
    const s = ctx.state; const r = resolve(ctx, item); const id = r.item ? r.item.id : null;
    if (!id || !s.cart[id]) return { error: "not_in_cart", cart: cartView(ctx) };
    s.prevCart = { ...s.cart }; delete s.cart[id]; touch(ctx); emitCart(ctx); return { removed: id, cart: cartView(ctx) };
  },
  cart_set_qty(ctx, { item, qty }) {
    const s = ctx.state; const r = resolve(ctx, item); if (!r.item) return { error: "not_found", options: r.options || [] };
    s.prevCart = { ...s.cart }; const q = Math.floor(Number(qty) || 0);
    if (q <= 0) delete s.cart[r.item.id]; else s.cart[r.item.id] = Math.min(50, q);
    touch(ctx); emitCart(ctx); return { cart: cartView(ctx) };
  },
  cart_clear(ctx) { const s = ctx.state; s.prevCart = { ...s.cart }; s.cart = {}; touch(ctx); emitCart(ctx); return { cart: cartView(ctx) }; },
  cart_view(ctx) { return { cart: cartView(ctx), order: ctx.state.order, stage: ctx.state.stage }; },
  cart_undo(ctx) {
    const s = ctx.state; if (!s.prevCart) return { error: "nothing_to_undo", cart: cartView(ctx) };
    const cur = s.cart; s.cart = s.prevCart; s.prevCart = cur; touch(ctx); emitCart(ctx); return { undone: true, cart: cartView(ctx) };
  },
  cart_swap_to_combo(ctx, { combo_id }) {
    const s = ctx.state; const cat = catOf(ctx);
    if (U.yapa && combo_id === U.yapa.id && cat[combo_id]) {
      if (!(s.cart[U.yapa.ref] > 0)) return { error: "missing_parts" };
      s.prevCart = { ...s.cart }; s.cart[U.yapa.ref] -= 1; if (!s.cart[U.yapa.ref]) delete s.cart[U.yapa.ref]; s.cart[combo_id] = (s.cart[combo_id] || 0) + 1;
      s.order.service = "delivery"; s.order.branch = U.delivery.id; touch(ctx); emitCart(ctx);
      return { swapped: combo_id, note: "Promo sólo por La Scoobyneta (delivery): ya la dejé como destino.", cart: cartView(ctx) };
    }
    const c = U.combos.find((x) => x.id === combo_id); if (!c || !cat[c.id]) return { error: "unknown_combo" };
    const need = {}; c.parts.forEach((p) => (need[p] = (need[p] || 0) + 1));
    if (!Object.entries(need).every(([id, q]) => (s.cart[id] || 0) >= q)) return { error: "missing_parts", needs: c.parts };
    s.prevCart = { ...s.cart };
    for (const [id, q] of Object.entries(need)) { s.cart[id] -= q; if (s.cart[id] <= 0) delete s.cart[id]; }
    s.cart[c.id] = (s.cart[c.id] || 0) + 1; touch(ctx); emitCart(ctx);
    return { swapped: c.id, includes: c.note, cart: cartView(ctx) };
  },
  suggest_upsell(ctx) {
    const s = ctx.state; if (s.upsold) return { suggestion: null, reason: "already_suggested" };
    if (!Object.keys(s.cart).length) return { suggestion: null, reason: "empty_cart" };
    const h = combosFor(ctx, s.cart)[0];
    s.upsold = true;
    if (h) return { suggestion: h };
    return { suggestion: null, reason: "nothing_relevant" };
  },
  get_my_orders(ctx) {
    const cat = catOf(ctx);
    return { orders: ctx.state.history.map((h, i) => ({ index: i, id: h.id, when: h.at ? new Date(h.at).toISOString().slice(0, 10) : null, branch: h.branch ? U.destination(h.branch).name : null, service: h.service, items: Object.entries(h.cart).map(([id, q]) => `${q}× ${cat[id].name}`), total: priced(ctx, h.cart).total })) };
  },
  reorder(ctx, { index = 0 } = {}) {
    const s = ctx.state; const h = s.history[Math.max(0, Math.min(2, Math.floor(Number(index) || 0)))];
    if (!h) return { error: "no_history" };
    s.prevCart = { ...s.cart }; s.cart = { ...h.cart }; if (h.branch) s.order.branch = h.branch; if (h.service) s.order.service = h.service;
    touch(ctx); emitCart(ctx); return { loaded: true, cart: cartView(ctx), order: s.order, missing: missingFor(s) };
  },
  set_order_details(ctx, args) {
    const s = ctx.state; const o = s.order; const errors = [];
    if (args.service != null) { if (["delivery", "pickup"].includes(args.service)) o.service = args.service; else errors.push({ field: "service", message: "Elegí delivery o recojo." }); }
    if (args.branch != null && args.branch !== "") { const id = destByName(args.branch); if (id) o.branch = id; else errors.push({ field: "branch", message: "Esa sucursal no existe.", options: U.branches.map((b) => b.name) }); }
    if (o.branch === U.delivery.id && o.service === "pickup") { errors.push({ field: "branch", message: "La Scoobyneta es sólo delivery. Para recoger elegí una sucursal." }); delete o.branch; }
    if (args.when != null && args.when !== "") {
      const w = norm(args.when); const when = /^(asap|ya|ahora|lo antes posible|cuanto antes)$/.test(w) ? "asap" : String(args.when).trim().replace(/^(\d):/, "0$1:");
      if (when !== "asap" && !HHMM.test(when)) errors.push({ field: "when", message: "Decime la hora como HH:MM o 'lo antes posible'." });
      else { const e = timeCheck(ctx, when); if (e) errors.push({ field: "when", ...e }); else o.when = when; }
    }
    for (const [k, n] of [["address", 120], ["reference", 120], ["name", 40], ["payment", 40], ["notes", 200]]) { const v = str(args[k], n); if (v) o[k] = v; }
    const y = U.yapa; const promo = y && s.cart[y.id];
    if (promo && o.service === "pickup") errors.push({ field: "service", message: `La ${y.name} a ${U.money(y.price)} es sólo por delivery de La Scoobyneta.` });
    if (promo && o.service === "delivery" && o.branch !== U.delivery.id) { o.branch = U.delivery.id; }
    touch(ctx);
    return { saved: o, errors, missing: missingFor(s), ...(o.service === "delivery" && !o.location ? { tip: "Podés ofrecer request_location para compartir el pin." } : {}) };
  },
  request_location(ctx) { ctx.emit({ type: "location" }); return { shown: true, note: "Le mostré el botón 'Compartir mi ubicación'." }; },
  prepare_order(ctx) {
    const s = ctx.state; const miss = missingFor(s);
    if (miss.length) return { ready: false, missing: miss };
    const t = timeCheck(ctx, s.order.when); if (t) return { ready: false, error: t };
    const y = U.yapa; if (y && s.cart[y.id] && (s.order.service !== "delivery" || s.order.branch !== U.delivery.id)) return { ready: false, error: { message: "La promo de Jamoneitor a 35 es sólo por delivery de La Scoobyneta." } };
    s.token = tokenFor(s); s.stage = "awaiting_confirmation";
    const sum = summary(ctx); ctx.emit({ type: "readback", summary: sum });
    return { ready: true, summary: sum, instruction: "Leé el resumen en una frase, preguntá '¿Confirmo?' y TERMINÁ el turno. No digas que está confirmado." };
  },
  place_order(ctx, { token } = {}) {
    const s = ctx.state;
    if (!ctx.allowPlace) return { error: "not_allowed", message: "Sólo se confirma cuando el cliente dice que sí en un mensaje nuevo después del resumen." };
    if (s.placed && s.placed.token === token) { ctx.emit({ type: "order", id: s.placed.id, url: s.placed.url, branch: s.placed.branch, total: s.placed.total }); return { placed: true, duplicate: true, id: s.placed.id }; }
    if (!token || token !== tokenFor(s) || s.stage !== "awaiting_confirmation") return { error: "token_mismatch", message: "El pedido cambió después del resumen. Volvé a llamar prepare_order." };
    const o = s.order; const dest = U.destination(o.branch); const id = orderId(token); const { total } = priced(ctx, s.cart);
    const text = U.buildMessage({ intent: o.service, cart: s.cart, branchName: dest.name, name: o.name, address: o.address, reference: o.reference, when: o.when, note: o.notes, payment: o.payment, orderId: id, pin: mapsLink(o.location), date: nowOf(ctx).date });
    const url = U.waUrl(dest.whatsapp, text);
    const entry = { id, at: (ctx.now || new Date()).getTime(), branch: o.branch, service: o.service, cart: { ...s.cart } };
    s.placed = { id, token, url, branch: dest.name, dest: o.branch, total, at: entry.at };
    s.stage = "placed"; s.history = [entry, ...s.history].slice(0, 3);
    ctx.emit({ type: "order", id, url, branch: dest.name, total, entry });
    return { placed: true, id, branch: dest.name, total, instruction: "Decile que toque el botón verde para enviar el pedido por WhatsApp." };
  },
  get_order_status(ctx) {
    const s = ctx.state; const last = s.placed || (s.history[0] && { id: s.history[0].id, dest: s.history[0].branch, at: s.history[0].at });
    if (!last || !last.id) return { error: "no_orders", message: "No veo pedidos recientes en este dispositivo." };
    const dest = U.destination(last.dest);
    ctx.emit({ type: "handoff", url: U.waUrl(dest.whatsapp, `¡Hola! Quería saber el estado de mi pedido ${last.id} 🍕`), to: dest.name });
    return { id: last.id, branch: dest.name, placed_at: last.at ? new Date(last.at).toISOString() : null, live_tracking: false, note: "No tenemos seguimiento en vivo: la sucursal te confirma por WhatsApp. Ya le mostré el botón." };
  },
  handoff_to_human(ctx, { reason, summary: sm } = {}) {
    const dest = U.destination(ctx.state.order.branch || (ctx.state.placed && ctx.state.placed.dest) || "callcenter");
    ctx.emit({ type: "handoff", url: U.waUrl(dest.whatsapp, `¡Hola Ugo's! ${str(reason, 80) ? `(${str(reason, 80)}) ` : ""}${str(sm, 300)}`.trim()), to: dest.name });
    return { shown: true, to: dest.name };
  },
  show_options(ctx, { options }) {
    const o = (Array.isArray(options) ? options : []).map((x) => str(x, 40)).filter(Boolean).slice(0, 4);
    if (o.length >= 2) ctx.emit({ type: "options", options: o }); return { shown: o.length >= 2 };
  },
  log_miss(ctx, { text, reason }) { logMiss(text, reason); return { logged: true }; },
};
function todayPromo(ctx) { const w = (U.weekly || []).find((x) => x.day === nowOf(ctx).dow); return w ? { name: w.name, title: w.title, price: w.price } : null; }
function logMiss(text, reason) { try { console.log(JSON.stringify({ evt: "ugoia_miss", text: str(String(text || ""), 200), reason: str(String(reason || ""), 60), at: new Date().toISOString() })); } catch (e) { /* */ } }

/* ---------------- schemas ---------------- */
const S = (props, req = []) => ({ type: "object", properties: props, required: req, additionalProperties: false });
const TOOLS = [
  ["search_menu", "Busca en la carta por nombre, ingrediente o tipo (sin carne, tocino, gaseosa…). Usala para cualquier pregunta de menú.", S({ query: { type: "string" } }, ["query"])],
  ["get_item_details", "Precio, tamaño, ingredientes, combos y promo de un ítem (id o nombre). Siempre incluye el aviso de alérgenos.", S({ item: { type: "string" } }, ["item"])],
  ["get_whats_new", "Novedades: promo del mes, combos, promo del día, lo que viene.", S({})],
  ["get_branches", "Sucursales, horario y si están abiertas ahora. name opcional para una sola.", S({ name: { type: "string" } })],
  ["get_deals", "Promos y combos, más sugerencias según el carrito (casi_combo, yapa) con total_si_acepta.", S({})],
  ["cart_add", "Agrega ítems al carrito (id o nombre). Devuelve opciones si es ambiguo.", S({ items: { type: "array", items: S({ item: { type: "string" }, qty: { type: "integer" }, size: { type: "string" } }, ["item"]) } }, ["items"])],
  ["cart_remove", "Quita un ítem del carrito.", S({ item: { type: "string" } }, ["item"])],
  ["cart_set_qty", "Cambia la cantidad de un ítem (0 lo quita).", S({ item: { type: "string" }, qty: { type: "integer" } }, ["item", "qty"])],
  ["cart_clear", "Vacía el carrito.", S({})],
  ["cart_view", "Muestra el carrito, los datos del pedido y la etapa.", S({})],
  ["cart_undo", "Deshace el último cambio del carrito.", S({})],
  ["cart_swap_to_combo", "Cambia las pizzas del carrito por el combo (o por la promo del mes).", S({ combo_id: { type: "string" } }, ["combo_id"])],
  ["suggest_upsell", "Una sola sugerencia por conversación (combo con gaseosa).", S({})],
  ["get_my_orders", "Mi Pedido: los últimos 3 pedidos de este dispositivo.", S({})],
  ["reorder", "Carga un pedido anterior (index 0 = el último) al carrito.", S({ index: { type: "integer" } })],
  ["set_order_details", "Guarda y valida datos: service (delivery|pickup), branch (sucursal o 'scoobyneta'), address, reference, when ('asap' o HH:MM), name, payment (sólo si el cliente lo dice), notes.", S({ service: { type: "string", enum: ["delivery", "pickup"] }, branch: { type: "string" }, address: { type: "string" }, reference: { type: "string" }, when: { type: "string" }, name: { type: "string" }, payment: { type: "string" }, notes: { type: "string" } })],
  ["request_location", "Entrega con Pin: muestra el botón para compartir la ubicación.", S({})],
  ["prepare_order", "Revisa que esté todo y muestra el resumen para confirmar. Después terminá el turno.", S({})],
  ["place_order", "Confirma el pedido. Sólo funciona si el cliente dijo que sí en un mensaje nuevo después del resumen.", S({ token: { type: "string" } })],
  ["get_order_status", "Sigue tu Pizza: último pedido y botón de WhatsApp a la sucursal.", S({})],
  ["handoff_to_human", "Pasa a una persona por WhatsApp (quejas, reembolsos, eventos grandes, alergias severas, 2 intentos fallidos).", S({ reason: { type: "string" }, summary: { type: "string" } }, ["reason"])],
  ["show_options", "Muestra 2 a 4 botones de respuesta rápida.", S({ options: { type: "array", items: { type: "string" } } }, ["options"])],
  ["log_miss", "Registra algo que el cliente pidió y no tenemos.", S({ text: { type: "string" }, reason: { type: "string" } }, ["text"])],
].map(([name, description, input_schema]) => ({ name, description, input_schema }));

const anthropicTools = () => TOOLS.map((t) => ({ name: t.name, description: t.description, input_schema: t.input_schema }));
const openaiTools = () => TOOLS.map((t) => ({ type: "function", function: { name: t.name, description: t.description, parameters: t.input_schema } }));

function runTool(ctx, name, args) {
  const fn = impl[name];
  if (!fn) return { error: "unknown_tool" };
  try { return fn(ctx, args && typeof args === "object" ? args : {}); } catch (e) { console.error("tool_error", name, e && e.message); return { error: "tool_failed" }; }
}

/* ---------------- yes detection ---------------- */
const YES = /^(si+|sip|sii+|claro|dale|de una|confirmo|confirmar|confirmado|ok|okey|okay|oki|listo|perfecto|bueno|mandalo|mandala|manda(lo|la)? nomas|va|vamos|yes|yep|correcto|exacto|eso|asi es|todo bien|esta bien|de acuerdo|hacelo|hecho)\b/;
const NOT = /\b(no|pero|cambia|cambiar|cambiame|quita|quitale|quitar|saca|agrega|agregale|suma|esperá|espera|mejor|aunque|falta)\b/;
function isYes(text) {
  const t = norm(String(text || "").replace(/[✅👍👌🙌]/gu, " ok "));
  if (!t || t.length > 60) return false;
  return YES.test(t) && !NOT.test(t);
}

module.exports = { TOOLS, anthropicTools, openaiTools, runTool, sanitizeState, isYes, tokenFor, search, tokens, missingFor, impl, U };
