const url = process.argv[2];
const expr = process.argv[3] || "undefined";

if (!url) {
  console.error("Missing WebSocket URL");
  process.exit(1);
}

const ws = new WebSocket(url);
const requestId = 1;
let finished = false;

function done(code, payload) {
  if (finished) return;
  finished = true;
  if (payload !== undefined) {
    try {
      const out = typeof payload === "string" ? payload : JSON.stringify(payload);
      process.stdout.write(out);
    } catch {
      process.stdout.write(String(payload));
    }
  }
  try {
    ws.close();
  } catch {}
  process.exit(code);
}

const timer = setTimeout(() => {
  done(2, { error: "TIMEOUT" });
}, 15000);

ws.addEventListener("open", () => {
  ws.send(
    JSON.stringify({
      id: requestId,
      method: "Runtime.evaluate",
      params: {
        expression: expr,
        returnByValue: true,
        awaitPromise: true,
      },
    }),
  );
});

ws.addEventListener("message", (event) => {
  try {
    const data = typeof event.data === "string" ? event.data : event.data.toString();
    const msg = JSON.parse(data);
    if (msg.id === requestId) {
      clearTimeout(timer);
      done(0, msg.result);
    }
  } catch (err) {
    clearTimeout(timer);
    done(1, { error: String(err?.message || err) });
  }
});

ws.addEventListener("error", (err) => {
  clearTimeout(timer);
  done(1, { error: String(err?.message || err) });
});
