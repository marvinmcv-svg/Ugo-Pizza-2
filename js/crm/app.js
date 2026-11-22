/* Ugo's CRM — app shell, router and every module's screen. */
import * as S from "./store.js";
import { $, $$, esc, initials, fmt, delta, ago, mmss, drawer, modal, closeLayers, toast, bars, line, hbars, stack, heat, table, csv } from "./ui.js";

const U = window.UGOS;
const { money, DAY, localDate, localHour, localDow, hhmm, CATALOG, BRANCHES, branchName, STATUSES, ACTIVE, CHANNELS, SERVICES, PAYMENTS, ROLES } = S;
const db = () => S.get();
const st = (id) => STATUSES.find((s) => s.id === id) || STATUSES[0];
const pill = (id) => { const s = st(id); return `<span class="pill pill--${s.tone}"><i></i>${s.name}</span>`; };
const cust = (id) => db().customers.find((c) => c.id === id);
const staff = (id) => db().staff.find((s) => s.id === id);
const ing = (id) => db().ingredients.find((i) => i.id === id) || { name: id, unit: "" };
const dayStart = (ts = Date.now()) => Date.parse(localDate(ts) + "T00:00:00Z") - S.TZ_OFFSET;
const itemsText = (o) => o.items.map((l) => `${l.qty}× ${esc(l.name)}`).join(", ");
const qtyFmt = (q, unit) => (unit === "u" ? fmt(q) : fmt(q, q < 10 ? 2 : 1)) + " " + unit;
const wa = (phone, text) => `https://wa.me/${String(phone || "").replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;

/* ---------------- state ---------------- */
const state = { route: "panel", branch: "", sort: {}, tab: {}, seg: "", range: "30", kdsBranch: "", ordersMode: "board", custQ: "" };
const NAV = [
  ["panel", "Panel", '<path d="M3 13h8V3H3zM13 21h8V11h-8zM3 21h8v-6H3zM13 3v6h8V3z"/>'],
  ["pedidos", "Pedidos", '<path d="M4 4h16v16H4z"/><path d="M8 9h8M8 13h8M8 17h5"/>'],
  ["cocina", "Cocina", '<path d="M3 11h18l-2 9H5z"/><path d="M7 11a5 5 0 0 1 10 0"/><path d="M12 3v3"/>'],
  ["delivery", "Delivery", '<circle cx="6" cy="17" r="3"/><circle cx="18" cy="17" r="3"/><path d="M9 17h6l-3-7H8M15 6h3l3 8"/>'],
  ["-", "Gente"],
  ["clientes", "Clientes", '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M17 4a4 4 0 0 1 0 8M22 21a7 7 0 0 0-4-6"/>'],
  ["personal", "Personal", '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18"/>'],
  ["leads", "Leads", '<path d="M4 4h16v12H5l-1 4z"/><path d="M8 9h8M8 12h5"/>'],
  ["-", "Operación"],
  ["sucursales", "Sucursales", '<path d="M3 21h18M5 21V9l7-5 7 5v12"/><path d="M9 21v-6h6v6"/>'],
  ["inventario", "Inventario", '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>'],
  ["marketing", "Marketing", '<path d="M3 11v2a1 1 0 0 0 1 1h3l5 4V6L7 10H4a1 1 0 0 0-1 1zM16 8a5 5 0 0 1 0 8M19 5a9 9 0 0 1 0 14"/>'],
  ["reportes", "Reportes", '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'],
  ["ajustes", "Ajustes", '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'],
];
const VIEWS = {};
const scoped = (os) => (state.branch ? os.filter((o) => o.branch === state.branch) : os);
const lateness = (o) => { const sla = db().settings.slaMin * 60e3; const age = Date.now() - o.at; return age > sla ? "late" : age > sla * .7 ? "warn" : ""; };

/* ---------------- shell ---------------- */
function renderNav() {
  const active = scoped(db().orders.filter((o) => ACTIVE.includes(o.status)));
  const late = active.filter((o) => lateness(o) === "late").length;
  const low = lowStock().length; const leads = db().leads.filter((l) => l.status === "nuevo").length;
  const badge = { pedidos: active.length ? `<span class="cnt${late ? "" : " cnt--warn"}" title="${late} atrasados">${active.length}</span>` : "", inventario: low ? `<span class="cnt cnt--warn">${low}</span>` : "", leads: leads ? `<span class="cnt">${leads}</span>` : "" };
  $("#nav").innerHTML = NAV.map(([id, name, ico]) => id === "-" ? `<div class="sep">${name}</div>` : `<a href="#/${id}" class="${state.route === id ? "is-on" : ""}"><svg viewBox="0 0 24 24" aria-hidden="true">${ico}</svg>${name}${badge[id] || ""}</a>`).join("");
}
function render() {
  const v = VIEWS[state.route] || VIEWS.panel;
  $("#title").textContent = (NAV.find((n) => n[0] === state.route) || NAV[0])[1];
  $("#demoBar").hidden = !db().demo;
  renderNav();
  $("#view").innerHTML = v.html();
  v.after && v.after();
}
function route() {
  const r = (location.hash.replace(/^#\/?/, "") || "panel").split("/")[0];
  state.route = VIEWS[r] ? r : "panel"; $("#side").classList.remove("is-open"); render(); $("#view").focus({ preventScroll: true }); scrollTo(0, 0);
}
function initShell() {
  $("#branchSel").innerHTML = `<option value="">Todas las sucursales</option>` + BRANCHES.map((b) => `<option value="${b.id}">${esc(b.name)}</option>`).join("");
  $("#branchSel").addEventListener("change", (e) => { state.branch = e.target.value; render(); });
  $("#newOrderBtn").addEventListener("click", () => openPOS());
  $("#menuBtn").addEventListener("click", () => $("#side").classList.toggle("is-open"));
  addEventListener("hashchange", route);
  // global search
  const q = $("#q"), box = $("#qres");
  q.addEventListener("input", () => {
    const t = q.value.trim().toLowerCase(); if (t.length < 2) { box.hidden = true; return; }
    const digits = t.replace(/\D/g, "");
    const cs = db().customers.filter((c) => c.name.toLowerCase().includes(t) || (digits.length > 3 && c.phone.replace(/\D/g, "").includes(digits))).slice(0, 6);
    const os = db().orders.filter((o) => o.id.toLowerCase().includes(t)).slice(-5).reverse();
    box.innerHTML = [...cs.map((c) => `<button data-open-cust="${c.id}"><span class="avatar">${initials(c.name)}</span><span><b>${esc(c.name)}</b><br><small style="margin:0">${esc(c.phone)}</small></span><small>Cliente</small></button>`),
      ...os.map((o) => `<button data-open-order="${o.id}"><span class="mono">${o.id}</span> ${pill(o.status)}<small>${money(o.total)}</small></button>`)].join("") || `<div class="empty">Sin resultados</div>`;
    box.hidden = false;
  });
  document.addEventListener("click", (e) => { if (!e.target.closest(".top")) box.hidden = true; });
  // delegated actions used across views
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-open-order],[data-open-cust],[data-act],[data-adv],[data-goto]"); if (!t) return;
    if (t.dataset.openOrder) { box.hidden = true; openOrder(t.dataset.openOrder); }
    else if (t.dataset.openCust) { box.hidden = true; openCustomer(t.dataset.openCust); }
    else if (t.dataset.adv) { e.stopPropagation(); advance(t.dataset.adv); }
    else if (t.dataset.goto) { location.hash = "#/" + t.dataset.goto; }
    else if (t.dataset.act) actions[t.dataset.act] && actions[t.dataset.act](t, e);
  });
  // sortable tables
  document.addEventListener("click", (e) => {
    const th = e.target.closest("th.sort"); if (!th) return; const id = th.closest("table").dataset.tbl;
    const cur = state.sort[id] || {}; state.sort[id] = { k: th.dataset.k, dir: cur.k === th.dataset.k ? -cur.dir : -1 }; render();
  });
  setInterval(() => { $("#sideClock").textContent = hhmm(Date.now()); tick(); }, 1000);
  S.subscribe(() => { if ($("#drawer").hidden && $("#modal").hidden) render(); else renderNav(); });
}
/* live timers without re-rendering everything */
function tick() {
  $$("[data-since]").forEach((el) => { const ms = Date.now() - Number(el.dataset.since); el.textContent = mmss(ms); const sla = db().settings.slaMin * 60e3; el.classList.toggle("is-late", ms > sla); el.classList.toggle("is-warn", ms > sla * .7 && ms <= sla); });
}

/* ---------------- order actions ---------------- */
function advance(id) {
  const o = db().orders.find((x) => x.id === id); if (!o) return; const n = S.nextStatus(o); if (!n) return;
  if (n === "camino" && !o.riderId) { assignRider(o, true); return; }
  S.setStatus(o, n); toast(`${o.id} → ${st(n).name}`);
}
function assignRider(o, thenGo) {
  const rs = db().staff.filter((s) => s.role === "delivery" && s.active && (s.branch === o.branch || s.branch === U.delivery.id));
  const busy = new Set(db().orders.filter((x) => x.status === "camino").map((x) => x.riderId));
  modal(`<h2 class="h" id="modalT">Asignar delivery · <span class="mono">${o.id}</span></h2><p class="sub">${esc(o.address || "Sin dirección")}${o.pin ? ` · <a href="${esc(o.pin)}" target="_blank" rel="noopener">ubicación</a>` : ""}</p>
    ${rs.map((r) => `<div class="rider"><span class="avatar">${initials(r.name)}</span><div><b>${esc(r.name)}</b><br><small class="muted">${esc(branchName(r.branch))}</small></div>${busy.has(r.id) ? `<span class="pill pill--warn">En ruta</span>` : `<span class="pill pill--good">Disponible</span>`}<button class="btn btn--sm btn--brand" data-act="pickRider" data-o="${o.id}" data-r="${r.id}" data-go="${thenGo ? 1 : 0}">Asignar</button></div>`).join("") || `<div class="empty">No hay repartidores activos en esta sucursal.</div>`}`, { small: true });
}
function custMsg(o) {
  const c = cust(o.customerId); const first = c ? c.name.split(" ")[0] : "";
  const t = { confirmado: `¡Hola ${first}! 😎 Recibimos tu pedido ${o.id} (${money(o.total)}). Ya lo estamos preparando en ${branchName(o.branch)}.`, horno: `¡${first}, tu pedido ${o.id} ya está en el horno! 🔥🍕`,
    listo: o.service === "delivery" ? `¡${first}, tu pedido ${o.id} está listo y sale en minutos! 🛵` : `¡${first}, tu pedido ${o.id} está listo para recoger en ${branchName(o.branch)}! 🍕`,
    camino: `¡${first}, tu pedido ${o.id} va en camino! 🛵 ${staff(o.riderId) ? `Te lo lleva ${staff(o.riderId).name.split(" ")[0]}.` : ""}`, entregado: `¡Gracias ${first}! Esperamos que la disfrutes 😎 Sumaste ${Math.floor(o.total / 10)} puntos Ugo's.` };
  return t[o.status] || `¡Hola ${first}! Sobre tu pedido ${o.id}…`;
}
function printTicket(o) {
  const c = cust(o.customerId); let el = $("#printArea"); if (!el) { el = document.createElement("div"); el.id = "printArea"; document.body.append(el); }
  el.innerHTML = `<div style="text-align:center"><b>UGO'S PIZZA</b><br>${esc(branchName(o.branch))}<br>${new Date(o.at).toLocaleString("es-BO", { timeZone: "America/La_Paz" })}</div><hr>
    <b>${o.id}</b> · ${SERVICES[o.service]} · ${CHANNELS[o.channel]}<br>${c ? esc(c.name) + "<br>" + esc(c.phone) + "<br>" : ""}${o.address ? esc(o.address) + "<br>" : ""}<hr>
    ${o.items.map((l) => `${l.qty} x ${esc(l.name)}<span style="float:right">${money(l.qty * l.price)}</span>`).join("<br>")}<hr>
    ${o.discount ? `Descuento<span style="float:right">-${money(o.discount)}</span><br>` : ""}<b>TOTAL<span style="float:right">${money(o.total)}</span></b><br>Pago: ${PAYMENTS[o.payment] || "—"}${o.note ? `<hr>Nota: ${esc(o.note)}` : ""}<hr><div style="text-align:center">¡Sólo para hermosos! 😎</div>`;
  print();
}
const actions = {
  pickRider(t) { const o = db().orders.find((x) => x.id === t.dataset.o); o.riderId = t.dataset.r; closeLayers(); if (t.dataset.go === "1") S.setStatus(o, "camino"); else S.save(); toast(`${staff(o.riderId).name.split(" ")[0]} lleva ${o.id}`); },
  cancel(t) { const o = db().orders.find((x) => x.id === t.dataset.o); const why = prompt("¿Por qué se cancela?", "Cliente canceló"); if (why == null) return; S.setStatus(o, "cancelado", { cancelReason: why }); closeLayers(); toast(`${o.id} cancelado`); },
  rider(t) { assignRider(db().orders.find((x) => x.id === t.dataset.o), false); },
  print(t) { printTicket(db().orders.find((x) => x.id === t.dataset.o)); },
  pay(t) { const o = db().orders.find((x) => x.id === t.dataset.o); o.payment = t.dataset.p; o.paid = true; S.save(); openOrder(o.id); },
  clean() { if (confirm("Esto borra los datos de demostración (pedidos, clientes, personal, stock) y deja el sistema vacío con la carta y sucursales reales. ¿Seguimos?")) { S.reset({ demo: false }); toast("Sistema en limpio"); location.hash = "#/panel"; } },
};

