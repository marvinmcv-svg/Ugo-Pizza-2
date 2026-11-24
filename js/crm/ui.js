/* Ugo's CRM — small UI kit: DOM helpers, drawer/modal/toast, tooltip, charts (inline SVG). */
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const initials = (n) => (n || "?").split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
export const fmt = (n, d = 0) => Number(n || 0).toLocaleString("es-BO", { minimumFractionDigits: d, maximumFractionDigits: d });
export const pct = (a, b) => (b ? Math.round((a / b - 1) * 100) : null);
export function delta(a, b, label = "") {
  const p = pct(a, b); if (p == null || !isFinite(p)) return `<span class="muted">${label}</span>`;
  return `<span class="delta delta--${p >= 0 ? "up" : "down"}">${p >= 0 ? "▲" : "▼"} ${Math.abs(p)}%</span> <span>${label}</span>`;
}
export function ago(ts, now = Date.now()) {
  const m = Math.max(0, Math.round((now - ts) / 60e3));
  if (m < 60) return `${m} min`; const h = Math.floor(m / 60); if (h < 24) return `${h} h ${m % 60} min`; const d = Math.floor(h / 24); return `${d} ${d === 1 ? "día" : "días"}`;
}
export const mmss = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };

/* drawer + modal */
let lastFocus = null;
export function drawer(html) { lastFocus = document.activeElement; $("#drawerBody").innerHTML = html; $("#drawer").hidden = false; $("#drawer .drawer__x").focus(); }
export function modal(html, { small = false } = {}) { lastFocus = document.activeElement; $("#modalBody").innerHTML = html; $("#modal .modal__panel").classList.toggle("modal__panel--sm", small); $("#modal").hidden = false; const f = $("#modal input, #modal select, #modal button:not(.drawer__x)"); (f || $("#modal .drawer__x")).focus(); }
export function closeLayers() { const was = !$("#drawer").hidden || !$("#modal").hidden; $("#drawer").hidden = true; $("#modal").hidden = true; if (was && lastFocus) lastFocus.focus(); }
document.addEventListener("click", (e) => { if (e.target.closest("[data-close]") || e.target.id === "drawer" || e.target.id === "modal") closeLayers(); });
addEventListener("keydown", (e) => { if (e.key === "Escape") closeLayers(); });

let toastT = 0;
export function toast(t) { const el = $("#toast"); el.textContent = t; el.classList.add("is-on"); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove("is-on"), 2400); }

/* tooltip: any element with data-tip shows it; charts set it on their hit targets */
const tip = () => $("#tip");
document.addEventListener("pointerover", (e) => { const t = e.target.closest("[data-tip]"); if (!t) return; tip().innerHTML = t.dataset.tip; tip().hidden = false; const c = t.closest(".chart"); if (c) { c.classList.add("is-hover"); $$(`.mk[data-k="${t.dataset.k}"]`, c).forEach((m) => m.classList.add("is-on")); } });
document.addEventListener("pointermove", (e) => { if (tip().hidden) return; const w = tip().offsetWidth, h = tip().offsetHeight; let x = e.clientX + 14, y = e.clientY - h - 12; if (x + w > innerWidth - 8) x = e.clientX - w - 14; if (y < 8) y = e.clientY + 18; tip().style.left = x + "px"; tip().style.top = y + "px"; });
document.addEventListener("pointerout", (e) => { const t = e.target.closest("[data-tip]"); if (!t) return; tip().hidden = true; const c = t.closest(".chart"); if (c) { c.classList.remove("is-hover"); $$(".mk.is-on", c).forEach((m) => m.classList.remove("is-on")); } });

/* ---------- charts ---------- */
const nice = (v) => { if (v <= 0) return 1; const p = Math.pow(10, Math.floor(Math.log10(v))); const f = v / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p; };
const short = (n) => (n >= 1e6 ? `${fmt(n / 1e6, 1)} M` : n >= 1e4 ? `${fmt(n / 1e3, 0)} k` : n >= 1e3 ? `${fmt(n / 1e3, 1)} k` : fmt(n));
/** rounded-top bar path anchored to the baseline */
const barPath = (x, y, w, h, r = 4) => { r = Math.min(r, w / 2, h); return h <= 0 ? "" : `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`; };

/** vertical bars, one series (+ optional reference line series drawn as a 2px line).
 *  data: [{label, v, tip, ref?}]  */
