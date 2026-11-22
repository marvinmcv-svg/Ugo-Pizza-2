/* Ugo's CRM — data layer.
 * Everything lives in one JSON document in localStorage (key DB_KEY) so the back office works offline
 * and on a single device today. All reads/writes go through this module, so swapping localStorage for
 * a server API later means changing load()/save() only.
 * Catalog, branches, hours and prices come from js/data.js (window.UGOS) — the same source as the website. */
const U = window.UGOS;
export const DB_KEY = "ugos_crm_v1";
const INBOX_KEY = "ugos_crm_inbox";       // website funnel drops orders here (same browser)
const LEADS_KEY = "ugos_leads";           // website franchise form

export const TZ_OFFSET = -4 * 3600e3;     // Bolivia, no DST
export const DAY = 864e5;
export const localDate = (ts) => new Date(ts + TZ_OFFSET).toISOString().slice(0, 10);
export const localHour = (ts) => new Date(ts + TZ_OFFSET).getUTCHours();
export const localDow = (ts) => new Date(ts + TZ_OFFSET).getUTCDay();
export const hhmm = (ts) => new Date(ts + TZ_OFFSET).toISOString().slice(11, 16);
export const money = (n) => `Bs ${Math.round(n).toLocaleString("es-BO")}`;
export const uid = (p) => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const CATALOG = U.catalog(U.localNow().date);
export const BRANCHES = [...U.branches.map((b) => ({ ...b, kind: "branch" })), { id: U.delivery.id, name: U.delivery.name, kind: "delivery", whatsapp: U.delivery.whatsapp, address: "Despacho central de delivery" }];
export const branchName = (id) => (BRANCHES.find((b) => b.id === id) || { name: id || "—" }).name;

export const STATUSES = [
  { id: "nuevo", name: "Nuevo", tone: "info" },
  { id: "confirmado", name: "Confirmado", tone: "info" },
  { id: "horno", name: "En horno", tone: "warn" },
  { id: "listo", name: "Listo", tone: "good" },
  { id: "camino", name: "En camino", tone: "warn" },
  { id: "entregado", name: "Entregado", tone: "done" },
  { id: "cancelado", name: "Cancelado", tone: "bad" },
];
export const ACTIVE = ["nuevo", "confirmado", "horno", "listo", "camino"];
export const CHANNELS = { web: "Web", whatsapp: "WhatsApp", mostrador: "Mostrador", telefono: "Teléfono" };
export const SERVICES = { delivery: "Delivery", pickup: "Para recoger", salon: "En el local" };
export const PAYMENTS = { efectivo: "Efectivo", qr: "QR", tarjeta: "Tarjeta", transferencia: "Transferencia" };
export const ROLES = { gerente: "Gerente", cajero: "Cajero/a", pizzero: "Pizzero/a", delivery: "Delivery", ayudante: "Ayudante" };

/** next status for an order, or null */
export function nextStatus(o) {
  const flow = o.service === "delivery" ? ["nuevo", "confirmado", "horno", "listo", "camino", "entregado"] : ["nuevo", "confirmado", "horno", "listo", "entregado"];
  const i = flow.indexOf(o.status); return i >= 0 && i < flow.length - 1 ? flow[i + 1] : null;
}

/* ---------------- ingredients + recipes ----------------
 * Quantities are working estimates for a familiar (8 slices) pizza, editable in Inventario → Recetas. */