/* ---------------- order drawer ---------------- */
function openOrder(id) {
  const o = db().orders.find((x) => x.id === id); if (!o) return; const c = cust(o.customerId); const n = S.nextStatus(o);
  const flow = o.service === "delivery" ? ["nuevo", "confirmado", "horno", "listo", "camino", "entregado"] : ["nuevo", "confirmado", "horno", "listo", "entregado"];
  const cost = o.items.reduce((a, l) => a + S.unitCost(db(), l.id) * l.qty, 0);
  drawer(`<div class="od__head"><h2 id="drawerT">${o.id}</h2>${pill(o.status)}<span class="pill">${CHANNELS[o.channel]}</span><span class="pill">${SERVICES[o.service]}</span></div>
    <div class="muted">${esc(branchName(o.branch))} · ${new Date(o.at).toLocaleString("es-BO", { timeZone: "America/La_Paz", dateStyle: "medium", timeStyle: "short" })} · hace ${ago(o.at)}</div>
    ${o.status === "cancelado" ? `<p class="pill pill--bad" style="margin-top:12px">Cancelado: ${esc(o.cancelReason || "—")}</p>` : `<div class="steps">${flow.map((s) => `<span class="${o.times[s] ? "is-done" : ""}">${st(s).name}<small>${o.times[s] ? hhmm(o.times[s]) : "—"}</small></span>`).join("")}</div>`}
    ${c ? `<div class="who" style="margin:12px 0"><span class="avatar">${initials(c.name)}</span><div><b>${esc(c.name)}</b><small>${esc(c.phone || "sin teléfono")}</small></div><button class="btn btn--sm" style="margin-left:auto" data-open-cust="${c.id}">Ficha</button></div>` : `<p class="muted">Cliente de mostrador</p>`}
    <div class="lines">${o.items.map((l) => `<div><span>${l.qty}× ${esc(l.name)}</span><span class="num">${money(l.qty * l.price)}</span></div>`).join("")}${o.discount ? `<div style="background:none;font-weight:400"><span>Descuento ${esc(o.coupon || "")}</span><span>−${money(o.discount)}</span></div>` : ""}<div><span>Total</span><span class="num">${money(o.total)}</span></div></div>
    <dl class="kv">${o.address ? `<dt>Dirección</dt><dd>${esc(o.address)}${o.pin ? ` · <a href="${esc(o.pin)}" target="_blank" rel="noopener">ver mapa</a>` : ""}</dd>` : ""}${o.note ? `<dt>Nota</dt><dd>${esc(o.note)}</dd>` : ""}
      <dt>Pago</dt><dd>${o.paid ? `<span class="pill pill--good">Pagado · ${PAYMENTS[o.payment] || "—"}</span>` : `<span class="chips">${Object.entries(PAYMENTS).map(([k, v]) => `<button data-act="pay" data-o="${o.id}" data-p="${k}">${v}</button>`).join("")}</span>`}</dd>
      ${o.service === "delivery" ? `<dt>Delivery</dt><dd>${o.riderId ? esc(staff(o.riderId)?.name || "—") : "Sin asignar"} ${ACTIVE.includes(o.status) ? `<button class="btn btn--xs" data-act="rider" data-o="${o.id}">${o.riderId ? "Cambiar" : "Asignar"}</button>` : ""}</dd>` : ""}
      <dt>Costo comida</dt><dd>${money(cost)} · margen ${o.total ? Math.round((1 - cost / o.total) * 100) : 0}% <small class="muted">(recetas estimadas)</small></dd></dl>
    <div class="toolbar">${n && o.status !== "cancelado" ? `<button class="btn btn--brand" data-adv="${o.id}">Pasar a ${st(n).name} →</button>` : ""}
      ${c && c.phone ? `<a class="btn btn--wa" href="${wa(c.phone, custMsg(o))}" target="_blank" rel="noopener">Avisar por WhatsApp</a>` : ""}
      <button class="btn" data-act="print" data-o="${o.id}">Imprimir ticket</button>${ACTIVE.includes(o.status) ? `<button class="btn btn--ghost btn--bad" data-act="cancel" data-o="${o.id}">Cancelar</button>` : ""}</div>`);
}

/* ---------------- customer drawer ---------------- */
function openCustomer(id) {
  const c = cust(id); if (!c) return; const s = S.customerStats().get(id); const seg = S.segment(s);
  const os = db().orders.filter((o) => o.customerId === id).sort((a, b) => b.at - a.at);
  const fav = s ? Object.entries(s.fav).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, n]) => `${esc((CATALOG[k] || {}).name || k)} <span class="muted">×${n}</span>`).join(" · ") : "—";
  const reward = db().settings.pointsReward;
  drawer(`<div class="who"><span class="avatar" style="width:52px;height:52px;font-size:1rem">${initials(c.name)}</span><div><h2 id="drawerT" style="margin:0">${esc(c.name)}</h2><small>${esc(c.phone || "Sin teléfono")} · ${esc(c.zone || "")}</small></div></div>
    <div style="margin:12px 0" class="chips"><span class="pill pill--${{ vip: "brand", dormido: "warn", nuevo: "info", frecuente: "good" }[seg.id] || ""}">${seg.name}</span>${c.tags.map((t) => `<span class="pill">${esc(t)}</span>`).join("")}</div>
    <div class="mini"><div><small>Pedidos</small><b>${s ? s.n : 0}</b></div><div><small>Gastado</small><b>${money(s ? s.spent : 0)}</b></div><div><small>Ticket prom.</small><b>${money(s ? s.spent / s.n : 0)}</b></div>
      <div><small>Último</small><b>${s ? ago(s.last) : "—"}</b></div><div><small>Cliente desde</small><b>${c.createdAt ? new Date(c.createdAt).toLocaleDateString("es-BO", { month: "short", year: "numeric" }) : "—"}</b></div><div><small>Puntos</small><b>${c.points || 0}</b></div></div>
    ${(c.points || 0) >= reward ? `<p class="pill pill--good">Tiene ${c.points} puntos: le alcanza para un premio (${reward} pts)</p>` : `<p class="muted">Le faltan ${reward - (c.points || 0)} puntos para su próximo premio.</p>`}
    <p><b>Favoritos:</b> ${fav}</p>
    <form class="form" id="custForm" data-id="${c.id}">
      <div class="row"><label>Nombre<input class="in" name="name" value="${esc(c.name)}"></label><label>Teléfono<input class="in" name="phone" value="${esc(c.phone)}"></label></div>
      <div class="row"><label>Dirección<input class="in" name="address" value="${esc(c.address)}"></label><label>Cumpleaños<input class="in" type="date" name="birthday" value="${esc(c.birthday)}"></label></div>
      <label>Etiquetas (separadas por coma)<input class="in" name="tags" value="${esc(c.tags.join(", "))}" placeholder="Empresa, Sin cebolla, Paga con QR…"></label>
      <label>Notas<textarea class="in" name="notes" rows="2">${esc(c.notes)}</textarea></label>
      <div class="toolbar"><button class="btn btn--dark" type="submit">Guardar</button><button class="btn btn--brand" type="button" data-act="posFor" data-c="${c.id}">Nuevo pedido</button>${c.phone ? `<a class="btn btn--wa" href="${wa(c.phone, `¡Hola ${c.name.split(" ")[0]}! 😎`)}" target="_blank" rel="noopener">WhatsApp</a>` : ""}${(c.points || 0) >= reward ? `<button class="btn btn--mustard" type="button" data-act="redeem" data-c="${c.id}">Canjear ${reward} pts</button>` : ""}</div>
    </form>
    <h3 style="margin:22px 0 8px">Historial</h3>
    ${table([{ k: "id", t: "Pedido", h: (o) => `<span class="mono">${o.id}</span>` }, { k: "at", t: "Fecha", h: (o) => new Date(o.at).toLocaleDateString("es-BO", { timeZone: "America/La_Paz", day: "numeric", month: "short" }) }, { k: "items", t: "Detalle", h: (o) => `<small>${itemsText(o)}</small>` }, { k: "total", t: "Total", r: 1, h: (o) => money(o.total) }, { k: "status", t: "", h: (o) => pill(o.status) }],
      os.slice(0, 25), { id: "custHist", rowAttr: (o) => `class="click" data-open-order="${o.id}"`, empty: "Todavía sin pedidos" })}`);
  $("#custForm").addEventListener("submit", (e) => {
    e.preventDefault(); const f = e.target.elements;
    Object.assign(c, { name: f.name.value.trim() || c.name, phone: f.phone.value.trim(), address: f.address.value.trim(), birthday: f.birthday.value, tags: f.tags.value.split(",").map((x) => x.trim()).filter(Boolean), notes: f.notes.value.trim() });
    S.save(); toast("Cliente guardado"); openCustomer(c.id);
  });
}
actions.posFor = (t) => { closeLayers(); openPOS({ customerId: t.dataset.c }); };
actions.redeem = (t) => { const c = cust(t.dataset.c); c.points -= db().settings.pointsReward; S.save(); toast(`Premio canjeado para ${c.name.split(" ")[0]}`); openCustomer(c.id); };

/* ---------------- POS: new order ---------------- */
function openPOS(pre = {}) {
  const p = { items: {}, customerId: pre.customerId || null, branch: state.branch || BRANCHES[0].id, channel: "whatsapp", service: "delivery", payment: "", note: "", coupon: "", tab: "pizza" };
  const draw = () => {
    const c = p.customerId && cust(p.customerId);
    const list = Object.values(CATALOG).filter((it) => it.kind === p.tab);
    const lines = Object.entries(p.items).filter(([, q]) => q > 0);
    const sub = lines.reduce((a, [id, q]) => a + CATALOG[id].price * q, 0);
    const cp = db().coupons.find((x) => x.active && x.code === p.coupon.toUpperCase());
    const disc = cp ? (cp.type === "pct" ? Math.round(sub * cp.value / 100) : Math.min(sub, cp.value)) : 0;
    modal(`<h2 class="h" id="modalT">Nuevo pedido</h2><p class="sub">Para pedidos por WhatsApp, teléfono o mostrador. Se descuenta el stock cuando entra al horno.</p>
      <div class="pos"><div>
        <div class="toolbar"><div class="seg">${[["pizza", "Pizzas"], ["combo", "Combos"], ["promo", "Promo del mes"]].filter(([k]) => Object.values(CATALOG).some((i) => i.kind === k)).map(([k, v]) => `<button data-pt="${k}" class="${p.tab === k ? "is-on" : ""}">${v}</button>`).join("")}</div></div>
        <div class="pos__menu">${list.map((it) => `<button class="pitem" data-pi="${it.id}"><img src="${esc(it.img)}" alt="" loading="lazy"><b>${esc(it.name)}</b><span>${money(it.price)}</span>${p.items[it.id] ? `<em>${p.items[it.id]}</em>` : ""}</button>`).join("")}</div>
      </div>
      <div class="pos__side form">
        <label>Cliente ${c ? `<span class="who" style="margin-top:4px"><span class="avatar">${initials(c.name)}</span><span><b>${esc(c.name)}</b><small>${esc(c.phone)}</small></span><button type="button" class="btn btn--xs" data-pc="clear" style="margin-left:auto">Cambiar</button></span>`
          : `<input class="in" id="posQ" placeholder="Buscá por nombre o teléfono" autocomplete="off"><div id="posQr"></div>`}</label>
        ${!c ? `<div class="row"><label>Nombre nuevo<input class="in" id="ncName" value="${esc(p.ncName || "")}"></label><label>Teléfono<input class="in" id="ncPhone" inputmode="tel" value="${esc(p.ncPhone || "")}"></label></div>` : ""}
        <div class="row"><label>Sucursal<select id="posB">${BRANCHES.map((b) => `<option value="${b.id}" ${b.id === p.branch ? "selected" : ""}>${esc(b.name)}</option>`).join("")}</select></label>
          <label>Canal<select id="posCh">${Object.entries(CHANNELS).map(([k, v]) => `<option value="${k}" ${k === p.channel ? "selected" : ""}>${v}</option>`).join("")}</select></label></div>
        <div class="seg">${Object.entries(SERVICES).map(([k, v]) => `<button type="button" data-ps="${k}" class="${p.service === k ? "is-on" : ""}">${v}</button>`).join("")}</div>
        ${p.service === "delivery" ? `<label>Dirección<input class="in" id="posAddr" value="${esc(p.address ?? (c ? c.address : ""))}"></label>` : ""}
        <div>${lines.map(([id, q]) => `<div class="cartline"><span class="qty"><button type="button" data-pq="${id}" data-d="-1">−</button><span>${q}</span><button type="button" data-pq="${id}" data-d="1">+</button></span><span>${esc(CATALOG[id].name)}</span><b class="num">${money(CATALOG[id].price * q)}</b></div>`).join("") || `<p class="muted">Tocá productos para sumarlos.</p>`}</div>
        <div class="row"><label>Cupón<input class="in" id="posCp" value="${esc(p.coupon)}" placeholder="HERMOSO10"></label><label>Pago<select id="posPay"><option value="">Al entregar</option>${Object.entries(PAYMENTS).map(([k, v]) => `<option value="${k}" ${k === p.payment ? "selected" : ""}>${v}</option>`).join("")}</select></label></div>
        ${p.coupon && !cp ? `<small style="color:var(--bad)">Cupón no válido</small>` : cp ? `<small style="color:var(--good)">${esc(cp.desc)}: −${money(disc)}</small>` : ""}
        <label>Nota<input class="in" id="posNote" value="${esc(p.note)}" placeholder="Sin orégano, cortar en 12…"></label>
        <div class="pos__tot"><span>Total</span><span class="num">${money(sub - disc)}</span></div>
        <button class="btn btn--brand" id="posGo" ${lines.length ? "" : "disabled"}>Crear pedido</button>
      </div></div>`);
    const m = $("#modal");
    const keep = () => { p.branch = $("#posB").value; p.channel = $("#posCh").value; p.payment = $("#posPay").value; p.note = $("#posNote").value; p.coupon = $("#posCp").value.trim(); if ($("#posAddr")) p.address = $("#posAddr").value; if ($("#ncName")) { p.ncName = $("#ncName").value; p.ncPhone = $("#ncPhone").value; } };
    m.onclick = (e) => {
      const t = e.target.closest("[data-pi],[data-pq],[data-pt],[data-ps],[data-pc],[data-pick],#posGo"); if (!t) return; keep();
      if (t.dataset.pi) p.items[t.dataset.pi] = (p.items[t.dataset.pi] || 0) + 1;
      else if (t.dataset.pq) p.items[t.dataset.pq] = Math.max(0, (p.items[t.dataset.pq] || 0) + Number(t.dataset.d));
      else if (t.dataset.pt) p.tab = t.dataset.pt; else if (t.dataset.ps) p.service = t.dataset.ps;
      else if (t.dataset.pc) { p.customerId = null; p.address = undefined; } else if (t.dataset.pick) { p.customerId = t.dataset.pick; p.address = undefined; }
      else if (t.id === "posGo") {
        let cid = p.customerId; if (!cid && (p.ncName || "").trim()) cid = S.upsertCustomer({ name: p.ncName.trim(), phone: (p.ncPhone || "").trim(), address: p.address || "" }).id;
        const items = Object.entries(p.items).filter(([, q]) => q > 0).map(([id, qty]) => ({ id, qty }));
        if (cp) cp.uses++;
        const o = S.addOrder({ branch: p.branch, channel: p.channel, service: p.service, customerId: cid, items, payment: p.payment || null, paid: !!p.payment, note: p.note, address: p.service === "delivery" ? p.address || (cid && cust(cid).address) || "" : "", coupon: cp ? cp.code : null, discount: disc });
        closeLayers(); toast(`Pedido ${o.id} creado`); location.hash = "#/pedidos"; return;
      }
      draw();
    };
    $("#posCp").onchange = () => { keep(); draw(); };
    const pq = $("#posQ");
    if (pq) pq.oninput = () => { const t = pq.value.trim().toLowerCase(); const d = t.replace(/\D/g, ""); $("#posQr").innerHTML = t.length < 2 ? "" : db().customers.filter((x) => x.name.toLowerCase().includes(t) || (d.length > 3 && x.phone.replace(/\D/g, "").includes(d))).slice(0, 5).map((x) => `<button type="button" class="btn btn--sm btn--ghost" data-pick="${x.id}" style="width:100%;justify-content:flex-start;margin-top:4px">${esc(x.name)} <small class="muted">${esc(x.phone)}</small></button>`).join(""); };
  };
  draw();
}