export function bars(data, { h = 220, color = "var(--seq)", refColor = "var(--ink-3)", refName = "", fmtV = short, every = 1 } = {}) {
  const W = 640, P = { l: 40, r: 8, t: 10, b: 24 }, iw = W - P.l - P.r, ih = h - P.t - P.b;
  const max = nice(Math.max(1, ...data.map((d) => Math.max(d.v, d.ref || 0))));
  const bw = iw / data.length, gap = Math.max(2, bw * .22);
  const y = (v) => P.t + ih - (v / max) * ih;
  const ticks = [0, .25, .5, .75, 1].map((f) => max * f);
  let s = ticks.map((t) => `<line class="gl" x1="${P.l}" x2="${W - P.r}" y1="${y(t)}" y2="${y(t)}"/><text class="ax" x="${P.l - 6}" y="${y(t) + 4}" text-anchor="end">${fmtV(t)}</text>`).join("");
  data.forEach((d, i) => {
    const x = P.l + i * bw + gap / 2, w = bw - gap;
    s += `<path class="mk" data-k="${i}" d="${barPath(x, y(d.v), w, P.t + ih - y(d.v))}" fill="${color}"/>`;
    if (i % every === 0) s += `<text class="ax" x="${x + w / 2}" y="${h - 6}" text-anchor="middle">${d.label}</text>`;
  });
  if (data.some((d) => d.ref != null)) {
    const pts = data.map((d, i) => `${P.l + i * bw + bw / 2},${y(d.ref || 0)}`).join(" ");
    s += `<polyline points="${pts}" fill="none" stroke="${refColor}" stroke-width="2" stroke-dasharray="4 4" stroke-linejoin="round"/>`;
  }
  data.forEach((d, i) => { s += `<rect class="hit" x="${P.l + i * bw}" y="${P.t}" width="${bw}" height="${ih}" data-k="${i}" data-tip="${esc(d.tip || `${d.label}: ${fmtV(d.v)}`)}"/>`; });
  const legend = refName ? `<div class="legend"><span><i style="background:${color}"></i>${esc(data.name || "Hoy")}</span><span><i style="background:none;border-top:2px dashed ${refColor};height:0;border-radius:0"></i>${esc(refName)}</span></div>` : "";
  return `<div class="chart"><svg viewBox="0 0 ${W} ${h}" role="img" aria-label="${esc(data.map((d) => `${d.label}: ${fmtV(d.v)}`).join(", "))}">${s}</svg>${legend}</div>`;
}

