/* Ugo·IA — ordering assistant endpoint. POST { messages, state, channel } → NDJSON event stream.
 * Tool-calling agent loop on Claude (Anthropic) or NVIDIA NIM (OpenAI-compatible). Keys only from env. */
"use strict";
const T = require("./_tools.js");
const { STATIC, liveContext } = require("./_prompt.js");
const { pickLine } = require("./_persona.js");

const MAX_ROUNDS = 6;
const hits = new Map(); // best-effort per-IP rate limit (per warm instance)
function limited(ip) {
  const now = Date.now(); const arr = (hits.get(ip) || []).filter((t) => now - t < 60000);
  arr.push(now); hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > 15;
}
function provider() {
  const forced = (process.env.UGOIA_PROVIDER || "").toLowerCase();
  if (forced === "nvidia" && process.env.NVIDIA_API_KEY) return "nvidia";
  if (forced === "anthropic" && process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (forced) return null;
  if (process.env.NVIDIA_API_KEY) return "nvidia";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return null;
}
async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");
  let raw = ""; for await (const c of req) { raw += c; if (raw.length > 200000) throw new Error("too_big"); }
  return JSON.parse(raw || "{}");
}
function cleanMessages(list) {
  const out = (Array.isArray(list) ? list : [])
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-16).map((m) => ({ role: m.role, content: m.content.slice(0, 1200) }));
  while (out.length && out[0].role !== "user") out.shift();
  // merge consecutive same-role turns (providers require alternation)
  const merged = [];
  for (const m of out) { const last = merged[merged.length - 1]; if (last && last.role === m.role) last.content += "\n" + m.content; else merged.push({ ...m }); }
  return merged;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") { res.statusCode = 405; res.setHeader("Allow", "POST"); return res.end(JSON.stringify({ error: "method_not_allowed" })); }
  const prov = provider();
  if (!prov) { res.statusCode = 503; res.setHeader("Content-Type", "application/json"); return res.end(JSON.stringify({ error: "not_configured" })); }
  const ip = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "?").split(",")[0].trim();
  if (limited(ip)) { res.statusCode = 429; res.setHeader("Content-Type", "application/json"); return res.end(JSON.stringify({ error: "rate_limited" })); }

  let body; try { body = await readBody(req); } catch (e) { res.statusCode = 400; return res.end(JSON.stringify({ error: "bad_json" })); }
  const messages = cleanMessages(body.messages);
  if (!messages.length) { res.statusCode = 400; return res.end(JSON.stringify({ error: "no_messages" })); }
  const channel = body.channel === "voice" ? "voice" : "text";

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Accel-Buffering", "no");
  const emit = (ev) => { try { res.write(JSON.stringify(ev) + "\n"); } catch (e) { /* client gone */ } };

  try {
    await runTurn({ messages, rawState: body.state, channel, emit, provider: prov });
  } catch (e) {
    console.error("ugoia_error", e && (e.status || ""), e && e.message);
    emit({ type: "error", kind: e && e.status === 429 ? "rate" : "model" });
  }
  res.end();
};

/** Core turn, exported for tests (provider calls are injected via `callModel`). */
async function runTurn({ messages, rawState, channel, emit, provider: prov, callModel, now = new Date() }) {
  const date = require("../js/data.js").localNow(now).date;
  const state = T.sanitizeState(rawState, date);
  const ctx = { state, emit, now, allowPlace: false };
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const yes = !!lastUser && T.isYes(lastUser.content);
  const tokenAtStart = state.stage === "awaiting_confirmation" ? state.token
    : state.stage === "placed" && state.placed ? state.placed.token : null; // a repeated "yes" returns the same order

  // Guard 1: confirmation is enforced by the server. On a clear "yes" to a read-back shown in an earlier turn,
  // the server places the order itself before the model runs.
  let placed = null;
  if (tokenAtStart && yes) {
    ctx.allowPlace = true;
    const r = T.runTool(ctx, "place_order", { token: tokenAtStart });
    ctx.allowPlace = false;
    if (r.placed) placed = { id: r.id, branch: r.branch || (state.placed && state.placed.branch) };
  }
  // Any place_order the model attempts later this turn is allowed only under the same conditions (and is idempotent).
  const guardedRun = (name, args) => {
    if (name === "place_order") {
      const ok = !!tokenAtStart && yes && (state.token === tokenAtStart || (state.placed && state.placed.token === tokenAtStart));
      ctx.allowPlace = ok;
      const r = T.runTool(ctx, name, { token: tokenAtStart || (args && args.token) });
      ctx.allowPlace = false; return r;
    }
    return T.runTool(ctx, name, args);
  };

  // persona line suggestion (never repeated in a session)
  const now2 = require("../js/data.js").localNow(now);
  const qty = Object.values(state.cart).reduce((a, b) => a + b, 0);
  const tag = placed ? "order_confirmed" : messages.filter((m) => m.role === "user").length === 1 ? "greeting" : qty >= 4 ? "big_order" : (now2.min >= 23 * 60 || now2.min < 60) ? "late_night" : channel === "voice" ? null : null;
  const line = tag ? pickLine(tag, state.lines) : null;
  if (line) state.lines.push(line.id);

  const live = liveContext(state, now, { placed, line: line && line.t }) + (channel === "voice" ? "\nCANAL: voz (respuestas de ~20 palabras)." : "\nCANAL: texto.");

  const call = callModel || (prov === "nvidia" ? nvidiaRound : anthropicRound);
  const conv = { messages: messages.map((m) => ({ ...m })), live, channel };
  let lastText = "";
  const say = (t) => {
    if (!t) return;
    if (lastText && sayState.newRound) {
      // paragraph break between tool rounds only after a finished sentence ("¡" + tool + "Listo!" stays "¡Listo!")
      if (/[.!?…)\]»"'\u{1F300}-\u{1FAFF}]\s*$/u.test(lastText)) emit({ type: "text", text: "\n\n" });
      sayState.newRound = false;
    }
    lastText += t; emit({ type: "text", text: t });
  };
  const sayState = { newRound: false };

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const { toolCalls } = await call(conv, { onText: say, channel });
    if (!toolCalls.length) break;
    const results = toolCalls.map((tc) => ({ id: tc.id, name: tc.name, result: guardedRun(tc.name, tc.args) }));
    conv.pushResults(results);
    sayState.newRound = true;
    if (round === MAX_ROUNDS - 1) say("¿Seguimos? Contame qué más necesitás.");
  }
  if (!lastText && placed) say(`¡Listo! Tu pedido ${placed.id} está preparado: tocá el botón verde para enviarlo por WhatsApp a ${placed.branch}.`);
  if (!lastText) say("¿En qué más te ayudo, hermoso?");
  emit({ type: "state", state });
  return state;
}

