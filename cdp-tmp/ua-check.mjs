const targets = await fetch("http://127.0.0.1:9222/json/list").then(r=>r.json());
const page = targets.find((t)=>t.type==='page' && t.webSocketDebuggerUrl);
if(!page){ throw new Error('no target'); }
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res,rej)=>{ ws.addEventListener('open',res,{once:true}); ws.addEventListener('error',e=>rej(new Error(String(e))),{once:true});});
let id=0; const pending = new Map();
ws.addEventListener('message',(ev)=>{ const msg=JSON.parse(typeof ev.data==='string'?ev.data:ev.data.toString()); if(msg.id && pending.has(msg.id)){ const {resolve,reject}=pending.get(msg.id); pending.delete(msg.id); msg.error?reject(new Error(JSON.stringify(msg.error))):resolve(msg.result||{}); }});
const send=(method,params={})=>new Promise((resolve,reject)=>{ const req=++id; pending.set(req,{resolve,reject}); ws.send(JSON.stringify({id:req,method,params}));});
await send('Runtime.enable');
const out=await send('Runtime.evaluate',{expression:'JSON.stringify({ua:navigator.userAgent, native: window.Capacitor && typeof window.Capacitor.isNativePlatform==="function" ? window.Capacitor.isNativePlatform():null, hasReplica:window.__MHUB_ANDROID_WEB_REPLICA__===true})',returnByValue:true,awaitPromise:true});
console.log(out.result?.value || out.value?.result?.value || out);
ws.close();