/* ---------------- stock helpers ---------------- */
function avgDailyUse(branch, days = 7) {
  const from = Date.now() - days * DAY; const use = {};
  db().orders.filter((o) => o.branch === branch && o.at >= from && o.status !== "cancelado").forEach((o) => o.items.forEach((l) => S.usage(db(), l.id, l.qty, use)));
  for (const k in use) use[k] /= days; return use;
}
function lowStock() {
  const out = []; const bs = state.branch ? [state.branch] : BRANCHES.map((b) => b.id);
  for (const b of bs) { const s = db().stock[b] || {}; for (const i of db().ingredients) if ((s[i.id] ?? 0) < i.min) out.push({ branch: b, ing: i, qty: s[i.id] ?? 0 }); }
  return out;
}

/* ======================= VIEWS ======================= */

/* ---- Panel ---- */
VIEWS.panel = {
  html() {
    const now = Date.now(), t0 = dayStart(now), wk = t0 - 7 * DAY;
    const today = scoped(S.sold(S.ordersIn(t0, now))), lastWk = scoped(S.sold(S.ordersIn(wk, now - 7 * DAY)));
    const sum = (os) => os.reduce((a, o) => a + o.total, 0);
    const active = scoped(db().orders.filter((o) => ACTIVE.includes(o.status)));
    const done = today.filter((o) => o.status === "entregado" && o.times.entregado);
    const avgMin = done.length ? Math.round(done.reduce((a, o) => a + (o.times.entregado - o.at), 0) / done.length / 60e3) : 0;
    const cancel = scoped(S.ordersIn(t0, now)).filter((o) => o.status === "cancelado").length;
    // hourly: today vs average of the same weekday, last 4 weeks
    const hours = [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0];
    const byH = (os) => { const m = {}; os.forEach((o) => { const h = localHour(o.at); m[h] = (m[h] || 0) + o.total; }); return m; };
    const th = byH(today); const ref = {}; for (let w = 1; w <= 4; w++) { const m = byH(scoped(S.sold(S.ordersIn(t0 - w * 7 * DAY, t0 - w * 7 * DAY + DAY)))); for (const h in m) ref[h] = (ref[h] || 0) + m[h] / 4; }
    const nowH = localHour(now);
    const hourData = hours.map((h) => ({ label: `${h}h`, v: th[h] || 0, ref: ref[h] || 0, tip: `<b>${h}:00</b><br>Hoy: ${money(th[h] || 0)}<br>Promedio ${["domingos", "lunes", "martes", "miércoles", "jueves", "viernes", "sábados"][localDow(now)]}: ${money(ref[h] || 0)}` }));
    hourData.name = "Hoy";
    // 14 days
    const days = []; for (let d = 13; d >= 0; d--) { const a = t0 - d * DAY; const os = scoped(S.sold(S.ordersIn(a, a + DAY))); days.push({ label: new Date(a + 12 * 3600e3).toLocaleDateString("es-BO", { day: "numeric", month: "short", timeZone: "America/La_Paz" }), v: sum(os), tip: `<b>${new Date(a + 12 * 3600e3).toLocaleDateString("es-BO", { weekday: "long", day: "numeric", month: "short", timeZone: "America/La_Paz" })}${d === 0 ? " (hasta ahora)" : ""}</b><br>${money(sum(os))} · ${os.length} pedidos` }); }
    // by branch (last 7 days)
    const w7 = S.sold(S.ordersIn(now - 7 * DAY, now));
    const byB = BRANCHES.map((b) => ({ label: b.name, v: sum(w7.filter((o) => o.branch === b.id)) })).sort((a, b) => b.v - a.v);
    const ch = Object.entries(CHANNELS).map(([k, v]) => ({ label: v, v: scoped(w7).filter((o) => o.channel === k).length }));
    // top products today (fallback 7d)
    const pool = today.length >= 5 ? today : scoped(w7); const tp = {}; pool.forEach((o) => o.items.forEach((l) => (tp[l.id] = (tp[l.id] || 0) + l.qty)));
    const top = Object.entries(tp).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([id, n]) => ({ label: (CATALOG[id] || {}).name || id, v: n }));
    // alerts
    const late = active.filter((o) => lateness(o) === "late").sort((a, b) => a.at - b.at);
    const low = lowStock().sort((a, b) => a.qty / a.ing.min - b.qty / b.ing.min);
    const unpaid = active.filter((o) => !o.paid && o.status === "listo" && o.service !== "delivery");
    const newLeads = db().leads.filter((l) => l.status === "nuevo");
    const alerts = [
      ...late.slice(0, 4).map((o) => `<div class="alert"><span class="alert__i alert__i--bad">⏱</span><div><b>${o.id} lleva ${ago(o.at)}</b><small>${esc(branchName(o.branch))} · ${st(o.status).name} · ${SERVICES[o.service]}</small></div><button class="btn btn--xs" data-open-order="${o.id}">Ver</button></div>`),
      ...low.slice(0, 4).map((l) => `<div class="alert"><span class="alert__i alert__i--warn">📦</span><div><b>${esc(l.ing.name)} bajo en ${esc(branchName(l.branch))}</b><small>Quedan ${qtyFmt(l.qty, l.ing.unit)} · mínimo ${qtyFmt(l.ing.min, l.ing.unit)}</small></div><button class="btn btn--xs" data-goto="inventario">Pedir</button></div>`),
      ...unpaid.slice(0, 2).map((o) => `<div class="alert"><span class="alert__i alert__i--info">💵</span><div><b>${o.id} listo y sin cobrar</b><small>${esc(branchName(o.branch))} · ${money(o.total)}</small></div><button class="btn btn--xs" data-open-order="${o.id}">Cobrar</button></div>`),
      ...newLeads.slice(0, 2).map((l) => `<div class="alert"><span class="alert__i alert__i--info">🤝</span><div><b>Lead de franquicia: ${esc(l.name)}</b><small>${esc(l.city || "")} · ${ago(l.at)}</small></div><button class="btn btn--xs" data-goto="leads">Ver</button></div>`),
    ];
    const tot = sum(today), totLw = sum(lastWk.filter((o) => localHour(o.at) <= nowH || localHour(o.at) < 3));
    return `<div class="grid g4">
        <div class="card stat stat--hero"><div class="stat__k">Ventas hoy</div><div class="stat__v">${money(tot)}</div><div class="stat__d">${delta(tot, totLw, "vs. mismo día y hora la semana pasada")}</div></div>
        <div class="card stat"><div class="stat__k">Pedidos hoy</div><div class="stat__v">${today.length}</div><div class="stat__d">${delta(today.length, lastWk.filter((o) => localHour(o.at) <= nowH || localHour(o.at) < 3).length, "vs. semana pasada")}</div></div>
        <div class="card stat"><div class="stat__k">Ticket promedio</div><div class="stat__v">${money(today.length ? tot / today.length : 0)}</div><div class="stat__d">${cancel} cancelados hoy</div></div>
        <div class="card stat"><div class="stat__k">En curso</div><div class="stat__v">${active.length}</div><div class="stat__d">${late.length ? `<span class="delta delta--down">${late.length} atrasados</span> · ` : ""}entrega prom. ${avgMin || "—"} min</div></div>
      </div>
      <div class="grid g21" style="margin-top:16px">
        <div class="card"><div class="card__h"><h2>Ventas por hora</h2><small>hoy vs. promedio del mismo día (4 semanas)</small></div>${bars(hourData, { refName: "Promedio" })}</div>
        <div class="card"><div class="card__h"><h2>Para atender</h2><small>${alerts.length} alertas</small></div>${alerts.join("") || `<div class="empty">Todo en orden 😎</div>`}</div>
      </div>
      <div class="grid g21" style="margin-top:16px">
        <div class="card"><div class="card__h"><h2>Últimos 14 días</h2><small>ventas por día${state.branch ? " · " + esc(branchName(state.branch)) : ""}</small></div>${line(days, { every: 2 })}</div>
        <div class="card"><div class="card__h"><h2>Lo que más sale</h2><small>${pool === today ? "hoy" : "7 días"} · unidades</small></div>${hbars(top)}</div>
      </div>
      <div class="grid g2" style="margin-top:16px">
        <div class="card"><div class="card__h"><h2>Sucursales</h2><small>ventas 7 días</small></div>${hbars(byB, { fmtV: money })}</div>
        <div class="card"><div class="card__h"><h2>Canales</h2><small>pedidos 7 días</small></div>${stack(ch)}
          <div class="mini" style="margin-top:18px">${Object.entries(SERVICES).map(([k, v]) => { const n = scoped(w7).filter((o) => o.service === k).length; return `<div><small>${v}</small><b>${n}</b></div>`; }).join("")}</div></div>
      </div>`;
  },
};