export const INGREDIENTS = [
  ["masa", "Bollo de masa madre", "u", 2.2, 40], ["salsa", "Salsa de tomate a la leña", "kg", 12, 8], ["mozzarella", "Mozzarella", "kg", 36, 12],
  ["jamon", "Jamón", "kg", 40, 5], ["salchicha", "Salchicha", "kg", 34, 5], ["choclo", "Choclo", "kg", 16, 4], ["tocino", "Tocino", "kg", 52, 4],
  ["cheddar", "Queso cheddar", "kg", 46, 4], ["carne", "Carne molida", "kg", 38, 4], ["pollo", "Pollo desmechado", "kg", 38, 4], ["champinon", "Champiñones", "kg", 40, 3],
  ["pina", "Piña", "kg", 14, 3], ["salame", "Salame", "kg", 60, 3], ["tomate", "Tomate", "kg", 9, 4], ["albahaca", "Albahaca fresca", "kg", 60, .5],
  ["oregano", "Orégano", "kg", 80, .5], ["catupiry", "Queso catupiry", "kg", 50, 3], ["crema", "Crema de leche", "l", 28, 3], ["papa", "Papa frita rayada", "kg", 30, 2],
  ["brocoli", "Brócoli", "kg", 18, 2], ["roquefort", "Queso roquefort", "kg", 120, 1], ["nachos", "Nachos", "kg", 45, 1], ["jalapeno", "Jalapeños", "kg", 50, 1],
  ["pepsi2", "Pepsi 2 L", "u", 10, 24], ["pepsi1", "Pepsi 1 L", "u", 8, 12], ["guarana2", "Guaraná 2 L", "u", 12, 12], ["caja", "Caja familiar Transformer", "u", 1.8, 60],
].map(([id, name, unit, cost, min]) => ({ id, name, unit, cost, min }));
const KW = [["jamón", "jamon", .14], ["salchicha", "salchicha", .15], ["choclo", "choclo", .16], ["tocino", "tocino", .12], ["cheddar", "cheddar", .1], ["carne", "carne", .16],
  ["pollo", "pollo", .16], ["champiñon", "champinon", .12], ["piña", "pina", .14], ["salame", "salame", .12], ["tomate,", "tomate", .12], ["tomate y", "tomate", .12], ["albahaca", "albahaca", .01],
  ["orégano", "oregano", .004], ["catupiry", "catupiry", .1], ["crema de leche", "crema", .1], ["papa", "papa", .08], ["brócoli", "brocoli", .1], ["roquefort", "roquefort", .06],
  ["nachos", "nachos", .06], ["jalapeños", "jalapeno", .04], ["crema de queso cheddar", "cheddar", .08]];
export function defaultRecipes() {
  const r = {};
  for (const it of Object.values(CATALOG)) {
    if (it.kind !== "pizza") continue;
    const d = it.desc.toLowerCase(); const lines = { masa: 1, salsa: .12, mozzarella: .18, caja: 1 };
    for (const [k, ing, q] of KW) if (d.includes(k)) lines[ing] = (lines[ing] || 0) + q * .6;
    r[it.id] = Object.entries(lines).map(([ing, qty]) => ({ ing, qty: Math.round(qty * 1000) / 1000 }));
  }
  return r;
}
const DRINK = { "Pepsi 2 L": "pepsi2", "Pepsi 1 L": "pepsi1", "Guaraná 2 L": "guarana2" };
/** ingredient usage of a catalog item (combos and promos expand to their pizzas) */
export function usage(db, id, qty = 1, out = {}) {
  const it = CATALOG[id]; if (!it) return out;
  const add = (ing, q) => (out[ing] = (out[ing] || 0) + q * qty);
  if (it.kind === "pizza") (db.recipes[id] || []).forEach((l) => add(l.ing, l.qty));
  else if (it.kind === "combo") { it.parts.forEach((p) => usage(db, p, qty, out)); if (DRINK[it.drink]) add(DRINK[it.drink], 1); }
  else if (it.kind === "promo" && it.ref) usage(db, it.ref, qty, out);
  return out;
}
/** food cost of one unit, from ingredient prices */
export function unitCost(db, id) {
  const u = usage(db, id, 1); return Object.entries(u).reduce((a, [ing, q]) => a + q * ((db.ingredients.find((x) => x.id === ing) || {}).cost || 0), 0);
}

/* ---------------- persistence ---------------- */
let db = null; const subs = new Set();
export function get() { return db; }
export function load() {
  try { db = JSON.parse(localStorage.getItem(DB_KEY) || "null"); } catch (e) { db = null; }
  if (!db || db.v !== 1) { db = seed(); save(); }
  if (pullWebsite()) save();
  return db;
}
export function save() { try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch (e) { console.warn("CRM: storage full or blocked", e); } subs.forEach((f) => f()); }
export function subscribe(f) { subs.add(f); return () => subs.delete(f); }
addEventListener("storage", (e) => {
  if (e.key === DB_KEY) { try { db = JSON.parse(e.newValue); subs.forEach((f) => f()); } catch (er) { /* */ } }
  if (e.key === INBOX_KEY || e.key === LEADS_KEY) { if (pullWebsite()) save(); }
});
export function reset({ demo }) { db = demo ? seed() : seed({ empty: true }); save(); }

