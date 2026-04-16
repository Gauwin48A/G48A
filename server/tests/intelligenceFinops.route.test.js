const express = require("express");
const request = require("supertest");
const intelligenceRoutes = require("../src/routes/intelligenceFinops");
const { resetForTests } = require("../src/services/intelligenceFinopsService");

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
  app.use("/api/intelligence-finops", intelligenceRoutes);
  return app;
}

describe("intelligence finops routes", () => {
  beforeEach(() => {
    resetForTests();
  });

  it("ingests health and returns maintenance recommendation", async () =>
    withEnv(
      {
        INTELLIGENCE_ADMIN_TOKEN: "intel-admin",
      },
      async () => {
        const app = buildApp();
        const health = await request(app)
          .post("/api/intelligence-finops/health/ingest")
          .set("x-intelligence-admin-token", "intel-admin")
          .send({
            deviceId: "device-z1",
            tenantId: "tenant-1",
            metrics: {
              uptimePercent: 94,
              errorRatePercent: 3,
              latencyMs: 220,
              temperatureC: 82,
            },
          });
        expect(health.status).toBe(201);
        expect(health.body.status).toBe("ingested");

        const lookup = await request(app)
          .get("/api/intelligence-finops/health/device-z1")
          .set("x-intelligence-admin-token", "intel-admin");
        expect(lookup.status).toBe(200);
        expect(lookup.body.health.deviceId).toBe("device-z1");

        const maintenance = await request(app)
          .post("/api/intelligence-finops/maintenance/recommend")
          .set("x-intelligence-admin-token", "intel-admin")
          .send({
            deviceId: "device-z1",
            recentFailures: 4,
            offlineMinutes: 16,
          });
        expect(maintenance.status).toBe(200);
        expect(maintenance.body.status).toBe("generated");
        expect(maintenance.body.recommendation.riskScore).toBeGreaterThan(40);
      }
    ));

  it("evaluates energy optimization and records tenant cost usage", async () =>
    withEnv(
      {
        INTELLIGENCE_ADMIN_TOKEN: "intel-admin",
      },
      async () => {
        const app = buildApp();

        const energy = await request(app)
          .post("/api/intelligence-finops/energy/optimize")
          .set("x-intelligence-admin-token", "intel-admin")
          .send({
            deviceId: "device-z2",
            baselineWh: 100,
            currentWh: 80,
            networkMb: 25,
          });
        expect(energy.status).toBe(200);
        expect(energy.body.recommendation.meetsTarget).toBe(true);

        const unauthorized = await request(app).post("/api/intelligence-finops/finops/usage/record").send({
          tenantId: "tenant-2",
          workload: "telemetry",
          costUsd: 120.5,
          units: 10000,
        });
        expect(unauthorized.status).toBe(401);

        const usage = await request(app)
          .post("/api/intelligence-finops/finops/usage/record")
          .set("x-intelligence-admin-token", "intel-admin")
          .send({
            tenantId: "tenant-2",
            workload: "telemetry",
            costUsd: 120.5,
            units: 10000,
          });
        expect(usage.status).toBe(201);
        expect(usage.body.status).toBe("recorded");

        const ledger = await request(app)
          .get("/api/intelligence-finops/finops/tenants/tenant-2")
          .set("x-intelligence-admin-token", "intel-admin");
        expect(ledger.status).toBe(200);
        expect(ledger.body.ledger.totalCostUsd).toBe(120.5);
      }
    ));

  it("evaluates experiment rollback decision and returns summary", async () =>
    withEnv(
      {
        INTELLIGENCE_ADMIN_TOKEN: "intel-admin",
      },
      async () => {
        const app = buildApp();
        const experiment = await request(app)
          .post("/api/intelligence-finops/experiments/evaluate")
          .set("x-intelligence-admin-token", "intel-admin")
          .send({
            experimentId: "exp-1",
            metricName: "alert_ack_rate",
            kpiBefore: 98,
            kpiAfter: 90,
            higherIsBetter: true,
          });
        expect(experiment.status).toBe(200);
        expect(experiment.body.experiment.rollback).toBe(true);

        const summary = await request(app)
          .get("/api/intelligence-finops/summary")
          .set("x-intelligence-admin-token", "intel-admin");
        expect(summary.status).toBe(200);
        expect(summary.body.summary.experiments).toBe(1);
        expect(summary.body.summary.rollbackRecommended).toBe(1);
      }
    ));
});
