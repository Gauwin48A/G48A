#!/usr/bin/env node
require("dotenv").config();
const request = require("supertest");
const app = require("../src/app");

async function testHealth() {
  console.log("Testing GET /api/health with active Redis connection...\n");
  const res = await request(app).get("/api/health");
  console.log("Status Code:", res.status);
  console.log("Response Body:\n", JSON.stringify(res.body, null, 2));

  if (res.status === 200 && res.body.redis_session === "connected" && res.body.status === "ok") {
    console.log("\n✅ /api/health verification PASSED!");
    process.exit(0);
  } else {
    console.log("\n⚠️ /api/health returned non-200 or degraded status.");
    process.exit(1);
  }
}

testHealth().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
