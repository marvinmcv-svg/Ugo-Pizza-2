/* Tiny static server that mirrors vercel.json for e2e tests:
   cleanUrls (/crm -> crm.html) and /api/ugoia answering 503 like production without an API key. */
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../..");
const PORT = Number(process.env.PORT) || 4173;
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".webmanifest": "application/manifest+json", ".ico": "image/x-icon", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml", ".mp4": "video/mp4", ".woff2": "font/woff2", ".txt": "text/plain; charset=utf-8", ".xml": "application/xml" };

function resolve(urlPath) {
  const clean = decodeURIComponent(urlPath.split("?")[0]);
  if (clean.split("/").some((s) => s.startsWith(".") && s.length > 1) || clean.startsWith("/node_modules") || clean.startsWith("/api/") || clean.startsWith("/tests")) return null;
  let p = path.join(ROOT, clean);
  if (!p.startsWith(ROOT)) return null;
  if (clean.endsWith("/")) p = path.join(p, "index.html");
  else if (!path.extname(p) && fs.existsSync(p + ".html")) p += ".html";
  return fs.existsSync(p) && fs.statSync(p).isFile() ? p : null;
}

http.createServer((req, res) => {
  if (req.url.startsWith("/api/ugoia")) {
    res.writeHead(req.method === "POST" ? 503 : 405, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: req.method === "POST" ? "not_configured" : "method_not_allowed" }));
  }
  const file = resolve(req.url);
  if (!file) { res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" }); return fs.createReadStream(path.join(ROOT, "404.html")).pipe(res); } // like Vercel
  const type = TYPES[path.extname(file).toLowerCase()] || "application/octet-stream";
  const size = fs.statSync(file).size;
  const range = /bytes=(\d*)-(\d*)/.exec(req.headers.range || "");
  if (range) { // video needs range requests
    const start = range[1] ? Number(range[1]) : 0; const end = range[2] ? Number(range[2]) : size - 1;
    res.writeHead(206, { "Content-Type": type, "Content-Range": `bytes ${start}-${end}/${size}`, "Accept-Ranges": "bytes", "Content-Length": end - start + 1 });
    return fs.createReadStream(file, { start, end }).pipe(res);
  }
  res.writeHead(200, { "Content-Type": type, "Content-Length": size, "Accept-Ranges": "bytes" });
  if (req.method === "HEAD") return res.end();
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`e2e server on http://localhost:${PORT}`));
