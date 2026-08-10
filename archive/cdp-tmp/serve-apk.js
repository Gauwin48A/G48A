// Minimal static server for APK distribution on port 9000.
// Serves GET /mhub.apk with the correct content type so the emulator
// browser can download and install it.
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 9000;
const APK = path.join(__dirname, "mhub.apk");

const server = http.createServer((req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { "Content-Type": "text/plain" });
    res.end("Method not allowed");
    return;
  }
  const url = req.url.split("?")[0];

  if (url === "/" || url === "/index.html") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Zaruda APK</title></head><body style="font-family:sans-serif;background:#0f172a;color:#e2e8f0;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
<div style="text-align:center"><h1>Zaruda App</h1>
<p>Tap below to download &amp; install the APK.</p>
<a href="/mhub.apk" download style="display:inline-block;background:#2563eb;color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-size:18px">⬇ Download mhub.apk (53 MB)</a></div></body></html>`);
    return;
  }

  if (url === "/mhub.apk") {
    fs.stat(APK, (err, stat) => {
      if (err || !stat.isFile()) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("APK not found: " + APK);
        return;
      }
      res.writeHead(200, {
        "Content-Type": "application/vnd.android.package-archive",
        "Content-Length": stat.size,
        "Content-Disposition": 'attachment; filename="mhub.apk"',
        "Cache-Control": "no-store",
      });
      if (req.method === "HEAD") {
        res.end();
        return;
      }
      const stream = fs.createReadStream(APK);
      stream.on("error", () => res.destroy());
      stream.pipe(res);
    });
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not found");
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`[serve-apk] FATAL: port ${PORT} already in use`);
  } else {
    console.error("[serve-apk] server error:", err.message);
  }
  process.exit(1);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[serve-apk] listening on http://0.0.0.0:${PORT} serving ${APK}`);
});
