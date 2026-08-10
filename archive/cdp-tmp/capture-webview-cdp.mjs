import fs from "node:fs/promises";

const OUT = "C:/Users/laksh/GITHUB/Android_Kotlin/Mhub/android-native/test-screenshots/manual-cdp-verify-2026-04-26";
const routes = [
  ["category_hub", "/category-hub"],
  ["all_posts", "/all-posts"],
  ["profile", "/profile"],
  ["rewards", "/rewards"],
  ["notifications", "/notifications"],
  ["wishlist", "/wishlist"],
];

await fs.mkdir(OUT, { recursive: true });

const targets = await fetch("http://127.0.0.1:9222/json/list").then((r) => r.json());
const page = targets.find((t) => t.type === "page" && t.webSocketDebuggerUrl);
if (!page) throw new Error("No debuggable WebView page target found");

const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.addEventListener("open", resolve, { once: true });
  ws.addEventListener("error", (e) => reject(new Error(String(e?.message || e))), { once: true });
});

let id = 0;
const pending = new Map();
ws.addEventListener("message", (event) => {
  const msg = JSON.parse(typeof event.data === "string" ? event.data : event.data.toString());
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(JSON.stringify(msg.error)));
    else resolve(msg.result || {});
  }
});

const send = (method, params = {}) => new Promise((resolve, reject) => {
  const reqId = ++id;
  pending.set(reqId, { resolve, reject });
  ws.send(JSON.stringify({ id: reqId, method, params }));
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await send("Page.enable");
await send("Runtime.enable");

for (const [key, route] of routes) {
  const url = `http://10.0.2.2:8081${route}`;
  await send("Page.navigate", { url });
  await sleep(9000);
  await send("Runtime.evaluate", {
    expression: "window.scrollTo(0,0); document.documentElement.setAttribute('data-native-platform','1'); document.body && document.body.setAttribute('data-native-platform','1');",
    returnByValue: true,
    awaitPromise: true,
  });
  await sleep(1000);
  const shot = await send("Page.captureScreenshot", { format: "png", fromSurface: true });
  const file = `${OUT}/${key}.png`;
  await fs.writeFile(file, Buffer.from(shot.data, "base64"));
  const stat = await fs.stat(file);
  console.log(`${key} => ${stat.size}`);
}

ws.close();
