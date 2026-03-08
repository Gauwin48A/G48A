const express = require("express");
const request = require("supertest");
const { apiContractGuard } = require("../src/middleware/apiContract");

function withEnv(overrides, testFn) {
  const previous = {};
  for (const [key, value] of Object.entries(overrides)) {
    previous[key] = process.env[key];
    if (value === undefined || value === null) {
      delete process.env[key];
    } else {
      process.env[key] = String(value);
    }
  }

  return Promise.resolve()
    .then(testFn)
    .finally(() => {
      for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
    });
}

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/api", apiContractGuard);
  app.get("/api/test", (req, res) => {
    res.json({
      version: req.apiContract?.effectiveVersion || null,
    });
  });
  app.post("/api/test", (req, res) => {
    res.json({
      version: req.apiContract?.effectiveVersion || null,
    });
  });
  return app;
}

describe("apiContractGuard", () => {
  it("accepts default version and sets response headers", async () =>
    withEnv(
      {
        API_SUPPORTED_VERSIONS: "1,2",
        API_REQUIRE_VERSION_FOR_WRITES: "false",
      },
      async () => {
        const app = buildApp();
        const response = await request(app).get("/api/test");
        expect(response.status).toBe(200);
        expect(response.body.version).toBe("1");
        expect(response.headers["x-api-version"]).toBe("v1");
        expect(response.headers["x-api-supported-versions"]).toBe("v1,v2");
      }
    ));

  it("rejects unsupported versions", async () =>
    withEnv(
      {
        API_SUPPORTED_VERSIONS: "1,2",
      },
      async () => {
        const app = buildApp();
        const response = await request(app).get("/api/test").set("x-api-version", "v9");
        expect(response.status).toBe(400);
        expect(response.body.error).toMatch(/Unsupported API version/i);
      }
    ));

  it("requires version header for writes when configured", async () =>
    withEnv(
      {
        API_SUPPORTED_VERSIONS: "1,2",
        API_REQUIRE_VERSION_FOR_WRITES: "true",
      },
      async () => {
        const app = buildApp();
        const response = await request(app).post("/api/test").send({ ok: true });
        expect(response.status).toBe(400);
        expect(response.body.error).toMatch(/Missing API version/i);
      }
    ));
});
