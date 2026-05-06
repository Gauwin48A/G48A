const WebSocket = require("ws");

async function main() {
  const res = await fetch("http://localhost:9222/json");
  const targets = await res.json();
  const wsUrl = targets[0].webSocketDebuggerUrl;
  const ws = new WebSocket(wsUrl);
  
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
  
  const pages = [
    "/for-you",
    "/login", 
    "/categories",
    "/category-hub",
    "/channels/test-channel"
  ];
  
  for (const url of pages) {
    await send("Page.navigate", { url: `http://localhost${url}` });
    await new Promise(r => setTimeout(r, 5000));
    
    const { result } = await send("Runtime.evaluate", {
      expression: `JSON.stringify({
        url: location.pathname,
        hasPageEnhanced: !!document.querySelector('.page-enhanced'),
        hasBottomNav: !!document.querySelector('nav.mhub-bottom-nav, [class*="bottom-nav"]'),
        hasH1: !!document.querySelector('h1'),
        textLen: (document.querySelector('.page-enhanced') || document.body).innerText.length,
        firstText: (document.querySelector('.page-enhanced') || document.body).innerText.substring(0, 150).replace(/\\n/g, ' | '),
        hasGradient: !!document.querySelector('[class*="gradient"]'),
        hasBrandColors: !!document.querySelector('[class*="emerald"], [class*="green-6"], [class*="blue-6"]'),
        hasImage: !!document.querySelector('img, svg'),
        buttonCount: document.querySelectorAll('button, [role="button"]').length
      })`,
      returnByValue: true
    });
    
    const data = JSON.parse(result.value);
    console.log(`\n${url} → ${data.url}`);
    console.log(`  pageEnhanced=${data.hasPageEnhanced} bottomNav=${data.hasBottomNav} h1=${data.hasH1}`);
    console.log(`  text=${data.textLen}chars gradient=${data.hasGradient} brand=${data.hasBrandColors} img=${data.hasImage} btns=${data.buttonCount}`);
    console.log(`  content: "${data.firstText.substring(0, 100)}"`);
  }
  
  ws.close();
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