/** orders and leads created on the public website (same browser) */
export function pullWebsite() {
  let changed = false;
  let inbox = [];
  try { inbox = JSON.parse(localStorage.getItem(INBOX_KEY) || "[]"); } catch (e) { /* */ }
  for (const w of inbox) {
    if (db.orders.some((o) => o.webId === w.webId)) continue;
    const c = upsertCustomer({ name: w.name, phone: w.phone || "", address: w.address || "", zone: "" });
    const items = Object.entries(w.cart || {}).filter(([id]) => CATALOG[id]).map(([id, qty]) => ({ id, qty, price: CATALOG[id].price }));
    if (!items.length) continue;
    db.orders.push(makeOrder({ webId: w.webId, at: w.at, branch: w.branch, channel: "web", service: w.service === "pickup" ? "pickup" : "delivery", customerId: c.id, items, note: [w.note, w.reference && `Ref: ${w.reference}`, w.when && w.when !== "asap" && `Para las ${w.when}`].filter(Boolean).join(" · "), address: w.address, pin: w.pin }));
    changed = true;
  }
  if (inbox.length) { try { localStorage.setItem(DB_KEY, JSON.stringify(db)); localStorage.setItem(INBOX_KEY, "[]"); } catch (e) { /* keep the inbox if the save failed */ } }
  let leads = [];
  try { leads = JSON.parse(localStorage.getItem(LEADS_KEY) || "[]"); } catch (e) { /* */ }
  for (const l of leads) if (!db.leads.some((x) => x.at === l.at && x.name === l.name)) { db.leads.unshift({ id: uid("L"), status: "nuevo", ...l }); changed = true; }
  return changed;
}

/* ---------------- operations ---------------- */
export function makeOrder(o) {
  const items = o.items.map((l) => ({ id: l.id, qty: l.qty, price: l.price ?? CATALOG[l.id].price, name: (CATALOG[l.id] || {}).name || l.id }));
  const sub = items.reduce((a, l) => a + l.qty * l.price, 0);
  const discount = o.discount || 0;
  const seq = (db.seq = (db.seq || 1000) + 1);
  return { id: `UG-${seq}`, at: o.at || Date.now(), branch: o.branch || BRANCHES[0].id, channel: o.channel || "mostrador", service: o.service || "pickup", customerId: o.customerId || null,
    items, sub, discount, total: Math.max(0, sub - discount), coupon: o.coupon || null, status: o.status || "nuevo", times: o.times || { nuevo: o.at || Date.now() }, payment: o.payment || null,
    riderId: o.riderId || null, note: o.note || "", address: o.address || "", pin: o.pin || "", webId: o.webId || null, deducted: !!o.deducted, paid: !!o.paid };
}
export function addOrder(o) { const ord = makeOrder(o); db.orders.push(ord); if (ord.customerId) touchCustomer(ord); save(); return ord; }
export function setStatus(order, status, extra = {}) {
  order.status = status; order.times = { ...order.times, [status]: Date.now() }; Object.assign(order, extra);
  if (status === "horno" && !order.deducted) { deduct(order, -1); order.deducted = true; }
  if (status === "cancelado" && order.deducted) { deduct(order, +1); order.deducted = false; }
  if (status === "entregado") { order.paid = true; touchCustomer(order); }
  save();
}
function deduct(order, sign) {
  const use = {}; order.items.forEach((l) => usage(db, l.id, l.qty, use));
  const st = (db.stock[order.branch] = db.stock[order.branch] || {});
  for (const [ing, q] of Object.entries(use)) st[ing] = Math.round(((st[ing] || 0) + sign * q) * 1000) / 1000;
}
export function touchCustomer(order) {
  const c = db.customers.find((x) => x.id === order.customerId); if (!c) return;
  if (order.status === "entregado" && !order.pointsGiven) { c.points = (c.points || 0) + Math.floor(order.total / 10); order.pointsGiven = true; }
}
export function upsertCustomer({ name, phone, address, zone }) {
  const norm = (s) => (s || "").toLowerCase().replace(/\s+/g, " ").trim();
  let c = (phone && db.customers.find((x) => x.phone && x.phone.replace(/\D/g, "") === phone.replace(/\D/g, ""))) || db.customers.find((x) => norm(x.name) === norm(name) && !phone);
  if (!c) { c = { id: uid("C"), name: name || "Cliente", phone: phone || "", address: address || "", zone: zone || "", createdAt: Date.now(), tags: [], notes: "", points: 0, birthday: "" }; db.customers.push(c); }
  else { if (address && !c.address) c.address = address; if (phone && !c.phone) c.phone = phone; }
  return c;
}