/* ---------------- Claude (Anthropic) ---------------- */
let anthropicClient = null;
async function anthropicRound(conv, { onText, channel }) {
  if (!anthropicClient) { const Anthropic = require("@anthropic-ai/sdk"); anthropicClient = new (Anthropic.default || Anthropic)(); }
  if (!conv.anthropic) {
    conv.anthropic = conv.messages.map((m) => ({ role: m.role, content: m.content }));
    conv.pushResults = (results) => conv.anthropic.push({ role: "user", content: results.map((r) => ({ type: "tool_result", tool_use_id: r.id, content: JSON.stringify(r.result) })) });
  }
  const model = channel === "voice" ? (process.env.UGOIA_VOICE_MODEL || "claude-haiku-5-5") : (process.env.UGOIA_MODEL || "claude-sonnet-5-5");
  const params = {
    model, max_tokens: channel === "voice" ? 1024 : 2048,
    output_config: { effort: "low" }, // chat-style turns: low effort keeps latency down
    system: [{ type: "text", text: STATIC, cache_control: { type: "ephemeral" } }, { type: "text", text: conv.live }],
    tools: TOOLS_ANTHROPIC, messages: conv.anthropic,
  };
  // Refusal fallback: Sonnet 5.5 supports server-side fallbacks (beta); Haiku has none.
  const useFallback = /sonnet-5-5/.test(model);
  const stream = useFallback
    ? anthropicClient.beta.messages.stream({ ...params, betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" })
    : anthropicClient.messages.stream(params);
  for await (const ev of stream) {
    if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") onText(ev.delta.text);
  }
  const msg = await stream.finalMessage();
  if (msg.stop_reason === "refusal") { onText("Uy, eso no lo puedo responder. ¿Te ayudo con tu pedido? 🍕"); return { toolCalls: [] }; }
  if (msg.stop_reason === "max_tokens") return { toolCalls: [] };
  conv.anthropic.push({ role: "assistant", content: msg.content });
  const toolCalls = msg.content.filter((b) => b.type === "tool_use").map((b) => ({ id: b.id, name: b.name, args: b.input || {} }));
  return { toolCalls };
}
const TOOLS_ANTHROPIC = T.anthropicTools().map((t, i, a) => (i === a.length - 1 ? { ...t, cache_control: { type: "ephemeral" } } : t));

/* ---------------- NVIDIA NIM (OpenAI-compatible) ---------------- */
let nvClient = null;
async function nvidiaRound(conv, { onText }) {
  if (!nvClient) { const OpenAI = require("openai"); nvClient = new (OpenAI.default || OpenAI)({ apiKey: process.env.NVIDIA_API_KEY, baseURL: "https://integrate.api.nvidia.com/v1" }); }
  if (!conv.oa) {
    conv.oa = [{ role: "system", content: STATIC + "\n\n" + conv.live }, ...conv.messages.map((m) => ({ role: m.role, content: m.content }))];
    conv.pushResults = (results) => results.forEach((r) => conv.oa.push({ role: "tool", tool_call_id: r.id, content: JSON.stringify(r.result) }));
  }
  const stream = await nvClient.chat.completions.create({
    model: process.env.UGOIA_NVIDIA_MODEL || "nvidia/nemotron-3-ultra-550b-a55b",
    messages: conv.oa, tools: T.openaiTools(), tool_choice: "auto", temperature: 0.4, max_tokens: 1024, stream: true,
  });
  const calls = []; let text = "";
  for await (const chunk of stream) {
    const d = chunk.choices && chunk.choices[0] && chunk.choices[0].delta; if (!d) continue;
    if (d.content) { text += d.content; onText(d.content); }
    for (const tc of d.tool_calls || []) {
      const i = tc.index ?? calls.length; calls[i] = calls[i] || { id: "", name: "", args: "" };
      if (tc.id) calls[i].id = tc.id;
      if (tc.function && tc.function.name) calls[i].name += tc.function.name;
      if (tc.function && tc.function.arguments) calls[i].args += tc.function.arguments;
    }
  }
  const list = calls.filter(Boolean).map((c, i) => ({ id: c.id || `call_${i}`, name: c.name, args: (() => { try { return JSON.parse(c.args || "{}"); } catch (e) { return {}; } })() }));
  conv.oa.push({ role: "assistant", content: text || null, ...(list.length ? { tool_calls: list.map((c) => ({ id: c.id, type: "function", function: { name: c.name, arguments: JSON.stringify(c.args) } })) } : {}) });
  return { toolCalls: list };
}

module.exports.runTurn = runTurn;
module.exports.cleanMessages = cleanMessages;
