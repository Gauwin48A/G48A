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
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg.result || msg);
      pending.delete(msg.id);
    }
  });
  
  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++msgId;
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => { pending.delete(id); reject(new Error("timeout")); }, 15000);
    });
  }
  
  await send("Page.enable");
  await send("Runtime.enable");
  
  const pages = ["/all-posts", "/feed/demo-1", "/compare", "/category-hub", "/channels/test-channel"];
  
  for (const url of pages) {
    await send("Page.navigate", { url: `http://localhost${url}` });
    await new Promise(r => setTimeout(r, 5000));
    
    const { result } = await send("Runtime.evaluate", {
      expression: `JSON.stringify({
        url: location.pathname,
        // Error check
        errorEls: [...document.querySelectorAll('[class*="error"], [class*="red-"]')].slice(0,5).map(e => e.className.split(' ').filter(c=>c.includes('error')||c.includes('red-')).join(',')),
        // Typography check
        smallText: (() => {
          let items = [];
          document.querySelectorAll('p, span, div, li, a, label').forEach(el => {
            if (el.children.length === 0 && el.textContent.trim().length > 0) {
              const fs = parseFloat(getComputedStyle(el).fontSize);
              if (fs < 12) items.push({fs: fs.toFixed(1), text: el.textContent.trim().substring(0,30)});
            }
          });
          return items.slice(0,10);
        })(),
        // Brand check
        hasBrand: !!document.querySelector('[class*="emerald"], [class*="green-6"], [class*="blue-6"]'),
        hasGradient: !!document.querySelector('[class*="gradient"]'),
        // Empty state
        hasEmptyMarker: !!document.querySelector('[data-ux-state="empty"], [class*="empty"]'),
      })`,
      returnByValue: true
    });
    
    const data = JSON.parse(result.value);
    console.log(`\n${url} → ${data.url}`);
    console.log(`  errorEls: ${JSON.stringify(data.errorEls)}`);
    console.log(`  smallText(${data.smallText.length}): ${JSON.stringify(data.smallText.slice(0,5))}`);
    console.log(`  brand=${data.hasBrand} gradient=${data.hasGradient} emptyMarker=${data.hasEmptyMarker}`);
  }
  
  ws.close();
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
