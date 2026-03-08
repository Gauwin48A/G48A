const express = require("express");
const request = require("supertest");
const launchRoutes = require("../src/routes/launchGovernance");
const { resetForTests } = require("../src/services/launchGovernanceService");

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
  app.use("/api/launch-governance", launchRoutes);
  return app;
}

describe("launch governance routes", () => {
  beforeEach(() => {
    resetForTests();
  });

  it("starts onboarding, updates steps, and returns onboarding state", async () => {
    const app = buildApp();
    const start = await request(app).post("/api/launch-governance/onboarding/start").send({
      tenantId: "tenant-a1",
      plan: "growth",
      region: "ap-south",
    });
    expect(start.status).toBe(201);
    expect(start.body.status).toBe("started");

    const step = await request(app)
      .post("/api/launch-governance/onboarding/tenant-a1/steps")
      .send({ step: "first_telemetry", status: "done" });
    expect(step.status).toBe(200);
    expect(step.body.onboarding.status).toBe("ACTIVE");

    const onboarding = await request(app).get("/api/launch-governance/onboarding/tenant-a1");
    expect(onboarding.status).toBe(200);
    expect(onboarding.body.onboarding.status).toBe("ACTIVE");
  });

  it("records usage and returns tenant usage ledger", async () => {
    const app = buildApp();
    const usage = await request(app).post("/api/launch-governance/billing/usage/record").send({
      tenantId: "tenant-b1",
      metric: "telemetry_events",
      amount: 1500,
      planLimit: 1000,
    });
    expect(usage.status).toBe(201);
    expect(usage.body.usage.breached).toBe(true);

    const ledger = await request(app).get("/api/launch-governance/billing/tenants/tenant-b1");
    expect(ledger.status).toBe(200);
    expect(ledger.body.usage.metrics.telemetry_events).toBe(1500);
  });

  it("registers compliance evidence, runs certification, and registers integration", async () =>
    withEnv(
      {
        LAUNCH_GOVERNANCE_ADMIN_TOKEN: "launch-admin",
      },
      async () => {
        const app = buildApp();

        const unauthorized = await request(app)
          .post("/api/launch-governance/compliance/evidence/register")
          .send({
            controlDomain: "security",
            evidenceType: "report",
            uri: "s3://evidence/security-report.json",
          });
        expect(unauthorized.status).toBe(401);

        const evidence = await request(app)
          .post("/api/launch-governance/compliance/evidence/register")
          .set("x-launch-admin-token", "launch-admin")
          .send({
            controlDomain: "security",
            evidenceType: "report",
            uri: "s3://evidence/security-report.json",
            actorId: "compliance-1",
          });
        expect(evidence.status).toBe(201);
        expect(evidence.body.status).toBe("registered");

        const certification = await request(app)
          .post("/api/launch-governance/certification/run")
          .set("x-launch-admin-token", "launch-admin")
          .send({
            tenantId: "tenant-c1",
            scores: {
              security: 92,
              reliability: 88,
              observability: 86,
            },
          });
        expect(certification.status).toBe(200);
        expect(certification.body.certification.passed).toBe(true);

        const integration = await request(app)
          .post("/api/launch-governance/ecosystem/integrations/register")
          .set("x-launch-admin-token", "launch-admin")
          .send({
            integrationId: "int-1",
            name: "Partner Alerting Connector",
            category: "alerts",
            status: "active",
          });
        expect(integration.status).toBe(201);
        expect(integration.body.status).toBe("registered");

        const summary = await request(app).get("/api/launch-governance/summary");
        expect(summary.status).toBe(200);
        expect(summary.body.summary.integrations).toBe(1);
      }
    ));
});
