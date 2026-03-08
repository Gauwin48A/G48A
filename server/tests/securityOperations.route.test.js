const express = require("express");
const request = require("supertest");
const securityRoutes = require("../src/routes/securityOperations");
const { resetForTests } = require("../src/services/securityTrustOpsService");

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
  app.use("/api/security-operations", securityRoutes);
  return app;
}

describe("security operations routes", () => {
  beforeEach(() => {
    resetForTests();
  });

  it("evaluates access decisions and records abuse signals", async () => {
    const app = buildApp();

    const allow = await request(app).post("/api/security-operations/access/evaluate").send({
      actorId: "operator-1",
      role: "operator",
      action: "write",
      resource: "fleet.command",
      tenantId: "tenant-1",
      context: { tenantId: "tenant-1" },
    });
    expect(allow.status).toBe(200);
    expect(allow.body.decision).toBe("allow");

    const deny = await request(app).post("/api/security-operations/access/evaluate").send({
      actorId: "operator-1",
      role: "operator",
      action: "write",
      resource: "fleet.command",
      tenantId: "tenant-2",
      context: { tenantId: "tenant-1" },
    });
    expect(deny.status).toBe(200);
    expect(deny.body.decision).toBe("deny");

    const abuse = await request(app).post("/api/security-operations/abuse/signals").send({
      sourceIp: "10.0.0.1",
      vector: "credential_stuffing",
      severity: "high",
    });
    expect(abuse.status).toBe(201);
    expect(abuse.body.signal.totalSignals).toBe(1);
  });

  it("enforces security admin token for supply chain and privacy controls", async () =>
    withEnv(
      {
        SECURITY_OPS_ADMIN_TOKEN: "sec-admin",
      },
      async () => {
        const app = buildApp();
        const unauthorized = await request(app).post("/api/security-operations/supply-chain/attest").send({
          packageName: "express",
          version: "5.1.0",
          integrityHash: "1234567890abcdef1234567890abcdef",
        });
        expect(unauthorized.status).toBe(401);

        const register = await request(app)
          .post("/api/security-operations/supply-chain/attest")
          .set("x-security-admin-token", "sec-admin")
          .send({
            packageName: "express",
            version: "5.1.0",
            integrityHash: "1234567890abcdef1234567890abcdef",
          });
        expect(register.status).toBe(201);
        expect(register.body.status).toBe("registered");

        const retention = await request(app)
          .post("/api/security-operations/privacy/retention/policies")
          .set("x-security-admin-token", "sec-admin")
          .send({
            tenantId: "tenant-1",
            dataClass: "telemetry",
            retentionDays: 30,
            purpose: "operations",
          });
        expect(retention.status).toBe(201);
        expect(retention.body.status).toBe("configured");

        const sweep = await request(app)
          .post("/api/security-operations/privacy/deletion/sweep")
          .set("x-security-admin-token", "sec-admin")
          .send({ tenantId: "tenant-1" });
        expect(sweep.status).toBe(200);
        expect(sweep.body.status).toBe("completed");
        expect(sweep.body.evidenceCount).toBe(1);
      }
    ));

  it("opens and acknowledges security incident", async () =>
    withEnv(
      {
        SECURITY_OPS_ADMIN_TOKEN: "sec-admin",
      },
      async () => {
        const app = buildApp();
        const open = await request(app).post("/api/security-operations/incidents/open").send({
          title: "Suspicious login burst",
          severity: "SEV2",
          detector: "waf",
          detectedAfterMinutes: 4,
        });
        expect(open.status).toBe(201);
        const incidentId = open.body.incident.incidentId;

        const ack = await request(app)
          .post(`/api/security-operations/incidents/${incidentId}/ack`)
          .set("x-security-admin-token", "sec-admin")
          .send({ actorId: "sec-oncall-1" });
        expect(ack.status).toBe(200);
        expect(ack.body.status).toBe("acknowledged");
        expect(ack.body.incident.status).toBe("ACKED");

        const list = await request(app).get("/api/security-operations/incidents?status=ACKED");
        expect(list.status).toBe(200);
        expect(list.body.incidents.length).toBe(1);
      }
    ));
});