/** area + line, one series. data [{label, v, tip}] */
export function line(data, { h = 200, color = "var(--seq)", fmtV = short, every = 1 } = {}) {
  const W = 640, P = { l: 44, r: 10, t: 12, b: 24 }, iw = W - P.l - P.r, ih = h - P.t - P.b;
  const max = nice(Math.max(1, ...data.map((d) => d.v)));
  const x = (i) => P.l + (data.length < 2 ? iw / 2 : (i / (data.length - 1)) * iw), y = (v) => P.t + ih - (v / max) * ih;
  let s = [0, .5, 1].map((f) => `<line class="gl" x1="${P.l}" x2="${W - P.r}" y1="${y(max * f)}" y2="${y(max * f)}"/><text class="ax" x="${P.l - 6}" y="${y(max * f) + 4}" text-anchor="end">${fmtV(max * f)}</text>`).join("");
  const pts = data.map((d, i) => `${x(i)},${y(d.v)}`).join(" ");
  s += `<polygon points="${P.l},${P.t + ih} ${pts} ${x(data.length - 1)},${P.t + ih}" fill="${color}" opacity=".1"/><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
  data.forEach((d, i) => { if (i % every === 0 || i === data.length - 1) s += `<text class="ax" x="${x(i)}" y="${h - 6}" text-anchor="middle">${d.label}</text>`; });
  const bw = iw / Math.max(1, data.length - 1);
  data.forEach((d, i) => { s += `<circle class="mk" data-k="${i}" cx="${x(i)}" cy="${y(d.v)}" r="4" fill="${color}" stroke="var(--paper)" stroke-width="2" opacity="${i === data.length - 1 ? 1 : 0}"/><rect class="hit" x="${x(i) - bw / 2}" y="${P.t}" width="${bw}" height="${ih}" data-k="${i}" data-tip="${esc(d.tip || `${d.label}: ${fmtV(d.v)}`)}"/>`; });
  return `<div class="chart chart--line"><svg viewBox="0 0 ${W} ${h}" role="img" aria-label="${esc(data.map((d) => `${d.label}: ${fmtV(d.v)}`).join(", "))}">${s}</svg></div>`;
}

/** horizontal ranked bars (single series) as HTML rows */
export function hbars(rows, { fmtV = (v) => fmt(v), color = "var(--seq)" } = {}) {
  const max = Math.max(1, ...rows.map((r) => r.v));
  return rows.map((r, i) => `<div class="rank" data-tip="${esc(r.tip || `${r.label}: ${fmtV(r.v)}`)}"><em>${i + 1}</em><span>${esc(r.label)}</span><b class="num">${fmtV(r.v)}</b><span class="bar-in"><i style="width:${(r.v / max) * 100}%;background:${color}"></i></span></div>`).join("");
}

/** 100% segmented bar with legend (≤5 series, fixed categorical order) */
export function stack(parts, { fmtV = (v) => fmt(v) } = {}) {
  const tot = parts.reduce((a, p) => a + p.v, 0) || 1; const cols = ["var(--s1)", "var(--s2)", "var(--s3)", "var(--s4)", "var(--s5)"];
  return `<div class="chart"><div class="stack">${parts.map((p, i) => p.v ? `<i class="mk" data-k="${i}" style="width:${(p.v / tot) * 100}%;background:${cols[i]}" data-tip="${esc(`${p.label}: ${fmtV(p.v)} (${Math.round((p.v / tot) * 100)}%)`)}"></i>` : "").join("")}</div>
    <div class="legend">${parts.map((p, i) => `<span><i style="background:${cols[i]}"></i>${esc(p.label)} <b class="num">${Math.round((p.v / tot) * 100)}%</b></span>`).join("")}</div></div>`;
}

/** weekday × hour heatmap, single hue (sequential) */
export function heat(grid, hours, { fmtV = (v) => fmt(v) } = {}) {
  const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]; const max = Math.max(1, ...grid.flat());
  const ramp = (v) => { const t = v / max; return t === 0 ? "var(--grid)" : `color-mix(in oklab, var(--seq) ${Math.round(12 + t * 88)}%, #fff4ea)`; };
  let s = `<div class="heat" style="grid-template-columns:42px repeat(${hours.length},1fr)"><span></span>${hours.map((h) => `<span style="text-align:center">${h}</span>`).join("")}`;
  [1, 2, 3, 4, 5, 6, 0].forEach((d) => { s += `<span>${days[d]}</span>` + hours.map((h, j) => `<i style="background:${ramp(grid[d][j])}" data-tip="${esc(`${days[d]} ${h}:00 · ${fmtV(grid[d][j])}`)}"></i>`).join(""); });
  return s + `</div><div class="legend"><span>Menos</span>${[.1, .3, .55, .8, 1].map((t) => `<i style="background:color-mix(in oklab, var(--seq) ${Math.round(12 + t * 88)}%, #fff4ea)"></i>`).join("")}<span>Más</span></div>`;
}

/** sortable table: cols [{k, t, r(ight)?, v(row)->sortValue, h(row)->html}] */
export function table(cols, rows, { id = "t", sort, rowAttr = () => "", empty = "Sin datos", limit = 0 } = {}) {
  if (sort) { const c = cols.find((x) => x.k === sort.k); if (c) rows = [...rows].sort((a, b) => { const va = c.v ? c.v(a) : a[c.k], vb = c.v ? c.v(b) : b[c.k]; return (va > vb ? 1 : va < vb ? -1 : 0) * (sort.dir || 1); }); }
  if (!rows.length) return `<div class="empty">${empty}</div>`;
  const more = limit && rows.length > limit ? rows.length - limit : 0; if (more) rows = rows.slice(0, limit);
  return `<div class="tbl-wrap"><table class="tbl" data-tbl="${id}"><thead><tr>${cols.map((c) => `<th class="${c.r ? "r " : ""}${c.v || c.sort ? "sort" : ""}${sort && sort.k === c.k ? (sort.dir > 0 ? " is-asc" : " is-desc") : ""}" data-k="${c.k}">${c.t}</th>`).join("")}</tr></thead>
    <tbody>${rows.map((r) => `<tr ${rowAttr(r)}>${cols.map((c) => `<td class="${c.r ? "r num" : ""}">${c.h ? c.h(r) : esc(r[c.k])}</td>`).join("")}</tr>`).join("")}</tbody></table>${more ? `<p class="muted" style="padding:10px">y ${more} más · usá el buscador o los filtros</p>` : ""}</div>`;
}

export function csv(name, header, rows) {
  const q = (v) => { const s = String(v == null ? "" : v); return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const blob = new Blob(["﻿" + [header, ...rows].map((r) => r.map(q).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