/* ---- Pedidos ---- */
VIEWS.pedidos = {
  html() {
    const mode = state.ordersMode;
    const head = `<div class="toolbar"><div class="seg"><button data-act="om" data-m="board" class="${mode === "board" ? "is-on" : ""}">Tablero</button><button data-act="om" data-m="list" class="${mode === "list" ? "is-on" : ""}">Historial</button></div>
      <span class="grow"></span><span class="muted">SLA ${db().settings.slaMin} min · arrastrá las tarjetas o tocá el botón</span></div>`;
    if (mode === "list") {
      const t0 = Date.now() - Number(state.range) * DAY;
      const f = state.tab.olist || "todos";
      let os = scoped(db().orders.filter((o) => o.at >= t0)).reverse();
      if (f !== "todos") os = os.filter((o) => (f === "activos" ? ACTIVE.includes(o.status) : o.status === f));
      return head + `<div class="toolbar"><div class="chips">${["todos", "activos", "entregado", "cancelado"].map((k) => `<button data-act="olist" data-f="${k}" class="${f === k ? "is-on" : ""}">${k[0].toUpperCase() + k.slice(1)}</button>`).join("")}</div>
          <select data-act-change="range">${[["1", "Hoy y ayer"], ["7", "7 días"], ["30", "30 días"]].map(([k, v]) => `<option value="${k}" ${state.range === k ? "selected" : ""}>${v}</option>`).join("")}</select>
          <span class="grow"></span><button class="btn btn--sm" data-act="ocsv">Exportar CSV</button></div>
        <div class="card" style="padding:6px 10px">${table([
          { k: "id", t: "Pedido", h: (o) => `<span class="mono">${o.id}</span>` }, { k: "at", t: "Hora", v: (o) => o.at, h: (o) => `${new Date(o.at).toLocaleDateString("es-BO", { day: "numeric", month: "short", timeZone: "America/La_Paz" })} ${hhmm(o.at)}` },
          { k: "c", t: "Cliente", h: (o) => esc(cust(o.customerId)?.name || "Mostrador") }, { k: "b", t: "Sucursal", h: (o) => esc(branchName(o.branch)) }, { k: "ch", t: "Canal", h: (o) => CHANNELS[o.channel] },
          { k: "items", t: "Detalle", h: (o) => `<small>${itemsText(o)}</small>` }, { k: "total", t: "Total", r: 1, v: (o) => o.total, h: (o) => money(o.total) }, { k: "status", t: "Estado", h: (o) => pill(o.status) }],
          os, { id: "orders", sort: state.sort.orders, rowAttr: (o) => `class="click" data-open-order="${o.id}"`, limit: 300 })}</div>`;
    }
    const cols = ["nuevo", "confirmado", "horno", "listo", "camino"];
    const active = scoped(db().orders.filter((o) => ACTIVE.includes(o.status)));
    const doneToday = scoped(db().orders.filter((o) => o.status === "entregado" && o.at >= dayStart())).length;
    return head + `<div class="board">${cols.map((c) => { const os = active.filter((o) => o.status === c).sort((a, b) => a.at - b.at); return `<section class="col" data-col="${c}"><div class="col__h">${st(c).name} <span>${os.length}</span></div>${os.map(ocard).join("") || `<div class="empty" style="padding:18px 6px">—</div>`}</section>`; }).join("")}</div>
      <p class="muted" style="margin-top:12px">${doneToday} pedidos entregados hoy${state.branch ? " en " + esc(branchName(state.branch)) : ""}. Mirá el <a href="#/pedidos" data-act="om" data-m="list">historial</a>.</p>`;
  },
  after() {
    // drag & drop between columns
    let dragId = null;
    $$(".ocard").forEach((c) => { c.draggable = true; c.addEventListener("dragstart", (e) => { dragId = c.dataset.id; e.dataTransfer.effectAllowed = "move"; }); });
    $$(".col").forEach((col) => {
      col.addEventListener("dragover", (e) => { e.preventDefault(); col.classList.add("is-over"); });
      col.addEventListener("dragleave", () => col.classList.remove("is-over"));
      col.addEventListener("drop", (e) => { e.preventDefault(); col.classList.remove("is-over"); const o = db().orders.find((x) => x.id === dragId); if (!o || o.status === col.dataset.col) return;
        if (col.dataset.col === "camino" && o.service !== "delivery") { toast("Sólo los delivery van en camino"); return; }
        if (col.dataset.col === "camino" && !o.riderId) { assignRider(o, true); return; } S.setStatus(o, col.dataset.col); toast(`${o.id} → ${st(col.dataset.col).name}`); });
    });
    $$(".ocard").forEach((c) => c.addEventListener("click", (e) => { if (!e.target.closest("button,a")) openOrder(c.dataset.id); }));
    tick();
  },
};
function ocard(o) {
  const c = cust(o.customerId); const n = S.nextStatus(o); const late = lateness(o);
  return `<article class="ocard${late === "late" ? " is-late" : ""}" data-id="${o.id}"><div class="ocard__t"><b>${o.id}</b><span class="timer" data-since="${o.at}">${mmss(Date.now() - o.at)}</span></div>
    <div class="ocard__c">${esc(c ? c.name : "Mostrador")}</div><div class="ocard__i">${itemsText(o)}</div>
    <div class="ocard__f"><span class="pill">${SERVICES[o.service]}</span><span class="pill pill--brand">${CHANNELS[o.channel]}</span>${!state.branch ? `<small class="muted">${esc(branchName(o.branch))}</small>` : ""}<span class="total num">${money(o.total)}</span></div>
    ${o.status === "camino" && o.riderId ? `<small class="muted">🛵 ${esc(staff(o.riderId)?.name || "")}</small>` : ""}
    ${n ? `<button class="btn btn--sm ocard__go ${o.status === "nuevo" ? "btn--brand" : ""}" data-adv="${o.id}">${o.status === "nuevo" ? "Confirmar" : `→ ${st(n).name}`}</button>` : ""}</article>`;
}
actions.om = (t, e) => { e.preventDefault(); state.ordersMode = t.dataset.m; render(); };
actions.olist = (t) => { state.tab.olist = t.dataset.f; render(); };
actions.ocsv = () => { const t0 = Date.now() - Number(state.range) * DAY; const os = scoped(db().orders.filter((o) => o.at >= t0));
  csv(`pedidos-${localDate(Date.now())}.csv`, ["pedido", "fecha", "hora", "sucursal", "canal", "servicio", "cliente", "telefono", "detalle", "subtotal", "descuento", "total", "pago", "estado"],
    os.map((o) => { const c = cust(o.customerId); return [o.id, localDate(o.at), hhmm(o.at), branchName(o.branch), CHANNELS[o.channel], SERVICES[o.service], c?.name || "", c?.phone || "", o.items.map((l) => `${l.qty}x ${l.name}`).join(" | "), o.sub, o.discount, o.total, PAYMENTS[o.payment] || "", st(o.status).name]; })); };
document.addEventListener("change", (e) => { if (e.target.dataset.actChange === "range") { state.range = e.target.value; render(); } });

