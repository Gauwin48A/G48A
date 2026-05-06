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
  
  const { result } = await send("Runtime.evaluate", {
    expression: `JSON.stringify((() => {
      const el = document.querySelector('.absolute.top-3.right-3');
      if (!el) return { err: 'not found' };
      const cs = getComputedStyle(el);
      // Walk up to find font-size inheritance
      let chain = [];
      let node = el;
      for (let i = 0; i < 5 && node; i++) {
        chain.push({
          tag: node.tagName,
          fs: getComputedStyle(node).fontSize,
          cls: node.className?.substring?.(0, 50) || ''
        });
        node = node.parentElement;
      }
      return { computedFs: cs.fontSize, chain };
    })())`,
    returnByValue: true
  });
  console.log(JSON.stringify(JSON.parse(result.value), null, 2));
  ws.close();
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
