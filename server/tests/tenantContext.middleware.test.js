const express = require("express");
const request = require("supertest");
const {
  tenantContextGuard,
  requireTenantContext,
} = require("../src/middleware/tenantContext");

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

function buildApp({ withUser = false, withCriticalGate = false } = {}) {
  const app = express();
  app.use(express.json());
  if (withUser) {
    app.use((req, _res, next) => {
      req.user = { tenantId: "tenant-from-token" };
      next();
    });
  }
  app.use("/api", tenantContextGuard);
  if (withCriticalGate) {
    app.use(
      "/api/critical",
      requireTenantContext({
        writeOnly: true,
        featureFlag: "TENANT_CONTEXT_ENFORCE_CRITICAL_WRITE_ROUTES",
        routeName: "critical write operations",
      })
    );
  }
  app.get("/api/data", (req, res) => {
    res.json({
      tenantContext: req.tenantContext,
    });
  });
  app.post("/api/data", (req, res) => {
    res.json({
      tenantContext: req.tenantContext,
    });
  });
  app.get("/api/critical", (req, res) => {
    res.json({ ok: true });
  });
  app.post("/api/critical", (req, res) => {
    res.json({ ok: true, tenantContext: req.tenantContext });
  });
  return app;
}

describe("tenantContextGuard", () => {
  it("binds tenant context from header when token context is absent", async () =>
    withEnv(
      {
        TENANT_CONTEXT_REQUIRED_WRITE: "false",
      },
      async () => {
        const app = buildApp();
        const response = await request(app).get("/api/data").set("x-tenant-id", "tenant-123");
        expect(response.status).toBe(200);
        expect(response.body.tenantContext.tenantId).toBe("tenant-123");
        expect(response.body.tenantContext.source).toBe("header");
      }
    ));

  it("rejects mismatched header and token tenant", async () =>
    withEnv(
      {
        TENANT_CONTEXT_REQUIRED_WRITE: "false",
      },
      async () => {
        const app = buildApp({ withUser: true });
        const response = await request(app).get("/api/data").set("x-tenant-id", "tenant-different");
        expect(response.status).toBe(403);
        expect(response.body.error).toMatch(/Tenant mismatch/i);
      }
    ));

  it("requires tenant on writes when strict write mode is enabled", async () =>
    withEnv(
      {
        TENANT_CONTEXT_REQUIRED_WRITE: "true",
        TENANT_CONTEXT_REQUIRED_ALL: "false",
      },
      async () => {
        const app = buildApp();
        const response = await request(app).post("/api/data").send({ ok: true });
        expect(response.status).toBe(400);
        expect(response.body.error).toMatch(/Missing tenant context/i);
      }
    ));
});

describe("requireTenantContext", () => {
  it("does not block writes when critical gate flag is disabled", async () =>
    withEnv(
      {
        TENANT_CONTEXT_ENFORCE_CRITICAL_WRITE_ROUTES: "false",
      },
      async () => {
        const app = buildApp({ withCriticalGate: true });
        const response = await request(app).post("/api/critical").send({ ok: true });
        expect(response.status).toBe(200);
      }
    ));

  it("blocks writes when critical gate flag is enabled and tenant is missing", async () =>
    withEnv(
      {
        TENANT_CONTEXT_ENFORCE_CRITICAL_WRITE_ROUTES: "true",
      },
      async () => {
        const app = buildApp({ withCriticalGate: true });
        const response = await request(app).post("/api/critical").send({ ok: true });
        expect(response.status).toBe(400);
        expect(response.body.error).toMatch(/Missing tenant context/i);
      }
    ));

  it("allows writes when critical gate flag is enabled and tenant is present", async () =>
    withEnv(
      {
        TENANT_CONTEXT_ENFORCE_CRITICAL_WRITE_ROUTES: "true",
      },
      async () => {
        const app = buildApp({ withCriticalGate: true });
        const response = await request(app)
          .post("/api/critical")
          .set("x-tenant-id", "tenant-321")
          .send({ ok: true });
        expect(response.status).toBe(200);
        expect(response.body.tenantContext.tenantId).toBe("tenant-321");
      }
    ));
});