/* ---- Cocina (KDS) ---- */
VIEWS.cocina = {
  html() {
    const b = state.branch || state.kdsBranch || "radial-27"; state.kdsBranch = b;
    const os = db().orders.filter((o) => o.branch === b && ["nuevo", "confirmado", "horno", "listo"].includes(o.status)).sort((a, b2) => a.at - b2.at);
    const col = (title, list, hint) => `<div class="kds__col"><h3>${title}<span>${list.length}</span></h3>${list.map((o) => { const late = lateness(o); return `<div class="tk${late ? " is-" + late : ""}" data-kds="${o.id}" role="button" tabindex="0">
      <div class="tk__h"><b>${o.id}</b><span class="tk__t" data-since="${o.at}">${mmss(Date.now() - o.at)}</span></div><div class="tk__m">${SERVICES[o.service]} · ${CHANNELS[o.channel]} · ${hhmm(o.at)}</div>
      <ul>${o.items.map((l) => { const it = CATALOG[l.id]; const parts = it && it.kind === "combo" ? it.parts.map((p) => CATALOG[p]?.name).join(" + ") + " + " + it.drink : it && it.kind === "promo" ? "Jamoneitor (promo)" : ""; return `<li><em>${l.qty}×</em>${esc(l.name)}${parts ? `<small>${esc(parts)}</small>` : ""}</li>`; }).join("")}</ul>
      ${o.note ? `<div class="tk__note">📝 ${esc(o.note)}</div>` : ""}<div class="tk__go">${hint}</div></div>`; }).join("") || `<p style="opacity:.4">—</p>`}</div>`;
    return `<div class="kds"><div class="kds__h"><h2>Cocina</h2><select data-act-change="kds">${BRANCHES.filter((x) => x.kind === "branch").map((x) => `<option value="${x.id}" ${x.id === b ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select>
      <span style="opacity:.6">Tocá un ticket para pasarlo al siguiente paso</span><span class="grow" style="flex:1"></span><button class="btn btn--sm" data-act="fs">Pantalla completa</button></div>
      <div class="kds__cols">${col("Por preparar", os.filter((o) => ["nuevo", "confirmado"].includes(o.status)), "Tocar → al horno")}${col("En horno", os.filter((o) => o.status === "horno"), "Tocar → listo")}${col("Listo para salir", os.filter((o) => o.status === "listo"), "Esperando entrega")}</div></div>`;
  },
  after() {
    $$("[data-kds]").forEach((el) => { const go = () => { const o = db().orders.find((x) => x.id === el.dataset.kds); if (o.status === "listo") return openOrder(o.id); S.setStatus(o, o.status === "horno" ? "listo" : "horno"); }; el.addEventListener("click", go); el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } }); });
    tick();
  },
};
document.addEventListener("change", (e) => { if (e.target.dataset.actChange === "kds") { state.kdsBranch = e.target.value; render(); } });
actions.fs = () => { const el = $(".kds"); if (document.fullscreenElement) document.exitFullscreen(); else el.requestFullscreen && el.requestFullscreen(); };

/* ---- Delivery ---- */
VIEWS.delivery = {
  html() {
    const os = scoped(db().orders.filter((o) => o.service === "delivery"));
    const ready = os.filter((o) => o.status === "listo").sort((a, b) => a.at - b.at);
    const road = os.filter((o) => o.status === "camino").sort((a, b) => a.at - b.at);
    const coming = os.filter((o) => ["nuevo", "confirmado", "horno"].includes(o.status)).length;
    const riders = db().staff.filter((s) => s.role === "delivery" && s.active && (!state.branch || s.branch === state.branch));
    const t0 = dayStart(); const doneToday = os.filter((o) => o.status === "entregado" && o.at >= t0);
    const avg = doneToday.length ? Math.round(doneToday.reduce((a, o) => a + ((o.times.entregado || o.at) - (o.times.camino || o.at)), 0) / doneToday.length / 60e3) : 0;
    const clocked = new Set(db().clock.filter((c) => !c.out).map((c) => c.staffId));
    const row = (o, act) => { const c = cust(o.customerId); return `<div class="alert"><span class="alert__i alert__i--${lateness(o) === "late" ? "bad" : "warn"}">🛵</span><div><b><span class="mono">${o.id}</span> · ${esc(c?.name || "")}</b><small>${esc(o.address || "sin dirección")}${o.pin ? ` · <a href="${esc(o.pin)}" target="_blank" rel="noopener">mapa</a>` : ""} · ${esc(branchName(o.branch))}</small><br><small>${o.riderId ? "Con " + esc(staff(o.riderId)?.name || "") + " · " : ""}<span class="timer" data-since="${o.at}"></span> desde el pedido</small></div>${act}</div>`; };
    return `<div class="grid g4"><div class="card stat"><div class="stat__k">Listos para salir</div><div class="stat__v">${ready.length}</div></div><div class="card stat"><div class="stat__k">En camino</div><div class="stat__v">${road.length}</div></div>
      <div class="card stat"><div class="stat__k">En cocina</div><div class="stat__v">${coming}</div></div><div class="card stat"><div class="stat__k">Viaje promedio hoy</div><div class="stat__v">${avg || "—"} <small style="font-size:.9rem">min</small></div><div class="stat__d">${doneToday.length} entregas</div></div></div>
      <div class="grid g3" style="margin-top:16px">
        <div class="card"><div class="card__h"><h2>Para despachar</h2></div>${ready.map((o) => row(o, `<button class="btn btn--sm btn--brand" data-act="rider" data-o="${o.id}">Asignar</button>`)).join("") || `<div class="empty">Nada esperando 👌</div>`}</div>
        <div class="card"><div class="card__h"><h2>En camino</h2></div>${road.map((o) => row(o, `<button class="btn btn--sm" data-adv="${o.id}">Entregado</button>`)).join("") || `<div class="empty">Nadie en ruta</div>`}</div>
        <div class="card"><div class="card__h"><h2>Repartidores</h2><small>${riders.length}</small></div>${riders.map((r) => { const cur = road.find((o) => o.riderId === r.id); const n = doneToday.filter((o) => o.riderId === r.id).length;
          return `<div class="rider"><span class="avatar">${initials(r.name)}</span><div><b>${esc(r.name)}</b><br><small class="muted">${esc(branchName(r.branch))} · ${n} hoy</small></div>${cur ? `<span class="pill pill--warn">${cur.id}</span>` : clocked.has(r.id) ? `<span class="pill pill--good">Disponible</span>` : `<span class="pill">Fuera de turno</span>`}</div>`; }).join("")}</div>
      </div>`;
  },
  after() { tick(); },
};

/* ---- Clientes ---- */
VIEWS.clientes = {
  html() {
    const stats = S.customerStats(); const now = Date.now();
    let rows = db().customers.map((c) => { const s = stats.get(c.id); return { c, s, seg: S.segment(s, now) }; });
    if (state.branch) { const ids = new Set(db().orders.filter((o) => o.branch === state.branch).map((o) => o.customerId)); rows = rows.filter((r) => ids.has(r.c.id)); }
    const counts = rows.reduce((m, r) => ((m[r.seg.id] = (m[r.seg.id] || 0) + 1), m), {});
    const seg = state.seg; if (seg) rows = rows.filter((r) => r.seg.id === seg);
    const q = state.custQ.toLowerCase(); if (q) rows = rows.filter((r) => r.c.name.toLowerCase().includes(q) || r.c.phone.includes(q) || (r.c.zone || "").toLowerCase().includes(q));
    const all = db().customers.length; const withOrders = [...stats.values()];
    const ltv = withOrders.length ? withOrders.reduce((a, s) => a + s.spent, 0) / withOrders.length : 0;
    const rep = withOrders.filter((s) => s.n > 1).length;
    const bdays = db().customers.filter((c) => c.birthday && c.birthday.slice(5, 7) === localDate(now).slice(5, 7)).length;
    const segs = [["", "Todos", rows.length], ["vip", "VIP"], ["frecuente", "Frecuentes"], ["ocasional", "Ocasionales"], ["nuevo", "Nuevos"], ["dormido", "Dormidos"], ["sin", "Sin pedidos"]];
    return `<div class="grid g4"><div class="card stat"><div class="stat__k">Clientes</div><div class="stat__v">${fmt(all)}</div><div class="stat__d">${counts.vip || 0} VIP · ${counts.nuevo || 0} nuevos</div></div>
      <div class="card stat"><div class="stat__k">Valor por cliente</div><div class="stat__v">${money(ltv)}</div><div class="stat__d">gasto acumulado promedio</div></div>
      <div class="card stat"><div class="stat__k">Recompra</div><div class="stat__v">${withOrders.length ? Math.round((rep / withOrders.length) * 100) : 0}%</div><div class="stat__d">pidieron más de una vez</div></div>
      <div class="card stat"><div class="stat__k">Cumpleaños este mes</div><div class="stat__v">${bdays}</div><div class="stat__d"><a href="#/marketing">Mandales un saludo →</a></div></div></div>
      <div class="toolbar" style="margin-top:18px"><div class="chips">${segs.map(([k, v]) => `<button data-act="seg" data-s="${k}" class="${seg === k ? "is-on" : ""}">${v}<small>${k ? counts[k] || 0 : ""}</small></button>`).join("")}</div><span class="grow"></span>
        <input class="in" id="custQ" placeholder="Filtrar por nombre, teléfono o zona" value="${esc(state.custQ)}"><button class="btn btn--sm" data-act="ccsv">Exportar</button><button class="btn btn--sm btn--dark" data-act="newCust">+ Cliente</button></div>
      <div class="card" style="padding:6px 10px">${table([
        { k: "name", t: "Cliente", v: (r) => r.c.name, h: (r) => `<span class="who"><span class="avatar">${initials(r.c.name)}</span><span><b>${esc(r.c.name)}</b><small>${esc(r.c.phone)}</small></span></span>` },
        { k: "zone", t: "Zona", v: (r) => r.c.zone, h: (r) => esc(r.c.zone || "—") },
        { k: "seg", t: "Segmento", v: (r) => r.seg.name, h: (r) => `<span class="pill pill--${{ vip: "brand", dormido: "warn", nuevo: "info", frecuente: "good" }[r.seg.id] || ""}">${r.seg.name}</span>` },
        { k: "n", t: "Pedidos", r: 1, v: (r) => r.s?.n || 0, h: (r) => r.s?.n || 0 }, { k: "spent", t: "Gastado", r: 1, v: (r) => r.s?.spent || 0, h: (r) => money(r.s?.spent || 0) },
        { k: "last", t: "Último pedido", v: (r) => r.s?.last || 0, h: (r) => (r.s ? `hace ${ago(r.s.last)}` : "—") }, { k: "pts", t: "Puntos", r: 1, v: (r) => r.c.points || 0, h: (r) => r.c.points || 0 }],
        rows, { id: "cust", sort: state.sort.cust || { k: "spent", dir: -1 }, rowAttr: (r) => `class="click" data-open-cust="${r.c.id}"`, empty: "No hay clientes con ese filtro", limit: 200 })}</div>`;
  },
  after() { const q = $("#custQ"); q.addEventListener("input", () => { state.custQ = q.value; const pos = q.selectionStart; render(); const n = $("#custQ"); n.focus(); n.setSelectionRange(pos, pos); }); },
};
actions.seg = (t) => { state.seg = t.dataset.s; render(); };
actions.newCust = () => { modal(`<h2 class="h" id="modalT">Nuevo cliente</h2><form class="form" id="ncF"><label>Nombre<input class="in" name="name" required></label><label>Teléfono<input class="in" name="phone" inputmode="tel"></label><label>Dirección<input class="in" name="address"></label><label>Zona<input class="in" name="zone"></label><button class="btn btn--brand">Guardar</button></form>`, { small: true });
  $("#ncF").addEventListener("submit", (e) => { e.preventDefault(); const f = e.target.elements; if (!f.name.value.trim()) return; const c = S.upsertCustomer({ name: f.name.value.trim(), phone: f.phone.value.trim(), address: f.address.value.trim(), zone: f.zone.value.trim() }); S.save(); closeLayers(); openCustomer(c.id); }); };
actions.ccsv = () => { const stats = S.customerStats(); csv(`clientes-${localDate(Date.now())}.csv`, ["nombre", "telefono", "zona", "direccion", "segmento", "pedidos", "gastado", "ultimo_pedido", "puntos", "cumpleanos", "etiquetas"],
  db().customers.map((c) => { const s = stats.get(c.id); return [c.name, c.phone, c.zone, c.address, S.segment(s).name, s?.n || 0, s?.spent || 0, s ? localDate(s.last) : "", c.points || 0, c.birthday, c.tags.join(" | ")]; })); };

/* ---- Sucursales ---- */
VIEWS.sucursales = {
  html() {
    const now = Date.now(), t0 = dayStart(now); const bst = U.branchStatus(U.localNow());
    const clocked = new Set(db().clock.filter((c) => !c.out).map((c) => c.staffId));
    return `<div class="grid g3">${BRANCHES.map((b) => {
      const today = S.sold(S.ordersIn(t0, now, b.id)); const act = db().orders.filter((o) => o.branch === b.id && ACTIVE.includes(o.status));
      const prep = today.filter((o) => o.times.listo && o.times.horno); const prepMin = prep.length ? Math.round(prep.reduce((a, o) => a + (o.times.listo - o.at), 0) / prep.length / 60e3) : 0;
      const team = db().staff.filter((s) => s.branch === b.id && s.active); const on = team.filter((s) => clocked.has(s.id));
      const low = db().ingredients.filter((i) => ((db().stock[b.id] || {})[i.id] ?? 0) < i.min).length;
      return `<div class="card"><div class="bcard__top"><h3>${esc(b.name)}</h3><span class="pill pill--${bst.open ? "good" : "bad"}"><i></i>${bst.open ? (bst.state === "closing" ? `Cierra ${bst.closes}` : "Abierta") : `Abre ${bst.opens}`}</span></div>
        <small class="muted">${esc(b.address || "")}</small>
        <div class="mini"><div><small>Ventas hoy</small><b>${money(today.reduce((a, o) => a + o.total, 0))}</b></div><div><small>Pedidos</small><b>${today.length}</b></div><div><small>En curso</small><b>${act.length}</b></div>
          <div><small>Preparación</small><b>${prepMin || "—"} min</b></div><div><small>En turno</small><b>${on.length}/${team.length}</b></div><div><small>Stock bajo</small><b style="color:${low ? "var(--warn)" : "inherit"}">${low}</b></div></div>
        <div class="toolbar" style="margin:0"><button class="btn btn--sm" data-act="focusB" data-b="${b.id}">Ver tablero</button>${b.kind === "branch" ? `<button class="btn btn--sm" data-act="kdsB" data-b="${b.id}">Cocina</button>` : ""}${b.whatsapp ? `<a class="btn btn--sm btn--ghost" href="${wa(b.whatsapp, "")}" target="_blank" rel="noopener">WhatsApp</a>` : ""}</div></div>`; }).join("")}</div>
      <p class="muted" style="margin-top:14px">Horario publicado: ${esc(U.hoursText())}.</p>`;
  },
};
actions.focusB = (t) => { state.branch = t.dataset.b; $("#branchSel").value = t.dataset.b; location.hash = "#/pedidos"; };
actions.kdsB = (t) => { state.kdsBranch = t.dataset.b; location.hash = "#/cocina"; };

/* ---- Personal ---- */
VIEWS.personal = {
  html() {
    const tab = state.tab.staff || "equipo";
    const b = state.branch; const list = db().staff.filter((s) => !b || s.branch === b);
    const clocked = new Map(db().clock.filter((c) => !c.out).map((c) => [c.staffId, c]));
    const tabs = `<div class="tabs">${[["equipo", "Equipo"], ["turnos", "Turnos de la semana"], ["asistencia", "Asistencia"]].map(([k, v]) => `<button data-act="stab" data-t="${k}" class="${tab === k ? "is-on" : ""}">${v}</button>`).join("")}</div>`;
    const hoursOf = (s) => db().shifts.filter((x) => x.staffId === s.id).reduce((a, x) => { let h = Number(x.end.slice(0, 2)) - Number(x.start.slice(0, 2)); if (h <= 0) h += 24; return a + h; }, 0);
    if (tab === "turnos") {
      const days = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"], order = [1, 2, 3, 4, 5, 6, 0];
      const shown = b ? list : list.filter((s) => s.branch === (state.tab.shiftB || "radial-27"));
      return tabs + `${!b ? `<div class="toolbar"><select data-act-change="shiftB">${BRANCHES.map((x) => `<option value="${x.id}" ${x.id === (state.tab.shiftB || "radial-27") ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select><span class="muted">Elegí una sucursal arriba para fijarla.</span></div>` : ""}
        <div class="card tbl-wrap"><table class="shifts"><thead><tr><th></th>${order.map((d, i) => `<th>${days[i]}</th>`).join("")}<th>Horas</th><th>Costo sem.</th></tr></thead><tbody>
        ${shown.map((s) => `<tr><td class="who"><span class="avatar">${initials(s.name)}</span><span><b>${esc(s.name)}</b><small>${ROLES[s.role]}</small></span></td>${order.map((d) => { const sh = db().shifts.find((x) => x.staffId === s.id && x.day === d); return `<td class="cell"><button data-act="shift" data-s="${s.id}" data-d="${d}" class="${sh ? "on" + (Number(sh.start.slice(0, 2)) >= 17 ? " late" : "") : ""}">${sh ? `${sh.start}–${sh.end}` : "libre"}</button></td>`; }).join("")}
          <td class="num"><b>${hoursOf(s)} h</b></td><td class="num">${money(hoursOf(s) * (s.rate || 0))}</td></tr>`).join("")}</tbody></table></div>
        <p class="muted">Tocá una celda para asignar o quitar el turno. El costo usa la tarifa por hora de cada persona.</p>`;
    }
    if (tab === "asistencia") {
      const t0 = dayStart(); const recs = db().clock.filter((c) => c.in >= t0 - DAY && (!b || staff(c.staffId)?.branch === b)).sort((a, z) => z.in - a.in);
      return tabs + `<div class="card" style="padding:6px 10px">${table([{ k: "s", t: "Persona", h: (c) => esc(staff(c.staffId)?.name || "") }, { k: "r", t: "Rol", h: (c) => ROLES[staff(c.staffId)?.role] || "" }, { k: "b", t: "Sucursal", h: (c) => esc(branchName(staff(c.staffId)?.branch)) },
        { k: "in", t: "Entrada", h: (c) => `${localDate(c.in) === localDate(Date.now()) ? "Hoy" : "Ayer"} ${hhmm(c.in)}` }, { k: "out", t: "Salida", h: (c) => (c.out ? hhmm(c.out) : `<span class="pill pill--good"><i></i>Trabajando · ${ago(c.in)}</span>`) },
        { k: "a", t: "", h: (c) => (c.out ? "" : `<button class="btn btn--xs" data-act="clockOut" data-s="${c.staffId}">Marcar salida</button>`) }], recs, { id: "clock", empty: "Sin marcaciones" })}</div>`;
    }
    return tabs + `<div class="toolbar"><span class="muted">${list.length} personas · ${list.filter((s) => clocked.has(s.id)).length} trabajando ahora</span><span class="grow"></span><button class="btn btn--sm btn--dark" data-act="editStaff">+ Persona</button></div>
      <div class="card" style="padding:6px 10px">${table([
        { k: "name", t: "Nombre", v: (s) => s.name, h: (s) => `<span class="who"><span class="avatar">${initials(s.name)}</span><span><b>${esc(s.name)}</b><small>${esc(s.phone)}</small></span></span>` },
        { k: "role", t: "Rol", v: (s) => s.role, h: (s) => ROLES[s.role] }, { k: "branch", t: "Sucursal", v: (s) => branchName(s.branch), h: (s) => esc(branchName(s.branch)) },
        { k: "hrs", t: "Horas/sem", r: 1, v: hoursOf, h: (s) => hoursOf(s) }, { k: "since", t: "Antigüedad", v: (s) => -s.since, h: (s) => ago(s.since) },
        { k: "now", t: "Ahora", h: (s) => (clocked.has(s.id) ? `<span class="pill pill--good"><i></i>Desde ${hhmm(clocked.get(s.id).in)}</span>` : `<span class="pill">Fuera</span>`) },
        { k: "act", t: "", h: (s) => `${clocked.has(s.id) ? `<button class="btn btn--xs" data-act="clockOut" data-s="${s.id}">Salida</button>` : `<button class="btn btn--xs" data-act="clockIn" data-s="${s.id}">Entrada</button>`} <button class="btn btn--xs btn--ghost" data-act="editStaff" data-s="${s.id}">Editar</button>` }],
        list, { id: "staff", sort: state.sort.staff })}</div>`;
  },
};
actions.stab = (t) => { state.tab.staff = t.dataset.t; render(); };
document.addEventListener("change", (e) => { if (e.target.dataset.actChange === "shiftB") { state.tab.shiftB = e.target.value; render(); } });
actions.clockIn = (t) => { db().clock.push({ staffId: t.dataset.s, in: Date.now(), out: null }); S.save(); toast("Entrada marcada"); };
actions.clockOut = (t) => { const c = db().clock.find((x) => x.staffId === t.dataset.s && !x.out); if (c) c.out = Date.now(); S.save(); toast("Salida marcada"); };
actions.shift = (t) => {
  const sh = db().shifts.find((x) => x.staffId === t.dataset.s && x.day === Number(t.dataset.d));
  modal(`<h2 class="h" id="modalT">Turno · ${esc(staff(t.dataset.s).name)}</h2><p class="sub">${["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"][t.dataset.d]}</p>
    <form class="form" id="shF"><div class="row"><label>Entra<input class="in" type="time" name="start" value="${sh ? sh.start : "12:00"}"></label><label>Sale<input class="in" type="time" name="end" value="${sh ? sh.end : "19:00"}"></label></div>
    <div class="chips"><button type="button" data-pre="12:00-19:00">Mediodía</button><button type="button" data-pre="18:00-01:00">Noche</button><button type="button" data-pre="17:00-01:00">Martes</button></div>
    <div class="toolbar"><button class="btn btn--brand">Guardar</button>${sh ? `<button type="button" class="btn btn--bad btn--ghost" id="shDel">Dejar libre</button>` : ""}</div></form>`, { small: true });
  $("#shF").addEventListener("click", (e) => { const p = e.target.closest("[data-pre]"); if (p) { const [a, z] = p.dataset.pre.split("-"); $("#shF").elements.start.value = a; $("#shF").elements.end.value = z; } });
  $("#shF").addEventListener("submit", (e) => { e.preventDefault(); const f = e.target.elements; if (sh) Object.assign(sh, { start: f.start.value, end: f.end.value }); else db().shifts.push({ staffId: t.dataset.s, day: Number(t.dataset.d), start: f.start.value, end: f.end.value }); closeLayers(); S.save(); });
  const del = $("#shDel"); if (del) del.onclick = () => { db().shifts.splice(db().shifts.indexOf(sh), 1); closeLayers(); S.save(); };
};
actions.editStaff = (t) => {
  const s = t.dataset.s ? staff(t.dataset.s) : { name: "", role: "cajero", branch: state.branch || BRANCHES[0].id, phone: "", rate: 16, active: true };
  modal(`<h2 class="h" id="modalT">${t.dataset.s ? "Editar persona" : "Nueva persona"}</h2><form class="form" id="stF"><label>Nombre<input class="in" name="name" value="${esc(s.name)}" required></label>
    <div class="row"><label>Rol<select name="role">${Object.entries(ROLES).map(([k, v]) => `<option value="${k}" ${k === s.role ? "selected" : ""}>${v}</option>`).join("")}</select></label><label>Sucursal<select name="branch">${BRANCHES.map((b) => `<option value="${b.id}" ${b.id === s.branch ? "selected" : ""}>${esc(b.name)}</option>`).join("")}</select></label></div>
    <div class="row"><label>Celular<input class="in" name="phone" value="${esc(s.phone)}"></label><label>Tarifa Bs/hora<input class="in" name="rate" type="number" min="0" step="0.5" value="${s.rate || 0}"></label></div>
    <label style="display:flex;gap:8px;align-items:center"><input type="checkbox" name="active" ${s.active ? "checked" : ""}> Activo</label><button class="btn btn--brand">Guardar</button></form>`, { small: true });
  $("#stF").addEventListener("submit", (e) => { e.preventDefault(); const f = e.target.elements; Object.assign(s, { name: f.name.value.trim(), role: f.role.value, branch: f.branch.value, phone: f.phone.value.trim(), rate: Number(f.rate.value) || 0, active: f.active.checked });
    if (!t.dataset.s) { s.id = S.uid("E"); s.since = Date.now(); db().staff.push(s); } closeLayers(); S.save(); toast("Guardado"); });
};

/* ---- Inventario ---- */
VIEWS.inventario = {
  html() {
    const tab = state.tab.inv || "stock"; const b = state.branch || state.tab.invB || "radial-27";
    const tabs = `<div class="tabs">${[["stock", "Stock"], ["recetas", "Recetas y costos"], ["compras", "Compras"], ["mermas", "Mermas"]].map(([k, v]) => `<button data-act="itab" data-t="${k}" class="${tab === k ? "is-on" : ""}">${v}</button>`).join("")}</div>`;
    const bsel = !state.branch ? `<select data-act-change="invB">${BRANCHES.map((x) => `<option value="${x.id}" ${x.id === b ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select>` : `<b>${esc(branchName(b))}</b>`;
    if (tab === "recetas") {
      const items = Object.values(CATALOG).filter((i) => i.kind === "pizza" || i.kind === "combo");
      return tabs + `<p class="muted">Cantidades por pizza familiar. Son estimaciones iniciales: ajustalas con tu receta real y el costo y margen se recalculan solos. El stock se descuenta con estas recetas cuando un pedido entra al horno.</p>
        <div class="card" style="padding:6px 10px">${table([{ k: "n", t: "Producto", v: (i) => i.name, h: (i) => `<b>${esc(i.name)}</b><br><small class="muted">${i.kind === "combo" ? "Combo" : "Pizza"}</small>` },
          { k: "r", t: "Receta", h: (i) => `<small>${i.kind === "pizza" ? (db().recipes[i.id] || []).map((l) => `${esc(ing(l.ing).name)} ${qtyFmt(l.qty, ing(l.ing).unit)}`).join(" · ") : esc(i.parts.map((p) => CATALOG[p]?.name).join(" + ") + " + " + i.drink)}</small>` },
          { k: "p", t: "Precio", r: 1, v: (i) => i.price, h: (i) => money(i.price) }, { k: "c", t: "Costo", r: 1, v: (i) => S.unitCost(db(), i.id), h: (i) => money(S.unitCost(db(), i.id)) },
          { k: "m", t: "Margen", r: 1, v: (i) => 1 - S.unitCost(db(), i.id) / i.price, h: (i) => { const m = Math.round((1 - S.unitCost(db(), i.id) / i.price) * 100); return `<span class="pill pill--${m >= 65 ? "good" : m >= 50 ? "warn" : "bad"}">${m}%</span>`; } },
          { k: "e", t: "", h: (i) => (i.kind === "pizza" ? `<button class="btn btn--xs" data-act="recipe" data-i="${i.id}">Editar</button>` : "") }], items, { id: "rec", sort: state.sort.rec })}</div>
        <div class="sec"><h2>Precios de insumos</h2></div><div class="card" style="padding:6px 10px">${table([{ k: "n", t: "Insumo", h: (i) => esc(i.name) }, { k: "u", t: "Unidad", h: (i) => i.unit },
          { k: "c", t: "Costo Bs/unidad", r: 1, h: (i) => `<input class="in" style="width:90px;text-align:right" type="number" step="0.1" min="0" data-cost="${i.id}" value="${i.cost}">` }, { k: "m", t: "Mínimo por sucursal", r: 1, h: (i) => `<input class="in" style="width:90px;text-align:right" type="number" step="0.5" min="0" data-min="${i.id}" value="${i.min}">` }], db().ingredients, { id: "ingp" })}</div>`;
    }
    if (tab === "compras") {
      const sugg = (state.branch ? [state.branch] : BRANCHES.map((x) => x.id)).flatMap((bid) => { const use = avgDailyUse(bid); return db().ingredients.filter((i) => ((db().stock[bid] || {})[i.id] ?? 0) < i.min).map((i) => ({ bid, i, qty: Math.max(i.min * 2, (use[i.id] || 0) * 7) - ((db().stock[bid] || {})[i.id] ?? 0) })); });
      return tabs + `<div class="grid g2"><div class="card"><div class="card__h"><h2>Sugerido para pedir</h2><small>cubre 7 días según consumo real</small></div>
          ${sugg.map((s) => `<div class="alert"><span class="alert__i alert__i--warn">📦</span><div><b>${esc(s.i.name)} · ${qtyFmt(Math.ceil(s.qty * 10) / 10, s.i.unit)}</b><small>${esc(branchName(s.bid))} · ${esc((db().suppliers.find((x) => x.items.includes(s.i.id)) || {}).name || "sin proveedor")}</small></div><button class="btn btn--xs btn--brand" data-act="po" data-b="${s.bid}" data-i="${s.i.id}" data-q="${Math.ceil(s.qty * 10) / 10}">Crear orden</button></div>`).join("") || `<div class="empty">Todo el stock está sobre el mínimo 👌</div>`}</div>
        <div class="card"><div class="card__h"><h2>Proveedores</h2></div>${db().suppliers.map((s) => `<div class="alert"><span class="alert__i alert__i--info">🚚</span><div><b>${esc(s.name)}</b><small>${s.items.map((x) => esc(ing(x).name)).join(", ")}</small></div></div>`).join("")}</div></div>
        <div class="sec"><h2>Órdenes de compra</h2></div><div class="card" style="padding:6px 10px">${table([{ k: "id", t: "Orden", h: (p) => `<span class="mono">${p.id}</span>` }, { k: "at", t: "Fecha", h: (p) => `${localDate(p.at)} ${hhmm(p.at)}` }, { k: "b", t: "Sucursal", h: (p) => esc(branchName(p.branch)) },
          { k: "s", t: "Proveedor", h: (p) => esc((db().suppliers.find((x) => x.id === p.supplier) || {}).name || "—") }, { k: "i", t: "Detalle", h: (p) => p.items.map((l) => `${esc(ing(l.ing).name)} ${qtyFmt(l.qty, ing(l.ing).unit)}`).join(", ") },
          { k: "t", t: "Total", r: 1, h: (p) => money(p.items.reduce((a, l) => a + l.qty * l.cost, 0)) }, { k: "st", t: "Estado", h: (p) => (p.status === "recibida" ? `<span class="pill pill--good">Recibida</span>` : `<span class="pill pill--warn">Enviada</span> <button class="btn btn--xs" data-act="recv" data-p="${p.id}">Recibir</button>`) }],
          [...db().purchases].reverse(), { id: "po", empty: "Sin órdenes" })}</div>`;
    }
    if (tab === "mermas") {
      return tabs + `<div class="toolbar">${bsel}<span class="grow"></span><button class="btn btn--sm btn--dark" data-act="waste" data-b="${b}">+ Registrar merma</button></div>
        <div class="card" style="padding:6px 10px">${table([{ k: "at", t: "Fecha", h: (w) => `${localDate(w.at)} ${hhmm(w.at)}` }, { k: "b", t: "Sucursal", h: (w) => esc(branchName(w.branch)) }, { k: "i", t: "Insumo", h: (w) => esc(ing(w.ing).name) },
          { k: "q", t: "Cantidad", r: 1, h: (w) => qtyFmt(w.qty, ing(w.ing).unit) }, { k: "c", t: "Costo", r: 1, h: (w) => money(w.qty * ing(w.ing).cost) }, { k: "r", t: "Motivo", h: (w) => esc(w.reason) }], [...db().waste].reverse().filter((w) => !state.branch || w.branch === state.branch), { id: "waste", empty: "Sin mermas registradas" })}</div>`;
    }
    const s = db().stock[b] || {}; const use = avgDailyUse(b);
    const rows = db().ingredients.map((i) => ({ i, q: s[i.id] ?? 0, d: use[i.id] ? (s[i.id] ?? 0) / use[i.id] : Infinity }));
    const val = rows.reduce((a, r) => a + Math.max(0, r.q) * r.i.cost, 0);
    return tabs + `<div class="toolbar">${bsel}<span class="muted">Valor en stock: <b>${money(val)}</b> · ${rows.filter((r) => r.q < r.i.min).length} bajo mínimo</span><span class="grow"></span><button class="btn btn--sm" data-act="count" data-b="${b}">Conteo físico</button></div>
      <div class="card" style="padding:6px 10px">${table([{ k: "n", t: "Insumo", v: (r) => r.i.name, h: (r) => esc(r.i.name) },
        { k: "q", t: "Nivel", v: (r) => r.q / r.i.min, h: (r) => { const f = r.q / (r.i.min * 3); return `<span class="lvl ${r.q <= 0 ? "is-out" : r.q < r.i.min ? "is-low" : ""}"><span class="bar-in"><i style="width:${Math.max(2, Math.min(100, f * 100))}%"></i></span><b class="num">${qtyFmt(r.q, r.i.unit)}</b></span>`; } },
        { k: "min", t: "Mínimo", r: 1, h: (r) => qtyFmt(r.i.min, r.i.unit) }, { k: "use", t: "Uso/día", r: 1, v: (r) => use[r.i.id] || 0, h: (r) => (use[r.i.id] ? qtyFmt(use[r.i.id], r.i.unit) : "—") },
        { k: "d", t: "Alcanza", r: 1, v: (r) => r.d, h: (r) => (isFinite(r.d) ? `<span class="${r.d < 2 ? "delta delta--down" : ""}">${fmt(r.d, 1)} días</span>` : "—") },
        { k: "a", t: "", h: (r) => `<button class="btn btn--xs" data-act="adj" data-b="${b}" data-i="${r.i.id}">Ajustar</button>` }], rows, { id: "stock", sort: state.sort.stock || { k: "q", dir: 1 } })}</div>`;
  },
  after() {
    $$("[data-cost]").forEach((el) => el.addEventListener("change", () => { ing(el.dataset.cost).cost = Number(el.value) || 0; S.save(); }));
    $$("[data-min]").forEach((el) => el.addEventListener("change", () => { ing(el.dataset.min).min = Number(el.value) || 0; S.save(); }));
  },
};
actions.itab = (t) => { state.tab.inv = t.dataset.t; render(); };
document.addEventListener("change", (e) => { if (e.target.dataset.actChange === "invB") { state.tab.invB = e.target.value; render(); } });
actions.adj = (t) => { const i = ing(t.dataset.i); const cur = (db().stock[t.dataset.b] || {})[i.id] ?? 0;
  modal(`<h2 class="h" id="modalT">${esc(i.name)}</h2><p class="sub">${esc(branchName(t.dataset.b))} · hay ${qtyFmt(cur, i.unit)}</p><form class="form" id="adjF"><div class="row"><label>Movimiento<select name="k"><option value="in">Entrada (+)</option><option value="out">Salida (−)</option><option value="set">Fijar cantidad</option></select></label><label>Cantidad (${i.unit})<input class="in" name="q" type="number" step="0.01" min="0" required></label></div><button class="btn btn--brand">Aplicar</button></form>`, { small: true });
  $("#adjF").addEventListener("submit", (e) => { e.preventDefault(); const f = e.target.elements; const q = Number(f.q.value) || 0; const st2 = (db().stock[t.dataset.b] = db().stock[t.dataset.b] || {}); st2[i.id] = f.k.value === "set" ? q : Math.round(((st2[i.id] || 0) + (f.k.value === "in" ? q : -q)) * 1000) / 1000; closeLayers(); S.save(); toast("Stock actualizado"); }); };
actions.count = (t) => { const s = db().stock[t.dataset.b] || {};
  modal(`<h2 class="h" id="modalT">Conteo físico · ${esc(branchName(t.dataset.b))}</h2><p class="sub">Cargá lo que contaste; lo que dejes vacío no cambia.</p><form class="form" id="cntF"><div class="grid g2">${db().ingredients.map((i) => `<label>${esc(i.name)} <small class="muted">(sistema ${qtyFmt(s[i.id] ?? 0, i.unit)})</small><input class="in" name="${i.id}" type="number" step="0.01" min="0"></label>`).join("")}</div><button class="btn btn--brand">Guardar conteo</button></form>`);
  $("#cntF").addEventListener("submit", (e) => { e.preventDefault(); let n = 0; for (const i of db().ingredients) { const v = e.target.elements[i.id].value; if (v !== "") { (db().stock[t.dataset.b] = db().stock[t.dataset.b] || {})[i.id] = Number(v); n++; } } closeLayers(); S.save(); toast(`${n} insumos actualizados`); }); };
actions.recipe = (t) => { const it = CATALOG[t.dataset.i]; const r = (db().recipes[it.id] = db().recipes[it.id] || []);
  const draw = () => { modal(`<h2 class="h" id="modalT">Receta · ${esc(it.name)}</h2><p class="sub">Por pizza familiar. Costo actual: <b>${money(S.unitCost(db(), it.id))}</b> de ${money(it.price)}.</p><form class="form" id="rcF">${r.map((l, k) => `<div class="row" style="grid-template-columns:1fr 120px 36px"><select name="i${k}">${db().ingredients.map((x) => `<option value="${x.id}" ${x.id === l.ing ? "selected" : ""}>${esc(x.name)} (${x.unit})</option>`).join("")}</select><input class="in" name="q${k}" type="number" step="0.001" min="0" value="${l.qty}"><button type="button" class="ib" data-rm="${k}">✕</button></div>`).join("")}
    <div class="toolbar"><button type="button" class="btn btn--sm" id="rcAdd">+ Insumo</button><span class="grow"></span><button class="btn btn--brand">Guardar</button></div></form>`, { small: true });
    const f = $("#rcF"); const keep = () => r.forEach((l, k) => { l.ing = f.elements["i" + k].value; l.qty = Number(f.elements["q" + k].value) || 0; });
    $("#rcAdd").onclick = () => { keep(); r.push({ ing: "oregano", qty: .005 }); draw(); };
    f.onclick = (e) => { const x = e.target.closest("[data-rm]"); if (x) { keep(); r.splice(Number(x.dataset.rm), 1); draw(); } };
    f.onsubmit = (e) => { e.preventDefault(); keep(); closeLayers(); S.save(); toast("Receta guardada"); }; };
  draw(); };
actions.po = (t) => { const i = ing(t.dataset.i); const sup = db().suppliers.find((x) => x.items.includes(i.id)); db().purchases.push({ id: `OC-${200 + db().purchases.length + 1}`, at: Date.now(), branch: t.dataset.b, supplier: sup ? sup.id : null, items: [{ ing: i.id, qty: Number(t.dataset.q), cost: i.cost }], status: "enviada" }); S.save(); toast("Orden de compra creada"); };
actions.recv = (t) => { const p = db().purchases.find((x) => x.id === t.dataset.p); const st2 = (db().stock[p.branch] = db().stock[p.branch] || {}); p.items.forEach((l) => (st2[l.ing] = Math.round(((st2[l.ing] || 0) + l.qty) * 1000) / 1000)); p.status = "recibida"; p.receivedAt = Date.now(); S.save(); toast("Mercadería ingresada al stock"); };
actions.waste = (t) => { modal(`<h2 class="h" id="modalT">Registrar merma</h2><form class="form" id="wF"><label>Insumo<select name="i">${db().ingredients.map((x) => `<option value="${x.id}">${esc(x.name)} (${x.unit})</option>`).join("")}</select></label><div class="row"><label>Cantidad<input class="in" name="q" type="number" step="0.01" min="0" required></label><label>Motivo<select name="r"><option>Vencido</option><option>Se quemó</option><option>Pedido devuelto</option><option>Error de preparación</option><option>Otro</option></select></label></div><button class="btn btn--brand">Registrar</button></form>`, { small: true });
  $("#wF").addEventListener("submit", (e) => { e.preventDefault(); const f = e.target.elements; const q = Number(f.q.value) || 0; db().waste.push({ at: Date.now(), branch: t.dataset.b, ing: f.i.value, qty: q, reason: f.r.value }); const st2 = (db().stock[t.dataset.b] = db().stock[t.dataset.b] || {}); st2[f.i.value] = Math.round(((st2[f.i.value] || 0) - q) * 1000) / 1000; closeLayers(); S.save(); toast("Merma registrada"); }); };

/* ---- Marketing ---- */
VIEWS.marketing = {
  html() {
    const tab = state.tab.mk || "campanas";
    const tabs = `<div class="tabs">${[["campanas", "Campañas WhatsApp"], ["cupones", "Cupones"], ["promos", "Promos y combos"], ["fidelidad", "Puntos"]].map(([k, v]) => `<button data-act="mtab" data-t="${k}" class="${tab === k ? "is-on" : ""}">${v}</button>`).join("")}</div>`;
    if (tab === "cupones") return tabs + `<div class="toolbar"><span class="muted">Los cupones se aplican al crear un pedido.</span><span class="grow"></span><button class="btn btn--sm btn--dark" data-act="coupon">+ Cupón</button></div>
      <div class="card" style="padding:6px 10px">${table([{ k: "code", t: "Código", h: (c) => `<span class="mono"><b>${esc(c.code)}</b></span>` }, { k: "desc", t: "Descripción", h: (c) => esc(c.desc) }, { k: "v", t: "Descuento", h: (c) => (c.type === "pct" ? `${c.value}%` : money(c.value)) },
        { k: "u", t: "Usos", r: 1, h: (c) => `${c.uses} / ${c.maxUses || "∞"}` }, { k: "until", t: "Vence", h: (c) => esc(c.until || "—") }, { k: "a", t: "Estado", h: (c) => `<button class="btn btn--xs" data-act="ctoggle" data-c="${esc(c.code)}">${c.active ? "Activo ✓" : "Pausado"}</button>` }], db().coupons, { id: "cp" })}</div>`;
    if (tab === "promos") {
      const d30 = S.sold(S.ordersIn(Date.now() - 30 * DAY, Date.now())); const units = {}; d30.forEach((o) => o.items.forEach((l) => (units[l.id] = (units[l.id] || 0) + l.qty)));
      const items = Object.values(CATALOG).filter((i) => i.kind !== "pizza");
      return tabs + `<p class="muted">Promos y combos publicados en la web (vienen de la misma carta). Rendimiento de los últimos 30 días.</p><div class="grid g3">${items.map((i) => `<div class="card"><div class="bcard__top"><h3 style="font-size:.98rem">${esc(i.name)}</h3><span class="pill pill--brand">${money(i.price)}</span></div>
        <div class="mini"><div><small>Vendidos</small><b>${units[i.id] || 0}</b></div><div><small>Ingresos</small><b>${money((units[i.id] || 0) * i.price)}</b></div><div><small>Margen</small><b>${Math.round((1 - S.unitCost(db(), i.id) / i.price) * 100)}%</b></div></div></div>`).join("")}</div>`;
    }
    if (tab === "fidelidad") {
      const s = db().settings; const top = [...db().customers].sort((a, b) => (b.points || 0) - (a.points || 0)).slice(0, 12);
      return tabs + `<div class="grid g2"><div class="card"><div class="card__h"><h2>Reglas</h2></div><form class="form" id="loyF"><div class="row"><label>Bs por punto<input class="in" name="a" type="number" min="1" value="${s.loyaltyBsPerPoint}"></label><label>Puntos para un premio<input class="in" name="b" type="number" min="1" value="${s.pointsReward}"></label></div><p class="muted">Ej.: cada Bs 10 suma 1 punto; con 50 puntos el cliente canjea una pizza clásica. Los puntos se suman cuando el pedido se entrega.</p><button class="btn btn--dark">Guardar</button></form></div>
        <div class="card"><div class="card__h"><h2>Más puntos</h2></div>${top.map((c) => `<div class="alert"><span class="avatar">${initials(c.name)}</span><div><b>${esc(c.name)}</b><small>${esc(c.phone)}</small></div><b class="num" style="margin-left:auto">${c.points || 0} pts</b><button class="btn btn--xs" data-open-cust="${c.id}">Ver</button></div>`).join("")}</div></div>`;
    }
    const stats = S.customerStats(); const segN = {}; db().customers.forEach((c) => { const g = S.segment(stats.get(c.id)).id; segN[g] = (segN[g] || 0) + 1; });
    const month = localDate(Date.now()).slice(5, 7); segN.cumple = db().customers.filter((c) => c.birthday && c.birthday.slice(5, 7) === month && c.phone).length;
    const opts = [["dormido", "Dormidos (más de 30 días sin pedir)"], ["vip", "VIP"], ["frecuente", "Frecuentes"], ["nuevo", "Nuevos (primer pedido)"], ["cumple", "Cumpleañeros del mes"], ["ocasional", "Ocasionales"]];
    return tabs + `<div class="grid g2"><div class="card"><div class="card__h"><h2>Nueva campaña</h2></div><form class="form" id="cmpF">
        <label>Nombre<input class="in" name="name" value="Te extrañamos" required></label>
        <label>Para quién<select name="seg">${opts.map(([k, v]) => `<option value="${k}">${v} · ${segN[k] || 0}</option>`).join("")}</select></label>
        <label>Mensaje <small class="muted">usá {nombre} y {puntos}</small><textarea class="in" name="msg" rows="4">¡Hola {nombre}! 😎 Hace rato no te vemos. Con el código HERMOSO10 tenés 10% en tu próxima pizza. ¡Sólo para hermosos!</textarea></label>
        <button class="btn btn--brand">Preparar envíos</button></form>
        <p class="muted" style="margin-top:10px">Se arma la lista de chats con el mensaje personalizado; abrís cada uno y lo enviás desde el WhatsApp de la sucursal. (Para envíos automáticos masivos hace falta la API de WhatsApp Business.)</p></div>
      <div class="card"><div class="card__h"><h2>Campañas</h2></div>${[...db().campaigns].reverse().map((k) => `<div class="alert"><span class="alert__i alert__i--info">📣</span><div><b>${esc(k.name)}</b><small>${esc((opts.find((o) => o[0] === k.segment) || [, k.segment])[1])} · ${k.sent} chats · ${localDate(k.at)}</small></div></div>`).join("") || `<div class="empty">Todavía no hay campañas</div>`}</div></div>
      <div id="cmpOut"></div>`;
  },
  after() {
    const f = $("#cmpF"); if (f) f.addEventListener("submit", (e) => {
      e.preventDefault(); const seg = f.elements.seg.value, msg = f.elements.msg.value; const stats = S.customerStats(); const month = localDate(Date.now()).slice(5, 7);
      const list = db().customers.filter((c) => c.phone && (seg === "cumple" ? c.birthday && c.birthday.slice(5, 7) === month : S.segment(stats.get(c.id)).id === seg));
      const k = { id: S.uid("K"), at: Date.now(), name: f.elements.name.value, segment: seg, message: msg, sent: list.length }; db().campaigns.push(k); S.save();
      $("#cmpOut").innerHTML = `<div class="sec"><h2>${esc(k.name)} · ${list.length} chats</h2></div><div class="card" style="padding:6px 10px">${table([{ k: "n", t: "Cliente", h: (c) => esc(c.name) }, { k: "p", t: "Teléfono", h: (c) => esc(c.phone) },
        { k: "m", t: "Mensaje", h: (c) => `<small>${esc(msg.replace(/\{nombre\}/g, c.name.split(" ")[0]).replace(/\{puntos\}/g, c.points || 0))}</small>` }, { k: "a", t: "", h: (c) => `<a class="btn btn--xs btn--wa" target="_blank" rel="noopener" href="${wa(c.phone, msg.replace(/\{nombre\}/g, c.name.split(" ")[0]).replace(/\{puntos\}/g, c.points || 0))}" onclick="this.textContent='Abierto ✓'">Abrir chat</a>` }], list, { id: "cmpList", empty: "Nadie en ese segmento" })}</div>`;
      $("#cmpOut").scrollIntoView({ behavior: "smooth" });
    });
    const lf = $("#loyF"); if (lf) lf.addEventListener("submit", (e) => { e.preventDefault(); db().settings.loyaltyBsPerPoint = Number(lf.elements.a.value) || 10; db().settings.pointsReward = Number(lf.elements.b.value) || 50; S.save(); toast("Reglas guardadas"); });
  },
};
actions.mtab = (t) => { state.tab.mk = t.dataset.t; render(); };
actions.ctoggle = (t) => { const c = db().coupons.find((x) => x.code === t.dataset.c); c.active = !c.active; S.save(); };
actions.coupon = () => { modal(`<h2 class="h" id="modalT">Nuevo cupón</h2><form class="form" id="cpF"><div class="row"><label>Código<input class="in" name="code" required style="text-transform:uppercase"></label><label>Vence<input class="in" type="date" name="until"></label></div><label>Descripción<input class="in" name="desc"></label><div class="row"><label>Tipo<select name="type"><option value="pct">Porcentaje</option><option value="amt">Monto fijo (Bs)</option></select></label><label>Valor<input class="in" name="value" type="number" min="1" required></label></div><label>Usos máximos<input class="in" name="max" type="number" min="0" value="100"></label><button class="btn btn--brand">Crear</button></form>`, { small: true });
  $("#cpF").addEventListener("submit", (e) => { e.preventDefault(); const f = e.target.elements; db().coupons.push({ code: f.code.value.trim().toUpperCase(), desc: f.desc.value.trim(), type: f.type.value, value: Number(f.value.value), uses: 0, maxUses: Number(f.max.value) || 0, active: true, until: f.until.value }); closeLayers(); S.save(); toast("Cupón creado"); }); };

/* ---- Reportes ---- */
VIEWS.reportes = {
  html() {
    const days = Number(state.tab.rep || 30); const to = Date.now(), from = days === 1 ? dayStart() : dayStart() - (days - 1) * DAY;
    const all = scoped(S.ordersIn(from, to)); const os = S.sold(all); const sum = os.reduce((a, o) => a + o.total, 0);
    const cost = os.reduce((a, o) => a + o.items.reduce((b, l) => b + S.unitCost(db(), l.id) * l.qty, 0), 0);
    const prev = scoped(S.sold(S.ordersIn(from - (to - from), from))); const psum = prev.reduce((a, o) => a + o.total, 0);
    const first = db().orders.length ? db().orders[0].at : Date.now(); const hasPrev = first <= from - (to - from) + DAY;   // only compare against a period we have data for
    const dl = (a, b, l) => (hasPrev ? delta(a, b, l) : `<span class="muted">sin datos del período anterior</span>`);
    const prod = {}; os.forEach((o) => o.items.forEach((l) => { const p = (prod[l.id] = prod[l.id] || { id: l.id, n: 0, rev: 0 }); p.n += l.qty; p.rev += l.qty * l.price; }));
    const prodRows = Object.values(prod).map((p) => ({ ...p, name: (CATALOG[p.id] || {}).name || p.id, cost: S.unitCost(db(), p.id) * p.n }));
    const by = (key, names) => Object.entries(names).map(([k, v]) => { const x = os.filter((o) => o[key] === k); return { k, name: v, n: x.length, rev: x.reduce((a, o) => a + o.total, 0) }; });
    const brRows = BRANCHES.map((b) => { const x = os.filter((o) => o.branch === b.id); return { name: b.name, n: x.length, rev: x.reduce((a, o) => a + o.total, 0), cancel: all.filter((o) => o.branch === b.id && o.status === "cancelado").length }; });
    const hours = [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1]; const grid = Array.from({ length: 7 }, () => hours.map(() => 0));
    os.forEach((o) => { const j = hours.indexOf(localHour(o.at)); if (j >= 0) grid[localDow(o.at)][j]++; });
    const rng = [["1", "Hoy"], ["7", "7 días"], ["30", "30 días"], ["90", "90 días"]];
    return `<div class="toolbar"><div class="seg">${rng.map(([k, v]) => `<button data-act="rrange" data-r="${k}" class="${String(days) === k ? "is-on" : ""}">${v}</button>`).join("")}</div><span class="muted">${localDate(from)} → ${localDate(to)}${state.branch ? " · " + esc(branchName(state.branch)) : " · todas las sucursales"}</span></div>
      <div class="grid g4"><div class="card stat stat--hero"><div class="stat__k">Ventas</div><div class="stat__v">${money(sum)}</div><div class="stat__d">${dl(sum, psum, "vs. período anterior")}</div></div>
        <div class="card stat"><div class="stat__k">Pedidos</div><div class="stat__v">${fmt(os.length)}</div><div class="stat__d">${dl(os.length, prev.length, "vs. anterior")}</div></div>
        <div class="card stat"><div class="stat__k">Ticket promedio</div><div class="stat__v">${money(os.length ? sum / os.length : 0)}</div><div class="stat__d">${all.length - os.length} cancelados (${all.length ? Math.round(((all.length - os.length) / all.length) * 100) : 0}%)</div></div>
        <div class="card stat"><div class="stat__k">Margen bruto</div><div class="stat__v">${sum ? Math.round((1 - cost / sum) * 100) : 0}%</div><div class="stat__d">costo comida ${money(cost)} · recetas estimadas</div></div></div>
      <div class="grid g2" style="margin-top:16px"><div class="card"><div class="card__h"><h2>¿Cuándo se vende?</h2><small>pedidos por día y hora</small></div>${heat(grid, hours)}</div>
        <div class="card"><div class="card__h"><h2>Canales</h2><small>ingresos</small></div>${stack(by("channel", CHANNELS).map((r) => ({ label: r.name, v: r.rev })), { fmtV: money })}
          <div class="card__h" style="margin-top:22px"><h2>Medios de pago</h2></div>${stack(by("payment", PAYMENTS).map((r) => ({ label: r.name, v: r.rev })), { fmtV: money })}</div></div>
      <div class="sec"><h2>Productos</h2><button class="btn btn--sm" data-act="rcsv" data-d="${days}">Exportar CSV</button></div>
      <div class="card" style="padding:6px 10px">${table([{ k: "name", t: "Producto", v: (p) => p.name, h: (p) => `<b>${esc(p.name)}</b>` }, { k: "n", t: "Unidades", r: 1, v: (p) => p.n, h: (p) => fmt(p.n) }, { k: "rev", t: "Ingresos", r: 1, v: (p) => p.rev, h: (p) => money(p.rev) },
        { k: "share", t: "% ventas", v: (p) => p.rev, h: (p) => `<span class="lvl"><span class="bar-in"><i style="width:${sum ? (p.rev / sum) * 100 * 4 : 0}%;background:var(--seq)"></i></span><b class="num">${sum ? fmt((p.rev / sum) * 100, 1) : 0}%</b></span>` },
        { k: "cost", t: "Costo", r: 1, v: (p) => p.cost, h: (p) => money(p.cost) }, { k: "m", t: "Margen", r: 1, v: (p) => p.rev - p.cost, h: (p) => money(p.rev - p.cost) }], prodRows, { id: "rprod", sort: state.sort.rprod || { k: "rev", dir: -1 } })}</div>
      <div class="grid g2" style="margin-top:16px"><div class="card" style="padding:6px 10px">${table([{ k: "name", t: "Sucursal", h: (r) => `<b>${esc(r.name)}</b>` }, { k: "n", t: "Pedidos", r: 1, v: (r) => r.n, h: (r) => fmt(r.n) }, { k: "rev", t: "Ventas", r: 1, v: (r) => r.rev, h: (r) => money(r.rev) }, { k: "t", t: "Ticket", r: 1, v: (r) => (r.n ? r.rev / r.n : 0), h: (r) => money(r.n ? r.rev / r.n : 0) }, { k: "c", t: "Cancel.", r: 1, v: (r) => r.cancel, h: (r) => r.cancel }], brRows, { id: "rbr", sort: state.sort.rbr || { k: "rev", dir: -1 } })}</div>
        <div class="card" style="padding:6px 10px">${table([{ k: "name", t: "Servicio", h: (r) => `<b>${r.name}</b>` }, { k: "n", t: "Pedidos", r: 1, h: (r) => fmt(r.n) }, { k: "rev", t: "Ventas", r: 1, h: (r) => money(r.rev) }, { k: "t", t: "Ticket", r: 1, h: (r) => money(r.n ? r.rev / r.n : 0) }], by("service", SERVICES), { id: "rsv" })}</div></div>`;
  },
};
actions.rrange = (t) => { state.tab.rep = t.dataset.r; render(); };
actions.rcsv = (t) => { const d = Number(t.dataset.d); const os = scoped(S.sold(S.ordersIn(d === 1 ? dayStart() : dayStart() - (d - 1) * DAY, Date.now()))); const p = {}; os.forEach((o) => o.items.forEach((l) => { p[l.id] = p[l.id] || [0, 0]; p[l.id][0] += l.qty; p[l.id][1] += l.qty * l.price; }));
  csv(`productos-${d}d.csv`, ["producto", "unidades", "ingresos", "costo_estimado"], Object.entries(p).map(([id, [n, r]]) => [(CATALOG[id] || {}).name || id, n, r, Math.round(S.unitCost(db(), id) * n)])); };

/* ---- Leads ---- */
VIEWS.leads = {
  html() {
    const L = db().leads; const stl = { nuevo: ["Nuevo", "info"], contactado: ["Contactado", "warn"], reunion: ["Reunión", "brand"], cerrado: ["Cerrado", "good"], descartado: ["Descartado", ""] };
    return `<p class="muted">Interesados en franquicias que dejaron sus datos en la web. Cada formulario también llega al WhatsApp del call center.</p>
      <div class="card" style="padding:6px 10px">${table([{ k: "at", t: "Fecha", h: (l) => `${localDate(l.at)} ${hhmm(l.at)}` }, { k: "name", t: "Nombre", h: (l) => `<b>${esc(l.name)}</b>` }, { k: "phone", t: "Celular", h: (l) => esc(l.phone) }, { k: "city", t: "Ciudad", h: (l) => esc(l.city || "—") }, { k: "note", t: "Comentario", h: (l) => esc(l.note || "") },
        { k: "st", t: "Estado", h: (l) => `<select data-lead="${l.id}">${Object.entries(stl).map(([k, [v]]) => `<option value="${k}" ${l.status === k ? "selected" : ""}>${v}</option>`).join("")}</select>` },
        { k: "a", t: "", h: (l) => (l.phone ? `<a class="btn btn--xs btn--wa" href="${wa(l.phone, `¡Hola ${l.name.split(" ")[0]}! Te escribimos de Ugo's Pizza por tu interés en una franquicia 😎`)}" target="_blank" rel="noopener">WhatsApp</a>` : "") }],
        L, { id: "leads", empty: "Todavía no llegaron leads. Aparecen acá cuando alguien completa el formulario de franquicias en la web." })}</div>`;
  },
  after() { $$("[data-lead]").forEach((s) => s.addEventListener("change", () => { db().leads.find((l) => l.id === s.dataset.lead).status = s.value; S.save(); })); },
};

/* ---- Ajustes ---- */
VIEWS.ajustes = {
  html() {
    const size = Math.round((localStorage.getItem(S.DB_KEY) || "").length / 1024);
    return `<div class="grid g2"><div class="card"><div class="card__h"><h2>Operación</h2></div><form class="form" id="setF"><label>Tiempo objetivo de entrega (SLA, minutos)<input class="in" name="sla" type="number" min="10" max="120" value="${db().settings.slaMin}"></label><button class="btn btn--dark">Guardar</button></form></div>
      <div class="card"><div class="card__h"><h2>Datos</h2></div><p>Los datos viven en este navegador (${size} KB). Hacé copias de seguridad seguido.</p>
        <div class="toolbar"><button class="btn" data-act="backup">Descargar copia</button><label class="btn">Restaurar copia<input type="file" accept="application/json" id="restore" hidden></label></div>
        <div class="toolbar"><button class="btn btn--ghost" data-act="demo">Cargar datos de demostración</button><button class="btn btn--ghost btn--bad" data-act="clean">Empezar en limpio</button></div></div></div>
      <div class="card" style="margin-top:16px"><div class="card__h"><h2>Carta y sucursales</h2><small>vienen de la web (js/data.js)</small></div><p class="muted">${Object.values(CATALOG).length} productos · ${BRANCHES.length} puntos de venta. Cuando cambia un precio en la web, el CRM lo toma solo.</p></div>`;
  },
  after() {
    $("#setF").addEventListener("submit", (e) => { e.preventDefault(); db().settings.slaMin = Number(e.target.elements.sla.value) || 35; S.save(); toast("Guardado"); });
    $("#restore").addEventListener("change", async (e) => { const f = e.target.files[0]; if (!f) return; try { const d = JSON.parse(await f.text()); if (d.v !== 1 || !Array.isArray(d.orders)) throw 0; localStorage.setItem(S.DB_KEY, JSON.stringify(d)); S.load(); toast("Copia restaurada"); render(); } catch (er) { toast("Ese archivo no es una copia válida"); } });
  },
};
actions.backup = () => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(db())], { type: "application/json" })); a.download = `ugos-crm-${localDate(Date.now())}.json`; a.click(); };
actions.demo = () => { if (confirm("Reemplaza los datos actuales por datos de demostración. ¿Seguimos?")) { S.reset({ demo: true }); toast("Datos de demostración cargados"); } };

/* ---------------- boot ---------------- */
S.load(); initShell(); route();
