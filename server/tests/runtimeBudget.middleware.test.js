const express = require("express");
const request = require("supertest");
const {
  runtimeBudgetGuard,
  resolveRuntimeBudgetPolicy,
} = require("../src/middleware/runtimeBudget");

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
  app.use("/api", runtimeBudgetGuard);
  app.get("/api/test", (_req, res) => {
    res.json({ ok: true });
  });
  app.post("/api/test", (_req, res) => {
    res.status(201).json({ ok: true });
  });
  return app;
}

describe("runtimeBudgetGuard", () => {
  it("sets read profile budget headers for GET requests", async () =>
    withEnv(
      {
        RUNTIME_BUDGET_READ_P95_MS: "210",
        RUNTIME_BUDGET_WRITE_P95_MS: "340",
        RUNTIME_BUDGET_EGRESS_KB: "64",
      },
      async () => {
        const app = buildApp();
        const response = await request(app).get("/api/test");
        expect(response.status).toBe(200);
        expect(response.headers["x-runtime-budget-profile"]).toBe("read");
        expect(response.headers["x-runtime-budget-ms"]).toBe("210");
        expect(response.headers["x-runtime-egress-budget-kb"]).toBe("64");
      }
    ));

  it("sets write profile budget headers for POST requests", async () =>
    withEnv(
      {
        RUNTIME_BUDGET_READ_P95_MS: "210",
        RUNTIME_BUDGET_WRITE_P95_MS: "340",
        RUNTIME_BUDGET_EGRESS_KB: "64",
      },
      async () => {
        const app = buildApp();
        const response = await request(app).post("/api/test").send({ ok: true });
        expect(response.status).toBe(201);
        expect(response.headers["x-runtime-budget-profile"]).toBe("write");
        expect(response.headers["x-runtime-budget-ms"]).toBe("340");
        expect(response.headers["x-runtime-egress-budget-kb"]).toBe("64");
      }
    ));
});

describe("resolveRuntimeBudgetPolicy", () => {
  it("falls back to Epic 1 defaults for invalid policy values", () => {
    const policy = resolveRuntimeBudgetPolicy({
      RUNTIME_BUDGET_READ_P95_MS: "bad",
      RUNTIME_BUDGET_WRITE_P95_MS: "0",
      RUNTIME_BUDGET_EGRESS_KB: "-2",
      RUNTIME_BUDGET_PATH_PREFIXES: "",
      RUNTIME_BUDGET_LOG_ONLY: "false",
    });

    expect(policy.readBudgetMs).toBe(220);
    expect(policy.writeBudgetMs).toBe(350);
    expect(policy.egressBudgetKb).toBe(128);
    expect(policy.logOnly).toBe(false);
    expect(policy.pathPrefixes).toEqual(["/api"]);
  });
});