/* ---------------- analytics helpers ---------------- */
export function ordersIn(from, to, branch) {
  return db.orders.filter((o) => o.at >= from && o.at < to && (!branch || o.branch === branch));
}
export const sold = (os) => os.filter((o) => o.status !== "cancelado");
export function customerStats() {
  const m = new Map();
  for (const o of db.orders) {
    if (!o.customerId || o.status === "cancelado") continue;
    const s = m.get(o.customerId) || { n: 0, spent: 0, first: Infinity, last: 0, fav: {} };
    s.n++; s.spent += o.total; s.first = Math.min(s.first, o.at); s.last = Math.max(s.last, o.at);
    o.items.forEach((l) => (s.fav[l.id] = (s.fav[l.id] || 0) + l.qty)); m.set(o.customerId, s);
  }
  return m;
}
/** RFM-style segment for a customer */
export function segment(s, now = Date.now()) {
  if (!s || !s.n) return { id: "sin", name: "Sin pedidos" };
  const days = (now - s.last) / DAY;
  if (s.n >= 18 && days <= 10) return { id: "vip", name: "VIP" };
  if (days > 30) return { id: "dormido", name: "Dormido" };
  if (s.n === 1 && (now - s.first) / DAY <= 14) return { id: "nuevo", name: "Nuevo" };
  if (s.n >= 3) return { id: "frecuente", name: "Frecuente" };
  return { id: "ocasional", name: "Ocasional" };
}

/* ---------------- demo seed ---------------- */
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const FN = ["Carla", "Diego", "Valeria", "Luis", "Camila", "José", "Daniela", "Marco", "Andrea", "Jorge", "Paola", "Rodrigo", "Fernanda", "Miguel", "Gabriela", "Carlos", "Mariana", "Juan Pablo", "Natalia", "Sebastián", "Lucía", "Mauricio", "Ana", "Ricardo", "Sofía", "Alejandro", "Verónica", "Fabián", "Claudia", "Erick", "Karen", "Javier", "Melissa", "Óscar", "Patricia", "Gonzalo", "Roxana", "Iván", "Silvia", "Hugo"];
const LN = ["Rojas", "Vargas", "Gutiérrez", "Mendoza", "Flores", "Suárez", "Justiniano", "Saucedo", "Áñez", "Montaño", "Roca", "Paz", "Ribera", "Peña", "Cuéllar", "Aguilera", "Salvatierra", "Chávez", "Rivero", "Mercado", "Banegas", "Durán", "Égüez", "Zambrana", "Méndez", "Villarroel"];
const ZONES = ["Equipetrol", "Urbarí", "Las Palmas", "Plan 3000", "Villa 1ro de Mayo", "Barrio Hamacas", "El Trompillo", "La Ramada", "Los Lotes", "Pampa de la Isla", "Norte, 4to anillo", "Sirari", "Doble Vía La Guardia", "Paurito", "Radial 26"];

