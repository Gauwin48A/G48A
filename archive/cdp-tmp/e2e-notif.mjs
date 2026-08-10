// E2E: push notification send path — login, register FCM token, send notification, read back.
// Run: node cdp-tmp/e2e-notif.mjs
const BASE = "http://localhost:5001";
import crypto from "crypto";

const jar = new Map();

function freshNonce() {
  return `android-${Date.now()}-${crypto.randomBytes(6).toString("hex")}`;
}

async function api(path, { method = "GET", body, auth = false, csrf = false } = {}) {
  const headers = {
    "Content-Type": "application/json",
    "X-MHub-Timestamp": String(Date.now()),
    "X-MHub-Nonce": freshNonce(),
    "X-Client-Platform": "e2e-notif",
    "X-Device-Fingerprint": `e2e-notif-${Date.now()}`,
  };
  if (jar.has("XSRF-TOKEN") && !path.includes("/csrf-token")) headers["X-XSRF-TOKEN"] = jar.get("XSRF-TOKEN");
  const cookieHeader = [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  if (cookieHeader) headers["Cookie"] = cookieHeader;
  if (auth && jar.has("token")) headers["Authorization"] = `Bearer ${jar.get("token")}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  const setCookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  for (const sc of setCookies) {
    const [pair] = sc.split(";");
    const [k, v] = pair.split("=");
    jar.set(k, v);
  }
  let text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* keep raw */ }
  return { status: res.status, json, text: text.slice(0, 300) };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const step = (n, msg) => console.log(`\n[${n}] ${msg}`);

  step(1, "GET csrf-token");
  let r = await api("/api/v1/auth/csrf-token", {});
  console.log("status", r.status, "xsrf-cookie:", jar.has("XSRF-TOKEN"));
  if (!jar.has("XSRF-TOKEN")) { console.log("FAIL: no XSRF cookie", r.text); process.exit(1); }

  step(2, "LOGIN test@example.com");
  r = await api("/api/v1/auth/login", {
    method: "POST",
    body: { email: "test@example.com", password: "Test@12345" },
    csrf: true,
  });
  const token = r.json?.token || r.json?.accessToken;
  if (!token) { console.log("FAIL login", r.status, r.text); process.exit(1); }
  jar.set("token", token);
  const userId = r.json?.user?.user_id || r.json?.user?.id || "999";
  console.log("login ok, token len", token.length, "user", userId);

  step(3, "REGISTER FCM token (POST /api/push/register)");
  const fcmToken = `e2e-fcm-${Date.now()}`;
  r = await api("/api/push/register", {
    method: "POST",
    auth: true,
    body: { token: fcmToken, deviceType: "android", deviceName: "e2e-device" },
  });
  console.log("status", r.status, JSON.stringify(r.json));

  step(4, "SEND notification (POST /api/notifications/send)");
  r = await api("/api/notifications/send", {
    method: "POST",
    auth: true,
    body: {
      receiver_id: String(userId),
      type: "system",
      title: "E2E Push Test",
      message: `End-to-end notification test at ${new Date().toISOString()}`,
      data: { test: "true", ts: Date.now() },
    },
  });
  console.log("status", r.status, JSON.stringify(r.json));

  step(5, "wait for direct-fallback dispatch (no Redis -> in-process)");
  await sleep(5000);

  step(6, "GET /api/notifications (read-back)");
  r = await api("/api/notifications", { auth: true });
  const notifs = r.json?.notifications || [];
  const latest = notifs[0];
  console.log("status", r.status, "total", r.json?.pagination?.total, "unread", r.json?.pagination?.unread_count);
  if (latest) {
    console.log("latest:", JSON.stringify({
      id: latest.notification_id,
      type: latest.type,
      title: latest.title,
      status: latest.status,
      created: latest.created_at,
    }));
  } else {
    console.log("FAIL: no notifications returned");
    process.exit(1);
  }

  step(7, "summary");
  console.log("FCM token registered:", fcmToken);
  console.log("All API steps complete. Check DB rows + server-e2e.log for dispatch details.");
}

main().catch((e) => { console.error("E2E error:", e); process.exit(1); });
