const WebSocket = require("ws");
async function main() {
  const res = await fetch("http://localhost:9222/json");
  const targets = await res.json();
  const ws = new WebSocket(targets[0].webSocketDebuggerUrl);
  await new Promise(r => ws.on("open", r));
  let msgId = 0;
  const pending = new Map();
  ws.on("message", data => {
    const msg = JSON.parse(data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg.result || msg); pending.delete(msg.id); }
  });
  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++msgId; pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => { pending.delete(id); reject(new Error("timeout")); }, 15000);
    });
  }
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Page.navigate", { url: "http://localhost/all-posts" });
  await new Promise(r => setTimeout(r, 5000));
  const { result } = await send("Runtime.evaluate", {
    expression: `JSON.stringify((() => {
      let items = [];
      document.querySelectorAll('p, span, div, li, a, label').forEach(el => {
        if (el.children.length === 0 && el.textContent.trim().length > 0) {
          const fs = parseFloat(getComputedStyle(el).fontSize);
          if (fs < 11) items.push({fs: fs.toFixed(1), text: el.textContent.trim().substring(0,40), tag: el.tagName, cls: el.className.substring(0,60)});
        }
      });
      return items;
    })())`,
    returnByValue: true
  });
  const items = JSON.parse(result.value);
  console.log(`Found ${items.length} small-text elements:`);
  items.forEach(i => console.log(`  ${i.fs}px [${i.tag}] "${i.text}" class="${i.cls}"`));
  ws.close();
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