function seed({ empty = false } = {}) {
  const prev = db; db = { v: 1, seq: 1000, demo: !empty, seededAt: Date.now(), orders: [], customers: [], staff: [], shifts: [], clock: [], stock: {}, purchases: [], waste: [],
    ingredients: INGREDIENTS.map((x) => ({ ...x })), recipes: defaultRecipes(), coupons: [], campaigns: [], leads: [], suppliers: [],
    settings: { slaMin: 35, deliveryFee: null, loyaltyBsPerPoint: 10, pointsReward: 50 } };
  db.suppliers = [{ id: "S1", name: "Lácteos del Oriente", phone: "", items: ["mozzarella", "cheddar", "catupiry", "roquefort", "crema"] },
    { id: "S2", name: "Embutidos Santa Cruz", phone: "", items: ["jamon", "salchicha", "tocino", "salame"] },
    { id: "S3", name: "Mercado Abasto (verduras)", phone: "", items: ["tomate", "albahaca", "choclo", "brocoli", "pina", "champinon"] },
    { id: "S4", name: "Distribuidora de bebidas", phone: "", items: ["pepsi2", "pepsi1", "guarana2"] },
    { id: "S5", name: "Cartonera (cajas)", phone: "", items: ["caja"] }];
  const r = rng(20261122); const pick = (a) => a[Math.floor(r() * a.length)];
  // staff for every branch, delivery riders on the Scoobyneta
  for (const b of BRANCHES) {
    const team = b.kind === "delivery" ? [["gerente", 1], ["delivery", 6], ["cajero", 1]] : [["gerente", 1], ["cajero", 2], ["pizzero", 2], ["ayudante", 1], ["delivery", 1]];
    for (const [role, n] of team) for (let k = 0; k < n; k++) {
      const s = { id: uid("E"), name: `${pick(FN)} ${pick(LN)}`, role, branch: b.id, phone: `7${Math.floor(1e6 + r() * 8.9e6)}`, active: true, since: Date.now() - Math.floor(r() * 900) * DAY, rate: { gerente: 32, cajero: 16, pizzero: 18, delivery: 15, ayudante: 13 }[role] };
      db.staff.push(s);
      for (let d = 0; d < 7; d++) { if (d === (k + db.staff.length) % 7) continue; const late = (k % 2 === 1); db.shifts.push({ staffId: s.id, day: d, start: d === 2 ? "17:00" : late ? "18:00" : "12:00", end: late ? "01:00" : "19:00" }); }
    }
  }
  // stock: a week of cover per branch, a few things running low so alerts show something real
  for (const b of BRANCHES) { const st = (db.stock[b.id] = {}); for (const i of db.ingredients) st[i.id] = Math.round(i.min * (1.4 + r() * 2.2) * 100) / 100; }
  db.stock["plan-3000"].mozzarella = 7.2; db.stock.paragua.pepsi2 = 9; db.stock.pirai.tocino = 1.6; db.stock.km6.caja = 34;
  db.coupons = [{ code: "HERMOSO10", desc: "10% de descuento en tu pedido", type: "pct", value: 10, uses: 0, maxUses: 200, active: true, until: "2026-12-31" },
    { code: "SCOOBY5", desc: "Bs 5 menos en delivery por La Scoobyneta", type: "amt", value: 5, uses: 0, maxUses: 500, active: true, until: "2026-11-30" }];
  if (empty) { db.leads = prev ? prev.leads || [] : []; return db; }

  for (let k = 0; k < 420; k++) {
    const name = `${pick(FN)} ${pick(LN)}`; db.customers.push({ id: uid("C") + k, name, phone: `+591 7${Math.floor(1e6 + r() * 8.9e6)}`, zone: pick(ZONES), address: `${pick(ZONES)}, calle ${1 + Math.floor(r() * 40)} #${100 + Math.floor(r() * 900)}`, createdAt: 0, tags: r() < .08 ? ["Empresa"] : [], notes: "", points: 0, birthday: r() < .5 ? `2000-${String(1 + Math.floor(r() * 12)).padStart(2, "0")}-${String(1 + Math.floor(r() * 28)).padStart(2, "0")}` : "" });
  }
  // customer "loyalty weight": a few heavy regulars, a long tail
  const weight = db.customers.map(() => .07 + Math.pow(r(), 3)); const wsum = weight.reduce((a, b) => a + b, 0);
  const pickCustomer = () => { let x = r() * wsum; for (let i = 0; i < weight.length; i++) { x -= weight[i]; if (x <= 0) return db.customers[i]; } return db.customers[0]; };
  const menuW = { cheeseburguer: 9, jamoneitor: 8, "combo-2-jamoneitor": 6, "promo-jamoneitor-35": 7, salchichona: 5, "combo-jamoneitor": 4, americana: 4, hawaiana: 4, "bruto-tocino": 4, "4-quesos": 3, ugos: 3, mexicana: 3, salame: 3, "combo-2-salchichonas": 3, "pollo-requeson": 3, champinon: 2, margarita: 2, napolitana: 2, chocluda: 2, "strogonoff-carne": 2, "strogonoff-pollo": 2, "brocoli-bacon": 2, "combo-chocluda": 1, "combo-americana": 1, "combo-salame": 1, "combo-bruto-tocino": 2, "combo-salchichona": 1, "combo-strogonoff-pollo": 1 };
  const menu = Object.entries(menuW).filter(([id]) => CATALOG[id]); const mw = menu.reduce((a, [, w]) => a + w, 0);
  const pickItem = () => { let x = r() * mw; for (const [id, w] of menu) { x -= w; if (x <= 0) return id; } return menu[0][0]; };
  const hourW = [0, .4, .1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1.6, 2.4, 1.6, .8, .6, .9, 1.6, 2.6, 3.4, 3.2, 2.3, 1.2]; // 0..23 local
  const branchW = { "radial-27": 1.3, paragua: 1.1, "santos-dumont": 1, mechero: .9, "plan-3000": 1, pirai: 1.2, lujan: .8, km6: .9, villa: .7, scoobyneta: 1.6 };
  const riders = (b) => db.staff.filter((s) => s.role === "delivery" && s.branch === b);
  const now = Date.now(); const todayStart = Date.parse(localDate(now) + "T00:00:00Z") - TZ_OFFSET;
  for (let d = 34; d >= 0; d--) {
    const day0 = todayStart - d * DAY; const dow = localDow(day0 + 12 * 3600e3);
    const base = [70, 52, 30, 58, 66, 96, 104][dow] * (1 + (34 - d) * .004);
    const n = Math.round(base * (.85 + r() * .3));
    for (let k = 0; k < n; k++) {
      let h; { let x = r() * hourW.reduce((a, b) => a + b, 0); for (h = 0; h < 24; h++) { x -= hourW[h]; if (x <= 0) break; } }
      if (dow === 2 && h >= 12 && h < 17) h = 17 + Math.floor(r() * 5);
      const at = day0 + h * 3600e3 + Math.floor(r() * 3600e3); if (at > now - 60e3) continue;
      let bx = r() * Object.values(branchW).reduce((a, b) => a + b, 0); let branch = "radial-27"; for (const [id, w] of Object.entries(branchW)) { bx -= w; if (bx <= 0) { branch = id; break; } }
      const service = branch === "scoobyneta" ? "delivery" : r() < .45 ? "delivery" : r() < .7 ? "pickup" : "salon";
      const channel = service === "salon" ? "mostrador" : r() < .55 ? "whatsapp" : r() < .7 ? "web" : r() < .8 ? "telefono" : "mostrador";
      const items = []; const ni = r() < .62 ? 1 : r() < .8 ? 2 : 3;
      for (let i = 0; i < ni; i++) { let id = pickItem(); if (id === "promo-jamoneitor-35" && branch !== "scoobyneta") id = "jamoneitor"; const ex = items.find((x) => x.id === id); if (ex) ex.qty++; else items.push({ id, qty: 1 }); }
      const cust = service === "salon" && r() < .6 ? null : pickCustomer();
      const ord = makeOrder({ at, branch, channel, service, customerId: cust && cust.id, items, payment: pick(["efectivo", "efectivo", "qr", "qr", "tarjeta", "transferencia"]), address: service === "delivery" && cust ? cust.address : "" });
      const age = (now - at) / 60e3;
      const flow = service === "delivery" ? [["confirmado", 2], ["horno", 6], ["listo", 18], ["camino", 22], ["entregado", 38]] : [["confirmado", 2], ["horno", 5], ["listo", 17], ["entregado", 24]];
      if (r() < .025 && age > 30) { ord.status = "cancelado"; ord.times.cancelado = at + 4 * 60e3; ord.cancelReason = pick(["Cliente no responde", "Dirección fuera de zona", "Pedido duplicado"]); }
      else for (const [st, m] of flow) { const jitter = m * (.8 + r() * .6); if (age >= jitter) { ord.status = st; ord.times[st] = at + jitter * 60e3; } }
      if (service === "delivery" && ["camino", "entregado"].includes(ord.status)) { const rs = riders(branch); if (rs.length) ord.riderId = pick(rs).id; }
      if (ord.status === "entregado") { ord.paid = true; ord.deducted = true; if (cust) { cust.points += Math.floor(ord.total / 10); ord.pointsGiven = true; } }
      else if (["horno", "listo", "camino"].includes(ord.status)) ord.deducted = true;
      if (cust && (!cust.createdAt || at < cust.createdAt)) cust.createdAt = at;
      db.orders.push(ord);
    }
  }
  const live = [[2, "nuevo"], [4, "nuevo"], [6, "confirmado"], [9, "confirmado"], [11, "horno"], [14, "horno"], [17, "horno"], [21, "listo"], [24, "listo"], [27, "camino"], [33, "camino"], [41, "horno"]];
  for (const [mins, status] of live) {
    const branch = pick(["radial-27", "pirai", "paragua", "scoobyneta", "radial-27", "plan-3000"]); const service = branch === "scoobyneta" || status === "camino" ? "delivery" : pick(["delivery", "pickup", "pickup"]);
    const cust = pickCustomer(); const items = [{ id: pickItem(), qty: 1 }]; if (r() < .4) items.push({ id: pickItem(), qty: 1 + Math.floor(r() * 2) });
    const uniq = []; items.forEach((it) => { if (it.id === "promo-jamoneitor-35" && branch !== "scoobyneta") it.id = "jamoneitor"; const ex = uniq.find((x) => x.id === it.id); if (ex) ex.qty += it.qty; else uniq.push(it); });
    const at = now - mins * 60e3; const ord = makeOrder({ at, branch, channel: pick(["whatsapp", "web", "whatsapp", "telefono"]), service, customerId: cust.id, items: uniq, payment: r() < .5 ? pick(["qr", "efectivo"]) : null, address: service === "delivery" ? cust.address : "", note: r() < .3 ? pick(["Sin orégano", "Cortar en 12", "Traer cambio de 200", "Bien cocida"]) : "" });
    const steps = ["nuevo", "confirmado", "horno", "listo", "camino"]; steps.slice(1, steps.indexOf(status) + 1).forEach((s, k) => (ord.times[s] = at + (k + 1) * Math.min(5, mins / 5) * 60e3));
    ord.status = status; if (["horno", "listo", "camino"].includes(status)) ord.deducted = true;
    if (status === "camino") { const rs = riders(branch); if (rs.length) ord.riderId = pick(rs).id; }
    db.orders.push(ord);
  }
  db.orders.sort((a, b) => a.at - b.at);
  // clock-ins today for people whose shift has started
  const todayDow = localDow(now); const nowH = localHour(now);
  for (const sh of db.shifts.filter((x) => x.day === todayDow)) { const sH = Number(sh.start.slice(0, 2)); if (nowH >= sH || nowH < 2) db.clock.push({ staffId: sh.staffId, in: todayStart + sH * 3600e3 + Math.floor(r() * 12) * 60e3, out: null }); }
  db.purchases = [{ id: "OC-201", at: now - 2 * DAY, branch: "radial-27", supplier: "S1", items: [{ ing: "mozzarella", qty: 25, cost: 48 }], status: "recibida" },
    { id: "OC-202", at: now - 5 * 3600e3, branch: "plan-3000", supplier: "S1", items: [{ ing: "mozzarella", qty: 20, cost: 48 }, { ing: "cheddar", qty: 5, cost: 58 }], status: "enviada" }];
  db.seq = 1000 + db.orders.length + 1;
  db.campaigns = [{ id: "K1", at: now - 6 * DAY, name: "Te extrañamos", segment: "dormido", message: "¡Hola {nombre}! Hace rato no te vemos 😎 Con el código HERMOSO10 tenés 10% en tu próxima pizza.", sent: 38 }];
  db.leads = prev ? prev.leads || [] : [];
  return db;
}
