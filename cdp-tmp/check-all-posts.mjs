import fs from "node:fs/promises";

const OUT = "C:/Users/laksh/GITHUB/Android_Kotlin/Mhub/android-native/test-screenshots/manual-cdp-verify-2026-04-26";
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
await send("Page.navigate", { url: "http://10.0.2.2:8081/all-posts" });
await sleep(22000);

const pulse = await send("Runtime.evaluate", {
  expression: "document.querySelectorAll('.animate-pulse').length",
  returnByValue: true,
  awaitPromise: true,
});
const contentCards = await send("Runtime.evaluate", {
  expression: "document.querySelectorAll('[data-testid=post-card], .post-card, .listing-card, .all-posts-card').length",
  returnByValue: true,
  awaitPromise: true,
});
const loginGate = await send("Runtime.evaluate", {
  expression: "document.body && document.body.innerText.includes('Sign in') && document.body.innerText.includes('Account')",
  returnByValue: true,
  awaitPromise: true,
});

await send("Runtime.evaluate", {
  expression: "window.scrollTo(0,0); document.documentElement.setAttribute('data-native-platform','1'); document.body && document.body.setAttribute('data-native-platform','1');",
  returnByValue: true,
  awaitPromise: true,
});

const shot = await send("Page.captureScreenshot", { format: "png", fromSurface: true });
const file = `${OUT}/all_posts_wait22s.png`;
await fs.writeFile(file, Buffer.from(shot.data, "base64"));

console.log(JSON.stringify({
  pulseCount: pulse?.result?.value,
  contentCardCount: contentCards?.result?.value,
  loginGate: loginGate?.result?.value,
  file,
}, null, 2));

ws.close();
